# 💰 Personal Finance & Expense Manager

A modern, offline-first personal finance and expense tracking mobile application built with **React Native**, **Expo SDK 58**, and **TypeScript**. Designed for individuals and families to seamlessly track cash flow, manage multiple bank accounts, plan monthly budgets, organize debt/EMI schedules, and sync in real time across devices or export directly to Google Sheets and Excel.

---

## 🌟 Key Features

### 📅 1. Streamlined Modern Calendar Picker
- **Clutter-Free Date Selection**: Minimalist, mobile-first calendar picker inspired by modern fintech apps.
- **Instant "Today"**: Single-tap jump button in the header resets the date to the current day.
- **Intuitive Month & Year Navigation**:
  - `‹` and `›` chevrons for rapid month stepping.
  - Tapping the month header (e.g. `November 2026 ▾`) opens an overlay with a year stepper (`‹ 2026 ›`), quick decade chips (`1990`, `2000`, `2010`, `2020`, `2024`, `2025`, `2026`, `2030`, `2040`, `2050`), and a 3×4 month selection grid.
- **Ultra-Compact Time Selector**: Single-line digital time stepper with 5-minute intervals and AM/PM segmented pills.
- **Universal Date Picker**: Interactive date picker applied consistently across transactions, history filters, debt due dates, payment settlements, and export dialogs.

### 📊 2. Category & Subcategory Expense Viewer
- **Click to Inspect**: Tapping any category or subcategory chip on the Settings screen or Category Manager instantly opens a dedicated **Category Expenses Modal**.
- **Interactive Breakdown**:
  - Live summary of total spent, total received, and transaction counts.
  - Subcategory filter chips (`All`, `Groceries (4)`, `Restaurants (2)`...).
  - Instant search filtering by remark, note, account, or amount.
- **Inline Transaction Reassignment**: Each transaction card includes a **Move** button to reassign that specific transaction to another category or subcategory on the fly.

### 🛡️ 3. Safe Delete Guard & Reassign Workflow
- **Deletion Protection**: Deletion of categories or subcategories with active transactions is blocked to prevent broken references or orphaned records.
- **Impact Warning**: Alerts the user with the exact count and total amount of linked transactions.
- **1-Tap Bulk Migration**:
  - **For Categories**: Reassign all transactions in bulk to a chosen destination category (and optional subcategory) and delete the old category in one click via `reassignCategoryTransactions()`.
  - **For Subcategories**: Reassign transactions to another subcategory within the parent category or clear the subcategory tag via `reassignSubcategoryTransactions()`.
- **View Details**: Shortcut to inspect linked transactions in detail prior to confirming.

### 🔄 4. Real-Time Multi-Device Sync for Spouses & Families
- **Shared Household Room**: Connect multiple devices (phones, tablets) using a shared **Household Sync Key** (e.g., `family-shared-vault`).
- **2-Way Cloud Synchronization**: Powered by Firebase Firestore listeners with 1–2 second sync latency.
- **Offline-First Resilience**: Transactions recorded while offline (e.g., in a basement grocery store) are queued locally in `AsyncStorage` and auto-merged using deterministic Last-Write-Wins (LWW) conflict resolution upon reconnection.
- **Native Share Key**: One-tap native share sheet to send the Household Sync Key directly via WhatsApp, SMS, or Telegram.

### 📖 5. Multi-Ledger Books
- **Distinct Accounting Books**: Organize finances into separate ledgers (e.g., **Personal**, **Household & Family**, **Business & Freelance**).
- **In-Ledger Quick Entry**: Direct `+ Add Entry to [Ledger]` shortcut button inside each ledger.
- **Isolated Metrics**: Cash flow, inflow, outflow, and net balance calculated per ledger.

### 🤝 6. Debts & Accounts Book ("You Will Get" / "You Will Pay")
- **Loan & Borrowing Tracking**: Track money lent to others ("You Will Get") and borrowed amounts/EMIs ("You Will Pay").
- **EMI & Due Date Management**: Track installment amounts, next due dates, and repayment frequencies (One-Time, Monthly, Quarterly, Yearly).
- **Settlement Workflows**: Record partial payments or full settlements with automatic account balance updates and auditable ledger entries.

### 🎯 7. Monthly Budget Planning & Analytics
- **Category Budget Allocation**: Set monthly spending targets per category.
- **Dynamic Visual Progress Bars**: Color-coded spending progress (Normal `< 75%`, Warning `75%–90%`, Alert `> 90%` in Coral).
- **Synchronized Breakdowns**: Monthly analytics on Home and History screens dynamically adapt when switching months on the calendar strip.

### 🏛️ 8. Bank Accounts & Auto-Reconciliation
- **Supported Account Types**: Savings, Salary, Current/Biz, Credit Card, Debit Card, Cash Wallet, and Investments.
- **Configurable Bank Categories**: Customize bank category tags with visual badges.
- **Deterministic Delta Accounting**: Atomic balance updates on create, edit (rollback + apply), and delete.
- **Auditable Empty Balance**: Emptying an account logs an explicit `ADJUSTMENT` entry rather than silently overwriting values.

### 📑 9. Cloud Sheets & Excel/CSV Export
- **Automated Google Sheets**: Creates monthly workbooks (`Expense_Report_YYYY_MM`) with:
  - **Tab 1: Transactions**: Complete chronological log of all transactions.
  - **Tab 2: Expense Dashboard**: KPI summary cards, Category Breakdown pivot tables, and Doughnut/Column spending charts.
- **Excel & CSV Downloads**: Export selected ledgers across custom date ranges or monthly presets.

### ⚡ 10. High-Performance Memory Pagination
- **30-Record Memory Cap**: History list renders only the first 30 transactions by default to guarantee 60fps performance and low memory consumption even with 1,000+ records.
- **Incremental Windowing**: "Load 30 More" and "Show All" controls with a "Restore Limit" toggle.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [React Native](https://reactnative.dev/) 0.88 with [Expo SDK 58](https://expo.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 6.0 |
| **Local Storage** | [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage) |
| **Cloud Database** | [Firebase Firestore](https://firebase.google.com/docs/firestore) 13.1 |
| **Authentication** | [expo-auth-session](https://docs.expo.dev/versions/latest/sdk/auth-session/) (Google OAuth 2.0) |
| **Cloud Export** | Google Sheets API v4 & Google Drive API v3 |
| **Vector Icons** | [@expo/vector-icons](https://icons.expo.fyi/) (Ionicons) |
| **SVG & Graphics** | [react-native-svg](https://github.com/software-mansion/react-native-svg) |
| **Safe Areas** | [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) |

---

## 📂 Project Structure

```
ExpenseManager/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── DatePickerModal.tsx           # Universal streamlined calendar & time picker
│   │   │   └── SummaryCard.tsx               # Top-level financial metric cards
│   │   ├── debts/
│   │   │   └── DebtDetailModal.tsx           # Loan detail & EMI settlement dialog
│   │   ├── home/
│   │   │   ├── CalendarStrip.tsx             # Interactive Home calendar strip & date selector
│   │   │   ├── DayTransactionsList.tsx       # Transactions for the selected calendar date
│   │   │   ├── ExpenseCharts.tsx             # Category spending breakdown & visual distribution
│   │   │   ├── MonthlyBudgetCard.tsx         # Budget progress & alert card
│   │   │   └── MonthlyBudgetModal.tsx        # Budget planning & category allocation modal
│   │   ├── settings/
│   │   │   ├── CategoryManagementModal.tsx   # Category/subcategory manager with 58 icons
│   │   │   ├── CategoryExpensesModal.tsx     # Drilldown viewing expenses by category/subcategory
│   │   │   └── CategoryDeleteGuardModal.tsx  # Deletion protection & bulk transaction reassign
│   │   ├── sheets/
│   │   │   └── GoogleSheetsExportModal.tsx   # Google Sheets & Excel/CSV export dialog
│   │   └── transaction/
│   │       └── TransactionEntryModal.tsx     # Add/Edit transaction with account & category selectors
│   ├── constants/
│   │   ├── defaults.ts                       # Default categories, books, accounts, and settings
│   │   └── theme.ts                          # Color palette, spacing, and typography
│   ├── context/
│   │   └── AppContext.tsx                    # Central application state, mutation handlers, & sync
│   ├── screens/
│   │   ├── BooksScreen.tsx                   # Ledger books list & in-ledger view
│   │   ├── DebtsScreen.tsx                   # "You Will Get" & "You Will Pay" loan manager
│   │   ├── HistoryScreen.tsx                 # Paginated transaction history & date filters
│   │   ├── HomeScreen.tsx                    # Dashboard, calendar, and recent activity
│   │   └── SettingsScreen.tsx                # App configuration, Google OAuth, & family sync
│   ├── services/
│   │   ├── dateUtils.ts                      # Calendar matrix generation & date formatting
│   │   ├── firestoreService.ts               # Real-time multi-device Firestore subscriptions
│   │   ├── googleAuthService.ts              # OAuth2 authentication with Google
│   │   ├── googleSheetsService.ts            # Google Sheets provisioning & chart generation
│   │   ├── storage.ts                        # Offline AsyncStorage persistence layer
│   │   └── syncService.ts                    # Sync engine coordinating local & cloud state
│   └── types/
│       └── index.ts                          # TypeScript interfaces and domain schemas
├── .agents/
│   └── skills/
│       └── expense-manager/
│           ├── SKILL.md                      # Comprehensive development skill documentation
│           └── references/                   # Accounting engine, data models, & export specs
├── App.tsx                                   # Main application root with safe area navigation
├── app.json                                  # Expo app configuration
├── package.json                              # Project dependencies & scripts
└── tsconfig.json                             # TypeScript compiler configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Expo Go](https://expo.dev/go) app installed on your iOS or Android device

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/your-username/ExpenseManager.git
   cd ExpenseManager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Run the app:
   - **On physical phone**: Scan the QR code using the Expo Go app (Android) or Camera app (iOS).
   - **On Web Browser**: Press `w` in the terminal or run `npx expo start --web`.
   - **On Android Emulator**: Press `a` in the terminal.
   - **On iOS Simulator**: Press `i` in the terminal (macOS required).

---

## ⚙️ Configuration & Integrations

### 1. Google Cloud OAuth Setup (Google Sheets Export)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Sheets API** and **Google Drive API**.
3. Under **APIs & Services > Credentials**, create an **OAuth 2.0 Client ID** (Web application).
4. Add authorized redirect URIs:
   - `https://auth.expo.io/@your-expo-username/expensemanager`
5. Copy your **OAuth Client ID** and paste it into **Settings > Google Sheets & Drive Cloud Sync** in the app.

### 2. Firebase Firestore Setup (Multi-Device Family Sync)
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Under **Build > Firestore Database**, create a database in production mode.
3. Configure Firestore Security Rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /household_vaults/{householdKey}/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. Copy your Firebase web configuration (`apiKey`, `authDomain`, `projectId`, `appId`) into `src/services/firestoreService.ts` or set environment variables.

### 3. Multi-Device Family Sharing
1. Device 1: Open **Settings > Multi-Device Family Sync**.
2. Enter a shared room key (e.g., `sharma-family-2026`).
3. Tap **Share Key** to send the key via WhatsApp/SMS to your spouse.
4. Device 2: Enter the exact same key in Settings. Both devices are now linked with real-time 2-way syncing!

---

## 🧪 Verification & Quality Checks

Run the TypeScript typecheck before committing any code:

```bash
# Verify 0 type errors across the entire codebase
npx tsc --noEmit
```

Diagnose Expo dependency compatibility:
```bash
npx expo-doctor
```

---

## 📄 License
This project is private and licensed for personal and family use.
