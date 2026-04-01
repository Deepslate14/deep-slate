// cloaking.js - Tab Cloaking and Panic Mode Logic for Deep Slate

const cloakingPresets = {
    google: { title: 'Google', icon: 'https://www.google.com/favicon.ico' },
    google_drive: { title: 'My Drive - Google Drive', icon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png' },
    classroom: { title: 'Classes', icon: 'https://www.gstatic.com/classroom/favicon.png' },
    canvas: { title: 'Dashboard', icon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10613c0c1.ico' },
    wikipedia: { title: 'Wikipedia, the free encyclopedia', icon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico' },
    none: { title: 'Deep Slate Proxy', icon: '/logo.png' }
};

// Apply saved settings on load
function applyCloak() {
    const saved = localStorage.getItem('deepslate_cloak');
    if (!saved || saved === 'none') return;

    const config = cloakingPresets[saved] || JSON.parse(saved);
    if (config) {
        document.title = config.title;
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = config.icon;
    }
}

// Function to change cloak
function setCloak(preset) {
    if (preset === 'none') {
        localStorage.removeItem('deepslate_cloak');
        location.reload();
        return;
    }
    localStorage.setItem('deepslate_cloak', preset);
    applyCloak();
}

// Panic Function - Opens site in about:blank
function launchAboutBlank() {
    const url = window.location.href;
    const win = window.open('about:blank', '_blank');
    if (!win) {
        alert('Please allow popups for panic mode to work!');
        return;
    }
    win.document.body.style.margin = '0';
    win.document.body.style.height = '100vh';
    const iframe = win.document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.margin = '0';
    iframe.src = url;
    win.document.body.appendChild(iframe);
    
    // Redirect current tab to something safe
    const panicLink = localStorage.getItem('deepslate_panic_link') || 'https://classroom.google.com';
    window.location.replace(panicLink);
}

// Hotkey Listener for Panic Mode
document.addEventListener('keydown', (e) => {
    const savedKey = localStorage.getItem('deepslate_panic_key') || 'Escape';
    // Don't trigger if typing in an input
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    
    if (e.key === savedKey) {
        launchAboutBlank();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', applyCloak);
