const adminState = {
  appointments: [],
  payments: [],
  services: [],
  settings: null
};

const money = value => `${adminState.settings?.currency || 'GHS'} ${Number(value || 0).toLocaleString()}`;

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
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function renderStats() {
  document.querySelector('#totalBookings').textContent = adminState.appointments.length;
  document.querySelector('#confirmedBookings').textContent = adminState.appointments.filter(item => item.status === 'confirmed').length;
  document.querySelector('#pendingBookings').textContent = adminState.appointments.filter(item => item.status === 'pending_payment').length;

  const deposits = adminState.payments
    .filter(payment => payment.status === 'confirmed' || payment.status === 'pending')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  document.querySelector('#depositTotal').textContent = money(deposits);
}

function renderAppointments() {
  const tbody = document.querySelector('#appointmentsTable');
  tbody.innerHTML = adminState.appointments.map(appointment => `
    <tr>
      <td>
        <strong>${escapeHtml(appointment.customer.fullName || 'Walk-in client')}</strong>
        <small>${escapeHtml(appointment.customer.phone)}<br>${escapeHtml(appointment.customer.email)}</small>
      </td>
      <td>${escapeHtml(appointment.serviceName)}</td>
      <td><strong>${escapeHtml(appointment.date)}</strong><small>${escapeHtml(appointment.time)}</small></td>
      <td>
        <strong>${money(appointment.depositAmount)}</strong>
        <small>${escapeHtml(appointment.payment?.method || 'payment')} / ${escapeHtml(appointment.payment?.status || 'pending')}</small>
      </td>
      <td><small>${appointment.termsAcceptedAt ? new Date(appointment.termsAcceptedAt).toLocaleString() : 'Not recorded'}</small></td>
      <td><span class="status-pill ${appointment.status}">${appointment.status.replace('_', ' ')}</span></td>
      <td>
        <div class="table-actions">
          <button data-action="confirmed" data-id="${appointment.id}" title="Approve">Approve</button>
          <button data-action="rescheduled" data-id="${appointment.id}" title="Reschedule">Move</button>
          <button data-action="cancelled" data-id="${appointment.id}" title="Cancel">Cancel</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">No bookings yet.</td></tr>';
}

function renderPayments() {
  const feed = document.querySelector('#paymentFeed');
  feed.innerHTML = adminState.payments.slice().reverse().map(payment => {
    const appointment = adminState.appointments.find(item => item.id === payment.appointmentId) || {};
    return `
      <div class="feed-item">
        <span>${escapeHtml(payment.status)}</span>
        <strong>${money(payment.amount)}</strong>
        <small>${escapeHtml(payment.provider)}<br>${escapeHtml(appointment.serviceName || payment.appointmentId)}</small>
      </div>
    `;
  }).join('') || '<p class="form-message">No payment records yet.</p>';
}

function renderServices() {
  const list = document.querySelector('#serviceList');
  list.innerHTML = adminState.services.map(service => `
    <div class="service-row">
      <div>
        <strong>${escapeHtml(service.name)}</strong>
        <small>${escapeHtml(service.durationMinutes)} min / ${escapeHtml(service.active ? 'active' : 'paused')}</small>
      </div>
      <span>${money(service.price)}</span>
    </div>
  `).join('');
}

function renderSettings() {
  const form = document.querySelector('#settingsForm');
  form.depositPercentage.value = adminState.settings.depositPercentage;
  form.reminderHoursBefore.value = adminState.settings.reminderHoursBefore;
  form.cancellationPolicy.value = adminState.settings.cancellationPolicy;
}

async function refresh() {
  const [appointments, payments, services, settings] = await Promise.all([
    api('/api/admin/appointments'),
    api('/api/payments'),
    api('/api/services'),
    api('/api/settings')
  ]);

  adminState.appointments = appointments;
  adminState.payments = payments;
  adminState.services = services;
  adminState.settings = settings;

  renderStats();
  renderAppointments();
  renderPayments();
  renderServices();
  renderSettings();
}

async function changeStatus(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const payload = { status: button.dataset.action };

  if (button.dataset.action === 'rescheduled') {
    const date = window.prompt('New date, format YYYY-MM-DD');
    const time = window.prompt('New time, format HH:MM');
    if (!date || !time) return;
    payload.date = date;
    payload.time = time;
  }

  await api(`/api/appointments/${button.dataset.id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  await refresh();
}

async function saveSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector('#settingsMessage');
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await api('/api/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    message.textContent = 'Policy settings saved.';
    await refresh();
  } catch (error) {
    message.textContent = error.message;
  }
}

document.querySelector('#appointmentsTable').addEventListener('click', changeStatus);
document.querySelector('#settingsForm').addEventListener('submit', saveSettings);
refresh().catch(error => {
  document.body.insertAdjacentHTML('afterbegin', `<p class="form-message">${error.message}</p>`);
});
