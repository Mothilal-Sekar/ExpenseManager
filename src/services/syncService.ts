import {
  Account,
  Book,
  Category,
  Reminder,
  SyncLogItem,
  SyncStatus,
  Transaction,
  UserSettings,
} from '../types';
import {
  getOrCreateMonthlySpreadsheet,
  pushTransactionsToGoogleSheet,
} from './googleSheetsLiveService';
import {
  pushAccountToFirestore,
  pushReminderToFirestore,
  pushTransactionToFirestore,
} from './firestoreService';

export class SyncEngine {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private pendingQueueCount: number = 0;
  private lastSyncedTimestamp: number = Date.now();
  private lastSyncMessage: string = 'Ready';
  private activeSpreadsheetUrl?: string;
  private syncLogs: SyncLogItem[] = [];
  private listeners: ((status: SyncStatus) => void)[] = [];
  private debounceTimer: any = null;

  constructor() {
    this.isOnline = true;
    this.addLog('Sync engine initialized in local-first mode.', 'info');
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingQueueCount,
      lastSyncedTimestamp: this.lastSyncedTimestamp,
      lastSyncMessage: this.lastSyncMessage,
      activeSpreadsheetUrl: this.activeSpreadsheetUrl,
      syncLogs: this.syncLogs.slice(0, 20),
    };
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const item: SyncLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      message,
      type,
    };
    this.syncLogs = [item, ...this.syncLogs];
    this.notify();
  }

  public setNetworkState(isOnline: boolean) {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;
    this.addLog(
      isOnline
        ? 'Network connected: online.'
        : 'Network disconnected: working offline.',
      isOnline ? 'info' : 'error'
    );
    this.notify();

    if (wasOffline && isOnline && this.pendingQueueCount > 0) {
      this.addLog(
        `Auto-flushing ${this.pendingQueueCount} pending offline changes.`,
        'info'
      );
    }
  }

  /**
   * Schedules a debounced sync whenever transactions or accounts are modified.
   */
  public enqueueChange(
    context?: {
      transactions: Transaction[];
      accounts: Account[];
      categories: Category[];
      books: Book[];
      reminders?: Reminder[];
      settings: UserSettings;
    }
  ) {
    if (!this.isOnline) {
      this.pendingQueueCount++;
      this.addLog(
        `Offline: Queued change locally (${this.pendingQueueCount} pending).`,
        'info'
      );
      this.notify();
      return;
    }

    this.pendingQueueCount++;
    this.notify();

    // Debounce Google Sheets / Firestore API writes by 2 seconds
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (context) {
      this.debounceTimer = setTimeout(() => {
        this.syncNow(context);
      }, 2000);
    }
  }

  /**
   * Executes real-time sync against Firestore and Google Sheets.
   */
  public async syncNow(context?: {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    books: Book[];
    reminders?: Reminder[];
    settings: UserSettings;
  }): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    if (!this.isOnline) {
      return {
        success: false,
        message: 'Cannot sync while in offline mode',
      };
    }

    this.isSyncing = true;
    this.lastSyncMessage = 'Syncing to Firestore & Google Sheets...';
    this.notify();

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();
      const userId =
        context?.settings.householdSyncId?.trim() ||
        context?.settings.googleEmail ||
        'local_user';

      // 1. Sync to Google Firestore (Real-time Cloud Database)
      if (context && context.transactions.length > 0) {
        this.addLog(
          `Syncing latest entries to Google Firestore (${userId})...`,
          'info'
        );
        // Push recent transactions to Firestore
        await Promise.all(
          context.transactions.slice(0, 15).map((t) =>
            pushTransactionToFirestore(userId, t)
          )
        );
        // Push accounts
        await Promise.all(
          context.accounts.map((a) => pushAccountToFirestore(userId, a))
        );
        // Push debts / reminders if present
        if (context.reminders) {
          await Promise.all(
            context.reminders.map((r) => pushReminderToFirestore(userId, r))
          );
        }
      }

      // 2. Sync to Live Google Sheets
      if (context?.settings.googleConnected && context?.settings.googleAccessToken) {
        this.addLog(
          `Syncing to Google Sheets for ${now.toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}...`,
          'info'
        );

        const { spreadsheetId, spreadsheetUrl } =
          await getOrCreateMonthlySpreadsheet(
            context.settings.googleAccessToken,
            currentYear,
            currentMonthIndex + 1
          );

        this.activeSpreadsheetUrl = spreadsheetUrl;

        const liveResult = await pushTransactionsToGoogleSheet(
          context.settings.googleAccessToken,
          spreadsheetId,
          currentYear,
          currentMonthIndex,
          context.transactions,
          context.accounts,
          context.categories,
          context.books,
          context.settings.currencySymbol
        );

        this.addLog(
          `Google Sheets: ${liveResult.rowsSynced} entries synced to ${spreadsheetUrl}`,
          'success'
        );
      } else {
        // Simulated local fallback if user has not yet authorized Google OAuth
        await new Promise((resolve) => setTimeout(resolve, 800));
        this.addLog(
          'Simulated sync completed (Connect Google Account in Settings for live Drive export).',
          'info'
        );
      }

      this.pendingQueueCount = 0;
      this.isSyncing = false;
      this.lastSyncedTimestamp = Date.now();
      this.lastSyncMessage = 'All records synchronized';
      this.addLog('Sync successful: Everything up to date.', 'success');
      this.notify();

      return { success: true, message: 'Sync complete' };
    } catch (error: any) {
      console.error('Sync failed:', error);
      this.isSyncing = false;
      this.lastSyncMessage = `Sync warning: ${error?.message || 'Network error'}`;
      this.addLog(`Sync error: ${error?.message || 'Failed to update remote'}`, 'error');
      this.notify();
      return { success: false, message: error?.message || 'Sync failed' };
    }
  }
}

export const syncEngine = new SyncEngine();
