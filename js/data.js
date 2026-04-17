// Menu API - fetch from backend instead of hard-coded defaults
async function getMenu() {
    try {
        const res = await fetch('/api/menu');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch (e) {
        console.warn('[DATA] getMenu: API error, trying localStorage.', e);
    }
    // Fallback: localStorage
    const stored = localStorage.getItem('kimi_menu');
    try {
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    // Return empty array - server will provide defaults
    return [];
}

async function saveMenu(menuArray) {
    localStorage.setItem('kimi_menu', JSON.stringify(menuArray));
    try {
        await fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(menuArray)
        });
    } catch (e) {
        console.warn('[DATA] saveMenu: API sync failed.', e);
    }
}

function forceResetAllData() {
    if (confirm("Hành động này sẽ xóa toàn bộ dữ liệu hiện tại (Bàn & Món) và nạp lại bản mẫu chuẩn. Bạn có chắc chắn không?")) {
        localStorage.clear();
        location.reload(true);
    }
}

async function resetToDefault() {
    // Reset menu via API
    await saveMenu([]);
    await getMenu();
}

// Settings - fetched from API
async function getSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
                localStorage.setItem('kimi_settings', JSON.stringify(data));
                return data;
            }
        }
    } catch (e) {
        console.warn('[DATA] getSettings: API error, trying localStorage.', e);
    }
    const stored = localStorage.getItem('kimi_settings');
    try {
        if (stored) return JSON.parse(stored);
    } catch (e) {
        localStorage.removeItem('kimi_settings');
    }
    return null;
}

async function saveSettings(settingsObj) {
    localStorage.setItem('kimi_settings', JSON.stringify(settingsObj));
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsObj)
        });
    } catch (e) {
        console.warn('[DATA] saveSettings: API sync failed.', e);
    }
}

// Combos - fetched from API
async function getCombos() {
    try {
        const res = await fetch('/api/combos');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch (e) {
        console.warn('[DATA] getCombos: API error, trying localStorage.', e);
    }
    const stored = localStorage.getItem('kimi_combos');
    try {
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return [];
}

async function saveCombos(combosArray) {
    localStorage.setItem('kimi_combos', JSON.stringify(combosArray));
    try {
        await fetch('/api/combos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(combosArray)
        });
    } catch (e) {
        console.warn('[DATA] saveCombos: API sync failed.', e);
    }
}

// Tables - fetched from API
async function getTables() {
    try {
        const res = await fetch('/api/tables');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem('kimi_tables', JSON.stringify(data));
                return data;
            }
        }
    } catch (e) {
        console.warn('[DATA] getTables: API error, trying localStorage.', e);
    }
    const stored = localStorage.getItem('kimi_tables');
    try {
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return [];
}

async function saveTables(tablesArray) {
    localStorage.setItem('kimi_tables', JSON.stringify(tablesArray));
    try {
        await fetch('/api/tables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tablesArray)
        });
    } catch (e) {
        console.warn('[DATA] saveTables: API sync failed.', e);
    }
}

// History - localStorage only (no API needed for now)
function getHistory() {
    const stored = localStorage.getItem('kimi_history');
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        localStorage.removeItem('kimi_history');
        return [];
    }
}

async function saveHistory(order) {
    const history = getHistory();
    history.push(order);
    localStorage.setItem('kimi_history', JSON.stringify(history));
    // Optionally sync to API
    try {
        await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
    } catch (e) {}
}

// Cloud Sync Helpers (backward compatible)
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

// Initialize cloud sync (pull from server)
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
