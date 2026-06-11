const store = require('../models/store');

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function required(value, label) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${label} is required`);
  }
}

function createBooking(payload) {
  return store.update(data => {
    required(payload.serviceId, 'Service');
    required(payload.date, 'Date');
    required(payload.time, 'Time');
    required(payload.fullName, 'Full name');
    required(payload.phone, 'Phone number');
    required(payload.email, 'Email');

    if (!payload.acceptedTerms) {
      throw new Error('Terms and cancellation policy must be accepted before payment');
    }

    const service = data.services.find(item => item.id === payload.serviceId && item.active);
    if (!service) {
      throw new Error('Selected service is not available');
    }

    const slotTaken = data.appointments.some(appointment => {
      return appointment.date === payload.date &&
        appointment.time === payload.time &&
        appointment.status !== 'cancelled';
    });

    if (slotTaken) {
      throw new Error('This appointment time is no longer available');
    }

    const now = new Date().toISOString();
    const depositAmount = Math.round((service.price * data.settings.depositPercentage) / 100);
    const userId = id('user');
    const appointmentId = id('appt');
    const paymentId = id('pay');
    const termsId = id('terms');

    const user = {
      id: userId,
      fullName: payload.fullName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      createdAt: now
    };

    const appointment = {
      id: appointmentId,
      userId,
      serviceId: service.id,
      serviceName: service.name,
      date: payload.date,
      time: payload.time,
      price: service.price,
      depositAmount,
      status: 'pending_payment',
      paymentStatus: 'pending',
      notes: payload.notes || '',
      createdAt: now,
      updatedAt: now
    };

    const payment = {
      id: paymentId,
      appointmentId,
      amount: depositAmount,
      currency: data.settings.currency,
      method: payload.paymentMethod || 'mobile_money',
      provider: payload.paymentProvider || 'MTN Mobile Money',
      transactionReference: payload.transactionReference || id('txn'),
      status: payload.paymentConfirmed ? 'confirmed' : 'pending',
      createdAt: now
    };

    const acceptance = {
      id: termsId,
      userId,
      appointmentId,
      policyText: data.settings.cancellationPolicy,
      depositPercentage: data.settings.depositPercentage,
      acceptedAt: now,
      ipAddress: payload.ipAddress || 'local'
    };

    if (payment.status === 'confirmed') {
      appointment.status = 'confirmed';
      appointment.paymentStatus = 'paid_deposit';
    }

    data.users.push(user);
    data.appointments.push(appointment);
    data.payments.push(payment);
    data.termsAcceptanceRecords.push(acceptance);
    data.notifications.push(
      notification(appointmentId, 'booking_confirmation', user.email, 'email'),
      notification(appointmentId, 'booking_confirmation', user.phone, 'whatsapp'),
      notification(appointmentId, 'payment_confirmation', user.email, 'email')
    );

    return { appointment, payment, acceptance };
  });
}

function notification(appointmentId, type, recipient, channel) {
  return {
    id: id('note'),
    appointmentId,
    type,
    channel,
    recipient,
    status: 'queued',
    createdAt: new Date().toISOString()
  };
}

function updateAppointment(appointmentId, payload) {
  return store.update(data => {
    const appointment = data.appointments.find(item => item.id === appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const allowed = ['confirmed', 'rescheduled', 'cancelled', 'pending_payment'];
    if (payload.status && !allowed.includes(payload.status)) {
      throw new Error('Invalid appointment status');
    }

    if (payload.date) appointment.date = payload.date;
    if (payload.time) appointment.time = payload.time;
    if (payload.status) appointment.status = payload.status;
    if (payload.adminNote !== undefined) appointment.adminNote = payload.adminNote;

    appointment.updatedAt = new Date().toISOString();

    if (payload.status === 'cancelled') {
      data.notifications.push(notification(appointmentId, 'cancellation_notice', appointment.userId, 'email'));
    }

    return appointment;
  });
}

function getAppointmentDetails() {
  const data = store.readData();
  return data.appointments
    .map(appointment => {
      const user = data.users.find(item => item.id === appointment.userId) || {};
      const payment = data.payments.find(item => item.appointmentId === appointment.id) || {};
      const acceptance = data.termsAcceptanceRecords.find(item => item.appointmentId === appointment.id) || {};

      return {
        ...appointment,
        customer: {
          fullName: user.fullName || '',
          phone: user.phone || '',
          email: user.email || ''
        },
        payment,
        termsAcceptedAt: acceptance.acceptedAt || null
      };
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function updateSettings(payload) {
  return store.update(data => {
    const percentage = Number(payload.depositPercentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error('Deposit percentage must be between 0 and 100');
    }

    data.settings.depositPercentage = percentage;
    data.settings.cancellationPolicy = payload.cancellationPolicy || data.settings.cancellationPolicy;
    data.settings.reminderHoursBefore = Number(payload.reminderHoursBefore || data.settings.reminderHoursBefore);
    return data.settings;
  });
}

function saveService(payload) {
  return store.update(data => {
    required(payload.name, 'Service name');
    const service = {
      id: payload.id || id('service'),
      name: payload.name.trim(),
      description: payload.description || '',
      durationMinutes: Number(payload.durationMinutes || 60),
      price: Number(payload.price || 0),
      active: payload.active !== false
    };

    const index = data.services.findIndex(item => item.id === service.id);
    if (index >= 0) {
      data.services[index] = service;
    } else {
      data.services.push(service);
    }

    return service;
  });
}

function exportBookingsCsv() {
  const data = store.readData();
  const header = ['Appointment ID', 'Customer', 'Phone', 'Email', 'Service', 'Date', 'Time', 'Price', 'Deposit', 'Status'];
  const rows = data.appointments.map(appointment => {
    const user = data.users.find(item => item.id === appointment.userId) || {};
    return [
      appointment.id,
      user.fullName || '',
      user.phone || '',
      user.email || '',
      appointment.serviceName,
      appointment.date,
      appointment.time,
      appointment.price,
      appointment.depositAmount,
      appointment.status
    ];
  });

  return [header, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

module.exports = {
  createBooking,
  getAppointmentDetails,
  updateAppointment,
  updateSettings,
  saveService,
  exportBookingsCsv
};
