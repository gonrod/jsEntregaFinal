let products = [];
let originalOrder = [];
let currentSort = { key: null, direction: 1 };
let chart = null; // Variable para almacenar la instancia de Chart.js
let evoChart = null; // Variable para la evolución del gráfico

let categoryIcons = {};
let categoryColors = {};

// Función para abrir el modal
function openModal() {
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('productModal').style.display = 'block';
}

// Función para cerrar el modal
function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('productModal').style.display = 'none';
    clearForm();
}

// Función para agregar un producto
function addProduct() {
    const productName = document.getElementById('productName').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productInstallments = parseInt(document.querySelector('input[name="productInstallments"]:checked').value);
    const productCategory = document.getElementById('productCategory').value;
    const currentDate = new Date(); // Capturar la fecha actual

    // Calcular la fecha de fin
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + productInstallments - 1); // -1 porque empieza el mismo mes

    // Verificar si los campos están completos y son válidos
    if (!productName || isNaN(productPrice) || isNaN(productInstallments) || !productCategory) {
        console.log('Error: Por favor, completa todos los campos correctamente.');
        alert('Por favor, completa todos los campos correctamente.');
        return;
    }

    // Crear un objeto de producto
    const product = {
        name: productName,
        price: productPrice,
        installments: productInstallments,
        category: productCategory,
        startDate: currentDate,
        endDate: endDate
    };

    // Agregar el producto a las listas
    products.push(product);
    originalOrder.push(product);
    console.log("Producto agregado:", product);
    displayProducts(); // Actualizar la lista de productos
    clearForm(); // Limpiar el formulario
    saveProductsToStorage(); // Guardar productos en localStorage
    closeModal(); // Cerrar el modal
    calculateTotalPayments(); // Calcular pagos totales
    calculateCategorySummary(); // Calcular resumen de deuda por categoría
    calculateMonthlyEvolution(); // Calcular evolución mensual
}

// Función para mostrar los productos
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = ''; // Limpiar la lista de productos

    // Iterar sobre los productos y agregarlos al HTML
    products.forEach((product, index) => {
        const startDate = product.startDate ? new Date(product.startDate) : new Date();
        const endDate = product.endDate ? new Date(product.endDate) : new Date(startDate);

        const productItem = document.createElement('div');
        productItem.className = 'table-row';
        productItem.innerHTML = `
            <div class="table-cell nam-cell">${categoryIcons[product.category]} ${product.name}</div>
            <div class="table-cell pri-cell">$${product.price.toFixed(2)}</div>
            <div class="table-cell ins-cell">${product.installments}</div>
            <div class="table-cell cat-cell">${product.category}</div>
            <div class="table-cell sDa-cell">${startDate.toLocaleDateString()}</div>
            <div class="table-cell eDa-cell">${endDate.toLocaleDateString()}</div>
            <div class="table-cell acc-cell"><button onclick="removeProduct(${index})">&times;</button></div>
        `;
        productList.appendChild(productItem);
    });

    console.log("Lista de productos actualizada:", products);
}

// Función para limpiar el formulario
function clearForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    const checkedRadio = document.querySelector('input[name="productInstallments"]:checked');
    if (checkedRadio) {
        checkedRadio.checked = false;
    }
}

// Función para eliminar un producto
function removeProduct(index) {
    console.log(`Producto eliminado:`, products[index]);
    products.splice(index, 1); // Eliminar el producto de la lista
    originalOrder.splice(index, 1); // Eliminar el producto del orden original
    displayProducts(); // Actualizar la lista de productos
    saveProductsToStorage(); // Guardar productos en localStorage
    calculateTotalPayments(); // Calcular pagos totales
    calculateCategorySummary(); // Calcular resumen de deuda por categoría
    calculateMonthlyEvolution(); // Calcular evolución mensual
}

// Función para calcular los pagos totales
function calculateTotalPayments() {
    const payments = [];
    const productCount = [];
    const productDetails = [];

    // Calcular los pagos mensuales
    products.forEach(product => {
        const monthlyPayment = product.price / product.installments;
        let paymentDate = new Date(product.startDate);

        for (let i = 0; i < product.installments; i++) {
            paymentDate.setMonth(paymentDate.getMonth() + 1);
            const paymentKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;

            if (!payments[paymentKey]) {
                payments[paymentKey] = 0;
                productCount[paymentKey] = 0;
                productDetails[paymentKey] = [];
            }

            payments[paymentKey] += monthlyPayment;
            productCount[paymentKey] += 1;
            productDetails[paymentKey].push({ name: product.name, payment: monthlyPayment.toFixed(2), category: product.category, installment: i + 1, totalInstallments: product.installments });
        }
    });

    // Mostrar los pagos mensuales
    const totalPayments = document.getElementById('totalPayments');
    totalPayments.innerHTML = '';
    for (let paymentKey in payments) {
        const [year, month] = paymentKey.split('-');
        const paymentItem = document.createElement('div');
        paymentItem.className = 'payment-item';
        paymentItem.innerHTML = `
            <div class="payment-item-header">
                <div class="donut-chart-container">
                    <canvas></canvas>
                </div>
                <div>
                    <strong>${getMonthName(month)} ${year}:</strong><br> $${payments[paymentKey].toFixed(2)} &nbsp;(${productCount[paymentKey]} productos)
                </div>
            </div>
            <div class="payment-details">
                <div class="details-text"></div>
            </div>
        `;

        const paymentDetails = paymentItem.querySelector('.details-text');

        // Dividir productos por categoría y calcular total por categoría
        const productsByCategory = groupBy(productDetails[paymentKey], 'category');
        for (let category in productsByCategory) {
            const categoryTotal = productsByCategory[category].reduce((total, detail) => total + parseFloat(detail.payment), 0).toFixed(2);
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'category-group';
            categoryGroup.innerHTML = `
                <div class="category-header">
                    <span class="category-icon" style="background-color: ${getCategoryColor(category)}">${categoryIcons[category]}</span>&nbsp;
                    <span>${category}</span>:&nbsp;$${categoryTotal}</strong>
                </div>
            `;
            productsByCategory[category].forEach(detail => {
                categoryGroup.innerHTML += `<p class="product-item"><strong>${detail.name}:</strong> $${detail.payment} (${detail.installment}/${detail.totalInstallments})</p>`;
            });
            paymentDetails.appendChild(categoryGroup);
        }

        totalPayments.appendChild(paymentItem);

        // Crear la gráfica de dona para cada mes
        const ctx = paymentItem.querySelector('canvas').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: productDetails[paymentKey].map(detail => detail.name),
                datasets: [{
                    data: productDetails[paymentKey].map(detail => parseFloat(detail.payment)),
                    backgroundColor: productDetails[paymentKey].map(detail => getCategoryColor(detail.category)),
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        console.log(`${getMonthName(month)} ${year}: $${payments[paymentKey].toFixed(2)} (${productCount[paymentKey]} productos)`);
    }
}

// Función para calcular el resumen de deuda por categoría
function calculateCategorySummary() {
    const categorySummary = {};
    let totalDebt = 0;

    // Inicializar todas las categorías en cero
    Object.keys(categoryIcons).forEach(category => {
        categorySummary[category] = 0;
    });

    // Calcular la deuda total y la deuda por categoría
    products.forEach(product => {
        categorySummary[product.category] += product.price;
        totalDebt += product.price;
    });

    // Mostrar el resumen de deuda por categoría en HTML
    const debtSummaryElement = document.getElementById('debtSummary');
    debtSummaryElement.innerHTML = '';
    for (let category in categorySummary) {
        const percentage = totalDebt ? (categorySummary[category] / totalDebt * 100).toFixed(2) : '0.00';
        const summaryItem = document.createElement('div');
        summaryItem.className = 'debt-summary-item';
        summaryItem.innerHTML = `
            <span class="category-color" style="background-color: ${getCategoryColor(category)}">
                <span class="category-icon">${categoryIcons[category]}</span>
            </span>
            <span class="category-percent">${percentage}% </span>
            <span class="category-name">${category}</span>
            <span class="category-Amount" style="background-color:${getCategoryColor(category)}"><span>$${categorySummary[category].toFixed(2)}</span></span>
            
        `;
        debtSummaryElement.appendChild(summaryItem);
    }

    // Actualizar la gráfica de dona
    updateDebtChart(categorySummary, totalDebt);

    console.log("Resumen de deuda por categoría:", categorySummary);
}

// Función para actualizar la gráfica de dona
function updateDebtChart(categorySummary, totalDebt) {
    const ctx = document.getElementById('debtChart').getContext('2d');
    const labels = Object.keys(categorySummary);
    const data = Object.values(categorySummary);
    const colors = labels.map(label => getCategoryColor(label));

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Deuda por Categoría',
                data: data,
                backgroundColor: colors,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Desactivar la leyenda
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return tooltipItem.label + ': $' + tooltipItem.raw.toFixed(2);
                        }
                    }
                }
            }
        }
    });

    // Actualizar el texto del centro
    const chartCenterText = document.getElementById('chartCenterText');
    chartCenterText.textContent = `$${totalDebt.toFixed(2)}`;
}

// Función para calcular la evolución mensual
function calculateMonthlyEvolution() {
    const monthlyData = {};
    const categories = Object.keys(categoryIcons);
    const currentDate = new Date();

    // Inicializar todas las categorías para cada mes en los próximos 12 meses
    for (let i = 0; i < 12; i++) {
        const paymentKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        monthlyData[paymentKey] = {};
        categories.forEach(category => {
            monthlyData[paymentKey][category] = 0;
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calcular los pagos mensuales para cada producto
    products.forEach(product => {
        const monthlyPayment = product.price / product.installments;
        let paymentDate = new Date(product.startDate);

        for (let i = 0; i < product.installments; i++) {
            const paymentKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
            if (!monthlyData[paymentKey]) {
                monthlyData[paymentKey] = {};
                categories.forEach(category => {
                    monthlyData[paymentKey][category] = 0;
                });
            }
            monthlyData[paymentKey][product.category] += monthlyPayment;
            paymentDate.setMonth(paymentDate.getMonth() + 1);
        }
    });

    const labels = Object.keys(monthlyData).sort();
    const datasets = categories.map(category => ({
        label: category,
        data: labels.map(label => monthlyData[label][category]),
        borderColor: getCategoryColor(category),
        backgroundColor: getCategoryColor(category),
        fill: false,
        tension: 0.1
    }));

    const canvas = document.getElementById('monthlyEvoChart');
    const ctx = canvas.getContext('2d');

    // Asegurarse de que no haya múltiples instancias del gráfico
    if (evoChart) {
        evoChart.destroy();
    }

    // Crear el gráfico de evolución mensual si hay datos disponibles
    if (labels.length > 0 && datasets.some(dataset => dataset.data.some(value => value > 0))) {
        evoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(label => {
                    const [year, month] = label.split('-');
                    return `${getMonthName(month)} ${year}`;
                }),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Mes'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Monto'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                return `${tooltipItem.dataset.label}: $${tooltipItem.raw.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

function getMonthName(month) {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return monthNames[parseInt(month)];
}

// Función para agrupar elementos por una clave
function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
        return result;
    }, {});
}

// Función para ordenar productos
function sortProducts(key) {
    // Verificar si la ordenación es por la misma clave
    if (currentSort.key === key) {
        // Cambiar la dirección de la ordenación
        if (currentSort.direction === 1) {
            currentSort.direction = -1; // Cambiar a descendente
        } else if (currentSort.direction === -1) {
            currentSort.key = null; // Desactivar orden
            currentSort.direction = 1;
            products = [...originalOrder]; // Restablecer el orden original
        }
    } else {
        currentSort.key = key;
        currentSort.direction = 1; // Orden ascendente por defecto
    }

    // Ordenar los productos
    if (currentSort.key) {
        products.sort((a, b) => {
            if (a[currentSort.key] < b[currentSort.key]) return -1 * currentSort.direction;
            if (a[currentSort.key] > b[currentSort.key]) return 1 * currentSort.direction;
            return 0;
        });
    }

    console.log(`Productos ordenados por ${key} (${currentSort.direction === 1 ? 'ascendente' : currentSort.direction === -1 ? 'descendente' : 'desactivado'})`);
    updateSortButtons(); // Actualizar los botones de ordenación
    displayProducts(); // Actualizar la lista de productos
}

// Función para actualizar los botones de ordenación
function updateSortButtons() {
    const buttons = document.querySelectorAll('.table-cell-header');
    buttons.forEach(button => {
        button.classList.remove('active', 'desc', 'asc');
    });

    if (currentSort.key) {
        const activeButton = document.querySelector(`.table-cell-header[onclick="sortProducts('${currentSort.key}')"]`);
        activeButton.classList.add('active');
        if (currentSort.direction === -1) {
            activeButton.classList.add('desc');
        } else {
            activeButton.classList.add('asc');
        }
    }
}

// Función para guardar los productos en localStorage
function saveProductsToStorage() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Función para cargar los productos de localStorage
function loadProductsFromStorage() {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        originalOrder = [...products];
    }
}

// Función para obtener el color de una categoría
function getCategoryColor(category) {
    return categoryColors[category];
}

// Llamadas de prueba
document.getElementById('productForm').addEventListener('submit', function(event) {
    event.preventDefault();
    addProduct();
});

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    fetch('https://github.com/gonrod/jsEntregaFinal/blob/main/categories.json')  // Ensure the path to categories.json is correct.
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            initializeCategories(data);
            loadProductsFromStorage();
            displayProducts();
            calculateTotalPayments();
            calculateCategorySummary();
            calculateMonthlyEvolution();
        })
        .catch(error => {
            console.error('Failed to fetch categories:', error);
            // Implement fallback logic here if necessary.
        });
}

function initializeCategories(data) {
    // Assuming categoryIcons and categoryColors are global variables
    categoryIcons = {};
    categoryColors = {};
    for (const category in data) {
        categoryIcons[category] = data[category].icon;
        categoryColors[category] = data[category].color;
    }
}


// Inicializar la aplicación
loadProductsFromStorage();
displayProducts();
calculateTotalPayments(); // Calcular pagos totales al cargar
calculateCategorySummary(); // Calcular resumen de deuda por categoría
calculateMonthlyEvolution(); // Calcular evolución mensual
