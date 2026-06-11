const state = {
  services: [],
  appointments: [],
  settings: null
};

const currency = value => `${state.settings?.currency || 'GHS'} ${Number(value || 0).toLocaleString()}`;

async function api(path, options) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
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
