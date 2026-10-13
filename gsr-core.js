// ==========================================
// GSR CORE ENGINE (gsr-core.js)
// Centralized Auth, Chat Drawer, and CMS UI
// ==========================================

const supabaseUrl = 'https://xwrfreokngnknftgzglg.supabase.co';
const supabaseKey = 'sb_publishable_n7pgqjIuIeRORwzVZppaMA_3sowuxXw';
window.db = window.supabase.createClient(supabaseUrl, supabaseKey);

window.currentUser = null;
window.currentProfile = null;
window.isEditModeActive = false;
window.currentEditId = null;
window.currentChatChannel = 'global';

const channelNames = { global: '🌐 Global', following: '👥 Following', team: '🛡️ Teams', pro_plus: '⭐ Pro Plus' };

// --- GLOBAL UTILITIES ---
window.escapeHtml = function(str) { 
    return str ? String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; 
};

window.executeSignOut = async function() { 
    await window.db.auth.signOut(); 
    window.location.reload(); 
};

// --- GLOBAL AUTHENTICATION ---
window.initGlobalAuth = async function(onAuthComplete = null) {
    injectGlobalModals(); // Automatically add Drawer & CMS HTML to the page
    
    try {
        const { data: { session } } = await window.db.auth.getSession();
        if (session && session.user) {
            await fetchAndSetProfile(session.user);
        } else {
            updateGlobalHeaderUI();
        }

        if (onAuthComplete) onAuthComplete();

        window.db.auth.onAuthStateChange(async (event, session) => {
            if (session && session.user) {
                await fetchAndSetProfile(session.user);
            } else {
                window.currentUser = null;
                window.currentProfile = null;
                updateGlobalHeaderUI();
                if (typeof window.onAuthChangeCallback === 'function') window.onAuthChangeCallback(false);
            }
        });
    } catch(e) { 
        console.warn("Auth initialization bypassed", e); 
        updateGlobalHeaderUI();
        if (onAuthComplete) onAuthComplete();
    }
};

async function fetchAndSetProfile(user) {
    window.currentUser = user;
    const { data: profile } = await window.db.from('gsr_profiles').select('*').eq('id', user.id).maybeSingle();
    window.currentProfile = profile;
    updateGlobalHeaderUI();
    if (typeof window.onAuthChangeCallback === 'function') window.onAuthChangeCallback(true);
}

function updateGlobalHeaderUI() {
    const userNav = document.getElementById('userNav');
    const userNavMobile = document.getElementById('userNavMobile');
    
    const displayName = window.currentProfile?.username || window.currentProfile?.sl_legacy_name || window.currentUser?.email?.split('@')[0] || '';
    const isAdmin = window.currentProfile?.is_admin || false;
    const adminBtnHTML = isAdmin ? `<button onclick="toggleEditMode()" id="editModeBtn" class="bg-brand-blue border border-brand-border hover:bg-blue-600 text-white text-[9px] sm:text-xs uppercase font-black px-3 py-1.5 lg:px-4 lg:py-2 rounded transition shadow-lg cursor-pointer">✏️ Edit Mode</button>` : '';
    const adminBtnMobile = isAdmin ? `<button onclick="toggleEditMode()" id="editModeBtnMobile" class="bg-brand-blue border border-brand-border text-white text-[10px] uppercase font-black px-3 py-1.5 rounded transition shadow-lg cursor-pointer">✏️ Edit Mode</button>` : '';

    if (window.currentUser) {
        if (userNav) {
            userNav.innerHTML = `<div class="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3"><div class="flex items-center gap-2"><div class="text-right hidden sm:block"><span class="block text-xs font-black text-white uppercase">${escapeHtml(displayName)}</span><span class="text-[9px] text-brand-green uppercase font-mono tracking-widest flex items-center justify-end gap-1"><span class="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span> Logged In</span></div><button onclick="executeSignOut()" class="bg-brand-bg border border-brand-border hover:border-brand-red text-white text-[9px] sm:text-xs uppercase font-black px-3 py-1.5 lg:px-4 lg:py-2 rounded transition shadow cursor-pointer">Sign Out</button></div>${adminBtnHTML}</div>`;
        }
        if (userNavMobile) {
            userNavMobile.innerHTML = `<div class="flex flex-col items-center gap-2 w-full mt-2"><div class="text-center"><span class="block text-xs font-black text-white uppercase">${escapeHtml(displayName)}</span><span class="text-[9px] text-brand-green uppercase font-mono tracking-widest flex items-center justify-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span> Logged In</span></div><div class="flex items-center gap-2"><button onclick="executeSignOut()" class="bg-brand-bg border border-brand-border hover:border-brand-red text-white text-[10px] uppercase font-black px-3 py-1.5 rounded transition shadow cursor-pointer">Sign Out</button>${adminBtnMobile}</div></div>`;
        }
    } else {
        const loggedOutDesktop = `<a href="sign_in.html" class="bg-brand-bg border border-brand-border hover:border-brand-gold text-gray-300 hover:text-white font-black uppercase text-[9px] sm:text-xs px-3 py-1.5 lg:px-4 lg:py-2 rounded transition">Sign In</a><a href="sign_up.html" class="bg-brand-red hover:bg-red-700 text-white font-black uppercase text-[9px] sm:text-xs px-3 py-1.5 lg:px-4 lg:py-2 rounded transition shadow-lg">Sign Up</a>`;
        const loggedOutMobile = `<div class="flex items-center gap-2"><a href="sign_in.html" class="bg-brand-bg border border-brand-border text-gray-300 font-black uppercase text-[10px] px-3 py-1.5 rounded">Sign In</a><a href="sign_up.html" class="bg-brand-red text-white font-black uppercase text-[10px] px-3 py-1.5 rounded">Sign Up</a></div>`;
        if (userNav) userNav.innerHTML = loggedOutDesktop;
        if (userNavMobile) userNavMobile.innerHTML = loggedOutMobile;
    }
}

// --- GLOBAL CHAT DRAWER ---
window.toggleDrawer = function(show) {
    const drawer = document.getElementById('chatDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer || !overlay) return;
    if (show) {
        overlay.classList.remove('hidden');
        setTimeout(() => { overlay.classList.remove('opacity-0'); drawer.classList.remove('translate-x-full'); }, 10);
        const msgBox = document.getElementById('drawerMessages');
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
    } else {
        overlay.classList.add('opacity-0');
        drawer.classList.add('translate-x-full');
        setTimeout(() => { overlay.classList.add('hidden'); }, 300);
    }
};

window.switchGlobalChannel = function(channel) {
    window.currentChatChannel = channel;
    const titleEl = document.getElementById('drawerChannelName');
    if (titleEl) titleEl.innerText = `Channel: ${channelNames[channel] || channel}`;
    if (typeof window.loadChatWidget === 'function') window.loadChatWidget();
};

window.sendGlobalDrawerMessage = async function() {
    if (!window.currentUser) { alert("Sign in required to transmit messages."); return; }
    const input = document.getElementById('drawerInput');
    if (!input || !input.value.trim()) return;
    
    const name = window.currentProfile?.sl_legacy_name || window.currentUser.email.split('@')[0];
    const { error } = await window.db.from('gsr_chats').insert([{ user_id: window.currentUser.id, display_name: name, message: input.value.trim(), channel: window.currentChatChannel }]);
    
    if (error) alert("Transmission failed: " + error.message);
    else {
        input.value = '';
        if (typeof window.loadChatWidget === 'function') window.loadChatWidget();
    }
};

// --- GLOBAL CMS ENGINE ---
window.toggleEditMode = function() {
    window.isEditModeActive = !window.isEditModeActive;
    document.querySelectorAll('#editModeBtn, #editModeBtnMobile, button[onclick="toggleEditMode()"]').forEach(btn => {
        btn.innerHTML = window.isEditModeActive ? '❌ Disable Edit Mode' : '✏️ Edit Mode';
        btn.classList.toggle('bg-brand-blue', !window.isEditModeActive);
        btn.classList.toggle('bg-brand-red', window.isEditModeActive);
    });

    document.querySelectorAll('[data-cms-id]').forEach(block => {
        if (window.isEditModeActive) {
            block.classList.add('ring-2', 'ring-brand-blue', 'ring-offset-4', 'ring-offset-brand-bg', 'relative');
            if (!block.querySelector('.cms-trigger-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'cms-trigger-btn absolute top-2 right-2 bg-brand-blue text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg z-30 cursor-pointer';
                editBtn.innerHTML = '✏️ Edit Block';
                editBtn.onclick = (e) => window.openCMSModal(block.getAttribute('data-cms-id'), e);
                block.appendChild(editBtn);
            }
        } else {
            block.classList.remove('ring-2', 'ring-brand-blue', 'ring-offset-4', 'ring-offset-brand-bg', 'relative');
            const btn = block.querySelector('.cms-trigger-btn');
            if (btn) btn.remove();
        }
    });
};

window.openCMSModal = async function(cmsId, event) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    window.currentEditId = cmsId;
    const container = document.querySelector(`[data-cms-id="${cmsId}"]`);
    if(!container) return;

    let fields = Array.from(container.querySelectorAll('[data-cms-field]'));
    if (cmsId === 'index:magazine' || cmsId === 'index:sponsors') fields = fields.filter(f => f.getAttribute('data-cms-field') !== 'image_url');

    const formContainer = document.getElementById('cmsModalFields');
    formContainer.innerHTML = '';
    
    fields.forEach(f => {
        const fieldName = f.getAttribute('data-cms-field');
        formContainer.innerHTML += `<div class="space-y-1"><label class="text-[10px] font-black uppercase text-gray-400">${fieldName.replace('_', ' ')}</label><textarea id="cms_input_${fieldName}" rows="2" class="w-full bg-[#0a0a0a] border border-brand-border text-white text-xs px-3 py-2 rounded">${escapeHtml(f.innerText)}</textarea></div>`;
    });

    if (cmsId === 'index:sponsors') {
        let existingLogos = {};
        try { const { data } = await window.db.from('site_content').select('content_value').eq('section_id', 'index:sponsors').maybeSingle(); if (data) existingLogos = JSON.parse(data.content_value); } catch(e) {}
        formContainer.innerHTML += `<div class="space-y-3 pt-3 border-t border-brand-border"><label class="text-[10px] font-black uppercase text-brand-gold tracking-wider block">Sponsor Logos</label>`;
        for(let i=1; i<=3; i++) {
            formContainer.innerHTML += `<div class="space-y-1"><span class="text-[9px] font-bold text-gray-400 uppercase">Logo ${i}</span><input type="file" id="cms_sponsor_file_${i}" accept="image/*" class="w-full bg-[#0a0a0a] border border-brand-border text-white text-xs p-1.5 rounded"><input type="hidden" id="cms_sponsor_url_${i}" value="${existingLogos['logo_'+i] || ''}">${existingLogos['logo_'+i] ? `<label class="flex items-center gap-2 text-[10px] text-brand-red mt-1"><input type="checkbox" id="cms_clear_sponsor_${i}"> Remove Logo ${i}</label>` : ''}</div>`;
        }
        formContainer.innerHTML += `</div>`;
    } else if (cmsId !== 'index:magazine') {
        const currentImgSrc = container.querySelector('[data-cms-field="image_url"]')?.src || '';
        const hasImage = currentImgSrc && !currentImgSrc.includes(location.host);
        formContainer.innerHTML += `<div class="space-y-2 mt-2 pt-2 border-t border-brand-border"><label class="text-[10px] font-black uppercase text-gray-400">Upload Media</label><input type="file" id="cms_input_file" accept="image/*,video/*" class="w-full bg-[#0a0a0a] border border-brand-border text-white text-xs p-2 rounded"><input type="hidden" id="cms_input_image_url" value="${escapeHtml(hasImage ? currentImgSrc : '')}">${hasImage ? `<label class="flex items-center gap-2 mt-2 text-xs text-brand-red"><input type="checkbox" id="cms_clear_image"> Remove existing media</label>` : ''}</div>`;
    }

    if (container.tagName === 'A' || container.getAttribute('href')) {
        formContainer.innerHTML += `<div class="space-y-1 mt-2 pt-2 border-t border-brand-border"><label class="text-[10px] font-black uppercase text-gray-400">Link URL</label><input type="text" id="cms_input_link_url" value="${escapeHtml(container.getAttribute('href') || '')}" class="w-full bg-[#0a0a0a] border border-brand-border text-brand-blue text-xs px-3 py-2 rounded"></div>`;
    }

    document.getElementById('cmsModalOverlay').classList.remove('hidden');
    setTimeout(() => { document.getElementById('cmsModalOverlay').classList.remove('opacity-0'); document.getElementById('cmsModal').classList.remove('scale-95', 'opacity-0'); }, 10);
};

window.closeCMSModal = function() {
    document.getElementById('cmsModalOverlay').classList.add('opacity-0');
    document.getElementById('cmsModal').classList.add('scale-95', 'opacity-0');
    setTimeout(() => { document.getElementById('cmsModalOverlay').classList.add('hidden'); }, 300);
};

window.saveCMSModal = async function() {
    const container = document.querySelector(`[data-cms-id="${window.currentEditId}"]`);
    let fields = Array.from(container.querySelectorAll('[data-cms-field]'));
    if (window.currentEditId === 'index:magazine' || window.currentEditId === 'index:sponsors') fields = fields.filter(f => f.getAttribute('data-cms-field') !== 'image_url');

    let updateData = {};
    if (window.currentEditId === 'index:sponsors') {
        for (let i = 1; i <= 3; i++) {
            const clearBox = document.getElementById(`cms_clear_sponsor_${i}`);
            const fileInput = document.getElementById(`cms_sponsor_file_${i}`);
            let logoUrl = document.getElementById(`cms_sponsor_url_${i}`)?.value || '';
            if (clearBox && clearBox.checked) logoUrl = '';
            else if (fileInput && fileInput.files.length > 0) {
                const f = fileInput.files[0];
                const fName = `sponsor_${i}_${Date.now()}_${f.name.replace(/\s+/g, '_')}`;
                if (!(await window.db.storage.from('admin-assets').upload(fName, f)).error) {
                    logoUrl = window.db.storage.from('admin-assets').getPublicUrl(fName).data.publicUrl;
                }
            }
            if (logoUrl) updateData[`logo_${i}`] = logoUrl;
        }
    } else if (window.currentEditId !== 'index:magazine') {
        const clearImg = document.getElementById('cms_clear_image');
        const fileInput = document.getElementById('cms_input_file');
        let oldUrl = document.getElementById('cms_input_image_url')?.value || '';

        if (clearImg && clearImg.checked) {
            updateData['image_url'] = '';
            if (oldUrl) await window.db.storage.from('admin-assets').remove([oldUrl.split('/').pop()]);
            const imgTag = container.querySelector('[data-cms-field="image_url"]');
            if (imgTag) { imgTag.src = ''; imgTag.classList.add('hidden'); if(imgTag.nextElementSibling) imgTag.nextElementSibling.classList.remove('hidden'); }
        } else if (fileInput && fileInput.files.length > 0) {
            const f = fileInput.files[0];
            const fName = `${Date.now()}_${f.name.replace(/\s+/g, '_')}`;
            if (!(await window.db.storage.from('admin-assets').upload(fName, f)).error) {
                if (oldUrl) await window.db.storage.from('admin-assets').remove([oldUrl.split('/').pop()]);
                const pubUrl = window.db.storage.from('admin-assets').getPublicUrl(fName).data.publicUrl;
                updateData['image_url'] = pubUrl;
                const imgTag = container.querySelector('[data-cms-field="image_url"]');
                if (imgTag) { imgTag.src = pubUrl; imgTag.classList.remove('hidden'); if(imgTag.nextElementSibling) imgTag.nextElementSibling.classList.add('hidden'); }
            }
        } else if (oldUrl) updateData['image_url'] = oldUrl;
    }

    fields.forEach(f => {
        const fName = f.getAttribute('data-cms-field');
        if (fName !== 'image_url') {
            const inputEl = document.getElementById(`cms_input_${fName}`);
            if (inputEl) { updateData[fName] = inputEl.value; f.innerText = inputEl.value; }
        }
    });
    
    const linkInput = document.getElementById('cms_input_link_url');
    if (linkInput) { updateData['link_url'] = linkInput.value; container.setAttribute('href', linkInput.value); }
    
    await window.db.from('site_content').upsert([{ section_id: window.currentEditId, content_value: JSON.stringify(updateData) }]);
    if(typeof window.loadCMSContent === 'function') await window.loadCMSContent();
    window.closeCMSModal();
};

// --- GLOBAL HTML INJECTOR ---
// This eliminates the need for 50 lines of repeated HTML on every single page
function injectGlobalModals() {
    if (!document.getElementById('drawerOverlay')) {
        const drawerHtml = `
            <div id="drawerOverlay" onclick="toggleDrawer(false)" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden opacity-0 transition-opacity duration-300"></div>
            <div id="chatDrawer" class="fixed top-0 right-0 w-full sm:w-[400px] h-full bg-brand-card border-l border-brand-border shadow-2xl z-50 transform translate-x-full transition-transform duration-300 flex flex-col">
                <div class="bg-brand-bg border-b border-brand-border p-4 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 class="text-sm font-black uppercase text-white tracking-wide">Live Transmissions</h2>
                        <p id="drawerChannelName" class="text-[10px] text-brand-gold uppercase">Channel: 🌐 Global</p>
                    </div>
                    <button onclick="toggleDrawer(false)" class="text-gray-500 hover:text-brand-red p-2 transition cursor-pointer">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div id="drawerMessages" class="flex-grow p-4 overflow-y-auto space-y-3 bg-[#111]">
                    <div class="text-[10px] text-gray-500 text-center mt-12 uppercase font-bold tracking-widest">[ Fetching logs... ]</div>
                </div>
                <div class="bg-brand-bg border-t border-brand-border p-4 flex gap-2 flex-shrink-0">
                    <input type="text" id="drawerInput" placeholder="Type message..." onkeypress="if(event.key==='Enter') sendGlobalDrawerMessage()" class="flex-grow bg-[#0a0a0a] border border-brand-border text-white text-xs px-3 py-2.5 rounded outline-none focus:border-brand-gold transition">
                    <button onclick="sendGlobalDrawerMessage()" class="bg-brand-gold hover:bg-yellow-600 text-black font-black uppercase text-[10px] px-4 py-2.5 rounded transition shadow shrink-0 cursor-pointer">Send</button>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', drawerHtml);
    }

    if (!document.getElementById('cmsModalOverlay')) {
        const cmsHtml = `
            <div id="cmsModalOverlay" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] hidden opacity-0 transition-opacity duration-300 flex items-center justify-center p-4">
                <div id="cmsModal" class="bg-brand-card border border-brand-gold shadow-[0_0_30px_rgba(197,160,89,0.15)] rounded-xl w-full max-w-md transform scale-95 opacity-0 transition-all duration-300 flex flex-col max-h-[90vh]">
                    <div class="bg-brand-bg border-b border-brand-border p-4 flex justify-between items-center rounded-t-xl shrink-0">
                        <h2 class="text-sm font-black uppercase text-brand-gold tracking-wide flex items-center gap-2"><span>✏️ Edit Content</span></h2>
                        <button onclick="closeCMSModal()" class="text-gray-500 hover:text-brand-red p-1 transition cursor-pointer"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </div>
                    <div id="cmsModalFields" class="p-6 space-y-4 overflow-y-auto grow"></div>
                    <div class="bg-brand-bg border-t border-brand-border p-4 flex justify-end gap-3 rounded-b-xl shrink-0">
                        <button onclick="closeCMSModal()" class="text-xs font-bold uppercase text-gray-400 hover:text-white px-4 py-2 transition cursor-pointer">Cancel</button>
                        <button onclick="saveCMSModal()" class="bg-brand-gold hover:bg-yellow-600 text-black font-black uppercase text-xs px-6 py-2 rounded transition shadow cursor-pointer">Save to Live</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', cmsHtml);
    }
}
