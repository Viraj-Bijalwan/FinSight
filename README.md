# FinSight — Real-Time Personal Finance & Ledger Simulator

> **A Privacy-First, Zero-Database Financial Dashboard built for Real-Time Clarity and Offline Sovereignty.**

---

## 🌟 Key Architectural & Design Highlights

### 1. 🔒 Local-First State & Zero-Database Architecture
- **Browser-Bound Storage:** All financial transactions, user preferences, and theme states persist directly inside `localStorage` under keys `finsight_tx` and `finsight_theme`.
- **Absolute Privacy:** Zero data leaves the client. No remote server, tracking scripts, or external databases are required.
- **Reactive UI Loop:** A unified reactive lifecycle (`init()` $\rightarrow$ `renderLedger()` $\rightarrow$ `updateValues()` $\rightarrow$ `updateCharts()`) guarantees instant metric and visual updates with sub-millisecond response times.

### 2. 🎨 Design System & Dual Theme Palette
- **Light Theme (Warm Slate & Emerald):** High-contrast, clean typography inspired by Notion and Linear with warm slate surfaces (`#F5F4F0`) and crisp card lift.
- **Dark Theme (Deep Charcoal & Mint):** GitHub/Vercel-inspired deep slate (`#000000` / `#161B22`) with mint accents (`#34D399`) and violet highlights.
- **Visual Depth & Motion:**
  - Dynamic 3D perspective card physics responsive to mouse position.
  - Radial dot-grid background overlay with center vignette.
  - Smooth floating ambient gradient orbs with hardware-accelerated CSS keyframe transitions.

### 3. 📊 High-Fidelity Financial Analytics
- **Live Flow Comparison:** Bar chart rendering instantaneous income vs. expense breakdowns.
- **Expense Allocation Doughnut:** Category-based distribution rendering dynamic spending slices.
- **Savings Rate Metric:** Live calculation:
  $$\text{Savings Rate} = \frac{\text{Income} - \text{Expenses}}{\text{Income}} \times 100\%$$
- **Dynamic Budget Health Score:** Real-time ratio analysis with contextual tooltips:
  - **Excellent:** $\le 50\%$ spent
  - **Good:** $\le 80\%$ spent
  - **Warning:** $\le 100\%$ spent
  - **Critical:** $> 100\%$ spent (Deficit)
- **Financial Intelligence Panel:** Automatic computation of Top Expense Category, Average Transaction Size, and Net Cash Flow run-rate.

### 4. ⚡ Complete CRUD & Data Management
- **Full CRUD Lifecycle:** Create, Read, Update (Inline Editing with form auto-population and visual pulse), and Delete.
- **Multi-Vector Ledger Filtering:**
  - Instant text search across descriptions, categories, amounts, and dates.
  - Type toggle pills (`All` | `Income` | `Expense`).
  - Time period filter (`All Time`, `This Month`, `Last 30 Days`, `This Year`).
  - Dynamic category selector based on active transaction tags.
- **Data Sovereignty:**
  - One-click **Export to CSV** with RFC-compliant quote escaping.
  - One-click **Import from CSV** to restore or migrate datasets.
  - One-click **Demo Data loader** for instant hackathon evaluations (9 balanced sample records).
  - Quick **Clear All Data** action with safety confirmation.

### 5. 🌐 Standardized Currency & Small-Screen Optimization
- **`Intl.NumberFormat` Integration:** Standardized USD currency formatting across all cards, charts, and ledger items.
- **Responsive Sticky Navigation:** Responsive height-based media queries preventing floating header overlap during scrolling across all viewport heights.

---

## 🚀 Quick Start
1. Open `index.html` in any modern web browser.
2. Click **"Enter Dashboard"**.
3. Click **"Load Demo Data"** to instantly view populated analytics and charts, or add custom transactions.
