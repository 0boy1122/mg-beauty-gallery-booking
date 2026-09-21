const state = {
  services: [],
  appointments: [],
  settings: null
};

const demoKey = 'pureTouchMassageDemoStore'; const demoSeed = {   services: [
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
      id: 'pedicure-men',
      name: 'Pedicure - Men',
      description: 'Men\'s pedicure service for clean, refreshed feet and nail care.',
      durationMinutes: 50,
      price: 200,
      active: true
    },
    {
      id: 'pedicure-ladies',
      name: 'Pedicure - Ladies',
      description: 'Ladies pedicure service with foot care, nail grooming, and polish finish.',
      durationMinutes: 50,
      price: 150,
      active: true
    }
  ],
  appointments: [],   payments: [],   settings: {     depositPercentage: 50,     currency: 'GHS',     cancellationPolicy: 'A 50% deposit is required before confirmation. Deposit screenshots are reviewed by admin. Deposits become non-refundable after appointment confirmation. Reschedules require at least 24 hours notice.',     reminderHoursBefore: 24,     availableTimes: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30']   } };  const currency = value => `${state.settings?.currency || 'GHS'} ${Number(value || 0).toLocaleString()}`;  async function api(path, options) {   try {     const response = await fetch(path, {       headers: { 'Content-Type': 'application/json' },       ...options     });     const data = await response.json();     if (!response.ok) throw new Error(data.error || 'Request failed');     return data;   } catch (error) {     return demoApi(path, options);   } }  function readDemoStore() {   const saved = localStorage.getItem(demoKey);   const data = saved ? JSON.parse(saved) : structuredClone(demoSeed);   data.settings.depositPercentage = 50;   data.settings.cancellationPolicy = 'A 50% deposit is required before confirmation. Deposit screenshots are reviewed by admin. Deposits become non-refundable after appointment confirmation. Reschedules require at least 24 hours notice.';   return data; }  function writeDemoStore(data) {   localStorage.setItem(demoKey, JSON.stringify(data));   return data; }  function demoId(prefix) {   return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`; }  async function demoApi(path, options = {}) {   const method = options.method || 'GET';   const data = readDemoStore();    if (method === 'GET' && path === '/api/services') return data.services;   if (method === 'GET' && path === '/api/settings') return data.settings;   if (method === 'GET' && path === '/api/appointments') return data.appointments;    if (method === 'POST' && path === '/api/bookings') {     const payload = JSON.parse(options.body || '{}');     const service = data.services.find(item => item.id === payload.serviceId);     if (!service) throw new Error('Selected service is not available');     if (service.bookable === false || !Number.isFinite(Number(service.price))) {       throw new Error('This service requires direct confirmation. Please call Pure Touch Massage to book.');     }     if (payload.serviceLocation === 'home' && !(payload.homeAddress || '').trim()) {       throw new Error('Enter the address for home service');     }     if (!payload.paymentScreenshot?.dataUrl) {       throw new Error('Upload your Mobile Money payment screenshot');     }      const appointment = {       id: demoId('appt'),       userId: demoId('user'),       serviceId: service.id,       serviceName: service.name,       date: payload.date,       time: payload.time,       price: service.price,       depositAmount: Math.round((service.price * data.settings.depositPercentage) / 100),       serviceLocation: payload.serviceLocation === 'home' ? 'home' : 'spa',       homeAddress: payload.serviceLocation === 'home' ? (payload.homeAddress || '').trim() : '',       status: 'pending_payment',       paymentStatus: 'pending',       customer: {         fullName: payload.fullName,         phone: payload.phone,         email: payload.email       },       termsAcceptedAt: new Date().toISOString(),       createdAt: new Date().toISOString()     };     const payment = {       id: demoId('pay'),       appointmentId: appointment.id,       amount: appointment.depositAmount,       currency: data.settings.currency,       method: 'mobile_money',       provider: 'Mobile Money screenshot',       screenshot: payload.paymentScreenshot,       verificationStatus: 'awaiting_review',       status: 'pending_verification',       createdAt: new Date().toISOString()     };      data.appointments.push(appointment);     data.payments.push(payment);     writeDemoStore(data);     return { appointment, payment };   }    throw new Error('Demo route not available'); }  function escapeHtml(value) {   return String(value).replace(/[&<>"']/g, char => ({     '&': '&amp;',     '<': '&lt;',     '>': '&gt;',     '"': '&quot;',     "'": '&#039;'   }[char])); }  function activeServices() {   return state.services.filter(service => service.active && service.bookable !== false && Number.isFinite(Number(service.price))); }  function bookableServices() {   return activeServices(); }  function selectedService() {   return state.services.find(service => service.id === document.querySelector('#serviceSelect').value); }  function serviceImage(service) {
  const images = {
    'deep-tissue-massage': 'https://images.pexels.com/photos/6560282/pexels-photo-6560282.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'swedish-massage': 'https://images.pexels.com/photos/3757657/pexels-photo-3757657.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'aromatherapy-massage': 'https://images.pexels.com/photos/6724313/pexels-photo-6724313.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'prostate-massage': 'https://images.pexels.com/photos/35884502/pexels-photo-35884502.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'relaxation-massage': 'https://images.pexels.com/photos/10894305/pexels-photo-10894305.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'back-pain-relief-massage': 'https://images.pexels.com/photos/7795827/pexels-photo-7795827.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'erotic-massage': 'https://images.pexels.com/photos/6560283/pexels-photo-6560283.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'nuru-massage': 'https://images.pexels.com/photos/28321609/pexels-photo-28321609.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop',
    'body-scrubbing': 'assets/ai-body-scrub.jpg',
    'facials-acne-treatment': 'assets/ai-facial-acne.jpg',
    'razor-bumps-treatment': 'assets/ai-razor-bumps.jpg',
    'teeth-whitening': 'assets/ai-teeth-whitening.jpg',
    'pedicure-men': 'assets/ai-pedicure.jpg',
    'pedicure-ladies': 'assets/ai-pedicure.jpg'
  };
  return images[service.id] || 'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=900&h=650&fit=crop';
}

function renderServices() {   const grid = document.querySelector('#serviceGrid');   const serviceSelect = document.querySelector('#serviceSelect');    grid.innerHTML = activeServices()     .map((service, index) => `       <article class="service-card" style="--delay:${index * 60}ms">         <img src="${serviceImage(service)}" alt="${escapeHtml(service.name)} preview">         <div class="service-topline">           <span>${service.durationMinutes} min</span>           <strong>${Number.isFinite(Number(service.price)) ? currency(service.price) : 'Call to book'}</strong>         </div>         <h3>${escapeHtml(service.name)}</h3>         <p>${escapeHtml(service.description)}</p>         <button type="button" data-service="${service.id}" ${service.bookable === false ? 'disabled' : ''}>${service.bookable === false ? 'Call to book' : 'Select'}</button>       </article>     `)     .join('');    serviceSelect.innerHTML = bookableServices()     .map(service => `<option value="${service.id}">${escapeHtml(service.name)} - ${currency(service.price)}</option>`)     .join('');    document.querySelector('#policySummary').textContent = state.settings.cancellationPolicy;   renderTimes();   updateDeposit(); }  function renderTimes() {   const date = document.querySelector('#dateInput').value;   const timeSelect = document.querySelector('#timeSelect');   const bookedTimes = new Set(     state.appointments       .filter(appointment => appointment.date === date && appointment.status !== 'cancelled')       .map(appointment => appointment.time)   );    timeSelect.innerHTML = state.settings.availableTimes     .map(time => {       const disabled = bookedTimes.has(time) ? 'disabled' : '';       const label = bookedTimes.has(time) ? `${time} - booked` : time;       return `<option value="${time}" ${disabled}>${label}</option>`;     })     .join(''); }  function updateDeposit() {   const service = selectedService();   if (!service || !state.settings) return;    const amount = Math.round((service.price * state.settings.depositPercentage) / 100);   document.querySelector('#selectedServiceName').textContent = service.name;   document.querySelector('#depositAmount').textContent = currency(amount);   document.querySelector('#depositNote').textContent = `${state.settings.depositPercentage}% of ${currency(service.price)}. Upload screenshot for verification. Balance paid after treatment.`; }  function selectService(event) {   const button = event.target.closest('button[data-service]');   if (!button) return;    document.querySelector('#serviceSelect').value = button.dataset.service;   updateDeposit();   document.querySelector('#booking').scrollIntoView({ behavior: 'smooth', block: 'start' }); }  function updateServiceLocation() {
  const selected = document.querySelector('input[name="serviceLocation"]:checked');
  const homeService = selected?.value === 'home';
  const field = document.querySelector('#homeAddressField');
  const input = document.querySelector('#homeAddress');
  field.hidden = !homeService;
  input.required = homeService;
  if (!homeService) input.value = '';
}

function readPaymentScreenshot(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.name) {
      reject(new Error('Upload your Mobile Money payment screenshot'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Payment screenshot must be an image'));
      return;
    }

    if (file.size > 2_500_000) {
      reject(new Error('Payment screenshot must be below 2.5MB'));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: reader.result
    }));
    reader.addEventListener('error', () => reject(new Error('Could not read payment screenshot')));
    reader.readAsDataURL(file);
  });
}
async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formMessage = document.querySelector('#formMessage');
  const formData = new FormData(form);
  const screenshotFile = formData.get('paymentScreenshot');
  const data = Object.fromEntries(formData.entries());
  delete data.paymentScreenshot;

  formMessage.textContent = 'Reading your payment screenshot...';

  try {
    data.paymentScreenshot = await readPaymentScreenshot(screenshotFile);
    data.acceptedTerms = form.acceptedTerms.checked;
    data.paymentConfirmed = false;
    data.paymentMethod = 'mobile_money';
    data.paymentProvider = 'Mobile Money screenshot';
    if (!data.email) data.email = '';

    formMessage.textContent = 'Sending your booking for verification...';

    await api('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    state.appointments = await api('/api/appointments');
    form.reset();
    updateServiceLocation();
    setDefaultDate();
    renderServices();
    formMessage.textContent = 'Booking received. We will verify your payment screenshot and confirm by email.';
  } catch (error) {
    formMessage.textContent = error.message;
  }
}

function setDefaultDate() {   const dateInput = document.querySelector('#dateInput');   const today = new Date();   const iso = today.toISOString().slice(0, 10);   dateInput.min = iso;   if (!dateInput.value) dateInput.value = iso; }  async function boot() {   const [services, settings, appointments] = await Promise.all([     api('/api/services'),     api('/api/settings'),     api('/api/appointments')   ]);    state.services = services;   state.settings = settings;   state.appointments = appointments;    setDefaultDate();   renderServices();   document.querySelector('#serviceGrid').addEventListener('click', selectService);   document.querySelector('#serviceSelect').addEventListener('change', updateDeposit);   document.querySelector('#dateInput').addEventListener('change', renderTimes);   document.querySelectorAll('input[name="serviceLocation"]').forEach(input => input.addEventListener('change', updateServiceLocation));   updateServiceLocation();   document.querySelector('#bookingForm').addEventListener('submit', submitBooking); }  boot().catch(error => {   document.body.insertAdjacentHTML('afterbegin', `<p class="form-message">${error.message}</p>`); });

// Pages has no booking API. Direct customers to the spa instead of saving a local-only request.
if (window.location.hostname.endsWith('.github.io')) {
  const bookingForm = document.querySelector('#bookingForm');
  bookingForm.style.display = 'none';
  bookingForm.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  bookingForm.insertAdjacentHTML('beforebegin', `
    <div class="booking-contact">
      <h3>Call to book your treatment</h3>
      <p>Online booking is not available yet. Call us to arrange your appointment or home service.</p>
      <p>Please confirm your appointment and payment instructions with us before sending a deposit.</p>
      <a class="primary-link" href="tel:+233541411570">Call 0541 411 570</a>
      <p><a href="tel:+233209650192">Or call 0209 650 192</a></p>
    </div>
  `);
  document.querySelector('.hero-panel > span').textContent = 'Explore our treatments and call to arrange your studio appointment or home service.';
  document.querySelector('.hero-card').style.display = 'none';
  document.querySelector('.booking-copy h2').textContent = 'Arrange your appointment.';
  document.querySelector('.booking-timeline').style.display = 'none';
  document.querySelector('.policy-panel').style.display = 'none';
  document.querySelector('.proof-strip > div:nth-child(2) span').textContent = 'Speak with our team';
  document.querySelector('.proof-strip > div:nth-child(3) span').textContent = 'Service prices in Ghana cedis';
  document.querySelector('.visual-showcase h2').textContent = 'Massage, wellness care, and home service.';
  document.querySelector('.location-copy > small').textContent = 'Call to confirm home service availability and transport fees.';
  document.querySelector('nav a[href="admin.html"]').remove();
}
