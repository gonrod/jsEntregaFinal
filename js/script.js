let products = [];
let originalOrder = [];
let currentSort = { key: null, direction: 1 };
let chart = null; // Instance of Chart.js for debt chart
let evoChart = null; // Instance of Chart.js for monthly evolution chart

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Function to open the modal
function openModal() {
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('productModal').style.display = 'block';
}

// Function to close the modal
function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('productModal').style.display = 'none';
    clearForm();
}

// Fetch category data from JSON
async function fetchCategoryData() {
    try {
        const response = await fetch('./categories.json');
        const data = await response.json();
        categoryIcons = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.icon]));
        categoryColors = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.color]));
        loadCategoryOptions(); // Load categories into the modal dropdown once data is fetched
    } catch (error) {
        console.error("Failed to fetch categories data", error);
    }
}

// Function to load category options into the dropdown
function loadCategoryOptions() {
    const categorySelect = document.getElementById('productCategory');
    categorySelect.innerHTML = '<option value="">Seleccione una categoría</option>';
    Object.keys(categoryIcons).forEach(category => {
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

// Function to initialize the app and load category data
function initializeApp() {
    fetchCategoryData(); // Load category data on app start
    loadProductsFromStorage();
    displayProducts();
    calculateTotalPayments();
    calculateCategorySummary();
    calculateMonthlyEvolution();
}

function addProduct() {
    const productName = document.getElementById('productName').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productInstallments = parseInt(document.querySelector('input[name="productInstallments"]:checked').value);
    const productCategory = document.getElementById('productCategory').value;
    const currentDate = new Date();

    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + productInstallments - 1);

    if (!productName || isNaN(productPrice) || isNaN(productInstallments) || !productCategory) {
        alert('Por favor, completa todos los campos correctamente.');
        return;
    }

    const product = {
        name: productName,
        price: productPrice,
        installments: productInstallments,
        category: productCategory,
        startDate: currentDate.toISOString(),
        endDate: endDate.toISOString()
    };

    products.push(product);
    originalOrder.push(product);
    closeModal();
    displayProducts();
    saveProductsToStorage();
    calculateTotalPayments();
    calculateCategorySummary();
    calculateMonthlyEvolution();
    updateSortButtons();
}

function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    products.forEach((product, index) => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <span>${product.name}</span>
            <span>$${product.price.toFixed(2)}</span>
            <span>${product.installments} cuotas</span>
            <span>${product.category}</span>
            <button onclick="removeProduct(${index})">Remove</button>
        `;
        productList.appendChild(productItem);
    });
    updateSortButtons();
}

function calculateTotalPayments() {
    let totalPayments = 0;
    products.forEach(product => {
        totalPayments += product.price;
    });
    const paymentsDisplay = document.getElementById('totalPayments');
    paymentsDisplay.textContent = `Total Payments: $${totalPayments.toFixed(2)}`;
}

function calculateCategorySummary() {
    const summary = {};
    products.forEach(product => {
        if (!summary[product.category]) summary[product.category] = 0;
        summary[product.category] += product.price;
    });

    const summaryDisplay = document.getElementById('debtSummary');
    summaryDisplay.innerHTML = '';
    Object.keys(summary).forEach(category => {
        const categoryEl = document.createElement('div');
        categoryEl.innerHTML = `${category}: $${summary[category].toFixed(2)}`;
        summaryDisplay.appendChild(categoryEl);
    });
}

function calculateMonthlyEvolution() {
    // Implement calculation and display logic for monthly payment evolution
}

function saveProductsToStorage() {
    localStorage.setItem('products', JSON.stringify(products));
}

function loadProductsFromStorage() {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        originalOrder = [...products];
        displayProducts();
    }
}

function removeProduct(index) {
    products.splice(index, 1);
    originalOrder.splice(index, 1); // Maintain original order for sorting purposes
    displayProducts();
    saveProductsToStorage();
    calculateTotalPayments();
    calculateCategorySummary();
    calculateMonthlyEvolution();
}

function updateSortButtons() {
    document.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', function() {
            sortProducts(this.dataset.sortkey);
        });
    });
}

function sortProducts(key) {
    if (currentSort.key === key) {
        currentSort.direction *= -1; // Toggle direction
    } else {
        currentSort.key = key;
        currentSort.direction = 1; // Default to ascending
    }

    products.sort((a, b) => {
        let valueA = a[key];
        let valueB = b[key];
        if (valueA < valueB) return -1 * currentSort.direction;
        if (valueA > valueB) return 1 * currentSort.direction;
        return 0;
    });

    displayProducts(); // Re-display products after sorting
}
