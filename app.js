'use strict';

// ---------- State ----------
const state = {
  robots: [],
  alerts: [],
  stats: { total: 0, active: 0, charging: 0, offline: 0, avgBattery: 0 },
  selected: 'RB-001',
  chart: null,
  modalRobot: null,
  refreshing: false,
};

// ---------- Helpers ----------
const $ = (selector) => document.querySelector(selector);

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};

function esc(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ESCAPE_MAP[c]);
}

async function api(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }
  return response.json();
}

// ---------- Templates ----------
function statCard(label, value, icon, color) {
  return `
    <div class="col-6 col-md">
      <div class="card shadow-sm p-3">
        <div class="d-flex justify-content-between">
          <span class="text-secondary small">${label}</span>
          <i class="bi ${icon} text-${color}"></i>
        </div>
        <div class="fs-4 fw-bold mt-1">${value}</div>
      </div>
    </div>`;
}

function statusColor(status) {
  if (status === 'online') return 'success';
  if (status === 'charging') return 'warning';
  return 'secondary';
}

function alertItem(a) {
  return `
    <div class="list-group-item alert-item ${esc(a.severity)}">
      <div class="d-flex justify-content-between">
        <strong>${esc(a.title)}</strong>
        <button class="btn btn-sm btn-link" onclick="ack(${Number(a.id)})">Ack</button>
      </div>
      <div class="small">${esc(a.robotId)} · ${esc(a.message)}</div>
      <div class="text-secondary small mt-1">${new Date(a.time).toLocaleTimeString()}</div>
    </div>`;
}

function robotRow(r) {
  return `
    <tr>
      <td>
        <strong>${esc(r.name)}</strong>
        <div class="small text-secondary">${esc(r.id)} · ${esc(r.type)}</div>
      </td>
      <td>
        <span class="badge text-bg-${statusColor(r.status)} status-badge">${esc(r.status)}</span>
      </td>
      <td style="min-width:90px">
        <div class="small fw-bold">${r.battery.toFixed(0)}%</div>
        <div class="progress">
          <div class="progress-bar" style="width:${r.battery}%"></div>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openControls('${esc(r.id)}')">
          <i class="bi bi-sliders"></i>
        </button>
      </td>
    </tr>`;
}

// ---------- Rendering ----------
function renderStats() {
  const s = state.stats;
  $('#stats').innerHTML = [
    statCard('Total Robots', s.total, 'bi-robot', 'primary'),
    statCard('Online', s.active, 'bi-broadcast', 'success'),
    statCard('Charging', s.charging, 'bi-lightning-charge', 'warning'),
    statCard('Offline', s.offline, 'bi-slash-circle', 'secondary'),
    statCard('Avg Battery', s.avgBattery.toFixed(0) + '%', 'bi-battery-half', 'info'),
  ].join('');
}

function renderMap() {
  const map = $('#map');
  map.querySelectorAll('.robot-pin').forEach((pin) => pin.remove());

  state.robots.forEach((r) => {
    const isDanger = r.temperature > 55 || r.battery < 20;
    const pin = document.createElement('button');

    pin.className = `robot-pin ${r.status} ${isDanger ? 'danger' : ''}`;
    pin.style.left = r.x + '%';
    pin.style.top = r.y + '%';
    pin.title = r.name;
    pin.innerHTML = `<i class="bi bi-robot"></i><span class="robot-label">${esc(r.name)}</span>`;
    pin.addEventListener('click', () => selectRobot(r.id));

    map.appendChild(pin);
  });
}

function renderAlerts() {
  const active = state.alerts.filter((a) => !a.acknowledged).slice(0, 8);
  $('#alerts').innerHTML = active.length
    ? active.map(alertItem).join('')
    : '<div class="p-4 text-center text-secondary">No active alerts</div>';
}

function renderRobotTable() {
  $('#robotTable').innerHTML = state.robots.map(robotRow).join('');
}

function renderRobotSelect() {
  $('#robotSelect').innerHTML = state.robots
    .map((r) => `<option value="${esc(r.id)}" ${r.id === state.selected ? 'selected' : ''}>${esc(r.name)} (${esc(r.id)})</option>`)
    .join('');
}

function render() {
  renderStats();
  renderMap();
  renderAlerts();
  renderRobotTable();
  renderRobotSelect();
}

// ---------- Telemetry & chart ----------
function renderTelemetry(r) {
  const metrics = [
    ['Battery', r.battery.toFixed(1) + '%', 'bi-battery-half'],
    ['Temperature', r.temperature.toFixed(1) + '°C', 'bi-thermometer-half'],
    ['Speed', r.speed.toFixed(2) + ' m/s', 'bi-speedometer2'],
    ['Load', r.load.toFixed(0) + '%', 'bi-box-seam'],
  ];

  $('#telemetry').innerHTML = metrics
    .map(([label, value, icon]) => `
      <div class="col-6 col-md-3">
        <div class="metric">
          <div class="text-secondary small"><i class="bi ${icon} me-1"></i>${label}</div>
          <div class="value">${value}</div>
        </div>
      </div>`)
    .join('');
}

function renderChart(history) {
  const labels = history.map((x) => new Date(x.time).toLocaleTimeString());
  const battery = history.map((x) => x.battery);
  const temperature = history.map((x) => x.temperature);

  // Update in place if the chart already exists (avoids flicker every refresh)
  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets[0].data = battery;
    state.chart.data.datasets[1].data = temperature;
    state.chart.update();
    return;
  }

  state.chart = new Chart($('#chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Battery %', data: battery, tension: 0.35 },
        { label: 'Temperature °C', data: temperature, tension: 0.35 },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: false } },
    },
  });
}

async function selectRobot(id, silent = false) {
  state.selected = id;

  const robot = state.robots.find((x) => x.id === id);
  if (!robot) return;

  renderTelemetry(robot);

  const history = await api(`/api/robots/${encodeURIComponent(id)}/history`);
  renderChart(history);

  if (!silent) render();
}

// ---------- Actions ----------
function openControls(id) {
  const r = state.robots.find((x) => x.id === id);
  if (!r) return;

  state.modalRobot = id;

  $('#modalRobot').innerHTML = `
    <div class="p-3 bg-light rounded">
      <strong>${esc(r.name)}</strong> (${esc(r.id)})<br>
      <span class="text-secondary">${esc(r.status)} · ${esc(r.mode)} · ${r.battery.toFixed(0)}% battery</span>
    </div>`;

  bootstrap.Modal.getOrCreateInstance($('#controlModal')).show();
}

async function action(name) {
  await api(`/api/robots/${encodeURIComponent(state.modalRobot)}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: name }),
  });

  bootstrap.Modal.getOrCreateInstance($('#controlModal')).hide();
  await refresh();
}

async function ack(id) {
  await api(`/api/alerts/${id}/ack`, { method: 'POST' });
  await refresh();
}

// ---------- Refresh loop ----------
async function refresh() {
  if (state.refreshing) return; // skip if the previous poll is still running
  state.refreshing = true;

  try {
    const data = await api('/api/dashboard');
    Object.assign(state, data);
    render();

    if (state.robots.length) {
      await selectRobot(state.selected, true);
    }
  } catch (err) {
    console.error('Refresh failed:', err);
  } finally {
    state.refreshing = false;
  }
}

refresh();
setInterval(refresh, 3000);
