// Constants for category icons and colors
const categoryIcons = {
    'Cuentas Fijas': '💡', 'Comida': '🍔', 'Entretenimiento': '🎉', 'Electrodomésticos': '🔌', 
    'Ferretería': '🛠️', 'Farmacia': '💊', 'Indulgencias': '🍰'
};

const categoryColors = {
    'Cuentas Fijas': '#FF6384', 'Comida': '#36A2EB', 'Entretenimiento': '#FFCE56', 
    'Electrodomésticos': '#4BC0C0', 'Ferretería': '#9966FF', 'Farmacia': '#FF9F40', 
    'Indulgencias': '#8BC34A'
};

// Global array to store products
let products = [];

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();  // Ensure app initialization after the DOM is fully loaded.
});

function openModal() {
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('productModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('productModal').style.display = 'none';
}

function addProduct(event) {
    event.preventDefault();
    const productName = document.getElementById('productName').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productInstallments = parseInt(document.querySelector('input[name="productInstallments"]:checked').value);
    const productCategory = document.getElementById('productCategory').value;
    const currentDate = new Date();
    const endDate = new Date(currentDate.setMonth(currentDate.getMonth() + productInstallments));

    if (!productName || isNaN(productPrice) || isNaN(productInstallments) || !productCategory) {
        alert('Please fill in all fields correctly.');
        return;
    }

    const product = {
        id: Date.now(),  // Unique ID for the product
        name: productName,
        price: productPrice,
        installments: productInstallments,
        category: productCategory,
        startDate: currentDate.toISOString(),
        endDate: endDate.toISOString()
    };

    products.push(product);
    clearForm();
    closeModal();
    displayProducts();
}

function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';
    products.forEach(product => {
        const startDate = new Date(product.startDate);
        const endDate = new Date(product.endDate);
        const productItem = document.createElement('div');
        productItem.className = 'table-row';
        productItem.innerHTML = `
            <div class="table-cell">${categoryIcons[product.category]} ${product.name}</div>
            <div class="table-cell">$${product.price.toFixed(2)}</div>
            <div class="table-cell">${product.installments}</div>
            <div class="table-cell">${product.category}</div>
            <div class="table-cell">${startDate.toLocaleDateString()}</div>
            <div class="table-cell">${endDate.toLocaleDateString()}</div>
            <div class="table-cell"><button onclick="deleteProduct(${product.id})">Remove</button></div>
        `;
        productList.appendChild(productItem);
    });
}

function deleteProduct(productId) {
    products = products.filter(product => product.id !== productId);
    displayProducts();
}

function clearForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.querySelectorAll('input[name="productInstallments"]').forEach(input => input.checked = false);
    document.getElementById('productCategory').value = '';
}

function initializeApp() {
    document.getElementById('productForm').addEventListener('submit', addProduct);
}
