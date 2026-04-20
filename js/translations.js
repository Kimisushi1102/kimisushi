/**
 * Kimi Sushi - Internationalization (i18n) System
 * Only covers customer-facing frontend text. Admin/POS are untouched.
 */

const i18n = {
    currentLang: 'de',

    translations: {
        de: {
            // === HEADER / NAVBAR ===
            nav_about: 'Über uns',
            nav_menu: 'Speisekarte',
            nav_combos: 'Menüs',
            nav_reviews: 'Bewertungen',
            nav_contact: 'Kontakt',
            cta_reserve: 'Jetzt reservieren',

            // === HERO ===
            hero_tagline: 'Premium Sushi Cuisine',
            hero_title: 'Die Kunst des<br><span class="text-brand-gold italic font-normal">wahren Geschmacks.</span>',
            hero_desc: 'Erleben Sie erstklassiges, handgemachtes Sushi. Frischeste Zutaten, authentische japanische Handwerkskunst und ein gemütliches Ambiente erwarten Sie.',
            hero_btn_reserve: 'Jetzt reservieren',
            hero_btn_menu: 'Speisekarte ansehen',
            hero_stat_fresh: 'Täglich frisch',
            hero_stat_fresh_sub: 'Premium Zutaten',
            hero_stat_delivery: 'Schnelle Lieferung',
            hero_stat_delivery_sub: 'Im Umkreis von 5km',
            hero_stat_rated: 'Top bewertet',
            hero_stat_rated_sub: '4.9/5 bei Google',

            // === ABOUT ===
            about_label: 'Über Kimi Sushi',
            about_title: 'Tradition trifft\nauf Moderne.',
            about_p1: 'Seit über einem Jahrzehnt widmen wir uns der Perfektionierung der Sushi-Kunst. In unserem kleinen, intimen Restaurant in der Altstadt verbinden wir traditionelle japanische Techniken mit modernen, kreativen Einflüssen.',
            about_p2: 'Unser Geheimnis? Es gibt keines. Nur den kompromisslosen Fokus auf absolute Frische, Reiskörner in perfekter Temperatur und den Respekt vor jedem einzelnen Produkt, das unsere Küche verlässt.',
            about_title_plain: 'Tradition trifft<br>auf Moderne.',
            about_feat1_title: 'Frische Zutaten',
            about_feat1_desc: 'Tägliche Lieferung vom ausgewählten Fischmarkt.',
            about_feat2_title: 'Erfahrene Köche',
            about_feat2_desc: 'Meister ihres Fachs mit jahrelanger Ausbildung.',
            about_feat3_title: 'Gemütliche Atmosphäre',
            about_feat3_desc: 'Ein Stück Japan zum Wohlfühlen und Entspannen.',
            about_feat4_title: 'Faire Preise',
            about_feat4_desc: 'Höchste Qualität, die bezahlbar bleibt.',
            about_badge: 'Jahre<br>Erfahrung',

            // === QUALITY PROMISES ===
            quality1_title: 'Zertifizierte Frische',
            quality1_desc: 'Wir beziehen unseren Fisch ausschließlich von streng zertifizierten, nachhaltigen Händlern. Qualität, die man schmeckt.',
            quality2_title: 'Echte Handarbeit',
            quality2_desc: 'Jede Rolle, jedes Nigiri wird von unseren erfahrenen Sushi-Meistern à la minute für Sie perfektioniert.',
            quality3_title: 'Authentische Rezeptur',
            quality3_desc: 'Unser Sushireis wird nach einem alten Familienrezept zubereitet – der Schlüssel zum wahren Umami-Erlebnis.',

            // === MENU SECTION ===
            menu_label: 'Unsere Speisekarte',
            menu_title: 'Beliebte Gerichte.',
            menu_desc: 'Entdecken Sie unsere feine Auswahl an handgerollten Sushi-Kreationen, frischem Sashimi und warmen japanischen Spezialitäten.',
            menu_filter_all: 'Alle',
            menu_see_full: 'Gesamte Speisekarte ansehen',

            // === COMBOS SECTION ===
            combos_label: 'Spezielle Menüs',
            combos_title: 'Menü Sets.',
            combos_desc: 'Perfekt abgestimmte Sets für ein rundum vollkommenes Geschmackserlebnis. Ideal zum Teilen.',

            // === GALLERY ===
            gallery_label: 'Ambiente',
            gallery_title: 'Das Kimi Erlebnis.',
            gallery_desc: 'Treten Sie ein in eine Welt der Ruhe und des Genusses. Eine kleine japanische Oase mitten in der Stadt.',

            // === REVIEWS ===
            reviews_label: 'Testimonials',
            reviews_title: 'Stimmen unserer Gäste.',
            reviews_google: 'Google Bewertungen',
            reviews_all: 'Alle Rezensionen ansehen',

            // === RESERVATION ===
            res_title: 'Tisch reservieren',
            res_subtitle: 'Sicheren Sie sich Ihren Platz in unserem Restaurant. Für Gruppen ab 6 Personen rufen Sie uns bitte direkt an.',
            res_call_label: 'Rufen Sie uns an',
            res_hours_label: 'Öffnungszeiten',
            res_name_label: 'Vollständiger Name *',
            res_name_placeholder: 'Max Mustermann',
            res_name_error: 'Bitte geben Sie Ihren Namen ein.',
            res_email_label: 'E-Mail Adresse *',
            res_email_placeholder: 'mail@beispiel.de',
            res_email_error: 'Gültige E-Mail erforderlich.',
            res_phone_label: 'Telefonnummer *',
            res_phone_placeholder: '+49 123 456789',
            res_phone_error: 'Gültige Telefonnummer erforderlich.',
            res_date_label: 'Datum *',
            res_time_label: 'Uhrzeit *',
            res_time_placeholder: 'Wählen',
            res_persons_label: 'Personen *',
            res_message_label: 'Anmerkungen (Optional)',
            res_message_placeholder: 'Allergien, besondere Wünsche...',
            res_success_title: 'Anfrage gesendet!',
            res_success_msg: 'Wir haben Ihre Reservierungsanfrage erhalten und bestätigen diese in Kürze.',
            res_submit_btn: 'Tisch anfragen',
            res_sending: 'Senden...',
            res_person: 'Person',
            res_persons: 'Personen',

            // === FAQ ===
            faq_label: 'FAQ',
            faq_title: 'Häufige Fragen.',
            faq_empty: 'Noch keine Fragen vorhanden.',

            // === FOOTER ===
            footer_desc: 'Feinste Handwerkskunst, absolute Frische und ein Hauch von Tokio. Entdecken Sie den wahren Geschmack Japans.',
            footer_contact: 'Kontakt',
            footer_hours: 'Öffnungszeiten',
            footer_links: 'Links',
            footer_link_about: 'Über uns',
            footer_link_menu: 'Speisekarte',
            footer_link_reserve: 'Tisch reservieren',
            footer_link_impressum: 'Impressum',
            footer_link_privacy: 'Datenschutz',
            footer_copyright: 'Alle Rechte vorbehalten.',
            footer_designed: 'Designed with',
            footer_for_taste: 'for pure taste.',
            footer_days_mon: 'Montag',
            footer_days_tue: 'Dienstag',
            footer_days_wed: 'Mittwoch',
            footer_days_thu: 'Donnerstag',
            footer_days_fri: 'Freitag',
            footer_days_sat: 'Samstag',
            footer_days_sun: 'Sonntag',

            // === CART TOAST ===
            toast_title: 'Im Warenkorb',
            toast_msg: 'Gericht wurde erfolgreich hinzugefügt.',

            // === CHECKOUT MODAL ===
            checkout_title: 'Kasse',
            checkout_order_label: 'Ihre Bestellung',
            checkout_empty_cart: 'Warenkorb ist leer',
            checkout_pickup: 'Abholung',
            checkout_delivery: 'Lieferung',
            checkout_name_label: 'Ihr Name *',
            checkout_phone_label: 'Telefon *',
            checkout_email_label: 'E-Mail *',
            checkout_email_placeholder: 'mail@beispiel.de',
            checkout_address_label: 'Lieferadresse *',
            checkout_address_placeholder: 'Straße, Hausnummer...',
            checkout_floor_label: 'Etage / Whg.',
            checkout_floor_placeholder: 'z.B. 3. OG',
            checkout_bell_label: 'Klingelname',
            checkout_bell_placeholder: 'z.B. Schmidt',
            checkout_order_label: 'Ihre Bestellung',
            checkout_order_value: 'Bestellwert',
            checkout_delivery_fee: 'Liefergebühr',
            checkout_delivery_fee_range: 'Liefergebühr (<span id="co-distance-text-i18n">0.0km</span>)',
            checkout_free: 'Gratis',
            checkout_total: 'GESAMT',
            checkout_pickup_date_label: 'Abholdatum *',
            checkout_pickup_time_label: 'Abholzeit *',
            checkout_asap: 'So schnell wie möglich',
            checkout_allergies_label: 'Allergien / Wünsche',
            checkout_allergies_placeholder: 'Z.B. keine Mayo...',
            checkout_shop_closed: 'Geschlossen – bitte Abholzeit in Öffnungszeiten wählen.',
            checkout_order_count: 'Gerichte',
            checkout_order_unit: 'Gerichte',
            checkout_empty_alert: 'Warenkorb ist leer!',
            checkout_submit: 'Kostenpflichtig Bestellen',

            // === STATUS MODAL ===
            status_thanks: 'Vielen Dank!',
            status_msg: 'Wir haben Ihre Anfrage erfolgreich erhalten. Unser Team wird sich in Kürze telefonisch oder per E-Mail bei Ihnen melden.',
            status_looking_forward: 'Wir freuen uns auf Sie!',
            status_back_home: 'Zurück zur Startseite',

            // === MOBILE STICKY CTA ===
            mobile_reserve: 'Reservieren',

            // === MENU FILTER LABELS (dynamic category mapping) ===
            filter_sushi: 'Nigiri',
            filter_maki: 'Maki Rolls',
            filter_sashimi: 'Sashimi',
            filter_warm: 'Warme Gerichte',
            filter_drinks: 'Getränke',
            filter_desserts: 'Desserts',
            filter_extras: 'Extras',
            filter_veggie: 'Vegetarisch',

            // === SAMPLE DATA FALLBACK ===
            sample_bestseller: 'Bestseller',
            sample_empfehlung: 'Empfehlung',
            sample_neu: 'Neu',
            sample_veggie: 'Veggie',
            sample_pieces: 'Stück',
            sample_lachs_nigiri_name: 'Lachs Nigiri',
            sample_lachs_nigiri_desc: 'Frischer atlantischer Lachs auf perfekt geformtem Sushireis',
            sample_thunfisch_nigiri_name: 'Thunfisch Nigiri',
            sample_thunfisch_nigiri_desc: 'Premium Thunfisch, zart und geschmackvoll',
            sample_dragon_roll_name: 'Dragon Roll',
            sample_dragon_roll_desc: 'Tempura Garnele, Avocado, Gurke, topped mit Aal und Eiklar',
            sample_rainbow_roll_name: 'Rainbow Roll',
            sample_rainbow_roll_desc: 'California Roll topped mit buntem Lachskaviar und Lachs',
            sample_lachs_sashimi_name: 'Lachs Sashimi',
            sample_lachs_sashimi_desc: '18 hauchdünne Scheiben frischer Lachs',
            sample_mix_sashimi_name: 'Mix Sashimi',
            sample_mix_sashimi_desc: 'Auswahl der besten Sashimi: Lachs, Thunfisch und Tintenfisch',
            sample_california_roll_name: 'California Roll',
            sample_california_roll_desc: 'Krabbenstick, Avocado, Gurke mit Sesam',
            sample_avocado_maki_name: 'Avocado Maki',
            sample_avocado_maki_desc: 'Cremige Avocado in einem perfekt gerollten Maki',
            sample_combo1_name: 'Sushi Menü Classic',
            sample_combo1_subtitle: 'Perfekt für 2 Personen',
            sample_combo1_items: '8x Nigiri Sushi\n4x Maki Roll\n1x Miso Suppe\n2x Wasabi & Ingwer',
            sample_combo1_tag: "Chef's Choice",
            sample_combo2_name: 'Sushi Menü Deluxe',
            sample_combo2_subtitle: 'Für 3–4 Personen',
            sample_combo2_items: '12x Nigiri Sushi\n8x Maki Roll\n6x Sashimi\n2x Miso Suppe\n1x Edamame',
            sample_combo2_tag: 'Bestseller',
            sample_combo3_name: 'Vegetarisches Menü',
            sample_combo3_subtitle: 'Für 2 Personen',
            sample_combo3_items: '6x Avocado Maki\n4x Kappa Maki\n2x Veggie Roll\n1x Edamame\n1x Miso Suppe',
            sample_combo3_tag: 'Veggie',
            cart_add: 'In den Warenkorb',

            // === MENU TAGS (rendered dynamically) ===
            tag_bestseller: 'Bestseller',
            tag_empfehlung: 'Empfehlung',
            tag_neu: 'Neu',
            tag_veggie: 'Veggie',
        },

        en: {
            // === HEADER / NAVBAR ===
            nav_about: 'About Us',
            nav_menu: 'Menu',
            nav_combos: 'Menus',
            nav_reviews: 'Reviews',
            nav_contact: 'Contact',
            cta_reserve: 'Reserve Now',

            // === HERO ===
            hero_tagline: 'Premium Sushi Cuisine',
            hero_title: 'The Art of<br><span class="text-brand-gold italic font-normal">True Flavor.</span>',
            hero_desc: 'Experience top-quality, handmade sushi. Freshest ingredients, authentic Japanese craftsmanship, and a cozy atmosphere await you.',
            hero_btn_reserve: 'Reserve Now',
            hero_btn_menu: 'View Menu',
            hero_stat_fresh: 'Daily Fresh',
            hero_stat_fresh_sub: 'Premium Ingredients',
            hero_stat_delivery: 'Fast Delivery',
            hero_stat_delivery_sub: 'Within 5km radius',
            hero_stat_rated: 'Top Rated',
            hero_stat_rated_sub: '4.9/5 on Google',

            // === ABOUT ===
            about_label: 'About Kimi Sushi',
            about_title: 'Tradition Meets\nModernity.',
            about_p1: 'For over a decade, we have dedicated ourselves to perfecting the art of sushi. In our intimate restaurant in the old town, we blend traditional Japanese techniques with modern, creative influences.',
            about_p2: 'Our secret? There is none. Only the uncompromising focus on absolute freshness, rice grains at the perfect temperature, and respect for every single product that leaves our kitchen.',
            about_title_plain: 'Tradition Meets<br>Modernity.',
            about_feat1_title: 'Fresh Ingredients',
            about_feat1_desc: 'Daily delivery from selected fish markets.',
            about_feat2_title: 'Experienced Chefs',
            about_feat2_desc: 'Masters of their craft with years of training.',
            about_feat3_title: 'Cozy Atmosphere',
            about_feat3_desc: 'A piece of Japan to relax and feel at home.',
            about_feat4_title: 'Fair Prices',
            about_feat4_desc: 'Highest quality that remains affordable.',
            about_badge: 'Years of<br>Experience',

            // === QUALITY PROMISES ===
            quality1_title: 'Certified Freshness',
            quality1_desc: 'We source our fish exclusively from strictly certified, sustainable suppliers. Quality you can taste.',
            quality2_title: 'True Handcraft',
            quality2_desc: 'Every roll, every nigiri is perfected à la minute by our experienced sushi masters.',
            quality3_title: 'Authentic Recipe',
            quality3_desc: 'Our sushi rice is prepared following an old family recipe – the key to a true umami experience.',

            // === MENU SECTION ===
            menu_label: 'Our Menu',
            menu_title: 'Popular Dishes.',
            menu_desc: 'Discover our fine selection of hand-rolled sushi creations, fresh sashimi, and warm Japanese specialties.',
            menu_filter_all: 'All',
            menu_see_full: 'View Full Menu',

            // === COMBOS SECTION ===
            combos_label: 'Special Menus',
            combos_title: 'Menu Sets.',
            combos_desc: 'Perfectly matched sets for a complete culinary experience. Ideal for sharing.',

            // === GALLERY ===
            gallery_label: 'Ambiance',
            gallery_title: 'The Kimi Experience.',
            gallery_desc: 'Step into a world of calm and enjoyment. A small Japanese oasis in the heart of the city.',

            // === REVIEWS ===
            reviews_label: 'Testimonials',
            reviews_title: 'Voices of Our Guests.',
            reviews_google: 'Google Reviews',
            reviews_all: 'View All Reviews',

            // === RESERVATION ===
            res_title: 'Reserve a Table',
            res_subtitle: 'Secure your spot at our restaurant. For groups of 6 or more, please call us directly.',
            res_call_label: 'Call Us',
            res_hours_label: 'Opening Hours',
            res_name_label: 'Full Name *',
            res_name_placeholder: 'John Doe',
            res_name_error: 'Please enter your name.',
            res_email_label: 'Email Address *',
            res_email_placeholder: 'mail@example.com',
            res_email_error: 'Valid email required.',
            res_phone_label: 'Phone Number *',
            res_phone_placeholder: '+49 123 456789',
            res_phone_error: 'Valid phone number required.',
            res_date_label: 'Date *',
            res_time_label: 'Time *',
            res_time_placeholder: 'Select',
            res_persons_label: 'Guests *',
            res_message_label: 'Notes (Optional)',
            res_message_placeholder: 'Allergies, special requests...',
            res_success_title: 'Request Sent!',
            res_success_msg: 'We have received your reservation request and will confirm shortly.',
            res_submit_btn: 'Request Table',
            res_sending: 'Sending...',
            res_person: 'Person',
            res_persons: 'Persons',

            // === FAQ ===
            faq_label: 'FAQ',
            faq_title: 'Frequently Asked Questions.',
            faq_empty: 'No questions yet.',

            // === FOOTER ===
            footer_desc: 'Finest craftsmanship, absolute freshness, and a touch of Tokyo. Discover the true taste of Japan.',
            footer_contact: 'Contact',
            footer_hours: 'Opening Hours',
            footer_links: 'Links',
            footer_link_about: 'About Us',
            footer_link_menu: 'Menu',
            footer_link_reserve: 'Reserve a Table',
            footer_link_impressum: 'Imprint',
            footer_link_privacy: 'Privacy Policy',
            footer_copyright: 'All rights reserved.',
            footer_designed: 'Designed with',
            footer_for_taste: 'for pure taste.',
            footer_days_mon: 'Monday',
            footer_days_tue: 'Tuesday',
            footer_days_wed: 'Wednesday',
            footer_days_thu: 'Thursday',
            footer_days_fri: 'Friday',
            footer_days_sat: 'Saturday',
            footer_days_sun: 'Sunday',

            // === CART TOAST ===
            toast_title: 'In Cart',
            toast_msg: 'Dish added successfully.',

            // === CHECKOUT MODAL ===
            checkout_title: 'Checkout',
            checkout_order_label: 'Your Order',
            checkout_empty_cart: 'Cart is empty',
            checkout_pickup: 'Pickup',
            checkout_delivery: 'Delivery',
            checkout_name_label: 'Your Name *',
            checkout_phone_label: 'Phone *',
            checkout_email_label: 'Email *',
            checkout_email_placeholder: 'mail@example.com',
            checkout_address_label: 'Delivery Address *',
            checkout_address_placeholder: 'Street, house number...',
            checkout_floor_label: 'Floor / Apt.',
            checkout_floor_placeholder: 'e.g. 3rd floor',
            checkout_bell_label: 'Doorbell Name',
            checkout_bell_placeholder: 'e.g. Smith',
            checkout_order_value: 'Order Total',
            checkout_delivery_fee: 'Delivery Fee',
            checkout_delivery_fee_range: 'Delivery Fee (<span id="co-distance-text-i18n">0.0km</span>)',
            checkout_free: 'Free',
            checkout_total: 'TOTAL',
            checkout_pickup_date_label: 'Pickup Date *',
            checkout_pickup_time_label: 'Pickup Time *',
            checkout_asap: 'As soon as possible',
            checkout_allergies_label: 'Allergies / Requests',
            checkout_allergies_placeholder: 'e.g. no mayo...',
            checkout_shop_closed: 'Closed – please select pickup time within opening hours.',
            checkout_order_count: 'Dishes',
            checkout_order_unit: 'Dishes',
            checkout_empty_alert: 'Cart is empty!',
            checkout_submit: 'Place Order',

            // === STATUS MODAL ===
            status_thanks: 'Thank You!',
            status_msg: 'We have successfully received your request. Our team will contact you shortly by phone or email.',
            status_looking_forward: 'We look forward to seeing you!',
            status_back_home: 'Back to Homepage',

            // === MOBILE STICKY CTA ===
            mobile_reserve: 'Reserve',

            // === MENU FILTER LABELS (dynamic category mapping) ===
            filter_sushi: 'Nigiri',
            filter_maki: 'Maki Rolls',
            filter_sashimi: 'Sashimi',
            filter_warm: 'Warm Dishes',
            filter_drinks: 'Drinks',
            filter_desserts: 'Desserts',
            filter_extras: 'Extras',
            filter_veggie: 'Vegetarian',

            // === SAMPLE DATA FALLBACK ===
            sample_bestseller: 'Bestseller',
            sample_empfehlung: 'Recommendation',
            sample_neu: 'New',
            sample_veggie: 'Veggie',
            sample_pieces: 'pcs',
            sample_lachs_nigiri_name: 'Salmon Nigiri',
            sample_lachs_nigiri_desc: 'Fresh Atlantic salmon on perfectly shaped sushi rice',
            sample_thunfisch_nigiri_name: 'Tuna Nigiri',
            sample_thunfisch_nigiri_desc: 'Premium tuna, tender and flavorful',
            sample_dragon_roll_name: 'Dragon Roll',
            sample_dragon_roll_desc: 'Tempura shrimp, avocado, cucumber, topped with eel and egg',
            sample_rainbow_roll_name: 'Rainbow Roll',
            sample_rainbow_roll_desc: 'California roll topped with colorful roe and salmon',
            sample_lachs_sashimi_name: 'Salmon Sashimi',
            sample_lachs_sashimi_desc: '18 paper-thin slices of fresh salmon',
            sample_mix_sashimi_name: 'Mix Sashimi',
            sample_mix_sashimi_desc: 'Selection of the best sashimi: salmon, tuna, and octopus',
            sample_california_roll_name: 'California Roll',
            sample_california_roll_desc: 'Crab stick, avocado, cucumber with sesame',
            sample_avocado_maki_name: 'Avocado Maki',
            sample_avocado_maki_desc: 'Creamy avocado in a perfectly rolled maki',
            sample_combo1_name: 'Sushi Menu Classic',
            sample_combo1_subtitle: 'Perfect for 2 persons',
            sample_combo1_items: '8x Nigiri Sushi\n4x Maki Roll\n1x Miso Soup\n2x Wasabi & Ginger',
            sample_combo1_tag: "Chef's Choice",
            sample_combo2_name: 'Sushi Menu Deluxe',
            sample_combo2_subtitle: 'For 3–4 persons',
            sample_combo2_items: '12x Nigiri Sushi\n8x Maki Roll\n6x Sashimi\n2x Miso Soup\n1x Edamame',
            sample_combo2_tag: 'Bestseller',
            sample_combo3_name: 'Vegetarian Menu',
            sample_combo3_subtitle: 'For 2 persons',
            sample_combo3_items: '6x Avocado Maki\n4x Kappa Maki\n2x Veggie Roll\n1x Edamame\n1x Miso Soup',
            sample_combo3_tag: 'Veggie',
            cart_add: 'Add to Cart',

            // === MENU TAGS (rendered dynamically) ===
            tag_bestseller: 'Bestseller',
            tag_empfehlung: 'Recommendation',
            tag_neu: 'New',
            tag_veggie: 'Veggie',
        }
    },

    /**
     * Get translation for a key.
     * @param {string} key
     * @returns {string}
     */
    t(key) {
        const langData = this.translations[this.currentLang];
        return langData[key] || this.translations['de'][key] || key;
    },

    /**
     * Set language and update all UI elements.
     * @param {string} lang - 'de' or 'en'
     */
    setLang(lang) {
        if (!this.translations[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('kimi_lang', lang);
        this.updateUI();
        this.applyLangAttr();
    },

    /**
     * Initialize language from localStorage or default to German.
     */
    init() {
        const saved = localStorage.getItem('kimi_lang');
        this.currentLang = (saved && this.translations[saved]) ? saved : 'de';
        this.applyLangAttr();
        // Apply HTML attribute for accessibility
        document.documentElement.lang = this.currentLang;
    },

    /**
     * Update all elements with data-i18n attribute.
     */
    updateUI() {
        // Update all static data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = translated;
                }
            } else if (el.hasAttribute('data-i18n-attr')) {
                const attr = el.getAttribute('data-i18n-attr');
                el.setAttribute(attr, translated);
            } else {
                el.textContent = translated;
            }
        });

        // Update all data-i18n-html elements (allow HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = this.t(key);
        });

        // Update placeholders separately
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Update aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            el.setAttribute('aria-label', this.t(key));
        });

        // Update lang switcher button text
        const langBtn = document.getElementById('lang-switch-btn');
        if (langBtn) {
            langBtn.textContent = this.currentLang === 'de' ? 'EN' : 'DE';
        }

        // Trigger custom event so JS-rendered content can re-render
        window.dispatchEvent(new CustomEvent('i18n-lang-change', { detail: { lang: this.currentLang } }));
    },

    /**
     * Apply lang attribute to html tag.
     */
    applyLangAttr() {
        document.documentElement.lang = this.currentLang;
    }
};

// Auto-init when script loads (before DOM ready for early language switch)
(function() {
    const saved = localStorage.getItem('kimi_lang');
    const validLang = saved && i18n.translations[saved];
    if (validLang) {
        document.documentElement.lang = saved;
    } else {
        document.documentElement.lang = 'de';
    }
})();
