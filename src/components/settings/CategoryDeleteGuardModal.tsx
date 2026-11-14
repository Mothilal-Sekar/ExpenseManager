import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Category, Subcategory } from '../../types';
import { formatFriendlyDate } from '../../services/dateUtils';

interface CategoryDeleteGuardModalProps {
  visible: boolean;
  targetType: 'CATEGORY' | 'SUBCATEGORY';
  category: Category | null;
  subcategory?: Subcategory | null;
  onClose: () => void;
  onViewExpenses: (cat: Category, sub?: Subcategory | null) => void;
  onSuccessDeleted: (message: string) => void;
}

export const CategoryDeleteGuardModal: React.FC<CategoryDeleteGuardModalProps> = ({
  visible,
  targetType,
  category,
  subcategory = null,
  onClose,
  onViewExpenses,
  onSuccessDeleted,
}) => {
  const {
    transactions,
    categories,
    settings,
    reassignCategoryTransactions,
    reassignSubcategoryTransactions,
    deleteCategory,
    deleteSubcategory,
  } = useApp();

  // Find linked transactions
  const linkedTransactions = useMemo(() => {
    if (!category) return [];

    if (targetType === 'CATEGORY') {
      return transactions.filter(
        (t) => t.categoryId === category.id || t.categoryId === category.name
      );
    } else if (subcategory) {
      return transactions.filter(
        (t) =>
          (t.categoryId === category.id || t.categoryId === category.name) &&
          (t.subcategoryId === subcategory.id || t.subcategoryId === subcategory.name)
      );
    }
    return [];
  }, [transactions, category, subcategory, targetType]);

  const totalAmount = useMemo(() => {
    return linkedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [linkedTransactions]);

  // Destination category state (for Category deletion)
  const otherCategories = useMemo(() => {
    if (!category) return [];
    return categories.filter((c) => c.id !== category.id);
  }, [categories, category]);

  const [destinationCatId, setDestinationCatId] = useState<string>('');
  const [destinationSubcatId, setDestinationSubcatId] = useState<string>('');

  // Destination subcategory state (for Subcategory deletion)
  const otherSubcategories = useMemo(() => {
    if (!category || !subcategory) return [];
    return category.subcategories.filter((s) => s.id !== subcategory.id);
  }, [category, subcategory]);

  const [subAction, setSubAction] = useState<'REASSIGN' | 'CLEAR'>('CLEAR');
  const [targetOtherSubId, setTargetOtherSubId] = useState<string>('');

  // Synchronize defaults on open
  React.useEffect(() => {
    if (visible) {
      if (otherCategories.length > 0) {
        setDestinationCatId(otherCategories[0].id);
        setDestinationSubcatId(otherCategories[0].subcategories[0]?.id || '');
      }
      if (otherSubcategories.length > 0) {
        setSubAction('REASSIGN');
        setTargetOtherSubId(otherSubcategories[0].id);
      } else {
        setSubAction('CLEAR');
        setTargetOtherSubId('');
      }
    }
  }, [visible, otherCategories, otherSubcategories]);

  if (!category) return null;

  const targetName =
    targetType === 'CATEGORY' ? category.name : subcategory?.name || 'Subcategory';

  const handleConfirmReassignAndDelete = () => {
    if (targetType === 'CATEGORY') {
      if (!destinationCatId) return;

      const destCat = categories.find((c) => c.id === destinationCatId);
      reassignCategoryTransactions(category.id, destinationCatId, destinationSubcatId || undefined);
      deleteCategory(category.id);

      onSuccessDeleted(
        `${linkedTransactions.length} transaction(s) moved to "${destCat?.name || 'New Category'}" and "${category.name}" was safely deleted.`
      );
    } else if (subcategory) {
      if (subAction === 'REASSIGN') {
        const destSub = otherSubcategories.find((s) => s.id === targetOtherSubId);
        reassignSubcategoryTransactions(category.id, subcategory.id, targetOtherSubId || undefined);
        deleteSubcategory(category.id, subcategory.id);
        onSuccessDeleted(
          `${linkedTransactions.length} transaction(s) moved to subcategory "${destSub?.name || 'Subcategory'}" and "${subcategory.name}" was deleted.`
        );
      } else {
        // Clear subcategory tag
        reassignSubcategoryTransactions(category.id, subcategory.id, undefined);
        deleteSubcategory(category.id, subcategory.id);
        onSuccessDeleted(
          `Subcategory "${subcategory.name}" removed from ${linkedTransactions.length} transaction(s) and deleted.`
        );
      }
    }
    onClose();
  };

  const selectedDestCat = categories.find((c) => c.id === destinationCatId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.warningCircle}>
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Cannot Delete {targetType === 'CATEGORY' ? 'Category' : 'Subcategory'}</Text>
              <Text style={styles.subtitle}>Active transactions are linked to "{targetName}"</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              There are <Text style={{ fontWeight: '800' }}>{linkedTransactions.length}</Text> transaction(s)
              totaling <Text style={{ fontWeight: '800' }}>{settings.currencySymbol}{totalAmount.toLocaleString()}</Text> using this {targetType.toLowerCase()}.
              To delete it, you must reassign these transactions to another {targetType.toLowerCase()}.
            </Text>
          </View>

          {/* Reassignment Workflow */}
          {targetType === 'CATEGORY' ? (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>Reassign All {linkedTransactions.length} Transactions To:</Text>
              
              {otherCategories.length === 0 ? (
                <Text style={styles.noOtherText}>
                  Please create another category first before deleting this one.
                </Text>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                  >
                    {otherCategories.map((c) => {
                      const isSelected = destinationCatId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.chip, isSelected && styles.chipActive]}
                          onPress={() => {
                            setDestinationCatId(c.id);
                            setDestinationSubcatId(c.subcategories[0]?.id || '');
                          }}
                        >
                          <Ionicons
                            name={(c.icon as keyof typeof Ionicons.glyphMap) || 'pricetag'}
                            size={14}
                            color={isSelected ? '#FFFFFF' : c.color}
                          />
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Destination Subcategories if any */}
                  {selectedDestCat && selectedDestCat.subcategories.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.subFieldLabel}>Select Subcategory (Optional):</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsScroll}
                      >
                        <TouchableOpacity
                          style={[styles.chip, !destinationSubcatId && styles.chipActive]}
                          onPress={() => setDestinationSubcatId('')}
                        >
                          <Text style={[styles.chipText, !destinationSubcatId && styles.chipTextActive]}>
                            None
                          </Text>
                        </TouchableOpacity>
                        {selectedDestCat.subcategories.map((s) => {
                          const isSubSelected = destinationSubcatId === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[styles.chip, isSubSelected && styles.chipActive]}
                              onPress={() => setDestinationSubcatId(s.id)}
                            >
                              <Text style={[styles.chipText, isSubSelected && styles.chipTextActive]}>
                                {s.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            /* Subcategory Reassignment */
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>Choose What To Do With {linkedTransactions.length} Transactions:</Text>

              {otherSubcategories.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionOptionCard, subAction === 'REASSIGN' && styles.actionOptionCardActive]}
                  onPress={() => setSubAction('REASSIGN')}
                >
                  <Ionicons
                    name={subAction === 'REASSIGN' ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={subAction === 'REASSIGN' ? Colors.primary : Colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Move to another subcategory</Text>
                    <Text style={styles.actionOptionDesc}>
                      Keep under "{category.name}" but switch to a different subcategory.
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {subAction === 'REASSIGN' && otherSubcategories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsScroll}
                >
                  {otherSubcategories.map((s) => {
                    const isSelected = targetOtherSubId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setTargetOtherSubId(s.id)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <TouchableOpacity
                style={[styles.actionOptionCard, subAction === 'CLEAR' && styles.actionOptionCardActive]}
                onPress={() => setSubAction('CLEAR')}
              >
                <Ionicons
                  name={subAction === 'CLEAR' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={subAction === 'CLEAR' ? Colors.primary : Colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionOptionTitle}>Clear subcategory tag</Text>
                  <Text style={styles.actionOptionDesc}>
                    Keep transactions under "{category.name}" with no subcategory assigned.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Preview of Linked Transactions */}
          <View style={styles.previewHeaderRow}>
            <Text style={styles.previewHeaderTitle}>
              Linked Transactions ({linkedTransactions.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onViewExpenses(category, subcategory);
              }}
            >
              <Text style={styles.viewAllLink}>View Details →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.txPreviewList} nestedScrollEnabled>
            {linkedTransactions.slice(0, 4).map((tx) => (
              <View key={tx.id} style={styles.txPreviewItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txPreviewRemark} numberOfLines={1}>
                    {tx.remark || 'Transaction'}
                  </Text>
                  <Text style={styles.txPreviewDate}>{formatFriendlyDate(tx.dateTime)}</Text>
                </View>
                <Text
                  style={[
                    styles.txPreviewAmount,
                    tx.type === 'INCOME' ? { color: Colors.income } : { color: Colors.expense },
                  ]}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {settings.currencySymbol}
                  {tx.amount.toLocaleString()}
                </Text>
              </View>
            ))}
            {linkedTransactions.length > 4 && (
              <Text style={styles.moreTxText}>
                + {linkedTransactions.length - 4} more transactions
              </Text>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reassignDeleteBtn}
              onPress={handleConfirmReassignAndDelete}
            >
              <Ionicons name="swap-horizontal" size={15} color="#FFFFFF" />
              <Text style={styles.reassignDeleteText}>
                Reassign & Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.cardBackground,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  warningCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  warningBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
  },
  warningBannerText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
  },
  sectionWrap: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  noOtherText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionOptionCardActive: {
    backgroundColor: `${Colors.primary}10`,
    borderColor: Colors.primary,
  },
  actionOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionOptionDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  previewHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  txPreviewList: {
    maxHeight: 120,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  txPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  txPreviewRemark: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  txPreviewDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  txPreviewAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  moreTxText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  reassignDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.expense,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    elevation: 2,
  },
  reassignDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
