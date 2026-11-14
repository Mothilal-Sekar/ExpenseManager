import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { Account, Book, Reminder, Transaction } from '../types';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDemoPlaceholderOnlyForLocalTesting1234',
  authDomain: 'expensemanager-app.firebaseapp.com',
  projectId: 'expensemanager-app',
  storageBucket: 'expensemanager-app.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456',
};

/**
 * Initializes or retrieves the Firebase app instance.
 */
export function getOrInitFirestore(customConfig?: any): Firestore | null {
  try {
    const config = customConfig || DEFAULT_FIREBASE_CONFIG;
    if (!firebaseApp) {
      if (getApps().length === 0) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApp();
      }
    }
    if (!firestoreDb && firebaseApp) {
      firestoreDb = getFirestore(firebaseApp);
    }
    return firestoreDb;
  } catch (error) {
    console.warn('Firebase initialization warning:', error);
    return null;
  }
}

/**
 * Real-time listener for user transactions from Firestore.
 */
export function subscribeToFirestoreTransactions(
  userId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (error: any) => void
): Unsubscribe | null {
  const db = getOrInitFirestore();
  if (!db || !userId) return null;

  try {
    const txColRef = collection(db, 'users', userId, 'transactions');
    const q = query(txColRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Transaction);
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore transaction snapshot listener warning:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn('Firestore listener setup warning:', err);
    return null;
  }
}

/**
 * Syncs a single transaction document to Firestore.
 */
export async function pushTransactionToFirestore(
  userId: string,
  transaction: Transaction
): Promise<boolean> {
  const db = getOrInitFirestore();
  if (!db || !userId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(docRef, transaction, { merge: true });
    return true;
  } catch (error) {
    console.warn('Failed to push transaction to Firestore:', error);
    return false;
  }
}

/**
 * Deletes a transaction document from Firestore.
 */
export async function removeTransactionFromFirestore(
  userId: string,
  transactionId: string
): Promise<boolean> {
  const db = getOrInitFirestore();
  if (!db || !userId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn('Failed to delete transaction from Firestore:', error);
    return false;
  }
}

/**
 * Syncs an account document to Firestore.
 */
export async function pushAccountToFirestore(
  userId: string,
  account: Account
): Promise<boolean> {
  const db = getOrInitFirestore();
  if (!db || !userId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'accounts', account.id);
    await setDoc(docRef, account, { merge: true });
    return true;
  } catch (error) {
    console.warn('Failed to push account to Firestore:', error);
    return false;
  }
}

/**
 * Real-time listener for user accounts from Firestore.
 */
export function subscribeToFirestoreAccounts(
  userId: string,
  onUpdate: (accounts: Account[]) => void,
  onError?: (error: any) => void
): Unsubscribe | null {
  const db = getOrInitFirestore();
  if (!db || !userId) return null;

  try {
    const colRef = collection(db, 'users', userId, 'accounts');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Account[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Account);
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore account snapshot warning:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn('Firestore account listener setup warning:', err);
    return null;
  }
}

/**
 * Real-time listener for debts / reminders from Firestore.
 */
export function subscribeToFirestoreReminders(
  userId: string,
  onUpdate: (reminders: Reminder[]) => void,
  onError?: (error: any) => void
): Unsubscribe | null {
  const db = getOrInitFirestore();
  if (!db || !userId) return null;

  try {
    const colRef = collection(db, 'users', userId, 'reminders');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Reminder[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Reminder);
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore reminder snapshot warning:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.warn('Firestore reminder listener setup warning:', err);
    return null;
  }
}

/**
 * Syncs a reminder / debt document to Firestore.
 */
export async function pushReminderToFirestore(
  userId: string,
  reminder: Reminder
): Promise<boolean> {
  const db = getOrInitFirestore();
  if (!db || !userId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'reminders', reminder.id);
    await setDoc(docRef, reminder, { merge: true });
    return true;
  } catch (error) {
    console.warn('Failed to push reminder to Firestore:', error);
    return false;
  }
}

/**
 * Deletes a reminder / debt document from Firestore.
 */
export async function removeReminderFromFirestore(
  userId: string,
  reminderId: string
): Promise<boolean> {
  const db = getOrInitFirestore();
  if (!db || !userId) return false;

  try {
    const docRef = doc(db, 'users', userId, 'reminders', reminderId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn('Failed to delete reminder from Firestore:', error);
    return false;
  }
}
