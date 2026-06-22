// Initialize Lucide icons
lucide.createIcons();

// --- State Management ---
let transactions = JSON.parse(localStorage.getItem('finsight_tx')) || [];
let isDarkMode = localStorage.getItem('finsight_theme') === 'dark';

// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const getStartedBtn = document.getElementById('get-started-btn');
const getStartedBtnBottom = document.getElementById('get-started-btn-bottom');
const backToLandingBtn = document.getElementById('back-to-landing');
const landingPage = document.getElementById('landing-page');
const dashboard = document.getElementById('dashboard');

const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const healthScoreEl = document.getElementById('health-score');

// Form inputs
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const descriptionInput = document.getElementById('description');
const descriptionLabel = document.getElementById('description-label');

// Chart Instances
let barChartInstance = null;
let pieChartInstance = null;

// --- Theme Handling ---
function applyTheme(dark) {
    if (dark) {
        body.classList.add('dark');
        body.classList.remove('light');
        themeIcon.setAttribute('data-lucide', 'sun');
    } else {
        body.classList.add('light');
        body.classList.remove('dark');
        themeIcon.setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons();
    updateCharts();
    updateValues(); // Ensure health score text colors update on theme switch
}

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('finsight_theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
});

// Initial theme apply
applyTheme(isDarkMode);

// --- Navigation ---
function enterDashboard() {
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateCharts();
}

getStartedBtn.addEventListener('click', enterDashboard);
getStartedBtnBottom.addEventListener('click', enterDashboard);

backToLandingBtn.addEventListener('click', () => {
    dashboard.classList.add('hidden');
    landingPage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- Interactive Card Tilt (text stays stiff) ---
const hero = document.querySelector('.hero-section');
const card = document.querySelector('.perspective-card');

if (hero && card) {
    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const cardRotateX = -(y / rect.height) * 20;
        const cardRotateY = (x / rect.width) * 20;
        card.style.transform = `rotateX(${cardRotateX}deg) rotateY(${cardRotateY}deg) rotateZ(-2deg) translateY(-8px)`;
    });
    
    hero.addEventListener('mouseleave', () => {
        card.style.transform = `rotateX(12deg) rotateY(-18deg) rotateZ(-2deg)`;
    });
}

// Category & Description Logic
const typeRadios = document.querySelectorAll('input[name="type"]');
const expenseCategories = ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];
const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

function updateFormDetails() {
    const type = document.querySelector('input[name="type"]:checked').value;
    
    categoryInput.innerHTML = '';
    const options = type === 'expense' ? expenseCategories : incomeCategories;
    options.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryInput.appendChild(opt);
    });

    if (type === 'income') {
        descriptionInput.placeholder = 'e.g. Consulting Fee';
        descriptionLabel.textContent = 'Income Source / Description';
    } else {
        descriptionInput.placeholder = 'e.g. Groceries';
        descriptionLabel.textContent = 'Expense Item / Description';
    }
}

typeRadios.forEach(radio => radio.addEventListener('change', updateFormDetails));
updateFormDetails();

// --- Core Transaction Logic ---
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

function addTransaction(e) {
    e.preventDefault();
    if(amountInput.value.trim() === '' || descriptionInput.value.trim() === '') return;

    const type = document.querySelector('input[name="type"]:checked').value;
    const transaction = {
        id: generateID(),
        type,
        amount: +amountInput.value,
        category: categoryInput.value,
        description: descriptionInput.value,
        date: new Date().toLocaleDateString()
    };

    transactions.unshift(transaction);
    updateLocalStorage();
    init();
    
    amountInput.value = '';
    descriptionInput.value = '';
}

function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    init();
}

function updateLocalStorage() {
    localStorage.setItem('finsight_tx', JSON.stringify(transactions));
}

// --- DOM Rendering ---
function addTransactionDOM(transaction) {
    const isInc = transaction.type === 'income';
    const sign = isInc ? '+' : '-';
    const item = document.createElement('li');
    item.classList.add('transaction-item');
    
    let iconName = isInc ? 'arrow-up-right' : 'arrow-down-right';
    if(transaction.category === 'Food') iconName = 'coffee';
    if(transaction.category === 'Transport') iconName = 'car';
    if(transaction.category === 'Housing') iconName = 'home';
    if(transaction.category === 'Salary') iconName = 'briefcase';
    if(transaction.category === 'Freelance') iconName = 'terminal';
    if(transaction.category === 'Investment') iconName = 'trending-up';

    item.innerHTML = `
        <div class="trans-info">
            <div class="trans-icon ${isInc ? 'inc' : 'exp'}">
                <i data-lucide="${iconName}"></i>
            </div>
            <div>
                <div class="trans-desc">${transaction.description}</div>
                <div class="trans-cat">${transaction.category} • ${transaction.date}</div>
            </div>
        </div>
        <div class="trans-amount-wrapper">
            <span class="trans-amount ${isInc ? 'inc' : 'exp'}">${sign}$${Math.abs(transaction.amount).toFixed(2)}</span>
            <button class="delete-btn" onclick="window.removeTransaction(${transaction.id})" aria-label="Delete">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        </div>
    `;
    list.appendChild(item);
}

function updateValues() {
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    
    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

    totalBalanceEl.innerText = `$${total}`;
    totalIncomeEl.innerText = `$${income.toFixed(2)}`;
    totalExpenseEl.innerText = `$${expense.toFixed(2)}`;
    
    totalBalanceEl.style.color = total < 0 ? 'var(--danger-color)' : 'var(--text-primary)';

    let health = "N/A";
    let healthColor = "var(--text-secondary)";
    
    if (income === 0 && expense === 0) {
        health = "N/A";
    } else if (income === 0 && expense > 0) {
        health = "Critical";
        healthColor = "var(--danger-color)";
    } else {
        const ratio = expense / income;
        if (ratio <= 0.5) {
            health = "Excellent";
            healthColor = "var(--accent-color)";
        } else if (ratio <= 0.8) {
            health = "Good";
            healthColor = isDarkMode ? '#A78BFA' : '#4F46E5'; // Violet (dark) or Indigo (light)
        } else if (ratio <= 1.0) {
            health = "Warning";
            healthColor = "#F59E0B";
        } else {
            health = "Critical";
            healthColor = "var(--danger-color)";
        }
    }
    
    healthScoreEl.innerText = health;
    healthScoreEl.style.color = healthColor;
}

// --- Charts Visualizer ---
function updateCharts() {
    if(landingPage.classList.contains('hidden') === false) return;

    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

    const textColor = isDarkMode ? '#E6EDF3' : '#1A1917';
    const gridColor = isDarkMode ? '#21262D' : '#E4E2DD';
    const incColor = isDarkMode ? '#4ADE80' : '#16A34A';
    const expColor = isDarkMode ? '#F87171' : '#DC2626';
    const secAccentColor = isDarkMode ? '#A78BFA' : '#4F46E5';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";

    // 1. Flow Bar Chart
    try {
        const barCtx = document.getElementById('barChart').getContext('2d');
        if(barChartInstance) barChartInstance.destroy();
        
        barChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: [incColor, expColor],
                    borderRadius: 4,
                    barThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: gridColor }, beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (err) {
        console.error("Error drawing Bar Chart:", err);
    }

    // 2. Pie Chart (Expense Allocation)
    try {
        const pieCtx = document.getElementById('pieChart').getContext('2d');
        if(pieChartInstance) pieChartInstance.destroy();

        const expenses = transactions.filter(t => t.type === 'expense');
        const catTotals = {};
        expenses.forEach(e => {
            catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
        });

        const pieLabels = Object.keys(catTotals);
        const pieData = Object.values(catTotals);
        
        const pieColors = isDarkMode 
            ? ['#4ADE80', secAccentColor, '#FBBF24', '#F472B6', '#9CA3AF']
            : ['#16A34A', secAccentColor, '#D97706', '#7C3AED', '#DB2777', '#6B7280'];

        pieChartInstance = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieLabels.length ? pieLabels : ['No Expenses'],
                datasets: [{
                    data: pieData.length ? pieData : [1],
                    backgroundColor: pieData.length ? pieColors : [gridColor],
                    borderWidth: 0,
                    cutout: '72%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } }
                }
            }
        });
    } catch (err) {
        console.error("Error drawing Pie Chart:", err);
    }
}

// Global scope initialization helper for onClick removal
window.removeTransaction = removeTransaction;

function init() {
    list.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
    lucide.createIcons();
    updateCharts();
}

form.addEventListener('submit', addTransaction);

// Initial call
init();
