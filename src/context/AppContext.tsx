import React, { createContext, useContext, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  Account,
  AccountPayment,
  Book,
  Category,
  Reminder,
  SyncStatus,
  Transaction,
  TransactionType,
  UserSettings,
} from '../types';
import {
  loadInitialAppData,
  saveAccounts,
  saveBooks,
  saveCategories,
  saveReminders,
  saveSettings,
  saveTransactions,
} from '../services/storage';
import {
  applyTransactionToAccounts,
  createEmptyBalanceTransaction,
  revertTransactionFromAccounts,
  softDeleteAccount,
} from '../services/balanceEngine';
import { syncEngine } from '../services/syncService';
import { formatDateKey } from '../services/dateUtils';
import { promptGoogleSignIn } from '../services/googleAuthService';
import {
  subscribeToFirestoreAccounts,
  subscribeToFirestoreReminders,
  subscribeToFirestoreTransactions,
} from '../services/firestoreService';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BOOKS,
  DEFAULT_CATEGORIES,
  DEFAULT_REMINDERS,
  DEFAULT_SETTINGS,
} from '../constants/defaults';

interface AppContextType {
  accounts: Account[];
  transactions: Transaction[];
  books: Book[];
  reminders: Reminder[];
  categories: Category[];
  settings: UserSettings;
  syncStatus: SyncStatus;
  selectedBookId: string; // 'ALL' or specific book ID
  setSelectedBookId: (id: string) => void;
  selectedDate: string; // "YYYY-MM-DD"
  setSelectedDate: (dateStr: string) => void;

  // Modal states
  isTransactionModalOpen: boolean;
  setIsTransactionModalOpen: (open: boolean) => void;
  prefilledTransaction: Partial<Transaction> | null;
  setPrefilledTransaction: (tx: Partial<Transaction> | null) => void;
  activeReminderForSettlement: Reminder | null;
  setActiveReminderForSettlement: (rem: Reminder | null) => void;
  isSheetsModalOpen: boolean;
  setIsSheetsModalOpen: (open: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;

  // Core Actions
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  editTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;

  // Account management
  addAccount: (
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
  ) => void;
  editAccount: (account: Account) => void;
  emptyAccountBalance: (accountId: string) => void;
  deleteAccount: (accountId: string) => void;

  // Books & Reminders (Accounts Book / Loans / EMIs)
  addBook: (name: string, description?: string, color?: string) => void;
  editBook: (book: Book) => void;
  deleteBook: (bookId: string) => void;
  addReminder: (
    reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => void;
  editReminder: (reminder: Reminder) => void;
  deleteReminder: (reminderId: string) => void;
  settleReminderWithTransaction: (reminder: Reminder) => void;
  recordReminderPayment: (
    reminderId: string,
    paymentAmount: number,
    accountId: string,
    paymentDate?: string,
    note?: string,
    advanceDueDateMonth?: boolean
  ) => void;
  markReminderSettled: (
    reminderId: string,
    settleWithTransaction: boolean,
    accountId?: string,
    note?: string
  ) => void;

  // Categories, Subcategories & Monthly Budgets
  addCategory: (
    name: string,
    type: 'EXPENSE' | 'INCOME',
    icon: string,
    color: string
  ) => void;
  editCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  addSubcategory: (categoryId: string, name: string) => void;
  editSubcategory: (categoryId: string, subcategoryId: string, newName: string) => void;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => void;
  reassignCategoryTransactions: (
    oldCategoryId: string,
    newCategoryId: string,
    newSubcategoryId?: string
  ) => void;
  reassignSubcategoryTransactions: (
    categoryId: string,
    oldSubcategoryId: string,
    newSubcategoryId?: string,
    newCategoryId?: string
  ) => void;
  updateCategoryBudget: (categoryId: string, amount: number) => void;
  updateAllCategoryBudgets: (
    budgets: Record<string, number>,
    overallBudget?: number
  ) => void;

  // Settings & Sync
  updateSettings: (partial: Partial<UserSettings>) => void;
  toggleOfflineSimulation: () => void;
  triggerManualSync: () => Promise<{ success: boolean; message: string }>;

  // Realtime Google Account integration
  signInWithGoogle: (clientId?: string) => Promise<{ success: boolean; error?: string }>;
  signOutGoogle: () => void;
  connectQuickDemoGoogleAccount: (email?: string, name?: string) => void;
  openGoogleSpreadsheet: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [books, setBooks] = useState<Book[]>(DEFAULT_BOOKS);
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULT_REMINDERS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getStatus());

  const [selectedBookId, setSelectedBookId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateKey(new Date())
  );
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [prefilledTransaction, setPrefilledTransaction] =
    useState<Partial<Transaction> | null>(null);
  const [activeReminderForSettlement, setActiveReminderForSettlement] =
    useState<Reminder | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Initialize and load persisted data
  useEffect(() => {
    loadInitialAppData().then((data) => {
      setAccounts(data.accounts);
      setTransactions(data.transactions);
      setBooks(data.books);
      setReminders(data.reminders);
      setCategories(data.categories);
      setSettings(data.settings);
    });

    const unsubscribeSync = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => unsubscribeSync();
  }, []);

  // Listen to Firestore real-time updates (Multi-device spouse / family sync)
  useEffect(() => {
    const syncUserId =
      settings.householdSyncId?.trim() ||
      (settings.googleConnected && settings.googleEmail ? settings.googleEmail : null);

    if (syncUserId && !settings.isOfflineSimulated) {
      // 1. Transactions subscription
      const unsubTx = subscribeToFirestoreTransactions(
        syncUserId,
        (remoteTxList) => {
          if (remoteTxList && remoteTxList.length > 0) {
            setTransactions((currentLocal) => {
              const localMap = new Map(currentLocal.map((t) => [t.id, t]));
              let hasChanges = false;
              remoteTxList.forEach((rt) => {
                const local = localMap.get(rt.id);
                if (!local || local.updatedAt < rt.updatedAt) {
                  localMap.set(rt.id, rt);
                  hasChanges = true;
                }
              });
              if (hasChanges) {
                const merged = Array.from(localMap.values()).sort(
                  (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
                );
                saveTransactions(merged);
                return merged;
              }
              return currentLocal;
            });
          }
        }
      );

      // 2. Accounts subscription (reflect balance updates on both spouse devices)
      const unsubAccounts = subscribeToFirestoreAccounts(
        syncUserId,
        (remoteAccList) => {
          if (remoteAccList && remoteAccList.length > 0) {
            setAccounts((currentLocal) => {
              const localMap = new Map(currentLocal.map((a) => [a.id, a]));
              let hasChanges = false;
              remoteAccList.forEach((ra) => {
                const local = localMap.get(ra.id);
                if (!local || local.updatedAt < ra.updatedAt) {
                  localMap.set(ra.id, ra);
                  hasChanges = true;
                }
              });
              if (hasChanges) {
                const merged = Array.from(localMap.values());
                saveAccounts(merged);
                return merged;
              }
              return currentLocal;
            });
          }
        }
      );

      // 3. Debts & Reminders subscription (shared loans/EMIs)
      const unsubReminders = subscribeToFirestoreReminders(
        syncUserId,
        (remoteRemList) => {
          if (remoteRemList && remoteRemList.length > 0) {
            setReminders((currentLocal) => {
              const localMap = new Map(currentLocal.map((r) => [r.id, r]));
              let hasChanges = false;
              remoteRemList.forEach((rr) => {
                const local = localMap.get(rr.id);
                if (!local || local.updatedAt < rr.updatedAt) {
                  localMap.set(rr.id, rr);
                  hasChanges = true;
                }
              });
              if (hasChanges) {
                const merged = Array.from(localMap.values());
                saveReminders(merged);
                return merged;
              }
              return currentLocal;
            });
          }
        }
      );

      return () => {
        unsubTx?.();
        unsubAccounts?.();
        unsubReminders?.();
      };
    }
  }, [
    settings.householdSyncId,
    settings.googleConnected,
    settings.googleEmail,
    settings.isOfflineSimulated,
  ]);

  // Helper context snapshot for sync
  const getSyncContext = () => ({
    transactions,
    accounts,
    categories,
    books,
    reminders,
    settings,
  });

  const updateAccountsState = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    saveAccounts(newAccounts);
  };

  const updateTransactionsState = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    saveTransactions(newTxList);
  };

  const updateBooksState = (newBooks: Book[]) => {
    setBooks(newBooks);
    saveBooks(newBooks);
  };

  const updateRemindersState = (newReminders: Reminder[]) => {
    setReminders(newReminders);
    saveReminders(newReminders);
  };

  const updateCategoriesState = (newCategories: Category[]) => {
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  // Add Transaction
  const addTransaction = (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newTx: Transaction = {
      ...data,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedAccounts = applyTransactionToAccounts(accounts, newTx);
    updateAccountsState(updatedAccounts);

    const updatedTxList = [newTx, ...transactions];
    updateTransactionsState(updatedTxList);

    if (activeReminderForSettlement) {
      const updatedReminders = reminders.map((r) =>
        r.id === activeReminderForSettlement.id
          ? {
              ...r,
              status: 'SETTLED' as const,
              settledTransactionId: newTx.id,
              updatedAt: Date.now(),
            }
          : r
      );
      updateRemindersState(updatedReminders);
      setActiveReminderForSettlement(null);
    }

    syncEngine.enqueueChange({
      transactions: updatedTxList,
      accounts: updatedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Edit Transaction
  const editTransaction = (updatedTx: Transaction) => {
    const original = transactions.find((t) => t.id === updatedTx.id);
    if (!original) return;

    const rolledBackAccounts = revertTransactionFromAccounts(accounts, original);
    const finalAccounts = applyTransactionToAccounts(
      rolledBackAccounts,
      updatedTx
    );
    updateAccountsState(finalAccounts);

    const updatedList = transactions.map((t) =>
      t.id === updatedTx.id ? { ...updatedTx, updatedAt: Date.now() } : t
    );
    updateTransactionsState(updatedList);

    syncEngine.enqueueChange({
      transactions: updatedList,
      accounts: finalAccounts,
      categories,
      books,
      settings,
    });
  };

  // Delete Transaction
  const deleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    const revertedAccounts = revertTransactionFromAccounts(accounts, target);
    updateAccountsState(revertedAccounts);

    const updatedList = transactions.filter((t) => t.id !== id);
    updateTransactionsState(updatedList);

    syncEngine.enqueueChange({
      transactions: updatedList,
      accounts: revertedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Add Account
  const addAccount = (
    accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
  ) => {
    const newAccount: Account = {
      ...accountData,
      id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updatedAccounts = [...accounts, newAccount];
    updateAccountsState(updatedAccounts);

    syncEngine.enqueueChange({
      transactions,
      accounts: updatedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Empty Bank Balance
  const emptyAccountBalance = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    const currentDefaultBookId = books[0]?.id || 'book_personal';
    const { transaction: adjTx, updatedAccount } =
      createEmptyBalanceTransaction(target, currentDefaultBookId);

    const updatedAccounts = accounts.map((a) =>
      a.id === accountId ? updatedAccount : a
    );
    updateAccountsState(updatedAccounts);

    const updatedTxList = [adjTx, ...transactions];
    updateTransactionsState(updatedTxList);

    syncEngine.enqueueChange({
      transactions: updatedTxList,
      accounts: updatedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Soft Delete Account
  const deleteAccount = (accountId: string) => {
    const updatedAccounts = softDeleteAccount(accounts, accountId);
    updateAccountsState(updatedAccounts);

    syncEngine.enqueueChange({
      transactions,
      accounts: updatedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Edit Account (including Bank Category & Details)
  const editAccount = (updatedAccount: Account) => {
    const updatedAccounts = accounts.map((a) =>
      a.id === updatedAccount.id
        ? { ...updatedAccount, updatedAt: Date.now() }
        : a
    );
    updateAccountsState(updatedAccounts);

    syncEngine.enqueueChange({
      transactions,
      accounts: updatedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Add Book
  const addBook = (
    name: string,
    description: string = '',
    color: string = '#2563EB'
  ) => {
    const newBook: Book = {
      id: `book_${Date.now()}`,
      name,
      description,
      color,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateBooksState([...books, newBook]);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Edit Book
  const editBook = (updatedBook: Book) => {
    const updatedBooks = books.map((b) =>
      b.id === updatedBook.id ? { ...updatedBook, updatedAt: Date.now() } : b
    );
    updateBooksState(updatedBooks);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Delete Book
  const deleteBook = (bookId: string) => {
    if (books.length <= 1) {
      return; // Keep at least one ledger
    }
    const updatedBooks = books.filter((b) => b.id !== bookId);
    updateBooksState(updatedBooks);
    if (selectedBookId === bookId) {
      setSelectedBookId('ALL');
    }
    syncEngine.enqueueChange(getSyncContext());
  };

  // Add Reminder
  const addReminder = (
    reminderData: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => {
    const newReminder: Reminder = {
      ...reminderData,
      id: `rem_${Date.now()}`,
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateRemindersState([newReminder, ...reminders]);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Edit Reminder
  const editReminder = (updatedReminder: Reminder) => {
    const updatedReminders = reminders.map((r) =>
      r.id === updatedReminder.id
        ? { ...updatedReminder, updatedAt: Date.now() }
        : r
    );
    updateRemindersState(updatedReminders);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Delete Reminder
  const deleteReminder = (reminderId: string) => {
    const updatedReminders = reminders.filter((r) => r.id !== reminderId);
    updateRemindersState(updatedReminders);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Settle Reminder
  const settleReminderWithTransaction = (reminder: Reminder) => {
    setActiveReminderForSettlement(reminder);

    const type = reminder.type === 'WILL_GET' ? 'INCOME' : 'EXPENSE';
    const categoryId = type === 'INCOME' ? 'cat_salary' : 'cat_food';

    setPrefilledTransaction({
      type,
      amount: (reminder.amount - (reminder.paidAmount || 0)) > 0 ? (reminder.amount - (reminder.paidAmount || 0)) : reminder.amount,
      bookId: reminder.bookId,
      categoryId,
      remark: `${reminder.type === 'WILL_GET' ? 'Received from' : 'Paid to'} ${reminder.counterpartyName} (${reminder.notes || 'Settlement'})`,
      dateTime: new Date().toISOString(),
      mode: 'UPI',
      skipBalanceUpdate: false,
    });

    setIsTransactionModalOpen(true);
  };

  // Record EMI / Installment Payment for Loan / Accounts Book
  const recordReminderPayment = (
    reminderId: string,
    paymentAmount: number,
    accountId: string,
    paymentDate: string = new Date().toISOString().split('T')[0],
    note: string = '',
    advanceDueDateMonth: boolean = true
  ) => {
    const target = reminders.find((r) => r.id === reminderId);
    if (!target) return;

    const currentPaid = target.paidAmount || 0;
    const newPaid = currentPaid + paymentAmount;
    const isFullyPaid = newPaid >= target.amount;

    // Advance due date if requested and not fully paid
    let nextDueDate = target.dueDate;
    if (advanceDueDateMonth && !isFullyPaid) {
      try {
        const d = new Date(target.dueDate || paymentDate);
        if (target.frequency === 'WEEKLY') {
          d.setDate(d.getDate() + 7);
        } else {
          d.setMonth(d.getMonth() + 1);
        }
        nextDueDate = d.toISOString().split('T')[0];
      } catch {
        // fallback to existing
      }
    }

    const newPaymentItem: AccountPayment = {
      id: `pay_${Date.now()}`,
      amount: paymentAmount,
      date: paymentDate,
      accountId,
      note: note.trim() || (target.isEmi ? 'EMI Installment' : 'Payment'),
    };

    const updatedTarget: Reminder = {
      ...target,
      paidAmount: newPaid,
      dueDate: isFullyPaid ? target.dueDate : nextDueDate,
      status: isFullyPaid ? 'SETTLED' : 'PENDING',
      paymentHistory: [...(target.paymentHistory || []), newPaymentItem],
      updatedAt: Date.now(),
    };

    const updatedReminders = reminders.map((r) =>
      r.id === reminderId ? updatedTarget : r
    );
    updateRemindersState(updatedReminders);

    // Automatically create a corresponding Transaction affecting target Account balance
    const txType: TransactionType = target.type === 'WILL_GET' ? 'INCOME' : 'EXPENSE';
    const targetAccount = accounts.find((a) => a.id === accountId) || accounts[0];
    const catId = target.type === 'WILL_GET' ? 'cat_salary' : 'cat_bills';

    const newTx: Transaction = {
      id: `tx_${Date.now()}_emi`,
      bookId: target.bookId || 'book_personal',
      type: txType,
      amount: paymentAmount,
      categoryId: catId,
      remark: `${target.type === 'WILL_GET' ? 'EMI Received from' : 'EMI Paid to'} ${target.counterpartyName}${note ? ` (${note})` : ''}`,
      dateTime: new Date(paymentDate).toISOString(),
      mode: targetAccount?.type === 'CARD' ? 'CARD' : targetAccount?.type === 'CASH_WALLET' ? 'CASH' : 'BANK',
      sourceAccountId: targetAccount?.id || 'acc_cash_wallet',
      skipBalanceUpdate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Apply balance update
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === targetAccount?.id) {
        const delta = txType === 'INCOME' ? paymentAmount : -paymentAmount;
        return {
          ...acc,
          currentBalance: acc.currentBalance + delta,
          updatedAt: Date.now(),
        };
      }
      return acc;
    });

    const updatedTxList = [newTx, ...transactions];
    updateAccountsState(updatedAccounts);
    updateTransactionsState(updatedTxList);

    syncEngine.enqueueChange({
      transactions: updatedTxList,
      accounts: updatedAccounts,
      categories,
      books,
      settings,
    });
  };

  // Direct Mark Reminder / Loan Settled
  const markReminderSettled = (
    reminderId: string,
    settleWithTransaction: boolean,
    accountId?: string,
    note: string = 'Settled in full'
  ) => {
    const target = reminders.find((r) => r.id === reminderId);
    if (!target) return;

    const remaining = Math.max(0, target.amount - (target.paidAmount || 0));

    if (settleWithTransaction && remaining > 0 && accountId) {
      // Record final payment with transaction
      recordReminderPayment(
        reminderId,
        remaining,
        accountId,
        new Date().toISOString().split('T')[0],
        note,
        false
      );
    } else {
      // Just mark settled directly without affecting bank accounts
      const updatedTarget: Reminder = {
        ...target,
        paidAmount: target.amount,
        status: 'SETTLED',
        updatedAt: Date.now(),
      };
      const updatedReminders = reminders.map((r) =>
        r.id === reminderId ? updatedTarget : r
      );
      updateRemindersState(updatedReminders);
      syncEngine.enqueueChange(getSyncContext());
    }
  };

  // Monthly Budget Management
  const updateCategoryBudget = (categoryId: string, amount: number) => {
    const currentBudgets = settings.categoryBudgets || {};
    const updatedBudgets = {
      ...currentBudgets,
      [categoryId]: amount,
    };
    updateSettings({ categoryBudgets: updatedBudgets });
  };

  const updateAllCategoryBudgets = (
    budgets: Record<string, number>,
    overallBudget?: number
  ) => {
    updateSettings({
      categoryBudgets: budgets,
      ...(overallBudget !== undefined ? { overallMonthlyBudget: overallBudget } : {}),
    });
  };

  // Add Category
  const addCategory = (
    name: string,
    type: 'EXPENSE' | 'INCOME',
    icon: string,
    color: string
  ) => {
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name,
      type,
      icon,
      color,
      subcategories: [{ id: `sub_${Date.now()}`, name: 'General' }],
    };
    updateCategoriesState([...categories, newCat]);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Add Subcategory
  const addSubcategory = (categoryId: string, name: string) => {
    const updatedCategories = categories.map((c) => {
      if (c.id === categoryId) {
        return {
          ...c,
          subcategories: [
            ...c.subcategories,
            { id: `sub_${Date.now()}`, name },
          ],
        };
      }
      return c;
    });
    updateCategoriesState(updatedCategories);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Edit Category
  const editCategory = (updatedCategory: Category) => {
    const updatedCategories = categories.map((c) =>
      c.id === updatedCategory.id ? updatedCategory : c
    );
    updateCategoriesState(updatedCategories);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Delete Category
  const deleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter((c) => c.id !== categoryId);
    updateCategoriesState(updatedCategories);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Edit Subcategory
  const editSubcategory = (
    categoryId: string,
    subcategoryId: string,
    newName: string
  ) => {
    const updatedCategories = categories.map((c) => {
      if (c.id === categoryId) {
        return {
          ...c,
          subcategories: c.subcategories.map((s) =>
            s.id === subcategoryId ? { ...s, name: newName } : s
          ),
        };
      }
      return c;
    });
    updateCategoriesState(updatedCategories);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Delete Subcategory
  const deleteSubcategory = (categoryId: string, subcategoryId: string) => {
    const updatedCategories = categories.map((c) => {
      if (c.id === categoryId) {
        return {
          ...c,
          subcategories: c.subcategories.filter((s) => s.id !== subcategoryId),
        };
      }
      return c;
    });
    updateCategoriesState(updatedCategories);
    syncEngine.enqueueChange(getSyncContext());
  };

  // Reassign all transactions from an old category to a new category (and optional subcategory)
  const reassignCategoryTransactions = (
    oldCategoryId: string,
    newCategoryId: string,
    newSubcategoryId?: string
  ) => {
    const now = Date.now();
    const updatedList = transactions.map((t) => {
      if (t.categoryId === oldCategoryId) {
        return {
          ...t,
          categoryId: newCategoryId,
          subcategoryId: newSubcategoryId || undefined,
          updatedAt: now,
        };
      }
      return t;
    });
    updateTransactionsState(updatedList);
    syncEngine.enqueueChange({
      transactions: updatedList,
      accounts,
      categories,
      books,
      settings,
    });
  };

  // Reassign all transactions from an old subcategory to a new subcategory (or clear it)
  const reassignSubcategoryTransactions = (
    categoryId: string,
    oldSubcategoryId: string,
    newSubcategoryId?: string,
    newCategoryId?: string
  ) => {
    const now = Date.now();
    const targetCatId = newCategoryId || categoryId;
    const updatedList = transactions.map((t) => {
      if (t.categoryId === categoryId && t.subcategoryId === oldSubcategoryId) {
        return {
          ...t,
          categoryId: targetCatId,
          subcategoryId: newSubcategoryId || undefined,
          updatedAt: now,
        };
      }
      return t;
    });
    updateTransactionsState(updatedList);
    syncEngine.enqueueChange({
      transactions: updatedList,
      accounts,
      categories,
      books,
      settings,
    });
  };

  // Update Settings
  const updateSettings = (partial: Partial<UserSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveSettings(updated);
  };

  // Toggle Offline Mode
  const toggleOfflineSimulation = () => {
    const newOfflineState = !settings.isOfflineSimulated;
    updateSettings({ isOfflineSimulated: newOfflineState });
    syncEngine.setNetworkState(!newOfflineState);
  };

  // Trigger Manual Sync
  const triggerManualSync = async () => {
    const context = {
      transactions,
      accounts,
      categories,
      books,
      settings,
    };
    const res = await syncEngine.syncNow(context);
    updateSettings({ lastSyncedToSheets: Date.now() });
    return res;
  };

  // Realtime Google Sign-In
  const signInWithGoogle = async (
    clientId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    syncEngine.addLog('Initiating Google OAuth authentication...', 'info');
    const result = await promptGoogleSignIn(clientId || settings.googleClientId);

    if (result.success && result.accessToken) {
      const expiry = Date.now() + (result.expiresIn || 3600) * 1000;
      const updated: Partial<UserSettings> = {
        googleConnected: true,
        googleAccessToken: result.accessToken,
        googleTokenExpiry: expiry,
        googleEmail: result.profile?.email || 'google.user@gmail.com',
        googleUserName: result.profile?.name || 'Google User',
        googleUserPhoto: result.profile?.picture,
      };

      updateSettings(updated);
      syncEngine.addLog(
        `Successfully authenticated as ${updated.googleEmail}. Live Google Drive & Sheets active.`,
        'success'
      );

      // Trigger automatic sync with live credentials
      setTimeout(() => {
        triggerManualSync();
      }, 500);

      return { success: true };
    }

    syncEngine.addLog(
      `Google sign-in did not complete: ${result.error || 'User cancelled'}`,
      'error'
    );
    return { success: false, error: result.error };
  };

  // Sign out Google
  const signOutGoogle = () => {
    updateSettings({
      googleConnected: false,
      googleAccessToken: undefined,
      googleTokenExpiry: undefined,
      googleEmail: undefined,
      googleUserName: undefined,
      googleUserPhoto: undefined,
      activeSpreadsheetId: undefined,
      activeSpreadsheetUrl: undefined,
    });
    syncEngine.addLog('Google account disconnected.', 'info');
  };

  // Quick Demo Google Account Connection (for instant testing without manual GCP client creation)
  const connectQuickDemoGoogleAccount = (
    customEmail: string = 'user.finance@gmail.com',
    customName: string = 'Demo User'
  ) => {
    const updated: Partial<UserSettings> = {
      googleConnected: true,
      googleEmail: customEmail,
      googleUserName: customName,
      googleAccessToken: 'demo_oauth_token_' + Date.now(),
      googleTokenExpiry: Date.now() + 3600 * 1000 * 24,
      lastSyncedToSheets: Date.now(),
    };
    updateSettings(updated);
    syncEngine.addLog(
      `Connected to Google account: ${customEmail} (Realtime mode enabled).`,
      'success'
    );
    setTimeout(() => {
      triggerManualSync();
    }, 500);
  };

  // Open live spreadsheet in browser / Google Sheets App
  const openGoogleSpreadsheet = async () => {
    const url =
      syncStatus.activeSpreadsheetUrl ||
      settings.activeSpreadsheetUrl ||
      'https://docs.google.com/spreadsheets';
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Could not open spreadsheet URL:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        accounts,
        transactions,
        books,
        reminders,
        categories,
        settings,
        syncStatus,
        selectedBookId,
        setSelectedBookId,
        selectedDate,
        setSelectedDate,
        isTransactionModalOpen,
        setIsTransactionModalOpen,
        prefilledTransaction,
        setPrefilledTransaction,
        activeReminderForSettlement,
        setActiveReminderForSettlement,
        isSheetsModalOpen,
        setIsSheetsModalOpen,
        isExportModalOpen: isSheetsModalOpen,
        setIsExportModalOpen: setIsSheetsModalOpen,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addAccount,
        editAccount,
        emptyAccountBalance,
        deleteAccount,
        addBook,
        editBook,
        deleteBook,
        addReminder,
        editReminder,
        deleteReminder,
        settleReminderWithTransaction,
        recordReminderPayment,
        markReminderSettled,
        addCategory,
        editCategory,
        deleteCategory,
        addSubcategory,
        editSubcategory,
        deleteSubcategory,
        reassignCategoryTransactions,
        reassignSubcategoryTransactions,
        updateCategoryBudget,
        updateAllCategoryBudgets,
        updateSettings,
        toggleOfflineSimulation,
        triggerManualSync,
        signInWithGoogle,
        signOutGoogle,
        connectQuickDemoGoogleAccount,
        openGoogleSpreadsheet,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
