// Default menu data
const defaultMenu = [
    {
        id: "1",
        code: "01",
        name: "Sake Nigiri",
        price: "5,90 €",
        category: "Nigiri",
        image: "images/salmon_nigiri.png",
        description: "Premium Lachs auf perfekt gewürztem, lauwarmem Sushireis. Ein zeitloser Klassiker.",
        tag: "Bestseller",
        pieces: "2 Stück"
    },
    {
        id: "2",
        code: "02",
        name: "Dragon Roll",
        price: "14,90 €",
        category: "Maki",
        image: "images/dragon_roll.png",
        description: "Gebackene Garnele, Gurke, umhüllt von Avocado, toppt mit <span data-tooltip=\"Süß-würzige, dicke Sojasauce\">Unagi-Sauce</span> und Sesam.",
        tag: "Empfehlung",
        pieces: "8 Stück"
    },
    {
        id: "3",
        code: "03",
        name: "Premium Sashimi",
        price: "24,50 €",
        category: "Sashimi",
        image: "images/sashimi_platter.png",
        description: "Feinste Auswahl an verschiedenen Edelfischen, kunstvoll geschnitten. Lachs, Thunfisch & <span data-tooltip=\"Japanische Gelbschwanzmakrele\">Hamachi</span>.",
        tag: "",
        pieces: "12 Scheiben"
    },
    {
        id: "4",
        code: "04",
        name: "California Roll",
        price: "9,50 €",
        category: "Maki",
        image: "images/california_roll.png",
        description: "<span data-tooltip=\"Traditionelles Fischimitat aus Krebsfleisch-Aroma\">Surimi</span>, Avocado, Gurke und cremige Mayo, sanft umhüllt von geröstetem Sesam.",
        tag: "",
        pieces: "8 Stück"
    }
];

// LocalStorage Helper Functions
function getMenu() {
    const stored = localStorage.getItem('kimi_menu');
    try {
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    saveMenu(defaultMenu);
    return defaultMenu;
}

function forceResetAllData() {
    if (confirm("Hành động này sẽ xóa toàn bộ dữ liệu hiện tại (Bàn & Món) và nạp lại bản mẫu chuẩn. Bạn có chắc chắn không?")) {
        localStorage.clear();
        location.reload(true);
    }
}

async function saveMenu(menuArray) {
    localStorage.setItem('kimi_menu', JSON.stringify(menuArray));
    return await syncToCloud('Menu', menuArray, '/api/menu');
}

function resetToDefault() {
    saveMenu(defaultMenu);
}

// Global Website Settings
const defaultSettings = {
    brandName: "Kimi Sushi",
    logoImage: "", // Empty so it uses the flower icon by default
    heroImage: "images/hero_sushi.png",
    aboutImage: "images/gallery-1.jpg",
    phone: "+49 123 4567890",
    email: "hallo@kimisushi.de",
    address: "Bernhäuser Hauptstraße 27, 70794 Filderstadt",
    // SEO (German - Primary)
    seoTitle: "Kimi Sushi | Frisches Sushi & Authentische Japanische Küche",
    seoDescription: "Genießen Sie frisches, hochwertiges Sushi bei Kimi Sushi in Filderstadt. Authentische japanische Küche, frisch zubereitet.",
    seoKeywords: "Kimi Sushi, Sushi Filderstadt, japanisches Restaurant Filderstadt, Sushi Lieferung",
    // SEO (English - Secondary)
    seoTitleEn: "Kimi Sushi | Fresh Sushi & Authentic Japanese Cuisine in Filderstadt",
    seoDescriptionEn: "Enjoy fresh, high-quality sushi at Kimi Sushi in Filderstadt. Authentic Japanese craftsmanship, freshly prepared. Order now.",
    seoKeywordsEn: "Kimi Sushi, Sushi Filderstadt, Japanese Restaurant Germany, Sushi Delivery Filderstadt",
    // Tax / VAT Settings
    taxRate1: "19", // Standard MwSt
    taxRate2: "7",  // Reduced MwSt
    seoAuthor: "Kimi Sushi Team",
    geoRegion: "DE-BW",
    geoPlacename: "Filderstadt",
    geoPosition: "48.67499;9.21361",
    hoursSummary: "Mo-Sa: 11:00-15:00 & 17:00-22:00 | So: 17:00-22:00",
    hoursMon1: "11:00 - 15:00", hoursMon2: "17:00 - 22:00",
    hoursTue1: "11:00 - 15:00", hoursTue2: "17:00 - 22:00",
    hoursWed1: "11:00 - 15:00", hoursWed2: "17:00 - 22:00",
    hoursThu1: "11:00 - 15:00", hoursThu2: "17:00 - 22:00",
    hoursFri1: "11:00 - 15:00", hoursFri2: "17:00 - 22:00",
    hoursSat1: "11:00 - 15:00", hoursSat2: "17:00 - 22:00",
    hoursSun1: "17:00 - 22:00", hoursSun2: "",
    deliveryEnabled: false,
    deliveryMinOrder: "20.00",
    deliveryFee3km: "0.00",
    deliveryFee10km: "2.50",
    deliveryFeeMax: "5.00",
    siteDomain: "kimisushi.de",
    telegramBotToken: "8695670213:AAHWbEG5TtOzfldUd8_PTQskUBNR6jkbCU8",
    telegramChatId: "5354403838",
    emailEnabled: true,
    emailApiKey: "re_GrFdNdk5_HuP5HF87sAvNXGU9uHyiwt79",
    // Gmail SMTP Settings (for admin notifications)
    gmailEnabled: false,
    gmailUser: "",
    gmailPassword: "",
    gmailNotifyEmail: "",
};

function getSettings() {
    try {
        const stored = localStorage.getItem('kimi_settings');
        if (stored) {
            const storedObj = JSON.parse(stored);
            if (storedObj && typeof storedObj === 'object') {
                return { ...defaultSettings, ...storedObj };
            }
        }
    } catch (e) {
        console.warn('[DATA] getSettings: localStorage corrupt, using defaults.', e);
        localStorage.removeItem('kimi_settings');
    }
    saveSettings(defaultSettings);
    return defaultSettings;
}

async function saveSettings(settingsObj) {
    localStorage.setItem('kimi_settings', JSON.stringify(settingsObj));
    return await syncToCloud('Settings', settingsObj, '/api/settings');
}

// Global Combos Data
const defaultCombos = [
    {
        id: "c1",
        name: "Tokyo Set",
        subtitle: "Für 1 Person",
        price: "18,90 €",
        oldPrice: "",
        tag: "",
        items: "2x Sake Nigiri, 2x Maguro Nigiri\n6x Maki Lachs\n4x California Inside Out\nMiso Suppe"
    },
    {
        id: "c2",
        name: "Sakura Premium",
        subtitle: "Ideal für 2 Personen",
        price: "45,00 €",
        oldPrice: "52,50 €",
        tag: "Chef's Choice",
        items: "8x Chef's Signature Rolls\n6x Premium Nigiri Mix\n8x Dragon Roll\nEdamame & 2 Miso Suppen"
    },
    {
        id: "c3",
        name: "Veggie Delight",
        subtitle: "100% Pflanzlich, 100% Lecker",
        price: "16,50 €",
        oldPrice: "",
        tag: "",
        items: "2x Avocado Nigiri, 2x Inari\n6x Gurke Maki\n8x Veggie Tempura Roll\nWakame Salat"
    }
];

function getCombos() {
    try {
        const stored = localStorage.getItem('kimi_combos');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn('[DATA] getCombos: localStorage corrupt, using defaults.', e);
        localStorage.removeItem('kimi_combos');
    }
    saveCombos(defaultCombos);
    return defaultCombos;
}

async function saveCombos(combosArray) {
    localStorage.setItem('kimi_combos', JSON.stringify(combosArray));
    return await syncToCloud('Combos', combosArray, '/api/combos');
}

// Global Tables Data
const defaultTables = [
    { id: "T1", name: "Bàn 1", zone: "Phòng 1", status: "empty", orderItems: [], total: 0 },
    { id: "T2", name: "Bàn 2", zone: "Phòng 1", status: "empty", orderItems: [], total: 0 },
    { id: "T3", name: "Bàn 3", zone: "Phòng 2", status: "empty", orderItems: [], total: 0 },
    { id: "T4", name: "Bàn 4", zone: "Phòng 2", status: "empty", orderItems: [], total: 0 },
    { id: "T5", name: "Bàn 5 (Ngoài)", zone: "Ngoài Trời", status: "empty", orderItems: [], total: 0 },
    { id: "T6", name: "Bàn 6 (Ngoài)", zone: "Ngoài Trời", status: "empty", orderItems: [], total: 0 }
];

function getTables() {
    const stored = localStorage.getItem('kimi_tables');
    try {
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn("Lỗi đọc bàn, đang nạp bản mẫu...");
    }
    // CƯỠNG BỨC: Nạp bàn mẫu nếu trống
    saveTables(defaultTables);
    return defaultTables;
}

async function saveTables(tablesArray) {
    localStorage.setItem('kimi_tables', JSON.stringify(tablesArray));
    return await syncToCloud('Tables', tablesArray, '/api/tables');
}

// Global Revenue/History Functions
function getHistory() {
    const stored = localStorage.getItem('kimi_history');
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        console.warn("[DATA] Lỗi đọc lịch sử, đang reset...");
        localStorage.removeItem('kimi_history');
        return [];
    }
}

async function saveHistory(order) {
    const history = getHistory();
    history.push(order);
    localStorage.setItem('kimi_history', JSON.stringify(history));
    return await syncToCloud('OrderHistory', order, '/api/history');
}
// Cloud Sync Helper
// Cloud Sync Helpers
async function syncToCloud(key, data, url) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            console.log(`[CLOUD] Đã đồng bộ ${key} thành công.`);
            return true;
        }
    } catch (e) {
        console.warn(`[CLOUD] Lỗi đồng bộ ${key}:`, e);
    }
    return false;
}

async function initCloudSync() {
    console.log("[DATA] Khởi động đồng bộ đám mây...");
    const endpoints = [
        { key: 'kimi_menu', url: '/api/menu' },
        { key: 'kimi_tables', url: '/api/tables' },
        { key: 'kimi_settings', url: '/api/settings' },
        { key: 'kimi_combos', url: '/api/combos' }
    ];

    let hasUpdates = false;
    for (const ep of endpoints) {
        try {
            const res = await fetch(ep.url);
            if (res.ok) {
                const data = await res.text();
                // Chỉ ghi đè nếu có dữ liệu thực sự
                if (data && data !== "[]" && data !== "{}" && data !== "null" && data.length > 5) {
                    localStorage.setItem(ep.key, data);
                    console.log(`[DATA] Đã tải ${ep.key} từ Cloud.`);
                    hasUpdates = true;
                }
            }
        } catch (e) {
            console.warn(`[DATA] Không thể tải ${ep.key}. Chế độ Offline.`);
        }
    }
    return hasUpdates;
}
