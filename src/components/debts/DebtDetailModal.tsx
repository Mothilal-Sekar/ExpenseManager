import React, { useState } from 'react';
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
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { formatFriendlyDate } from '../../services/dateUtils';
import { Account, Reminder } from '../../types';
import { DatePickerModal } from '../common/DatePickerModal';

interface DebtDetailModalProps {
  visible: boolean;
  reminder: Reminder | null;
  onClose: () => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
}

export const DebtDetailModal: React.FC<DebtDetailModalProps> = ({
  visible,
  reminder,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { accounts, settings, books, recordReminderPayment, markReminderSettled } =
    useApp();

  // Payment Recording State
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id || 'acc_cash_wallet'
  );
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  const [advanceDueDate, setAdvanceDueDate] = useState(true);

  if (!reminder) return null;

  const isGet = reminder.type === 'WILL_GET';
  const total = reminder.amount;
  const paid = reminder.paidAmount || 0;
  const remaining = Math.max(0, total - paid);
  const isSettled = reminder.status === 'SETTLED' || remaining === 0;
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const targetBook = books.find((b) => b.id === reminder.bookId);

  // Quick Settle Action Handler
  const handleQuickMakeSettled = () => {
    if (isSettled) {
      Alert.alert('Already Settled', 'This account is already marked as fully settled.');
      return;
    }

    Alert.alert(
      'Make Settled',
      `How would you like to settle the remaining ${settings.currencySymbol}${remaining.toLocaleString()} for ${reminder.counterpartyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Settled (No Balance Impact)',
          style: 'default',
          onPress: () => {
            markReminderSettled(reminder.id, false);
            Alert.alert(
              'Account Settled',
              `Account for ${reminder.counterpartyName} is now marked settled.`
            );
          },
        },
        {
          text: `Settle via ${isGet ? 'Receiving' : 'Paying'} ${settings.currencySymbol}${remaining.toLocaleString()}`,
          style: 'default',
          onPress: () => {
            // Pick first non-deleted account
            const acc = accounts.find((a) => !a.isDeleted) || accounts[0];
            markReminderSettled(
              reminder.id,
              true,
              acc.id,
              `Final Settlement - ${reminder.counterpartyName}`
            );
            Alert.alert(
              'Account Settled',
              `Remaining ${settings.currencySymbol}${remaining.toLocaleString()} recorded to ${acc.bankName || acc.name} and account marked settled.`
            );
          },
        },
      ]
    );
  };

  const handleOpenRecordPaymentForm = () => {
    const suggested =
      reminder.isEmi && reminder.emiAmount
        ? Math.min(reminder.emiAmount, remaining)
        : remaining;
    setPaymentAmount(String(suggested));
    setSelectedAccountId(accounts[0]?.id || 'acc_cash_wallet');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote(reminder.isEmi ? 'EMI Installment' : 'Partial Repayment');
    setAdvanceDueDate(true);
    setIsRecordingPayment(true);
  };

  const handleConfirmPayment = () => {
    const parsed = parseFloat(paymentAmount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive payment amount.');
      return;
    }

    recordReminderPayment(
      reminder.id,
      parsed,
      selectedAccountId,
      paymentDate,
      paymentNote,
      advanceDueDate
    );

    setIsRecordingPayment(false);
    Alert.alert(
      'Payment Recorded',
      `Recorded ${settings.currencySymbol}${parsed.toLocaleString()} for ${reminder.counterpartyName}. Account balances and repayment schedule updated.`
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.screenHeaderTitle}>Account & Loan Details</Text>
            <Text style={styles.screenHeaderSubtitle}>
              Manage repayments, EMIs, and settlements
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Account Info Card */}
          <View style={styles.mainInfoCard}>
            <View style={styles.personHeaderRow}>
              <View style={styles.avatarCircle}>
                <Ionicons
                  name={isGet ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={32}
                  color={isGet ? Colors.income : Colors.expense}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{reminder.counterpartyName}</Text>
                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.typeChip,
                      isGet ? styles.typeChipGet : styles.typeChipPay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        isGet ? { color: Colors.income } : { color: Colors.expense },
                      ]}
                    >
                      {isGet ? 'Given / Receivable' : 'Loan / EMI Payable'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusChip,
                      isSettled ? styles.statusChipSettled : styles.statusChipPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        isSettled ? { color: '#059669' } : { color: '#D97706' },
                      ]}
                    >
                      {isSettled ? 'FULLY SETTLED' : 'ACTIVE / PENDING'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {reminder.notes ? (
              <View style={styles.notesBox}>
                <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.notesText}>{reminder.notes}</Text>
              </View>
            ) : null}

            {/* Financial Numbers Highlight */}
            <View style={styles.kpiGridBox}>
              <View style={styles.kpiGridRow}>
                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>Total Principal</Text>
                  <Text style={styles.kpiValue}>
                    {settings.currencySymbol}
                    {total.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.kpiItem}>
                  <Text style={styles.kpiLabel}>Paid So Far</Text>
                  <Text
                    style={[
                      styles.kpiValue,
                      { color: isGet ? Colors.income : Colors.textPrimary },
                    ]}
                  >
                    {settings.currencySymbol}
                    {paid.toLocaleString()} ({pct}%)
                  </Text>
                </View>

                <View style={[styles.kpiItem, { alignItems: 'flex-end' }]}>
                  <Text style={styles.kpiLabel}>Remaining Balance</Text>
                  <Text
                    style={[
                      styles.kpiValueLarge,
                      { color: isSettled ? '#059669' : isGet ? Colors.income : Colors.expense },
                    ]}
                  >
                    {settings.currencySymbol}
                    {remaining.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Repayment Progress Bar */}
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

            {/* Schedule & Ledger Info */}
            <View style={styles.metaInfoRow}>
              <View style={styles.metaInfoItem}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.metaInfoText}>
                  {isSettled
                    ? 'Settled'
                    : `Next Due: ${formatFriendlyDate(reminder.dueDate)}`}
                </Text>
              </View>

              {reminder.isEmi && reminder.emiAmount && (
                <View style={styles.emiBadge}>
                  <Ionicons name="repeat" size={13} color="#D97706" />
                  <Text style={styles.emiBadgeText}>
                    EMI: {settings.currencySymbol}
                    {reminder.emiAmount.toLocaleString()}{' '}
                    {reminder.frequency === 'WEEKLY' ? '/ week' : '/ month'}
                  </Text>
                </View>
              )}

              {targetBook && (
                <View style={styles.bookBadge}>
                  <Text style={styles.bookBadgeText}>{targetBook.name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Settle & Payment Action Cards */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionHeading}>Settlement & Payment Actions</Text>

            <View style={styles.actionButtonsRow}>
              {!isSettled && (
                <TouchableOpacity
                  style={styles.makeSettledBtn}
                  onPress={handleQuickMakeSettled}
                >
                  <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.makeSettledBtnText}>Make Settled</Text>
                </TouchableOpacity>
              )}

              {!isSettled && (
                <TouchableOpacity
                  style={[
                    styles.recordPaymentBtn,
                    isGet ? styles.recordPaymentBtnGet : styles.recordPaymentBtnPay,
                  ]}
                  onPress={handleOpenRecordPaymentForm}
                >
                  <Ionicons
                    name={isGet ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.recordPaymentBtnText}>
                    {isGet ? 'Receive Payment / EMI' : 'Pay Installment / EMI'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Secondary Actions: Edit and Delete */}
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onEdit(reminder)}
              >
                <Ionicons name="pencil" size={14} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Edit Account Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryDeleteBtn}
                onPress={() => onDelete(reminder)}
              >
                <Ionicons name="trash-outline" size={14} color={Colors.expense} />
                <Text style={styles.secondaryDeleteBtnText}>Delete Loan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Form (if opened) */}
          {isRecordingPayment && (
            <View style={styles.paymentFormBox}>
              <View style={styles.paymentFormHeader}>
                <Text style={styles.paymentFormTitle}>
                  Record {isGet ? 'Receipt' : 'Payment'} for {reminder.counterpartyName}
                </Text>
                <TouchableOpacity onPress={() => setIsRecordingPayment(false)}>
                  <Ionicons name="close" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Payment Amount:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Amount"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                Account (Bank / Cash):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 6 }}
              >
                {accounts
                  .filter((a) => !a.isDeleted)
                  .map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accChip,
                        selectedAccountId === acc.id && styles.accChipActive,
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <Text
                        style={[
                          styles.accChipText,
                          selectedAccountId === acc.id && styles.accChipTextActive,
                        ]}
                      >
                        {acc.bankName || acc.name} ({settings.currencySymbol}
                        {acc.currentBalance.toLocaleString()})
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { marginTop: 6 }]}>
                Payment Date:
              </Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setIsDatePickerOpen(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.datePickerTriggerText}>
                  {formatFriendlyDate(paymentDate)} ({paymentDate})
                </Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                Reference Note:
              </Text>
              <TextInput
                style={styles.formInput}
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="e.g. Month 3 Installment, Online Transfer"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={styles.advanceRow}
                onPress={() => setAdvanceDueDate(!advanceDueDate)}
              >
                <Ionicons
                  name={advanceDueDate ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.advanceRowText}>
                  Advance next reminder due date by 1 cycle for timely notifications
                </Text>
              </TouchableOpacity>

              <View style={styles.formActionsRow}>
                <TouchableOpacity
                  style={styles.formCancelBtn}
                  onPress={() => setIsRecordingPayment(false)}
                >
                  <Text style={styles.formCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formConfirmBtn}
                  onPress={handleConfirmPayment}
                >
                  <Text style={styles.formConfirmText}>Submit Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Payment History Section */}
          <View style={styles.historySection}>
            <View style={styles.historySectionHeader}>
              <Text style={styles.sectionHeading}>
                Payment History ({reminder.paymentHistory?.length || 0})
              </Text>
            </View>

            {(!reminder.paymentHistory || reminder.paymentHistory.length === 0) ? (
              <View style={styles.emptyHistoryBox}>
                <Ionicons name="time-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyHistoryText}>
                  No payments recorded yet for this account.
                </Text>
              </View>
            ) : (
              reminder.paymentHistory.map((p, idx) => {
                const acc = accounts.find((a) => a.id === p.accountId);
                return (
                  <View key={p.id || idx} style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyAmountText}>
                        +{settings.currencySymbol}
                        {p.amount.toLocaleString()}
                      </Text>
                      <Text style={styles.historyNoteText}>
                        {p.note || 'Payment Installment'} • {acc?.bankName || acc?.name || 'Account'}
                      </Text>
                    </View>
                    <Text style={styles.historyDateText}>{p.date}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <DatePickerModal
          visible={isDatePickerOpen}
          mode="date"
          title="Select Payment Date"
          initialDate={paymentDate}
          onConfirm={(picked) => {
            setPaymentDate(picked);
            setIsDatePickerOpen(false);
          }}
          onClose={() => setIsDatePickerOpen(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  topBarLeft: {
    flex: 1,
  },
  screenHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  screenHeaderSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  mainInfoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  personHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeChipGet: {
    backgroundColor: '#DCFCE7',
  },
  typeChipPay: {
    backgroundColor: '#FEE2E2',
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipPending: {
    backgroundColor: '#FEF3C7',
  },
  statusChipSettled: {
    backgroundColor: '#D1FAE5',
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '800',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  kpiGridBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  kpiGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiItem: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  kpiValueLarge: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  progressBarBg: {
    height: 7,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  metaInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaInfoText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  emiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  emiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  bookBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bookBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  actionsSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  makeSettledBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  makeSettledBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recordPaymentBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  recordPaymentBtnGet: {
    backgroundColor: Colors.income,
  },
  recordPaymentBtnPay: {
    backgroundColor: Colors.expense,
  },
  recordPaymentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  secondaryDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  secondaryDeleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.expense,
  },
  paymentFormBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  paymentFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentFormTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerTriggerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  accChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  accChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  accChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  advanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  advanceRowText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  formCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  formCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  formConfirmBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  formConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historySection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  historySectionHeader: {
    marginBottom: 4,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  historyLeft: {
    flex: 1,
  },
  historyAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  historyNoteText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  historyDateText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
