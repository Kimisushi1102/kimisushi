// ============================================================
// Admin SEO Management Module
// ============================================================
window.initSEOManagement = function() {
    loadSEOSettings();
    setupSEOSaveHandlers();
};

function loadSEOSettings() {
    fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
            // German SEO
            setVal('seo-title', data.seoTitle || '');
            setVal('seo-description', data.seoDescription || '');
            setVal('seo-keywords', data.seoKeywords || '');
            // English SEO
            setVal('seo-title-en', data.seoTitleEn || '');
            setVal('seo-description-en', data.seoDescriptionEn || '');
            setVal('seo-keywords-en', data.seoKeywordsEn || '');
            setVal('seo-author', data.seoAuthor || '');
            setVal('site-domain', data.siteDomain || '');
            // Geo
            setVal('geo-region', data.geoRegion || '');
            setVal('geo-placename', data.geoPlacename || '');
            setVal('geo-position', data.geoPosition || '');
        })
        .catch(err => console.error('[SEO] Load error:', err));
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setupSEOSaveHandlers() {
    const saveSEO = document.getElementById('save-seo');
    if (saveSEO) {
        saveSEO.addEventListener('click', () => {
            saveSEO.disabled = true;
            saveSEO.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Speichert...';
            fetch('/api/admin/settings/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    seoTitle: document.getElementById('seo-title').value,
                    seoDescription: document.getElementById('seo-description').value,
                    seoKeywords: document.getElementById('seo-keywords').value,
                    seoTitleEn: document.getElementById('seo-title-en').value,
                    seoDescriptionEn: document.getElementById('seo-description-en').value,
                    seoKeywordsEn: document.getElementById('seo-keywords-en').value,
                    seoAuthor: document.getElementById('seo-author').value,
                    siteDomain: document.getElementById('site-domain').value,
                    _adminUser: window.currentAdminUser?.username
                })
            })
            .then(r => r.json())
            .then(() => {
                saveSEO.disabled = false;
                saveSEO.innerHTML = '<i class="ph ph-check"></i> Gespeichert!';
                setTimeout(() => { saveSEO.innerHTML = '<i class="ph ph-floppy-disk"></i> SEO speichern'; }, 2000);
                showToast('SEO-Einstellungen gespeichert!');
                logActivity('SEO_SETTINGS_SAVED', {});
            })
            .catch(() => {
                saveSEO.disabled = false;
                saveSEO.innerHTML = '<i class="ph ph-floppy-disk"></i> SEO speichern';
                showToast('Fehler beim Speichern', 'error');
            });
        });
    }

    const saveGeo = document.getElementById('save-geo');
    if (saveGeo) {
        saveGeo.addEventListener('click', () => {
            fetch('/api/admin/settings/geo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geoRegion: document.getElementById('geo-region').value,
                    geoPlacename: document.getElementById('geo-placename').value,
                    geoPosition: document.getElementById('geo-position').value
                })
            }).then(r => r.json()).then(() => {
                showToast('Geo-Einstellungen gespeichert!');
            }).catch(() => showToast('Fehler', 'error'));
        });
    }

    // Generate Schema.org preview
    const genSchema = document.getElementById('generate-schema');
    if (genSchema) {
        genSchema.addEventListener('click', () => {
            const settings = {
                brandName: document.getElementById('brand-name-preview')?.textContent || 'Kimi Sushi',
                address: document.getElementById('geo-placename')?.value || '',
                phone: document.getElementById('phone-preview')?.textContent || '',
                geoPosition: document.getElementById('geo-position')?.value || ''
            };
            const schema = generateLocalBusinessSchema(settings);
            document.getElementById('schema-preview')?.setAttribute('value', schema);
        });
    }
}

function generateLocalBusinessSchema(settings) {
    return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": settings.brandName || "Kimi Sushi",
        "image": "",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": settings.address,
            "addressLocality": "Filderstadt",
            "postalCode": "70794",
            "addressCountry": "DE"
        },
        "telephone": settings.phone,
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": settings.geoPosition?.split(';')[0] || "48.67499",
            "longitude": settings.geoPosition?.split(';')[1] || "9.21361"
        },
        "servesCuisine": "Japanese",
        "priceRange": "€€",
        "openingHoursSpecification": [
            { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "11:00", "closes": "15:00" },
            { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "17:00", "closes": "22:00" },
            { "@type": "OpeningHoursSpecification", "dayOfWeek": "Sunday", "opens": "17:00", "closes": "22:00" }
        ]
    }, null, 2);
}

function logActivity(action, details) {
    console.log('[Activity]', action, details);
}
