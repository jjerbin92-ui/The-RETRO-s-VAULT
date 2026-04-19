// ============================================================
// JSONBIN.IO CONFIGURATION (Cloud Sync)
// ============================================================
const MASTER_KEY = "$2a$10$e6BNHkLwsUDMBX84u5s1BOoqC4u0./AemztoL8E1.RZKWuN3UVnd6";
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";
const LOCAL_PINS_KEY = "retrosVaultPins";       // localStorage key for pins
const LOCAL_BIN_KEY  = "retroVaultBinId";       // localStorage key for bin ID

// ✅ Hardcoded Bin ID — ALL devices always use this same bin
// ✅ Hardcoded Bin ID — ALL devices always use this same bin
const BIN_ID = "69c904256860e0745bffaf1c";

// ============================================================
// STATE
// ============================================================
let currentProducts = JSON.parse(localStorage.getItem(LOCAL_PINS_KEY)) || [];
let wishlist = JSON.parse(localStorage.getItem('retrosVaultWishlist')) || [];
let activeCategory = 'all';
let searchQuery = '';
const FALLBACK_IMG = "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&q=80";

// ============================================================
// DOM ELEMENTS
// ============================================================
const productGrid       = document.getElementById('productGrid');
const searchInput       = document.getElementById('searchInput');
const categoryBtns      = document.querySelectorAll('.category-btn');
const wishlistCount     = document.getElementById('wishlistCount');
const wishlistToggle    = document.getElementById('wishlistToggle');
const emptyState        = document.getElementById('emptyState');
const toast             = document.getElementById('toast');
const mobileMenuBtn     = document.getElementById('mobileMenuBtn');
const mobileCategories  = document.getElementById('mobileCategories');
const adminPanel        = document.getElementById('adminPanel');
const adminLoginBtn     = document.getElementById('adminLoginBtn');
const mobileAdminLoginBtn = document.getElementById('mobileAdminLoginBtn');
const backToStoreBtn    = document.getElementById('backToStoreBtn');
const form              = document.getElementById('addPinForm');
const titleInp          = document.getElementById('pTitle');
const descInp           = document.getElementById('pDesc');
const linkInp           = document.getElementById('pLink');
const catInp            = document.getElementById('pCategory');
const imgInp            = document.getElementById('pImage');
const submitBtn         = document.getElementById('submitBtn');
const adminProductList  = document.getElementById('adminProductList');
const syncStatus        = document.getElementById('syncStatus');

// ============================================================
// JSONBIN CLOUD SYNC
// ============================================================

async function cloudPush(pins) {
    if (!BIN_ID) return;
    updateSyncUI('syncing', 'Syncing...');
    try {
        const res = await fetch(`${JSONBIN_BASE}/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': MASTER_KEY
            },
            body: JSON.stringify(pins)
        });

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            if (res.status === 413) throw new Error('Database full (Reduce images)');
            throw new Error(errorBody.message || `Push failed (Status: ${res.status})`);
        }

        console.log('☁️ Cloud synced successfully');
        updateSyncUI('synced', 'Synced');
        return true;
    } catch (e) {
        console.error('Cloud push failed:', e.message);
        updateSyncUI('offline', 'Sync Error');
        return false;
    }
}

async function cloudPull() {
    if (!BIN_ID) return null;
    updateSyncUI('syncing', 'Syncing...');
    try {
        const res = await fetch(`${JSONBIN_BASE}/${BIN_ID}/latest?t=${Date.now()}`, {
            headers: { 'X-Master-Key': MASTER_KEY }
        });

        if (!res.ok) {
            if (res.status === 404) return []; // Bin exists but might be empty
            throw new Error(`Pull failed (${res.status})`);
        }

        const data = await res.json();
        updateSyncUI('synced', 'Synced');
        
        // Return record or empty array if record doesn't exist
        return data.record || []; 
    } catch (e) {
        console.warn('Cloud pull failed:', e.message);
        updateSyncUI('offline', 'Offline');
        return null;
    }
}

function updateSyncUI(state, text) {
    if (!syncStatus) return;
    syncStatus.className = `sync-status ${state}`;
    syncStatus.querySelector('span').textContent = text;
    
    const icon = syncStatus.querySelector('i');
    if (state === 'syncing') icon.className = 'fa-solid fa-arrows-rotate fa-spin';
    else if (state === 'synced') icon.className = 'fa-solid fa-cloud';
    else icon.className = 'fa-solid fa-cloud-slash';
}

// ============================================================
// INITIALIZE APP
// ============================================================
async function init() {
    updateWishlistCount();
    setupEventListeners();

    // 1. Show local pins IMMEDIATELY (no loading delay)
    filterAndRender();

    // 2. Fetch all pins from cloud immediately on load
    await loadPins();
}

async function loadPins() {
    // Optionally: show a small sync status in console or UI
    const cloudPins = await cloudPull();
    
    // If we got valid data from the cloud, it's the source of truth
    if (cloudPins && Array.isArray(cloudPins)) {
        currentProducts = cloudPins;
        localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(currentProducts));
        filterAndRender();
        console.log('☁️ Vault synced with cloud —', cloudPins.length, 'pins loaded');
    } else {
        console.log('⚠️ Could not sync with cloud. Using local data.');
    }
}

// ============================================================
// FILTER & RENDER
// ============================================================
function filterAndRender() {
    let filtered = currentProducts;

    if (activeCategory === 'wishlist') {
        filtered = currentProducts.filter(p => wishlist.includes(p.id));
    } else if (activeCategory !== 'all') {
        filtered = currentProducts.filter(p => p.category === activeCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(searchQuery) ||
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }

    renderGrid(filtered);
}

// ============================================================
// RENDER GRID
// ============================================================
function renderGrid(products) {
    productGrid.innerHTML = '';

    if (products.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    const fragment = document.createDocumentFragment();

    products.forEach(product => {
        const isSaved = wishlist.includes(product.id);
        const card = document.createElement('div');
        card.className = 'pin-card';
        card.innerHTML = `
            <div class="pin-img-wrapper">
                <img src="${product.image}" loading="lazy" alt="${product.title}" onerror="this.src='https://via.placeholder.com/500x700?text=No+Image';">
                <div class="pin-overlay">
                    <button class="save-btn ${isSaved ? 'saved' : ''}" data-id="${product.id}">
                        ${isSaved ? 'Saved' : 'Save'}
                    </button>
                    <div class="btn-bottom-container">
                        <a href="${product.link}" target="_blank" class="buy-btn">
                            <i class="fa-solid fa-arrow-up-right-from-square external-icon"></i> View
                        </a>
                    </div>
                </div>
            </div>
            <div class="pin-info">
                <h3 class="pin-title">${product.title}</h3>
                <p class="pin-desc">${product.description}</p>
                <div class="pin-author">
                    <div class="author-img"></div>
                    <span>${product.author || 'RetroVault'}</span>
                </div>
            </div>
        `;

        const saveBtn = card.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWishlist(product.id, saveBtn);
        });

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.save-btn') && !e.target.closest('.buy-btn')) {
                window.open(product.link, '_blank');
            }
        });

        fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        filterAndRender();
    });

    // Category Buttons
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            const targetCat = e.target.dataset.category;
            categoryBtns.forEach(b => {
                if (b.dataset.category === targetCat) b.classList.add('active');
            });
            activeCategory = targetCat;
            filterAndRender();
        });
    });

    // Wishlist Toggle
    wishlistToggle.addEventListener('click', () => {
        activeCategory = 'wishlist';
        categoryBtns.forEach(b => b.classList.remove('active'));
        searchInput.value = '';
        searchQuery = '';
        filterAndRender();
    });

    // Mobile Menu
    mobileMenuBtn.addEventListener('click', () => {
        mobileCategories.classList.toggle('show');
    });

    // Admin Login
    const handleAdminLogin = () => {
        const passcode = prompt("Enter Admin Passcode:");
        if (passcode === "RETRO2026") {
            document.querySelector('.search-bar').style.visibility = 'hidden';
            productGrid.classList.add('hidden');
            emptyState.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            mobileCategories.classList.remove('show');
            loadAdminPins();
        } else if (passcode !== null) {
            alert("Unauthorized Access!");
        }
    };

    adminLoginBtn.addEventListener('click', handleAdminLogin);
    mobileAdminLoginBtn.addEventListener('click', handleAdminLogin);

    // Back to Store
    backToStoreBtn.addEventListener('click', () => {
        document.querySelector('.search-bar').style.visibility = 'visible';
        productGrid.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        filterAndRender();
    });

    // Submit New Pin
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Syncing...';
        submitBtn.disabled = true;

        try {
            const file = imgInp.files[0];
            let base64Img = FALLBACK_IMG;
            if (file) base64Img = await compressImage(file);

            const newPin = {
                id: 'p' + Date.now(),
                title: titleInp.value.trim(),
                description: descInp.value.trim(),
                link: linkInp.value.trim(),
                category: catInp.value,
                image: base64Img,
                author: "Store Admin",
                createdAt: Date.now()
            };

            // 1. Pull latest to avoid overwritting concurrent changes
            const latestPins = await cloudPull();
            
            if (latestPins === null) {
                // Critical error: cannot reach cloud
                showToast("⚠️ API Error: Could not reach cloud database.");
                submitBtn.textContent = 'Pin Product';
                submitBtn.disabled = false;
                return;
            }

            // 2. Merge local new pin with cloud pins
            const updatedPins = [newPin, ...latestPins];

            // 3. Push to cloud
            const success = await cloudPush(updatedPins);

            if (success) {
                currentProducts = updatedPins;
                localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(currentProducts));
                showToast("✅ Successfully pinned and visible to all!");
                form.reset();
                loadAdminPins();
                filterAndRender();
            } else {
                showToast("❌ Sync failed. Database might be full.");
            }

            submitBtn.textContent = 'Pin Product';
            submitBtn.disabled = false;

        } catch (error) {
            console.error("Error saving pin:", error);
            showToast("❌ Error: " + error.message);
            submitBtn.textContent = 'Pin Product';
            submitBtn.disabled = false;
        }
    });
}

// ============================================================
// WISHLIST
// ============================================================
function toggleWishlist(id, btnElement) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(itemId => itemId !== id);
        btnElement.classList.remove('saved');
        btnElement.textContent = 'Save';
    } else {
        wishlist.push(id);
        btnElement.classList.add('saved');
        btnElement.textContent = 'Saved';
        showToast('Saved to your Vault!');
    }
    localStorage.setItem('retrosVaultWishlist', JSON.stringify(wishlist));
    updateWishlistCount();
    if (activeCategory === 'wishlist') filterAndRender();
}

function updateWishlistCount() {
    wishlistCount.textContent = wishlist.length;
}

// ============================================================
// TOAST
// ============================================================
let toastTimeout;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================================
// ADMIN: LOAD PINS INTO ADMIN LIST
// ============================================================
function loadAdminPins() {
    adminProductList.innerHTML = '';
    if (currentProducts.length === 0) {
        adminProductList.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem 0;">No pins yet. Add your first item above!</p>';
        return;
    }
    currentProducts.forEach(p => {
        const item = document.createElement('div');
        item.setAttribute('style', 'display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #eaeaea; border-radius: 8px; background: #fafafa;');
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap: 1rem;">
                <img src="${p.image}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://via.placeholder.com/48'"/>
                <div style="font-weight: 500; font-size: 0.95rem;">
                    ${p.title}<br>
                    <small style="color:var(--text-secondary); font-size: 0.8rem;">${p.category.toUpperCase()}</small>
                </div>
            </div>
            <button class="delete-btn" style="background:#cc0000; color:white; border:none; padding: 0.4rem 0.8rem; border-radius:6px; font-weight: 600; cursor:pointer;">
                Delete
            </button>
        `;
        item.querySelector('.delete-btn').addEventListener('click', () => deleteAdminPin(p.id));
        adminProductList.appendChild(item);
    });
}

// ============================================================
// ADMIN: DELETE PIN
// ============================================================
async function deleteAdminPin(id) {
    if (!confirm("Are you sure you want to permanently delete this pin?")) return;
    
    // ☁️ SYNC FLOW: Pull latest -> Filter -> Push
    const latestPins = await cloudPull();
    
    if (latestPins === null) {
        showToast("⚠️ Sync Error: Could not delete from cloud. Try again later.");
        return;
    }

    if (Array.isArray(latestPins)) {
        currentProducts = latestPins.filter(p => p.id !== id);
    } else {
        currentProducts = currentProducts.filter(p => p.id !== id);
    }

    localStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(currentProducts));
    
    await cloudPush(currentProducts);
    
    showToast("Pin deleted and synced!");
    loadAdminPins();
    filterAndRender(); // Refresh the main store grid instantly
}

// ============================================================
// IMAGE COMPRESSION
// ============================================================
function compressImage(file, maxSize = 600) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Aggressive downsizing
                if (width > height && width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                // 0.5 quality for better space saving in JSON bin
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.onerror = () => reject(new Error('Failed to load image'));
        };
        reader.onerror = error => reject(error);
    });
}

// ============================================================
// RUN APP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    init();

    // 🔄 Periodic Background Sync (every 60 seconds)
    // Keeps products updated if other devices add new content
    setInterval(() => {
        loadPins();
    }, 60000);
});
