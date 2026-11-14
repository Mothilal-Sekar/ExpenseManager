import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useApp } from '../context/AppContext';
import { resolveAccountName } from '../services/balanceEngine';
import {
  formatDateKey,
  formatFriendlyDate,
  formatFriendlyTime,
} from '../services/dateUtils';
import { Transaction, TransactionMode, TransactionType } from '../types';
import { DatePickerModal } from '../components/common/DatePickerModal';

interface HistoryScreenProps {
  initialDateFilter?: string;
}

type DateFilterPreset =
  | 'ALL_TIME'
  | 'TODAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  initialDateFilter,
}) => {
  const {
    transactions,
    accounts,
    categories,
    books,
    settings,
    selectedBookId,
    setSelectedBookId,
    deleteTransaction,
    setPrefilledTransaction,
    setIsTransactionModalOpen,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL'); // ALL, CASH, CARD, BANK, UPI, UNCATEGORISED
  const [selectedType, setSelectedType] = useState<string>('ALL'); // ALL, EXPENSE, INCOME, SELF_TRANSFER

  // Date Filter State
  const [datePreset, setDatePreset] = useState<DateFilterPreset>(() => {
    return initialDateFilter ? 'CUSTOM' : 'ALL_TIME';
  });
  const [customStartDate, setCustomStartDate] = useState<string>(
    initialDateFilter || ''
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initialDateFilter || ''
  );

  // Date picker modal trigger state
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);

  // Collapsible Expense Breakdown State
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(true);

  // High-performance record limit (default 30 records)
  const [visibleLimit, setVisibleLimit] = useState<number>(30);
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false);

  // Reset pagination limit on filter changes
  useEffect(() => {
    setVisibleLimit(30);
    setShowAllRecords(false);
  }, [
    selectedBookId,
    datePreset,
    customStartDate,
    customEndDate,
    selectedType,
    selectedMode,
    searchQuery,
  ]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayKey = formatDateKey(now);

    // Compute start and end for week/month presets
    let presetStartKey = '';
    let presetEndKey = '';

    if (datePreset === 'TODAY') {
      presetStartKey = todayKey;
      presetEndKey = todayKey;
    } else if (datePreset === 'THIS_WEEK') {
      const past7 = new Date();
      past7.setDate(past7.getDate() - 6);
      presetStartKey = formatDateKey(past7);
      presetEndKey = todayKey;
    } else if (datePreset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      presetStartKey = formatDateKey(firstDay);
      presetEndKey = formatDateKey(lastDay);
    } else if (datePreset === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      presetStartKey = formatDateKey(firstDayLastMonth);
      presetEndKey = formatDateKey(lastDayLastMonth);
    }

    return transactions.filter((tx) => {
      // 1. Book filter (Inside History)
      if (selectedBookId !== 'ALL' && tx.bookId !== selectedBookId) return false;

      // 2. Date Filtering
      const txDateKey = formatDateKey(new Date(tx.dateTime));
      if (datePreset === 'CUSTOM') {
        if (customStartDate && txDateKey < customStartDate) return false;
        if (customEndDate && txDateKey > customEndDate) return false;
      } else if (datePreset !== 'ALL_TIME') {
        if (presetStartKey && txDateKey < presetStartKey) return false;
        if (presetEndKey && txDateKey > presetEndKey) return false;
      }

      // 3. Type filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

      // 4. Mode filter (handles CASH, CARD, BANK, UPI, and UNCATEGORISED)
      if (selectedMode !== 'ALL') {
        const sourceInfo = resolveAccountName(tx.sourceAccountId, accounts);
        if (selectedMode === 'UNCATEGORISED') {
          if (!sourceInfo.isUncategorised) return false;
        } else {
          if (tx.mode !== selectedMode) return false;
        }
      }

      // 5. Search query (remark, category name, amount)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = categories.find((c) => c.id === tx.categoryId);
        const matchesRemark = tx.remark?.toLowerCase().includes(q);
        const matchesCat = cat?.name.toLowerCase().includes(q);
        const matchesAmount = String(tx.amount).includes(q);
        if (!matchesRemark && !matchesCat && !matchesAmount) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedBookId,
    datePreset,
    customStartDate,
    customEndDate,
    selectedType,
    selectedMode,
    searchQuery,
    accounts,
    categories,
  ]);

  // Dashboard KPIs calculated from filtered transactions
  const dashboardKPIs = useMemo(() => {
    let inflow = 0;
    let outflow = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') {
        inflow += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        outflow += tx.amount;
      }
    });

    return {
      inflow,
      outflow,
      net: inflow - outflow,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Monthly / Category Expense Breakdown computed from filtered transactions
  const categoryBreakdown = useMemo(() => {
    const expenses = filteredTransactions.filter((tx) => tx.type === 'EXPENSE');
    const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0);

    const map = new Map<
      string,
      { categoryId: string; name: string; icon: string; color: string; amount: number; count: number }
    >();

    expenses.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catId = tx.categoryId || 'uncategorised';
      const existing = map.get(catId);
      if (existing) {
        existing.amount += tx.amount;
        existing.count += 1;
      } else {
        map.set(catId, {
          categoryId: catId,
          name: cat?.name || 'Uncategorised',
          icon: cat?.icon || 'pricetag-outline',
          color: cat?.color || Colors.textSecondary,
          amount: tx.amount,
          count: 1,
        });
      }
    });

    const items = Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        ...item,
        percentage: totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0,
      }));

    return {
      totalExpense,
      items,
    };
  }, [filteredTransactions, categories]);

  // Memory optimization: Slice transactions for rendering
  const displayedTransactions = useMemo(() => {
    return showAllRecords
      ? filteredTransactions
      : filteredTransactions.slice(0, visibleLimit);
  }, [filteredTransactions, showAllRecords, visibleLimit]);

  // Group displayed transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    displayedTransactions.forEach((tx) => {
      const dateKey = formatDateKey(new Date(tx.dateTime));
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [displayedTransactions]);

  const handleDeletePrompt = (tx: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${tx.type.toLowerCase()} of ${settings.currencySymbol}${tx.amount}? ${
        tx.skipBalanceUpdate
          ? '(This transaction had skipped balance update, so account balances will remain unchanged.)'
          : 'Its financial impact will be reverted from your account balance.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction(tx.id),
        },
      ]
    );
  };

  const handleEditTx = (tx: Transaction) => {
    setPrefilledTransaction({
      id: tx.id,
      bookId: tx.bookId,
      type: tx.type,
      amount: tx.amount,
      categoryId: tx.categoryId,
      subcategoryId: tx.subcategoryId,
      remark: tx.remark,
      dateTime: tx.dateTime,
      mode: tx.mode,
      sourceAccountId: tx.sourceAccountId,
      destinationAccountId: tx.destinationAccountId,
      skipBalanceUpdate: tx.skipBalanceUpdate,
    });
    setIsTransactionModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* App Bar without duplicate Ledger filter */}
      <Header title="Transaction History" showBookSelector={false} />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search remarks, categories, or amounts..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* History Dashboard KPI Card */}
      <View style={styles.historyDashboardCard}>
        <View style={styles.dashboardTopRow}>
          <Text style={styles.dashboardTitle}>Filtered Summary</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {dashboardKPIs.count} {dashboardKPIs.count === 1 ? 'Entry' : 'Entries'}
            </Text>
          </View>
        </View>

        <View style={styles.dashboardKPIsRow}>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Total Inflow</Text>
            <Text style={[styles.kpiValue, { color: Colors.income }]}>
              +{settings.currencySymbol}
              {dashboardKPIs.inflow.toLocaleString()}
            </Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Total Outflow</Text>
            <Text style={[styles.kpiValue, { color: Colors.expense }]}>
              -{settings.currencySymbol}
              {dashboardKPIs.outflow.toLocaleString()}
            </Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Net Balance</Text>
            <Text
              style={[
                styles.kpiValue,
                {
                  color:
                    dashboardKPIs.net >= 0 ? Colors.textPrimary : Colors.expense,
                },
              ]}
            >
              {settings.currencySymbol}
              {dashboardKPIs.net.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Filters Section */}
      <View style={styles.filtersWrapper}>
        {/* 1. Internal Ledger Selector Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          <Text style={styles.filterGroupLabel}>Ledger:</Text>
          <TouchableOpacity
            style={[
              styles.chip,
              selectedBookId === 'ALL' && styles.chipActive,
            ]}
            onPress={() => setSelectedBookId('ALL')}
          >
            <Text
              style={[
                styles.chipText,
                selectedBookId === 'ALL' && styles.chipTextActive,
              ]}
            >
              All Ledgers
            </Text>
          </TouchableOpacity>

          {books.map((b) => {
            const isSelected = selectedBookId === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  { borderLeftColor: b.color, borderLeftWidth: 3 },
                ]}
                onPress={() => setSelectedBookId(b.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {b.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Date Filter Presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterChipRow, { marginTop: 6 }]}
        >
          <Text style={styles.filterGroupLabel}>Date:</Text>
          {(
            [
              { id: 'ALL_TIME', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ] as const
          ).map((p) => {
            const isSelected = datePreset === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setDatePreset(p.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom Date Range Picker Triggers */}
        {datePreset === 'CUSTOM' && (
          <View style={styles.customDateInputsRow}>
            <TouchableOpacity
              style={styles.datePickerTriggerBtn}
              onPress={() => setDatePickerTarget('START')}
            >
              <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
              <View style={styles.datePickerTriggerTexts}>
                <Text style={styles.dateFieldSubLabel}>From</Text>
                <Text style={styles.dateFieldValText} numberOfLines={1}>
                  {customStartDate ? formatFriendlyDate(customStartDate) : 'Pick start date'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.datePickerTriggerBtn}
              onPress={() => setDatePickerTarget('END')}
            >
              <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
              <View style={styles.datePickerTriggerTexts}>
                <Text style={styles.dateFieldSubLabel}>To</Text>
                <Text style={styles.dateFieldValText} numberOfLines={1}>
                  {customEndDate ? formatFriendlyDate(customEndDate) : 'Pick end date'}
                </Text>
              </View>
            </TouchableOpacity>

            {(customStartDate || customEndDate) ? (
              <TouchableOpacity
                style={styles.clearDateBtn}
                onPress={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
              >
                <Ionicons name="close-circle" size={18} color={Colors.expense} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* 3. Filter Chips: Mode & Type Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterChipRow, { marginTop: 6 }]}
        >
          <Text style={styles.filterGroupLabel}>Type:</Text>
          {['ALL', 'EXPENSE', 'INCOME', 'SELF_TRANSFER'].map((t) => {
            const isSelected = selectedType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedType(t)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {t === 'SELF_TRANSFER' ? 'Self Transfer' : t}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ width: 8 }} />
          <Text style={styles.filterGroupLabel}>Mode:</Text>
          {['ALL', 'CASH', 'CARD', 'BANK', 'UPI', 'UNCATEGORISED'].map((m) => {
            const isSelected = selectedMode === m;
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.chip,
                  isSelected && styles.chipActive,
                  m === 'UNCATEGORISED' && styles.chipUncategorised,
                ]}
                onPress={() => setSelectedMode(m)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextActive,
                    m === 'UNCATEGORISED' && styles.chipTextUncategorised,
                  ]}
                >
                  {m === 'UNCATEGORISED' ? 'Uncategorised Bank' : m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Grouped Transaction List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly / Filtered Expense Breakdown Accordion */}
        {categoryBreakdown.items.length > 0 && (
          <View style={styles.breakdownCard}>
            <TouchableOpacity
              style={styles.breakdownHeaderRow}
              onPress={() => setIsBreakdownOpen(!isBreakdownOpen)}
            >
              <View style={styles.breakdownTitleWrap}>
                <Ionicons name="pie-chart-outline" size={17} color={Colors.primary} />
                <Text style={styles.breakdownTitle}>
                  Expense Breakdown ({categoryBreakdown.items.length} Categories)
                </Text>
              </View>
              <View style={styles.breakdownHeaderRight}>
                <Text style={styles.breakdownTotalSpent}>
                  -{settings.currencySymbol}
                  {categoryBreakdown.totalExpense.toLocaleString()}
                </Text>
                <Ionicons
                  name={isBreakdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {isBreakdownOpen && (
              <View style={styles.breakdownBody}>
                {/* Distribution Segment Bar */}
                <View style={styles.multiBar}>
                  {categoryBreakdown.items.map((cat) => (
                    <View
                      key={cat.categoryId}
                      style={[
                        styles.barSegment,
                        {
                          flex: Math.max(cat.percentage, 2),
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* Category List */}
                <View style={styles.catBreakdownList}>
                  {categoryBreakdown.items.map((cat) => (
                    <View key={cat.categoryId} style={styles.catBreakdownRow}>
                      <View style={styles.catBreakdownLeft}>
                        <View
                          style={[
                            styles.catDot,
                            { backgroundColor: cat.color },
                          ]}
                        />
                        <Text style={styles.catBreakdownName} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <Text style={styles.catTxCount}>
                          ({cat.count} {cat.count === 1 ? 'tx' : 'txs'})
                        </Text>
                      </View>
                      <View style={styles.catBreakdownRight}>
                        <Text style={styles.catBreakdownAmount}>
                          {settings.currencySymbol}
                          {cat.amount.toLocaleString()}
                        </Text>
                        <Text style={styles.catBreakdownPct}>
                          {cat.percentage}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {displayedTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters, ledger selection, or search query.
            </Text>
          </View>
        ) : (
          groupedTransactions.map(([dateKey, txList]) => {
            const dayIncome = txList
              .filter((tx) => tx.type === 'INCOME')
              .reduce((sum, tx) => sum + tx.amount, 0);

            const dayExpense = txList
              .filter((tx) => tx.type === 'EXPENSE')
              .reduce((sum, tx) => sum + tx.amount, 0);

            return (
              <View key={dateKey} style={styles.dateGroupCard}>
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupTitle}>
                    {formatFriendlyDate(dateKey)}
                  </Text>
                  <View style={styles.dayTotalsRow}>
                    {dayIncome > 0 && (
                      <Text style={styles.dayIncomeText}>
                        +{settings.currencySymbol}
                        {dayIncome.toLocaleString()}
                      </Text>
                    )}
                    {dayExpense > 0 && (
                      <Text style={styles.dayExpenseText}>
                        -{settings.currencySymbol}
                        {dayExpense.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>

                {txList.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const sub = cat?.subcategories.find(
                    (s) => s.id === tx.subcategoryId
                  );
                  const sourceInfo = resolveAccountName(
                    tx.sourceAccountId,
                    accounts
                  );
                  const destInfo = tx.destinationAccountId
                    ? resolveAccountName(tx.destinationAccountId, accounts)
                    : null;
                  const targetBook = books.find((b) => b.id === tx.bookId);

                  const isExpense = tx.type === 'EXPENSE';
                  const isIncome = tx.type === 'INCOME';
                  const isSelfTransfer = tx.type === 'SELF_TRANSFER';

                  const amountColor = isIncome
                    ? Colors.income
                    : isExpense
                    ? Colors.expense
                    : Colors.primary;

                  const prefix = isIncome ? '+' : isExpense ? '-' : '';

                  return (
                    <View key={tx.id} style={styles.txRow}>
                      <View
                        style={[
                          styles.catIconWrap,
                          { backgroundColor: cat ? `${cat.color}20` : '#F1F5F9' },
                        ]}
                      >
                        <Ionicons
                          name={
                            (cat?.icon as keyof typeof Ionicons.glyphMap) ||
                            'cash-outline'
                          }
                          size={18}
                          color={cat?.color || Colors.textPrimary}
                        />
                      </View>

                      <View style={styles.txDetails}>
                        <View style={styles.txTopLine}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {cat?.name || 'Uncategorised'}
                            {sub ? ` • ${sub.name}` : ''}
                          </Text>
                          <Text style={[styles.txAmount, { color: amountColor }]}>
                            {prefix}
                            {settings.currencySymbol}
                            {tx.amount.toLocaleString()}
                          </Text>
                        </View>

                        {tx.remark ? (
                          <Text style={styles.txRemark} numberOfLines={1}>
                            {tx.remark}
                          </Text>
                        ) : null}

                        <View style={styles.txFooter}>
                          <View style={styles.badgeRow}>
                            <View
                              style={[
                                styles.badge,
                                sourceInfo.isUncategorised &&
                                  styles.badgeUncategorised,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  sourceInfo.isUncategorised &&
                                    styles.badgeTextUncategorised,
                                ]}
                              >
                                {isSelfTransfer && destInfo
                                  ? `${sourceInfo.name} → ${destInfo.name}`
                                  : sourceInfo.name}
                              </Text>
                            </View>

                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{tx.mode}</Text>
                            </View>

                            {targetBook && selectedBookId === 'ALL' && (
                              <View
                                style={[
                                  styles.badge,
                                  {
                                    borderColor: targetBook.color,
                                    borderWidth: 1,
                                  },
                                ]}
                              >
                                <Text style={styles.badgeText}>
                                  {targetBook.name}
                                </Text>
                              </View>
                            )}

                            {tx.skipBalanceUpdate && (
                              <View style={styles.skipBadge}>
                                <Text style={styles.skipBadgeText}>
                                  Skipped balance
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.txTime}>
                            {formatFriendlyTime(tx.dateTime)}
                          </Text>
                        </View>
                      </View>

                      {/* Edit and Delete Actions */}
                      <View style={styles.itemActionsCol}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => handleEditTx(tx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="pencil"
                            size={15}
                            color={Colors.primary}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeletePrompt(tx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color={Colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}

        {/* 30-Record Memory Optimization Pagination Banner */}
        {filteredTransactions.length > 30 && (
          <View style={styles.paginationCard}>
            <View style={styles.paginationInfoRow}>
              <Ionicons
                name={showAllRecords ? 'alert-circle-outline' : 'layers-outline'}
                size={16}
                color={showAllRecords ? Colors.expense : Colors.primary}
              />
              <Text style={styles.paginationInfoText}>
                {showAllRecords
                  ? `Showing all ${filteredTransactions.length} records without cap`
                  : `Showing ${Math.min(visibleLimit, filteredTransactions.length)} of ${filteredTransactions.length} transactions (Memory optimized)`}
              </Text>
            </View>

            <View style={styles.paginationActionsRow}>
              {!showAllRecords && visibleLimit < filteredTransactions.length && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleLimit((prev) => prev + 30)}
                >
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.loadMoreBtnText}>Load 30 More</Text>
                </TouchableOpacity>
              )}

              {!showAllRecords ? (
                <TouchableOpacity
                  style={styles.showAllBtn}
                  onPress={() => setShowAllRecords(true)}
                >
                  <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.showAllBtnText}>
                    Show All ({filteredTransactions.length})
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.collapseLimitBtn}
                  onPress={() => {
                    setShowAllRecords(false);
                    setVisibleLimit(30);
                  }}
                >
                  <Ionicons name="contract-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.collapseLimitBtnText}>
                    Restore 30 Record Limit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Universal Date Picker Modal */}
      <DatePickerModal
        visible={datePickerTarget !== null}
        mode="date"
        title={datePickerTarget === 'START' ? 'Select Start Date' : 'Select End Date'}
        initialDate={
          datePickerTarget === 'START'
            ? customStartDate || new Date().toISOString().split('T')[0]
            : customEndDate || new Date().toISOString().split('T')[0]
        }
        onConfirm={(pickedDate) => {
          if (datePickerTarget === 'START') {
            setCustomStartDate(pickedDate);
          } else if (datePickerTarget === 'END') {
            setCustomEndDate(pickedDate);
          }
          setDatePickerTarget(null);
        }}
        onClose={() => setDatePickerTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },
  historyDashboardCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dashboardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dashboardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  dashboardKPIsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  filtersWrapper: {
    backgroundColor: Colors.cardBackground,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filterChipRow: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  filterGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginRight: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipUncategorised: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  chipTextUncategorised: {
    color: '#EF4444',
  },
  customDateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  datePickerTriggerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerTriggerTexts: {
    flex: 1,
  },
  dateFieldSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  dateFieldValText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  clearDateBtn: {
    padding: 6,
  },
  breakdownCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  breakdownHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownTotalSpent: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.expense,
  },
  breakdownBody: {
    marginTop: 10,
  },
  multiBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceVariant,
    marginBottom: 10,
  },
  barSegment: {
    height: '100%',
  },
  catBreakdownList: {
    gap: 6,
  },
  catBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  catBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catBreakdownName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: 140,
  },
  catTxCount: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  catBreakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catBreakdownAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  catBreakdownPct: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 30,
  },
  dateGroupCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 8,
  },
  dateGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayIncomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.income,
  },
  dayExpenseText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.expense,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txDetails: {
    flex: 1,
  },
  txTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txRemark: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeUncategorised: {
    backgroundColor: '#FEF2F2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badgeTextUncategorised: {
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
  txTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  itemActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  editBtn: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  paginationCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  paginationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paginationInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  paginationActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  loadMoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  showAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  collapseLimitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
  },
  collapseLimitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
