document.addEventListener('DOMContentLoaded', () => {
    
    // --- Live Sync when Storage changes (from Admin/POS) ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'kimi_settings' || e.key === 'kimi_menu' || e.key === 'kimi_combos') {
            console.log("[WEBSITE] Dữ liệu đã thay đổi từ Admin, đang làm mới trang...");
            location.reload(); 
        }
    });

    
    // --- 0. Scroll & UI Failsafe ---
    // Ensure body scroll is never stuck on load
    document.body.style.overflow = '';

    let scrollPosition = 0;
    const lockScroll = (lock) => {
        if (lock) {
            scrollPosition = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.top = `-${scrollPosition}px`;
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollPosition);
        }
    };

    // --- 0.1 Load Settings (Server First, then localStorage, then defaults) ---
    async function loadSettingsForWebsite() {
        const updateText = (id, text) => {
            const el = document.getElementById(id);
            if(el && text) el.textContent = text;
        };
        const updateLink = (id, pf, text) => {
            const el = document.getElementById(id);
            if(el && text) el.href = pf + text.replace(/\s+/g, '');
        };
        
        // 1. Load defaults first (for immediate display)
        let config = typeof getSettings === 'function' ? getSettings() : {};
        
        // 2. Try to fetch from server (Server = Primary Source)
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const serverConfig = await res.json();
                // Merge server config with defaults (server wins)
                config = { ...config, ...serverConfig };
                // Sync to localStorage for offline use
                if (typeof saveSettings === 'function') {
                    saveSettings(config);
                }
            }
        } catch (e) {
            console.log("[WEBSITE] Server nicht erreichbar, verwende lokale Daten.");
        }
        
        // 3. Apply to UI
        updateText('site-brand-1', config.brandName);
        updateText('site-brand-2', config.brandName);
        
        updateText('site-phone-1', config.phone);
        updateText('site-phone-2', config.phone);
        updateText('res-site-phone', config.phone);
        updateLink('site-phone-link-1', 'tel:', config.phone);
        updateLink('site-phone-link-2', 'tel:', config.phone);
        
        updateText('site-email', config.email);
        updateLink('site-email-link', 'mailto:', config.email);

        if (config.address) {
            const el = document.getElementById('site-address');
            if (el) el.innerHTML = config.address.replace(/,\s*/g, '<br>');
        }

        updateText('res-hours-summary', config.hoursSummary);
        updateText('site-h-mon-1', config.hoursMon1);
        updateText('site-h-mon-2', config.hoursMon2);
        updateText('site-h-tue-1', config.hoursTue1);
        updateText('site-h-tue-2', config.hoursTue2);
        updateText('site-h-wed-1', config.hoursWed1);
        updateText('site-h-wed-2', config.hoursWed2);
        updateText('site-h-thu-1', config.hoursThu1);
        updateText('site-h-thu-2', config.hoursThu2);
        updateText('site-h-fri-1', config.hoursFri1);
        updateText('site-h-fri-2', config.hoursFri2);
        updateText('site-h-sat-1', config.hoursSat1);
        updateText('site-h-sat-2', config.hoursSat2);
        updateText('site-h-sun-1', config.hoursSun1);
        updateText('site-h-sun-2', config.hoursSun2);

        if (config.heroImage) {
            const h1 = document.getElementById('site-hero-1');
            if (h1) h1.src = config.heroImage;
            const h2 = document.getElementById('site-hero-2');
            if (h2) h2.style.backgroundImage = `url('${config.heroImage}')`;
        }

        if (config.aboutImage) {
            const a1 = document.getElementById('site-about');
            if (a1) a1.src = config.aboutImage;
        }

        if (config.logoImage && config.logoImage.trim() !== '') {
            document.getElementById('site-logo-icon-1')?.classList.add('hidden');
            document.getElementById('site-logo-img-1')?.classList.remove('hidden');
            if(document.getElementById('site-logo-img-1')) document.getElementById('site-logo-img-1').src = config.logoImage;
            
            document.getElementById('site-logo-icon-2')?.classList.add('hidden');
            document.getElementById('site-logo-img-2')?.classList.remove('hidden');
            if(document.getElementById('site-logo-img-2')) document.getElementById('site-logo-img-2').src = config.logoImage;
        } else {
            document.getElementById('site-logo-icon-1')?.classList.remove('hidden');
            document.getElementById('site-logo-img-1')?.classList.add('hidden');
            document.getElementById('site-logo-icon-2')?.classList.remove('hidden');
            document.getElementById('site-logo-img-2')?.classList.add('hidden');
        }
        
        // SEO Title
        if (config.seoTitle) {
            document.title = config.seoTitle;
        }
        
        // --- 0.5 Delivery Visibility ---
        document.querySelectorAll('.delivery-content').forEach(el => {
            if (config.deliveryEnabled === true) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
        
        return config;
    }
    
    // Start loading settings
    loadSettingsForWebsite();
    
    // --- 4. Load Menu (Server First, then localStorage, then defaults) ---
    async function loadMenuForWebsite() {
        // 1. Load from localStorage first
        let menu = typeof getMenu === 'function' ? getMenu() : [];
        
        // 2. Try to fetch from server
        try {
            const res = await fetch('/api/menu');
            if (res.ok) {
                const serverMenu = await res.json();
                if (serverMenu && Array.isArray(serverMenu) && serverMenu.length > 0) {
                    menu = serverMenu;
                    // Sync to localStorage
                    if (typeof saveMenu === 'function') {
                        saveMenu(menu);
                    }
                }
            }
        } catch (e) {
            console.log("[WEBSITE] Menu Server nicht erreichbar, verwende lokale Daten.");
        }
        
        return menu;
    }
    
    // Load menu after settings
    (async () => {
        activeMenu = await loadMenuForWebsite();
        renderCategoryFilters();
        renderMenu();

        // Load combos from server (server is primary source)
        // Handle both raw array (Vercel/KV) and {success, items} (local MongoDB server) formats
        try {
            const res = await fetch('/api/combos');
            if (res.ok) {
                const raw = await res.json();
                // Normalize: handle { success, items } format from MongoDB server vs raw array from KV
                const serverCombos = (raw && raw.items && Array.isArray(raw.items))
                    ? raw.items
                    : (Array.isArray(raw) ? raw : []);
                if (serverCombos.length > 0) {
                    // Update activeCombos so global renderCombos() uses server data
                    activeCombos = serverCombos;
                    // Save to localStorage for offline use
                    if (typeof saveCombos === 'function') {
                        saveCombos(serverCombos);
                    }
                    // Re-render combos with server data (global renderCombos is defined below)
                    if (typeof window.renderCombosGlobal === 'function') {
                        window.renderCombosGlobal();
                    }
                }
            }
        } catch (e) {
            console.warn('[WEBSITE] Combos API error:', e);
        }
    })();
    
    // --- 1. Mobile Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    // --- 1.5 Prevent empty hash links from jumping to top ---
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });

    function toggleMenu() {
        const isOpening = mobileMenu.classList.contains('translate-x-full');
        if (isOpening) {
            // Hint browser to promote this element to its own compositor layer
            mobileMenu.style.willChange = 'transform';
            // Force browser to recalculate layout before animating
            mobileMenu.getBoundingClientRect();
            mobileMenu.classList.remove('translate-x-full');
            lockScroll(true);
        } else {
            mobileMenu.classList.add('translate-x-full');
            lockScroll(false);
            // Remove will-change after transition completes to free GPU memory
            mobileMenu.addEventListener('transitionend', () => {
                mobileMenu.style.willChange = '';
            }, { once: true });
        }
    }

    if (mobileMenuBtn && closeMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', toggleMenu);
        closeMenuBtn.addEventListener('click', toggleMenu);

        mobileLinks.forEach(link => {
            link.addEventListener('click', toggleMenu);
        });
    }

    // --- 2. Sticky Header ---
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });

    // --- 3. Scroll Reveal Animations ---
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // --- 4. Render Menu Grid & Dynamic Filters from LocalStorage ---
    const menuGrid = document.getElementById('menu-grid');
    const filterTabsContainer = document.getElementById('filter-tabs-container');

    let activeMenu = typeof getMenu === 'function' ? getMenu() : [];
    let activeCombos = [];

    function renderCategoryFilters() {
        if (!filterTabsContainer) return;
        
        const categories = [...new Set(activeMenu.map(item => item.category))].filter(c => c && c.trim() !== "");
        
        // Helper to capitalize first letter
        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
        
        // Hardcoded mapping for legacy categories (optional)
        const categoryLabels = {
            'sushi': 'Nigiri',
            'maki': 'Maki Rolls',
            'sashimi': 'Sashimi'
        };

        let filtersHtml = `<button class="filter-btn active px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap" data-filter="all">Alle</button>`;
        
        categories.forEach(cat => {
            const label = categoryLabels[cat.toLowerCase()] || capitalize(cat);
            filtersHtml += `<button class="filter-btn px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap" data-filter="${cat}">${label}</button>`;
        });

        filterTabsContainer.innerHTML = filtersHtml;

        // Re-attach listeners via delegation
        filterTabsContainer.onclick = (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            const allBtns = filterTabsContainer.querySelectorAll('.filter-btn');
            allBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
            
            if(menuGrid) {
                menuGrid.style.opacity = '0';
                setTimeout(() => {
                    renderMenu(filterValue);
                    menuGrid.style.opacity = '1';
                }, 300);
            }
        };
    }

    function renderMenu(filterValue = 'all') {
        if (!menuGrid) return;

        const menu = activeMenu;
        menuGrid.innerHTML = '';

        [...menu].reverse().forEach(item => {
            if (filterValue !== 'all' && item.category !== filterValue) return;

            let badgeHtml = '';
            if (item.tag) {
                if (item.tag === 'Bestseller') {
                    badgeHtml = `<span class="absolute top-4 left-4 bg-brand-gold text-brand-dark text-xs font-semibold px-3 py-1 rounded-full">Bestseller</span>`;
                } else if (item.tag === 'Empfehlung') {
                    badgeHtml = `<span class="absolute top-4 left-4 bg-brand-elevated backdrop-blur border border-brand-border-gold/30 text-brand-ivory text-xs font-semibold px-3 py-1 rounded-full">Empfehlung</span>`;
                } else if (item.tag === 'Neu') {
                    badgeHtml = `<span class="absolute top-4 left-4 bg-brand-elevated backdrop-blur border border-brand-border-gold/30 text-brand-ivory text-xs font-semibold px-3 py-1 rounded-full">Neu</span>`;
                }
            }

            const itemHtml = `
                <div class="menu-item rounded-2xl bg-brand-elevated border border-brand-border-gold/50 overflow-hidden hover-card group reveal-up active transition-all duration-400" data-category="${item.category}">
                    <div class="relative h-36 md:h-56 overflow-hidden">
                        <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80">
                        ${badgeHtml}
                    </div>
                    <div class="p-4 md:p-6 flex flex-col h-[calc(100%-9rem)] md:h-[calc(100%-14rem)]">
                        <div class="flex justify-between items-start mb-2 md:mb-3">
                            <h3 class="font-serif font-bold text-base md:text-xl text-brand-ivory">${item.name}</h3>
                            <span class="text-brand-gold font-semibold whitespace-nowrap ml-2">${item.price}</span>
                        </div>
                        <p class="text-brand-ivory/50 text-xs md:text-sm mb-3 md:mb-5 font-light line-clamp-2 md:line-clamp-3 flex-grow leading-relaxed">${item.description}</p>
                        <div class="flex justify-between items-center mt-auto pt-3 md:pt-4 border-t border-brand-border-gold/20">
                            <span class="text-xs text-brand-ivory/35 font-medium">${item.pieces || ''}</span>
                            <button class="add-to-cart-btn w-9 h-9 rounded-full flex items-center justify-center" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">
                                <i class="ph ph-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            menuGrid.insertAdjacentHTML('beforeend', itemHtml);
        });
    }

    if(menuGrid) {
        menuGrid.style.transition = 'opacity 0.3s ease';

        // Sample menu data - UI fallback only, does NOT affect database or logic
        const sampleMenuItems = [
            { id: 'sm_1', name: 'Lachs Nigiri', price: '5,90 €', description: 'Frischer atlantischer Lachs auf perfekt geformtem Sushireis', category: 'sushi', image: 'images/lachs_nigiri.png', pieces: '2 Stück', tag: 'Bestseller' },
            { id: 'sm_2', name: 'Thunfisch Nigiri', price: '6,50 €', description: 'Premium Thunfisch, zart und geschmackvoll', category: 'sushi', image: 'images/thunfisch_nigiri.png', pieces: '2 Stück', tag: 'Bestseller' },
            { id: 'sm_3', name: 'Dragon Roll', price: '14,90 €', description: 'Tempura Garnele, Avocado, Gurke, topped mit Aal und Eiklar', category: 'maki', image: 'images/dragon_roll.png', pieces: '8 Stück', tag: 'Empfehlung' },
            { id: 'sm_4', name: 'Rainbow Roll', price: '13,90 €', description: 'California Roll topped mit buntem Lachskaviar und Lachs', category: 'maki', image: 'images/rainbow_roll.png', pieces: '8 Stück', tag: 'Neu' },
            { id: 'sm_5', name: 'Lachs Sashimi', price: '12,90 €', description: '18 hauchdünne Scheiben frischer Lachs', category: 'sashimi', image: 'images/lachs_sashimi.png', pieces: '18 Stück', tag: 'Bestseller' },
            { id: 'sm_6', name: 'Mix Sashimi', price: '18,90 €', description: 'Auswahl der besten Sashimi: Lachs, Thunfisch und Tintenfisch', category: 'sashimi', image: 'images/mix_sashimi.png', pieces: '22 Stück', tag: 'Empfehlung' },
            { id: 'sm_7', name: 'California Roll', price: '9,90 €', description: 'Krabbenstick, Avocado, Gurke mit Sesam', category: 'maki', image: 'images/california_roll.png', pieces: '8 Stück', tag: '' },
            { id: 'sm_8', name: 'Avocado Maki', price: '7,90 €', description: 'Cremige Avocado in einem perfekt gerollten Maki', category: 'maki', image: 'images/avocado_maki.png', pieces: '8 Stück', tag: 'Veggie' }
        ];

        // Fetch Live Menu from Server
        fetch('/api/menu').then(r => r.json()).then(liveMenu => {
            if (liveMenu && liveMenu.length > 0) {
                activeMenu = liveMenu;
            } else {
                activeMenu = sampleMenuItems;
            }
            renderCategoryFilters();
            renderMenu('all');
        }).catch(err => {
            activeMenu = sampleMenuItems;
            renderCategoryFilters();
            renderMenu('all');
        });
    }

    // --- 4.1. See Full Menu Button ---
    const seeFullMenuBtn = document.getElementById('see-full-menu-btn');
    if (seeFullMenuBtn) {
        seeFullMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Reuse the existing filter logic: set Alle active and render all
            const alleBtn = filterTabsContainer ? filterTabsContainer.querySelector('[data-filter="all"]') : null;
            if (alleBtn) {
                const allBtns = filterTabsContainer.querySelectorAll('.filter-btn');
                allBtns.forEach(b => b.classList.remove('active'));
                alleBtn.classList.add('active');
                if (menuGrid) {
                    menuGrid.style.opacity = '0';
                    setTimeout(() => {
                        renderMenu('all');
                        menuGrid.style.opacity = '1';
                    }, 300);
                }
            }

            // 2. Smooth scroll to menu section
            const menuSection = document.getElementById('menu');
            if (menuSection) {
                setTimeout(() => {
                    menuSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
            }
        });
    }

    // --- 4.4. Render FAQ ---
    const faqList = document.getElementById('faq-list');

    function renderFAQ(items) {
        if (!faqList) return;
        if (!items || items.length === 0) {
            faqList.innerHTML = '<p class="text-brand-ivory/30 text-center text-sm p-8">Noch keine Fragen vorhanden.</p>';
            return;
        }
        faqList.innerHTML = items.map((item, idx) => `
            <div class="faq-card p-5 md:p-7 reveal-up border border-brand-border-gold/20 cursor-pointer select-none" data-id="${item.id}" style="transition-delay: ${idx * 60}ms;">
                <div class="faq-question flex justify-between items-start gap-4">
                    <h4 class="font-serif font-bold text-base md:text-lg text-brand-ivory/90 leading-snug">${item.question}</h4>
                    <i class="ph ph-caret-down faq-icon text-brand-gold text-lg shrink-0 mt-0.5 transition-transform duration-300"></i>
                </div>
                <div class="faq-answer overflow-hidden transition-all duration-300 max-h-0 opacity-0">
                    <p class="text-brand-ivory/35 font-light text-sm leading-relaxed pt-3 md:pt-4">${item.answer}</p>
                </div>
            </div>
        `).join('');

        // Re-observe new FAQ cards with IntersectionObserver so they animate in
        if (typeof revealObserver !== 'undefined' && revealObserver) {
            faqList.querySelectorAll('.reveal-up').forEach(el => {
                if (!el.classList.contains('active')) {
                    revealObserver.observe(el);
                }
            });
        }

        // Accordion interaction
        faqList.querySelectorAll('.faq-card').forEach(card => {
            card.addEventListener('click', () => {
                const answer = card.querySelector('.faq-answer');
                const icon = card.querySelector('.faq-icon');
                const isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';

                // Close all
                faqList.querySelectorAll('.faq-answer').forEach(a => {
                    a.style.maxHeight = '0px';
                    a.style.opacity = '0';
                });
                faqList.querySelectorAll('.faq-icon').forEach(i => {
                    i.style.transform = 'rotate(0deg)';
                });

                // Toggle current
                if (!isOpen) {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    answer.style.opacity = '1';
                    icon.style.transform = 'rotate(180deg)';
                }
            });
        });
    }

    // Fetch FAQ from server
    fetch('/api/faq')
        .then(r => r.json())
        .then(data => renderFAQ(data))
        .catch(() => renderFAQ([]));


    // --- 4.5. Render Combos ---
    const combosGrid = document.getElementById('combos-grid');

    function renderCombos() {
        if (!combosGrid) return;
        // Use activeCombos (updated by async load) or fallback to localStorage
        let combos = activeCombos.length > 0 ? activeCombos : (typeof getCombos === 'function' ? getCombos() : []);
        // Sample menu set data - UI fallback only, does NOT affect database or logic
        if (!combos || combos.length === 0) {
            combos = [
                {
                    id: 'combo_sample_1',
                    name: 'Sushi Menü Classic',
                    subtitle: 'Perfekt für 2 Personen',
                    price: '24,90 €',
                    oldPrice: '29,90 €',
                    items: '8x Nigiri Sushi\n4x Maki Roll\n1x Miso Suppe\n2x Wasabi & Ingwer',
                    tag: "Chef's Choice"
                },
                {
                    id: 'combo_sample_2',
                    name: 'Sushi Menü Deluxe',
                    subtitle: 'Für 3–4 Personen',
                    price: '39,90 €',
                    items: '12x Nigiri Sushi\n8x Maki Roll\n6x Sashimi\n2x Miso Suppe\n1x Edamame',
                    tag: 'Bestseller'
                },
                {
                    id: 'combo_sample_3',
                    name: 'Vegetarisches Menü',
                    subtitle: 'Für 2 Personen',
                    price: '19,90 €',
                    items: '6x Avocado Maki\n4x Kappa Maki\n2x Veggie Roll\n1x Edamame\n1x Miso Suppe',
                    tag: 'Veggie'
                }
            ];
        }
        combosGrid.innerHTML = '';

        combos.forEach((c, idx) => {
            let tagHtml = '';
            let wrapperClasses = "combo-card p-8 rounded-2xl";
            let colorType = "text-[#C9A15D]";
            let priceClasses = "text-4xl font-bold text-[#D9B36A]";
            let btnClasses = "combo-cart-btn w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300";

            const hasVeggieTag = c.tag && c.tag !== "" && c.tag.toLowerCase() === "veggie";
            const hasChefTag = c.tag && c.tag !== "" && c.tag.toLowerCase().includes('chef');
            const hasAnyTag = c.tag && c.tag !== "";

            if (hasVeggieTag) {
                wrapperClasses = "combo-card-vegetarian p-8 rounded-2xl relative";
                colorType = "text-[#86CEC0]";
                priceClasses = "text-4xl font-bold text-[#9ADBCF]";
            } else if (hasChefTag) {
                wrapperClasses = "combo-card-featured p-8 rounded-2xl relative";
                colorType = "text-[#6B4A1E]";
                priceClasses = "text-4xl font-bold text-[#120C08]";
                btnClasses = "combo-cart-btn-featured w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-300";
            }

            let badgesHtml = '';

            if (hasChefTag && hasVeggieTag) {
                badgesHtml = `
                    <div class="absolute -top-3 right-7 z-10 flex gap-2">
                        <span class="inline-block bg-[#2A1608] text-[#D9B36A] text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest" style="box-shadow: 0 6px 18px rgba(0,0,0,0.28);">Chef's Choice</span>
                    </div>
                    <div class="absolute -top-3 right-[calc(7rem+0.5rem)] z-10">
                        <span class="inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style="background:#123C3D;color:#DDF5F0;border:1px solid rgba(141,216,202,0.28);box-shadow:0 6px 18px rgba(0,0,0,0.22);">Veggie</span>
                    </div>`;
            } else if (hasChefTag) {
                badgesHtml = `<div class="absolute -top-3 right-7 z-10">
                    <span class="inline-block bg-[#2A1608] text-[#D9B36A] text-[10px] font-bold px-5 py-1.5 rounded-full uppercase tracking-widest" style="box-shadow: 0 6px 18px rgba(0,0,0,0.28);">Chef's Choice</span>
                </div>`;
            } else if (hasVeggieTag) {
                badgesHtml = `<div class="absolute -top-3 right-7 z-10">
                    <span class="inline-block px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style="background:#123C3D;color:#DDF5F0;border:1px solid rgba(141,216,202,0.28);box-shadow:0 6px 18px rgba(0,0,0,0.22);">Veggie</span>
                </div>`;
            } else if (hasAnyTag) {
                badgesHtml = `<div class="absolute -top-3 right-7 z-10">
                    <span class="inline-block bg-[#2A1608] text-[#D9B36A] text-[10px] font-bold px-5 py-1.5 rounded-full uppercase tracking-widest" style="box-shadow: 0 6px 18px rgba(0,0,0,0.28);">${c.tag}</span>
                </div>`;
            }

            const oldPriceHtml = c.oldPrice ? `<span class="opacity-70 line-through text-lg ml-1" style="color: ${hasVeggieTag ? 'rgba(242,251,249,0.35)' : 'rgba(42,27,15,0.35)'}">${c.oldPrice}</span>` : '';

            const itemsListHtml = c.items.split('\n').filter(i => i.trim()).map(i => `<li class="flex items-start gap-3"><i class="ph ph-check-circle ${colorType} mt-0.5 shrink-0"></i> ${i}</li>`).join('');

            const comboHtml = `
                <div class="${wrapperClasses}" style="transition-delay: ${(100 + (idx * 100))}ms;">
                    ${badgesHtml}
                    <h3 class="font-serif text-2xl font-bold mb-2">${c.name}</h3>
                    <p class="text-sm mb-6 pb-6 border-b font-light leading-relaxed">${c.subtitle}</p>

                    <div class="flex items-baseline gap-3 mb-6">
                        <span class="${priceClasses}">${c.price}</span>
                        ${oldPriceHtml}
                    </div>

                    <ul class="space-y-3.5 mb-8">
                        ${itemsListHtml}
                    </ul>

                    <button class="${btnClasses}" data-id="${c.id}" data-name="${c.name}" data-price="${c.price}" data-image="images/hero_sushi.png">
                        <span class="flex items-center justify-center gap-2">
                            <i class="ph ph-shopping-cart-simple"></i> In den Warenkorb
                        </span>
                    </button>
                </div>
            `;
            combosGrid.insertAdjacentHTML('beforeend', comboHtml);
        });
    }

    if(combosGrid) {
        renderCombos();
    }

    // Expose renderCombos globally so the async menu loader (above) can call it
    window.renderCombosGlobal = renderCombos;

    // --- 5. Back to Top Button ---
    const backToTopBtn = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTopBtn.classList.remove('translate-y-20', 'opacity-0');
        } else {
            backToTopBtn.classList.add('translate-y-20', 'opacity-0');
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // --- 6. Form Validation ---
    const reservationForm = document.getElementById('reservation-form');
    const formSuccess = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    if (reservationForm) {
        reservationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            let isValid = true;
            
            const name = document.getElementById('res-name');
            const email = document.getElementById('res-email');
            const phone = document.getElementById('res-phone');
            
            if (name.value.trim() === '') {
                name.classList.add('error-border');
                name.nextElementSibling.classList.remove('hidden');
                isValid = false;
            } else {
                name.classList.remove('error-border');
                name.nextElementSibling.classList.add('hidden');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !emailRegex.test(email.value.trim())) {
                email.classList.add('error-border');
                email.nextElementSibling.classList.remove('hidden');
                isValid = false;
            } else if (email) {
                email.classList.remove('error-border');
                email.nextElementSibling.classList.add('hidden');
            }

            if (phone.value.trim() === '' || phone.value.length < 6) {
                phone.classList.add('error-border');
                phone.nextElementSibling.classList.remove('hidden');
                isValid = false;
            } else {
                phone.classList.remove('error-border');
                phone.nextElementSibling.classList.add('hidden');
            }

            if (isValid) {
                const btnText = submitBtn.querySelector('span');
                const originalText = btnText.innerHTML;
                
                btnText.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Senden...';
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-80', 'cursor-not-allowed');

                const resData = {
                    name: document.getElementById('res-name').value,
                    phone: document.getElementById('res-phone').value,
                    email: document.getElementById('res-email').value,
                    date: document.getElementById('res-date').value,
                    time: document.getElementById('res-time').value,
                    guests: document.getElementById('res-persons').value,
                    notes: document.getElementById('res-message').value
                };

                // Save to inbox for admin management
                const inboxItem = {
                    id: 'res_' + Date.now(),
                    type: 'reservation',
                    name: resData.name,
                    phone: resData.phone,
                    email: resData.email,
                    date: resData.date,
                    time: resData.time,
                    guests: resData.guests,
                    notes: resData.notes,
                    status: 'pending'
                };
                try {
                    const ls = JSON.parse(localStorage.getItem('kimi_inbox') || '[]');
                    ls.unshift(inboxItem);
                    if (ls.length > 200) ls.splice(200);
                    localStorage.setItem('kimi_inbox', JSON.stringify(ls));
                } catch(e) {}
                try {
                    fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inboxItem) }).catch(err => console.error('[RESERVATION] Inbox save failed:', err));
                } catch(e) {}

                // Send Telegram notification to admin
                fetch('/api/notify-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderType: 'reservation',
                        customerName: resData.name,
                        customerPhone: resData.phone,
                        customerEmail: resData.email,
                        pickupDate: resData.date,
                        pickupTime: resData.time,
                        itemCount: resData.guests + ' Gäste'
                    })
                }).catch(err => console.error('[RESERVATION] Telegram notify failed:', err));

                // Send email notification to admin
                fetch('/api/notify-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerEmail: resData.email,
                        customerName: resData.name,
                        customerPhone: resData.phone,
                        orderType: 'reservation',
                        pickupDate: resData.date,
                        pickupTime: resData.time,
                        itemCount: resData.guests + ' Gäste'
                    })
                }).catch(err => console.error('[RESERVATION] Email confirm failed:', err));

                // Send Gmail notification to admin
                fetch('/api/gmail-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderType: 'reservation',
                        customerName: resData.name,
                        customerPhone: resData.phone,
                        customerEmail: resData.email,
                        pickupDate: resData.date,
                        pickupTime: resData.time,
                        itemCount: resData.guests + ' Gäste',
                        notes: resData.notes
                    })
                }).catch(err => console.error('[RESERVATION] Gmail notify failed:', err));

                if (socket) {
                    socket.emit('submit_reservation', resData);
                }

                setTimeout(() => {
                    reservationForm.reset();
                    formSuccess.classList.remove('hidden');
                    btnText.innerHTML = originalText;
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-80', 'cursor-not-allowed');
                    setTimeout(() => { formSuccess.classList.add('hidden'); }, 5000);
                }, 1500);
            }
        });
    }
});

// --- 7. Shopping Cart Logic ---
const cartBadges = document.querySelectorAll('.cart-badge');
const cartToast = document.getElementById('cart-toast');
const cartItemsList = document.getElementById('cart-items-list');
let cart = [];

// Price helper: "5,90 €" -> 5.90, "14.90€" -> 14.90
function parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return 0;
    const cleaned = String(priceStr).replace('€', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

// Format price: 5.9 -> "5,90 €"
function formatPrice(num) {
    return num.toFixed(2).replace('.', ',') + ' €';
}

function updateCartUI() {
    // 1. Update Badges
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadges.forEach(badge => {
        badge.textContent = totalQty;
        if (totalQty > 0) {
            badge.classList.remove('scale-0');
            badge.classList.add('scale-100');
        } else {
            badge.classList.remove('scale-100');
            badge.classList.add('scale-0');
        }
    });

    // 2. Update Kasse List
    if (cartItemsList) {
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">Warenkorb ist leer</div>';
        } else {
            cartItemsList.innerHTML = cart.map((item, index) => {
                const unitPrice = parsePrice(item.price);
                const subtotal = unitPrice * item.quantity;
                return `
                <div class="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-white/5 transition-colors">
                    <img src="${item.image}" alt="${item.name}" class="w-8 h-8 rounded object-cover shrink-0">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-[11px] font-bold text-brand-ivory/80 truncate leading-tight">${item.name}</h4>
                    </div>
                    <div class="flex items-center gap-1 bg-white/5 rounded p-0.5 shrink-0">
                        <button type="button" onclick="window.changeQuantity('${item.id}', -1)" class="w-5 h-5 flex items-center justify-center text-brand-ivory/40 hover:text-brand-red rounded transition-all"><i class="ph ph-minus text-[10px]"></i></button>
                        <span class="text-[11px] font-bold min-w-[16px] text-center text-brand-ivory/80">${item.quantity}</span>
                        <button type="button" onclick="window.changeQuantity('${item.id}', 1)" class="w-5 h-5 flex items-center justify-center text-brand-ivory/40 hover:text-brand-red rounded transition-all"><i class="ph ph-plus text-[10px]"></i></button>
                    </div>
                    <span class="text-[11px] font-bold text-brand-gold shrink-0 min-w-[46px] text-right">${formatPrice(subtotal)}</span>
                    <button type="button" onclick="window.removeFromCart('${item.id}')" class="text-brand-ivory/15 hover:text-red-400 transition-colors shrink-0">
                        <i class="ph ph-trash text-[13px]"></i>
                    </button>
                </div>`;
            }).join('');
        }
    }

    // 3. Update Totals
    if (typeof updateOrderSummary === 'function') {
        updateOrderSummary();
    }
}

// Global functions for inline onclick handlers
window.changeQuantity = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        updateCartUI();
    }
};

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
};

document.body.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('.add-to-cart-btn');
    const comboBtn = e.target.closest('.combo-cart-btn, .combo-cart-btn-featured');

    const cartBtn = targetBtn || comboBtn;

    if (cartBtn) {
        const id = cartBtn.dataset.id;
        const name = cartBtn.dataset.name;
        const price = cartBtn.dataset.price;
        const image = cartBtn.dataset.image;

        const existingItem = cart.find(i => i.id === id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ id, name, price, image, quantity: 1 });
        }

        // DEBUG: Log cart state
        console.log('[CART] Item added/updated:', { id, name, price, image });
        console.log('[CART] Full cart:', JSON.parse(JSON.stringify(cart)));
        console.log('[CART] Cart item count:', cart.reduce((s, i) => s + i.quantity, 0));

        updateCartUI();

        if (cartToast) {
            cartToast.classList.remove('translate-x-[120%]');
            setTimeout(() => { cartToast.classList.add('translate-x-[120%]'); }, 3000);
        }
    }
});

// --- 8. Checkout UI & Socket.io Logic ---
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');
const coCount = document.getElementById('co-count'); // This is mostly for fallback now
const checkoutForm = document.getElementById('checkout-form');
const statusModal = document.getElementById('status-modal');
const socket = (typeof io !== 'undefined') ? io() : null;

document.querySelectorAll('.cart-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
        if (cart.length > 0) {
            if (coCount) coCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
            checkoutModal.classList.remove('opacity-0', 'pointer-events-none');
            lockScroll(true);
            updateCartUI();
            // CẬP NHẬT TIME SLOTS NGAY KHI MODAL MỞ - đảm bảo giờ đã chọn được khôi phục
            updateOrderSlots();
        } else {
            alert('Warenkorb ist leer!');
        }
    });
});

if (closeCheckout) {
    closeCheckout.addEventListener('click', () => {
        checkoutModal.classList.add('opacity-0', 'pointer-events-none');
        lockScroll(false);
    });
}

// --- Unified Time Slot Logic ---
if (checkoutForm) {
    const coDate = document.getElementById('co-date');
    const coTime = document.getElementById('co-time');
    const shopNotice = document.getElementById('shop-closed-notice');
    const methodBtns = document.querySelectorAll('.method-btn');
    const deliveryFields = document.getElementById('delivery-fields');
    let currentMethod = 'pickup';

    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active', 'bg-brand-red', 'text-white'));
            btn.classList.add('active', 'bg-brand-red', 'text-white');
            currentMethod = btn.dataset.method;
            
            if (currentMethod === 'delivery') {
                deliveryFields?.classList.remove('hidden');
                document.getElementById('checkout-summary-box')?.classList.remove('hidden');
                const addrInput = document.getElementById('co-address');
                if(addrInput) addrInput.required = true;
                updateOrderSummary();
            } else {
                deliveryFields?.classList.add('hidden');
                document.getElementById('checkout-summary-box')?.classList.add('hidden');
                const addrInput = document.getElementById('co-address');
                if(addrInput) addrInput.required = false;
            }
        });
    });

    const addrInput = document.getElementById('co-address');
    if (addrInput) {
        let debounceTimer;
        addrInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateOrderSummary, 800);
        });
    }

    async function updateOrderSummary() {
        const config = typeof getSettings === 'function' ? getSettings() : {};
        // FIX: Multiply by quantity!
        const subtotal = cart.reduce((sum, item) => {
            const unitPrice = parsePrice(item.price);
            return sum + (unitPrice * item.quantity);
        }, 0);
        document.getElementById('co-subtotal').textContent = formatPrice(subtotal);

        let fee = 0;
        if (currentMethod === 'delivery') {
            const address = document.getElementById('co-address').value;
            const res = await getDeliveryFee(address);
            fee = res.fee;
            document.getElementById('co-distance-text').textContent = res.distance.toFixed(1) + 'km';
        }

        document.getElementById('co-delivery-fee').textContent = fee > 0 ? formatPrice(fee) : 'Gratis';
        document.getElementById('co-total').textContent = formatPrice(subtotal + fee);
    }

    const updateDropdownSlots = (dateInput, timeSelect, noticeEl = null, isOrder = false) => {
        const config = typeof getSettings === 'function' ? getSettings() : {};
        if (!dateInput || !timeSelect) return;

        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayKey = dayNames[selectedDate.getDay()];

        const h1 = config[`hours${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}1`] || "11:00 - 15:00";
        const h2 = config[`hours${dayKey.charAt(0).toUpperCase() + dayKey.slice(1)}2`] || "17:00 - 22:00";

        const parseHours = (str) => {
            if (!str || !str.includes('-')) return null;
            const parts = str.split('-').map(s => s.trim());
            return {
                start: parseInt(parts[0].split(':')[0]) * 60 + parseInt(parts[0].split(':')[1]),
                end: parseInt(parts[1].split(':')[0]) * 60 + parseInt(parts[1].split(':')[1])
            };
        };

        const slots = [parseHours(h1), parseHours(h2)].filter(s => s !== null);

        // Lưu lại giá trị hiện tại của timeSelect trước khi xóa options
        const previousTimeValue = timeSelect.value;

        const now = new Date();
        const isToday = dateInput.value === now.toISOString().split('T')[0];
        const currentMin = now.getHours() * 60 + now.getMinutes();

        // Prüfen ob Store gerade offen ist (nur heute relevant)
        let storeCurrentlyOpen = false;
        if (isToday) {
            slots.forEach(s => {
                if (currentMin >= s.start && currentMin < s.end - 20) storeCurrentlyOpen = true;
            });
        }

        // Always add "So schnell wie möglich" as first option for pickup orders
        timeSelect.innerHTML = '<option value="asap">So schnell wie möglich</option>';

        if (noticeEl) {
            const masterEnabled = config.orderingEnabled !== false;
            if (masterEnabled && isOrder) {
                noticeEl.classList.add('hidden');
            } else if (isOrder) {
                noticeEl.innerHTML = '<i class="ph-fill ph-warning mr-1"></i> Wir nehmen aktuell keine Online-Bestellungen entgegen.';
                noticeEl.classList.remove('hidden');
            }
        }

        // Only add fixed time slots (no asap-skip logic for future dates)
        slots.forEach(s => {
            for (let m = s.start; m < s.end; m += 30) {
                if (isToday && m < currentMin + 30) continue;
                const hh = Math.floor(m / 60).toString().padStart(2, '0');
                const mm = (m % 60).toString().padStart(2, '0');
                const timeStr = `${hh}:${mm}`;
                timeSelect.innerHTML += `<option value="${timeStr}">${timeStr} Uhr</option>`;
            }
        });

        // Restore previous selection if still valid, else select first available
        const allSlotValues = [];
        slots.forEach(s => {
            for (let m = s.start; m < s.end; m += 30) {
                if (isToday && m < currentMin + 30) continue;
                const hh = Math.floor(m / 60).toString().padStart(2, '0');
                const mm = (m % 60).toString().padStart(2, '0');
                allSlotValues.push(`${hh}:${mm}`);
            }
        });

        if (previousTimeValue && previousTimeValue !== 'asap' && allSlotValues.includes(previousTimeValue)) {
            timeSelect.value = previousTimeValue;
        } else if (!previousTimeValue || previousTimeValue === 'asap') {
            // Default: always select "asap" if no valid previous selection
            timeSelect.value = 'asap';
        } else if (allSlotValues.length > 0) {
            // Store geschlossen → earliest slot vorselektieren
            timeSelect.value = allSlotValues[0];
        }
    };

    const updateOrderSlots = () => updateDropdownSlots(coDate, coTime, shopNotice, true);
    const updateResSlots = () => updateDropdownSlots(document.getElementById('res-date'), document.getElementById('res-time'), null, false);

    coDate.addEventListener('change', updateOrderSlots);
    const now = new Date();
    // Dùng local date thay vì UTC để tránh lệch múi giờ
    const getLocalDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalDateStr(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateStr(tomorrow);

    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = dayNames[now.getDay()];
    const cfg = typeof getSettings === 'function' ? getSettings() : {};
    const h1 = cfg[`hours${todayKey.charAt(0).toUpperCase() + todayKey.slice(1)}1`] || '';
    const h2 = cfg[`hours${todayKey.charAt(0).toUpperCase() + todayKey.slice(1)}2`] || '';
    const storeOpenToday = h1.includes('-') || h2.includes('-');

    let defaultDate = todayStr;
    if (!storeOpenToday) {
        defaultDate = tomorrowStr;
    } else if (now.getHours() >= 22) {
        defaultDate = tomorrowStr;
    }

    coDate.min = todayStr;
    coDate.value = defaultDate;
    updateOrderSlots(); // Cập nhật slots ngay

    const rDate = document.getElementById('res-date');
    if (rDate) {
        rDate.min = todayStr;
        rDate.value = defaultDate;
        rDate.addEventListener('change', updateResSlots);
        rDate.addEventListener('input', updateResSlots);
        setTimeout(updateResSlots, 100);
    }

    document.querySelectorAll('.cart-trigger').forEach(btn => {
        btn.addEventListener('click', () => setTimeout(updateOrderSlots, 100));
    });

    async function getDeliveryFee(address) {
        const config = typeof getSettings === 'function' ? getSettings() : {};
        if (!address || address.trim().length < 5) return { fee: 0, distance: 0 };

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat2 = parseFloat(data[0].lat);
                const lon2 = parseFloat(data[0].lon);
                
                const coords = config.geoPosition ? config.geoPosition.split(';') : ["48.67756", "9.20638"];
                const lat1 = parseFloat(coords[0]);
                const lon1 = parseFloat(coords[1]);

                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const distKm = R * c * 1.25; // 25% buffer for street distance

                let fee = 0;
                if (distKm < 3) fee = parseFloat(config.deliveryFee3km || 0);
                else if (distKm < 10) fee = parseFloat(config.deliveryFee10km || 2.5);
                else fee = parseFloat(config.deliveryFeeMax || 5);

                return { fee, distance: distKm };
            }
        } catch (e) {
            console.error("Geocoding error:", e);
        }
        return { fee: parseFloat(config.deliveryFee10km || 2.5), distance: 0 };
    }

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const config = typeof getSettings === 'function' ? getSettings() : {};
        if (config.orderingEnabled === false) return alert("Wir nehmen aktuell leider keine Bestellungen entgegen.");

        // FIX: Multiply by quantity!
        const currentTotal = cart.reduce((sum, item) => {
            const unitPrice = parsePrice(item.price);
            return sum + (unitPrice * item.quantity);
        }, 0);
        
        // DEBUG LOG
        console.log('[CHECKOUT] Cart before submit:', JSON.parse(JSON.stringify(cart)));
        console.log('[CHECKOUT] Cart items count:', cart.length);
        console.log('[CHECKOUT] Total calculated:', currentTotal);

        if (currentMethod === 'delivery' && currentTotal < parseFloat(config.deliveryMinOrder || 20)) {
            return alert(`Mindestbestellwert für Lieferung ist ${config.deliveryMinOrder} €. Bitte fügen Sie weitere Produkte hinzu.`);
        }

        const coName = document.getElementById('co-name');
        const coPhone = document.getElementById('co-phone');
        const coEmail = document.getElementById('co-email');
        if (!coName.value.trim()) return alert("Bitte geben Sie Ihren Namen ein.");
        if (!coPhone.value.trim()) return alert("Bitte geben Sie Ihre Telefonnummer ein.");
        if (!coEmail.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coEmail.value.trim())) return alert("Bitte geben Sie eine gültige E-Mail-Adresse ein.");

        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Berechne...';

        let feeObj = { fee: 0, distance: 0 };
        if (currentMethod === 'delivery') {
            feeObj = await getDeliveryFee(document.getElementById('co-address').value);
        }

        // FIX: Send full cart with proper structure
        const cartItemsForBackend = cart.map(item => {
            const unitPrice = parsePrice(item.price);
            return {
                id: item.id,
                name: item.name,
                price: formatPrice(unitPrice),
                unitPrice: unitPrice,
                quantity: item.quantity,
                subtotal: formatPrice(unitPrice * item.quantity),
                image: item.image || ''
            };
        });

        // pickupTime display: ASAP → "So schnell wie möglich" | Fixed → zeige diese
        let pickupTimeDisplay;
        if (coTime.value === 'asap') {
            pickupTimeDisplay = 'So schnell wie möglich';
        } else {
            pickupTimeDisplay = coDate.value
                ? `${coDate.value.split('-').reverse().join('.')} um ${coTime.value} Uhr`
                : `${coTime.value} Uhr`;
        }

        const orderData = {
            id: 'order_' + Date.now(),
            name: document.getElementById('co-name').value,
            phone: document.getElementById('co-phone').value,
            email: document.getElementById('co-email').value,
            pickupDate: coDate.value,
            pickupTime: coTime.value,
            pickupTimeDisplay: pickupTimeDisplay,
            totalItemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
            method: currentMethod,
            address: currentMethod === 'delivery' ? document.getElementById('co-address').value : 'Abholung / Vor Ort',
            floor: currentMethod === 'delivery' ? document.getElementById('co-floor').value : '',
            bell: currentMethod === 'delivery' ? document.getElementById('co-bell').value : '',
            deliveryFee: feeObj.fee.toFixed(2),
            distance: feeObj.distance.toFixed(1) + 'km',
            total: (currentTotal + feeObj.fee).toFixed(2),
            cart: cartItemsForBackend,
            notes: document.getElementById('co-allergies').value
        };

        // DEBUG LOG
        console.log('[CHECKOUT] Order data to send:', JSON.parse(JSON.stringify(orderData)));
        console.log('[CHECKOUT] Cart items in order:', orderData.cart.length);

        // Save to inbox for admin management
        const inboxItem = {
            id: orderData.id,
            type: 'order',
            name: orderData.name,
            phone: orderData.phone,
            email: orderData.email,
            customerEmail: orderData.email,
            customerName: orderData.name,
            customerPhone: orderData.phone,
            pickupDate: orderData.pickupDate,
            pickupTime: orderData.pickupTime,
            pickupTimeDisplay: orderData.pickupTimeDisplay,
            items: orderData.cart,
            totalItemCount: orderData.totalItemCount,
            total: orderData.total,
            address: orderData.address,
            method: orderData.method,
            notes: orderData.notes,
            status: 'pending'
        };
        try {
            const ls = JSON.parse(localStorage.getItem('kimi_inbox') || '[]');
            ls.unshift(inboxItem);
            if (ls.length > 200) ls.splice(200);
            localStorage.setItem('kimi_inbox', JSON.stringify(ls));
        } catch(e) {}

        if (!orderData.pickupTime) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return alert("Bitte wählen Sie eine Abholzeit.");
        }

        checkoutModal.classList.add('opacity-0', 'pointer-events-none');
        statusModal.classList.remove('opacity-0', 'pointer-events-none');

        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
        const pickupTimeStr = orderData.pickupTimeDisplay;

        // Send Telegram notification to admin
        fetch('/api/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderType: 'order',
                customerName: orderData.name,
                customerPhone: orderData.phone,
                customerEmail: orderData.email,
                pickupDate: orderData.pickupDate,
                pickupTime: pickupTimeStr,
                total: orderData.total,
                itemCount: itemCount,
                notes: orderData.notes,
                items: orderData.cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            })
        }).catch(err => console.error('[CHECKOUT] Telegram notify failed:', err));

        // Send email confirmation to customer
        fetch('/api/notify-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerEmail: orderData.email,
                customerName: orderData.name,
                customerPhone: orderData.phone,
                orderType: 'order',
                pickupDate: orderData.pickupDate,
                pickupTime: pickupTimeStr,
                notes: orderData.notes,
                items: orderData.cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                total: orderData.total,
                itemCount: itemCount
            })
        }).catch(err => console.error('[CHECKOUT] Email confirm failed:', err));

        // Send Gmail notification to admin
        const gmailPayload = {
            orderType: 'order',
            customerName: orderData.name,
            customerPhone: orderData.phone,
            customerEmail: orderData.email,
            pickupDate: orderData.pickupDate,
            pickupTime: pickupTimeStr,
            notes: orderData.notes,
            items: orderData.cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            total: orderData.total,
            itemCount: itemCount,
            address: orderData.address
        };
        fetch('/api/gmail-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gmailPayload)
        }).then(res => {
            if (!res.ok) throw new Error('Gmail API returned ' + res.status);
        }).catch(err => console.error('[CHECKOUT] Gmail notify failed:', err));

        if (socket) {
            socket.emit('submit_order', orderData);
        }

        // CLEAR CART after successful submission
        cart = [];
        updateCartUI();

        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    });
}

// --- 9. Dynamic SEO Automation ---
function initDynamicSEO() {
    const config = typeof getSettings === 'function' ? getSettings() : {};
    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || (navigator.language.startsWith('en') ? 'en' : 'de');
    const isEn = lang === 'en';
    
    const title = isEn ? (config.seoTitleEn || config.seoTitle) : config.seoTitle;
    const desc = isEn ? (config.seoDescriptionEn || config.seoDescription) : config.seoDescription;
    const keywords = isEn ? (config.seoKeywordsEn || config.seoKeywords) : config.seoKeywords;
    
    // Domain Handling
    const currentDomain = window.location.hostname || config.siteDomain || "kimisushi.de";
    const currentProtocol = window.location.protocol;
    const siteUrl = `${currentProtocol}//${currentDomain}`;

    document.title = title;
    
    const setAttr = (sel, attr, val) => {
        const el = document.querySelector(sel);
        if (el && val) el.setAttribute(attr, val);
    };

    setAttr('meta[name="description"]', 'content', desc);
    setAttr('meta[name="keywords"]', 'content', keywords);
    
    // Social & Canonical
    setAttr('link[rel="canonical"]', 'href', window.location.href);
    setAttr('meta[property="og:url"]', 'content', window.location.href);
    setAttr('meta[property="og:title"]', 'content', title);
    setAttr('meta[property="og:description"]', 'content', desc);
    setAttr('meta[property="og:image"]', 'content', `${siteUrl}/images/hero_sushi.png`);
    
    setAttr('meta[property="twitter:url"]', 'content', window.location.href);
    setAttr('meta[property="twitter:title"]', 'content', title);
    setAttr('meta[property="twitter:description"]', 'content', desc);
    setAttr('meta[property="twitter:image"]', 'content', `${siteUrl}/images/hero_sushi.png`);
    
    // GEO Tags Sync
    const pos = config.geoPosition || "48.67499;9.21361";
    setAttr('meta[name="geo.region"]', 'content', config.geoRegion || "DE-BW");
    setAttr('meta[name="geo.placename"]', 'content', config.geoPlacename || "Filderstadt");
    setAttr('meta[name="geo.position"]', 'content', pos);
    setAttr('meta[name="ICBM"]', 'content', pos.replace(';', ', '));

    const schema = {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": config.brandName || "Kimi Sushi",
        "image": `${siteUrl}/images/hero_sushi.png`,
        "@id": siteUrl,
        "url": siteUrl,
        "telephone": config.phone || "+49 123 4567890",
        "priceRange": "$$",
        "servesCuisine": "Japanese, Sushi",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": config.address?.split(',')[0] || "Bernhäuser Hauptstraße 27",
            "addressLocality": config.geoPlacename || "Filderstadt",
            "postalCode": config.address?.match(/\d{5}/)?.[0] || "70794",
            "addressRegion": "BW",
            "addressCountry": "DE"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": parseFloat(pos.split(';')[0]),
            "longitude": parseFloat(pos.split(';')[1])
        }
    };

    let script = document.getElementById('dynamic-schema');
    if (!script) {
        script = document.createElement('script');
        script.id = 'dynamic-schema';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.text = JSON.stringify(schema);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicSEO);
} else {
    initDynamicSEO();
}
