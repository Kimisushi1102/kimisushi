// ============================================================
// Admin Hours Management Module
// ============================================================
window.initHoursManagement = function() {
    loadHoursSettings();
    setupHoursSaveHandler();
};

function loadHoursSettings() {
    fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
            const days = ['mon','tue','wed','thu','fri','sat','sun'];
            days.forEach(d => {
                const p1 = document.getElementById(`hours-${d}1`);
                const p2 = document.getElementById(`hours-${d}2`);
                if (p1) p1.value = data[`hours${capitalize(d)}1`] || '';
                if (p2) p2.value = data[`hours${capitalize(d)}2`] || '';
            });
            const summary = document.getElementById('hours-summary');
            if (summary) summary.value = data.hoursSummary || '';
        })
        .catch(err => console.error('[Hours] Load error:', err));
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function setupHoursSaveHandler() {
    const saveBtn = document.getElementById('save-hours');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Speichert...';

        const payload = { _adminUser: window.currentAdminUser?.username };
        const days = ['mon','tue','wed','thu','fri','sat','sun'];
        days.forEach(d => {
            const p1 = document.getElementById(`hours-${d}1`);
            const p2 = document.getElementById(`hours-${d}2`);
            if (p1) payload[`hours${capitalize(d)}1`] = p1.value;
            if (p2) payload[`hours${capitalize(d)}2`] = p2.value;
        });
        const summary = document.getElementById('hours-summary');
        if (summary) payload.hoursSummary = summary.value;

        fetch('/api/admin/settings/hours', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph ph-check"></i> Gespeichert!';
            setTimeout(() => { saveBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Öffnungszeiten speichern'; }, 2000);
            showToast('Öffnungszeiten aktualisiert!');
        })
        .catch(() => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Öffnungszeiten speichern';
            showToast('Fehler beim Speichern', 'error');
        });
    });
}

// ============================================================
// Admin Orders Management Module
// ============================================================
let ordersFilter = { status: 'all', search: '', type: 'all', date: '' };
let ordersData = { orders: [], reservations: [] };

window.initOrdersManagement = function() {
    loadOrdersData();
    setupOrdersFilters();
    setupActivityLog();
};

function loadOrdersData() {
    Promise.all([
        fetch('/api/inbox?type=orders').then(r => r.json()),
        fetch('/api/inbox?type=reservations').then(r => r.json())
    ]).then(([orders, reservations]) => {
        ordersData.orders = Array.isArray(orders) ? orders : [];
        ordersData.reservations = Array.isArray(reservations) ? reservations : [];
        renderOrdersList();
        renderReservationsList();
    }).catch(() => {
        ordersData.orders = [];
        ordersData.reservations = [];
    });
}

function setupOrdersFilters() {
    const statusFilter = document.getElementById('orders-status-filter');
    const typeFilter = document.getElementById('orders-type-filter');
    const searchInput = document.getElementById('orders-search');
    const dateInput = document.getElementById('orders-date-filter');

    if (statusFilter) statusFilter.addEventListener('change', e => { ordersFilter.status = e.target.value; renderOrdersList(); });
    if (typeFilter) typeFilter.addEventListener('change', e => { ordersFilter.type = e.target.value; renderOrdersList(); });
    if (searchInput) searchInput.addEventListener('input', debounce(e => { ordersFilter.search = e.target.value.toLowerCase(); renderOrdersList(); }, 300));
    if (dateInput) dateInput.addEventListener('change', e => { ordersFilter.date = e.target.value; renderOrdersList(); });
}

function renderOrdersList() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    let orders = ordersData.orders.filter(o => {
        if (ordersFilter.status !== 'all' && o.status !== ordersFilter.status) return false;
        if (ordersFilter.search) {
            const s = ordersFilter.search;
            const name = (o.name || o.customerName || '').toLowerCase();
            const phone = (o.phone || o.customerPhone || '').toLowerCase();
            const email = (o.email || o.customerEmail || '').toLowerCase();
            const id = (o.id || '').toLowerCase();
            if (!name.includes(s) && !phone.includes(s) && !email.includes(s) && !id.includes(s)) return false;
        }
        if (ordersFilter.date && o.pickupDate !== ordersFilter.date) return false;
        return true;
    });

    if (orders.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="ph ph-receipt text-4xl mb-3 block"></i>Keine Bestellungen gefunden</div>';
        return;
    }

    container.innerHTML = orders.map(o => {
        const items = Array.isArray(o.items) ? o.items : [];
        const total = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * i.quantity, 0);
        const statusColors = { neu: 'bg-blue-100 text-blue-700', in_bearbeitung: 'bg-amber-100 text-amber-700', fertig: 'bg-green-100 text-green-700', abgeschlossen: 'bg-gray-100 text-gray-600', storniert: 'bg-red-100 text-red-700' };
        const sc = statusColors[o.status] || 'bg-gray-100 text-gray-700';
        const statusLabel = { neu: 'Neu', in_bearbeitung: 'In Bearbeitung', fertig: 'Fertig', abgeschlossen: 'Abgeschlossen', storniert: 'Storniert' }[o.status] || o.status || 'Neu';
        const time = new Date(o.time || o.createdAt).toLocaleString('de-DE');

        return `<div class="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition cursor-pointer mb-3" onclick="showOrderDetail('${o.id}')">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <span class="font-bold text-brand-dark text-sm">#${o.id}</span>
                    <span class="ml-2 text-xs text-gray-500">${time}</span>
                </div>
                <span class="${sc} text-xs font-bold px-2 py-1 rounded-full">${statusLabel}</span>
            </div>
            <div class="text-sm text-gray-600 mb-1">👤 ${o.name || o.customerName || '-'}</div>
            <div class="text-sm text-gray-500">📞 ${o.phone || o.customerPhone || '-'} · 📧 ${o.email || o.customerEmail || '-'}</div>
            <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <span class="text-xs text-gray-400">${items.length} Artikel</span>
                <span class="font-bold text-brand-red">${total.toFixed(2).replace('.',',')} €</span>
            </div>
        </div>`;
    }).join('');
}

function renderReservationsList() {
    const container = document.getElementById('reservations-list');
    if (!container) return;

    if (ordersData.reservations.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="ph ph-calendar text-4xl mb-3 block"></i>Keine Reservierungen gefunden</div>';
        return;
    }

    container.innerHTML = ordersData.reservations.map(r => {
        const statusColors = { neu: 'bg-blue-100 text-blue-700', bestätigt: 'bg-green-100 text-green-700', storniert: 'bg-red-100 text-red-700' };
        const sc = statusColors[r.status] || 'bg-gray-100 text-gray-700';
        const statusLabel = { neu: 'Neu', bestätigt: 'Bestätigt', storniert: 'Storniert' }[r.status] || r.status || 'Neu';
        const time = new Date(r.time || r.createdAt).toLocaleString('de-DE');

        return `<div class="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition cursor-pointer mb-3" onclick="showReservationDetail('${r.id}')">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <span class="font-bold text-brand-dark text-sm">#${r.id}</span>
                    <span class="ml-2 text-xs text-gray-500">${time}</span>
                </div>
                <span class="${sc} text-xs font-bold px-2 py-1 rounded-full">${statusLabel}</span>
            </div>
            <div class="text-sm text-gray-600 mb-1">👤 ${r.name || r.customerName || '-'}</div>
            <div class="text-sm text-gray-500">📞 ${r.phone || r.customerPhone || '-'}</div>
            <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                <span class="text-xs text-gray-400">🪑 ${r.guests || '-'} Gäste · 📅 ${r.date || '-'}</span>
                <span class="text-xs text-brand-dark font-medium">${r.time || '-'}</span>
            </div>
        </div>`;
    }).join('');
}

window.showOrderDetail = function(orderId) {
    const order = ordersData.orders.find(o => o.id === orderId);
    if (!order) return;

    const items = Array.isArray(order.items) ? order.items : [];
    const total = items.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * i.quantity, 0);
    const detail = document.getElementById('order-detail-content');
    if (!detail) return;

    detail.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-xs font-semibold text-gray-500">Bestellnummer</label><p class="font-bold text-brand-dark">#${order.id}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Status</label><p class="font-bold">${order.status || 'neu'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Name</label><p>${order.name || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Telefon</label><p>${order.phone || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">E-Mail</label><p>${order.email || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Abholdatum</label><p>${order.pickupDate || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Abholzeit</label><p>${order.pickupTimeDisplay || order.pickupTime || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Lieferart</label><p>${order.method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung'}</p></div>
                ${order.address ? `<div class="col-span-2"><label class="text-xs font-semibold text-gray-500">Adresse</label><p>${order.address}</p></div>` : ''}
            </div>
            <div>
                <label class="text-xs font-semibold text-gray-500 block mb-2">Bestellte Artikel</label>
                <div class="bg-gray-50 rounded-lg p-3 space-y-2">
                    ${items.map(i => `<div class="flex justify-between text-sm"><span>${i.name} x${i.quantity}</span><span class="font-medium">${((parseFloat(i.unitPrice) || 0) * i.quantity).toFixed(2).replace('.',',')} €</span></div>`).join('')}
                    <div class="border-t border-gray-200 pt-2 flex justify-between font-bold text-brand-red"><span>Gesamt</span><span>${total.toFixed(2).replace('.',',')} €</span></div>
                </div>
            </div>
            <div>
                <label class="text-xs font-semibold text-gray-500 block mb-2">Status ändern</label>
                <select id="order-detail-status" class="w-full border rounded-lg px-3 py-2 text-sm" onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="neu" ${order.status === 'neu' ? 'selected' : ''}>Neu</option>
                    <option value="in_bearbeitung" ${order.status === 'in_bearbeitung' ? 'selected' : ''}>In Bearbeitung</option>
                    <option value="fertig" ${order.status === 'fertig' ? 'selected' : ''}>Fertig</option>
                    <option value="abgeschlossen" ${order.status === 'abgeschlossen' ? 'selected' : ''}>Abgeschlossen</option>
                    <option value="storniert" ${order.status === 'storniert' ? 'selected' : ''}>Storniert</option>
                </select>
            </div>
        </div>
    `;
    document.getElementById('order-detail-modal')?.classList.remove('hidden');
};

window.showReservationDetail = function(resId) {
    const res = ordersData.reservations.find(r => r.id === resId);
    if (!res) return;
    const detail = document.getElementById('order-detail-content');
    if (!detail) return;

    detail.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div><label class="text-xs font-semibold text-gray-500">Reservierungsnummer</label><p class="font-bold text-brand-dark">#${res.id}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Status</label><p>${res.status || 'neu'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Name</label><p>${res.name || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Telefon</label><p>${res.phone || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">E-Mail</label><p>${res.email || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Datum</label><p>${res.date || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Uhrzeit</label><p>${res.time || '-'}</p></div>
                <div><label class="text-xs font-semibold text-gray-500">Gäste</label><p>${res.guests || '-'}</p></div>
            </div>
            ${res.notes ? `<div class="bg-gray-50 rounded-lg p-3"><label class="text-xs font-semibold text-gray-500 block mb-1">Anmerkung</label><p class="text-sm">${res.notes}</p></div>` : ''}
        </div>
    `;
    document.getElementById('order-detail-modal')?.classList.remove('hidden');
};

window.updateOrderStatus = function(orderId, newStatus) {
    fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ordersData.orders.find(o => o.id === orderId), status: newStatus })
    })
    .then(r => r.json())
    .then(() => {
        const idx = ordersData.orders.findIndex(o => o.id === orderId);
        if (idx >= 0) ordersData.orders[idx].status = newStatus;
        renderOrdersList();
        showToast('Status aktualisiert!');
    })
    .catch(() => showToast('Fehler', 'error'));
};

window.closeOrderDetail = function() {
    document.getElementById('order-detail-modal')?.classList.add('hidden');
};

function setupActivityLog() {
    fetch('/api/admin/activity-log')
        .then(r => r.json())
        .then(logs => {
            const container = document.getElementById('activity-log-list');
            if (!container) return;
            if (!logs.length) { container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Keine Aktivitäten</p>'; return; }
            container.innerHTML = logs.slice(0, 100).map(l => `
                <div class="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div class="w-8 h-8 rounded-full bg-brand-red/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i class="ph ph-clock text-brand-red text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-800">${l.action}</div>
                        <div class="text-xs text-gray-400">${new Date(l.timestamp).toLocaleString('de-DE')} · ${l.user}</div>
                    </div>
                </div>
            `).join('');
        })
        .catch(() => {});
}

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ============================================================
// Toast Helper
// ============================================================
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const msgEl = document.getElementById('toast-msg');
    if (msgEl) msgEl.textContent = msg;
    const icon = toast.querySelector('i');
    if (icon) {
        icon.className = type === 'error' ? 'ph-fill ph-x-circle text-red-400 text-xl' : 'ph-fill ph-check-circle text-green-400 text-xl';
    }
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}
