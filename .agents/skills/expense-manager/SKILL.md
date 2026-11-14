---
name: expense-manager
description: >-
  Provides end-to-end guidance, domain data models, balance computation logic, offline-first sync procedures,
  realtime Google OAuth and Sheets/Firestore synchronization, and ledger entry workflows for the Personal Finance app.
---

# Personal Finance & Expense Manager Skill

Use this skill when developing, refactoring, or verifying features for the Personal Finance & Expense Manager application.

## Core Architecture Principles

1. **Deterministic Double-Entry & Delta Accounting**:
   - Accounts carry their own balance: Cash Wallet (`acc_cash_wallet`), Banks, Cards.
   - Transactions mutate balances via atomic deltas unless `skipBalanceUpdate: true`.
   - **Self Transfer**: Debits source account and credits destination account (e.g. Bank to Cash Wallet).
   - **Empty Balance**: Never hard-resets silently. Always logs an auditable `ADJUSTMENT` transaction and sets balance to 0.

2. **Direct Ledger Selection & In-Ledger Entry**:
   - The Ledger Books tab allows users to select any ledger book.
   - A direct **`+ Add Entry to [Ledger Name]`** button opens the transaction modal prefilled with that `bookId`.
   - Displays ledger-specific inflow/outflow metrics and ledger-specific entries list.

3. **Universal Editing & Bank Categories Across All Modules**:
   - **Transactions**: Rollback old account balances and apply new balance deltas automatically on edit.
   - **Ledger Books & Reminders**: Full edit and delete options for books and reminders with settlement actions.
   - **Bank Accounts**: Configurable bank categories (`SAVINGS`, `SALARY`, `CURRENT`, `CREDIT_CARD`, `DEBIT_CARD`, `WALLET`, `INVESTMENT`) with visual badges and category switching in the Edit Account dialog.
   - **Categories & Subcategories**: Customization dialogs for editing category names, types, colors, icons, and inline subcategory editing/deletion.

4. **Realtime Google Account & Cloud Sync**:
   - **Google OAuth 2.0**: Authenticates user via `expo-auth-session` with Google Sheets and Google Drive scopes.
   - **Live Google Sheets Export**: Proactively provisions and updates monthly sheets (`Expense_Report_YYYY_MM`) with Tab 1 ("Transactions") and Tab 2 ("Expense Dashboard").
   - **Google Firestore Realtime Database**: `onSnapshot` listener syncs cross-device updates in real time.
   - **Offline-First Resilience**: Local caching with `@react-native-async-storage/async-storage` provides instant UI updates even when disconnected.

4. **Safe Area & Responsive Layout**:
   - Root layout utilizes `useSafeAreaInsets()` to apply `paddingTop: insets.top` and `paddingBottom: insets.bottom`, preventing status bar and bottom gesture bar overlaps on all mobile devices.

---

## Verification & Commands

```bash
# Typecheck
npx tsc --noEmit

# Start development server
npx expo start

# Run on web browser
npx expo start --web
```
