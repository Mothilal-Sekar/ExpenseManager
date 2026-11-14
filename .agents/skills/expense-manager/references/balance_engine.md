# Balance Engine & Accounting Rules Reference

## Balance Mutation Matrix

Whenever a transaction is created, updated, or deleted, account balances are adjusted according to this matrix:

| Transaction Type | Condition | Source Account Balance | Destination Account Balance |
| :--- | :--- | :--- | :--- |
| **EXPENSE** | `skipBalanceUpdate: false` | `- amount` | N/A |
| **INCOME** | `skipBalanceUpdate: false` | `+ amount` | N/A |
| **SELF_TRANSFER** | `skipBalanceUpdate: false` | `- amount` | `+ amount` |
| **ADJUSTMENT** | `skipBalanceUpdate: false` | `- amount` | N/A |
| **ANY** | `skipBalanceUpdate: true` | **Unchanged (0)** | **Unchanged (0)** |

---

## Special Accounting Operations

### 1. Emptying a Bank Balance
- Emptying an account balance MUST NOT simply overwrite `account.currentBalance = 0`.
- Instead, create an auditable `ADJUSTMENT` transaction:
  - `type: 'ADJUSTMENT'`
  - `amount: Math.abs(account.currentBalance)`
  - `remark: "Emptied account balance (was X)"`
  - `sourceAccountId: account.id`
  - `skipBalanceUpdate: false`
- This ensures that monthly cash flow reports and Google Sheets reconcile accurately.

### 2. Deleted Account Integrity
- Bank accounts are soft-deleted: `isDeleted: true`.
- Historical transactions retain their original `sourceAccountId`.
- UI resolver function:
  ```typescript
  export function resolveAccountName(accountId: string | undefined, accounts: Account[]) {
    if (!accountId) return { name: 'Uncategorised bank', isUncategorised: true };
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc || acc.isDeleted) return { name: 'Uncategorised bank', isUncategorised: true };
    return { name: acc.bankName || acc.name, isUncategorised: false };
  }
  ```

### 3. Reverting Transactions
- When editing or deleting a transaction, always call `revertTransactionFromAccounts` first to roll back the exact deltas before applying the updated transaction.
