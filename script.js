// ============================================================
//  FinSight — script.js  (The Masterpiece Update)
//  All logic: state, CRUD, charts, budgets, goals, currency,
//  recurring, pagination, command palette, modals, PWA, backup
// ============================================================

lucide.createIcons();

// ─── State ──────────────────────────────────────────────────
let transactions = JSON.parse(localStorage.getItem('finsight_tx')) || [];
let budgets      = JSON.parse(localStorage.getItem('finsight_budgets')) || {};
let goals        = JSON.parse(localStorage.getItem('finsight_goals')) || [];
let settings     = JSON.parse(localStorage.getItem('finsight_settings')) || { currency: 'USD' };
let isDarkMode   = localStorage.getItem('finsight_theme') === 'dark';
let editingTxId  = null;

// Pagination
let currentPage  = 1;
const PAGE_SIZE  = 10;

// Filter state
let currentSearchQuery   = '';
let currentTypeFilter    = 'all';
let currentPeriodFilter  = 'all';
let currentCategoryFilter = 'all';
let dateFrom = '';
let dateTo   = '';

// ─── Currency ───────────────────────────────────────────────
const CURRENCIES = {
    USD: { symbol: '$',  locale: 'en-US',  code: 'USD' },
    EUR: { symbol: '€',  locale: 'de-DE',  code: 'EUR' },
    GBP: { symbol: '£',  locale: 'en-GB',  code: 'GBP' },
    INR: { symbol: '₹',  locale: 'en-IN',  code: 'INR' },
    JPY: { symbol: '¥',  locale: 'ja-JP',  code: 'JPY' },
};

function getCurrencyInfo() {
    return CURRENCIES[settings.currency] || CURRENCIES.USD;
}

function formatCurrency(amount) {
    const c = getCurrencyInfo();
    return new Intl.NumberFormat(c.locale, {
        style: 'currency',
        currency: c.code,
        minimumFractionDigits: c.code === 'JPY' ? 0 : 2,
        maximumFractionDigits: c.code === 'JPY' ? 0 : 2,
    }).format(amount || 0);
}

// ─── DOM Refs ────────────────────────────────────────────────
const body             = document.body;
const themeToggle      = document.getElementById('theme-toggle');
const themeIcon        = document.getElementById('theme-icon');
const getStartedBtn    = document.getElementById('get-started-btn');
const getStartedBtnBottom = document.getElementById('get-started-btn-bottom');
const backToLandingBtn = document.getElementById('back-to-landing');
const landingPage      = document.getElementById('landing-page');
const dashboard        = document.getElementById('dashboard');

// Form
const form           = document.getElementById('transaction-form');
const formCard       = document.getElementById('transaction-form-card');
const formTitle      = document.getElementById('form-title');
const formSubmitBtn  = document.getElementById('form-submit-btn');
const cancelEditBtn  = document.getElementById('cancel-edit-btn');
const editBadge      = document.getElementById('edit-badge');
const amountInput    = document.getElementById('amount');
const categoryInput  = document.getElementById('category');
const descriptionInput = document.getElementById('description');
const descriptionLabel = document.getElementById('description-label');
const recurringCheck = document.getElementById('recurring-check');

// Summary
const totalBalanceEl    = document.getElementById('total-balance');
const totalIncomeEl     = document.getElementById('total-income');
const totalExpenseEl    = document.getElementById('total-expense');
const healthScoreEl     = document.getElementById('health-score');
const savingsRateBadge  = document.getElementById('savings-rate-badge');
const incomeCountBadge  = document.getElementById('income-count-badge');
const expenseCountBadge = document.getElementById('expense-count-badge');

// Intelligence
const topExpenseVal  = document.getElementById('top-expense-val');
const avgTxVal       = document.getElementById('avg-tx-val');
const netRunrateVal  = document.getElementById('net-runrate-val');

// Ledger + filters
const list               = document.getElementById('transaction-list');
const ledgerCountPill    = document.getElementById('ledger-count-pill');
const searchLedgerInput  = document.getElementById('search-ledger');
const clearSearchBtn     = document.getElementById('clear-search-btn');
const filterPeriodSelect = document.getElementById('filter-period');
const filterCategorySelect = document.getElementById('filter-category');
const filterPills        = document.querySelectorAll('.filter-pill');
const dateFromInput      = document.getElementById('date-from');
const dateToInput        = document.getElementById('date-to');
const clearDateRangeBtn  = document.getElementById('clear-date-range-btn');

// Pagination
const paginationEl   = document.getElementById('ledger-pagination');
const pageInfoEl     = document.getElementById('page-info');
const prevPageBtn    = document.getElementById('prev-page-btn');
const nextPageBtn    = document.getElementById('next-page-btn');

// Action Buttons
const loadDemoBtn    = document.getElementById('load-demo-btn');
const clearDataBtn   = document.getElementById('clear-data-btn');
const exportCsvBtn   = document.getElementById('export-csv-btn');
const importCsvBtn   = document.getElementById('import-csv-btn');
const importCsvInput = document.getElementById('import-csv-input');
const exportPdfBtn   = document.getElementById('export-pdf-btn');
const backupStateBtn = document.getElementById('backup-state-btn');
const restoreStateBtn= document.getElementById('restore-state-btn');
const restoreInput   = document.getElementById('restore-state-input');

// Currency
const currencySelect = document.getElementById('currency-select');

// Budget section
const budgetList     = document.getElementById('budget-list');
const budgetCatInput = document.getElementById('budget-cat-input');
const budgetAmtInput = document.getElementById('budget-amt-input');
const addBudgetBtn   = document.getElementById('add-budget-btn');

// Goals section
const goalsList      = document.getElementById('goals-list');
const goalNameInput  = document.getElementById('goal-name-input');
const goalTargetInput= document.getElementById('goal-target-input');
const addGoalBtn     = document.getElementById('add-goal-btn');

// Command palette
const cmdPalette     = document.getElementById('cmd-palette');
const cmdInput       = document.getElementById('cmd-input');
const cmdList        = document.getElementById('cmd-list');

// Modal
const customModal    = document.getElementById('custom-modal');
const modalTitle     = document.getElementById('modal-title');
const modalMessage   = document.getElementById('modal-message');
const modalConfirmBtn= document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');

// Chart instances
let barChartInstance   = null;
let pieChartInstance   = null;
let trendChartInstance = null;

// ─── Theme ───────────────────────────────────────────────────
function applyTheme(dark) {
    body.classList.toggle('dark', dark);
    body.classList.toggle('light', !dark);
    themeIcon.setAttribute('data-lucide', dark ? 'sun' : 'moon');
    lucide.createIcons();
    updateCharts();
    updateValues();
}

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('finsight_theme', isDarkMode ? 'dark' : 'light');
    applyTheme(isDarkMode);
});

applyTheme(isDarkMode);

// ─── Navigation ──────────────────────────────────────────────
function enterDashboard() {
    landingPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    checkRecurringTransactions();
    updateCharts();
}

getStartedBtn.addEventListener('click', enterDashboard);
if (getStartedBtnBottom) getStartedBtnBottom.addEventListener('click', enterDashboard);
backToLandingBtn.addEventListener('click', () => {
    dashboard.classList.add('hidden');
    landingPage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── 3D Card Tilt ─────────────────────────────────────────────
const hero = document.querySelector('.hero-section');
const card = document.querySelector('.perspective-card');
if (hero && card) {
    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        card.style.transform = `rotateX(${-(y / rect.height) * 20}deg) rotateY(${(x / rect.width) * 20}deg) rotateZ(-2deg) translateY(-8px)`;
    });
    hero.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(12deg) rotateY(-18deg) rotateZ(-2deg)';
    });
}

// ─── Category & Form Logic ────────────────────────────────────
const typeRadios = document.querySelectorAll('input[name="type"]');
const expenseCategories = ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Healthcare', 'Other'];
const incomeCategories  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

function updateFormDetails() {
    const type = document.querySelector('input[name="type"]:checked')?.value || 'income';
    const prevCat = categoryInput.value;
    categoryInput.innerHTML = '';
    const options = type === 'expense' ? expenseCategories : incomeCategories;
    options.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === prevCat) opt.selected = true;
        categoryInput.appendChild(opt);
    });
    descriptionInput.placeholder = type === 'income' ? 'e.g. Consulting Retainer' : 'e.g. Supermarket Groceries';
    descriptionLabel.textContent = type === 'income' ? 'Income Source / Description' : 'Expense Item / Description';
}

typeRadios.forEach(r => r.addEventListener('change', updateFormDetails));
updateFormDetails();

// ─── Storage ─────────────────────────────────────────────────
function saveAll() {
    localStorage.setItem('finsight_tx',       JSON.stringify(transactions));
    localStorage.setItem('finsight_budgets',  JSON.stringify(budgets));
    localStorage.setItem('finsight_goals',    JSON.stringify(goals));
    localStorage.setItem('finsight_settings', JSON.stringify(settings));
}

function generateID() {
    return Date.now() + Math.floor(Math.random() * 10000);
}

// ─── Recurring Transactions ───────────────────────────────────
function checkRecurringTransactions() {
    const today = new Date().toLocaleDateString();
    let posted = 0;
    transactions.filter(t => t.recurring).forEach(t => {
        const alreadyPostedToday = transactions.some(x =>
            x.recurringSourceId === t.id &&
            x.date === today
        );
        if (!alreadyPostedToday && t.date !== today) {
            const copy = {
                ...t,
                id: generateID(),
                date: today,
                recurringSourceId: t.id,
                recurring: false,
                description: `↻ ${t.description}`,
            };
            transactions.unshift(copy);
            posted++;
        }
    });
    if (posted > 0) {
        saveAll();
        showToast(`Auto-posted ${posted} recurring transaction${posted > 1 ? 's' : ''}`, 'info');
    }
}

// ─── CRUD ─────────────────────────────────────────────────────
function addTransaction(e) {
    e.preventDefault();
    const rawAmount = amountInput.value.trim();
    const rawDesc   = descriptionInput.value.trim();

    if (!rawAmount || isNaN(+rawAmount) || +rawAmount <= 0) {
        showToast('Please enter a valid amount greater than zero', 'danger');
        amountInput.focus();
        return;
    }
    if (!rawDesc) {
        showToast('Please provide a description for this transaction', 'danger');
        descriptionInput.focus();
        return;
    }

    const type      = document.querySelector('input[name="type"]:checked').value;
    const amount    = parseFloat((+rawAmount).toFixed(2));
    const category  = categoryInput.value || 'Other';
    const isRecurring = recurringCheck ? recurringCheck.checked : false;

    if (editingTxId !== null) {
        const idx = transactions.findIndex(t => t.id === editingTxId);
        if (idx !== -1) {
            Object.assign(transactions[idx], { type, amount, category, description: rawDesc, recurring: isRecurring });
            saveAll();
            cancelEdit();
            init();
            showToast(`Updated "${rawDesc}" (${formatCurrency(amount)})`, 'success');
            return;
        }
    }

    const tx = {
        id: generateID(),
        type,
        amount,
        category,
        description: rawDesc,
        date: new Date().toLocaleDateString(),
        recurring: isRecurring,
    };
    transactions.unshift(tx);
    saveAll();
    init();
    amountInput.value = '';
    descriptionInput.value = '';
    if (recurringCheck) recurringCheck.checked = false;
    showToast(`Added "${tx.description}" (${formatCurrency(tx.amount)})`, 'success');
}

function startEditTransaction(id) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    editingTxId = id;
    const radio = document.querySelector(`input[name="type"][value="${t.type}"]`);
    if (radio) radio.checked = true;
    updateFormDetails();
    amountInput.value = t.amount;
    categoryInput.value = t.category;
    descriptionInput.value = t.description;
    if (recurringCheck) recurringCheck.checked = !!t.recurring;
    formTitle.textContent = 'Edit Transaction';
    formSubmitBtn.textContent = 'Save Changes';
    if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');
    if (editBadge) editBadge.classList.remove('hidden');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        formCard.classList.add('highlight-row');
        setTimeout(() => formCard.classList.remove('highlight-row'), 1800);
    }
    amountInput.focus();
    showToast(`Editing "${t.description}"`, 'info');
}

function cancelEdit() {
    editingTxId = null;
    amountInput.value = '';
    descriptionInput.value = '';
    if (recurringCheck) recurringCheck.checked = false;
    const defaultRadio = document.querySelector('input[name="type"][value="income"]');
    if (defaultRadio) defaultRadio.checked = true;
    updateFormDetails();
    formTitle.textContent = 'Add Transaction';
    formSubmitBtn.textContent = 'Post Transaction';
    if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
    if (editBadge) editBadge.classList.add('hidden');
}

function removeTransaction(id) {
    if (editingTxId === id) cancelEdit();
    const target = transactions.find(t => t.id === id);
    transactions = transactions.filter(t => t.id !== id);
    saveAll();
    init();
    if (target) showToast(`Removed "${target.description}"`, 'danger');
}

if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);
window.removeTransaction = removeTransaction;
window.startEditTransaction = startEditTransaction;

// ─── Transaction Item Renderer ────────────────────────────────
const CATEGORY_ICONS = {
    Food: 'coffee', Transport: 'car', Housing: 'home', Salary: 'briefcase',
    Freelance: 'terminal', Investment: 'trending-up', Utilities: 'zap',
    Entertainment: 'film', Healthcare: 'heart-pulse', Gift: 'gift',
};

function createTransactionElement(transaction) {
    const isInc = transaction.type === 'income';
    const sign  = isInc ? '+' : '-';
    const iconName = CATEGORY_ICONS[transaction.category] || (isInc ? 'arrow-up-right' : 'arrow-down-right');
    const recurringBadge = transaction.recurring
        ? `<span class="badge-pill subtle-pill recurring-badge" title="Recurring"><i data-lucide="repeat-2" style="width:10px;height:10px;vertical-align:middle;"></i> Recurring</span>`
        : '';

    const item = document.createElement('li');
    item.className = 'transaction-item';
    item.dataset.id = transaction.id;
    item.innerHTML = `
        <div class="trans-info">
            <div class="trans-icon ${isInc ? 'inc' : 'exp'}">
                <i data-lucide="${iconName}"></i>
            </div>
            <div>
                <div class="trans-desc">${transaction.description} ${recurringBadge}</div>
                <div class="trans-cat">${transaction.category} • ${transaction.date}</div>
            </div>
        </div>
        <div class="trans-amount-wrapper">
            <span class="trans-amount ${isInc ? 'inc' : 'exp'}">${sign}${formatCurrency(Math.abs(transaction.amount))}</span>
            <button class="edit-btn" onclick="window.startEditTransaction(${transaction.id})" title="Edit" aria-label="Edit">
                <i data-lucide="edit-3" style="width:14px;height:14px;"></i>
            </button>
            <button class="delete-btn" onclick="window.removeTransaction(${transaction.id})" title="Delete" aria-label="Delete">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
        </div>
    `;
    return item;
}

// ─── Period & Date Range Filtering ───────────────────────────
function matchesPeriod(dateStr, period) {
    if (period === 'all') return true;
    if (!dateStr) return true;
    const txDate = new Date(dateStr);
    if (isNaN(txDate.getTime())) return true;
    const now = new Date();
    if (period === 'this-month') return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    if (period === 'last-30') return (now - txDate) / 86400000 <= 30;
    if (period === 'this-year') return txDate.getFullYear() === now.getFullYear();
    return true;
}

function matchesDateRange(dateStr) {
    if (!dateFrom && !dateTo) return true;
    if (!dateStr) return true;
    const txDate = new Date(dateStr);
    if (isNaN(txDate.getTime())) return true;
    if (dateFrom && txDate < new Date(dateFrom)) return false;
    if (dateTo   && txDate > new Date(dateTo + 'T23:59:59')) return false;
    return true;
}

// ─── Category Filter Options ──────────────────────────────────
function updateCategoryFilterOptions() {
    if (!filterCategorySelect) return;
    const current = filterCategorySelect.value;
    const cats = new Set(transactions.map(t => t.category).filter(Boolean));
    filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
    Array.from(cats).sort().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === current) opt.selected = true;
        filterCategorySelect.appendChild(opt);
    });
}

// ─── Ledger Render (with Pagination) ─────────────────────────
function getFilteredTransactions() {
    const query = currentSearchQuery.trim().toLowerCase();
    return transactions.filter(t => {
        const matchesType  = currentTypeFilter === 'all' || t.type === currentTypeFilter;
        const matchesCat   = currentCategoryFilter === 'all' || t.category === currentCategoryFilter;
        const inPeriod     = matchesPeriod(t.date, currentPeriodFilter);
        const inRange      = matchesDateRange(t.date);
        const matchesQ     = !query ||
            t.description.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query) ||
            (t.date || '').toLowerCase().includes(query) ||
            t.amount.toString().includes(query);
        return matchesType && matchesCat && inPeriod && inRange && matchesQ;
    });
}

function renderLedger() {
    list.innerHTML = '';

    if (transactions.length === 0) {
        list.appendChild(emptyStateEl());
        if (ledgerCountPill) ledgerCountPill.textContent = '0';
        hidePagination();
        return;
    }

    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
        list.appendChild(noResultsEl());
        hidePagination();
        if (ledgerCountPill) ledgerCountPill.textContent = `0 / ${transactions.length}`;
        return;
    }

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start  = (currentPage - 1) * PAGE_SIZE;
    const paged  = filtered.slice(start, start + PAGE_SIZE);

    paged.forEach(t => list.appendChild(createTransactionElement(t)));

    if (ledgerCountPill) {
        ledgerCountPill.textContent = filtered.length === transactions.length
            ? `${transactions.length}`
            : `${filtered.length} / ${transactions.length}`;
    }

    // Pagination controls
    if (filtered.length > PAGE_SIZE) {
        showPagination(currentPage, totalPages);
    } else {
        hidePagination();
    }

    lucide.createIcons();
}

function emptyStateEl() {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <i data-lucide="inbox" class="empty-icon"></i>
        <p class="empty-title">No transactions recorded</p>
        <p class="empty-sub">Post a transaction or load demo data to view charts & analytics.</p>
        <button id="empty-load-demo-btn" class="btn primary-btn btn-sm">
            <i data-lucide="sparkles"></i> Load Demo Data
        </button>
    `;
    setTimeout(() => {
        const btn = document.getElementById('empty-load-demo-btn');
        if (btn) btn.addEventListener('click', loadDemoData);
    }, 0);
    return div;
}

function noResultsEl() {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        <i data-lucide="search-x" class="empty-icon"></i>
        <p class="empty-title">No matching transactions</p>
        <p class="empty-sub">Try adjusting your filters or search query.</p>
        <button id="reset-filters-btn" class="btn secondary-btn btn-sm">Reset All Filters</button>
    `;
    setTimeout(() => {
        const btn = document.getElementById('reset-filters-btn');
        if (btn) btn.addEventListener('click', resetFilters);
    }, 0);
    return div;
}

function hidePagination() {
    if (paginationEl) paginationEl.classList.add('hidden');
}

function showPagination(page, total) {
    if (!paginationEl) return;
    paginationEl.classList.remove('hidden');
    if (pageInfoEl) pageInfoEl.textContent = `Page ${page} of ${total}`;
    if (prevPageBtn) prevPageBtn.disabled = page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = page >= total;
}

if (prevPageBtn) prevPageBtn.addEventListener('click', () => { currentPage--; renderLedger(); });
if (nextPageBtn) nextPageBtn.addEventListener('click', () => { currentPage++; renderLedger(); });

function resetFilters() {
    currentSearchQuery = '';
    currentTypeFilter = 'all';
    currentPeriodFilter = 'all';
    currentCategoryFilter = 'all';
    dateFrom = '';
    dateTo = '';
    currentPage = 1;
    if (searchLedgerInput) searchLedgerInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    if (filterPeriodSelect) filterPeriodSelect.value = 'all';
    if (filterCategorySelect) filterCategorySelect.value = 'all';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    if (clearDateRangeBtn) clearDateRangeBtn.classList.add('hidden');
    filterPills.forEach(p => p.classList.toggle('active', p.dataset.type === 'all'));
    renderLedger();
}

// ─── Summary Values ───────────────────────────────────────────
function updateValues() {
    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const total   = income - expense;

    if (totalBalanceEl) {
        totalBalanceEl.innerText = formatCurrency(total);
        totalBalanceEl.style.color = total < 0 ? 'var(--danger-color)' : 'var(--text-primary)';
    }
    if (totalIncomeEl)  totalIncomeEl.innerText  = formatCurrency(income);
    if (totalExpenseEl) totalExpenseEl.innerText = formatCurrency(expense);

    const incomeCount  = transactions.filter(t => t.type === 'income').length;
    const expenseCount = transactions.filter(t => t.type === 'expense').length;
    if (incomeCountBadge)  incomeCountBadge.innerText  = `${incomeCount} item${incomeCount === 1 ? '' : 's'}`;
    if (expenseCountBadge) expenseCountBadge.innerText = `${expenseCount} item${expenseCount === 1 ? '' : 's'}`;

    // Savings Rate
    if (savingsRateBadge) {
        if (income === 0) {
            savingsRateBadge.innerText = '0% Saved';
            savingsRateBadge.className = 'badge-pill savings-pill';
        } else {
            const rate = ((income - expense) / income) * 100;
            savingsRateBadge.innerText = rate >= 0 ? `+${rate.toFixed(1)}% Saved` : `${rate.toFixed(1)}% Deficit`;
            savingsRateBadge.className = `badge-pill savings-pill${rate < 0 ? ' danger' : rate < 20 ? ' warning' : ''}`;
        }
    }

    // Budget Health
    if (healthScoreEl) {
        let health = 'N/A', healthColor = 'var(--text-secondary)';
        if (income === 0 && expense > 0) { health = 'Critical'; healthColor = 'var(--danger-color)'; }
        else if (income > 0) {
            const ratio = expense / income;
            if      (ratio <= 0.5) { health = 'Excellent'; healthColor = 'var(--accent-color)'; }
            else if (ratio <= 0.8) { health = 'Good';      healthColor = isDarkMode ? '#A78BFA' : '#4F46E5'; }
            else if (ratio <= 1.0) { health = 'Warning';   healthColor = '#F59E0B'; }
            else                   { health = 'Critical';  healthColor = 'var(--danger-color)'; }
        }
        healthScoreEl.innerText = health;
        healthScoreEl.style.color = healthColor;
    }

    // Financial Intelligence
    if (topExpenseVal) {
        const expenses = transactions.filter(t => t.type === 'expense');
        if (expenses.length > 0) {
            const catMap = {};
            expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
            const [maxCat, maxAmt] = Object.entries(catMap).reduce((a, b) => b[1] > a[1] ? b : a);
            topExpenseVal.innerText = `${maxCat} (${formatCurrency(maxAmt)})`;
        } else {
            topExpenseVal.innerText = 'None';
        }
    }
    if (avgTxVal) {
        avgTxVal.innerText = transactions.length > 0
            ? formatCurrency(transactions.reduce((s, t) => s + t.amount, 0) / transactions.length)
            : formatCurrency(0);
    }
    if (netRunrateVal) {
        netRunrateVal.innerText = formatCurrency(income - expense);
        netRunrateVal.style.color = (income - expense) >= 0 ? 'var(--accent-color)' : 'var(--danger-color)';
    }
}

// ─── Charts ───────────────────────────────────────────────────
function getChartColors() {
    return {
        textColor:    isDarkMode ? '#E6EDF3' : '#1A1917',
        gridColor:    isDarkMode ? '#21262D' : '#E4E2DD',
        incColor:     isDarkMode ? '#4ADE80' : '#16A34A',
        expColor:     isDarkMode ? '#F87171' : '#DC2626',
        secAccent:    isDarkMode ? '#A78BFA' : '#4F46E5',
        pieColors:    isDarkMode
            ? ['#4ADE80','#A78BFA','#FBBF24','#F472B6','#9CA3AF','#38BDF8','#FB923C']
            : ['#16A34A','#4F46E5','#D97706','#7C3AED','#DB2777','#0284C7','#6B7280'],
    };
}

function updateCharts() {
    if (landingPage && !landingPage.classList.contains('hidden')) return;
    const c = getChartColors();
    Chart.defaults.color = c.textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";

    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // 1. Flow Bar Chart
    try {
        const barCtx = document.getElementById('barChart')?.getContext('2d');
        if (barCtx) {
            if (barChartInstance) barChartInstance.destroy();
            barChartInstance = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['Income', 'Expense'],
                    datasets: [{ data: [income, expense], backgroundColor: [c.incColor, c.expColor], borderRadius: 4, barThickness: 32 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` } }
                    },
                    scales: {
                        y: { grid: { color: c.gridColor }, beginAtZero: true, ticks: { callback: v => getCurrencyInfo().symbol + v } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    } catch (err) { console.error('Bar chart error:', err); }

    // 2. Expense Doughnut
    try {
        const pieCtx = document.getElementById('pieChart')?.getContext('2d');
        if (pieCtx) {
            if (pieChartInstance) pieChartInstance.destroy();
            const expenses = transactions.filter(t => t.type === 'expense');
            const catTotals = {};
            expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
            const pieLabels = Object.keys(catTotals);
            const pieData   = Object.values(catTotals);

            pieChartInstance = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: pieLabels.length ? pieLabels : ['No Expenses'],
                    datasets: [{
                        data: pieData.length ? pieData : [1],
                        backgroundColor: pieData.length ? c.pieColors : [c.gridColor],
                        borderWidth: 0, cutout: '72%'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
                        tooltip: { callbacks: { label: ctx => pieLabels.length ? ` ${ctx.label}: ${formatCurrency(ctx.raw)}` : ' No Expenses' } }
                    }
                }
            });
        }
    } catch (err) { console.error('Pie chart error:', err); }

    // 3. Monthly Trend Line Chart
    try {
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            if (trendChartInstance) trendChartInstance.destroy();

            const now = new Date();
            const months = [];
            const incomeByMonth  = [];
            const expenseByMonth = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
                const mn = d.getMonth(), yr = d.getFullYear();
                const monthTx = transactions.filter(t => {
                    const td = new Date(t.date);
                    return !isNaN(td.getTime()) && td.getMonth() === mn && td.getFullYear() === yr;
                });
                incomeByMonth.push(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
                expenseByMonth.push(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
            }

            const gradient = trendCtx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, isDarkMode ? 'rgba(52,211,153,0.25)' : 'rgba(22,163,74,0.18)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            trendChartInstance = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Income',
                            data: incomeByMonth,
                            borderColor: c.incColor,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: c.incColor,
                            pointRadius: 4,
                        },
                        {
                            label: 'Expenses',
                            data: expenseByMonth,
                            borderColor: c.expColor,
                            backgroundColor: 'transparent',
                            fill: false,
                            tension: 0.4,
                            pointBackgroundColor: c.expColor,
                            pointRadius: 4,
                            borderDash: [4, 4],
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } },
                        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
                    },
                    scales: {
                        y: { grid: { color: c.gridColor }, beginAtZero: true, ticks: { callback: v => getCurrencyInfo().symbol + v } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    } catch (err) { console.error('Trend chart error:', err); }

    // 4. Day-of-Week Heatmap
    renderHeatmap();

    // 5. Budget progress
    renderBudgets();

    // 6. Goals
    renderGoals();
}

// ─── Day-of-Week Heatmap ──────────────────────────────────────
function renderHeatmap() {
    const heatmapEl = document.getElementById('heatmap-grid');
    if (!heatmapEl) return;

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = new Array(7).fill(0);
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) totals[d.getDay()] += t.amount;
    });
    const maxVal = Math.max(...totals, 1);

    heatmapEl.innerHTML = '';
    DAYS.forEach((day, idx) => {
        const intensity = totals[idx] / maxVal;
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `${day}: ${formatCurrency(totals[idx])}`;
        cell.style.setProperty('--heat', intensity.toFixed(2));
        cell.innerHTML = `<span class="heatmap-day">${day}</span>`;
        heatmapEl.appendChild(cell);
    });
}

// ─── Category Budget Limits ───────────────────────────────────
function renderBudgets() {
    if (!budgetList) return;
    budgetList.innerHTML = '';

    const budgetEntries = Object.entries(budgets);
    if (budgetEntries.length === 0) {
        budgetList.innerHTML = '<p class="empty-sub" style="padding:0.5rem 0;">No budget limits set. Add one above.</p>';
        return;
    }

    // Calculate current month's spending per category
    const now = new Date();
    const thisMonthExpenses = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const spentMap = {};
    thisMonthExpenses.forEach(t => { spentMap[t.category] = (spentMap[t.category] || 0) + t.amount; });

    budgetEntries.forEach(([cat, limit]) => {
        const spent   = spentMap[cat] || 0;
        const pct     = Math.min((spent / limit) * 100, 100);
        const over    = spent > limit;
        const warn    = pct >= 80;
        const statusClass = over ? 'critical' : warn ? 'warning' : 'normal';

        const row = document.createElement('div');
        row.className = 'budget-row';
        row.innerHTML = `
            <div class="budget-row-header">
                <span class="budget-cat-name">${cat}</span>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="budget-pct ${statusClass}">${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
                    <button class="delete-btn" onclick="window.removeBudget('${cat}')" title="Remove budget" aria-label="Remove budget">
                        <i data-lucide="x" style="width:12px;height:12px;"></i>
                    </button>
                </div>
            </div>
            <div class="budget-bar-track">
                <div class="budget-bar-fill ${statusClass}" style="width:${pct}%;"></div>
            </div>
            <div class="budget-bar-label">
                <span class="budget-status-label ${statusClass}">${over ? '⚠ Over Budget' : `${pct.toFixed(0)}% used`}</span>
            </div>
        `;
        budgetList.appendChild(row);
    });
    lucide.createIcons();
}

function addBudget() {
    const cat = budgetCatInput?.value;
    const amt = parseFloat(budgetAmtInput?.value);
    if (!cat || isNaN(amt) || amt <= 0) {
        showToast('Select a category and enter a valid limit', 'danger');
        return;
    }
    budgets[cat] = amt;
    saveAll();
    renderBudgets();
    if (budgetAmtInput) budgetAmtInput.value = '';
    showToast(`Budget limit set for ${cat}: ${formatCurrency(amt)}/mo`, 'success');
}

function removeBudget(cat) {
    delete budgets[cat];
    saveAll();
    renderBudgets();
    showToast(`Removed budget for ${cat}`, 'info');
}

window.removeBudget = removeBudget;
if (addBudgetBtn) addBudgetBtn.addEventListener('click', addBudget);

// ─── Savings Goals ────────────────────────────────────────────
const GOAL_COLORS = ['#4ADE80', '#60A5FA', '#A78BFA', '#FBBF24', '#F472B6', '#34D399'];
let goalColorIdx = 0;

function renderGoals() {
    if (!goalsList) return;
    goalsList.innerHTML = '';

    if (goals.length === 0) {
        goalsList.innerHTML = '<p class="empty-sub" style="padding:0.5rem 0;">No savings goals yet. Create one above.</p>';
        return;
    }

    goals.forEach(goal => {
        const pct  = Math.min((goal.saved / goal.target) * 100, 100);
        const done = goal.saved >= goal.target;

        const row = document.createElement('div');
        row.className = 'goal-row';
        row.innerHTML = `
            <div class="goal-row-header">
                <span class="goal-name"><span class="goal-dot" style="background:${goal.color};"></span>${goal.name}</span>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    ${done ? '<span class="badge-pill savings-pill" style="font-size:10px;">✓ Achieved!</span>' : ''}
                    <button class="delete-btn" onclick="window.removeGoal(${goal.id})" title="Remove goal" aria-label="Remove goal">
                        <i data-lucide="x" style="width:12px;height:12px;"></i>
                    </button>
                </div>
            </div>
            <div class="budget-bar-track">
                <div class="budget-bar-fill" style="width:${pct}%;background:${goal.color};"></div>
            </div>
            <div class="goal-row-footer">
                <span class="budget-status-label normal">${formatCurrency(goal.saved)} / ${formatCurrency(goal.target)}</span>
                <div style="display:flex;gap:0.4rem;">
                    <input type="number" class="goal-allocate-input" id="alloc-${goal.id}" placeholder="Amount" min="0" step="0.01" style="width:90px;">
                    <button class="btn-action-text" style="font-size:11px;" onclick="window.allocateToGoal(${goal.id})" title="Allocate funds">+ Allocate</button>
                </div>
            </div>
        `;
        goalsList.appendChild(row);
    });
    lucide.createIcons();
}

function addGoal() {
    const name   = goalNameInput?.value.trim();
    const target = parseFloat(goalTargetInput?.value);
    if (!name || isNaN(target) || target <= 0) {
        showToast('Enter a goal name and a valid target amount', 'danger');
        return;
    }
    goals.push({
        id: generateID(),
        name,
        target,
        saved: 0,
        color: GOAL_COLORS[goalColorIdx % GOAL_COLORS.length],
    });
    goalColorIdx++;
    saveAll();
    renderGoals();
    if (goalNameInput) goalNameInput.value = '';
    if (goalTargetInput) goalTargetInput.value = '';
    showToast(`Goal "${name}" created!`, 'success');
}

function removeGoal(id) {
    goals = goals.filter(g => g.id !== id);
    saveAll();
    renderGoals();
}

function allocateToGoal(id) {
    const input = document.getElementById(`alloc-${id}`);
    const amount = parseFloat(input?.value);
    if (isNaN(amount) || amount <= 0) {
        showToast('Enter a valid allocation amount', 'danger');
        return;
    }
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    goal.saved = Math.min(goal.saved + amount, goal.target);
    saveAll();
    renderGoals();
    showToast(`Allocated ${formatCurrency(amount)} to "${goal.name}"`, 'success');
}

window.removeGoal = removeGoal;
window.allocateToGoal = allocateToGoal;
if (addGoalBtn) addGoalBtn.addEventListener('click', addGoal);

// ─── Demo Data ────────────────────────────────────────────────
const DEMO_TRANSACTIONS = [
    { id: 1001, type: 'income',  amount: 5200.00, category: 'Salary',        description: 'Tech Corp Monthly Salary',     date: '9/1/2026', recurring: true },
    { id: 1002, type: 'income',  amount: 1450.00, category: 'Freelance',     description: 'UI/UX Client Retainer',        date: '9/5/2026',  recurring: false },
    { id: 1003, type: 'income',  amount:  350.00, category: 'Investment',    description: 'Index Fund Dividends',         date: '9/10/2026', recurring: false },
    { id: 1004, type: 'expense', amount: 1650.00, category: 'Housing',       description: 'Monthly Apartment Lease',      date: '9/2/2026',  recurring: true  },
    { id: 1005, type: 'expense', amount:  480.50, category: 'Food',          description: 'Supermarket Groceries',        date: '9/8/2026',  recurring: false },
    { id: 1006, type: 'expense', amount:  195.00, category: 'Utilities',     description: 'Fiber Internet & Electric',    date: '9/11/2026', recurring: true  },
    { id: 1007, type: 'expense', amount:  140.00, category: 'Transport',     description: 'Transit Pass & Fuel',          date: '9/14/2026', recurring: false },
    { id: 1008, type: 'expense', amount:   95.00, category: 'Entertainment', description: 'Streaming & Film Festival',   date: '9/18/2026', recurring: true  },
    { id: 1009, type: 'expense', amount:   65.00, category: 'Food',          description: 'Coffee Roasters & Bakery',    date: '9/22/2026', recurring: false },
    { id: 1010, type: 'income',  amount:  800.00, category: 'Gift',          description: 'Birthday Gift Received',      date: '8/15/2026', recurring: false },
    { id: 1011, type: 'expense', amount:  250.00, category: 'Healthcare',    description: 'Annual Dental Check-up',      date: '8/20/2026', recurring: false },
    { id: 1012, type: 'income',  amount: 4800.00, category: 'Salary',        description: 'Tech Corp Monthly Salary',    date: '8/1/2026',  recurring: false },
    { id: 1013, type: 'expense', amount: 1650.00, category: 'Housing',       description: 'Monthly Apartment Lease',     date: '8/2/2026',  recurring: false },
];

const DEMO_BUDGETS = { Housing: 1800, Food: 600, Entertainment: 150, Transport: 200, Utilities: 250 };
const DEMO_GOALS   = [
    { id: 9001, name: 'Emergency Fund', target: 10000, saved: 3500, color: '#4ADE80' },
    { id: 9002, name: 'Vacation Fund',  target: 3000,  saved: 900,  color: '#60A5FA' },
];

// ─── Toast ────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'check-circle', danger: 'alert-triangle', info: 'info' };
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" style="width:14px;height:14px;"></i> <span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

// ─── Custom Modal ─────────────────────────────────────────────
let modalResolve = null;

function showModal({ title = 'Confirm', message = '', confirmText = 'Confirm', danger = false }) {
    return new Promise(resolve => {
        modalResolve = resolve;
        if (modalTitle)    modalTitle.textContent = title;
        if (modalMessage)  modalMessage.textContent = message;
        if (modalConfirmBtn) {
            modalConfirmBtn.textContent = confirmText;
            modalConfirmBtn.className = `btn ${danger ? 'danger-btn' : 'primary-btn'}`;
        }
        if (customModal) customModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
}

function closeModal(result) {
    if (customModal) customModal.classList.add('hidden');
    document.body.style.overflow = '';
    if (modalResolve) { modalResolve(result); modalResolve = null; }
}

if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', () => closeModal(true));
if (modalCancelBtn)  modalCancelBtn.addEventListener('click',  () => closeModal(false));
if (customModal) customModal.addEventListener('click', e => { if (e.target === customModal) closeModal(false); });

// ─── CSV Export / Import ──────────────────────────────────────
function exportToCSV() {
    if (transactions.length === 0) { showToast('No data to export', 'info'); return; }
    const headers = ['ID','Type','Amount','Category','Description','Date','Recurring'];
    const rows = transactions.map(t => [
        t.id, t.type, t.amount.toFixed(2),
        `"${(t.category||'').replace(/"/g,'""')}"`,
        `"${(t.description||'').replace(/"/g,'""')}"`,
        `"${t.date||''}"`,
        t.recurring ? 'true' : 'false'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `finsight_ledger_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8;');
    showToast(`Exported ${transactions.length} transactions as CSV`, 'success');
}

function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const lines = evt.target.result.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { showToast('CSV is empty or invalid', 'danger'); return; }
            const clean = v => (v||'').replace(/^"|"$/g,'').trim();
            const parsed = [];
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].match(/(\"[^\"]*\"|[^,]+)(?=,|$)/g) || lines[i].split(',');
                if (row.length >= 6) {
                    const amount = parseFloat(clean(row[2]));
                    if (amount > 0) {
                        parsed.push({
                            id: parseInt(clean(row[0])) || generateID(),
                            type: clean(row[1]).toLowerCase() === 'income' ? 'income' : 'expense',
                            amount,
                            category:    clean(row[3]) || 'Other',
                            description: clean(row[4]) || 'Imported',
                            date:        clean(row[5]) || new Date().toLocaleDateString(),
                            recurring:   clean(row[6]) === 'true',
                        });
                    }
                }
            }
            if (parsed.length > 0) {
                transactions = parsed;
                saveAll();
                if (editingTxId !== null) cancelEdit();
                init();
                showToast(`Imported ${parsed.length} transactions`, 'success');
            } else {
                showToast('No valid transactions found in CSV', 'danger');
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to parse CSV file', 'danger');
        }
        if (importCsvInput) importCsvInput.value = '';
    };
    reader.readAsText(file);
}

// ─── PDF Export ───────────────────────────────────────────────
function exportToPDF() {
    const el = document.getElementById('dashboard');
    if (!el) { showToast('Dashboard not loaded', 'danger'); return; }

    if (typeof html2pdf === 'undefined') {
        showToast('PDF library not loaded yet, please try again', 'danger');
        return;
    }

    showToast('Generating PDF report...', 'info');
    const opt = {
        margin:       [8, 8, 8, 8],
        filename:     `finsight_report_${new Date().toISOString().slice(0,10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const capture = document.getElementById('pdf-capture-region') || el;
    html2pdf().set(opt).from(capture).save().then(() => {
        showToast('PDF report exported successfully!', 'success');
    });
}

// ─── JSON Backup & Restore ────────────────────────────────────
function backupState() {
    const state = { transactions, budgets, goals, settings, exportedAt: new Date().toISOString() };
    downloadFile(JSON.stringify(state, null, 2), `finsight_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
    showToast('Full state backup exported as JSON', 'success');
}

function handleRestoreState(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const state = JSON.parse(evt.target.result);
            if (Array.isArray(state.transactions)) transactions = state.transactions;
            if (state.budgets && typeof state.budgets === 'object') budgets = state.budgets;
            if (Array.isArray(state.goals)) goals = state.goals;
            if (state.settings && typeof state.settings === 'object') settings = state.settings;
            saveAll();
            if (currencySelect) currencySelect.value = settings.currency || 'USD';
            if (editingTxId !== null) cancelEdit();
            init();
            showToast('State restored from JSON backup successfully!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Invalid backup file — could not restore', 'danger');
        }
        if (restoreInput) restoreInput.value = '';
    };
    reader.readAsText(file);
}

// ─── Utility: download file ───────────────────────────────────
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Action Handlers ──────────────────────────────────────────
function loadDemoData() {
    transactions = JSON.parse(JSON.stringify(DEMO_TRANSACTIONS));
    budgets      = JSON.parse(JSON.stringify(DEMO_BUDGETS));
    goals        = JSON.parse(JSON.stringify(DEMO_GOALS));
    saveAll();
    if (editingTxId !== null) cancelEdit();
    init();
    showToast('Demo data loaded — budgets & goals included!', 'success');
}

async function clearAllData() {
    if (transactions.length === 0 && Object.keys(budgets).length === 0 && goals.length === 0) {
        showToast('Nothing to clear', 'info');
        return;
    }
    const confirmed = await showModal({
        title: 'Clear All Data',
        message: 'This will permanently delete all transactions, budgets, and goals. This cannot be undone.',
        confirmText: 'Yes, Clear Everything',
        danger: true,
    });
    if (confirmed) {
        transactions = [];
        budgets = {};
        goals = [];
        saveAll();
        if (editingTxId !== null) cancelEdit();
        init();
        showToast('All data cleared', 'danger');
    }
}

// ─── Currency Selector ────────────────────────────────────────
if (currencySelect) {
    currencySelect.value = settings.currency || 'USD';
    currencySelect.addEventListener('change', e => {
        settings.currency = e.target.value;
        saveAll();
        updateValues();
        updateCharts();
        showToast(`Currency switched to ${e.target.value}`, 'info');
    });
}

// ─── Date Range Filter ────────────────────────────────────────
if (dateFromInput) {
    dateFromInput.addEventListener('change', e => {
        dateFrom = e.target.value;
        if (dateFrom || dateTo) {
            if (filterPeriodSelect) filterPeriodSelect.value = 'all';
            currentPeriodFilter = 'all';
            if (clearDateRangeBtn) clearDateRangeBtn.classList.remove('hidden');
        }
        currentPage = 1;
        renderLedger();
    });
}

if (dateToInput) {
    dateToInput.addEventListener('change', e => {
        dateTo = e.target.value;
        if (dateFrom || dateTo) {
            if (filterPeriodSelect) filterPeriodSelect.value = 'all';
            currentPeriodFilter = 'all';
            if (clearDateRangeBtn) clearDateRangeBtn.classList.remove('hidden');
        }
        currentPage = 1;
        renderLedger();
    });
}

if (clearDateRangeBtn) {
    clearDateRangeBtn.addEventListener('click', () => {
        dateFrom = '';
        dateTo = '';
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput)   dateToInput.value = '';
        clearDateRangeBtn.classList.add('hidden');
        currentPage = 1;
        renderLedger();
    });
}

// ─── Event Listeners ──────────────────────────────────────────
if (loadDemoBtn)   loadDemoBtn.addEventListener('click', loadDemoData);
if (clearDataBtn)  clearDataBtn.addEventListener('click', clearAllData);
if (exportCsvBtn)  exportCsvBtn.addEventListener('click', exportToCSV);
if (exportPdfBtn)  exportPdfBtn.addEventListener('click', exportToPDF);
if (backupStateBtn) backupStateBtn.addEventListener('click', backupState);

if (importCsvBtn && importCsvInput) {
    importCsvBtn.addEventListener('click', () => importCsvInput.click());
    importCsvInput.addEventListener('change', handleCSVImport);
}

if (restoreStateBtn && restoreInput) {
    restoreStateBtn.addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', handleRestoreState);
}

if (searchLedgerInput) {
    searchLedgerInput.addEventListener('input', e => {
        currentSearchQuery = e.target.value;
        currentPage = 1;
        if (clearSearchBtn) clearSearchBtn.classList.toggle('hidden', !currentSearchQuery);
        renderLedger();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        currentSearchQuery = '';
        if (searchLedgerInput) searchLedgerInput.value = '';
        clearSearchBtn.classList.add('hidden');
        currentPage = 1;
        renderLedger();
    });
}

filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentTypeFilter = pill.dataset.type || 'all';
        currentPage = 1;
        renderLedger();
    });
});

if (filterPeriodSelect) {
    filterPeriodSelect.addEventListener('change', e => {
        currentPeriodFilter = e.target.value;
        // Clear date range when period selected
        if (e.target.value !== 'all') {
            dateFrom = '';
            dateTo = '';
            if (dateFromInput) dateFromInput.value = '';
            if (dateToInput)   dateToInput.value = '';
            if (clearDateRangeBtn) clearDateRangeBtn.classList.add('hidden');
        }
        currentPage = 1;
        renderLedger();
    });
}

if (filterCategorySelect) {
    filterCategorySelect.addEventListener('change', e => {
        currentCategoryFilter = e.target.value;
        currentPage = 1;
        renderLedger();
    });
}

// ─── Command Palette ──────────────────────────────────────────
const CMD_COMMANDS = [
    { id: 'demo',      label: 'Load Demo Data',     icon: 'sparkles',      shortcut: '',       action: () => loadDemoData() },
    { id: 'clear',     label: 'Clear All Data',      icon: 'trash-2',       shortcut: '',       action: () => clearAllData() },
    { id: 'export-csv',label: 'Export CSV',           icon: 'download',      shortcut: '',       action: () => exportToCSV() },
    { id: 'export-pdf',label: 'Export PDF Report',    icon: 'file-text',     shortcut: '',       action: () => exportToPDF() },
    { id: 'backup',    label: 'Backup State (JSON)',  icon: 'archive',       shortcut: '',       action: () => backupState() },
    { id: 'theme',     label: 'Toggle Theme',         icon: 'sun-moon',      shortcut: 'T',      action: () => { isDarkMode = !isDarkMode; localStorage.setItem('finsight_theme', isDarkMode ? 'dark' : 'light'); applyTheme(isDarkMode); } },
    { id: 'reset',     label: 'Reset All Filters',    icon: 'filter-x',      shortcut: '',       action: () => resetFilters() },
];

let cmdSelectedIdx = -1;
let cmdFiltered = [...CMD_COMMANDS];

function openCommandPalette() {
    if (!cmdPalette) return;
    cmdPalette.classList.remove('hidden');
    if (cmdInput) { cmdInput.value = ''; cmdInput.focus(); }
    cmdSelectedIdx = -1;
    renderCmdList(CMD_COMMANDS);
    document.body.style.overflow = 'hidden';
}

function closeCommandPalette() {
    if (!cmdPalette) return;
    cmdPalette.classList.add('hidden');
    document.body.style.overflow = '';
}

function renderCmdList(cmds) {
    if (!cmdList) return;
    cmdFiltered = cmds;
    cmdList.innerHTML = '';
    if (cmds.length === 0) {
        cmdList.innerHTML = '<li class="cmd-empty">No matching commands</li>';
        return;
    }
    cmds.forEach((cmd, idx) => {
        const li = document.createElement('li');
        li.className = `cmd-item${idx === cmdSelectedIdx ? ' selected' : ''}`;
        li.innerHTML = `
            <i data-lucide="${cmd.icon}" class="cmd-icon"></i>
            <span class="cmd-label">${cmd.label}</span>
            ${cmd.shortcut ? `<kbd class="cmd-kbd">${cmd.shortcut}</kbd>` : ''}
        `;
        li.addEventListener('click', () => { executeCmdItem(cmd); });
        li.addEventListener('mouseenter', () => { cmdSelectedIdx = idx; updateCmdSelection(); });
        cmdList.appendChild(li);
    });
    lucide.createIcons();
}

function updateCmdSelection() {
    const items = cmdList?.querySelectorAll('.cmd-item');
    items?.forEach((el, i) => el.classList.toggle('selected', i === cmdSelectedIdx));
}

function executeCmdItem(cmd) {
    closeCommandPalette();
    setTimeout(() => cmd.action(), 100);
}

if (cmdInput) {
    cmdInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = CMD_COMMANDS.filter(c => c.label.toLowerCase().includes(q));
        cmdSelectedIdx = -1;
        renderCmdList(filtered);
    });

    cmdInput.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            cmdSelectedIdx = Math.min(cmdSelectedIdx + 1, cmdFiltered.length - 1);
            updateCmdSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            cmdSelectedIdx = Math.max(cmdSelectedIdx - 1, 0);
            updateCmdSelection();
        } else if (e.key === 'Enter') {
            if (cmdSelectedIdx >= 0 && cmdFiltered[cmdSelectedIdx]) executeCmdItem(cmdFiltered[cmdSelectedIdx]);
        } else if (e.key === 'Escape') {
            closeCommandPalette();
        }
    });
}

if (cmdPalette) cmdPalette.addEventListener('click', e => { if (e.target === cmdPalette) closeCommandPalette(); });

// Ctrl+K / Cmd+K trigger
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (cmdPalette?.classList.contains('hidden')) openCommandPalette();
        else closeCommandPalette();
    }
    if (e.key === 'Escape' && cmdPalette && !cmdPalette.classList.contains('hidden')) {
        closeCommandPalette();
    }
});

// Command palette trigger button
const cmdTriggerBtn = document.getElementById('cmd-palette-trigger');
if (cmdTriggerBtn) cmdTriggerBtn.addEventListener('click', openCommandPalette);

// ─── Core Init ────────────────────────────────────────────────
function init() {
    updateCategoryFilterOptions();
    renderLedger();
    updateValues();
    lucide.createIcons();
    updateCharts();
}

form.addEventListener('submit', addTransaction);

// ─── PWA Service Worker ───────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

// ─── Initial Render ───────────────────────────────────────────
init();