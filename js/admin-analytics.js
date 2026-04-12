// ============================================================
// Admin Analytics Module - Kimi Sushi Professional Dashboard
// ============================================================
window.initAnalytics = function() {
    fetchAnalyticsData();
    setupAnalyticsEventListeners();
};

function fetchAnalyticsData() {
    fetch('/api/analytics')
        .then(r => r.json())
        .then(data => {
            renderDashboardKPIs(data);
            renderOrdersChart(data);
            renderRevenueChart(data);
            renderTopProducts(data);
            renderHourlyChart(data);
            renderStatusChart(data);
            renderClicksSummary(data);
        })
        .catch(err => console.error('[Analytics] Fetch error:', err));
}

function renderDashboardKPIs(data) {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart();

    const todayOrders = (data.dailyOrders || []).filter(d => d.date === today).reduce((s, d) => s + d.count, 0);
    const weekOrders = (data.dailyOrders || []).filter(d => d.date >= weekStart).reduce((s, d) => s + d.count, 0);
    const todayRevenue = (data.dailyRevenue || []).filter(d => d.date === today).reduce((s, d) => s + d.amount, 0);
    const weekRevenue = (data.dailyRevenue || []).filter(d => d.date >= weekStart).reduce((s, d) => s + d.amount, 0);
    const totalOrders = (data.orders || []).length;
    const totalRevenue = (data.dailyRevenue || []).reduce((s, d) => s + d.amount, 0);
    const todayVisits = (data.visits || []).filter(v => v.date === today).length;
    const weekVisits = (data.visits || []).filter(v => v.date >= weekStart).length;

    setKPI('kpi-today-orders', todayOrders);
    setKPI('kpi-week-orders', weekOrders);
    setKPI('kpi-today-revenue', todayRevenue.toFixed(2) + ' €');
    setKPI('kpi-week-revenue', weekRevenue.toFixed(2) + ' €');
    setKPI('kpi-total-orders', totalOrders);
    setKPI('kpi-total-revenue', totalRevenue.toFixed(2) + ' €');
    setKPI('kpi-today-visits', todayVisits);
    setKPI('kpi-week-visits', weekVisits);

    // Conversion rates
    const convToday = todayVisits > 0 ? ((todayOrders / todayVisits) * 100).toFixed(1) : '0.0';
    const convWeek = weekVisits > 0 ? ((weekOrders / weekVisits) * 100).toFixed(1) : '0.0';
    setKPI('kpi-conv-today', convToday + ' %');
    setKPI('kpi-conv-week', convWeek + ' %');

    // Clicks summary
    const clicks = data.clicks || [];
    const telClicks = clicks.filter(c => c.event === 'click_phone').length;
    const emailClicks = clicks.filter(c => c.event === 'click_email').length;
    const orderClicks = clicks.filter(c => c.event === 'click_order').length;
    const menuClicks = clicks.filter(c => c.event === 'click_menu').length;
    const resClicks = clicks.filter(c => c.event === 'click_reservation').length;
    const cartStarts = clicks.filter(c => c.event === 'cart_start').length;
    const checkouts = clicks.filter(c => c.event === 'checkout_start').length;
    const completions = clicks.filter(c => c.event === 'order_complete').length;

    setKPI('kpi-tel-clicks', telClicks);
    setKPI('kpi-email-clicks', emailClicks);
    setKPI('kpi-order-clicks', orderClicks);
    setKPI('kpi-menu-clicks', menuClicks);
    setKPI('kpi-res-clicks', resClicks);
    setKPI('kpi-cart-starts', cartStarts);
    setKPI('kpi-checkouts', checkouts);
    setKPI('kpi-completions', completions);
}

function setKPI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
}

// ============================================================
// Chart.js instances
// ============================================================
let ordersChartInstance = null;
let revenueChartInstance = null;
let hourlyChartInstance = null;
let statusChartInstance = null;

function getChartDefaults() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { font: { family: 'Inter', size: 12 }, color: '#374151' } }
        }
    };
}

const CHART_COLORS = {
    primary: '#8B0000',
    secondary: '#C5A059',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#0284C7',
    gray: '#6B7280',
    green: '#10B981',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    orange: '#F59E0B'
};

function renderOrdersChart(data) {
    const ctx = document.getElementById('chart-orders');
    if (!ctx) return;
    if (ordersChartInstance) ordersChartInstance.destroy();

    const days = getLast14Days();
    const labels = days.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    });
    const counts = days.map(d => {
        const entry = (data.dailyOrders || []).find(o => o.date === d);
        return entry ? entry.count : 0;
    });

    ordersChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Bestellungen',
                data: counts,
                backgroundColor: CHART_COLORS.primary + 'CC',
                borderColor: CHART_COLORS.primary,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...getChartDefaults(),
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6B7280', font: { family: 'Inter' } }, grid: { color: '#F3F4F6' } },
                x: { ticks: { color: '#6B7280', font: { family: 'Inter', size: 11 } }, grid: { display: false } }
            }
        }
    });
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('chart-revenue');
    if (!ctx) return;
    if (revenueChartInstance) revenueChartInstance.destroy();

    const days = getLast14Days();
    const labels = days.map(d => {
        const dt = new Date(d);
        return dt.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' });
    });
    const amounts = days.map(d => {
        const entry = (data.dailyRevenue || []).find(r => r.date === d);
        return entry ? entry.amount : 0;
    });

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Umsatz (€)',
                data: amounts,
                borderColor: CHART_COLORS.secondary,
                backgroundColor: CHART_COLORS.secondary + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: CHART_COLORS.secondary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            ...getChartDefaults(),
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => v + ' €', color: '#6B7280', font: { family: 'Inter' } }, grid: { color: '#F3F4F6' } },
                x: { ticks: { color: '#6B7280', font: { family: 'Inter', size: 11 } }, grid: { display: false } }
            },
            plugins: {
                ...getChartDefaults().plugins,
                tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.raw.toFixed(2) + ' €' } }
            }
        }
    });
}

function renderHourlyChart(data) {
    const ctx = document.getElementById('chart-hourly');
    if (!ctx) return;
    if (hourlyChartInstance) hourlyChartInstance.destroy();

    const hourData = (data.hourlyDistribution || []).sort((a, b) => a.hour - b.hour);
    const hours = hourData.map(h => h.hour + ':00');
    const orders = hourData.map(h => h.order || 0);
    const views = hourData.map(h => h.pageview || 0);

    hourlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                { label: 'Bestellungen', data: orders, backgroundColor: CHART_COLORS.primary + 'AA', borderRadius: 4 },
                { label: 'Seitenaufrufe', data: views.map(v => Math.round(v / 10)), backgroundColor: CHART_COLORS.secondary + 'AA', borderRadius: 4 }
            ]
        },
        options: {
            ...getChartDefaults(),
            scales: {
                y: { beginAtZero: true, ticks: { color: '#6B7280', font: { family: 'Inter' } }, grid: { color: '#F3F4F6' } },
                x: { ticks: { color: '#6B7280', font: { family: 'Inter', size: 10 } }, grid: { display: false } }
            }
        }
    });
}

function renderStatusChart(data) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;
    if (statusChartInstance) statusChartInstance.destroy();

    const orders = data.orders || [];
    const statuses = {};
    orders.forEach(o => { statuses[o.status || 'neu'] = (statuses[o.status || 'neu'] || 0) + 1; });

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statuses),
            datasets: [{
                data: Object.values(statuses),
                backgroundColor: [CHART_COLORS.info, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.gray],
                borderWidth: 0
            }]
        },
        options: {
            ...getChartDefaults(),
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, color: '#374151', padding: 15 } }
            }
        }
    });
}

function renderTopProducts(data) {
    const el = document.getElementById('top-products-list');
    if (!el) return;

    const top = (data.topProducts || []).slice(0, 10);
    if (top.length === 0) {
        el.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">Noch keine Daten</p>';
        return;
    }

    const maxCount = top[0]?.count || 1;
    el.innerHTML = top.map(p => {
        const pct = Math.round((p.count / maxCount) * 100);
        return `<div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
                <span class="font-medium text-gray-700">${p.name}</span>
                <span class="text-gray-500">${p.count}x · ${p.revenue.toFixed(2)} €</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
                <div class="bg-brand-red rounded-full h-2 transition-all" style="width:${pct}%"></div>
            </div>
        </div>`;
    }).join('');
}

function renderClicksSummary(data) {
    const el = document.getElementById('clicks-summary');
    if (!el) return;

    const clicks = data.clicks || [];
    const byEvent = {};
    clicks.forEach(c => { byEvent[c.event] = (byEvent[c.event] || 0) + 1; });

    const eventLabels = {
        click_phone: '📞 Telefon',
        click_email: '📧 E-Mail',
        click_order: '🛒 Bestellen',
        click_menu: '📋 Speisekarte',
        click_reservation: '📅 Reservierung',
        cart_start: '🛍 Warenkorb gestartet',
        checkout_start: '💳 Checkout',
        order_complete: '✅ Bestellung abgeschlossen',
        whatsapp: '💬 WhatsApp'
    };

    el.innerHTML = Object.entries(byEvent).sort((a, b) => b[1] - a[1]).map(([event, count]) =>
        `<div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-600">${eventLabels[event] || event}</span>
            <span class="font-semibold text-brand-dark">${count}</span>
        </div>`
    ).join('') || '<p class="text-gray-400 text-sm text-center py-4">Noch keine Klick-Daten</p>';
}

function getLast14Days() {
    const days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function setupAnalyticsEventListeners() {
    // Date range filter
    const rangeBtns = document.querySelectorAll('[data-range]');
    rangeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeBtns.forEach(b => b.classList.replace('bg-brand-red', 'bg-gray-200'));
            btn.classList.replace('bg-gray-200', 'bg-brand-red');
            fetchAnalyticsData();
        });
    });

    // Refresh button
    const refreshBtn = document.getElementById('analytics-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Lädt...';
            fetchAnalyticsData();
            setTimeout(() => { refreshBtn.disabled = false; refreshBtn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Aktualisieren'; }, 1000);
        });
    }

    // Reset button
    const resetBtn = document.getElementById('analytics-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Wirklich alle Analytik-Daten zurücksetzen?')) {
                fetch('/api/analytics/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: window.currentAdminUser?.username || 'admin' }) })
                    .then(() => { fetchAnalyticsData(); showToast('Daten zurückgesetzt'); })
                    .catch(() => showToast('Fehler beim Zurücksetzen', 'error'));
            }
        });
    }
}
