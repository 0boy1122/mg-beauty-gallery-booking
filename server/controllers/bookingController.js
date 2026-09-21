const store = require('../models/store');

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function required(value, label) {
  if (!value || String(value).trim() === '') {
    throw new Error(`${label} is required`);
  }
}

function requiredEmail(value) {
  required(value, 'Email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
    throw new Error('Enter a valid email address');
  }
}

function paymentScreenshot(payload) {
  const screenshot = payload.paymentScreenshot || {};
  required(screenshot.dataUrl, 'Payment screenshot');

  if (screenshot.type && !String(screenshot.type).startsWith('image/')) {
    throw new Error('Payment screenshot must be an image');
  }

  if (Number(screenshot.size || 0) > 2_500_000) {
    throw new Error('Payment screenshot must be below 2.5MB');
  }

  return {
    name: screenshot.name || 'payment-screenshot',
    type: screenshot.type || 'image',
    size: Number(screenshot.size || 0),
    dataUrl: screenshot.dataUrl
  };
}

function createBooking(payload) {
  return store.update(data => {
    required(payload.serviceId, 'Service');
    required(payload.date, 'Date');
    required(payload.time, 'Time');
    required(payload.fullName, 'Full name');
    required(payload.phone, 'Phone number');
    requiredEmail(payload.email);

    const serviceLocation = payload.serviceLocation === 'home' ? 'home' : 'spa';
    if (serviceLocation === 'home') {
      required(payload.homeAddress, 'Home service address');
    }

    if (!payload.acceptedTerms) {
      throw new Error('Terms and cancellation policy must be accepted before payment');
    }

    const screenshot = paymentScreenshot(payload);

    const service = data.services.find(item => item.id === payload.serviceId && item.active);
    if (!service) {
      throw new Error('Selected service is not available');
    }

    if (service.bookable === false || !Number.isFinite(Number(service.price))) {
      throw new Error('This service requires direct confirmation. Please call the spa to book.');
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
      serviceLocation,
      homeAddress: serviceLocation === 'home' ? payload.homeAddress.trim() : '',
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
      method: 'mobile_money',
      provider: 'Mobile Money screenshot',
      transactionReference: payload.transactionReference || id('txn'),
      screenshot,
      verificationStatus: 'awaiting_review',
      status: 'pending_verification',
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

    data.users.push(user);
    data.appointments.push(appointment);
    data.payments.push(payment);
    data.termsAcceptanceRecords.push(acceptance);

    return { appointment, payment, acceptance };
  });
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

    if (payload.status === 'confirmed') {
      const payment = data.payments.find(item => item.appointmentId === appointment.id);
      appointment.paymentStatus = 'paid_deposit';
      if (payment) {
        payment.status = 'confirmed';
        payment.verificationStatus = 'verified';
        payment.verifiedAt = new Date().toISOString();
      }
    }

    if (payload.status === 'pending_payment') {
      appointment.paymentStatus = 'pending';
    }

    appointment.updatedAt = new Date().toISOString();

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
  const header = ['Appointment ID', 'Customer', 'Phone', 'Email', 'Service', 'Location', 'Home Address', 'Date', 'Time', 'Price', 'Deposit', 'Payment Proof', 'Status'];
  const rows = data.appointments.map(appointment => {
    const user = data.users.find(item => item.id === appointment.userId) || {};
    const payment = data.payments.find(item => item.appointmentId === appointment.id) || {};
    return [
      appointment.id,
      user.fullName || '',
      user.phone || '',
      user.email || '',
      appointment.serviceName,
      appointment.serviceLocation === 'home' ? 'Home service' : 'Visit spa',
      appointment.homeAddress || '',
      appointment.date,
      appointment.time,
      appointment.price,
      appointment.depositAmount,
      payment.screenshot?.name || '',
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
