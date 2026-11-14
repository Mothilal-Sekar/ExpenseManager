# Google Sheets Monthly Export Specification Reference

## File Naming Convention
- One workbook per month: `Expense_Report_YYYY_MM` (e.g. `Expense_Report_2026_10`).
- Generated in the user's connected Google Drive account under the `ExpenseManager/` folder.

---

## Tab 1: "Transactions"

Contains all transactions recorded in the target month with formatted headers:

| Col # | Header Name | Format | Example |
| :--- | :--- | :--- | :--- |
| **A** | `Transaction ID` | Monospace Text | `tx_1729801234_abc` |
| **B** | `Date` | `YYYY-MM-DD` | `2026-10-24` |
| **C** | `Time` | `HH:mm:ss` | `14:30:00` |
| **D** | `Type` | Text | `EXPENSE` / `INCOME` / `SELF_TRANSFER` |
| **E** | `Category` | Text | `Food & Dining` |
| **F** | `Subcategory` | Text | `Groceries` |
| **G** | `Amount` | Currency | `$45.00` |
| **H** | `Mode` | Text | `CARD` / `CASH` / `BANK` / `UPI` |
| **I** | `Account / Bank` | Text | `HDFC Bank` or `Uncategorised bank` |
| **J** | `Destination Account` | Text | `Cash Wallet` (if Self Transfer) |
| **K** | `Book` | Text | `Personal Ledger` |
| **L** | `Skip Balance` | Boolean | `TRUE` / `FALSE` |
| **M** | `Remarks` | Text | `Supermarket weekly purchase` |

---

## Tab 2: "Expense Dashboard"

### 1. KPI Formulas
- **Monthly Income**: `=SUMIFS(Transactions!G:G, Transactions!D:D, "INCOME")`
- **Monthly Expense**: `=SUMIFS(Transactions!G:G, Transactions!D:D, "EXPENSE")`
- **Net Monthly Savings**: `=B2 - B3`
- **Savings Rate**: `=IF(B2>0, (B2-B3)/B2, 0)`

### 2. Category Breakdown Pivot Table
- Category list with `=SUMIFS(Transactions!G:G, Transactions!E:E, CategoryCell, Transactions!D:D, "EXPENSE")`
- Calculated percentage of total expenditure: `=ExpenseCell / TotalExpenseCell`.

### 3. Charts Embedded
- **DoughnutChart**: Category expense distribution.
- **ColumnChart**: Daily spending trajectory across days 1–31.
