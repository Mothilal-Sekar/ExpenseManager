import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import { formatFriendlyDate } from '../services/dateUtils';
import { Reminder, ReminderType } from '../types';
import { DebtDetailModal } from '../components/debts/DebtDetailModal';
import { DatePickerModal } from '../components/common/DatePickerModal';

type DebtFilterTab = 'ALL' | 'WILL_GET' | 'WILL_PAY' | 'SETTLED';

export const DebtsScreen: React.FC = () => {
  const {
    reminders,
    books,
    settings,
    addReminder,
    editReminder,
    deleteReminder,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<DebtFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Debt for Detail / Settlement Screen
  const [selectedDebtForDetail, setSelectedDebtForDetail] = useState<Reminder | null>(
    null
  );

  // Add Debt Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newType, setNewType] = useState<ReminderType>('WILL_GET');
  const [newCounterparty, setNewCounterparty] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newBookId, setNewBookId] = useState(books[0]?.id || 'book_personal');
  const [newNotes, setNewNotes] = useState('');
  const [newIsEmi, setNewIsEmi] = useState(false);
  const [newEmiAmount, setNewEmiAmount] = useState('');
  const [newFrequency, setNewFrequency] = useState<'MONTHLY' | 'WEEKLY' | 'ONE_TIME'>(
    'MONTHLY'
  );

  // Edit Debt Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editType, setEditType] = useState<ReminderType>('WILL_GET');
  const [editCounterparty, setEditCounterparty] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsEmi, setEditIsEmi] = useState(false);
  const [editEmiAmount, setEditEmiAmount] = useState('');

  // Date picker state for Debts
  const [activeDatePicker, setActiveDatePicker] = useState<'NEW' | 'EDIT' | null>(null);

  // Calculate Overall Debt KPIs
  const { totalReceivable, totalPayable, netDebtPosition } = useMemo(() => {
    let rec = 0;
    let pay = 0;
    reminders.forEach((r) => {
      const remaining = Math.max(0, r.amount - (r.paidAmount || 0));
      if (r.type === 'WILL_GET') {
        rec += remaining;
      } else {
        pay += remaining;
      }
    });
    return {
      totalReceivable: rec,
      totalPayable: pay,
      netDebtPosition: rec - pay,
    };
  }, [reminders]);

  // Filtered Reminders
  const filteredDebts = useMemo(() => {
    return reminders.filter((r) => {
      const remaining = Math.max(0, r.amount - (r.paidAmount || 0));
      const isSettled = r.status === 'SETTLED' || remaining === 0;

      if (activeFilter === 'WILL_GET') {
        if (r.type !== 'WILL_GET' || isSettled) return false;
      } else if (activeFilter === 'WILL_PAY') {
        if (r.type !== 'WILL_PAY' || isSettled) return false;
      } else if (activeFilter === 'SETTLED') {
        if (!isSettled) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.counterpartyName.toLowerCase().includes(q);
        const matchesNotes = r.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesNotes) return false;
      }

      return true;
    });
  }, [reminders, activeFilter, searchQuery]);

  const handleOpenAdd = () => {
    setNewType('WILL_GET');
    setNewCounterparty('');
    setNewAmount('');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setNewDueDate(d.toISOString().split('T')[0]);
    setNewNotes('');
    setNewIsEmi(false);
    setNewEmiAmount('');
    setNewFrequency('MONTHLY');
    setNewBookId(books[0]?.id || 'book_personal');
    setIsAddModalOpen(true);
  };

  const handleCreateDebt = () => {
    const parsedAmount = parseFloat(newAmount);
    if (!newCounterparty.trim()) {
      Alert.alert('Validation Error', 'Please enter a person or institution name.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive principal amount.');
      return;
    }

    addReminder({
      bookId: newBookId,
      type: newType,
      counterpartyName: newCounterparty.trim(),
      amount: parsedAmount,
      paidAmount: 0,
      dueDate: newDueDate,
      notes: newNotes.trim() || undefined,
      isEmi: newIsEmi,
      emiAmount: newIsEmi && newEmiAmount ? parseFloat(newEmiAmount) || undefined : undefined,
      frequency: newIsEmi ? newFrequency : 'ONE_TIME',
      paymentHistory: [],
    });

    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (rem: Reminder) => {
    setSelectedDebtForDetail(null);
    setEditingReminder(rem);
    setEditType(rem.type);
    setEditCounterparty(rem.counterpartyName);
    setEditAmount(String(rem.amount));
    setEditPaidAmount(String(rem.paidAmount || 0));
    setEditDueDate(rem.dueDate);
    setEditNotes(rem.notes || '');
    setEditIsEmi(!!rem.isEmi);
    setEditEmiAmount(rem.emiAmount ? String(rem.emiAmount) : '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditedDebt = () => {
    if (!editingReminder) return;
    const parsedAmount = parseFloat(editAmount);
    const parsedPaid = parseFloat(editPaidAmount) || 0;
    if (!editCounterparty.trim()) {
      Alert.alert('Validation Error', 'Please enter a person or entity name.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    editReminder({
      ...editingReminder,
      type: editType,
      counterpartyName: editCounterparty.trim(),
      amount: parsedAmount,
      paidAmount: parsedPaid,
      dueDate: editDueDate,
      notes: editNotes.trim() || undefined,
      isEmi: editIsEmi,
      emiAmount: editIsEmi && editEmiAmount ? parseFloat(editEmiAmount) || undefined : undefined,
      status: parsedPaid >= parsedAmount ? 'SETTLED' : 'PENDING',
    });

    setIsEditModalOpen(false);
    setEditingReminder(null);
  };

  const handleDeleteDebtPrompt = (rem: Reminder) => {
    Alert.alert(
      'Delete Loan / Debt Account',
      `Delete account for ${rem.counterpartyName} (${settings.currencySymbol}${rem.amount})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteReminder(rem.id);
            setSelectedDebtForDetail(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* App Bar */}
      <Header title="Debts & Accounts Book" showBookSelector={false} />

      {/* Debt Summary Banner */}
      <View style={styles.debtSummaryBanner}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>You Will Get (Given)</Text>
          <Text style={[styles.summaryValue, { color: Colors.income }]}>
            +{settings.currencySymbol}
            {totalReceivable.toLocaleString()}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>You Will Pay (Loans / EMIs)</Text>
          <Text style={[styles.summaryValue, { color: Colors.expense }]}>
            -{settings.currencySymbol}
            {totalPayable.toLocaleString()}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Net Position</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  netDebtPosition >= 0 ? Colors.textPrimary : Colors.expense,
              },
            ]}
          >
            {settings.currencySymbol}
            {netDebtPosition.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Search & Add Action Bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search counterparties or loans..."
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

        <TouchableOpacity style={styles.addDebtBtn} onPress={handleOpenAdd}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addDebtBtnText}>New Loan / Account</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(
          [
            { id: 'ALL', label: 'All Accounts' },
            { id: 'WILL_GET', label: "You'll Get" },
            { id: 'WILL_PAY', label: "You'll Pay (EMIs)" },
            { id: 'SETTLED', label: 'Settled' },
          ] as const
        ).map((tab) => {
          const isSelected = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTabBtn,
                isSelected && styles.filterTabBtnActive,
              ]}
              onPress={() => setActiveFilter(tab.id)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isSelected && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Debts Cards List */}
      <ScrollView
        style={styles.scrollList}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredDebts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Accounts Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap "+ New Loan / Account" to track money given or loans with EMIs.
            </Text>
          </View>
        ) : (
          filteredDebts.map((rem) => {
            const isGet = rem.type === 'WILL_GET';
            const total = rem.amount;
            const paid = rem.paidAmount || 0;
            const remaining = Math.max(0, total - paid);
            const isSettled = rem.status === 'SETTLED' || remaining === 0;
            const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const targetBook = books.find((b) => b.id === rem.bookId);

            return (
              <TouchableOpacity
                key={rem.id}
                style={styles.debtCard}
                activeOpacity={0.8}
                onPress={() => setSelectedDebtForDetail(rem)}
              >
                {/* Header: Name, Badges */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.counterpartyName}>
                        {rem.counterpartyName}
                      </Text>
                      <View
                        style={[
                          styles.debtTypeChip,
                          isGet ? styles.debtTypeChipGet : styles.debtTypeChipPay,
                        ]}
                      >
                        <Text
                          style={[
                            styles.debtTypeChipText,
                            isGet
                              ? { color: Colors.income }
                              : { color: Colors.expense },
                          ]}
                        >
                          {isGet ? 'Given / Receivable' : 'Loan / EMI Payable'}
                        </Text>
                      </View>
                    </View>
                    {rem.notes ? (
                      <Text style={styles.notesText} numberOfLines={1}>
                        {rem.notes}
                      </Text>
                    ) : null}
                  </View>

                  {rem.isEmi && rem.emiAmount && (
                    <View style={styles.emiTag}>
                      <Ionicons name="repeat" size={11} color="#D97706" />
                      <Text style={styles.emiTagText}>
                        EMI: {settings.currencySymbol}
                        {rem.emiAmount.toLocaleString()} / mo
                      </Text>
                    </View>
                  )}
                </View>

                {/* Financial Figures */}
                <View style={styles.figuresBox}>
                  <View style={styles.figuresRow}>
                    <View>
                      <Text style={styles.figureLabel}>Principal</Text>
                      <Text style={styles.figureValue}>
                        {settings.currencySymbol}
                        {total.toLocaleString()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.figureLabel}>Paid So Far</Text>
                      <Text
                        style={[
                          styles.figureValue,
                          { color: isGet ? Colors.income : Colors.textSecondary },
                        ]}
                      >
                        {settings.currencySymbol}
                        {paid.toLocaleString()} ({pct}%)
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.figureLabel}>Remaining</Text>
                      <Text
                        style={[
                          styles.figureValueBold,
                          {
                            color: isSettled
                              ? '#059669'
                              : isGet
                              ? Colors.income
                              : Colors.expense,
                          },
                        ]}
                      >
                        {settings.currencySymbol}
                        {remaining.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: isSettled
                            ? '#10B981'
                            : isGet
                            ? Colors.income
                            : Colors.expense,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Footer: Due date & Tap action */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.footerDateWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.dueDateText}>
                      {isSettled
                        ? 'Fully Settled'
                        : `Due: ${formatFriendlyDate(rem.dueDate)}`}
                    </Text>
                  </View>

                  {targetBook && (
                    <View style={styles.bookTag}>
                      <Text style={styles.bookTagText}>{targetBook.name}</Text>
                    </View>
                  )}

                  <View style={styles.openDetailPill}>
                    <Text style={styles.openDetailText}>View & Settle</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={13}
                      color={Colors.primary}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Separate Page / Modal for Debt Details & Settlement */}
      <DebtDetailModal
        visible={!!selectedDebtForDetail}
        reminder={selectedDebtForDetail}
        onClose={() => setSelectedDebtForDetail(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteDebtPrompt}
      />

      {/* Modal: Add New Loan / Account */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Add Loan / Account / Reminder</Text>
            <Text style={styles.dialogSubtitle}>
              Track money given to others or loans with installment EMIs
            </Text>

            <View style={styles.remTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.remTypeOption,
                  newType === 'WILL_GET' && styles.remTypeOptionActiveGet,
                ]}
                onPress={() => setNewType('WILL_GET')}
              >
                <Text
                  style={[
                    styles.remTypeOptionText,
                    newType === 'WILL_GET' && styles.remTypeOptionTextActive,
                  ]}
                >
                  You Will Get (Given)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.remTypeOption,
                  newType === 'WILL_PAY' && styles.remTypeOptionActivePay,
                ]}
                onPress={() => setNewType('WILL_PAY')}
              >
                <Text
                  style={[
                    styles.remTypeOptionText,
                    newType === 'WILL_PAY' && styles.remTypeOptionTextActive,
                  ]}
                >
                  You Will Pay (Loan/EMI)
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.dialogInput}
              placeholder="Person / Entity Name (e.g. Rahul, HDFC Loan)"
              placeholderTextColor={Colors.textMuted}
              value={newCounterparty}
              onChangeText={setNewCounterparty}
              autoFocus
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Total Principal Amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={newAmount}
              onChangeText={setNewAmount}
            />

            {/* EMI Toggle */}
            <TouchableOpacity
              style={styles.emiCheckRow}
              onPress={() => setNewIsEmi(!newIsEmi)}
            >
              <Ionicons
                name={newIsEmi ? 'checkbox' : 'square-outline'}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.emiCheckText}>
                Has recurring EMI / installment payments
              </Text>
            </TouchableOpacity>

            {newIsEmi && (
              <View style={styles.emiInputsBox}>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="Monthly / Installment EMI Amount (e.g. 5000)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={newEmiAmount}
                  onChangeText={setNewEmiAmount}
                />
                <View style={styles.freqRow}>
                  <TouchableOpacity
                    style={[
                      styles.freqBtn,
                      newFrequency === 'MONTHLY' && styles.freqBtnActive,
                    ]}
                    onPress={() => setNewFrequency('MONTHLY')}
                  >
                    <Text
                      style={[
                        styles.freqBtnText,
                        newFrequency === 'MONTHLY' && styles.freqBtnTextActive,
                      ]}
                    >
                      Monthly EMI
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.freqBtn,
                      newFrequency === 'WEEKLY' && styles.freqBtnActive,
                    ]}
                    onPress={() => setNewFrequency('WEEKLY')}
                  >
                    <Text
                      style={[
                        styles.freqBtnText,
                        newFrequency === 'WEEKLY' && styles.freqBtnTextActive,
                      ]}
                    >
                      Weekly Installment
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.datePickerTrigger, { marginTop: 10 }]}
              onPress={() => setActiveDatePicker('NEW')}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.datePickerLabel}>First Due / Payment Date</Text>
                <Text style={styles.datePickerValue}>
                  {formatFriendlyDate(newDueDate)} ({newDueDate})
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Notes / Purpose"
              placeholderTextColor={Colors.textMuted}
              value={newNotes}
              onChangeText={setNewNotes}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleCreateDebt}
              >
                <Text style={styles.dialogConfirmText}>Save Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Loan / Debt Account */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Account / Loan Details</Text>

            <View style={styles.remTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.remTypeOption,
                  editType === 'WILL_GET' && styles.remTypeOptionActiveGet,
                ]}
                onPress={() => setEditType('WILL_GET')}
              >
                <Text
                  style={[
                    styles.remTypeOptionText,
                    editType === 'WILL_GET' && styles.remTypeOptionTextActive,
                  ]}
                >
                  You Will Get
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.remTypeOption,
                  editType === 'WILL_PAY' && styles.remTypeOptionActivePay,
                ]}
                onPress={() => setEditType('WILL_PAY')}
              >
                <Text
                  style={[
                    styles.remTypeOptionText,
                    editType === 'WILL_PAY' && styles.remTypeOptionTextActive,
                  ]}
                >
                  You Will Pay
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.dialogInput}
              placeholder="Person / Entity Name"
              placeholderTextColor={Colors.textMuted}
              value={editCounterparty}
              onChangeText={setEditCounterparty}
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Principal / Total Amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={editAmount}
              onChangeText={setEditAmount}
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Paid so far"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={editPaidAmount}
              onChangeText={setEditPaidAmount}
            />

            <TouchableOpacity
              style={styles.emiCheckRow}
              onPress={() => setEditIsEmi(!editIsEmi)}
            >
              <Ionicons
                name={editIsEmi ? 'checkbox' : 'square-outline'}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.emiCheckText}>EMI / recurring installments</Text>
            </TouchableOpacity>

            {editIsEmi && (
              <TextInput
                style={[styles.dialogInput, { marginTop: 6 }]}
                placeholder="EMI Amount per cycle"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={editEmiAmount}
                onChangeText={setEditEmiAmount}
              />
            )}

            <TouchableOpacity
              style={[styles.datePickerTrigger, { marginTop: 10 }]}
              onPress={() => setActiveDatePicker('EDIT')}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.datePickerLabel}>Next Due Date</Text>
                <Text style={styles.datePickerValue}>
                  {editDueDate
                    ? `${formatFriendlyDate(editDueDate)} (${editDueDate})`
                    : 'Select Due Date'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Notes / Purpose"
              placeholderTextColor={Colors.textMuted}
              value={editNotes}
              onChangeText={setEditNotes}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveEditedDebt}
              >
                <Text style={styles.dialogConfirmText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Universal Date Picker for Debts */}
      <DatePickerModal
        visible={activeDatePicker !== null}
        mode="date"
        title="Select Due Date"
        initialDate={
          activeDatePicker === 'NEW'
            ? newDueDate
            : editDueDate || new Date().toISOString().split('T')[0]
        }
        onConfirm={(pickedDate) => {
          if (activeDatePicker === 'NEW') {
            setNewDueDate(pickedDate);
          } else if (activeDatePicker === 'EDIT') {
            setEditDueDate(pickedDate);
          }
          setActiveDatePicker(null);
        }}
        onClose={() => setActiveDatePicker(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  debtSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    padding: 0,
  },
  addDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addDebtBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
  },
  filterTabBtnActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
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
  debtCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  counterpartyName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  debtTypeChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  debtTypeChipGet: {
    backgroundColor: '#DCFCE7',
  },
  debtTypeChipPay: {
    backgroundColor: '#FEE2E2',
  },
  debtTypeChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  figuresBox: {
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  figuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  figureLabel: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  figureValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  figureValueBold: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  footerDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  bookTag: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bookTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  openDetailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  openDetailText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dialogSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  remTypeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  remTypeOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  remTypeOptionActiveGet: {
    backgroundColor: Colors.income,
  },
  remTypeOptionActivePay: {
    backgroundColor: Colors.expense,
  },
  remTypeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  remTypeOptionTextActive: {
    color: '#FFFFFF',
  },
  dialogInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  emiCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  emiCheckText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emiInputsBox: {
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  freqBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  dialogCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dialogCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dialogConfirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dialogConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  datePickerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 1,
  },
});
