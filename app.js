const state = {
  services: [],
  appointments: [],
  settings: null
};

const demoKey = 'mgBeautyGalleryDemoStore';
const demoSeed = {
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

function selectedService() {
  return state.services.find(service => service.id === document.querySelector('#serviceSelect').value);
}

function renderServices() {
  const grid = document.querySelector('#serviceGrid');
  const serviceSelect = document.querySelector('#serviceSelect');

  grid.innerHTML = activeServices()
    .map((service, index) => `
      <article class="service-card" style="--delay:${index * 60}ms">
        <div class="service-topline">
          <span>${service.durationMinutes} min</span>
          <strong>${currency(service.price)}</strong>
        </div>
        <h3>${escapeHtml(service.name)}</h3>
        <p>${escapeHtml(service.description)}</p>
        <button type="button" data-service="${service.id}">Select</button>
      </article>
    `)
    .join('');

  serviceSelect.innerHTML = activeServices()
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
