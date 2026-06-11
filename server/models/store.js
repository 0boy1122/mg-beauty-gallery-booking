const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'spa-booking.json');

const initialData = {
  users: [],
  services: [
    {
      id: 'facial-treatment',
      name: 'Luxury Facial Treatment',
      description: 'Deep cleansing, exfoliation, mask, and glow finish for refreshed skin.',
      durationMinutes: 60,
      price: 350,
      active: true
    },
    {
      id: 'pedicure',
      name: 'Spa Pedicure',
      description: 'Foot soak, grooming, scrub, massage, and polish finish.',
      durationMinutes: 50,
      price: 180,
      active: true
    },
    {
      id: 'massage',
      name: 'Relaxation Massage',
      description: 'Calming full-body massage designed to ease tension and restore balance.',
      durationMinutes: 75,
      price: 420,
      active: true
    },
    {
      id: 'microneedling',
      name: 'Scalp Microneedling',
      description: 'Targeted scalp wellness session with professional aftercare guidance.',
      durationMinutes: 45,
      price: 500,
      active: true
    },
    {
      id: 'lash-fill',
      name: 'All Kinds of Lashes',
      description: 'Lash set consultation, application, shaping, and aftercare.',
      durationMinutes: 90,
      price: 300,
      active: true
    }
  ],
  appointments: [],
  payments: [],
  termsAcceptanceRecords: [],
  notifications: [],
  settings: {
    depositPercentage: 40,
    currency: 'GHS',
    businessName: 'MG Beauty Gallery',
    businessPhone: '020 965 0192',
    cancellationPolicy: 'Deposits become non-refundable after appointment confirmation. Reschedules require at least 24 hours notice.',
    reminderHoursBefore: 24,
    availableTimes: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30']
  }
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

function getServices() {
  return readData().services;
}

function getAppointments() {
  return readData().appointments;
}

function getPayments() {
  return readData().payments;
}

function getSettings() {
  return readData().settings;
}

function update(mutator) {
  const data = readData();
  const result = mutator(data);
  writeData(data);
  return result;
}

module.exports = {
  ensureDataFile,
  readData,
  writeData,
  getServices,
  getAppointments,
  getPayments,
  getSettings,
  update
};
