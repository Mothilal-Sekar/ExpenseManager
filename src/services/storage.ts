import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Book, Category, Reminder, Transaction, UserSettings } from '../types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BOOKS,
  DEFAULT_CATEGORIES,
  DEFAULT_REMINDERS,
  DEFAULT_SETTINGS,
} from '../constants/defaults';

const STORAGE_KEYS = {
  ACCOUNTS: '@expense_manager_accounts',
  TRANSACTIONS: '@expense_manager_transactions',
  BOOKS: '@expense_manager_books',
  REMINDERS: '@expense_manager_reminders',
  CATEGORIES: '@expense_manager_categories',
  SETTINGS: '@expense_manager_settings',
  PENDING_SYNC_QUEUE: '@expense_manager_sync_queue',
};

// Seed initial mock transactions for realism
function generateSeedTransactions(): Transaction[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  return [
    {
      id: 'tx_seed_1',
      bookId: 'book_personal',
      type: 'EXPENSE',
      amount: 450,
      categoryId: 'cat_food',
      subcategoryId: 'sub_groceries',
      remark: 'Supermarket weekly fresh veggies',
      dateTime: `${todayStr}T10:30:00.000Z`,
      mode: 'CARD',
      sourceAccountId: 'acc_icici_card',
      skipBalanceUpdate: false,
      createdAt: Date.now() - 3600000 * 5,
      updatedAt: Date.now() - 3600000 * 5,
      syncedToSheets: true,
    },
    {
      id: 'tx_seed_2',
      bookId: 'book_personal',
      type: 'EXPENSE',
      amount: 180,
      categoryId: 'cat_food',
      subcategoryId: 'sub_coffee',
      remark: 'Artisan espresso & croissant',
      dateTime: `${todayStr}T14:15:00.000Z`,
      mode: 'UPI',
      sourceAccountId: 'acc_hdfc_bank',
      skipBalanceUpdate: false,
      createdAt: Date.now() - 3600000 * 2,
      updatedAt: Date.now() - 3600000 * 2,
      syncedToSheets: true,
    },
    {
      id: 'tx_seed_3',
      bookId: 'book_personal',
      type: 'INCOME',
      amount: 12500,
      categoryId: 'cat_salary',
      subcategoryId: 'sub_freelance',
      remark: 'React Native consulting invoice #104',
      dateTime: `${todayStr}T16:00:00.000Z`,
      mode: 'BANK',
      sourceAccountId: 'acc_hdfc_bank',
      skipBalanceUpdate: false,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      syncedToSheets: true,
    },
    {
      id: 'tx_seed_4',
      bookId: 'book_personal',
      type: 'SELF_TRANSFER',
      amount: 2000,
      categoryId: 'cat_self_transfer',
      subcategoryId: 'sub_bank_to_wallet',
      remark: 'ATM withdrawal for pocket cash',
      dateTime: `${todayStr}T18:00:00.000Z`,
      mode: 'BANK',
      sourceAccountId: 'acc_hdfc_bank',
      destinationAccountId: 'acc_cash_wallet',
      skipBalanceUpdate: false,
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 1800000,
      syncedToSheets: true,
    },
    {
      id: 'tx_seed_5',
      bookId: 'book_home',
      type: 'EXPENSE',
      amount: 720,
      categoryId: 'cat_transport',
      subcategoryId: 'sub_fuel',
      remark: 'Petrol tank refill',
      dateTime: `${todayStr}T19:30:00.000Z`,
      mode: 'CASH',
      sourceAccountId: 'acc_cash_wallet',
      skipBalanceUpdate: false,
      createdAt: Date.now() - 600000,
      updatedAt: Date.now() - 600000,
      syncedToSheets: true,
    },
  ];
}

export async function loadInitialAppData() {
  try {
    const [
      storedAccounts,
      storedTransactions,
      storedBooks,
      storedReminders,
      storedCategories,
      storedSettings,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS),
      AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.getItem(STORAGE_KEYS.BOOKS),
      AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
      AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
      AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
    ]);

    const accounts: Account[] = storedAccounts
      ? JSON.parse(storedAccounts)
      : DEFAULT_ACCOUNTS;

    const transactions: Transaction[] = storedTransactions
      ? JSON.parse(storedTransactions)
      : generateSeedTransactions();

    const books: Book[] = storedBooks ? JSON.parse(storedBooks) : DEFAULT_BOOKS;

    const reminders: Reminder[] = storedReminders
      ? JSON.parse(storedReminders)
      : DEFAULT_REMINDERS;

    const categories: Category[] = storedCategories
      ? JSON.parse(storedCategories)
      : DEFAULT_CATEGORIES;

    const settings: UserSettings = storedSettings
      ? JSON.parse(storedSettings)
      : DEFAULT_SETTINGS;

    return { accounts, transactions, books, reminders, categories, settings };
  } catch (error) {
    console.error('Failed to load local app data:', error);
    return {
      accounts: DEFAULT_ACCOUNTS,
      transactions: generateSeedTransactions(),
      books: DEFAULT_BOOKS,
      reminders: DEFAULT_REMINDERS,
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    };
  }
}

export async function saveAccounts(accounts: Account[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export async function saveTransactions(transactions: Transaction[]) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.TRANSACTIONS,
    JSON.stringify(transactions)
  );
}

export async function saveBooks(books: Book[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
}

export async function saveReminders(reminders: Reminder[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
}

export async function saveCategories(categories: Category[]) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.CATEGORIES,
    JSON.stringify(categories)
  );
}

export async function saveSettings(settings: UserSettings) {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
