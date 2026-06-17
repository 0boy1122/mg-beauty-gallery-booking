const state = {
  services: [],
  appointments: [],
  settings: null
};

const demoKey = 'mgAestheticSpaDemoStore';
const demoSeed = {
  services: [
    {
      id: 'deep-tissue-massage',
      name: 'Deep Tissue Massage',
      description: 'Focused pressure massage for deep muscle tension and body recovery.',
      durationMinutes: 60,
      price: 500,
      active: true
    },
    {
      id: 'swedish-massage',
      name: 'Swedish Massage',
      description: 'Classic full-body massage for circulation, relaxation, and stress relief.',
      durationMinutes: 60,
      price: 400,
      active: true
    },
    {
      id: 'aromatherapy-massage',
      name: 'Aromatherapy Massage',
      description: 'Massage therapy paired with calming aromatic oils for a soothing experience.',
      durationMinutes: 60,
      price: 450,
      active: true
    },
    {
      id: 'prostate-massage',
      name: 'Prostate Massage',
      description: 'Specialized massage service handled with privacy and professional care.',
      durationMinutes: 60,
      price: 650,
      active: true
    },
    {
      id: 'relaxation-massage',
      name: 'Relaxation Massage',
      description: 'Gentle massage designed to calm the body, ease stress, and restore balance.',
      durationMinutes: 60,
      price: 400,
      active: true
    },
    {
      id: 'back-pain-relief-massage',
      name: 'Back Pain Relief Massage',
      description: 'Targeted back therapy for stiffness, soreness, and everyday body pain.',
      durationMinutes: 60,
      price: 650,
      active: true
    },
    {
      id: 'erotic-massage',
      name: 'Erotic Massage',
      description: 'Private specialty massage appointment with discreet booking handling.',
      durationMinutes: 60,
      price: 700,
      active: true
    },
    {
      id: 'nuru-massage',
      name: 'Nuru Massage',
      description: 'Premium specialty massage session with elevated privacy and preparation.',
      durationMinutes: 75,
      price: 1000,
      active: true
    },
    {
      id: 'body-scrubbing',
      name: 'Body Scrubbing',
      description: 'Full body exfoliation treatment for smoother, refreshed skin.',
      durationMinutes: 45,
      price: 450,
      active: true
    },
    {
      id: 'facials-acne-treatment',
      name: 'Facials and Acne Treatment',
      description: 'Facial care focused on acne treatment, cleansing, and skin renewal.',
      durationMinutes: 60,
      price: 400,
      active: true
    },
    {
      id: 'razor-bumps-treatment',
      name: 'Razor Bumps Treatment',
      description: 'Targeted treatment for razor bumps and irritated skin.',
      durationMinutes: 45,
      price: 300,
      active: true
    },
    {
      id: 'teeth-whitening',
      name: 'Teeth Whitening',
      description: 'Single-session teeth whitening treatment.',
      durationMinutes: 30,
      price: 100,
      active: true
    },
    {
      id: 'hot-stone-massage',
      name: 'Hot Stone Massage',
      description: 'Heated stone massage therapy. Call the spa to confirm pricing and availability.',
      durationMinutes: 60,
      price: null,
      active: true,
      bookable: false
    },
    {
      id: 'skin-tag-removal',
      name: 'Skin Tag Removal',
      description: 'Aesthetic skin tag removal consultation. Call the spa to confirm pricing.',
      durationMinutes: 45,
      price: null,
      active: true,
      bookable: false
    },
    {
      id: 'microshading',
      name: 'Microshading',
      description: 'Brow enhancement service. Call the spa to confirm pricing.',
      durationMinutes: 90,
      price: null,
      active: true,
      bookable: false
    },
    {
      id: 'pedicure',
      name: 'Pedicure',
      description: 'Nail and foot care service. Call the spa to confirm pricing.',
      durationMinutes: 50,
      price: null,
      active: true,
      bookable: false
    }
  ],
  appointments: [],
  payments: [],
  settings: {
    depositPercentage: 40,
    currency: 'GHS',
    cancellationPolicy: 'Deposits become non-refundable after appointment confirmation. Reschedules require at least 24 hours notice.',
    reminderHoursBefore: 24,
    availableTimes: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30']
  }
};

const currency = value => `${state.settings?.currency || 'GHS'} ${Number(value || 0).toLocaleString()}`;

async function api(path, options) {
  try {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (error) {
    return demoApi(path, options);
  }
}

function readDemoStore() {
  const saved = localStorage.getItem(demoKey);
  return saved ? JSON.parse(saved) : structuredClone(demoSeed);
}

function writeDemoStore(data) {
  localStorage.setItem(demoKey, JSON.stringify(data));
  return data;
}

function demoId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

async function demoApi(path, options = {}) {
  const method = options.method || 'GET';
  const data = readDemoStore();

  if (method === 'GET' && path === '/api/services') return data.services;
  if (method === 'GET' && path === '/api/settings') return data.settings;
  if (method === 'GET' && path === '/api/appointments') return data.appointments;

  if (method === 'POST' && path === '/api/bookings') {
    const payload = JSON.parse(options.body || '{}');
    const service = data.services.find(item => item.id === payload.serviceId);
    if (!service) throw new Error('Selected service is not available');
    if (service.bookable === false || !Number.isFinite(Number(service.price))) {
      throw new Error('This service requires direct confirmation. Please call the spa to book.');
    }

    const appointment = {
      id: demoId('appt'),
      userId: demoId('user'),
      serviceId: service.id,
      serviceName: service.name,
      date: payload.date,
      time: payload.time,
      price: service.price,
      depositAmount: Math.round((service.price * data.settings.depositPercentage) / 100),
      status: 'pending_payment',
      paymentStatus: 'pending',
      customer: {
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email
      },
      termsAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    const payment = {
      id: demoId('pay'),
      appointmentId: appointment.id,
      amount: appointment.depositAmount,
      currency: data.settings.currency,
      method: payload.paymentMethod || 'mobile_money',
      provider: payload.paymentProvider || 'MTN Mobile Money',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    data.appointments.push(appointment);
    data.payments.push(payment);
    writeDemoStore(data);
    return { appointment, payment };
  }

  throw new Error('Demo route not available');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function activeServices() {
  return state.services.filter(service => service.active);
}

function bookableServices() {
  return activeServices().filter(service => service.bookable !== false && Number.isFinite(Number(service.price)));
}

function selectedService() {
  return state.services.find(service => service.id === document.querySelector('#serviceSelect').value);
}

function serviceImage(service) {
  if (service.id.includes('teeth')) return 'assets/service-teeth.png';
  if (service.id.includes('body') || service.id.includes('skin') || service.id.includes('razor') || service.id.includes('micro') || service.id.includes('pedicure')) {
    return 'assets/service-body-scrub.png';
  }
  if (service.id.includes('facial') || service.id.includes('acne')) return 'assets/service-facial.png';
  return 'assets/service-massage.png';
}

function renderServices() {
  const grid = document.querySelector('#serviceGrid');
  const serviceSelect = document.querySelector('#serviceSelect');

  grid.innerHTML = activeServices()
    .map((service, index) => `
      <article class="service-card" style="--delay:${index * 60}ms">
        <img src="${serviceImage(service)}" alt="${escapeHtml(service.name)} preview">
        <div class="service-topline">
          <span>${service.durationMinutes} min</span>
          <strong>${Number.isFinite(Number(service.price)) ? currency(service.price) : 'Call to book'}</strong>
        </div>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.description)}</p>
        <button type="button" data-service="${service.id}" ${service.bookable === false ? 'disabled' : ''}>${service.bookable === false ? 'Call to book' : 'Select'}</button>
      </article>
    `)
    .join('');

  serviceSelect.innerHTML = bookableServices()
    .map(service => `<option value="${service.id}">${escapeHtml(service.name)} - ${currency(service.price)}</option>`)
    .join('');

  document.querySelector('#policySummary').textContent = state.settings.cancellationPolicy;
  renderTimes();
  updateDeposit();
}

function renderTimes() {
  const date = document.querySelector('#dateInput').value;
  const timeSelect = document.querySelector('#timeSelect');
  const bookedTimes = new Set(
    state.appointments
      .filter(appointment => appointment.date === date && appointment.status !== 'cancelled')
      .map(appointment => appointment.time)
  );

  timeSelect.innerHTML = state.settings.availableTimes
    .map(time => {
      const disabled = bookedTimes.has(time) ? 'disabled' : '';
      const label = bookedTimes.has(time) ? `${time} - booked` : time;
      return `<option value="${time}" ${disabled}>${label}</option>`;
    })
    .join('');
}

function updateDeposit() {
  const service = selectedService();
  if (!service || !state.settings) return;

  const amount = Math.round((service.price * state.settings.depositPercentage) / 100);
  document.querySelector('#selectedServiceName').textContent = service.name;
  document.querySelector('#depositAmount').textContent = currency(amount);
  document.querySelector('#depositNote').textContent = `${state.settings.depositPercentage}% of ${currency(service.price)}. Balance paid after treatment.`;
}

function selectService(event) {
  const button = event.target.closest('button[data-service]');
  if (!button) return;

  document.querySelector('#serviceSelect').value = button.dataset.service;
  updateDeposit();
  document.querySelector('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formMessage = document.querySelector('#formMessage');
  const data = Object.fromEntries(new FormData(form).entries());

  data.acceptedTerms = form.acceptedTerms.checked;
  data.paymentConfirmed = false;
  data.paymentProvider = data.paymentMethod === 'card' ? 'Card Processor' : 'MTN Mobile Money';

  formMessage.textContent = 'Recording appointment, deposit, and policy acceptance...';

  try {
    const result = await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    state.appointments = await api('/api/appointments');
    form.reset();
    setDefaultDate();
    renderServices();
    formMessage.textContent = `Booking received. Reference: ${result.appointment.id}. Payment is pending admin confirmation.`;
  } catch (error) {
    formMessage.textContent = error.message;
  }
}

function setDefaultDate() {
  const dateInput = document.querySelector('#dateInput');
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  dateInput.min = iso;
  if (!dateInput.value) dateInput.value = iso;
}

async function boot() {
  const [services, settings, appointments] = await Promise.all([
    api('/api/services'),
    api('/api/settings'),
    api('/api/appointments')
  ]);

  state.services = services;
  state.settings = settings;
  state.appointments = appointments;

  setDefaultDate();
  renderServices();
  document.querySelector('#serviceGrid').addEventListener('click', selectService);
  document.querySelector('#serviceSelect').addEventListener('change', updateDeposit);
  document.querySelector('#dateInput').addEventListener('change', renderTimes);
  document.querySelector('#bookingForm').addEventListener('submit', submitBooking);
}

boot().catch(error => {
  document.body.insertAdjacentHTML('afterbegin', `<p class="form-message">${error.message}</p>`);
});
