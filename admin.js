// Security Check for Admin Access
const passcode = prompt("Enter Admin Passcode (Hint: RETRO2026):");
if (passcode !== "RETRO2026") {
    alert("Unauthorized Access!");
    window.location.href = "index.html";
}

// DOM Elements
const form = document.getElementById('addPinForm');
const titleInp = document.getElementById('pTitle');
const descInp = document.getElementById('pDesc');
const linkInp = document.getElementById('pLink');
const catInp = document.getElementById('pCategory');
const imgInp = document.getElementById('pImage');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');

// Global arrays
let MOCK_PRODUCTS = [];

// Fallback image in case the base64 conversion fails
const FALLBACK_IMG = "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&q=80";

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.textContent = 'Pinning...';
    submitBtn.disabled = true;

    try {
        // Read file
        const file = imgInp.files[0];
        let base64Img = FALLBACK_IMG; // Default if nothing provided

        if (file) {
            // Convert file to Base64 to save locally, since we lack a backend
            base64Img = await convertFileToBase64(file);
        }

        const newPin = {
            id: 'p' + Date.now(),
            title: titleInp.value.trim(),
            description: descInp.value.trim(),
            link: linkInp.value.trim(),
            category: catInp.value,
            image: base64Img,
            author: "Store Admin"
        };

        // Retrieve existing products
        const storedProductsData = localStorage.getItem('retrosVaultProducts');
        let products = storedProductsData ? JSON.parse(storedProductsData) : [];

        // Add to the front of the array Let new pins show up first
        products.unshift(newPin);

        // Try saving it (localStorage limit is ~5MB)
        try {
            localStorage.setItem('retrosVaultProducts', JSON.stringify(products));
        } catch (storageError) {
            console.error("Local Storage is Full! The image was too large.", storageError);
            alert("Error: Image is too large to save in local storage. Try a smaller file, or link a URL instead.");
            submitBtn.textContent = 'Pin Product';
            submitBtn.disabled = false;
            return;
        }

        // Show Success
        showToast("Successfully added to Vault!");
        form.reset();
        submitBtn.textContent = 'Pin Product';
        submitBtn.disabled = false;
        
        loadAdminPins();

    } catch (error) {
        console.error("Error creating pin:", error);
        alert("Failed to create pin. Try again!");
        submitBtn.textContent = 'Pin Product';
        submitBtn.disabled = false;
    }
});

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Toast logic
let toastTimeout;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- Management Logic ---
const adminProductList = document.getElementById('adminProductList');

function loadAdminPins() {
    const storedProductsData = localStorage.getItem('retrosVaultProducts');
    let products = storedProductsData ? JSON.parse(storedProductsData) : [];
    
    // Purge mock items similarly to app.js to ensure the admin sees real clean data
    const mockIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    products = products.filter(p => !mockIds.includes(p.id));

    adminProductList.innerHTML = '';

    if (products.length === 0) {
        adminProductList.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 2rem 0;">No pins yet. Add your first item above!</p>';
        return;
    }

    products.forEach(p => {
        // Create an item row
        const item = document.createElement('div');
        item.style = 'display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #eaeaea; border-radius: 8px; background: #fafafa;';
        
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap: 1rem;">
                <img src="${p.image}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://via.placeholder.com/48'"/>
                <div style="font-weight: 500; font-size: 0.95rem;">
                    ${p.title} <br>
                    <small style="color:var(--text-secondary); font-size: 0.8rem;">${p.category.toUpperCase()}</small>
                </div>
            </div>
            <button class="delete-btn" style="background:#cc0000; color:white; border:none; padding: 0.4rem 0.8rem; border-radius:6px; font-weight: 600; cursor:pointer;" data-id="${p.id}">
                Delete
            </button>
        `;

        item.querySelector('.delete-btn').addEventListener('click', () => {
             deletePin(p.id);
        });

        adminProductList.appendChild(item);
    });
}

function deletePin(id) {
    if (!confirm("Are you sure you want to permanently delete this pin from your Vault?")) return;
    
    const storedProductsData = localStorage.getItem('retrosVaultProducts');
    let products = storedProductsData ? JSON.parse(storedProductsData) : [];
    
    products = products.filter(p => p.id !== id);
    localStorage.setItem('retrosVaultProducts', JSON.stringify(products));
    
    showToast("Pin deleted!");
    loadAdminPins(); // Refresh list
}

// Initialize management view on load
loadAdminPins();
