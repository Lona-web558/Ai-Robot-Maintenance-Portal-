let dashboard = null, chart = null, selectedRobot = null; const modal = ()=>bootstrap.Modal.getOrCreateInstance(document.getElementById('workModal')); async function api(u, o = {}) {
    const r = await fetch(u, {
        headers: {
            'Content-Type': 'application/json'
        }, ...o
    }); return r.json()}function sc(s) {
    return'status-'+s.toLowerCase()}function hb(v) {
    const c = v < 60?'bg-danger': v < 80?'bg-warning': 'bg-success'; return`<div class="progress health-bar"><div class="progress-bar ${c}" style="width:${v}%"></div></div><small>${v}%</small>`
}function stats(s) {
    let a = [['Total Robots',
        s.total,
        'bi-robot'],
        ['Running',
            s.running,
            'bi-play-circle'],
        ['Avg. Health',
            s.avgHealth+'%',
            'bi-heart-pulse'],
        ['Active Alerts',
            s.activeAlerts,
            'bi-exclamation-triangle'],
        ['Open Work Orders',
            s.openWorkOrders,
            'bi-tools']]; document.getElementById('stats').innerHTML = a.map(x => `<div class="col-6 col-xl"><div class="card border-0 shadow-sm metric-card"><div class="d-flex justify-content-between align-items-center"><div><div class="text-secondary small">${x[0]}</div><div class="metric-value">${x[1]}</div></div><div class="metric-icon"><i class="bi ${x[2]}"></i></div></div></div></div>`).join('')}function robots() {
    document.getElementById('robotRows').innerHTML = dashboard.robots.map(r => `<tr><td><b>${r.id}</b><br><small class="text-secondary">${r.name} · ${r.type}</small></td><td><span class="status-pill ${sc(r.status)}">${r.status}</span></td><td style="min-width:110px">${hb(r.health)}</td><td>${r.temperature}°C</td><td>${r.vibration} mm/s</td><td>${r.battery}%</td><td><button class="btn btn-sm btn-outline-primary" onclick="selectRobot('${r.id}')">Details</button></td></tr>`).join('')}function alerts() {
    let a = dashboard.alerts.filter(x=>!x.acknowledged); document.getElementById('alertCount').textContent = a.length; document.getElementById('alerts').innerHTML = a.length?a.map(x => `<div class="alert-item"><div class="d-flex justify-content-between"><strong>${x.title}</strong><span class="badge ${x.severity === 'Critical'?'bg-danger': x.severity === 'High'?'bg-warning text-dark': 'bg-secondary'}">${x.severity}</span></div><div class="small text-secondary mt-1">${x.robot} · ${x.detail}</div><div class="d-flex justify-content-between mt-2"><small>${x.time}</small><button class="btn btn-sm btn-outline-secondary" onclick="ack(${x.id})">Acknowledge</button></div></div>`).join(''): '<div class="p-4 text-center text-secondary">No active alerts</div>'
}function orders() {
    document.getElementById('workOrders').innerHTML = dashboard.workOrders.map(w => `<tr><td><b>${w.id}</b></td><td>${w.robot}</td><td>${w.issue}</td><td><span class="badge ${w.priority === 'Critical'?'bg-danger': w.priority === 'High'?'bg-warning text-dark': 'bg-secondary'}">${w.priority}</span></td><td>${w.technician}</td><td>${w.status}</td><td>${w.due}</td></tr>`).join('')}async function selectRobot(id) {
    selectedRobot = id; let r = await api('/api/robots/'+id); document.getElementById('predictionPanel').innerHTML = `<div class="d-flex justify-content-between mb-3"><div><h5 class="mb-0">${r.id} · ${r.name}</h5><small class="text-secondary">${r.type}</small></div><span class="status-pill ${sc(r.status)}">${r.status}</span></div><div class="row g-2 mb-3"><div class="col-6"><div class="border rounded p-2"><small>Health</small><div class="fw-bold">${r.health}%</div></div></div><div class="col-6"><div class="border rounded p-2"><small>Vibration</small><div class="fw-bold">${r.vibration} mm/s</div></div></div><div class="col-6"><div class="border rounded p-2"><small>Temperature</small><div class="fw-bold">${r.temperature}°C</div></div></div><div class="col-6"><div class="border rounded p-2"><small>Hours</small><div class="fw-bold">${r.hours}</div></div></div></div><h6>AI Recommendations</h6>${r.predictions.map(p => `<div class="border rounded p-2 mb-2"><span class="${p.risk === 'High'?'risk-high': p.risk === 'Medium'?'risk-medium': 'risk-low'}">${p.risk} risk</span><div class="small mt-1">${p.action}</div></div>`).join('')}<div class="d-flex gap-2 mt-3"><button class="btn btn-sm btn-primary" onclick="action('create-work-order')">Create Work Order</button><button class="btn btn-sm btn-outline-warning" onclick="action('service')">Maintenance</button><button class="btn btn-sm btn-outline-success" onclick="action('resume')">Resume</button></div>`; let h = await api('/api/robots/'+id+'/history'); if (chart)chart.destroy(); chart = new Chart(document.getElementById('telemetryChart'), {
        type: 'line', data: {
            labels: h.map(x => x.label), datasets: [{
                label: 'Temperature · '+r.name, data: h.map(x => x.temperature), tension: .35
            }, {
                label: 'Vibration', data: h.map(x => x.vibration), tension: .35
            }]}, options: {
            responsive: true, maintainAspectRatio: false, interaction: {
                mode: 'index', intersect: false
            }}})}async function action(a) {
    if (selectedRobot) {
        await api('/api/robots/'+selectedRobot+'/action', {
            method: 'POST', body: JSON.stringify({
                action: a
            })}); await load(); selectRobot(selectedRobot)}}async function ack(id) {
    await api('/api/alerts/'+id+'/ack', {
        method: 'POST'
    }); load()}function openWorkOrder() {
    document.getElementById('woRobot').innerHTML = dashboard.robots.map(r => `<option value="${r.id}">${r.id} · ${r.name}</option>`).join(''); modal().show()}async function createWorkOrder() {
    let b = {
        robot: woRobot.value,
        issue: woIssue.value,
        priority: woPriority.value
    }; if (!b.issue.trim())return alert('Enter a maintenance issue.'); await api('/api/work-orders', {
            method: 'POST', body: JSON.stringify(b)}); woIssue.value = ''; modal().hide(); load()}async function load() {
    dashboard = await api('/api/dashboard'); stats(dashboard.stats); robots(); alerts(); orders(); document.getElementById('lastUpdated').textContent = 'Updated '+new Date().toLocaleTimeString(); if (selectedRobot)selectRobot(selectedRobot)}load(); setInterval(load, 4000);