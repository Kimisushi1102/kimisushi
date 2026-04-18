// ============================================================
// POS Module — Kimi Sushi
// All state and logic in one place, wired to DOM
// ============================================================

// --- State ---
let posMenu = [];
let posCombos = [];
let posCategories = [];
let posCart = [];
let posActiveCategory = 'all';
let posSearchQuery = '';
let posActiveOrderId = null;

// Tax config (will be loaded from settings)
let posTaxRate = 19;
let posTaxRateReduced = 7;

// Tax breakdown per item
let posTaxBreakdown = { tax19: 0, tax7: 0 };

// Payment
let posPaymentMethod = 'cash';
let posDiscountAmount = 0;
let posDiscountPercent = 0;
let posCustomerNote = '';

// Order info
let posCustomerName = '';
let posCustomerPhone = '';
let posCustomerEmail = '';
let posOrderNote = '';
let posSelectedTable = '';

// Modal states
let posEditingCartItemIndex = null;
let posPaymentSuccessCallback = null;

// ============================================================
// INIT
// ============================================================

window.initPOS = async function() {
    // Load menu from localStorage or API
    await loadPOSData();
    // Render UI
    renderPOSCategories();
    renderPOSMenu();
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};

async function loadPOSData() {
    // Load menu from data.js helpers
    if (typeof getMenu === 'function') {
        posMenu = await getMenu();
    }
    if (typeof getCombos === 'function') {
        posCombos = await getCombos();
    }
    if (typeof getSettings === 'function') {
        const cfg = await getSettings();
        posTaxRate = parseFloat(cfg.taxRate1) || 19;
        posTaxRateReduced = parseFloat(cfg.taxRate2) || 7;
    }
    // Build categories from menu items
    buildPOSCategories();
}

function buildPOSCategories() {
    const cats = new Set(['all', 'Set / Combo']);
    posMenu.forEach(item => {
        if (item.category) cats.add(item.category);
    });
    posCombos.forEach(combo => {
        if (combo.tag || combo.subtitle) cats.add('Set / Combo');
    });
    posCategories = Array.from(cats).filter(Boolean);
}

// ============================================================
// CATEGORY
// ============================================================

function renderPOSCategories() {
    const container = document.getElementById('pos-category-list');
    if (!container) return;
    container.innerHTML = posCategories.map(cat => {
        const label = cat === 'all' ? 'Alle' : cat;
        const active = posActiveCategory === cat ? 'active' : '';
        return `<button class="pos-cat-btn ${active}" data-cat="${cat}">${label}</button>`;
    }).join('');
    container.querySelectorAll('.pos-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            posActiveCategory = btn.dataset.cat;
            renderPOSCategories();
            renderPOSMenu();
        });
    });
}

// ============================================================
// MENU GRID
// ============================================================

function renderPOSMenu() {
    const container = document.getElementById('pos-menu-grid');
    if (!container) return;

    let items = posMenu;

    // Filter by category
    if (posActiveCategory !== 'all') {
        if (posActiveCategory === 'Set / Combo') {
            // Show combos
            renderPOSCombosInGrid(container);
            return;
        } else {
            items = posMenu.filter(item => item.category === posActiveCategory);
        }
    }

    // Filter by search
    if (posSearchQuery.trim()) {
        const q = posSearchQuery.toLowerCase();
        items = items.filter(item =>
            (item.name || '').toLowerCase().includes(q) ||
            (item.code || '').toLowerCase().includes(q) ||
            (item.category || '').toLowerCase().includes(q)
        );
    }

    if (items.length === 0) {
        container.innerHTML = `
            <div class="pos-empty-state">
                <i class="ph ph-fork-knife text-4xl text-gray-300"></i>
                <p>Kein Gericht gefunden</p>
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => createPOSItemCard(item, false)).join('');

    // Also append combos at bottom if category is 'all'
    if (posActiveCategory === 'all' && posCombos.length > 0) {
        renderPOSTopCombos(container);
    }

    attachPOSItemListeners(container);
}

function renderPOSTopCombos(container) {
    const comboSection = document.createElement('div');
    comboSection.className = 'pos-combo-section';
    comboSection.innerHTML = `<div class="pos-section-label">🍱 Set / Combo</div>`;
    posCombos.slice(0, 6).forEach(combo => {
        const div = document.createElement('div');
        div.className = 'pos-item-card pos-combo-card';
        div.dataset.id = combo.id;
        div.dataset.iscombo = 'true';
        div.innerHTML = `
            <div class="pos-item-img">
                <i class="ph ph-folder-simple-star text-2xl text-brand-gold"></i>
            </div>
            <div class="pos-item-info">
                <div class="pos-item-name">${combo.name}</div>
                <div class="pos-item-sub">${combo.subtitle || ''}</div>
            </div>
            <div class="pos-item-price">${combo.price || ''}</div>
        `;
        comboSection.appendChild(div);
    });
    container.insertAdjacentHTML('beforeend', comboSection.outerHTML);
    attachPOSItemListeners(container);
}

function renderPOSCombosInGrid(container) {
    const q = posSearchQuery.toLowerCase();
    let combos = posCombos;
    if (q) {
        combos = posCombos.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.subtitle || '').toLowerCase().includes(q)
        );
    }
    if (combos.length === 0) {
        container.innerHTML = `<div class="pos-empty-state"><i class="ph ph-folder-simple-star text-4xl text-gray-300"></i><p>Kein Combo gefunden</p></div>`;
        return;
    }
    container.innerHTML = combos.map(combo => {
        const price = parsePrice(combo.price);
        return `<div class="pos-item-card pos-combo-card" data-id="${combo.id}" data-iscombo="true">
            <div class="pos-item-img">
                <i class="ph ph-folder-simple-star text-2xl text-brand-gold"></i>
            </div>
            <div class="pos-item-info">
                <div class="pos-item-name">${combo.name}</div>
                <div class="pos-item-sub">${combo.subtitle || ''}</div>
            </div>
            <div class="pos-item-price">${combo.price || ''}</div>
        </div>`;
    }).join('');
    attachPOSItemListeners(container);
}

function createPOSItemCard(item, isCombo) {
    const imgSrc = item.image || item.img || '';
    const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${item.name}" class="pos-item-img" onerror="this.outerHTML='<div class=\\'pos-item-img\\' ><i class=\\'ph ph-fork-knife text-xl text-gray-300\\'></i></div>'">`
        : `<div class="pos-item-img"><i class="ph ph-fork-knife text-xl text-gray-300"></i></div>`;
    const available = item.available !== false && item.active !== false;
    const outOfStock = !available ? 'pos-out-of-stock' : '';
    return `<div class="pos-item-card ${outOfStock}" data-id="${item.id}" data-iscombo="false">
        ${imgHtml}
        <div class="pos-item-info">
            <div class="pos-item-name">${item.name}</div>
            ${item.pieces ? `<div class="pos-item-sub">${item.pieces}</div>` : ''}
        </div>
        <div class="pos-item-price">${item.price || ''}</div>
        ${!available ? '<div class="pos-stock-badge">Ausverkauft</div>' : ''}
    </div>`;
}

function attachPOSItemListeners(container) {
    container.querySelectorAll('.pos-item-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('pos-out-of-stock')) return;
            const id = card.dataset.id;
            const isCombo = card.dataset.iscombo === 'true';
            if (isCombo) {
                addComboToPOSCart(id);
            } else {
                addItemToPOSCart(id);
            }
        });
    });
}

// ============================================================
// CART OPERATIONS
// ============================================================

function addItemToPOSCart(itemId) {
    const item = posMenu.find(i => i.id === itemId);
    if (!item) return;

    const existing = posCart.find(i => i.id === itemId && !i.isCombo);
    if (existing) {
        existing.quantity += 1;
    } else {
        posCart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            unitPrice: parsePrice(item.price),
            quantity: 1,
            note: '',
            isCombo: false,
            category: item.category,
            pieces: item.pieces || ''
        });
    }
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
}

function addComboToPOSCart(comboId) {
    const combo = posCombos.find(c => c.id === comboId);
    if (!combo) return;

    const existing = posCart.find(i => i.id === comboId && i.isCombo);
    if (existing) {
        existing.quantity += 1;
    } else {
        posCart.push({
            id: combo.id,
            name: combo.name,
            price: combo.price,
            unitPrice: parsePrice(combo.price),
            quantity: 1,
            note: '',
            isCombo: true
        });
    }
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
}

window.posChangeQuantity = function(index, delta) {
    const item = posCart[index];
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        posCart.splice(index, 1);
    }
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};

window.posRemoveItem = function(index) {
    posCart.splice(index, 1);
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};

window.posUpdateItemNote = function(index, note) {
    if (posCart[index]) {
        posCart[index].note = note;
    }
};

function clearPOSCart() {
    posCart = [];
    posDiscountAmount = 0;
    posDiscountPercent = 0;
    posCustomerName = '';
    posCustomerPhone = '';
    posCustomerEmail = '';
    posOrderNote = '';
    posSelectedTable = '';
    posActiveOrderId = null;
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
    // Clear customer form
    const nameEl = document.getElementById('pos-customer-name');
    const phoneEl = document.getElementById('pos-customer-phone');
    const tableEl = document.getElementById('pos-table-select');
    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    if (tableEl) tableEl.value = '';
    const paymentBtns = document.querySelectorAll('.pos-payment-btn');
    paymentBtns.forEach(b => b.classList.remove('active'));
    const cashBtn = document.querySelector('.pos-payment-btn[data-method="cash"]');
    if (cashBtn) cashBtn.classList.add('active');
    posPaymentMethod = 'cash';
}

window.clearPOSCart = clearPOSCart;

// ============================================================
// CART RENDER
// ============================================================

function renderPOSCart() {
    const container = document.getElementById('pos-cart-list');
    const countEl = document.getElementById('pos-cart-count');
    if (!container) return;

    const totalItems = posCart.reduce((s, i) => s + i.quantity, 0);
    if (countEl) countEl.textContent = totalItems;

    if (posCart.length === 0) {
        container.innerHTML = `
            <div class="pos-cart-empty">
                <i class="ph ph-shopping-cart text-5xl text-gray-200"></i>
                <p>Warenkorb ist leer</p>
                <p class="text-xs text-gray-400">Tippen Sie auf ein Gericht um es hinzuzufügen</p>
            </div>`;
        return;
    }

    container.innerHTML = posCart.map((item, index) => {
        const itemTotal = item.unitPrice * item.quantity;
        return `
        <div class="pos-cart-item ${item.note ? 'pos-cart-item--has-note' : ''}">
            <div class="pos-cart-item-main">
                <div class="pos-cart-item-info">
                    <div class="pos-cart-item-name">${item.name}</div>
                    ${item.note ? `<div class="pos-cart-item-note"><i class="ph ph-chat-text text-[10px]"></i> ${item.note}</div>` : ''}
                </div>
                <div class="pos-cart-item-controls">
                    <button class="pos-qty-btn" onclick="posChangeQuantity(${index}, -1)">
                        <i class="ph ph-minus text-xs"></i>
                    </button>
                    <span class="pos-qty-val">${item.quantity}</span>
                    <button class="pos-qty-btn" onclick="posChangeQuantity(${index}, 1)">
                        <i class="ph ph-plus text-xs"></i>
                    </button>
                </div>
                <div class="pos-cart-item-price">${formatPOSPrice(itemTotal)}</div>
                <button class="pos-cart-remove" onclick="posRemoveItem(${index})" title="Entfernen">
                    <i class="ph ph-trash text-sm"></i>
                </button>
            </div>
            ${item.isCombo ? `<div class="pos-cart-combo-items">${item.price} /Stk</div>` : ''}
        </div>`;
    }).join('');
}

// ============================================================
// TOTALS
// ============================================================

function getPOSSubtotal() {
    return posCart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}

function getPOSDiscount() {
    if (posDiscountPercent > 0) {
        return getPOSSubtotal() * (posDiscountPercent / 100);
    }
    return posDiscountAmount;
}

function getPOSTaxableAmount() {
    return Math.max(0, getPOSSubtotal() - getPOSDiscount());
}

function getPOSTaxAmount() {
    const taxable = getPOSTaxableAmount();
    // Standard: 100% at 19%, 0% at 7% (simplified)
    return taxable * (posTaxRate / 100);
}

function getPOSTotal() {
    return getPOSTaxableAmount() + getPOSTaxAmount();
}

function renderPOSTotals() {
    const subtotal = getPOSSubtotal();
    const discount = getPOSDiscount();
    const taxable = getPOSTaxableAmount();
    const tax = getPOSTaxAmount();
    const total = getPOSTotal();

    const subtotalEl = document.getElementById('pos-subtotal');
    const discountEl = document.getElementById('pos-discount');
    const taxableEl = document.getElementById('pos-taxable');
    const taxEl = document.getElementById('pos-tax');
    const totalEl = document.getElementById('pos-total');

    if (subtotalEl) subtotalEl.textContent = formatPOSPrice(subtotal);
    if (discountEl) {
        if (discount > 0) {
            discountEl.parentElement.classList.remove('hidden');
            discountEl.textContent = '-' + formatPOSPrice(discount);
        } else {
            discountEl.parentElement.classList.add('hidden');
        }
    }
    if (taxableEl) taxableEl.textContent = formatPOSPrice(taxable);
    if (taxEl) taxEl.textContent = formatPOSPrice(tax);
    if (totalEl) totalEl.textContent = formatPOSPrice(total);
}

function renderPOSTaxBreakdown() {
    const tax19 = getPOSSubtotal() * (posTaxRate / 100);
    const container = document.getElementById('pos-tax-breakdown');
    if (!container) return;
    container.innerHTML = `
        <span>MwSt. ${posTaxRate}%</span>
        <span>${formatPOSPrice(tax19)}</span>
    `;
}

function updatePOSButtons() {
    const hasItems = posCart.length > 0;
    const payBtn = document.getElementById('pos-pay-btn');
    const clearBtn = document.getElementById('pos-clear-btn');
    const printBtn = document.getElementById('pos-print-btn');
    if (payBtn) {
        payBtn.disabled = !hasItems;
        payBtn.style.opacity = hasItems ? '1' : '0.5';
    }
    if (clearBtn) {
        clearBtn.style.display = hasItems ? 'inline-flex' : 'none';
    }
    if (printBtn) {
        printBtn.style.display = hasItems ? 'inline-flex' : 'none';
    }
}

// ============================================================
// DISCOUNT
// ============================================================

window.openPOSDiscountModal = function() {
    const modal = document.getElementById('pos-discount-modal');
    if (!modal) return;
    const pctInput = document.getElementById('pos-discount-pct');
    const amtInput = document.getElementById('pos-discount-amt');
    if (pctInput) pctInput.value = posDiscountPercent || '';
    if (amtInput) amtInput.value = posDiscountAmount ? (posDiscountAmount.toFixed(2).replace('.', ',')) : '';
    modal.classList.add('show');
};

window.closePOSDiscountModal = function() {
    const modal = document.getElementById('pos-discount-modal');
    if (modal) modal.classList.remove('show');
};

window.applyPOSDiscount = function() {
    const pctInput = document.getElementById('pos-discount-pct');
    const amtInput = document.getElementById('pos-discount-amt');
    const pct = parseFloat(pctInput?.value) || 0;
    const amt = parseFloat((amtInput?.value || '').replace(',', '.')) || 0;
    if (pct > 0 && pct <= 100) {
        posDiscountPercent = pct;
        posDiscountAmount = 0;
    } else if (amt > 0) {
        posDiscountAmount = Math.min(amt, getPOSSubtotal());
        posDiscountPercent = 0;
    } else {
        posDiscountPercent = 0;
        posDiscountAmount = 0;
    }
    renderPOSTotals();
    renderPOSTaxBreakdown();
    closePOSDiscountModal();
};

window.removePOSDiscount = function() {
    posDiscountPercent = 0;
    posDiscountAmount = 0;
    renderPOSTotals();
    renderPOSTaxBreakdown();
};

// ============================================================
// PAYMENT METHOD
// ============================================================

window.selectPOSPayment = function(method) {
    posPaymentMethod = method;
    document.querySelectorAll('.pos-payment-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.method === method);
    });
};

// ============================================================
// SUBMIT ORDER
// ============================================================

window.submitPOSOrder = async function(andPrint = false) {
    if (posCart.length === 0) return;

    const customerName = document.getElementById('pos-customer-name')?.value || '';
    const customerPhone = document.getElementById('pos-customer-phone')?.value || '';
    const customerEmail = ''; // POS usually doesn't need email
    const tableName = document.getElementById('pos-table-select')?.value || '';

    const subtotal = getPOSSubtotal();
    const discount = getPOSDiscount();
    const taxAmount = getPOSTaxAmount();
    const total = getPOSTotal();

    const cartItems = posCart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        note: item.note || ''
    }));

    const orderId = `pos_${Date.now()}`;
    const now = new Date();

    const payload = {
        id: orderId,
        type: 'order',
        status: 'neu',
        method: 'pos',
        source: 'pos',
        name: customerName || 'POS Kunde',
        phone: customerPhone || '',
        email: customerEmail || '',
        tableName: tableName,
        items: cartItems,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: posPaymentMethod,
        createdAt: now.toISOString(),
        pickupDate: now.toLocaleDateString('de-DE'),
        pickupTime: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    };

    try {
        // Submit to API
        const res = await fetch('/api/inbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            // Print receipt if requested
            if (andPrint) {
                printPOSReceipt(payload);
            }
            // Show success
            showPOSSuccess(total, orderId);
            // Clear cart
            clearPOSCart();
        } else {
            showPOSToast('Bestellung fehlgeschlagen!', 'error');
        }
    } catch (e) {
        // Offline: still show success and print
        if (andPrint) {
            printPOSReceipt(payload);
        }
        showPOSSuccess(total, orderId);
        clearPOSCart();
    }
};

window.printPOSReceipt = function(order) {
    const printContent = `
    <!DOCTYPE html>
    <html><head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; width: 280px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .big { font-size: 16px; font-weight: bold; }
        @media print { body { width: auto; } }
    </style>
    </head><body>
    <div class="center bold big">Kimi Sushi</div>
    <div class="center">Bestellung #${order.id.replace('pos_', '')}</div>
    <div class="center">${new Date().toLocaleString('de-DE')}</div>
    ${order.tableName ? `<div class="center">Tisch: ${order.tableName}</div>` : ''}
    ${order.name ? `<div class="center">${order.name}</div>` : ''}
    <div class="line"></div>
    ${order.items.map(i => `
    <div class="row">
        <span>${i.quantity}x ${i.name}</span>
        <span>${(i.unitPrice * i.quantity).toFixed(2).replace('.', ',')} €</span>
    </div>
    ${i.note ? `<div class="row" style="font-size:10px;color:#666;"><span>  → ${i.note}</span></div>` : ''}
    `).join('')}
    <div class="line"></div>
    <div class="row"><span>Zwischensumme</span><span>${parseFloat(order.subtotal).toFixed(2).replace('.', ',')} €</span></div>
    ${parseFloat(order.discount) > 0 ? `<div class="row"><span>Rabatt</span><span>-${parseFloat(order.discount).toFixed(2).replace('.', ',')} €</span></div>` : ''}
    <div class="row"><span>MwSt.</span><span>${parseFloat(order.taxAmount).toFixed(2).replace('.', ',')} €</span></div>
    <div class="line"></div>
    <div class="row big"><span>Gesamt</span><span>${parseFloat(order.total).toFixed(2).replace('.', ',')} €</span></div>
    <div class="row"><span>Bezahlung</span><span>${order.paymentMethod === 'cash' ? 'Bar' : order.paymentMethod === 'card' ? 'Karte' : order.paymentMethod}</span></div>
    <div class="line"></div>
    <div class="center">Vielen Dank für Ihre Bestellung!</div>
    <div class="center">Kimi Sushi - Authentische japanische Küche</div>
    </body></html>`;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    }
};

function showPOSSuccess(total, orderId) {
    const modal = document.getElementById('pos-success-modal');
    if (!modal) {
        showPOSToast(`Bestellung #${orderId.replace('pos_', '')} — ${formatPOSPrice(total)}`, 'success');
        return;
    }
    document.getElementById('pos-success-total').textContent = formatPOSPrice(total);
    document.getElementById('pos-success-id').textContent = '#' + orderId.replace('pos_', '');
    modal.classList.add('show');
}

window.closePOSSuccessModal = function() {
    const modal = document.getElementById('pos-success-modal');
    if (modal) modal.classList.remove('show');
};

// ============================================================
// TOAST
// ============================================================

function showPOSToast(message, type = 'success') {
    let container = document.getElementById('pos-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pos-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `pos-toast pos-toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// SEARCH
// ============================================================

window.posSearch = function(query) {
    posSearchQuery = query;
    renderPOSMenu();
};

// ============================================================
// UTILITY
// ============================================================

function parsePrice(priceStr) {
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace(/[€\s]/g, '').replace(',', '.').trim();
    return parseFloat(cleaned) || 0;
}

function formatPOSPrice(amount) {
    return amount.toFixed(2).replace('.', ',') + ' €';
}

// ============================================================
// PAYMENT MODAL
// ============================================================

window.openPOSPaymentModal = function() {
    if (posCart.length === 0) return;
    const modal = document.getElementById('pos-payment-modal');
    if (!modal) return;
    const total = getPOSTotal();
    document.getElementById('pos-payment-total').textContent = formatPOSPrice(total);
    modal.classList.add('show');
};

window.closePOSPaymentModal = function() {
    const modal = document.getElementById('pos-payment-modal');
    if (modal) modal.classList.remove('show');
};

window.confirmPOSPayment = function(andPrint) {
    closePOSPaymentModal();
    submitPOSOrder(andPrint);
};

window.openPOSCartMobile = function() {
    const panel = document.getElementById('pos-cart-panel');
    if (panel) panel.classList.add('open');
    // Show overlay
    let overlay = document.getElementById('pos-cart-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pos-cart-overlay';
        overlay.className = 'pos-cart-overlay';
        overlay.onclick = togglePOSCartMobile;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
};

window.closePOSCartMobile = function() {
    const panel = document.getElementById('pos-cart-panel');
    if (panel) panel.classList.remove('open');
    const overlay = document.getElementById('pos-cart-overlay');
    if (overlay) overlay.style.display = 'none';
};

window.togglePOSCartMobile = function() {
    const panel = document.getElementById('pos-cart-panel');
    if (!panel) return;
    if (panel.classList.contains('open')) {
        closePOSCartMobile();
    } else {
        openPOSCartMobile();
    }
};

// Update FAB badge when cart changes
const originalRenderPOSCart = renderPOSCart;
renderPOSCart = function() {
    originalRenderPOSCart();
    const fabBadge = document.getElementById('pos-cart-count-fab');
    const countEl = document.getElementById('pos-cart-count');
    if (fabBadge && countEl) {
        fabBadge.textContent = countEl.textContent;
    }
    const fab = document.getElementById('pos-cart-fab');
    if (fab) {
        fab.style.display = posCart.length > 0 ? 'flex' : 'none';
    }
};
