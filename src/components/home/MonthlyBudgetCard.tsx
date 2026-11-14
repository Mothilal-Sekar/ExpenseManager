import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { MonthlyBudgetModal } from './MonthlyBudgetModal';

export const MonthlyBudgetCard: React.FC = () => {
  const { transactions, categories, settings, selectedDate } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const activeDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : new Date();
  const currentYear = activeDate.getFullYear();
  const currentMonth = activeDate.getMonth();
  const currentMonthLabel = activeDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate actual spending per category for the current month
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type !== 'EXPENSE') return;
      const txDate = new Date(tx.dateTime);
      if (
        txDate.getFullYear() === currentYear &&
        txDate.getMonth() === currentMonth
      ) {
        spending[tx.categoryId] = (spending[tx.categoryId] || 0) + tx.amount;
      }
    });
    return spending;
  }, [transactions, currentYear, currentMonth]);

  const categoryBudgets = settings.categoryBudgets || {};
  const allocatedEntries = Object.entries(categoryBudgets).filter(
    ([_, amount]) => amount > 0
  );

  // Compute totals
  const totalAllocated = allocatedEntries.reduce((sum, [_, amt]) => sum + amt, 0);
  const totalSpent = Object.values(categorySpending).reduce((sum, amt) => sum + amt, 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);
  const overallPercentage =
    totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Prepare top allocated categories with spending
  const budgetList = useMemo(() => {
    return allocatedEntries
      .map(([catId, allocated]) => {
        const cat = categories.find((c) => c.id === catId);
        const spent = categorySpending[catId] || 0;
        const remaining = allocated - spent;
        const percentage = Math.round((spent / allocated) * 100);
        return {
          catId,
          name: cat?.name || 'Category',
          icon: cat?.icon || 'pricetag',
          color: cat?.color || Colors.primary,
          allocated,
          spent,
          remaining,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [allocatedEntries, categories, categorySpending]);

  const isOverBudget = totalSpent > totalAllocated && totalAllocated > 0;

  return (
    <View style={[styles.card, Shadows.small]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <View style={styles.badgeIconWrap}>
            <Ionicons name="pie-chart" size={16} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Monthly Budget Planning</Text>
            <Text style={styles.cardSubtitle}>{currentMonthLabel}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.planBtn}
          onPress={() => setIsModalOpen(true)}
        >
          <Ionicons name="create-outline" size={14} color={Colors.primary} />
          <Text style={styles.planBtnText}>Plan Budget</Text>
        </TouchableOpacity>
      </View>

      {/* Main Budget Progress Section */}
      {totalAllocated > 0 ? (
        <View style={styles.summaryBox}>
          <View style={styles.figuresRow}>
            <View>
              <Text style={styles.figureLabel}>Spent This Month</Text>
              <Text
                style={[
                  styles.figureValueSpent,
                  isOverBudget && styles.figureValueOver,
                ]}
              >
                {settings.currencySymbol}
                {totalSpent.toLocaleString()}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View>
              <Text style={styles.figureLabel}>Allocated Target</Text>
              <Text style={styles.figureValueTotal}>
                {settings.currencySymbol}
                {totalAllocated.toLocaleString()}
              </Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.figureLabel}>
                {isOverBudget ? 'Over Budget' : 'Remaining'}
              </Text>
              <Text
                style={[
                  styles.figureValueRemaining,
                  isOverBudget && styles.figureValueOver,
                ]}
              >
                {isOverBudget ? '+' : ''}
                {settings.currencySymbol}
                {Math.abs(totalAllocated - totalSpent).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, overallPercentage)}%`,
                  backgroundColor:
                    overallPercentage >= 100
                      ? Colors.expense
                      : overallPercentage >= 80
                      ? Colors.warning
                      : '#10B981',
                },
              ]}
            />
          </View>

          <View style={styles.progressSubRow}>
            <Text style={styles.progressPercentText}>
              {overallPercentage}% of monthly budget used
            </Text>
            {isOverBudget && (
              <View style={styles.alertChip}>
                <Ionicons name="alert-circle" size={11} color="#EF4444" />
                <Text style={styles.alertChipText}>Budget Exceeded</Text>
              </View>
            )}
          </View>

          {/* Category Allocations Highlights */}
          {budgetList.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={styles.catSectionHeading}>Category Allocations:</Text>
              {budgetList.slice(0, 3).map((item) => (
                <View key={item.catId} style={styles.catItemRow}>
                  <View style={styles.catItemLeft}>
                    <View
                      style={[
                        styles.catDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.catItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  <View style={styles.catItemRight}>
                    <Text style={styles.catSpentText}>
                      {settings.currencySymbol}
                      {item.spent.toLocaleString()} /{' '}
                      <Text style={styles.catAllocatedText}>
                        {settings.currencySymbol}
                        {item.allocated.toLocaleString()}
                      </Text>
                    </Text>
                    <View style={styles.catMiniBarBg}>
                      <View
                        style={[
                          styles.catMiniBarFill,
                          {
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor:
                              item.percentage >= 100
                                ? Colors.expense
                                : item.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyBudgetBox}>
          <Text style={styles.emptyTitle}>No Monthly Budget Configured</Text>
          <Text style={styles.emptyDesc}>
            Allocate targets for Food, Shopping, Transport, and Bills to stay on track.
          </Text>
          <TouchableOpacity
            style={styles.emptySetBtn}
            onPress={() => setIsModalOpen(true)}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" />
            <Text style={styles.emptySetBtnText}>Set Monthly Allocations</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal */}
      <MonthlyBudgetModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  planBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryBox: {
    gap: 10,
  },
  figuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    padding: 12,
    borderRadius: 12,
  },
  figureLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  figureValueSpent: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  figureValueTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  figureValueRemaining: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  figureValueOver: {
    color: Colors.expense,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  categoriesSection: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 6,
  },
  catSectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  catItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catItemName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  catItemRight: {
    alignItems: 'flex-end',
    width: 140,
  },
  catSpentText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  catAllocatedText: {
    fontWeight: '400',
    color: Colors.textMuted,
  },
  catMiniBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
  },
  catMiniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyBudgetBox: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  emptySetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  emptySetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
