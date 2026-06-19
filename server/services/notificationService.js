const store = require('../models/store');
const emailService = require('./emailService');

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function money(value, currency = 'GHS') {
  return `${currency} ${Number(value || 0).toLocaleString('en-GH')}`;
}

function appointmentDetails(appointmentId) {
  const data = store.readData();
  const appointment = data.appointments.find(item => item.id === appointmentId);
  if (!appointment) return null;

  const customer = data.users.find(item => item.id === appointment.userId) || {};
  const payment = data.payments.find(item => item.appointmentId === appointmentId) || {};
  return { appointment, customer, payment, settings: data.settings };
}

function emailLayout(title, intro, rows, footer) {
  const details = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;color:#6b625e;border-bottom:1px solid #eee7e2">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;font-weight:700;border-bottom:1px solid #eee7e2">${escapeHtml(value)}</td>
    </tr>`).join('');

  return `<!doctype html>
  <html><body style="margin:0;background:#f6f3f1;font-family:Arial,sans-serif;color:#241f1c">
    <div style="max-width:620px;margin:0 auto;padding:28px 16px">
      <div style="background:#ffffff;border-top:5px solid #9b6b55;padding:28px">
        <p style="margin:0 0 8px;color:#9b6b55;font-weight:700">MG Aesthetic and Spa</p>
        <h1 style="margin:0 0 16px;font-size:26px">${escapeHtml(title)}</h1>
        <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(intro)}</p>
        <table style="width:100%;border-collapse:collapse;background:#fbf9f8">${details}</table>
        <p style="margin:22px 0 0;line-height:1.6;color:#6b625e">${escapeHtml(footer)}</p>
      </div>
    </div>
  </body></html>`;
}

function plainText(title, intro, rows, footer) {
  return [title, '', intro, '', ...rows.map(([label, value]) => `${label}: ${value}`), '', footer].join('\n');
}

async function sendTrackedEmail({ appointmentId, type, recipient, subject, intro, rows, footer, dedupeKey }) {
  const existing = store.readData().notifications.find(item => {
    return item.dedupeKey === dedupeKey && ['sending', 'sent'].includes(item.status);
  });
  if (existing) return existing;

  const notification = {
    id: id('note'),
    appointmentId,
    type,
    channel: 'email',
    recipient: recipient || '',
    subject,
    dedupeKey,
    status: 'sending',
    createdAt: new Date().toISOString()
  };

  store.update(data => {
    data.notifications.push(notification);
    return notification;
  });

  try {
    const result = await emailService.sendEmail({
      to: recipient,
      subject,
      html: emailLayout(subject, intro, rows, footer),
      text: plainText(subject, intro, rows, footer)
    });

    return store.update(data => {
      const saved = data.notifications.find(item => item.id === notification.id);
      saved.status = result.status;
      saved.providerId = result.providerId || null;
      saved.error = result.reason || null;
      saved.sentAt = result.status === 'sent' ? new Date().toISOString() : null;
      return saved;
    });
  } catch (error) {
    return store.update(data => {
      const saved = data.notifications.find(item => item.id === notification.id);
      saved.status = 'failed';
      saved.error = error.message;
      saved.failedAt = new Date().toISOString();
      return saved;
    });
  }
}

function bookingRows(details) {
  const { appointment, customer, payment, settings } = details;
  return [
    ['Customer', customer.fullName],
    ['Service', appointment.serviceName],
    ['Date', appointment.date],
    ['Time', appointment.time],
    ['Phone', customer.phone],
    ['Email', customer.email],
    ['Service price', money(appointment.price, settings.currency)],
    ['Deposit', money(appointment.depositAmount, settings.currency)],
    ['Payment status', payment.status || appointment.paymentStatus]
  ];
}

async function sendBookingCreated(appointmentId) {
  const details = appointmentDetails(appointmentId);
  if (!details) return [];

  const { appointment, customer, settings } = details;
  const rows = bookingRows(details);
  const adminEmail = process.env.SPA_NOTIFICATION_EMAIL || '';

  return Promise.all([
    sendTrackedEmail({
      appointmentId,
      type: 'booking_request_customer',
      recipient: customer.email,
      subject: 'We received your booking request',
      intro: `Hello ${customer.fullName}, your appointment request has been received and is awaiting confirmation.`,
      rows,
      footer: `We will email you when the appointment is confirmed. ${settings.cancellationPolicy}`,
      dedupeKey: `${appointmentId}:booking-request:customer`
    }),
    sendTrackedEmail({
      appointmentId,
      type: 'booking_request_admin',
      recipient: adminEmail,
      subject: `New booking: ${appointment.serviceName}`,
      intro: 'A customer submitted a new appointment request. Review it in the admin dashboard.',
      rows,
      footer: 'Approve, reschedule, or cancel the request from the admin dashboard.',
      dedupeKey: `${appointmentId}:booking-request:admin`
    })
  ]);
}

async function sendAppointmentUpdate(appointmentId) {
  const details = appointmentDetails(appointmentId);
  if (!details) return null;

  const { appointment, customer, settings } = details;
  const messages = {
    confirmed: {
      subject: 'Your spa appointment is confirmed',
      intro: `Hello ${customer.fullName}, your appointment has been confirmed.`,
      footer: settings.cancellationPolicy
    },
    rescheduled: {
      subject: 'Your spa appointment has been rescheduled',
      intro: `Hello ${customer.fullName}, your appointment date or time has changed.`,
      footer: 'Please contact the spa if the new appointment time does not work for you.'
    },
    cancelled: {
      subject: 'Your spa appointment has been cancelled',
      intro: `Hello ${customer.fullName}, your appointment has been cancelled.`,
      footer: settings.cancellationPolicy
    }
  };

  const message = messages[appointment.status];
  if (!message) return null;

  return sendTrackedEmail({
    appointmentId,
    type: `appointment_${appointment.status}`,
    recipient: customer.email,
    subject: message.subject,
    intro: message.intro,
    rows: bookingRows(details),
    footer: message.footer,
    dedupeKey: `${appointmentId}:${appointment.status}:${appointment.date}:${appointment.time}`
  });
}

function appointmentTime(appointment) {
  const date = new Date(`${appointment.date}T${appointment.time}:00+00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function processDueReminders(now = new Date()) {
  const data = store.readData();
  const reminderHours = Number(data.settings.reminderHoursBefore || 24);
  const due = data.appointments.filter(appointment => {
    if (appointment.status !== 'confirmed') return false;
    const startsAt = appointmentTime(appointment);
    if (!startsAt) return false;
    const millisecondsUntil = startsAt.getTime() - now.getTime();
    return millisecondsUntil > 0 && millisecondsUntil <= reminderHours * 60 * 60 * 1000;
  });

  const results = [];
  for (const appointment of due) {
    const details = appointmentDetails(appointment.id);
    results.push(await sendTrackedEmail({
      appointmentId: appointment.id,
      type: 'appointment_reminder',
      recipient: details.customer.email,
      subject: 'Reminder: your spa appointment is coming up',
      intro: `Hello ${details.customer.fullName}, this is a reminder for your upcoming appointment.`,
      rows: bookingRows(details),
      footer: 'Please arrive a few minutes early. Contact the spa if you need help with your appointment.',
      dedupeKey: `${appointment.id}:reminder:${appointment.date}:${appointment.time}`
    }));
  }

  return results;
}

module.exports = {
  processDueReminders,
  sendAppointmentUpdate,
  sendBookingCreated
};
