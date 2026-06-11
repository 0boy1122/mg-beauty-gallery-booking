CREATE TABLE users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price NUMERIC(10, 2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  deposit_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_payment', 'confirmed', 'rescheduled', 'cancelled')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid_deposit', 'failed', 'refunded')),
  notes TEXT,
  admin_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  method TEXT NOT NULL CHECK (method IN ('mobile_money', 'card')),
  provider TEXT,
  transaction_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE terms_acceptance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  appointment_id TEXT NOT NULL REFERENCES appointments(id),
  policy_text TEXT NOT NULL,
  deposit_percentage NUMERIC(5, 2) NOT NULL,
  accepted_at TIMESTAMP NOT NULL,
  ip_address TEXT
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  appointment_id TEXT REFERENCES appointments(id),
  type TEXT NOT NULL CHECK (type IN ('booking_confirmation', 'appointment_reminder', 'cancellation_notice', 'payment_confirmation')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  deposit_percentage NUMERIC(5, 2) NOT NULL DEFAULT 40,
  cancellation_policy TEXT NOT NULL,
  reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  currency TEXT NOT NULL DEFAULT 'GHS',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_slot ON appointments(date, time, status);
CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_terms_appointment ON terms_acceptance_records(appointment_id);
CREATE INDEX idx_notifications_status ON notifications(status, channel);
