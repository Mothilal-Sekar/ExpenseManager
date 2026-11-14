import React, { useState } from 'react';
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

interface MonthlyBudgetModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MonthlyBudgetModal: React.FC<MonthlyBudgetModalProps> = ({
  visible,
  onClose,
}) => {
  const { categories, settings, updateAllCategoryBudgets } = useApp();

  const expenseCategories = categories.filter(
    (c) => c.type === 'EXPENSE' || c.type === 'BOTH'
  );

  // Local state initialized from current settings
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>(() => {
    const current = settings.categoryBudgets || {};
    const initial: Record<string, string> = {};
    expenseCategories.forEach((cat) => {
      initial[cat.id] = current[cat.id] ? String(current[cat.id]) : '';
    });
    return initial;
  });

  const currentMonthName = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleInputChange = (catId: string, val: string) => {
    // Only numeric
    const clean = val.replace(/[^0-9]/g, '');
    setBudgetInputs((prev) => ({ ...prev, [catId]: clean }));
  };

  const handleQuickAdd = (catId: string, delta: number) => {
    const current = parseInt(budgetInputs[catId] || '0', 10) || 0;
    const nextVal = Math.max(0, current + delta);
    setBudgetInputs((prev) => ({ ...prev, [catId]: String(nextVal) }));
  };

  const totalAllocated = Object.values(budgetInputs).reduce((sum, v) => {
    return sum + (parseInt(v, 10) || 0);
  }, 0);

  const handleSave = () => {
    const numericBudgets: Record<string, number> = {};
    Object.entries(budgetInputs).forEach(([catId, valStr]) => {
      const num = parseInt(valStr, 10) || 0;
      if (num > 0) {
        numericBudgets[catId] = num;
      }
    });

    updateAllCategoryBudgets(numericBudgets, totalAllocated);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>Monthly Budget Planning</Text>
              <Text style={styles.modalSubtitle}>
                Allocate target spending amounts for {currentMonthName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Categories Budget Inputs List */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {expenseCategories.map((cat) => {
              const currentVal = budgetInputs[cat.id] || '';
              return (
                <View key={cat.id} style={styles.catBudgetRow}>
                  <View style={styles.catInfoLeft}>
                    <View
                      style={[
                        styles.catIconWrap,
                        { backgroundColor: cat.color || Colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={(cat.icon as any) || 'pricetag'}
                        size={14}
                        color={Colors.textInverse}
                      />
                    </View>
                    <Text style={styles.catName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </View>

                  <View style={styles.budgetInputGroup}>
                    <Text style={styles.currencyPrefix}>
                      {settings.currencySymbol}
                    </Text>
                    <TextInput
                      style={styles.budgetInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      value={currentVal}
                      onChangeText={(val) => handleInputChange(cat.id, val)}
                    />
                    <TouchableOpacity
                      style={styles.quickAddBtn}
                      onPress={() => handleQuickAdd(cat.id, 1000)}
                    >
                      <Text style={styles.quickAddText}>+1k</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Summary Footer */}
          <View style={styles.footerSummary}>
            <View>
              <Text style={styles.totalLabel}>Total Monthly Budget:</Text>
              <Text style={styles.totalValue}>
                {settings.currencySymbol}
                {totalAllocated.toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Allocations</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollList: {
    maxHeight: 380,
  },
  catBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  catInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  budgetInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  budgetInput: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 70,
    paddingVertical: 2,
  },
  quickAddBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  quickAddText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
