// Initialize empty array instead of mock data
const MOCK_PRODUCTS = [];

// STATE
let currentProducts = [];
let wishlist = JSON.parse(localStorage.getItem('retrosVaultWishlist')) || [];
let activeCategory = 'all';
let searchQuery = '';

// DOM ELEMENTS
const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const categoryBtns = document.querySelectorAll('.category-btn');
const wishlistCount = document.getElementById('wishlistCount');
const wishlistToggle = document.getElementById('wishlistToggle');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileCategories = document.getElementById('mobileCategories');

// INITIALIZE APP
function init() {
    loadProductsFromStorage();
    updateWishlistCount();
    setupEventListeners();
    filterAndRender();
}

// SIMULATE FETCHING DATA
function loadProductsFromStorage() {
    let storedProducts = JSON.parse(localStorage.getItem('retrosVaultProducts'));
    if (storedProducts && storedProducts.length > 0) {
        // Automatically purge the old hardcoded mock items if they are stuck in the browser
        const mockIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
        storedProducts = storedProducts.filter(p => !mockIds.includes(p.id));
        
        currentProducts = storedProducts;
        localStorage.setItem('retrosVaultProducts', JSON.stringify(currentProducts));
    } else {
        currentProducts = [];
    }
}

// EVENT LISTENERS
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        filterAndRender();
    });

    // Categories (Desktop and Mobile)
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active from all
            categoryBtns.forEach(b => b.classList.remove('active'));
            // Add active to matching dataset category (keeps mobile/desktop in sync)
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
}

// FILTER & RENDER
function filterAndRender() {
    let filtered = currentProducts;

    // 1. Filter by category or wishlist
    if (activeCategory === 'wishlist') {
        filtered = currentProducts.filter(p => wishlist.includes(p.id));
    } else if (activeCategory !== 'all') {
        filtered = currentProducts.filter(p => p.category === activeCategory);
    }

    // 2. Filter by search query
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchQuery) || 
            p.description.toLowerCase().includes(searchQuery) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }

    renderGrid(filtered);
}

// RENDER HTML TEMPLATE
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

        // Handle Save Button click
        const saveBtn = card.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent clicking other things
            toggleWishlist(product.id, saveBtn);
        });

        // Make entire card except buttons open external link
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.save-btn') && !e.target.closest('.buy-btn')) {
                window.open(product.link, '_blank');
            }
        });

        fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);
}

// WISHLIST LOGIC
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
    
    // Save to local storage
    localStorage.setItem('retrosVaultWishlist', JSON.stringify(wishlist));
    updateWishlistCount();

    // If currently viewing wishlist, refresh to hide removed items
    if (activeCategory === 'wishlist') {
        filterAndRender();
    }
}

function updateWishlistCount() {
    wishlistCount.textContent = wishlist.length;
}

// TOAST NOTIFICATION
let toastTimeout;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Run app
document.addEventListener('DOMContentLoaded', init);
