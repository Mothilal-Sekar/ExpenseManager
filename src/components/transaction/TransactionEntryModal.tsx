import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import {
  SELF_TRANSFER_CATEGORY_ID,
} from '../../constants/defaults';
import {
  formatDateKey,
  formatFriendlyDate,
  formatFriendlyTime,
} from '../../services/dateUtils';
import { TransactionMode, TransactionType } from '../../types';
import { DatePickerModal } from '../common/DatePickerModal';

export const TransactionEntryModal: React.FC = () => {
  const {
    isTransactionModalOpen,
    setIsTransactionModalOpen,
    prefilledTransaction,
    setPrefilledTransaction,
    accounts,
    categories,
    books,
    settings,
    addTransaction,
    editTransaction,
    selectedBookId,
    selectedDate,
  } = useApp();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState<string>('');
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [mode, setMode] = useState<TransactionMode>('CASH');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [bookId, setBookId] = useState<string>('book_personal');
  const [remark, setRemark] = useState<string>('');
  const [skipBalanceUpdate, setSkipBalanceUpdate] = useState<boolean>(false);

  // Active accounts (excluding deleted)
  const activeAccounts = accounts.filter((a) => !a.isDeleted);
  const bankAccounts = activeAccounts.filter((a) => a.type === 'BANK');
  const cardAccounts = activeAccounts.filter((a) => a.type === 'CARD');
  const cashWalletAccount = activeAccounts.find((a) => a.type === 'CASH_WALLET');

  // Filter categories by type
  const availableCategories = categories.filter((c) => {
    if (type === 'SELF_TRANSFER') return c.id === SELF_TRANSFER_CATEGORY_ID;
    if (c.id === SELF_TRANSFER_CATEGORY_ID) return false;
    return c.type === 'BOTH' || c.type === type;
  });

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isTransactionModalOpen) {
      if (prefilledTransaction) {
        setType(prefilledTransaction.type || 'EXPENSE');
        setAmount(
          prefilledTransaction.amount ? String(prefilledTransaction.amount) : ''
        );
        setDateTime(
          prefilledTransaction.dateTime
            ? new Date(prefilledTransaction.dateTime)
            : new Date()
        );
        setCategoryId(prefilledTransaction.categoryId || '');
        setSubcategoryId(prefilledTransaction.subcategoryId || '');
        setMode(prefilledTransaction.mode || 'CASH');
        setSourceAccountId(prefilledTransaction.sourceAccountId || '');
        setDestinationAccountId(prefilledTransaction.destinationAccountId || '');
        setBookId(
          prefilledTransaction.bookId ||
            (selectedBookId !== 'ALL' ? selectedBookId : books[0]?.id || 'book_personal')
        );
        setRemark(prefilledTransaction.remark || '');
        setSkipBalanceUpdate(prefilledTransaction.skipBalanceUpdate || false);
      } else {
        // Default clean state
        setType('EXPENSE');
        setAmount('');
        const baseDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
        setDateTime(baseDate);
        const defaultCat = categories.find((c) => c.type === 'EXPENSE');
        setCategoryId(defaultCat?.id || categories[0]?.id || '');
        setSubcategoryId(defaultCat?.subcategories[0]?.id || '');
        setMode('CASH');
        setSourceAccountId(cashWalletAccount?.id || activeAccounts[0]?.id || '');
        setDestinationAccountId(bankAccounts[0]?.id || '');
        setBookId(
          selectedBookId !== 'ALL' ? selectedBookId : books[0]?.id || 'book_personal'
        );
        setRemark('');
        setSkipBalanceUpdate(false);
      }
    }
  }, [isTransactionModalOpen, prefilledTransaction]);

  // Adjust source account when mode changes
  const handleModeChange = (newMode: TransactionMode) => {
    setMode(newMode);
    if (newMode === 'CASH') {
      if (cashWalletAccount) {
        setSourceAccountId(cashWalletAccount.id);
      }
    } else if (newMode === 'CARD') {
      if (cardAccounts.length > 0) {
        setSourceAccountId(cardAccounts[0].id);
      } else if (bankAccounts.length > 0) {
        setSourceAccountId(bankAccounts[0].id);
      }
    } else if (newMode === 'BANK' || newMode === 'UPI') {
      if (bankAccounts.length > 0) {
        setSourceAccountId(bankAccounts[0].id);
      }
    }
  };

  // Adjust category when transaction type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'SELF_TRANSFER') {
      setCategoryId(SELF_TRANSFER_CATEGORY_ID);
      // Ensure source and destination are different
      if (bankAccounts.length > 0) {
        setSourceAccountId(bankAccounts[0].id);
      }
      if (cashWalletAccount) {
        setDestinationAccountId(cashWalletAccount.id);
      } else if (bankAccounts.length > 1) {
        setDestinationAccountId(bankAccounts[1].id);
      }
    } else {
      const match = categories.find(
        (c) => c.type === newType && c.id !== SELF_TRANSFER_CATEGORY_ID
      );
      if (match) {
        setCategoryId(match.id);
        setSubcategoryId(match.subcategories[0]?.id || '');
      }
    }
  };

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }

    if (!sourceAccountId) {
      Alert.alert(
        'Missing Account',
        'Please select a source account or bank for this transaction.'
      );
      return;
    }

    if (type === 'SELF_TRANSFER') {
      if (!destinationAccountId) {
        Alert.alert(
          'Missing Destination',
          'Please select a destination account for Self Transfer.'
        );
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        Alert.alert(
          'Invalid Transfer',
          'Source account and Destination account cannot be the same.'
        );
        return;
      }
    }

    const isEditing = Boolean(prefilledTransaction?.id);

    if (isEditing && prefilledTransaction?.id) {
      editTransaction({
        id: prefilledTransaction.id,
        createdAt: prefilledTransaction.createdAt || Date.now(),
        updatedAt: Date.now(),
        bookId,
        type,
        amount: parsedAmount,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        remark: remark.trim(),
        dateTime: dateTime.toISOString(),
        mode,
        sourceAccountId,
        destinationAccountId:
          type === 'SELF_TRANSFER' ? destinationAccountId : undefined,
        skipBalanceUpdate,
      });
    } else {
      addTransaction({
        bookId,
        type,
        amount: parsedAmount,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        remark: remark.trim(),
        dateTime: dateTime.toISOString(),
        mode,
        sourceAccountId,
        destinationAccountId:
          type === 'SELF_TRANSFER' ? destinationAccountId : undefined,
        skipBalanceUpdate,
      });
    }

    setIsTransactionModalOpen(false);
    setPrefilledTransaction(null);
  };

  const isEditing = Boolean(prefilledTransaction?.id);

  const handleClose = () => {
    setIsTransactionModalOpen(false);
    setPrefilledTransaction(null);
  };

  return (
    <Modal
      visible={isTransactionModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {isEditing
              ? `Edit ${type === 'SELF_TRANSFER' ? 'Transfer' : type === 'INCOME' ? 'Income' : 'Expense'}`
              : type === 'SELF_TRANSFER'
              ? 'Self Transfer'
              : type === 'INCOME'
              ? 'Add Income'
              : 'Add Expense'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Transaction Type Toggle */}
          <View style={styles.typeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'EXPENSE' && styles.typeOptionActiveExpense,
              ]}
              onPress={() => handleTypeChange('EXPENSE')}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'EXPENSE' && styles.typeOptionTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'INCOME' && styles.typeOptionActiveIncome,
              ]}
              onPress={() => handleTypeChange('INCOME')}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'INCOME' && styles.typeOptionTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'SELF_TRANSFER' && styles.typeOptionActiveTransfer,
              ]}
              onPress={() => handleTypeChange('SELF_TRANSFER')}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'SELF_TRANSFER' && styles.typeOptionTextActive,
                ]}
              >
                Self Transfer
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2. Amount Input */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountCurrency}>{settings.currencySymbol}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus={!prefilledTransaction}
            />
          </View>

          {/* 3. Date & Time Display & Interactive DatePicker */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.fieldLabel}>Date & Time</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setIsDatePickerOpen(true)}
              >
                <Ionicons name="calendar" size={16} color={Colors.primary} />
                <Text style={styles.dateTimeText}>
                  {formatFriendlyDate(dateTime)} at {formatFriendlyTime(dateTime)}
                </Text>
                <Ionicons name="pencil" size={14} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateResetBtn}
                onPress={() => setDateTime(new Date())}
              >
                <Text style={styles.dateResetBtnText}>Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Category & Subcategory Selection (Unless Self Transfer) */}
          {type !== 'SELF_TRANSFER' ? (
            <View style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Ionicons name="grid-outline" size={18} color={Colors.primary} />
                <Text style={styles.fieldLabel}>Category & Subcategory</Text>
              </View>

              {/* Categories Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {availableCategories.map((c) => {
                  const isSelected = categoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.catPill,
                        isSelected && {
                          backgroundColor: c.color,
                          borderColor: c.color,
                        },
                      ]}
                      onPress={() => {
                        setCategoryId(c.id);
                        setSubcategoryId(c.subcategories[0]?.id || '');
                      }}
                    >
                      <Ionicons
                        name={(c.icon as any) || 'pricetag'}
                        size={14}
                        color={isSelected ? Colors.textInverse : c.color}
                      />
                      <Text
                        style={[
                          styles.catPillText,
                          isSelected && styles.catPillTextSelected,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Subcategories */}
              {selectedCategory && selectedCategory.subcategories.length > 0 && (
                <View style={styles.subcategoryWrapper}>
                  <Text style={styles.subcatLabel}>Subcategory:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillRow}
                  >
                    {selectedCategory.subcategories.map((sub) => {
                      const isSubSelected = subcategoryId === sub.id;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          style={[
                            styles.subPill,
                            isSubSelected && styles.subPillSelected,
                          ]}
                          onPress={() => setSubcategoryId(sub.id)}
                        >
                          <Text
                            style={[
                              styles.subPillText,
                              isSubSelected && styles.subPillTextSelected,
                            ]}
                          >
                            {sub.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            /* Self Transfer: Source & Destination Accounts */
            <View style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.fieldLabel}>Transfer Routing</Text>
              </View>

              {/* Source Account */}
              <Text style={styles.accountSubLabel}>Source Account (Debit):</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {activeAccounts.map((acc) => {
                  const isSelected = sourceAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accountPill,
                        isSelected && styles.accountPillSelected,
                      ]}
                      onPress={() => setSourceAccountId(acc.id)}
                    >
                      <Text
                        style={[
                          styles.accountPillText,
                          isSelected && styles.accountPillTextSelected,
                        ]}
                      >
                        {acc.bankName || acc.name}
                      </Text>
                      <Text
                        style={[
                          styles.accountPillSub,
                          isSelected && styles.accountPillTextSelected,
                        ]}
                      >
                        ({settings.currencySymbol}
                        {acc.currentBalance})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Destination Account */}
              <Text style={[styles.accountSubLabel, { marginTop: 10 }]}>
                Destination Account (Credit):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillRow}
              >
                {activeAccounts.map((acc) => {
                  const isSelected = destinationAccountId === acc.id;
                  const isSource = sourceAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      disabled={isSource}
                      style={[
                        styles.accountPill,
                        isSelected && styles.accountPillSelected,
                        isSource && styles.accountPillDisabled,
                      ]}
                      onPress={() => setDestinationAccountId(acc.id)}
                    >
                      <Text
                        style={[
                          styles.accountPillText,
                          isSelected && styles.accountPillTextSelected,
                          isSource && styles.accountPillTextDisabled,
                        ]}
                      >
                        {acc.bankName || acc.name}
                      </Text>
                      <Text
                        style={[
                          styles.accountPillSub,
                          isSelected && styles.accountPillTextSelected,
                          isSource && styles.accountPillTextDisabled,
                        ]}
                      >
                        ({settings.currencySymbol}
                        {acc.currentBalance})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 5. Mode of Transaction (Cash, Card, Bank, UPI) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons
                name="card-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.fieldLabel}>Payment Mode</Text>
            </View>

            <View style={styles.modeRow}>
              {(['CASH', 'CARD', 'BANK', 'UPI'] as TransactionMode[]).map(
                (m) => {
                  const isSelected = mode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.modeOption,
                        isSelected && styles.modeOptionSelected,
                      ]}
                      onPress={() => handleModeChange(m)}
                    >
                      <Text
                        style={[
                          styles.modeOptionText,
                          isSelected && styles.modeOptionTextSelected,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* If mode is Bank, Card, or UPI: user MUST select specific bank */}
            {mode !== 'CASH' && type !== 'SELF_TRANSFER' && (
              <View style={styles.bankPickerContainer}>
                <Text style={styles.accountSubLabel}>
                  Select Specific {mode === 'CARD' ? 'Card / Bank' : 'Bank Account'}:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillRow}
                >
                  {activeAccounts
                    .filter(
                      (a) =>
                        mode === 'CARD' ? a.type === 'CARD' || a.type === 'BANK' : a.type === 'BANK'
                    )
                    .map((acc) => {
                      const isSelected = sourceAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.accountPill,
                            isSelected && styles.accountPillSelected,
                          ]}
                          onPress={() => setSourceAccountId(acc.id)}
                        >
                          <Text
                            style={[
                              styles.accountPillText,
                              isSelected && styles.accountPillTextSelected,
                            ]}
                          >
                            {acc.bankName || acc.name}{' '}
                            {acc.accountNumberLast4
                              ? `(..${acc.accountNumberLast4})`
                              : ''}
                          </Text>
                          <Text
                            style={[
                              styles.accountPillSub,
                              isSelected && styles.accountPillTextSelected,
                            ]}
                          >
                            Bal: {settings.currencySymbol}
                            {acc.currentBalance}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}

            {mode === 'CASH' && (
              <Text style={styles.cashNoticeText}>
                Linked to Cash Wallet (Current balance: {settings.currencySymbol}
                {cashWalletAccount?.currentBalance ?? 0})
              </Text>
            )}
          </View>

          {/* 6. Book Ledger Selector */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons
                name="book-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.fieldLabel}>Book Ledger</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {books.map((b) => {
                const isSelected = bookId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.bookSelectPill,
                      isSelected && {
                        backgroundColor: b.color,
                        borderColor: b.color,
                      },
                    ]}
                    onPress={() => setBookId(b.id)}
                  >
                    <Text
                      style={[
                        styles.bookSelectPillText,
                        isSelected && styles.bookSelectPillTextActive,
                      ]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 7. Remark Input */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons
                name="create-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.fieldLabel}>Remark / Notes</Text>
            </View>
            <TextInput
              style={styles.remarkInput}
              placeholder="e.g. Dinner with team, groceries, client fee"
              placeholderTextColor={Colors.textMuted}
              value={remark}
              onChangeText={setRemark}
            />
          </View>

          {/* 8. Skip Balance Update Toggle Switch */}
          <View style={[styles.fieldCard, styles.skipBalanceCard]}>
            <View style={styles.skipRow}>
              <View style={styles.skipTextCol}>
                <Text style={styles.skipTitle}>Skip balance update</Text>
                <Text style={styles.skipSubtitle}>
                  Record transaction in history and Google Sheets without changing
                  your wallet or bank balance.
                </Text>
              </View>
              <Switch
                value={skipBalanceUpdate}
                onValueChange={setSkipBalanceUpdate}
                trackColor={{ false: '#CBD5E1', true: Colors.warning }}
                thumbColor={Colors.cardBackground}
              />
            </View>
          </View>

          {/* Bottom Save Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
            <Text style={styles.submitButtonText}>
              {isEditing
                ? 'Update Transaction'
                : `Save ${type === 'SELF_TRANSFER' ? 'Transfer' : type}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Interactive Date & Time Picker Modal */}
        <DatePickerModal
          visible={isDatePickerOpen}
          mode="datetime"
          initialDate={dateTime}
          title="Select Transaction Date & Time"
          onConfirm={(isoStr) => setDateTime(new Date(isoStr))}
          onClose={() => setIsDatePickerOpen(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeOptionActiveExpense: {
    backgroundColor: Colors.expense,
  },
  typeOptionActiveIncome: {
    backgroundColor: Colors.income,
  },
  typeOptionActiveTransfer: {
    backgroundColor: Colors.transfer,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeOptionTextActive: {
    color: Colors.textInverse,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountCurrency: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 120,
  },
  fieldCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateTimeText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  dateResetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  dateResetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  pillRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catPillTextSelected: {
    color: Colors.textInverse,
  },
  subcategoryWrapper: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subcatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  subPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.surfaceVariant,
  },
  subPillSelected: {
    backgroundColor: Colors.primary,
  },
  subPillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  subPillTextSelected: {
    color: Colors.textInverse,
  },
  accountSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  accountPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountPillSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  accountPillDisabled: {
    opacity: 0.35,
  },
  accountPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  accountPillSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  accountPillTextSelected: {
    color: Colors.textInverse,
  },
  accountPillTextDisabled: {
    color: Colors.textMuted,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modeOptionTextSelected: {
    color: Colors.textInverse,
  },
  bankPickerContainer: {
    marginTop: 10,
  },
  cashNoticeText: {
    fontSize: 12,
    color: '#059669',
    marginTop: 8,
    fontWeight: '500',
  },
  bookSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookSelectPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bookSelectPillTextActive: {
    color: Colors.textInverse,
  },
  remarkInput: {
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  skipBalanceCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipTextCol: {
    flex: 1,
    marginRight: 12,
  },
  skipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  skipSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
