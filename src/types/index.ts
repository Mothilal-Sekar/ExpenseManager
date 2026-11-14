export type TransactionMode = 'CASH' | 'CARD' | 'BANK' | 'UPI';
export type TransactionType = 'EXPENSE' | 'INCOME' | 'SELF_TRANSFER' | 'ADJUSTMENT';
export type AccountType = 'BANK' | 'CARD' | 'CASH_WALLET';
export type AccountCategory =
  | 'SAVINGS'
  | 'SALARY'
  | 'CURRENT'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'WALLET'
  | 'INVESTMENT';
export type ReminderType = 'WILL_GET' | 'WILL_PAY';
export type ReminderStatus = 'PENDING' | 'SETTLED';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  accountCategory?: AccountCategory;
  bankName?: string;
  accountNumberLast4?: string;
  currentBalance: number;
  isDeleted: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  icon: string;
  color: string;
  subcategories: Subcategory[];
}

export interface Transaction {
  id: string;
  bookId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  subcategoryId?: string;
  remark: string;
  dateTime: string; // ISO string e.g. "2026-10-24T14:30:00.000Z"
  mode: TransactionMode;
  sourceAccountId: string;
  destinationAccountId?: string; // For SELF_TRANSFER
  skipBalanceUpdate: boolean;
  createdAt: number;
  updatedAt: number;
  syncedToSheets?: boolean;
}

export interface Book {
  id: string;
  name: string;
  description?: string;
  color: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AccountPayment {
  id: string;
  amount: number;
  date: string; // ISO string e.g. "2026-10-26"
  accountId: string;
  transactionId?: string;
  note?: string;
}

export interface Reminder {
  id: string;
  bookId: string;
  type: ReminderType; // WILL_GET ("You will get / Given money") or WILL_PAY ("You will pay / Loan / EMI")
  counterpartyName: string;
  amount: number; // Total / Principal amount
  paidAmount?: number; // Total paid/received so far
  isEmi?: boolean; // True if paying/receiving in installments/EMIs
  emiAmount?: number; // Installment / EMI amount per cycle
  frequency?: 'MONTHLY' | 'WEEKLY' | 'ONE_TIME';
  dueDate: string; // Next due date for timely notification (e.g. "2026-10-31")
  status: ReminderStatus;
  notes?: string;
  settledTransactionId?: string;
  paymentHistory?: AccountPayment[];
  createdAt: number;
  updatedAt: number;
}

export type FirstDayOfWeek = 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday

export interface UserSettings {
  firstDayOfWeek: FirstDayOfWeek;
  currencySymbol: string;
  categoryBudgets?: Record<string, number>; // categoryId -> monthly allocated amount
  overallMonthlyBudget?: number; // Optional overall total target
  googleConnected: boolean;
  googleEmail?: string;
  googleUserName?: string;
  googleUserPhoto?: string;
  googleAccessToken?: string;
  googleTokenExpiry?: number;
  googleClientId?: string;
  householdSyncId?: string; // Shared family / spouse sync key across multiple devices
  deviceName?: string; // Device or spouse nickname (e.g. "Rahul's Phone", "Spouse")
  activeSpreadsheetId?: string;
  activeSpreadsheetUrl?: string;
  lastSyncedToSheets?: number;
  autoSync: boolean;
  isOfflineSimulated: boolean;
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export interface SyncLogItem {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedTimestamp?: number;
  lastSyncMessage?: string;
  activeSpreadsheetUrl?: string;
  syncLogs: SyncLogItem[];
}
