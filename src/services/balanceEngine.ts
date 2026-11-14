import { Account, Transaction, TransactionType } from '../types';

export const UNCATEGORISED_BANK_LABEL = 'Uncategorised bank';

/**
 * Resolves the display label for an account.
 * If the account was deleted or not found, it strictly returns "Uncategorised bank".
 */
export function resolveAccountName(
  accountId: string | undefined,
  accounts: Account[]
): { name: string; isUncategorised: boolean } {
  if (!accountId) {
    return { name: UNCATEGORISED_BANK_LABEL, isUncategorised: true };
  }

  const account = accounts.find((a) => a.id === accountId);
  if (!account || account.isDeleted) {
    return { name: UNCATEGORISED_BANK_LABEL, isUncategorised: true };
  }

  const bankDetail = account.bankName
    ? `${account.bankName}${account.accountNumberLast4 ? ` (..${account.accountNumberLast4})` : ''}`
    : account.name;

  return { name: bankDetail, isUncategorised: false };
}

/**
 * Applies a transaction's financial impact to account balances.
 * If skipBalanceUpdate is true, account balances are completely untouched.
 */
export function applyTransactionToAccounts(
  accounts: Account[],
  transaction: Transaction
): Account[] {
  if (transaction.skipBalanceUpdate) {
    return accounts;
  }

  return accounts.map((acc) => {
    let newBalance = acc.currentBalance;

    // Check source account
    if (acc.id === transaction.sourceAccountId) {
      if (transaction.type === 'EXPENSE') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'INCOME') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'SELF_TRANSFER') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'ADJUSTMENT') {
        newBalance -= transaction.amount;
      }
    }

    // Check destination account (for Self Transfers)
    if (
      transaction.type === 'SELF_TRANSFER' &&
      transaction.destinationAccountId &&
      acc.id === transaction.destinationAccountId
    ) {
      newBalance += transaction.amount;
    }

    if (newBalance !== acc.currentBalance) {
      return {
        ...acc,
        currentBalance: newBalance,
        updatedAt: Date.now(),
      };
    }

    return acc;
  });
}

/**
 * Reverts the financial impact of a transaction (used before editing or deleting a transaction).
 */
export function revertTransactionFromAccounts(
  accounts: Account[],
  transaction: Transaction
): Account[] {
  if (transaction.skipBalanceUpdate) {
    return accounts;
  }

  return accounts.map((acc) => {
    let newBalance = acc.currentBalance;

    if (acc.id === transaction.sourceAccountId) {
      if (transaction.type === 'EXPENSE') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'INCOME') {
        newBalance -= transaction.amount;
      } else if (transaction.type === 'SELF_TRANSFER') {
        newBalance += transaction.amount;
      } else if (transaction.type === 'ADJUSTMENT') {
        newBalance += transaction.amount;
      }
    }

    if (
      transaction.type === 'SELF_TRANSFER' &&
      transaction.destinationAccountId &&
      acc.id === transaction.destinationAccountId
    ) {
      newBalance -= transaction.amount;
    }

    if (newBalance !== acc.currentBalance) {
      return {
        ...acc,
        currentBalance: newBalance,
        updatedAt: Date.now(),
      };
    }

    return acc;
  });
}

/**
 * Generates an auditable transaction that zeroes out an account balance.
 */
export function createEmptyBalanceTransaction(
  account: Account,
  bookId: string
): { transaction: Transaction; updatedAccount: Account } {
  const current = account.currentBalance;
  const isPositive = current >= 0;

  const transaction: Transaction = {
    id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    bookId,
    type: 'ADJUSTMENT',
    amount: Math.abs(current),
    categoryId: 'cat_system_adjustment',
    remark: `Emptied account balance (was ${current})`,
    dateTime: new Date().toISOString(),
    mode: account.type === 'CASH_WALLET' ? 'CASH' : 'BANK',
    sourceAccountId: account.id,
    skipBalanceUpdate: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedAccount: Account = {
    ...account,
    currentBalance: 0,
    updatedAt: Date.now(),
  };

  return { transaction, updatedAccount };
}

/**
 * Soft deletes an account. Existing transactions remain untouched,
 * and will display as "Uncategorised bank" via resolveAccountName().
 */
export function softDeleteAccount(
  accounts: Account[],
  accountId: string
): Account[] {
  return accounts.map((acc) => {
    if (acc.id === accountId) {
      return {
        ...acc,
        isDeleted: true,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    return acc;
  });
}

/**
 * Calculates net worth across all non-deleted accounts.
 */
export function calculateNetWorth(accounts: Account[]): number {
  return accounts
    .filter((a) => !a.isDeleted)
    .reduce((sum, a) => sum + a.currentBalance, 0);
}
