// Add image upload compression and base64 conversion globally
window.handleImageUpload = function(fileInput, targetId) {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 800; // Limit size to prevent localStorage overflow

            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height *= maxDim / width;
                    width = maxDim;
                } else {
                    width *= maxDim / height;
                    height = maxDim;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to base64 jpeg
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const el = document.getElementById(targetId);
            if (el) {
                el.value = base64;
                el.classList.add('ring-2', 'ring-green-400', 'bg-green-50');
                setTimeout(() => el.classList.remove('ring-2', 'ring-green-400', 'bg-green-50'), 1500);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

document.addEventListener('DOMContentLoaded', async () => {
    // --- Authentication Logic (Move to top to avoid blocking by Cloud Sync) ---
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // Check session
    if (sessionStorage.getItem('kimi_admin_auth') === 'true') {
        showDashboard();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Trim to prevent issues with accidental spaces
            if (passwordInput.value.trim() === 'admin123') {
                sessionStorage.setItem('kimi_admin_auth', 'true');
                showDashboard();
            } else {
                loginError.classList.remove('hidden');
                passwordInput.classList.add('border-red-500');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('kimi_admin_auth');
            window.location.reload();
        });
    }

    function showDashboard() {
        if (!loginScreen || !dashboard) return;
        loginScreen.classList.add('opacity-0');
        setTimeout(() => {
            loginScreen.style.display = 'none';
            dashboard.classList.remove('opacity-0', 'pointer-events-none');
            renderTable(); // load data
        }, 500);
    }

    // --- Start Cloud Sync (Background) ---
    initCloudSync().then((hasUpdates) => {
        console.log("[ADMIN] Cloud Sync completed. Updates found: " + hasUpdates);
        if (hasUpdates && sessionStorage.getItem('kimi_admin_auth') === 'true') {
            // Re-render only if we are in the dashboard and data actually changed
            if (typeof renderTable === 'function') renderTable(); 
            if (typeof renderTablesEditor === 'function' && window.allTablesEditor) {
                window.allTablesEditor = getTables();
                renderTablesEditor();
            }
        }
    });

    // --- Navigation & Tab Logic ---
    const navMenu = document.getElementById('nav-menu');
    const navCombos = document.getElementById('nav-combos');
    const navSettings = document.getElementById('nav-settings');
    const navSeo = document.getElementById('nav-seo');
    const navTables = document.getElementById('nav-tables');
    const navTunnel = document.getElementById('nav-tunnel');
    const navFinance = document.getElementById('nav-finance');
    const navPos = document.getElementById('nav-pos');
    const navInbox = document.getElementById('nav-inbox');
    const navDashboard = document.getElementById('nav-dashboard');
    const navAnalytics = document.getElementById('nav-analytics');
    const navOrders = document.getElementById('nav-orders');
    const navHours = document.getElementById('nav-website-hours');
    const navMedia = document.getElementById('nav-media');
    const navActivity = document.getElementById('nav-activity');

    const menuManagement = document.getElementById('menu-management');
    const combosManagement = document.getElementById('combos-management');
    const settingsManagement = document.getElementById('settings-management');
    const seoManagement = document.getElementById('seo-management');
    const tableManagement = document.getElementById('table-management');
    const tunnelManagement = document.getElementById('tunnel-management');
    const financeReport = document.getElementById('finance-report');
    const posManagement = document.getElementById('pos-management');
    const inboxManagement = document.getElementById('inbox-management');
    const sectionDashboard = document.getElementById('section-dashboard');
    const sectionAnalytics = document.getElementById('section-analytics');
    const sectionOrders = document.getElementById('section-orders');
    const sectionHours = document.getElementById('section-hours');
    const sectionMedia = document.getElementById('section-media');
    const sectionActivity = document.getElementById('section-activity');

    // Khởi tạo biến lưu trữ bàn để tránh lỗi undefined khi thêm bàn
    window.allTablesEditor = getTables();

    // Global switchSection for new modules
    window.switchSection = function(section) {
        const allSections = [sectionDashboard, sectionAnalytics, sectionOrders, sectionHours, menuManagement, combosManagement, settingsManagement, seoManagement, tableManagement, tunnelManagement, financeReport, posManagement, inboxManagement, sectionMedia, sectionActivity];
        const allNavs = [navDashboard, navAnalytics, navOrders, navHours, navMenu, navCombos, navSettings, navSeo, navTables, navTunnel, navFinance, navPos, navInbox, navMedia, navActivity];
        allSections.forEach(s => s && s.classList.add('hidden'));
        allNavs.forEach(n => n && (n.className = 'sidebar-nav-item nav-item'));

        const sectionMap = {
            'dashboard': [sectionDashboard, navDashboard],
            'analytics': [sectionAnalytics, navAnalytics],
            'orders': [sectionOrders, navOrders],
            'hours': [sectionHours, navHours],
            'menu': [menuManagement, navMenu],
            'combos': [combosManagement, navCombos],
            'settings': [settingsManagement, navSettings],
            'seo': [seoManagement, navSeo],
            'tables': [tableManagement, navTables],
            'tunnel': [tunnelManagement, navTunnel],
            'finance': [financeReport, navFinance],
            'pos': [posManagement, navPos],
            'inbox': [inboxManagement, navInbox],
            'media': [sectionMedia, navMedia],
            'activity': [sectionActivity, navActivity]
        };

        const pair = sectionMap[section];
        if (pair) {
            pair[0] && pair[0].classList.remove('hidden');
            if (pair[1]) pair[1].className = 'sidebar-nav-item nav-item active';
        }

        // Init modules on first view
        if (section === 'analytics' && typeof window.initAnalytics === 'function') window.initAnalytics();
        if (section === 'orders' && typeof window.initOrdersManagement === 'function') window.initOrdersManagement();
        if (section === 'hours' && typeof window.initHoursManagement === 'function') window.initHoursManagement();
        if (section === 'seo' && typeof window.initSEOManagement === 'function') window.initSEOManagement();
        if (section === 'dashboard') initDashboardQuickView();
        if (section === 'media') initMediaGallery();
    };

    function initDashboardQuickView() {
        fetch('/api/analytics').then(r => r.json()).then(data => {
            const today = new Date().toISOString().split('T')[0];
            const todayOrders = (data.dailyOrders || []).filter(d => d.date === today).reduce((s, d) => s + d.count, 0);
            const todayRev = (data.dailyRevenue || []).filter(d => d.date === today).reduce((s, d) => s + d.amount, 0);
            const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })();
            const weekVisits = (data.visits || []).filter(v => v.date >= weekStart).length;
            const weekOrders = (data.dailyOrders || []).filter(d => d.date >= weekStart).reduce((s, d) => s + d.count, 0);
            const conv = weekVisits > 0 ? ((weekOrders / weekVisits) * 100).toFixed(1) : '0.0';

            document.getElementById('dash-orders-count').textContent = todayOrders;
            document.getElementById('dash-revenue-today').textContent = todayRev.toFixed(2) + ' €';
            document.getElementById('dash-visits-week').textContent = weekVisits;
            document.getElementById('dash-conversion').textContent = conv + '%';
        }).catch(() => {});
    }

    function initMediaGallery() {
        const container = document.getElementById('media-gallery');
        if (!container) return;
        const images = ['images/hero_sushi.png','images/gallery-1.jpg','images/salmon_nigiri.png','images/dragon_roll.png','images/gyoza.png','images/miso_soup.png','images/tuna_nigiri.png','images/california_roll.png'];
        container.innerHTML = images.map(src => `<div class="border rounded-lg p-2 text-center bg-gray-50"><img src="${src}" class="w-full h-24 object-cover rounded mb-1" onerror="this.style.display='none'"><span class="text-xs text-gray-500 truncate block">${src.split('/').pop()}</span></div>`).join('');
    }

    // Nav click bindings for new items
    [navDashboard, navAnalytics, navOrders, navHours, navMedia, navActivity].forEach((nav, i) => {
        if (!nav) return;
        const sections = ['dashboard', 'analytics', 'orders', 'hours', 'media', 'activity'];
        nav.addEventListener('click', e => { e.preventDefault(); switchSection(sections[i]); });
    });

    // Keep old switchTab for backward compat, redirect to switchSection
    function switchTab(activeNav, activeContent) {
        // Dispatch to new switchSection based on content id
        const contentToSection = {
            'menu-management': 'menu', 'combos-management': 'combos', 'settings-management': 'settings',
            'seo-management': 'seo', 'table-management': 'tables', 'tunnel-management': 'tunnel',
            'finance-report': 'finance', 'pos-management': 'pos', 'inbox-management': 'inbox'
        };
        const sec = contentToSection[activeContent?.id];
        if (sec) switchSection(sec);
    }

    // Init default section
    switchSection('dashboard');

    // ---- Start Cloud Sync (Background) ----
    initCloudSync().then((hasUpdates) => {
        console.log("[ADMIN] Cloud Sync completed. Updates found: " + hasUpdates);
    });

    if (navMenu && navCombos && navSettings) {
        navMenu.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(navMenu, menuManagement);
            if (window.calendar) window.calendar.updateSize();
        });

        navCombos.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(navCombos, combosManagement);
            renderCombosTable();
        });

        navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(navSettings, settingsManagement);
            loadSettingsForm();
        });

        if (navSeo) {
            navSeo.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navSeo, seoManagement);
                loadSeoForm();
            });
        }

        if (navFinance) {
            navFinance.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navFinance, financeReport);
                renderFinanceReport();
            });
        }

        if (navTables) {
            navTables.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navTables, tableManagement);
                // Use LocalStorage instead of API
                window.allTablesEditor = getTables();
                renderTablesEditor();
            });
        }

        if (navInbox) {
            navInbox.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navInbox, inboxManagement);
                loadInbox();
            });
        }

        if (navTunnel) {
            navTunnel.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navTunnel, tunnelManagement);
            });
        }

        if (navPos) {
            navPos.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(navPos, posManagement);
            });
        }
    }

    window.addNewTable = function() {
        const nameInput = document.getElementById('new-table-name');
        const zoneInput = document.getElementById('new-table-zone');
        const name = nameInput.value.trim();
        const zone = zoneInput.value.trim();

        if (!name || !zone) {
            alert("Vui lòng nhập đầy đủ Tên bàn và Khu vực!");
            return;
        }

        const newTable = {
            id: 'T' + Date.now(),
            name: name,
            zone: zone,
            status: 'empty',
            orderItems: [],
            total: 0
        };

        window.allTablesEditor.push(newTable);
        nameInput.value = '';
        renderTablesEditor();
        // Auto-save to Cloud
        saveAllTables();
    };

    window.removeTable = function(id) {
        if (!confirm("Bạn có chắc chắn muốn xóa bàn này?")) return;
        window.allTablesEditor = window.allTablesEditor.filter(t => t.id !== id);
        renderTablesEditor();
        // Auto-save to Cloud
        saveAllTables();
    };

    window.renderTablesEditor = function() {
        const body = document.getElementById('table-list-body');
        body.innerHTML = '';
        window.allTablesEditor.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition";
            tr.innerHTML = `
                <td class="py-4 font-bold text-brand-dark">${t.name}</td>
                <td class="py-4">
                    <span class="bg-gray-100 px-3 py-1 rounded-lg text-xs font-bold text-gray-500">${t.zone}</span>
                </td>
                <td class="py-4">
                    <span class="text-[10px] font-black uppercase ${t.status === 'empty' ? 'text-green-500' : 'text-brand-red'}">
                        ${t.status === 'empty' ? 'Trống' : 'Đang có khách'}
                    </span>
                </td>
                <td class="py-4 text-right">
                    <button onclick="removeTable('${t.id}')" class="text-red-400 hover:text-red-600 transition" title="Xóa bàn">
                        <i class="ph-bold ph-trash text-lg"></i>
                    </button>
                </td>
            `;
            body.appendChild(tr);
        });
    };

    window.saveAllTables = function() {
        // Sử dụng bộ hàm chuẩn từ data.js để vừa lưu local vừa đẩy lên Cloud
        saveTables(window.allTablesEditor).then(success => {
            if (success) {
                showToast("Đã lưu & Đồng bộ sơ đồ bàn!");
            } else {
                showToast("Lưu Local OK nhưng lỗi đồng bộ Cloud.");
            }
            notifyPosUpdate();
            renderTablesEditor();
        });
    };

    // --- Settings Management Logic ---
    const settingsForm = document.getElementById('settings-form');
    function loadSettingsForm() {
        if (!settingsForm) return;
        const config = getSettings();
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
        };
        setVal('set-name', config.brandName);
        setVal('set-phone', config.phone);
        setVal('set-email', config.email);
        setVal('set-domain', config.siteDomain);
        setVal('set-tg-token', config.telegramBotToken);
        setVal('set-tg-chatid', config.telegramChatId);
        setVal('set-address', config.address);
        setVal('set-logo', config.logoImage);
        setVal('set-hero', config.heroImage);
        setVal('set-about', config.aboutImage);
        setVal('set-h-summary', config.hoursSummary);
        setVal('set-h-mon-1', config.hoursMon1);
        setVal('set-h-mon-2', config.hoursMon2);
        setVal('set-h-tue-1', config.hoursTue1);
        setVal('set-h-tue-2', config.hoursTue2);
        setVal('set-h-wed-1', config.hoursWed1);
        setVal('set-h-wed-2', config.hoursWed2);
        setVal('set-h-thu-1', config.hoursThu1);
        setVal('set-h-thu-2', config.hoursThu2);
        setVal('set-h-fri-1', config.hoursFri1);
        setVal('set-h-fri-2', config.hoursFri2);
        setVal('set-h-sat-1', config.hoursSat1);
        setVal('set-h-sat-2', config.hoursSat2);
        setVal('set-h-sun-1', config.hoursSun1);
        setVal('set-h-sun-2', config.hoursSun2);
        setVal('set-tax-1', config.taxRate1);
        setVal('set-tax-2', config.taxRate2);

        // Master Toggles
        const toggleOrdering = document.getElementById('set-ordering-enabled');
        if (toggleOrdering) {
            toggleOrdering.checked = config.orderingEnabled !== false;
        }
        const toggleDelivery = document.getElementById('set-delivery-enabled');
        if (toggleDelivery) {
            toggleDelivery.checked = config.deliveryEnabled === true;
        }

        setVal('set-delivery-min', config.deliveryMinOrder);
        setVal('set-delivery-fee-3', config.deliveryFee3km);
        setVal('set-delivery-fee-10', config.deliveryFee10km);
        setVal('set-delivery-fee-max', config.deliveryFeeMax);

        // Email Settings
        setVal('set-email-key', config.emailApiKey);
        const toggleEmail = document.getElementById('set-email-enabled');
        if (toggleEmail) {
            toggleEmail.checked = config.emailEnabled !== false;
        }

        // Gmail Settings
        setVal('set-gmail-user', config.gmailUser);
        setVal('set-gmail-password', config.gmailPassword);
        setVal('set-gmail-notify-email', config.gmailNotifyEmail);
        const toggleGmail = document.getElementById('set-gmail-enabled');
        if (toggleGmail) {
            toggleGmail.checked = config.gmailEnabled === true;
        }
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const current = getSettings();
            const config = {
                ...current,
                brandName: document.getElementById('set-name').value,
                phone: document.getElementById('set-phone').value,
                email: document.getElementById('set-email').value,
                siteDomain: document.getElementById('set-domain').value,
                address: document.getElementById('set-address').value,
                logoImage: document.getElementById('set-logo').value,
                heroImage: document.getElementById('set-hero').value,
                aboutImage: document.getElementById('set-about').value,
                hoursSummary: document.getElementById('set-h-summary').value,
                hoursMon1: document.getElementById('set-h-mon-1').value,
                hoursMon2: document.getElementById('set-h-mon-2').value,
                hoursTue1: document.getElementById('set-h-tue-1').value,
                hoursTue2: document.getElementById('set-h-tue-2').value,
                hoursWed1: document.getElementById('set-h-wed-1').value,
                hoursWed2: document.getElementById('set-h-wed-2').value,
                hoursThu1: document.getElementById('set-h-thu-1').value,
                hoursThu2: document.getElementById('set-h-thu-2').value,
                hoursFri1: document.getElementById('set-h-fri-1').value,
                hoursFri2: document.getElementById('set-h-fri-2').value,
                hoursSat1: document.getElementById('set-h-sat-1').value,
                hoursSat2: document.getElementById('set-h-sat-2').value,
                hoursSun1: document.getElementById('set-h-sun-1').value,
                hoursSun2: document.getElementById('set-h-sun-2').value,
                taxRate1: document.getElementById('set-tax-1').value,
                taxRate2: document.getElementById('set-tax-2').value,
                orderingEnabled: document.getElementById('set-ordering-enabled')?.checked,
                deliveryEnabled: document.getElementById('set-delivery-enabled')?.checked,
                deliveryMinOrder: document.getElementById('set-delivery-min').value,
                deliveryFee3km: document.getElementById('set-delivery-fee-3').value,
                deliveryFee10km: document.getElementById('set-delivery-fee-10').value,
                deliveryFeeMax: document.getElementById('set-delivery-fee-max').value,
                telegramBotToken: document.getElementById('set-tg-token').value,
                telegramChatId: document.getElementById('set-tg-chatid').value,
                emailApiKey: document.getElementById('set-email-key').value,
                emailEnabled: document.getElementById('set-email-enabled')?.checked,
                gmailEnabled: document.getElementById('set-gmail-enabled')?.checked,
                gmailUser: document.getElementById('set-gmail-user').value,
                gmailPassword: document.getElementById('set-gmail-password').value,
                gmailNotifyEmail: document.getElementById('set-gmail-notify-email').value,
            };
            saveSettings(config).then(success => {
                if (success) {
                    showToast("Đã lưu Cài đặt & Đồng bộ Server!");
                } else {
                    showToast("Lưu Local OK nhưng lỗi đồng bộ Cloud.");
                }
                notifyPosUpdate();
            });
        });
    }

    const btnTestTg = document.getElementById('btn-test-telegram');
    if (btnTestTg) {
        btnTestTg.addEventListener('click', async () => {
            btnTestTg.disabled = true;
            btnTestTg.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Đang gửi...';
            try {
                const res = await fetch('/api/test-telegram', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast("Đã gửi tin nhắn thử! Hãy kiểm tra Telegram.");
                } else {
                    showToast("Lỗi gửi tin: " + (data.message || "Unknown error"), "error");
                }
            } catch (e) {
                showToast("Lỗi kết nối Server!", "error");
            } finally {
                btnTestTg.disabled = false;
                btnTestTg.innerHTML = '<i class="ph ph-paper-plane-tilt"></i> Gửi thử tin nhắn';
            }
        });
    }

    // --- Gmail Test Button ---
    const btnTestGmail = document.getElementById('btn-test-gmail');
    if (btnTestGmail) {
        btnTestGmail.addEventListener('click', async () => {
            const gmailUser = document.getElementById('set-gmail-user').value;
            const gmailPassword = document.getElementById('set-gmail-password').value;
            const resultDiv = document.getElementById('gmail-test-result');

            if (!gmailUser || !gmailPassword) {
                if (resultDiv) {
                    resultDiv.className = 'mt-2 p-3 rounded-lg text-sm bg-red-100 text-red-700';
                    resultDiv.textContent = 'Vui lòng nhập Gmail và App Password trước!';
                    resultDiv.classList.remove('hidden');
                }
                return;
            }

            btnTestGmail.disabled = true;
            btnTestGmail.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Đang gửi...';

            try {
                // Gửi test email qua server
                const res = await fetch('/api/gmail-test-send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gmailUser: gmailUser,
                        gmailPassword: gmailPassword,
                        testMode: true
                    })
                });
                const data = await res.json();

                if (data.success) {
                    if (resultDiv) {
                        resultDiv.className = 'mt-2 p-3 rounded-lg text-sm bg-green-100 text-green-700';
                        resultDiv.textContent = '✅ Gửi email thử thành công! Hãy kiểm tra hộp thư Gmail của bạn.';
                        resultDiv.classList.remove('hidden');
                    }
                    showToast("Đã gửi email thử thành công!");
                } else {
                    if (resultDiv) {
                        resultDiv.className = 'mt-2 p-3 rounded-lg text-sm bg-red-100 text-red-700';
                        resultDiv.textContent = '❌ Lỗi: ' + (data.error || 'Không thể gửi email. Kiểm tra lại Gmail và App Password.');
                        resultDiv.classList.remove('hidden');
                    }
                    showToast("Lỗi gửi email: " + (data.error || "Unknown error"), "error");
                }
            } catch (e) {
                if (resultDiv) {
                    resultDiv.className = 'mt-2 p-3 rounded-lg text-sm bg-red-100 text-red-700';
                    resultDiv.textContent = '❌ Lỗi kết nối Server! Đảm bảo server đang chạy (node server.js)';
                    resultDiv.classList.remove('hidden');
                }
                showToast("Lỗi kết nối Server!", "error");
            } finally {
                btnTestGmail.disabled = false;
                btnTestGmail.innerHTML = '<i class="ph ph-envelope"></i> Gửi thử Gmail';
            }
        });
    }

    // --- SEO & GEO Management Logic ---
    const seoForm = document.getElementById('seo-form');
    function loadSeoForm() {
        if (!seoForm) return;
        const config = getSettings();
        document.getElementById('seo-title').value = config.seoTitle || "";
        document.getElementById('seo-desc').value = config.seoDescription || "";
        document.getElementById('seo-keywords').value = config.seoKeywords || "";
        document.getElementById('seo-author').value = config.seoAuthor || "";
        document.getElementById('geo-region').value = config.geoRegion || "";
        document.getElementById('geo-placename').value = config.geoPlacename || "";
        document.getElementById('geo-position').value = config.geoPosition || "";
    }

    if (seoForm) {
        seoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const config = getSettings();
            config.seoTitle = document.getElementById('seo-title').value;
            config.seoDescription = document.getElementById('seo-desc').value;
            config.seoKeywords = document.getElementById('seo-keywords').value;
            config.seoAuthor = document.getElementById('seo-author').value;
            config.geoRegion = document.getElementById('geo-region').value;
            config.geoPlacename = document.getElementById('geo-placename').value;
            config.geoPosition = document.getElementById('geo-position').value;
            
            saveSettings(config);
            showToast("Đã lưu dữ liệu SEO & GEO!");
        });
    }


    // --- Menu Management Logic ---
    const adminMenuList = document.getElementById('admin-menu-list');
    const addMenuForm = document.getElementById('add-menu-form');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const resetBtn = document.getElementById('reset-btn');
    const addSubmitBtn = document.getElementById('add-submit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // DOM Cache for Form Elements (Performance Optimization)
    const domEls = {
        name: document.getElementById('item-name'),
        price: document.getElementById('item-price'),
        category: document.getElementById('item-category'),
        image: document.getElementById('item-image'),
        desc: document.getElementById('item-desc'),
        tag: document.getElementById('item-tag'),
        pieces: document.getElementById('item-pieces')
    };

    let editingId = null;

    function updateCategoryDatalist() {
        const datalist = document.getElementById('category-list');
        if (!datalist) return;
        
        const menu = getMenu();
        const categories = [...new Set(menu.map(item => item.category))].filter(c => c && c.trim() !== "");
        
        // Default categories if list is empty
        if (categories.length === 0) {
            datalist.innerHTML = `
                <option value="sushi">Nigiri (Sushi)</option>
                <option value="maki">Maki Rolls</option>
                <option value="sashimi">Sashimi</option>
            `;
            return;
        }

        let optionsHtml = '';
        categories.forEach(cat => {
            optionsHtml += `<option value="${cat}">`;
        });
        datalist.innerHTML = optionsHtml;
    }

    // Deep XSS protection helper
    function escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    function renderTable() {
        const menu = getMenu();
        adminMenuList.innerHTML = '';

        // Update category datalist for the input
        updateCategoryDatalist();

        if (menu.length === 0) {
            adminMenuList.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500 text-sm">Chưa có món ăn nào trong thực đơn.</td></tr>`;
            return;
        }

        menu.reverse().forEach(item => { // Reverse to show newest on top
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition-colors";
            
            const categoryLabels = {
                'sushi': 'Nigiri',
                'maki': 'Maki Rolls',
                'sashimi': 'Sashimi'
            };
            const categoryName = categoryLabels[item.category.toLowerCase()] || (item.category.charAt(0).toUpperCase() + item.category.slice(1));
            tr.innerHTML = `
                <td class="p-4">
                    <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm">
                </td>
                <td class="p-4">
                    <p class="font-black text-sm text-brand-red uppercase tracking-tighter">${item.code || '--'}</p>
                </td>
                <td class="p-4">
                    <p class="font-semibold text-sm text-brand-dark">${item.name}</p>
                    <p class="text-xs text-gray-500 truncate w-48">${item.description}</p>
                    ${item.tag ? `<span class="inline-block px-2 py-0.5 mt-1 rounded text-[10px] bg-gray-100 font-medium">${item.tag}</span>` : ''}
                </td>
                <td class="p-4 text-sm text-gray-600">${categoryName}</td>
                <td class="p-4 text-sm font-semibold">${item.price}</td>
                <td class="p-4 text-right">
                    <button class="text-brand-gold hover:bg-brand-gold/10 p-2 rounded-lg transition-colors edit-btn" data-id="${item.id}" title="Sửa">
                        <i class="ph ph-pencil-simple text-lg"></i>
                    </button>
                    <button class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors delete-btn" data-id="${item.id}" title="Xoá">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </td>
            `;

            adminMenuList.appendChild(tr);
        });

        // Add delete and edit event listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm("Bạn có chắc chắn muốn xoá món này?")) {
                    deleteItem(id);
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editItemPreFill(id);
            });
        });
    }

    // Cancel Edit
    cancelEditBtn.addEventListener('click', () => {
        resetFormState();
    });

    function resetFormState() {
        editingId = null;
        addMenuForm.reset();
        addSubmitBtn.textContent = "Thêm món mới";
        cancelEditBtn.classList.add('hidden');
    }

    function editItemPreFill(id) {
        const currentMenu = getMenu();
        const item = currentMenu.find(i => i.id === id);
        if (item) {
            editingId = id;
            document.getElementById('item-code').value = item.code || "";
            domEls.name.value = item.name;
            domEls.price.value = item.price;
            domEls.category.value = item.category;
            domEls.image.value = item.image;
            domEls.desc.value = item.description;
            domEls.tag.value = item.tag;
            domEls.pieces.value = item.pieces || "";

            addSubmitBtn.textContent = "Lưu thay đổi";
            cancelEditBtn.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Add or Update item
    addMenuForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = {
            code: escapeHTML(document.getElementById('item-code').value),
            name: escapeHTML(domEls.name.value),
            price: escapeHTML(domEls.price.value),
            category: escapeHTML(domEls.category.value),
            image: domEls.image.value, // Image usually needs valid URL structure, skipping deep escape to allow basic URLs
            description: escapeHTML(domEls.desc.value),
            tag: escapeHTML(domEls.tag.value),
            pieces: escapeHTML(domEls.pieces.value) || ""
        };

        let currentMenu = getMenu();

        if (editingId) {
            // Update existing
            currentMenu = currentMenu.map(item => {
                if (item.id === editingId) {
                    return { ...item, ...formData };
                }
                return item;
            });
        } else {
            // Add new
            currentMenu.push({
                id: Date.now().toString(),
                ...formData
            });
        }
        
        saveMenu(currentMenu).then(success => {
            if (success) {
                showToast(editingId ? "Đã cập nhật món ăn & Đồng bộ POS!" : "Đã thêm món mới & Đồng bộ POS!");
            } else {
                showToast("Lưu Local OK nhưng lỗi Cloud.");
            }
            notifyPosUpdate();
            resetFormState();
            renderTable();
        });
    });

    function deleteItem(id) {
        let currentMenu = getMenu();
        currentMenu = currentMenu.filter(item => item.id !== id);
        saveMenu(currentMenu);
        renderTable();
        showToast("Đã xoá món ăn.", true);
    }

    resetBtn.addEventListener('click', () => {
        if(confirm("Bạn có chắc chắn muốn Xóa toàn bộ và khôi phục Thực đơn Mặc định không?")) {
            saveMenu(getMenu()).then(() => {
                showToast("Đã khôi phục & Đồng bộ POS.");
                renderTable();
                notifyPosUpdate();
            });
        }
    });

    const mockDataBtn = document.getElementById('mock-data-btn');
    if (mockDataBtn) {
        mockDataBtn.addEventListener('click', () => {
            if(confirm("Bạn có muốn tạo ra 50 món ăn ngẫu nhiên để Test không?")) {
                const currentMenu = getMenu();
                
                const templates = [
                    { name: "Spicy Tuna Roll", image: "images/dragon_roll.png", category: "maki", p: 8.90, desc: "Scharfer Thunfisch mit Frühlingszwiebeln und Chili-Mayo.", pieces: "8 Stück" },
                    { name: "Avocado Maki", image: "images/california_roll.png", category: "maki", p: 4.50, desc: "Klassisches Maki mit frischer Avocado und Sesam.", pieces: "6 Stück" },
                    { name: "Ebi Nigiri", image: "images/salmon_nigiri.png", category: "sushi", p: 5.50, desc: "Gekochte Großgarnele auf Sushireis.", pieces: "2 Stück" },
                    { name: "Tuna Sashimi", image: "images/sashimi_platter.png", category: "sashimi", p: 18.50, desc: "Feinste Scheiben vom Gelbflossenthunfisch.", pieces: "10 Scheiben" },
                    { name: "Tempura Veggie", image: "images/california_roll.png", category: "maki", p: 7.90, desc: "Frittiertes Gemüse im Tempuramantel gerollt.", pieces: "8 Stück" }
                ];

                for (let i = 0; i < 50; i++) {
                    const t = templates[Math.floor(Math.random() * templates.length)];
                    const rPrice = (t.p + (Math.random() * 5)).toFixed(2).replace('.', ',');
                    const isNew = Math.random() > 0.8;
                    const isTop = Math.random() > 0.9;
                    let tag = "";
                    if (isNew && !isTop) tag = "Neu";
                    if (isTop) tag = "Bestseller";

                    currentMenu.push({
                        id: 'mock_' + Date.now() + '_' + i,
                        name: t.name + ' Variante ' + (i+1),
                        price: rPrice + " €",
                        category: t.category,
                        image: t.image,
                        description: t.desc + " Frisch zubereitet und ein wahrer Genuss.",
                        tag: tag,
                        pieces: t.pieces
                    });
                }
                
                saveMenu(currentMenu).then(() => {
                    renderTable();
                    notifyPosUpdate();
                    showToast("Đã tạo 50 món ăn Demo.");
                });
            }
        });
    }

    function showToast(message, isWarning = false) {
        toastMsg.textContent = message;
        const icon = toast.querySelector('i');
        if (isWarning) {
            icon.className = "ph-fill ph-trash text-red-400 text-xl";
        } else {
            icon.className = "ph-fill ph-check-circle text-green-400 text-xl";
        }
        
        toast.classList.remove('translate-y-full', 'opacity-0');
        
        setTimeout(() => {
            toast.classList.add('translate-y-full', 'opacity-0');
        }, 3000);
    }

    // --- Combos Management Logic ---
    const adminCombosList = document.getElementById('admin-combos-list');
    const addComboForm = document.getElementById('add-combo-form');
    const comboSubmitBtn = document.getElementById('combo-submit-btn');
    const comboCancelBtn = document.getElementById('combo-cancel-btn');

    const domElsCombo = {
        name: document.getElementById('combo-name'),
        subtitle: document.getElementById('combo-subtitle'),
        price: document.getElementById('combo-price'),
        oldprice: document.getElementById('combo-oldprice'),
        tag: document.getElementById('combo-tag'),
        items: document.getElementById('combo-items')
    };

    let editingComboId = null;

    function renderCombosTable() {
        if (!adminCombosList) return;
        const combos = getCombos();
        adminCombosList.innerHTML = '';

        if (combos.length === 0) {
            adminCombosList.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500 text-sm">Chưa có Combo nào.</td></tr>`;
            return;
        }

        combos.forEach(c => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0";
            
            const itemsListHtml = c.items.split('\n').filter(i => i.trim()).map(i => `<li class="text-xs text-gray-500 truncate flex gap-1"><span class="text-brand-matcha">✔</span> ${i}</li>`).join('');

            tr.innerHTML = `
                <td class="p-4 align-top">
                    <p class="font-semibold text-sm text-brand-dark">${c.name}</p>
                    <p class="text-xs text-brand-red mb-1">${c.subtitle}</p>
                    ${c.tag ? `<span class="inline-block px-2 py-0.5 rounded text-[10px] bg-brand-gold/20 text-brand-dark font-bold border border-brand-gold/30">${c.tag}</span>` : ''}
                </td>
                <td class="p-4 align-top">
                    <ul class="max-w-xs">${itemsListHtml}</ul>
                </td>
                <td class="p-4 align-top">
                    <span class="text-brand-dark font-bold text-sm block">${c.price}</span>
                    ${c.oldPrice ? `<span class="line-through text-gray-400 text-xs">${c.oldPrice}</span>` : ''}
                </td>
                <td class="p-4 text-right align-top">
                    <button class="text-brand-gold hover:bg-brand-gold/10 p-2 rounded-lg transition-colors combo-edit-btn" data-id="${c.id}" title="Sửa">
                        <i class="ph ph-pencil-simple text-lg"></i>
                    </button>
                    <button class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors combo-delete-btn" data-id="${c.id}" title="Xoá">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </td>
            `;
            adminCombosList.appendChild(tr);
        });

        document.querySelectorAll('.combo-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm("Bạn có chắc muốn xoá Combo này?")) {
                    let combos = getCombos();
                    saveCombos(combos.filter(item => item.id !== id));
                    renderCombosTable();
                    showToast("Đã xoá Combo.", true);
                }
            });
        });

        document.querySelectorAll('.combo-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const combos = getCombos();
                const item = combos.find(i => i.id === id);
                if (item) {
                    editingComboId = id;
                    domElsCombo.name.value = item.name;
                    domElsCombo.subtitle.value = item.subtitle;
                    domElsCombo.price.value = item.price;
                    domElsCombo.oldprice.value = item.oldPrice || "";
                    domElsCombo.tag.value = item.tag;
                    domElsCombo.items.value = item.items;

                    comboSubmitBtn.textContent = "Lưu thay đổi";
                    if(comboCancelBtn) comboCancelBtn.classList.remove('hidden');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    if(comboCancelBtn) {
        comboCancelBtn.addEventListener('click', () => {
            editingComboId = null;
            addComboForm.reset();
            comboSubmitBtn.textContent = "Thêm Combo";
            comboCancelBtn.classList.add('hidden');
        });
    }

    if(addComboForm) {
        addComboForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: escapeHTML(domElsCombo.name.value),
                subtitle: escapeHTML(domElsCombo.subtitle.value),
                price: escapeHTML(domElsCombo.price.value),
                oldPrice: escapeHTML(domElsCombo.oldprice.value),
                tag: escapeHTML(domElsCombo.tag.value),
                items: escapeHTML(domElsCombo.items.value) // We allow newlines, escapeHTML preserves it slightly but we handle \n manually
            };

            // Fix escapeHTML for newlines
            formData.items = domElsCombo.items.value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

            let currentCombos = getCombos();

            if (editingComboId) {
                currentCombos = currentCombos.map(item => {
                    if (item.id === editingComboId) {
                        return { ...item, ...formData };
                    }
                    return item;
                });
                showToast("Đã cập nhật Combo!");
            } else {
                currentCombos.push({
                    id: 'combo_' + Date.now().toString(),
                    ...formData
                });
                showToast("Đã thêm Combo thành công!");
            }

            saveCombos(currentCombos);
            editingComboId = null;
            addComboForm.reset();
            comboSubmitBtn.textContent = "Thêm Combo";
            if(comboCancelBtn) comboCancelBtn.classList.add('hidden');
            renderCombosTable();
        });
    }

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('border-brand-gold', 'text-brand-gold'));
            btn.classList.add('border-brand-gold', 'text-brand-gold');
            tabContents.forEach(c => c.classList.add('hidden'));
            document.getElementById(btn.dataset.target).classList.remove('hidden');
        });
    });

    // --- NEW: Socket.IO & FullCalendar Logic ---
    const socket = (typeof io !== 'undefined') ? io() : null;
    const incModal = document.getElementById('incoming-modal');
    const incTitle = document.getElementById('inc-title');
    const incDetails = document.getElementById('inc-details');
    const bellSound = document.getElementById('bell-sound');
    let currentPendingRequestId = null;
    
    // --- NEW: Finance Reporting Logic ---
    async function renderFinanceReport() {
        const tableBody = document.getElementById('finance-table-body');
        const topItemsList = document.getElementById('top-items-list');
        if (!tableBody || !topItemsList) return;

        try {
            const res = await fetch('/api/transactions');
            const transactions = await res.json();
            
            // Stats calculation
            let todayTotal = 0;
            let weekTotal = 0;
            let cashTotal = 0;
            let cardTotal = 0;
            const itemCounts = {};

            const now = new Date();
            const startOfDay = new Date(now.setHours(0,0,0,0));
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));

            transactions.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

            tableBody.innerHTML = '';
            transactions.forEach(tx => {
                const txDate = new Date(tx.timestamp);
                const amount = parseFloat(tx.total) || 0;

                // Accrue Stats
                if (txDate >= startOfDay) todayTotal += amount;
                if (txDate >= startOfWeek) weekTotal += amount;
                if (tx.paymentMethod === 'bar' || tx.paymentMethod === 'cash') cashTotal += amount;
                if (tx.paymentMethod === 'karte' || tx.paymentMethod === 'card') cardTotal += amount;

                // Count items
                (tx.items || []).forEach(item => {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
                });

                // Render row
                const row = document.createElement('tr');
                row.className = "border-b border-gray-50 hover:bg-gray-50 transition-colors";
                row.innerHTML = `
                    <td class="py-4 text-xs font-bold text-gray-500">${txDate.toLocaleString('de-DE')}</td>
                    <td class="py-4 font-black text-gray-800">${tx.tableId || 'APP'}</td>
                    <td class="py-4"><span class="px-2 py-1 rounded-md text-[10px] font-black uppercase ${tx.paymentMethod === 'bar' || tx.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${tx.paymentMethod}</span></td>
                    <td class="py-4 text-right font-black text-brand-dark">${amount.toFixed(2)} €</td>
                `;
                tableBody.appendChild(row);
            });

            // Update UI
            document.getElementById('stat-today').textContent = todayTotal.toFixed(2).replace('.', ',') + ' €';
            document.getElementById('stat-week').textContent = weekTotal.toFixed(2).replace('.', ',') + ' €';
            document.getElementById('stat-cash').textContent = cashTotal.toFixed(2).replace('.', ',') + ' €';
            document.getElementById('stat-card').textContent = cardTotal.toFixed(2).replace('.', ',') + ' €';

            // Top Items
            const sortedItems = Object.entries(itemCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
            const maxCount = sortedItems.length > 0 ? sortedItems[0][1] : 1;
            
            topItemsList.innerHTML = '';
            sortedItems.forEach(([name, count]) => {
                const percent = (count / maxCount) * 100;
                const div = document.createElement('div');
                div.innerHTML = `
                    <div class="flex justify-between text-xs font-black mb-1"><span>${name}</span><span>${count}x</span></div>
                    <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-brand-red h-full" style="width: ${percent}%"></div>
                    </div>
                `;
                topItemsList.appendChild(div);
            });

        } catch (e) {
            console.error("Finance Error:", e);
        }
    }

    // Initialize FullCalendar
    const calendarEl = document.getElementById('calendar');
    if (calendarEl && typeof FullCalendar !== 'undefined') {
        window.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: [],
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }
        });
    }

    if (socket) {
        // Fetch existing reservations
        fetch('/api/reservations')
            .then(res => res.json())
            .then(data => {
                data.forEach(res => {
                    if(window.calendar) {
                        window.calendar.addEvent({
                            title: `Tisch: ${res.name}`,
                            start: res.date,
                            allDay: true
                        });
                    }
                });
            })
            .catch(e => console.error("Could not load reservations", e));

        socket.on('admin_new_order', (order) => {
            incTitle.textContent = "Neue Bestellung!";
            const pickupStr = order.pickupDate ? `<br><b class="text-brand-red">🕒 ABHOLUNG: ${order.pickupDate.split('-').reverse().join('.')} @ ${order.pickupTime === 'asap' ? 'SOFORT' : order.pickupTime + ' Uhr'}</b>` : '';
            incDetails.innerHTML = `Name: ${order.name}<br>Telefon: ${order.phone}<br>Anzahl Gerichte: ${order.items}${pickupStr}`;
            currentPendingRequestId = { type: 'order', id: order.id, sourceData: order };
            
            incModal.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
            if(bellSound) bellSound.play().catch(e => console.log('Audio autoplay blocked'));
        });

        socket.on('admin_new_reservation', (res) => {
            incTitle.textContent = "Neue Reservierung!";
            incDetails.innerHTML = `Name: ${res.name}<br>Telefon: ${res.phone}<br>Datum: ${res.date}`;
            currentPendingRequestId = { type: 'reservation', id: res.id, data: res };

            incModal.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
            if(bellSound) bellSound.play().catch(e => console.log('Audio autoplay blocked'));
        });

        // Inbox data already handled in the real-time section above
        // No duplicate handlers needed here
    }

    // Global accept function exposed to window for onclick handlers
    window.acceptRequest = function(minutes, andPrint = false) {
        if (!currentPendingRequestId || !socket) return;
        
        incModal.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
        
        if (currentPendingRequestId.type === 'order') {
            socket.emit('admin_accept_order', { 
                orderId: currentPendingRequestId.id, 
                waitTimeMinutes: minutes 
            });
            showToast(`Bestellung bestätigt (${minutes}m)`);
            
            if (andPrint && currentPendingRequestId.sourceData) {
                printOrderTicket(currentPendingRequestId.sourceData);
            }
        } else if (currentPendingRequestId.type === 'reservation') {
            // Also add to calendar immediately
            if(window.calendar) {
                window.calendar.addEvent({
                    title: `Tisch: ${currentPendingRequestId.data.name}`,
                    start: currentPendingRequestId.data.date,
                    allDay: true
                });
            }
            showToast(`Reservierung bestätigt.`);
        }
        
        currentPendingRequestId = null;
    };

    function printOrderTicket(order) {
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        
        const html = `
            <html>
            <head>
                <title>Kimi Sushi Order Ticket</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 5mm; margin: 0; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 3mm; }
                    .details { margin-bottom: 5mm; font-size: 14px; }
                    .items { border-bottom: 1px dashed #000; padding-bottom: 5mm; margin-bottom: 5mm; }
                    .footer { text-align: center; font-size: 12px; margin-top: 5mm; }
                    h2 { margin: 0; font-size: 20px; }
                    h3 { margin: 2mm 0; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>KIMI SUSHI</h2>
                    <h3>KITCHEN TICKET</h3>
                    <p>${new Date().toLocaleString('de-DE')}</p>
                </div>
                <div class="details">
                    <p><strong>ORDER ID:</strong> ${order.id}</p>
                    <p><strong>NAME:</strong> ${order.name}</p>
                    <p><strong>PHONE:</strong> ${order.phone}</p>
                </div>
                <div class="items">
                    <p><strong>Items:</strong> ${order.items} dishes</p>
                    <p><em>Check App for full list</em></p>
                </div>
                <div class="footer">
                    <p>Vielen Dank!</p>
                </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 1000);
                        };
                    <\/script>
                </body>
                </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // --- Data Management (Backup/Restore) ---
    window.exportSystemData = function() {
        const data = {
            menu: getMenu(),
            tables: getTables(),
            settings: getSettings(),
            combos: getCombos(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sakura_pos_backup_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast("Đã xuất file sao lưu thành công!");
    };

    window.importSystemData = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.menu && data.tables && data.settings) {
                    if (confirm("Bạn có chắc chắn muốn khôi phục dữ liệu từ file này không? Dữ liệu hiện tại sẽ bị ghi đè.")) {
                        saveMenu(data.menu);
                        saveTables(data.tables);
                        saveSettings(data.settings);
                        if (data.combos) saveCombos(data.combos);
                        
                        alert("Khôi phục dữ liệu thành công! Trang web sẽ tải lại.");
                        window.location.reload();
                    }
                } else {
                    alert("File không hợp lệ hoặc thiếu dữ liệu quan trọng.");
                }
            } catch (err) {
                alert("Lỗi khi đọc file: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    // =====================
    // INBOX MANAGEMENT
    // =====================

    // Load inbox from localStorage
    window.currentInboxItem = null;
    let inboxItems = [];

    async function loadInbox() {
        inboxItems = JSON.parse(localStorage.getItem('kimi_inbox') || '[]');

        // Also fetch from cloud
        try {
            const res = await fetch('/api/inbox');
            if (res.ok) {
                const cloudInbox = await res.json();
                // Merge cloud inbox items that don't exist locally
                cloudInbox.forEach(item => {
                    if (!inboxItems.find(i => i.id === item.id)) {
                        inboxItems.unshift(item);
                    }
                });
                // Sort by time (newest first)
                inboxItems.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
            }
        } catch (e) {
            // ignore cloud errors, use localStorage
        }

        renderInboxList();
        updateInboxBadge();
        updateInboxStats();
    }

    function saveInboxToStorage() {
        localStorage.setItem('kimi_inbox', JSON.stringify(inboxItems));
        updateInboxBadge();
        updateInboxStats();
    }

    function updateInboxBadge() {
        const badge = document.getElementById('inbox-badge');
        const pendingCount = inboxItems.filter(i => i.status !== 'replied').length;
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    function updateInboxStats() {
        const pending = inboxItems.filter(i => i.status !== 'replied').length;
        const replied = inboxItems.filter(i => i.status === 'replied').length;
        const reservations = inboxItems.filter(i => i.type === 'reservation').length;
        const orders = inboxItems.filter(i => i.type === 'order').length;

        const el = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        el('inbox-stat-pending', pending);
        el('inbox-stat-replied', replied);
        el('inbox-stat-reservation', reservations);
        el('inbox-stat-order', orders);
    }

    function renderInboxList() {
        const container = document.getElementById('inbox-list');
        if (!container) return;

        if (inboxItems.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-gray-400">
                <i class="ph ph-inbox text-5xl mb-3"></i>
                <p>Chưa có thông báo nào</p>
            </div>`;
            return;
        }

        container.innerHTML = '';
        inboxItems.forEach(item => {
            const isReservation = item.type === 'reservation';
            const isPending = item.status !== 'replied';
            const isDeclined = item.status === 'declined';

            const typeLabel = isReservation ? 'RESERVIERUNG' : 'BESTELLUNG';
            const typeColor = isReservation ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
            const statusColor = isDeclined ? 'bg-red-100 text-red-700' : (isPending ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700');
            const statusLabel = isDeclined ? 'ABGESAGT' : (isPending ? 'OFFEN' : 'BEANTWORTET');

            const dateStr = item.date ? item.date.split('-').reverse().join('.') : '-';
            const timeStr = item.time || item.pickupTime || '-';
            const timeDisplay = item.pickupDate
                ? `${item.pickupDate.split('-').reverse().join('.')} @ ${item.pickupTime === 'asap' ? 'SOFORT' : item.pickupTime}`
                : (item.date ? `${dateStr} ${timeStr}` : timeStr);

            const itemsPreview = item.items
                ? (Array.isArray(item.items) ? `${item.items.length} Món` : item.items)
                : '';

            const div = document.createElement('div');
            div.className = `p-4 hover:bg-gray-50 cursor-pointer transition flex items-start gap-4 ${!isPending ? 'opacity-60' : ''}`;
            div.innerHTML = `
                <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isReservation ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}">
                    <i class="ph-fill ${isReservation ? 'ph-calendar-check' : 'ph-shopping-cart'} text-xl"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="text-xs font-black ${typeColor} px-2 py-0.5 rounded-full">${typeLabel}</span>
                        <span class="text-xs font-black ${statusColor} px-2 py-0.5 rounded-full">${statusLabel}</span>
                    </div>
                    <p class="font-bold text-gray-800 text-sm truncate">${item.name || '-'}</p>
                    <p class="text-xs text-gray-500 truncate">${item.phone || ''} • ${item.email || ''}</p>
                    ${timeDisplay !== '-' ? `<p class="text-xs text-brand-red font-semibold mt-1">🕒 ${timeDisplay}</p>` : ''}
                    ${itemsPreview ? `<p class="text-xs text-gray-400 mt-1">${itemsPreview}</p>` : ''}
                </div>
                <div class="flex flex-col gap-1 shrink-0">
                    ${isPending ? `
                        <button class="text-brand-red text-xs font-bold hover:bg-red-50 px-2 py-1 rounded transition" onclick="event.stopPropagation(); openInboxDetail('${item.id}')">
                            <i class="ph ph-arrow-right"></i> Antworten
                        </button>
                    ` : `
                        <span class="text-green-500 text-xs font-semibold"><i class="ph ph-check-circle"></i> ${isDeclined ? 'Abgesagt' : 'Gesendet'}</span>
                    `}
                </div>
            `;
            div.addEventListener('click', () => openInboxDetail(item.id));
            container.appendChild(div);
        });
    }

    function openInboxDetail(id) {
        const item = inboxItems.find(i => i.id === id);
        if (!item) return;

        window.currentInboxItem = item;
        const isReservation = item.type === 'reservation';

        // Populate modal
        document.getElementById('inbox-detail-title').textContent = isReservation ? 'Reservierung Details' : 'Bestellung Details';
        document.getElementById('inbox-detail-type').textContent = isReservation ? 'RESERVIERUNG' : 'BESTELLUNG';
        document.getElementById('inbox-detail-name').textContent = item.name || '-';
        document.getElementById('inbox-detail-phone').textContent = item.phone || '-';
        document.getElementById('inbox-detail-email').textContent = item.email || '-';

        // Date/Time
        if (isReservation) {
            document.getElementById('inbox-detail-date-row').classList.remove('hidden');
            const dateStr = item.date ? item.date.split('-').reverse().join('.') : '-';
            document.getElementById('inbox-detail-datetime').textContent = `${dateStr} um ${item.time || '-'}`;
            document.getElementById('inbox-detail-guests-row').classList.remove('hidden');
            document.getElementById('inbox-detail-guests').textContent = item.guests || '-';
        } else {
            document.getElementById('inbox-detail-date-row').classList.remove('hidden');
            const timeDisplay = item.pickupDate
                ? `${item.pickupDate.split('-').reverse().join('.')} @ ${item.pickupTime === 'asap' ? 'SOFORT' : item.pickupTime}`
                : '-';
            document.getElementById('inbox-detail-datetime').textContent = timeDisplay;
            document.getElementById('inbox-detail-guests-row').classList.add('hidden');
        }

        // Order items
        const itemsContainer = document.getElementById('inbox-detail-items-container');
        const itemsDiv = document.getElementById('inbox-detail-items');
        if (!isReservation && item.items) {
            itemsContainer.classList.remove('hidden');
            if (Array.isArray(item.items)) {
                itemsDiv.innerHTML = item.items.map(it => `
                    <div class="flex justify-between text-sm py-1">
                        <span class="text-gray-700">${it.quantity || 1}x ${it.name || ''}</span>
                        <span class="font-semibold text-gray-800">${it.price || ''}</span>
                    </div>
                `).join('');
            } else {
                itemsDiv.innerHTML = `<p class="text-sm text-gray-500">${item.items}</p>`;
            }
            document.getElementById('inbox-detail-total').textContent = item.total ? `${item.total} €` : '-';
        } else {
            itemsContainer.classList.add('hidden');
        }

        // Notes
        const notesContainer = document.getElementById('inbox-detail-notes-container');
        if (item.notes) {
            notesContainer.classList.remove('hidden');
            document.getElementById('inbox-detail-notes').textContent = item.notes;
        } else {
            notesContainer.classList.add('hidden');
        }

        // Show correct action buttons
        document.getElementById('inbox-detail-reservation-actions').classList.toggle('hidden', !isReservation);
        document.getElementById('inbox-detail-order-actions').classList.toggle('hidden', isReservation);

        // Reset status
        const statusEl = document.getElementById('inbox-reply-status');
        statusEl.classList.add('hidden');

        // Show modal
        document.getElementById('inbox-detail-modal').classList.remove('hidden');
    }

    // Close inbox detail modal
    document.getElementById('close-inbox-detail')?.addEventListener('click', () => {
        document.getElementById('inbox-detail-modal').classList.add('hidden');
        window.currentInboxItem = null;
    });

    // Inbox refresh button
    document.getElementById('inbox-refresh-btn')?.addEventListener('click', () => {
        loadInbox();
        showToast("Đã làm mới Inbox!");
    });

    // Inbox toggle all
    let showingAll = false;
    document.getElementById('inbox-toggle-all')?.addEventListener('click', () => {
        showingAll = !showingAll;
        const btn = document.getElementById('inbox-toggle-all');
        if (showingAll) {
            btn.textContent = 'Chỉ chưa trả lời';
            // Show all - filter off
            document.getElementById('inbox-list').querySelectorAll('div[class*="opacity-60"]').forEach(el => {
                el.classList.remove('hidden');
            });
        } else {
            btn.textContent = 'Hiện tất cả';
            renderInboxList();
        }
    });

    // Send reply function - exposed globally for onclick
    window.sendReply = async function(replyType, waitMinutes) {
        if (!window.currentInboxItem) return;

        const item = window.currentInboxItem;
        const statusEl = document.getElementById('inbox-reply-status');

        statusEl.className = 'mt-4 p-3 rounded-xl text-center text-sm font-semibold bg-blue-50 text-blue-700';
        statusEl.textContent = '⏳ Đang gửi phản hồi...';
        statusEl.classList.remove('hidden');

        try {
            const res = await fetch('/api/send-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerEmail: item.email,
                    customerName: item.name,
                    replyType: replyType,
                    waitMinutes: waitMinutes,
                    orderTotal: item.total,
                    customerPhone: item.phone,
                    deliveryAddress: item.address
                })
            });

            const data = await res.json();

            if (data.success) {
                // Update item status
                item.status = replyType.includes('declined') ? 'declined' : 'replied';
                item.repliedAt = new Date().toISOString();
                item.replyType = replyType;
                item.waitMinutes = waitMinutes;

                saveInboxToStorage();
                renderInboxList();

                // Also emit to socket for real-time update
                if (socket && socket.connected) {
                    socket.emit('admin_reply_sent', { itemId: item.id, replyType, waitMinutes });
                }

                statusEl.className = 'mt-4 p-3 rounded-xl text-center text-sm font-semibold bg-green-50 text-green-700';
                statusEl.textContent = `✅ Phản hồi đã gửi! Email: ${data.emailSent ? '✓' : '✗'} | Telegram: ${data.telegramSent ? '✓' : '✗'}`;

                showToast("Đã gửi phản hồi tự động bằng tiếng Đức!");

                setTimeout(() => {
                    document.getElementById('inbox-detail-modal').classList.add('hidden');
                    window.currentInboxItem = null;
                }, 2000);
            } else {
                statusEl.className = 'mt-4 p-3 rounded-xl text-center text-sm font-semibold bg-red-50 text-red-700';
                statusEl.textContent = '❌ Lỗi gửi phản hồi! Kiểm tra kết nối.';
            }
        } catch (e) {
            statusEl.className = 'mt-4 p-3 rounded-xl text-center text-sm font-semibold bg-red-50 text-red-700';
            statusEl.textContent = '❌ Lỗi kết nối Server!';
        }
    };

    // Real-time inbox from socket
    if (socket) {
        socket.on('admin_new_order', (order) => {
            // Add to inbox
            const newItem = {
                id: order.id || ('order_' + Date.now()),
                type: 'order',
                name: order.name,
                phone: order.phone,
                email: order.email,
                pickupDate: order.pickupDate,
                pickupTime: order.pickupTime,
                items: order.items,
                total: order.total,
                address: order.address,
                notes: order.notes,
                status: 'pending'
            };
            inboxItems.unshift(newItem);
            saveInboxToStorage();
            renderInboxList();
            updateInboxBadge();

            // Also show the existing notification modal
            const incTitle = document.getElementById('inc-title');
            const incDetails = document.getElementById('inc-details');
            if (incTitle) incTitle.textContent = "Neue Bestellung!";
            if (incDetails) {
                const pickupStr = order.pickupDate
                    ? `<br><b class="text-brand-red">🕒 ABHOLUNG: ${order.pickupDate.split('-').reverse().join('.')} @ ${order.pickupTime === 'asap' ? 'SOFORT' : order.pickupTime + ' Uhr'}</b>`
                    : '';
                incDetails.innerHTML = `Name: ${order.name}<br>Telefon: ${order.phone}<br>Anzahl Gerichte: ${order.items}${pickupStr}`;
            }

            currentPendingRequestId = { type: 'order', id: order.id, sourceData: order };
            const incModal = document.getElementById('incoming-modal');
            if (incModal) incModal.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
            const bellSound = document.getElementById('bell-sound');
            if (bellSound) bellSound.play().catch(() => {});
        });

        socket.on('admin_new_reservation', (res) => {
            const newItem = {
                id: res.id || ('res_' + Date.now()),
                type: 'reservation',
                name: res.name,
                phone: res.phone,
                email: res.email,
                date: res.date,
                time: res.time,
                guests: res.guests,
                notes: res.notes,
                status: 'pending'
            };
            inboxItems.unshift(newItem);
            saveInboxToStorage();
            renderInboxList();
            updateInboxBadge();

            const incTitle = document.getElementById('inc-title');
            const incDetails = document.getElementById('inc-details');
            if (incTitle) incTitle.textContent = "Neue Reservierung!";
            if (incDetails) incDetails.innerHTML = `Name: ${res.name}<br>Telefon: ${res.phone}<br>Datum: ${res.date}`;

            currentPendingRequestId = { type: 'reservation', id: res.id, data: res };
            const incModal = document.getElementById('incoming-modal');
            if (incModal) incModal.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
            const bellSound = document.getElementById('bell-sound');
            if (bellSound) bellSound.play().catch(() => {});
        });
    }
});
