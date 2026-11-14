import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Category, Subcategory, Transaction } from '../../types';
import { formatFriendlyDate } from '../../services/dateUtils';

interface CategoryExpensesModalProps {
  visible: boolean;
  category: Category | null;
  initialSubcategoryId?: string | null;
  onClose: () => void;
}

export const CategoryExpensesModal: React.FC<CategoryExpensesModalProps> = ({
  visible,
  category,
  initialSubcategoryId = null,
  onClose,
}) => {
  const { transactions, accounts, books, categories, settings, editTransaction } = useApp();

  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(initialSubcategoryId);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reassign single transaction state
  const [reassigningTx, setReassigningTx] = useState<Transaction | null>(null);
  const [targetCatId, setTargetCatId] = useState<string>('');
  const [targetSubId, setTargetSubId] = useState<string>('');

  // Synchronize initial subcategory when opening
  React.useEffect(() => {
    if (visible) {
      setActiveSubcategoryId(initialSubcategoryId);
      setSearchQuery('');
      setReassigningTx(null);
    }
  }, [visible, initialSubcategoryId]);

  // Accounts and books map for friendly labels
  const accountsMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach((a) => {
      map[a.id] = a.bankName || a.name;
    });
    return map;
  }, [accounts]);

  const booksMap = useMemo(() => {
    const map: Record<string, string> = {};
    books.forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [books]);

  // Subcategories lookup
  const subcategoriesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (category) {
      category.subcategories.forEach((s) => {
        map[s.id] = s.name;
      });
    }
    return map;
  }, [category]);

  // Filtered transactions for this category and selected subcategory
  const filteredTransactions = useMemo(() => {
    if (!category) return [];

    return transactions
      .filter((t) => {
        // Must match category
        const matchCat = t.categoryId === category.id || t.categoryId === category.name;
        if (!matchCat) return false;

        // Subcategory filter if one is active
        if (activeSubcategoryId) {
          const matchSub =
            t.subcategoryId === activeSubcategoryId ||
            t.subcategoryId === subcategoriesMap[activeSubcategoryId];
          if (!matchSub) return false;
        }

        // Search query filter (remark, amount, account)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const remarkMatch = (t.remark || '').toLowerCase().includes(q);
          const amountMatch = String(t.amount).includes(q);
          const accMatch = (accountsMap[t.sourceAccountId] || '').toLowerCase().includes(q);
          if (!remarkMatch && !amountMatch && !accMatch) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [transactions, category, activeSubcategoryId, searchQuery, subcategoriesMap, accountsMap]);

  // Total summary amounts
  const totals = useMemo(() => {
    let expenseSum = 0;
    let incomeSum = 0;
    let count = 0;

    filteredTransactions.forEach((t) => {
      count += 1;
      if (t.type === 'EXPENSE') expenseSum += t.amount;
      if (t.type === 'INCOME') incomeSum += t.amount;
    });

    return { expenseSum, incomeSum, count };
  }, [filteredTransactions]);

  // Transaction counts per subcategory for filter badges
  const subCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!category) return counts;

    category.subcategories.forEach((s) => {
      counts[s.id] = 0;
    });

    transactions.forEach((t) => {
      if (t.categoryId === category.id || t.categoryId === category.name) {
        if (t.subcategoryId && counts[t.subcategoryId] !== undefined) {
          counts[t.subcategoryId] += 1;
        }
      }
    });

    return counts;
  }, [transactions, category]);

  if (!category) return null;

  const handleOpenReassignModal = (tx: Transaction) => {
    setReassigningTx(tx);
    // Default to first other category
    const otherCat = categories.find((c) => c.id !== category.id);
    setTargetCatId(otherCat?.id || '');
    setTargetSubId(otherCat?.subcategories[0]?.id || '');
  };

  const handleSaveReassign = () => {
    if (!reassigningTx || !targetCatId) return;

    editTransaction({
      ...reassigningTx,
      categoryId: targetCatId,
      subcategoryId: targetSubId || undefined,
      updatedAt: Date.now(),
    });

    setReassigningTx(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={[styles.catIconBadge, { backgroundColor: `${category.color}20` }]}>
              <Ionicons
                name={(category.icon as keyof typeof Ionicons.glyphMap) || 'pricetag'}
                size={22}
                color={category.color}
              />
            </View>
            <View>
              <View style={styles.catNameRow}>
                <Text style={styles.catName}>{category.name}</Text>
                <View
                  style={[
                    styles.typePill,
                    category.type === 'INCOME' ? styles.typePillIncome : styles.typePillExpense,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      category.type === 'INCOME' ? { color: Colors.income } : { color: Colors.expense },
                    ]}
                  >
                    {category.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.catSubtitle}>
                {activeSubcategoryId
                  ? `Filtered: ${subcategoriesMap[activeSubcategoryId] || 'Subcategory'}`
                  : 'All transactions for this category'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Summary Metric Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: Colors.expense }]}>
              {settings.currencySymbol}
              {totals.expenseSum.toLocaleString()}
            </Text>
          </View>

          {totals.incomeSum > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Received</Text>
              <Text style={[styles.summaryValue, { color: Colors.income }]}>
                {settings.currencySymbol}
                {totals.incomeSum.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Transactions</Text>
            <Text style={styles.summaryValue}>{totals.count}</Text>
          </View>
        </View>

        {/* Subcategories Filter Chips */}
        {category.subcategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subFilterRow}
          >
            <TouchableOpacity
              style={[
                styles.subFilterChip,
                activeSubcategoryId === null && styles.subFilterChipActive,
              ]}
              onPress={() => setActiveSubcategoryId(null)}
            >
              <Text
                style={[
                  styles.subFilterChipText,
                  activeSubcategoryId === null && styles.subFilterChipTextActive,
                ]}
              >
                All ({filteredTransactions.length})
              </Text>
            </TouchableOpacity>

            {category.subcategories.map((sub) => {
              const isActive = activeSubcategoryId === sub.id;
              const count = subCounts[sub.id] || 0;

              return (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.subFilterChip, isActive && styles.subFilterChipActive]}
                  onPress={() => setActiveSubcategoryId(isActive ? null : sub.id)}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={11}
                    color={isActive ? '#FFFFFF' : category.color}
                  />
                  <Text
                    style={[
                      styles.subFilterChipText,
                      isActive && styles.subFilterChipTextActive,
                    ]}
                  >
                    {sub.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search remark, note, or account..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Transactions List */}
        <ScrollView
          style={styles.txList}
          contentContainerStyle={styles.txListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={36} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Expenses Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || activeSubcategoryId
                  ? 'No transactions matched the selected subcategory or search keyword.'
                  : 'There are currently no transactions recorded under this category.'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const accName = accountsMap[tx.sourceAccountId] || 'Account';
              const bookName = booksMap[tx.bookId] || 'Personal';
              const subName = tx.subcategoryId ? subcategoriesMap[tx.subcategoryId] : null;
              const isIncome = tx.type === 'INCOME';

              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txLeft}>
                    <View style={styles.txTitleRow}>
                      <Text style={styles.txRemark} numberOfLines={1}>
                        {tx.remark || 'Expense'}
                      </Text>
                      {subName && (
                        <View style={styles.subBadge}>
                          <Ionicons name="pricetag" size={10} color={category.color} />
                          <Text style={styles.subBadgeText}>{subName}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.txMetaText}>
                      {formatFriendlyDate(tx.dateTime)} • {accName} ({bookName})
                    </Text>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        isIncome ? { color: Colors.income } : { color: Colors.expense },
                      ]}
                    >
                      {isIncome ? '+' : '-'}
                      {settings.currencySymbol}
                      {tx.amount.toLocaleString()}
                    </Text>

                    <TouchableOpacity
                      style={styles.reassignBtn}
                      onPress={() => handleOpenReassignModal(tx)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="swap-horizontal" size={12} color={Colors.primary} />
                      <Text style={styles.reassignBtnText}>Move</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Modal: Reassign Single Transaction */}
        {reassigningTx && (
          <Modal
            visible={!!reassigningTx}
            transparent
            animationType="fade"
            onRequestClose={() => setReassigningTx(null)}
          >
            <View style={styles.reassignBackdrop}>
              <View style={styles.reassignCard}>
                <View style={styles.reassignHeader}>
                  <Text style={styles.reassignTitle}>Reassign Transaction</Text>
                  <TouchableOpacity onPress={() => setReassigningTx(null)}>
                    <Ionicons name="close" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.reassignDesc}>
                  Move "{reassigningTx.remark || 'Transaction'}" ({settings.currencySymbol}
                  {reassigningTx.amount}) to another category:
                </Text>

                <Text style={styles.fieldLabel}>Select Category:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPickerRow}
                >
                  {categories.map((c) => {
                    const isSelected = targetCatId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.catPickChip,
                          isSelected && styles.catPickChipActive,
                        ]}
                        onPress={() => {
                          setTargetCatId(c.id);
                          setTargetSubId(c.subcategories[0]?.id || '');
                        }}
                      >
                        <Ionicons
                          name={(c.icon as keyof typeof Ionicons.glyphMap) || 'pricetag'}
                          size={13}
                          color={isSelected ? '#FFFFFF' : c.color}
                        />
                        <Text
                          style={[
                            styles.catPickChipText,
                            isSelected && styles.catPickChipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Subcategories if destination has any */}
                {(() => {
                  const targetCat = categories.find((c) => c.id === targetCatId);
                  if (!targetCat || targetCat.subcategories.length === 0) return null;

                  return (
                    <>
                      <Text style={styles.fieldLabel}>Select Subcategory (Optional):</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryPickerRow}
                      >
                        <TouchableOpacity
                          style={[
                            styles.catPickChip,
                            !targetSubId && styles.catPickChipActive,
                          ]}
                          onPress={() => setTargetSubId('')}
                        >
                          <Text
                            style={[
                              styles.catPickChipText,
                              !targetSubId && styles.catPickChipTextActive,
                            ]}
                          >
                            None
                          </Text>
                        </TouchableOpacity>

                        {targetCat.subcategories.map((s) => {
                          const isSubSelected = targetSubId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[
                                styles.catPickChip,
                                isSubSelected && styles.catPickChipActive,
                              ]}
                              onPress={() => setTargetSubId(s.id)}
                            >
                              <Text
                                style={[
                                  styles.catPickChipText,
                                  isSubSelected && styles.catPickChipTextActive,
                                ]}
                              >
                                {s.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  );
                })()}

                <View style={styles.reassignActions}>
                  <TouchableOpacity
                    style={styles.reassignCancelBtn}
                    onPress={() => setReassigningTx(null)}
                  >
                    <Text style={styles.reassignCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reassignConfirmBtn}
                    onPress={handleSaveReassign}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.reassignConfirmText}>Update Category</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  catIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillExpense: {
    backgroundColor: '#FEE2E2',
  },
  typePillIncome: {
    backgroundColor: '#D1FAE5',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  catSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  subFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subFilterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  subFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  txList: {
    flex: 1,
  },
  txListContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 8,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txLeft: {
    flex: 1,
    marginRight: 12,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  txRemark: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  txMetaText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reassignBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  reassignBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reassignCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reassignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reassignTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  reassignDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  catPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  catPickChipActive: {
    backgroundColor: Colors.primary,
  },
  catPickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catPickChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reassignActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  reassignCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reassignCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reassignConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reassignConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
