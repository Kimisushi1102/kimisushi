// ============================================================
// POS Module — Kimi Sushi
// All state and logic in one place, wired to DOM
// ============================================================

// --- Legacy POS State (kept for backward compatibility) ---
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
// AREA / TABLE STATE (Dine-in support)
// ============================================================

// Areas — loaded from settings or defaults
let posAreas = [];

// Tables state: { tableId: { id, name, area, status, bills: [] } }
// status: 'free' | 'ordered' | 'served' | 'paid'
let posTableState = {};

// Current POS context
let posOrderType = 'dine-in';  // 'dine-in' | 'abholung' | 'lieferung'
let posActiveArea = null;       // current area id
let posActiveTable = null;      // current table id
let posActiveBillId = null;    // current bill id within the table

// Default areas (will be overridden by settings)
const POS_DEFAULT_AREAS = [
    { id: 'innen', name: 'Innen', icon: 'ph-house' },
    { id: 'terrasse', name: 'Terrasse', icon: 'ph-sun' },
    { id: 'bar', name: 'Bar', icon: 'ph-wine' },
    { id: 'obergeschoss', name: 'OG', icon: 'ph-stairs' },
];

// Default table layouts per area
const POS_DEFAULT_TABLES = {
    innen:     [ { id: 'T1', name: 'Tisch 1' }, { id: 'T2', name: 'Tisch 2' }, { id: 'T3', name: 'Tisch 3' } ],
    terrasse:  [ { id: 'T4', name: 'Tisch 4' }, { id: 'T5', name: 'Tisch 5' } ],
    bar:       [ { id: 'T6', name: 'Sitz 1' }, { id: 'T7', name: 'Sitz 2' }, { id: 'T8', name: 'Sitz 3' } ],
    obergeschoss: [ { id: 'T9', name: 'Tisch 9' }, { id: 'T10', name: 'Tisch 10' } ],
};

// State access helpers
function getPOSCurrentTableData() {
    if (!posActiveTable) return null;
    return posTableState[posActiveTable] || null;
}

function getPOSCurrentBill() {
    const table = getPOSCurrentTableData();
    if (!table || !posActiveBillId) return null;
    return table.bills.find(b => b.id === posActiveBillId) || null;
}

function getPOSBillCart(billId) {
    const table = getPOSCurrentTableData();
    if (!table) return [];
    if (billId) {
        const bill = table.bills.find(b => b.id === billId);
        return bill ? bill.items : [];
    }
    return [];
}

// ============================================================
// INIT
// ============================================================

window.initPOS = async function() {
    // Load menu from localStorage or API
    await loadPOSData();
    // Load area/table state
    await loadPOSTableState();
    // Render UI
    renderPOSAreas();
    renderPOSTables();
    renderPOSOrderType();
    renderPOSCategories();
    renderPOSMenu();
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};

async function loadPOSData() {
    // Step 1: Load from localStorage immediately (so menu is visible right away)
    if (typeof getMenuSync === 'function') {
        const localMenu = getMenuSync();
        if (localMenu.length > 0) {
            posMenu = localMenu;
            buildPOSCategories();
            renderPOSCategories();
            renderPOSMenu();
        }
    }
    if (typeof getCombosSync === 'function') {
        posCombos = getCombosSync() || [];
    }
    if (typeof getSettingsSync === 'function') {
        const cfg = getSettingsSync();
        if (cfg) {
            posTaxRate = parseFloat(cfg.taxRate1) || 19;
            posTaxRateReduced = parseFloat(cfg.taxRate2) || 7;
        }
    }

    // Step 2: Refresh from server (async)
    if (typeof getMenu === 'function') {
        try {
            const serverMenu = await getMenu();
            if (serverMenu && serverMenu.length > 0) {
                posMenu = serverMenu;
                buildPOSCategories();
                renderPOSCategories();
                renderPOSMenu();
            }
        } catch (e) { /* keep local data */ }
    }
    if (typeof getCombos === 'function') {
        try {
            const serverCombos = await getCombos();
            if (serverCombos) posCombos = serverCombos;
        } catch (e) { /* keep local data */ }
    }
    if (typeof getSettings === 'function') {
        try {
            const cfg = await getSettings();
            if (cfg) {
                posTaxRate = parseFloat(cfg.taxRate1) || 19;
                posTaxRateReduced = parseFloat(cfg.taxRate2) || 7;
            }
        } catch (e) { /* keep local data */ }
    }
    buildPOSCategories();
}

// ============================================================
// AREA / TABLE MANAGEMENT
// ============================================================

window.switchPOSArea = function(areaId) {
    posActiveArea = areaId;
    // Auto-select first table of the area if no table selected or current table is from different area
    const areaTables = Object.values(posTableState).filter(t => t.area === areaId);
    if (areaTables.length > 0) {
        if (!posActiveTable || posTableState[posActiveTable]?.area !== areaId) {
            switchPOSTable(areaTables[0].id);
        }
    } else {
        posActiveTable = null;
        posActiveBillId = null;
    }
    renderPOSAreas();
    renderPOSTables();
    renderPOSCart();
    renderPOSTotals();
    updatePOSButtons();
};

window.switchPOSTable = function(tableId) {
    // Save current cart to current bill if switching away
    if (posActiveTable && posActiveBillId) {
        syncCartToBill();
    }

    posActiveTable = tableId;
    const table = posTableState[tableId];
    if (!table) return;

    // If no bills, create the first one
    if (!table.bills || table.bills.length === 0) {
        createPOSBill(tableId, 'Rechnung 1');
    }

    // Switch to last active bill or first bill
    posActiveBillId = table.bills[table.bills.length - 1].id;

    // Load bill cart into legacy cart for display
    loadBillToCart();

    renderPOSTables();
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};

// ============================================================
// BILL MANAGEMENT
// ============================================================

function createPOSBill(tableId, name) {
    const table = posTableState[tableId];
    if (!table) return null;
    const billNumber = table.bills.length + 1;
    const bill = {
        id: 'bill_' + Date.now(),
        name: name || ('Rechnung ' + billNumber),
        items: [],
        subtotal: 0,
        discountAmount: 0,
        discountPercent: 0,
        taxableAmount: 0,
        taxAmount: 0,
        total: 0,
        paymentMethod: 'cash',
        status: 'open',
        paidAt: null,
    };
    table.bills.push(bill);
    return bill;
}

window.createNewPOSBill = function() {
    if (!posActiveTable) {
        showPOSToast('Bitte zuerst einen Tisch auswählen!', 'error');
        return;
    }
    const table = posTableState[posActiveTable];
    if (!table) return;
    const bill = createPOSBill(posActiveTable, 'Rechnung ' + (table.bills.length));
    if (bill) {
        posActiveBillId = bill.id;
        loadBillToCart();
        renderPOSTables();
        renderPOSCart();
        renderPOSTotals();
        showPOSToast('Neue Rechnung erstellt: ' + bill.name);
    }
};

window.switchPOSBill = function(billId) {
    if (!posActiveTable || !billId) return;
    // Save current cart
    syncCartToBill();
    // Switch
    posActiveBillId = billId;
    loadBillToCart();
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};

window.renamePOSBill = function(billId, newName) {
    if (!posActiveTable) return;
    const table = posTableState[posActiveTable];
    if (!table) return;
    const bill = table.bills.find(b => b.id === billId);
    if (bill) {
        bill.name = newName || bill.name;
        renderPOSCart();
    }
};

window.deletePOSBill = function(billId) {
    if (!posActiveTable) return;
    const table = posTableState[posActiveTable];
    if (!table || table.bills.length <= 1) {
        showPOSToast('Mindestens eine Rechnung muss bestehen!', 'error');
        return;
    }
    const idx = table.bills.findIndex(b => b.id === billId);
    if (idx < 0) return;
    table.bills.splice(idx, 1);
    if (posActiveBillId === billId) {
        posActiveBillId = table.bills[Math.max(0, idx - 1)].id;
        loadBillToCart();
    }
    renderPOSTables();
    renderPOSCart();
    renderPOSTotals();
    showPOSToast('Rechnung entfernt');
};

function syncCartToBill() {
    if (!posActiveTable || !posActiveBillId) return;
    const table = posTableState[posActiveTable];
    if (!table) return;
    const bill = table.bills.find(b => b.id === posActiveBillId);
    if (!bill) return;

    // Sync cart items into bill
    bill.items = posCart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        note: item.note || '',
        isCombo: item.isCombo || false,
        category: item.category || '',
        pieces: item.pieces || '',
        selected: false,
    }));
    bill.paymentMethod = posPaymentMethod;
    bill.discountAmount = posDiscountAmount;
    bill.discountPercent = posDiscountPercent;
    recalcPOSBill(bill);
}

function loadBillToCart() {
    if (!posActiveTable || !posActiveBillId) {
        posCart = [];
        posPaymentMethod = 'cash';
        posDiscountAmount = 0;
        posDiscountPercent = 0;
        return;
    }
    const bill = getPOSCurrentBill();
    if (!bill) {
        posCart = [];
        return;
    }
    posCart = bill.items.map(item => ({ ...item, selected: false }));
    posPaymentMethod = bill.paymentMethod || 'cash';
    posDiscountAmount = bill.discountAmount || 0;
    posDiscountPercent = bill.discountPercent || 0;
}

function recalcPOSBill(bill) {
    const subtotal = bill.items.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);
    const discount = bill.discountPercent > 0
        ? subtotal * (bill.discountPercent / 100)
        : (bill.discountAmount || 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * (posTaxRate / 100);
    bill.subtotal = subtotal;
    bill.taxableAmount = taxable;
    bill.taxAmount = tax;
    bill.total = taxable + tax;
}

// ============================================================
// ORDER TYPE SELECTION
// ============================================================

window.selectPOSOrderType = function(type) {
    // Save dine-in cart if switching away from dine-in
    if (posOrderType === 'dine-in' && posActiveTable) {
        syncCartToBill();
    }

    posOrderType = type;

    if (type !== 'dine-in') {
        // Clear dine-in context
        posActiveTable = null;
        posActiveBillId = null;
        posActiveArea = null;
        posCart = [];
        posPaymentMethod = 'cash';
        posDiscountAmount = 0;
        posDiscountPercent = 0;
    }

    renderPOSOrderType();
    renderPOSAreas();
    renderPOSTables();
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
};
async function loadPOSTableState() {
    posAreas = POS_DEFAULT_AREAS;
    if (posAreas.length > 0) {
        posActiveArea = posAreas[0].id;
    }

    // Load tables from server or use defaults
    try {
        if (typeof getTables === 'function') {
            const serverTables = await getTables();
            if (serverTables && serverTables.length > 0) {
                // Group server tables by area (infer area from table name or zone)
                const grouped = {};
                serverTables.forEach(t => {
                    const area = t.zone || 'innen';
                    if (!grouped[area]) grouped[area] = [];
                    grouped[area].push({ id: t.id, name: t.name || t.id });
                });
                // Build posTableState
                Object.keys(grouped).forEach(areaId => {
                    grouped[areaId].forEach(tbl => {
                        const tid = tbl.id;
                        if (!posTableState[tid]) {
                            posTableState[tid] = {
                                id: tid,
                                name: tbl.name,
                                area: areaId,
                                status: 'free',
                                bills: [],
                                paymentMethod: 'cash',
                                discountAmount: 0,
                                discountPercent: 0,
                            };
                        }
                    });
                });
                return;
            }
        }
    } catch (e) {}

    // Use default table layout
    Object.keys(POS_DEFAULT_TABLES).forEach(areaId => {
        POS_DEFAULT_TABLES[areaId].forEach(tbl => {
            if (!posTableState[tbl.id]) {
                posTableState[tbl.id] = {
                    id: tbl.id,
                    name: tbl.name,
                    area: areaId,
                    status: 'free',
                    bills: [],
                    paymentMethod: 'cash',
                    discountAmount: 0,
                    discountPercent: 0,
                };
            }
        });
    });
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
            pieces: item.pieces || '',
            selected: false,
        });
    }
    onPOSCartChanged();
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
            isCombo: true,
            selected: false,
        });
    }
    onPOSCartChanged();
}

window.posChangeQuantity = function(index, delta) {
    const item = posCart[index];
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        posCart.splice(index, 1);
    }
    onPOSCartChanged();
};

window.posRemoveItem = function(index) {
    posCart.splice(index, 1);
    onPOSCartChanged();
};

window.posUpdateItemNote = function(index, note) {
    if (posCart[index]) {
        posCart[index].note = note;
    }
};

function clearPOSCart() {
    posDiscountAmount = 0;
    posDiscountPercent = 0;
    posCustomerName = '';
    posCustomerPhone = '';
    posCustomerEmail = '';
    posOrderNote = '';
    posActiveOrderId = null;

    if (posOrderType === 'dine-in' && posActiveTable && posActiveBillId) {
        syncCartToBill();
        posCart = [];
        posPaymentMethod = 'cash';
    } else {
        posCart = [];
        posPaymentMethod = 'cash';
    }

    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    updatePOSButtons();
    const nameEl = document.getElementById('pos-customer-name');
    const phoneEl = document.getElementById('pos-customer-phone');
    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
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

// Central cart change handler — syncs to bill and updates all displays
function onPOSCartChanged() {
    // Sync cart to active bill
    if (posActiveTable && posActiveBillId) {
        syncCartToBill();
        // Update table status
        const table = posTableState[posActiveTable];
        if (table) {
            const bill = getPOSCurrentBill();
            if (bill && bill.items.length > 0) {
                table.status = 'ordered';
            }
        }
        renderPOSTables();
    }
    // Update displays
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    renderPOSBillTabs();
    renderPOSCartContext();
    updatePOSButtons();
}

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
        const selChecked = item.selected ? 'checked' : '';
        const selClass = item.selected ? 'selected' : '';
        return `
        <div class="pos-cart-item ${item.note ? 'pos-cart-item--has-note' : ''} ${selClass}">
            ${posItemSelectionMode ? `<div class="pos-item-selector ${selChecked ? 'checked' : ''}" onclick="togglePOSItem(${index})">
                ${selChecked ? '<i class="ph ph-check" style="font-size:12px"></i>' : ''}
            </div>` : ''}
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

    updatePOSSplitUI();
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

// ============================================================
// RENDER: ORDER TYPE
// ============================================================

function renderPOSOrderType() {
    const container = document.getElementById('pos-order-type-selector');
    if (!container) return;
    container.innerHTML = `
        <button class="pos-order-type-btn ${posOrderType === 'dine-in' ? 'active' : ''}" onclick="selectPOSOrderType('dine-in')">
            <i class="ph ph-fork-knife text-sm"></i>
            <span>Dine-in</span>
        </button>
        <button class="pos-order-type-btn ${posOrderType === 'abholung' ? 'active' : ''}" onclick="selectPOSOrderType('abholung')">
            <i class="ph ph-package text-sm"></i>
            <span>Abholung</span>
        </button>
        <button class="pos-order-type-btn ${posOrderType === 'lieferung' ? 'active' : ''}" onclick="selectPOSOrderType('lieferung')">
            <i class="ph ph-truck text-sm"></i>
            <span>Lieferung</span>
        </button>
    `;
}

// ============================================================
// RENDER: AREAS
// ============================================================

function renderPOSAreas() {
    const container = document.getElementById('pos-area-tabs');
    if (!container) return;
    if (posOrderType !== 'dine-in') {
        container.innerHTML = '';
        return;
    }
    const areaList = posAreas.length > 0 ? posAreas : POS_DEFAULT_AREAS;
    container.innerHTML = areaList.map(area => `
        <button class="pos-area-tab ${posActiveArea === area.id ? 'active' : ''}"
                onclick="switchPOSArea('${area.id}')">
            <i class="ph ${area.icon || 'ph-map-pin'} text-sm"></i>
            <span>${area.name}</span>
        </button>
    `).join('');
}

// ============================================================
// RENDER: TABLES
// ============================================================

function renderPOSTables() {
    const wrapper = document.getElementById('pos-table-grid');
    if (!wrapper) return;
    if (posOrderType !== 'dine-in') {
        wrapper.innerHTML = '';
        wrapper.classList.remove('visible');
        return;
    }

    wrapper.classList.add('visible');
    const container = wrapper.querySelector('.pos-table-grid') || (wrapper.innerHTML = '<div class="pos-table-grid"></div>', wrapper.firstElementChild);
    const currentArea = posActiveArea || (posAreas[0]?.id);
    const areaTables = Object.values(posTableState)
        .filter(t => t.area === currentArea)
        .sort((a, b) => a.id.localeCompare(b.id));

    if (areaTables.length === 0) {
        container.innerHTML = '<div class="pos-empty-state"><p>Keine Tische in diesem Bereich</p></div>';
        return;
    }

    container.innerHTML = areaTables.map(table => {
        const billCount = table.bills ? table.bills.length : 0;
        const itemCount = table.bills ? table.bills.reduce((s, b) => s + b.items.length, 0) : 0;
        const isActive = posActiveTable === table.id;
        const isFree = table.status === 'free';
        const hasBills = billCount > 0;
        const allPaid = hasBills && table.bills.every(b => b.status === 'paid');
        let statusLabel = isFree && !hasBills ? 'Frei' : (allPaid ? 'Bezahlt' : 'Bestellt');
        let statusClass = isFree && !hasBills ? 'status-free' : (allPaid ? 'status-paid' : 'status-ordered');
        return `<div class="pos-table-card ${isActive ? 'active' : ''} ${statusClass}" onclick="switchPOSTable('${table.id}')">
            <div class="pos-table-name">${table.name}</div>
            <div class="pos-table-id">${table.id}</div>
            <div class="pos-table-status ${statusClass}">${statusLabel}</div>
            ${hasBills ? `<div class="pos-table-bills">${billCount} R. &middot; ${itemCount} Artikel</div>` : ''}
        </div>`;
    }).join('');
}

// ============================================================
// RENDER: BILL TABS IN CART
// ============================================================

function renderPOSBillTabs() {
    const container = document.getElementById('pos-bill-tabs');
    if (!container) return;

    if (posOrderType !== 'dine-in' || !posActiveTable) {
        container.innerHTML = '';
        return;
    }

    const table = posTableState[posActiveTable];
    if (!table || table.bills.length === 0) {
        container.innerHTML = '';
        return;
    }

    const tabs = table.bills.map(bill => `
        <button class="pos-bill-tab ${posActiveBillId === bill.id ? 'active' : ''} ${bill.status === 'paid' ? 'paid' : ''}"
                onclick="switchPOSBill('${bill.id}')"
                title="${bill.name}">
            <span class="pos-bill-tab-name">${bill.name}</span>
            <span class="pos-bill-tab-total">${formatPOSPrice(bill.total)}</span>
        </button>
    `).join('');

    const addBtn = `<button class="pos-bill-tab-add" onclick="createNewPOSBill()" title="Neue Rechnung erstellen">
        <i class="ph ph-plus text-sm"></i>
    </button>`;

    container.innerHTML = tabs + addBtn;
}

// ============================================================
// RENDER: CART CONTEXT INFO
// ============================================================

function renderPOSCartContext() {
    const contextEl = document.getElementById('pos-cart-context');
    if (!contextEl) return;

    if (posOrderType === 'dine-in' && posActiveTable) {
        const table = posTableState[posActiveTable];
        const area = posAreas.find(a => a.id === table?.area);
        contextEl.innerHTML = `
            <div class="pos-context-info">
                <i class="ph ph-fork-knife text-sm text-[#8B0000]"></i>
                <span class="pos-context-type">Dine-in</span>
                <span class="pos-context-sep">·</span>
                <span class="pos-context-area">${area?.name || table?.area}</span>
                <span class="pos-context-sep">·</span>
                <span class="pos-context-table">${table?.name}</span>
                ${posActiveBillId ? ` <span class="pos-context-sep">·</span> <span class="pos-context-bill">${table?.bills.find(b => b.id === posActiveBillId)?.name || ''}</span>` : ''}
            </div>
        `;
    } else {
        const labels = { abholung: 'Abholung', lieferung: 'Lieferung' };
        contextEl.innerHTML = `
            <div class="pos-context-info">
                <i class="ph ph-shopping-bag text-sm text-[#8B0000]"></i>
                <span class="pos-context-type">${labels[posOrderType] || posOrderType}</span>
            </div>
        `;
    }
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
    // Sync discount to current bill
    if (posActiveTable && posActiveBillId) {
        syncCartToBill();
        const bill = getPOSCurrentBill();
        if (bill) {
            bill.discountPercent = posDiscountPercent;
            bill.discountAmount = posDiscountAmount;
            recalcPOSBill(bill);
        }
    }
    renderPOSTotals();
    renderPOSTaxBreakdown();
    renderPOSBillTabs();
    closePOSDiscountModal();
};

window.removePOSDiscount = function() {
    posDiscountPercent = 0;
    posDiscountAmount = 0;
    renderPOSTotals();
    renderPOSTaxBreakdown();
};

// ============================================================
// SPLIT BILL — move items between bills
// ============================================================

let posItemSelectionMode = false;

window.togglePOSItemSelection = function() {
    posItemSelectionMode = !posItemSelectionMode;
    // Reset all selections when entering selection mode
    posCart.forEach(item => item.selected = false);
    renderPOSCart();
    updatePOSSplitUI();
};

function updatePOSSplitUI() {
    const splitEl = document.getElementById('pos-split-actions');
    const countEl = document.getElementById('pos-selected-count');
    const selectEl = document.getElementById('pos-move-to-bill-select');
    if (!splitEl) return;

    if (!posItemSelectionMode || posOrderType !== 'dine-in' || !posActiveTable) {
        splitEl.classList.add('hidden');
        return;
    }

    splitEl.classList.remove('hidden');
    const selectedCount = posCart.filter(i => i.selected).length;
    if (countEl) countEl.textContent = `${selectedCount} ausgewählt`;

    // Populate bill selector
    if (selectEl) {
        const table = posTableState[posActiveTable];
        if (table) {
            selectEl.innerHTML = table.bills
                .filter(b => b.id !== posActiveBillId && b.status !== 'paid')
                .map(b => `<option value="${b.id}">${b.name} (${formatPOSPrice(b.total)})</option>`)
                .join('');
        }
    }
}

window.togglePOSItem = function(index) {
    if (!posItemSelectionMode) return;
    const item = posCart[index];
    if (!item) return;
    item.selected = !item.selected;
    renderPOSCart();
    updatePOSSplitUI();
};

window.moveSelectedItemsToBill = function() {
    const targetBillId = document.getElementById('pos-move-to-bill-select')?.value;
    if (!targetBillId) {
        showPOSToast('Bitte eine Rechnung auswählen!', 'error');
        return;
    }

    const table = posTableState[posActiveTable];
    if (!table) return;

    const targetBill = table.bills.find(b => b.id === targetBillId);
    if (!targetBill) return;

    // Find selected items and move them
    const toMove = posCart.filter(i => i.selected);
    if (toMove.length === 0) {
        showPOSToast('Keine Artikel ausgewählt!', 'error');
        return;
    }

    // Remove from current cart (reverse to keep indices valid)
    const selectedIndices = posCart.map((item, idx) => item.selected ? idx : -1).filter(i => i >= 0).sort((a, b) => b - a);
    selectedIndices.forEach(idx => posCart.splice(idx, 1));

    // Add to target bill
    toMove.forEach(item => {
        const existing = targetBill.items.find(ti => ti.id === item.id && ti.note === item.note);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            targetBill.items.push({ ...item, selected: false });
        }
    });

    // Recalc both bills
    if (posActiveBillId) {
        const currentBill = table.bills.find(b => b.id === posActiveBillId);
        if (currentBill) recalcPOSBill(currentBill);
    }
    recalcPOSBill(targetBill);

    // Exit selection mode
    posItemSelectionMode = false;
    toMove.forEach(i => i.selected = false);

    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    renderPOSBillTabs();
    updatePOSSplitUI();
    renderPOSTables();
    showPOSToast(`${toMove.length} Artikel verschoben`);
};

// ============================================================
// PAYMENT METHOD
// ============================================================

window.selectPOSPayment = function(method) {
    posPaymentMethod = method;
    if (posActiveTable && posActiveBillId) {
        const bill = getPOSCurrentBill();
        if (bill) bill.paymentMethod = method;
    }
    document.querySelectorAll('.pos-payment-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.method === method);
    });
};

// ============================================================
// SUBMIT ORDER
// ============================================================

function markCurrentBillPaid() {
    if (!posActiveTable || !posActiveBillId) return;
    const table = posTableState[posActiveTable];
    if (!table) return;
    const bill = table.bills.find(b => b.id === posActiveBillId);
    if (!bill) return;

    bill.status = 'paid';
    bill.paidAt = new Date().toISOString();

    // Empty the cart for this bill
    posCart = [];
    posDiscountAmount = 0;
    posDiscountPercent = 0;

    // Check if all bills are paid
    const allPaid = table.bills.every(b => b.status === 'paid');
    if (allPaid) {
        table.status = 'free';
        table.bills = [];
        posActiveBillId = null;
        showPOSToast('Alle Rechnungen bezahlt! Tisch ist frei.');
    } else {
        // Switch to next unpaid bill
        const nextBill = table.bills.find(b => b.status !== 'paid');
        if (nextBill) {
            posActiveBillId = nextBill.id;
            loadBillToCart();
        } else {
            posActiveBillId = null;
            posCart = [];
        }
    }

    renderPOSTables();
    renderPOSCart();
    renderPOSTotals();
    renderPOSTaxBreakdown();
    renderPOSBillTabs();
    updatePOSButtons();
}

window.submitPOSOrder = async function(andPrint = false) {
    if (posCart.length === 0) return;

    const customerName = document.getElementById('pos-customer-name')?.value || '';
    const customerPhone = document.getElementById('pos-customer-phone')?.value || '';
    const customerEmail = ''; // POS usually doesn't need email

    let subtotal, discount, taxAmount, total, cartItems, tableName, orderType;

    if (posOrderType === 'dine-in' && posActiveTable && posActiveBillId) {
        // Dine-in: pay current bill only
        syncCartToBill();
        const bill = getPOSCurrentBill();
        if (!bill || bill.items.length === 0) return;

        subtotal = bill.subtotal;
        discount = bill.discountPercent > 0
            ? subtotal * (bill.discountPercent / 100)
            : (bill.discountAmount || 0);
        taxAmount = Math.max(0, subtotal - discount) * (posTaxRate / 100);
        total = Math.max(0, subtotal - discount) + taxAmount;
        cartItems = bill.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: (item.unitPrice || 0).toFixed(2),
            note: item.note || ''
        }));
        tableName = posTableState[posActiveTable]?.name || posActiveTable;
        orderType = 'dine-in';
    } else {
        // Takeaway
        subtotal = getPOSSubtotal();
        discount = getPOSDiscount();
        taxAmount = getPOSTaxAmount();
        total = getPOSTotal();
        cartItems = posCart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            note: item.note || ''
        }));
        tableName = '';
        orderType = posOrderType;
    }

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
        orderType: orderType,
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
        const res = await fetch('/api/inbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            if (andPrint) printPOSReceipt(payload);
            // Post-payment: dine-in bill vs takeaway
            if (posOrderType === 'dine-in' && posActiveTable && posActiveBillId) {
                markCurrentBillPaid();
            } else {
                showPOSSuccess(total, orderId);
                clearPOSCart();
            }
        } else {
            showPOSToast('Bestellung fehlgeschlagen!', 'error');
        }
    } catch (e) {
        // Offline: still show success and print
        if (andPrint) printPOSReceipt(payload);
        if (posOrderType === 'dine-in' && posActiveTable && posActiveBillId) {
            markCurrentBillPaid();
        } else {
            showPOSSuccess(total, orderId);
            clearPOSCart();
        }
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

    let total = 0;
    let method = posPaymentMethod;

    if (posOrderType === 'dine-in' && posActiveTable && posActiveBillId) {
        const bill = getPOSCurrentBill();
        if (bill) {
            total = bill.total || 0;
        }
    } else {
        total = getPOSTotal();
    }

    document.getElementById('pos-payment-total').textContent = formatPOSPrice(total);
    const methodLabels = { cash: 'Bar', card: 'Karte', voucher: 'Gutschein', transfer: 'Überweisung' };
    const labelEl = document.getElementById('pos-payment-method-label');
    if (labelEl) labelEl.textContent = methodLabels[method] || method;
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
