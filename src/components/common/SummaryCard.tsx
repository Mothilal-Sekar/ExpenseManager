import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { calculateNetWorth } from '../../services/balanceEngine';

interface SummaryCardProps {
  forceAllBooks?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  forceAllBooks = false,
}) => {
  const { accounts, transactions, selectedBookId, settings } = useApp();
  const effectiveBookId = forceAllBooks ? 'ALL' : selectedBookId;

  const netWorth = calculateNetWorth(accounts);
  const cashWallet = accounts.find((a) => a.type === 'CASH_WALLET' && !a.isDeleted);
  const cashBalance = cashWallet ? cashWallet.currentBalance : 0;

  // Calculate current month's income & expenses
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  transactions.forEach((tx) => {
    // If book filter active, respect book
    if (effectiveBookId !== 'ALL' && tx.bookId !== effectiveBookId) {
      return;
    }

    const txDate = new Date(tx.dateTime);
    if (
      txDate.getFullYear() === currentYear &&
      txDate.getMonth() === currentMonth
    ) {
      if (tx.type === 'INCOME') {
        monthlyIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        monthlyExpense += tx.amount;
      }
    }
  });

  return (
    <View style={[styles.card, Shadows.small]}>
      {/* Top row: Net Balance & Cash Wallet pill */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>Total Net Balance</Text>
          <Text style={styles.netBalance}>
            {settings.currencySymbol}
            {netWorth.toLocaleString()}
          </Text>
        </View>

        <View style={styles.cashWalletBadge}>
          <Ionicons name="wallet-outline" size={14} color="#059669" />
          <Text style={styles.cashWalletText}>
            Cash: {settings.currencySymbol}
            {cashBalance.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Bottom row: Income & Expense metrics */}
      <View style={styles.bottomRow}>
        <View style={styles.metricItem}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.incomeLight }]}>
            <Ionicons name="arrow-down" size={14} color={Colors.income} />
          </View>
          <View>
            <Text style={styles.metricLabel}>This Month Income</Text>
            <Text style={[styles.metricValue, { color: Colors.income }]}>
              +{settings.currencySymbol}
              {monthlyIncome.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.metricItem}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.expenseLight }]}>
            <Ionicons name="arrow-up" size={14} color={Colors.expense} />
          </View>
          <View>
            <Text style={styles.metricLabel}>This Month Expense</Text>
            <Text style={[styles.metricValue, { color: Colors.expense }]}>
              -{settings.currencySymbol}
              {monthlyExpense.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netBalance: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  cashWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cashWalletText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 10,
  },
});
