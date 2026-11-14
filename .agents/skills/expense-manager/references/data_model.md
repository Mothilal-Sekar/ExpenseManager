# Expense Manager Data Models & Schema Reference

## Primary Entities

### 1. Account
```typescript
interface Account {
  id: string;               // e.g. "acc_hdfc_bank", "acc_cash_wallet"
  name: string;             // Display name (e.g. "HDFC Salary")
  type: 'BANK' | 'CARD' | 'CASH_WALLET';
  bankName?: string;        // e.g. "HDFC Bank", "Chase"
  accountNumberLast4?: string;
  currentBalance: number;   // Current net balance
  isDeleted: boolean;       // Soft deletion flag
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

### 2. Transaction
```typescript
interface Transaction {
  id: string;
  bookId: string;           // Belongs to a Book ledger (or "book_personal")
  type: 'EXPENSE' | 'INCOME' | 'SELF_TRANSFER' | 'ADJUSTMENT';
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  remark: string;
  dateTime: string;         // ISO timestamp e.g. "2026-10-24T14:30:00.000Z"
  mode: 'CASH' | 'CARD' | 'BANK' | 'UPI';
  sourceAccountId: string;  // Debited/Credited account
  destinationAccountId?: string; // Credited account if type is SELF_TRANSFER
  skipBalanceUpdate: boolean;    // If true, balance is not touched
  createdAt: number;
  updatedAt: number;
  syncedToSheets?: boolean;
}
```

### 3. Book (Ledger)
```typescript
interface Book {
  id: string;
  name: string;             // e.g. "Personal Ledger", "Shared Household"
  description?: string;
  color: string;            // Hex color code
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 4. Reminder
```typescript
interface Reminder {
  id: string;
  bookId: string;
  type: 'WILL_GET' | 'WILL_PAY';
  counterpartyName: string; // Counterparty person/vendor
  amount: number;
  dueDate: string;          // "YYYY-MM-DD"
  status: 'PENDING' | 'SETTLED';
  notes?: string;
  settledTransactionId?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 5. Category & Subcategory
```typescript
interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  icon: string;
  color: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
}
```
