// Variables globales para almacenar los productos y el orden original de los mismos
let products = [];
let originalOrder = [];

// Configuración de ordenación actual
let currentSort = { key: null, direction: 1 };

// Variables para las instancias de gráficos
let chart = null;
let evoChart = null;

// Datos de categorías cargados desde JSON
let categoryData = {};

// Evento para cargar los datos de categorías al iniciar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  loadCategoryData();
});

// Cargar los datos de categorías desde un archivo JSON
function loadCategoryData() {
  fetch('categories.json')  // Asegurarse de que la ruta es relativa al lugar donde se aloja el proyecto
    .then(response => response.json())
    .then(data => {
      categoryData = data;
      initializeApplication(); // Inicializar la aplicación después de cargar los datos
    })
    .catch(error => {
      console.error('Error al cargar los datos de categorías:', error);
      initializeApplication(); // Continuar con la inicialización en caso de error
    });
}

// Inicializar la aplicación cargando productos y configurando visualizaciones iniciales
function initializeApplication() {
  loadProductsFromStorage();
  displayProducts();
  calculateTotalPayments();
  calculateCategorySummary();
  calculateMonthlyEvolution();
}

// Abrir el modal para agregar productos
function openModal() {
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('productModal').style.display = 'block';
}

// Cerrar el modal de agregar productos y limpiar el formulario
function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('productModal').style.display = 'none';
    clearForm();
}

// Agregar un nuevo producto a la lista tras validar la entrada
function addProduct() {
    const productName = document.getElementById('productName').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productInstallments = parseInt(document.querySelector('input[name="productInstallments"]:checked').value);
    const productCategory = document.getElementById('productCategory').value;
    const currentDate = new Date();

    // Ajustar la fecha de finalización basada en las cuotas
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
        startDate: currentDate,
        endDate: endDate
    };

    products.push(product);
    originalOrder.push(product);
    displayProducts();
    clearForm();
    saveProductsToStorage();
    closeModal();
    calculateTotalPayments();
    calculateCategorySummary();
    calculateMonthlyEvolution();
}

// Mostrar los productos en la interfaz de usuario
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    products.forEach((product, index) => {
        const startDate = product.startDate ? new Date(product.startDate) : new Date();
        const endDate = product.endDate ? new Date(product.endDate) : new Date(startDate);
        const categoryIcon = categoryData[product.category] ? categoryData[product.category].icon : '?';
        const productItem = document.createElement('div');
        productItem.className = 'table-row';
        productItem.innerHTML = `
            <div class="table-cell nam-cell">${categoryIcon} ${product.name}</div>
            <div class="table-cell pri-cell">$${product.price.toFixed(2)}</div>
            <div class="table-cell ins-cell">${product.installments}</div>
            <div class="table-cell cat-cell">${product.category}</div>
            <div class="table-cell sDa-cell">${startDate.toLocaleDateString()}</div>
            <div class="table-cell eDa-cell">${endDate.toLocaleDateString()}</div>
            <div class="table-cell acc-cell"><button onclick="removeProduct(${index})">&times;</button></div>
        `;
        productList.appendChild(productItem);
    });
}

// Limpiar el formulario después de agregar o cancelar un producto
function clearForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    const checkedRadio = document.querySelector('input[name="productInstallments"]:checked');
    if (checkedRadio) {
        checkedRadio.checked = false;
    }
}

// Eliminar un producto de la lista y actualizar el almacenamiento
function removeProduct(index) {
    products.splice(index, 1);
    originalOrder.splice(index, 1);
    displayProducts();
    saveProductsToStorage();
    calculateTotalPayments();
    calculateCategorySummary();
    calculateMonthlyEvolution();
}

// Calcular los pagos totales y mostrarlos mes a mes
function calculateTotalPayments() {
    const payments = {};
    const productCount = {};
    const productDetails = {};

    // Iterar sobre cada producto para desglosar los pagos por mes
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

    // Mostrar los pagos mensuales en la interfaz
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

        // Detalle de pagos por categoría para cada mes
        const paymentDetails = paymentItem.querySelector('.details-text');
        const productsByCategory = groupBy(productDetails[paymentKey], 'category');
        for (let category in productsByCategory) {
            const categoryTotal = productsByCategory[category].reduce((total, detail) => total + parseFloat(detail.payment), 0).toFixed(2);
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'category-group';
            categoryGroup.innerHTML = `
                <div class="category-header">
                    <span class="category-icon" style="background-color: ${getCategoryColor(category)}">${categoryData[category] ? categoryData[category].icon : '?'}</span>&nbsp;
                    <span>${category}</span>:&nbsp;$${categoryTotal}</strong>
                </div>
            `;
            productsByCategory[category].forEach(detail => {
                categoryGroup.innerHTML += `<p class="product-item"><strong>${detail.name}:</strong> $${detail.payment} (${detail.installment}/${detail.totalInstallments})</p>`;
            });
            paymentDetails.appendChild(categoryGroup);
        }

        totalPayments.appendChild(paymentItem);

        // Configurar la gráfica de dona para cada mes
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

// Calcular y mostrar el resumen de deuda por categoría
function calculateCategorySummary() {
    const categorySummary = {};
    let totalDebt = 0;

    // Inicializar cada categoría con una deuda de cero
    Object.keys(categoryData).forEach(category => {
        categorySummary[category] = 0;
    });

    // Sumar la deuda total y por categoría
    products.forEach(product => {
        categorySummary[product.category] += product.price;
        totalDebt += product.price;
    });

    // Mostrar el resumen en la interfaz
    const debtSummaryElement = document.getElementById('debtSummary');
    debtSummaryElement.innerHTML = '';
    for (let category in categorySummary) {
        const percentage = totalDebt ? (categorySummary[category] / totalDebt * 100).toFixed(2) : '0.00';
        const summaryItem = document.createElement('div');
        summaryItem.className = 'debt-summary-item';
        summaryItem.innerHTML = `
            <span class="category-color" style="background-color: ${getCategoryColor(category)}">
                <span class="category-icon">${categoryData[category] ? categoryData[category].icon : '?'}</span>
            </span>
            <span class="category-percent">${percentage}% </span>
            <span class="category-name">${category}</span>
            <span class="category-Amount" style="background-color:${getCategoryColor(category)}"><span>$${categorySummary[category].toFixed(2)}</span></span>
            
        `;
        debtSummaryElement.appendChild(summaryItem);
    }

    updateDebtChart(categorySummary, totalDebt);
}

// Actualizar la gráfica de dona con el resumen de deuda
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

    // Actualizar el texto central con la deuda total
    const chartCenterText = document.getElementById('chartCenterText');
    chartCenterText.textContent = `$${totalDebt.toFixed(2)}`;
}

// Calcular y mostrar la evolución mensual de los pagos
function calculateMonthlyEvolution() {
    const monthlyData = {};
    const categories = Object.keys(categoryData);
    const currentDate = new Date();

    // Preparar los datos mensuales por categoría para el próximo año
    for (let i = 0; i < 12; i++) {
        const paymentKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        monthlyData[paymentKey] = {};
        categories.forEach(category => {
            monthlyData[paymentKey][category] = 0;
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Distribuir los pagos de cada producto por su duración en cuotas
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

    // Configurar y mostrar la gráfica de evolución mensual
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

    if (evoChart) {
        evoChart.destroy();
    }

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

// Obtener el nombre del mes a partir de un número de mes
function getMonthName(month) {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return monthNames[parseInt(month)];
}

// Agrupar elementos de un arreglo basado en una clave especificada
function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
        return result;
    }, {});
}

// Ordenar los productos basado en una clave especificada
function sortProducts(key) {
    if (currentSort.key === key) {
        if (currentSort.direction === 1) {
            currentSort.direction = -1;
        } else if (currentSort.direction === -1) {
            currentSort.key = null;
            currentSort.direction = 1;
            products = [...originalOrder];
        }
    } else {
        currentSort.key = key;
        currentSort.direction = 1;
    }

    if (currentSort.key) {
        products.sort((a, b) => {
            if (a[currentSort.key] < b[currentSort.key]) return -1 * currentSort.direction;
            if (a[currentSort.key] > b[currentSort.key]) return 1 * currentSort.direction;
            return 0;
        });
    }

    updateSortButtons();
    displayProducts();
}

// Actualizar los botones de ordenación para reflejar el estado actual de la ordenación
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

// Guardar los productos en el almacenamiento local del navegador
function saveProductsToStorage() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Cargar los productos desde el almacenamiento local del navegador
function loadProductsFromStorage() {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
        originalOrder = [...products];
    }
}

// Obtener el color asociado a una categoría basado en los datos cargados
function getCategoryColor(category) {
    return categoryData[category] ? categoryData[category].color : '#000'; // Color por defecto si no se encuentra
}
