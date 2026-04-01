// settings.js - Persistent Settings UI for Deep Slate

const settingsHTML = `
<div id="settings-btn" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: rgba(50, 50, 50, 0.8); backdrop-filter: blur(8px); padding: 12px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); transition: all 0.3s ease;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #00b5d8)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 5px var(--accent, #00b5d8));"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
</div>

<div id="settings-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: none; align-items: center; justify-content: center; backdrop-filter: blur(10px); animation: fadeIn 0.3s ease-out; font-family: 'Pixelify Sans', sans-serif;">
    <div style="background: var(--primary, #1e2532); border: 2px solid var(--accent, #00b5d8); padding: 40px; border-radius: 20px; width: 90%; max-width: 450px; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <button id="close-settings" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: #ff5555; cursor: pointer; font-size: 1.5rem; font-weight: 900;">&times;</button>
        <h2 style="margin-top: 0; color: var(--accent, #00b5d8); text-transform: uppercase; letter-spacing: 2px; text-align: center;">User Optimization</h2>
        
        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #fff;">Tab Cloaking</label>
        <select id="cloak-select" style="width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 8px; color: #ccc; cursor: pointer; outline: none; margin-bottom: 25px;">
            <option value="none">Default (Deep Slate)</option>
            <option value="google">Google Search</option>
            <option value="google_drive">Google Drive</option>
            <option value="classroom">Google Classroom</option>
            <option value="canvas">Canvas Dashboard</option>
            <option value="wikipedia">Wikipedia</option>
        </select>

        <p style="color: #666; font-size: 0.75rem; margin-top: 10px; text-align: center;">Panic Mode Shortcut & Link:</p>
        <input type="text" id="panic-link-input" placeholder="e.g., https://gmail.com" style="width: 100%; padding: 12px; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 8px; color: #ccc; margin-top: 5px; font-size: 0.9rem; outline: none; margin-bottom: 15px; box-sizing: border-box;">

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 25px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="text-align: left;">
                <span style="display: block; font-weight: bold; color: #fff; font-size: 0.9rem;">Panic Hotkey</span>
                <span style="display: block; font-size: 0.7rem; color: #777;">Recording...</span>
            </div>
            <button id="hotkey-record-btn" style="padding: 10px 18px; background: rgba(0, 181, 216, 0.1); border: 1.5px solid var(--accent); border-radius: 8px; color: var(--accent); cursor: pointer; font-size: 0.85rem; font-weight: 800; min-width: 100px; transition: all 0.2s;">Escape</button>
        </div>

        <button id="panic-btn" style="width: 100%; padding: 16px; background: linear-gradient(135deg, #cc2e2e, #8c1c1c); color: #fff; border: none; border-radius: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 5px 15px rgba(204, 46, 46, 0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
            Panic Launcher
        </button>
    </div>
</div>

<style>
@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
#settings-btn:hover { transform: scale(1.1) rotate(45deg); border-color: var(--accent, #00b5d8); }
#panic-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(130, 28, 28, 0.4); }
#cloak-select:focus { border-color: var(--accent, #00b5d8); box-shadow: 0 0 10px rgba(0, 181, 216, 0.2); }
#hotkey-record-btn:active { transform: scale(0.95); }
</style>
`;

function injectSettings() {
    // Only inject if not already there
    if (document.getElementById('settings-btn')) return;

    const div = document.createElement('div');
    div.innerHTML = settingsHTML;
    document.body.appendChild(div);

    const btn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const close = document.getElementById('close-settings');
    const cloakSelect = document.getElementById('cloak-select');
    const panicLinkInput = document.getElementById('panic-link-input');
    const hotkeyBtn = document.getElementById('hotkey-record-btn');
    const panicBtn = document.getElementById('panic-btn');

    btn.onclick = () => modal.style.display = 'flex';
    close.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    // Load saved settings
    const currentCloak = localStorage.getItem('deepslate_cloak') || 'none';
    cloakSelect.value = currentCloak;

    const currentPanicLink = localStorage.getItem('deepslate_panic_link') || 'https://classroom.google.com';
    panicLinkInput.value = currentPanicLink;

    const currentHotkey = localStorage.getItem('deepslate_panic_key') || 'Escape';
    hotkeyBtn.innerText = currentHotkey;

    // Listeners
    cloakSelect.onchange = (e) => {
        if (typeof setCloak === 'function') setCloak(e.target.value);
    };

    panicLinkInput.onchange = (e) => {
        localStorage.setItem('deepslate_panic_link', e.target.value);
    };

    // Correct Hotkey recording logic
    hotkeyBtn.addEventListener('click', function(event) {
        // Prevent event from trickling up
        event.stopPropagation();
        
        const originalText = hotkeyBtn.innerText;
        hotkeyBtn.innerText = 'Press Key...';
        hotkeyBtn.style.background = 'rgba(0, 181, 216, 0.3)';

        const keyListener = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const newKey = e.key;
            localStorage.setItem('deepslate_panic_key', newKey);
            hotkeyBtn.innerText = newKey;
            hotkeyBtn.style.background = 'rgba(0, 181, 216, 0.1)';
            
            window.removeEventListener('keydown', keyListener, true);
        };

        window.addEventListener('keydown', keyListener, true);
    });

    panicBtn.onclick = () => {
        if (typeof launchAboutBlank === 'function') launchAboutBlank();
    };
}

// Ensure injection
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSettings);
} else {
    injectSettings();
}
