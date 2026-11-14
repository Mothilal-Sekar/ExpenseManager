---
name: expense-manager
description: >-
  Provides end-to-end guidance, domain data models, balance computation logic, offline-first sync procedures,
  realtime Google OAuth and Sheets/Firestore synchronization, and ledger entry workflows for the Personal Finance app.
---

# Personal Finance & Expense Manager Skill

Use this skill when developing, refactoring, or verifying features for the **Personal Finance & Expense Manager** application.

---

## 1. Accounting Architecture & Balance Engine

### A. Atomic Delta Mutations
Accounts maintain their own live balances (Cash Wallet `acc_cash_wallet`, Banks, Cards, Investments). Every transaction mutates account balances via deterministic deltas unless explicitly marked with `skipBalanceUpdate: true`:

| Transaction Type | Condition | Source Account Balance | Destination Account Balance |
| :--- | :--- | :--- | :--- |
| **EXPENSE** | `skipBalanceUpdate: false` | `- amount` | N/A |
| **INCOME** | `skipBalanceUpdate: false` | `+ amount` | N/A |
| **SELF_TRANSFER** | `skipBalanceUpdate: false` | `- amount` | `+ amount` |
| **ADJUSTMENT** | `skipBalanceUpdate: false` | `- amount` | N/A |
| **ANY** | `skipBalanceUpdate: true` | **Unchanged (0)** | **Unchanged (0)** |

### B. Transaction Reverting on Edit / Delete
When modifying an existing transaction:
1. Roll back the original transaction deltas via `revertTransactionFromAccounts(accounts, originalTx)`.
2. Apply the updated transaction deltas via `applyTransactionToAccounts(rolledBackAccounts, updatedTx)`.
3. Persist the updated transaction list and account balances atomically.

### C. Auditable Empty Balance
Never silently overwrite `account.currentBalance = 0`. Always generate an auditable `ADJUSTMENT` transaction for `Math.abs(account.currentBalance)` with remark `"Emptied account balance (was X)"`.

---

## 2. Streamlined Calendar & Time Picker UX Standards

All date and date-time pickers must adhere to the mobile-first, clutter-free standard established in [`DatePickerModal.tsx`](file:///D:/Projects/ExpenseManager/src/components/common/DatePickerModal.tsx) and [`CalendarStrip.tsx`](file:///D:/Projects/ExpenseManager/src/components/home/CalendarStrip.tsx):

- **Header**: Clean title, formatted human-readable date subtitle (e.g., `Fri, 14 Nov 2026`), instant **`Today`** reset button, and close `✕` button.
- **Month & Year Navigation**:
  - `‹` and `›` chevrons for rapid month stepping.
  - Tapping the month title (e.g. `November 2026 ▾`) toggles between the days view and the month/year selection grid.
  - Year selector uses a stepper `‹ 2026 ›` with instant decade chips (`1990`, `2000`, `2010`, `2020`, `2024`, `2025`, `2026`, `2030`, `2040`, `2050`).
- **Days Grid**: 38px circular touch targets. Selected date uses a solid blue circle (`#2563EB`) with white text. Today has an outline ring.
- **Compact Time Selector** (`mode="datetime"`): A single 38px inline row (`Time: [ - 08 + ] : [ - 30 + ] [ AM | PM ]`). Avoid giant multi-card time pickers.
- **Universal Reusability**: Use `DatePickerModal` across transactions, history filters, debt due dates, and export date ranges. Do not use raw text inputs for dates.

---

## 3. Category & Subcategory Management Protocol

### A. Click-to-View Expenses
- Tapping any Category or Subcategory opens [`CategoryExpensesModal.tsx`](file:///D:/Projects/ExpenseManager/src/components/settings/CategoryExpensesModal.tsx).
- Displays total spent/received, transaction count, subcategory filter pills, search keyword filtering, and an inline **Move** button on each transaction to reassign it individually.

### B. Safe Deletion & Bulk Reassignment Guard
When deleting a category or subcategory, always check for active linked transactions:

```typescript
// Category check:
const linkedTxs = transactions.filter(t => t.categoryId === cat.id || t.categoryId === cat.name);

// Subcategory check:
const linkedSubTxs = transactions.filter(
  t => (t.categoryId === catId || (cat && t.categoryId === cat.name)) &&
       (t.subcategoryId === sub.id || t.subcategoryId === sub.name)
);
```

- **If 0 transactions**: Allow standard delete confirmation.
- **If > 0 transactions**: Block immediate deletion and launch [`CategoryDeleteGuardModal.tsx`](file:///D:/Projects/ExpenseManager/src/components/settings/CategoryDeleteGuardModal.tsx).
  - Displays a warning with transaction count and total amount.
  - Allows selecting a destination category and subcategory.
  - Executes `reassignCategoryTransactions()` or `reassignSubcategoryTransactions()` from `AppContext` to migrate transactions in bulk before deleting.

---

## 4. Multi-Device Real-Time Sync & Conflict Resolution

- **Shared Household Key**: Devices connect to a shared Firestore room under `/household_vaults/{householdSyncId}/` (e.g., `family-shared-vault`).
- **2-Way Synchronization**:
  - `subscribeToFirestoreTransactions`, `subscribeToFirestoreAccounts`, `subscribeToFirestoreReminders` listen to real-time snapshot events.
  - Remote changes merge into local `AsyncStorage` cache within 1–2 seconds.
- **Offline-First & Conflict Resolution**:
  - Offline changes are queued locally.
  - When connection is restored, changes merge using deterministic Last-Write-Wins (LWW) based on `tx.updatedAt` timestamps.

---

## 5. Google Cloud OAuth & Google Sheets Export Engine

- **OAuth 2.0 Flow**: Handled via `expo-auth-session` with scopes `https://www.googleapis.com/auth/spreadsheets` and `https://www.googleapis.com/auth/drive.file`.
- **Workbook Architecture**:
  - File name pattern: `Expense_Report_YYYY_MM`.
  - **Tab 1: Transactions**: Detailed chronological transaction log (ID, Date, Time, Type, Category, Subcategory, Amount, Mode, Account, Destination, Book, Skip Balance, Remarks).
  - **Tab 2: Expense Dashboard**: Automated KPI cards (Income, Expense, Net Savings, Savings Rate), Category Breakdown pivot formulas (`=SUMIFS(...)`), and Doughnut/Column spending charts.

---

## 6. High-Performance Pagination Standard

To ensure fluid 60fps performance on mobile devices with 1,000+ transaction records:
- History screen lists must enforce a default **30-record window cap**.
- Render a pagination banner showing `Showing 30 of X transactions (Memory optimized)`.
- Provide **Load 30 More** and **Show All** controls with a **Restore Limit** toggle.
- Avoid rendering large unbounded transaction lists without virtualization.

---

## 7. Quality Verification & Diagnostic Commands

Always run TypeScript typecheck before declaring any task complete:

```bash
# Verify 0 compilation or type diagnostics
npx tsc --noEmit

# Start Expo dev server
npx expo start

# Run on web
npx expo start --web
```
