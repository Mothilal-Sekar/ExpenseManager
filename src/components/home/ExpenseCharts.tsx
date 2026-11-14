import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

interface ExpenseChartsProps {
  forceAllBooks?: boolean;
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({
  forceAllBooks = false,
}) => {
  const { transactions, categories, selectedBookId, settings, selectedDate } =
    useApp();
  const effectiveBookId = forceAllBooks ? 'ALL' : selectedBookId;

  // Use selected month from selectedDate, fallback to current calendar month
  const activeDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : new Date();
  const currentYear = activeDate.getFullYear();
  const currentMonth = activeDate.getMonth();
  const monthName = activeDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryTotals: Record<string, number> = {};

  transactions.forEach((tx) => {
    if (effectiveBookId !== 'ALL' && tx.bookId !== effectiveBookId) return;

    const txDate = new Date(tx.dateTime);
    if (
      txDate.getFullYear() === currentYear &&
      txDate.getMonth() === currentMonth
    ) {
      if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
        categoryTotals[tx.categoryId] =
          (categoryTotals[tx.categoryId] || 0) + tx.amount;
      } else if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      }
    }
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        id: catId,
        name: cat?.name || 'Other',
        color: cat?.color || Colors.primary,
        icon: cat?.icon || 'pricetag',
        amount,
        percentage:
          totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4); // Top 4 categories

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{monthName} Breakdown</Text>
          <Text style={styles.subtitle}>Selected Month Expenses</Text>
        </View>
        <Text style={styles.totalBadge}>
          {settings.currencySymbol}
          {totalExpense.toLocaleString()}
        </Text>
      </View>

      {totalExpense === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pie-chart-outline" size={24} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            No expenses recorded for {monthName}.
          </Text>
        </View>
      ) : (
        <>
          {/* Multi-segment distribution bar */}
          <View style={styles.multiBar}>
            {sortedCategories.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.barSegment,
                  {
                    backgroundColor: item.color,
                    flex: Math.max(item.percentage, 5),
                  },
                ]}
              />
            ))}
          </View>

          {/* Category items */}
          <View style={styles.categoryList}>
            {sortedCategories.map((item) => (
              <View key={item.id} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View
                    style={[styles.dotIndicator, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    {settings.currencySymbol}
                    {item.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    ({item.percentage}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
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
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  totalBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.expense,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  multiBar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  categoryList: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryPercentage: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
