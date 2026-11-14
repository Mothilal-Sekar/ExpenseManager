import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { resolveAccountName } from '../../services/balanceEngine';
import { formatDateKey, formatFriendlyDate, formatFriendlyTime } from '../../services/dateUtils';
import { Account, Category, Subcategory, Transaction } from '../../types';

interface DayTransactionsListProps {
  onNavigateToHistory: (dateKey?: string) => void;
  forceAllBooks?: boolean;
}

export const DayTransactionsList: React.FC<DayTransactionsListProps> = ({
  onNavigateToHistory,
  forceAllBooks = false,
}) => {
  const {
    transactions,
    selectedDate,
    selectedBookId,
    accounts,
    categories,
    settings,
    setIsTransactionModalOpen,
    setPrefilledTransaction,
  } = useApp();

  const effectiveBookId = forceAllBooks ? 'ALL' : selectedBookId;

  // Filter transactions for selected day & book
  const dayTransactions = transactions.filter((tx) => {
    if (effectiveBookId !== 'ALL' && tx.bookId !== effectiveBookId) return false;
    const txDateKey = formatDateKey(new Date(tx.dateTime));
    return txDateKey === selectedDate;
  });

  const totalCount = dayTransactions.length;
  // Requirement: Show up to 5 transactions for the selected day on the home screen
  const visibleTransactions = dayTransactions.slice(0, 5);

  const friendlySelectedDate = formatFriendlyDate(selectedDate);

  const handleAddNewForDate = () => {
    setPrefilledTransaction({
      dateTime: `${selectedDate}T${new Date().toTimeString().split(' ')[0]}.000Z`,
      type: 'EXPENSE',
      skipBalanceUpdate: false,
    });
    setIsTransactionModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>{friendlySelectedDate}</Text>
          <Text style={styles.subtitle}>
            {totalCount === 0
              ? 'No entries recorded'
              : `${totalCount} transaction${totalCount > 1 ? 's' : ''}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNewForDate}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add for Day</Text>
        </TouchableOpacity>
      </View>

      {/* List or Empty State */}
      {visibleTransactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="receipt-outline"
            size={36}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyText}>
            No transactions found for {friendlySelectedDate}.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleAddNewForDate}
          >
            <Text style={styles.emptyButtonText}>+ Record Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              currencySymbol={settings.currencySymbol}
              accounts={accounts}
              categories={categories}
              onEdit={() => {
                setPrefilledTransaction(tx);
                setIsTransactionModalOpen(true);
              }}
            />
          ))}

          {/* Show "View all in History" link if more than 5 */}
          {totalCount > 5 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => onNavigateToHistory(selectedDate)}
            >
              <Text style={styles.viewAllText}>
                View all {totalCount} transactions in History
              </Text>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={Colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const TransactionItem: React.FC<{
  transaction: Transaction;
  currencySymbol: string;
  accounts: Account[];
  categories: Category[];
  onEdit: () => void;
}> = ({ transaction, currencySymbol, accounts, categories, onEdit }) => {
  const category = categories.find((c) => c.id === transaction.categoryId);
  const subcategory = category?.subcategories.find(
    (s: Subcategory) => s.id === transaction.subcategoryId
  );

  const sourceAccountInfo = resolveAccountName(
    transaction.sourceAccountId,
    accounts
  );
  const destAccountInfo = transaction.destinationAccountId
    ? resolveAccountName(transaction.destinationAccountId, accounts)
    : null;

  const isIncome = transaction.type === 'INCOME';
  const isExpense = transaction.type === 'EXPENSE';
  const isSelfTransfer = transaction.type === 'SELF_TRANSFER';

  const amountColor = isIncome
    ? Colors.income
    : isExpense
    ? Colors.expense
    : Colors.transfer;

  const amountPrefix = isIncome ? '+' : isExpense ? '-' : '';

  return (
    <View style={styles.itemContainer}>
      {/* Category Icon */}
      <View
        style={[
          styles.iconBox,
          { backgroundColor: category ? `${category.color}18` : '#F1F5F9' },
        ]}
      >
        <Ionicons
          name={
            (category?.icon as any) ||
            (isSelfTransfer ? 'swap-horizontal' : 'receipt-outline')
          }
          size={18}
          color={category?.color || Colors.primary}
        />
      </View>

      {/* Main Details */}
      <View style={styles.detailsCol}>
        <View style={styles.topDetailRow}>
          <Text style={styles.categoryName} numberOfLines={1}>
            {isSelfTransfer ? 'Self Transfer' : category?.name || 'Uncategorised'}
          </Text>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {amountPrefix}
            {currencySymbol}
            {transaction.amount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.bottomDetailRow}>
          {/* Subcategory & Remark */}
          <Text style={styles.remarkText} numberOfLines={1}>
            {transaction.remark ||
              subcategory?.name ||
              (isSelfTransfer
                ? `${sourceAccountInfo.name} -> ${destAccountInfo?.name || 'Wallet'}`
                : 'No remark')}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.timeText}>
              {formatFriendlyTime(transaction.dateTime)}
            </Text>
            <TouchableOpacity onPress={onEdit} style={{ padding: 2 }}>
              <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Mode Badges */}
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.modeBadge,
              sourceAccountInfo.isUncategorised && styles.modeBadgeUncategorised,
            ]}
          >
            <Text
              style={[
                styles.modeBadgeText,
                sourceAccountInfo.isUncategorised &&
                  styles.modeBadgeTextUncategorised,
              ]}
            >
              {transaction.mode}: {sourceAccountInfo.name}
            </Text>
          </View>

          {isSelfTransfer && destAccountInfo && (
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                To: {destAccountInfo.name}
              </Text>
            </View>
          )}

          {transaction.skipBalanceUpdate && (
            <View style={styles.skipBadge}>
              <Text style={styles.skipBadgeText}>Skipped Balance</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  list: {
    gap: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
  },
  topDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  remarkText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  modeBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeBadgeUncategorised: {
    backgroundColor: '#FEF2F2',
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modeBadgeTextUncategorised: {
    color: '#EF4444',
  },
  skipBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
