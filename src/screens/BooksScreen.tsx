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
import { resolveAccountName } from '../services/balanceEngine';
import {
  formatDateKey,
  formatFriendlyDate,
  formatFriendlyTime,
} from '../services/dateUtils';
import { Book, Transaction } from '../types';

export const BooksScreen: React.FC = () => {
  const {
    books,
    transactions,
    accounts,
    categories,
    settings,
    addBook,
    editBook,
    deleteBook,
    deleteTransaction,
    setPrefilledTransaction,
    setIsTransactionModalOpen,
  } = useApp();

  // Selected Ledger for dedicated Separate Screen view
  const [selectedLedgerForDetail, setSelectedLedgerForDetail] = useState<Book | null>(
    null
  );

  // Search within selected ledger
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // Modals for Create and Edit Book
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');
  const [newBookColor, setNewBookColor] = useState('#2563EB');

  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [editBookDesc, setEditBookDesc] = useState('');
  const [editBookColor, setEditBookColor] = useState('#2563EB');

  // Compute stats for a book
  const getBookStats = (bookId: string) => {
    const bTxs = transactions.filter((t) => t.bookId === bookId);
    let inflow = 0;
    let outflow = 0;
    bTxs.forEach((t) => {
      if (t.type === 'INCOME') inflow += t.amount;
      else if (t.type === 'EXPENSE') outflow += t.amount;
    });
    return {
      inflow,
      outflow,
      balance: inflow - outflow,
      count: bTxs.length,
      txs: bTxs,
    };
  };

  // Transactions for the currently opened separate ledger page
  const selectedLedgerTransactions = useMemo(() => {
    if (!selectedLedgerForDetail) return [];
    return transactions.filter((tx) => {
      if (tx.bookId !== selectedLedgerForDetail.id) return false;
      if (ledgerSearchQuery.trim()) {
        const q = ledgerSearchQuery.toLowerCase();
        const cat = categories.find((c) => c.id === tx.categoryId);
        const matchesRemark = tx.remark?.toLowerCase().includes(q);
        const matchesCat = cat?.name.toLowerCase().includes(q);
        const matchesAmount = String(tx.amount).includes(q);
        if (!matchesRemark && !matchesCat && !matchesAmount) return false;
      }
      return true;
    });
  }, [transactions, selectedLedgerForDetail, ledgerSearchQuery, categories]);

  // Group ledger transactions by date
  const groupedLedgerTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    selectedLedgerTransactions.forEach((tx) => {
      const dateKey = formatDateKey(new Date(tx.dateTime));
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [selectedLedgerTransactions]);

  const handleCreateBook = () => {
    if (!newBookName.trim()) {
      Alert.alert('Validation Error', 'Please enter a ledger name.');
      return;
    }
    addBook(newBookName.trim(), newBookDesc.trim() || undefined, newBookColor);
    setNewBookName('');
    setNewBookDesc('');
    setIsAddBookModalOpen(false);
  };

  const handleOpenEditBook = (book: Book) => {
    setEditingBook(book);
    setEditBookName(book.name);
    setEditBookDesc(book.description || '');
    setEditBookColor(book.color);
    setIsEditBookModalOpen(true);
  };

  const handleSaveEditedBook = () => {
    if (!editingBook) return;
    if (!editBookName.trim()) {
      Alert.alert('Validation Error', 'Ledger name cannot be empty.');
      return;
    }
    const updated: Book = {
      ...editingBook,
      name: editBookName.trim(),
      description: editBookDesc.trim() || undefined,
      color: editBookColor,
    };
    editBook(updated);
    if (selectedLedgerForDetail?.id === updated.id) {
      setSelectedLedgerForDetail(updated);
    }
    setIsEditBookModalOpen(false);
    setEditingBook(null);
  };

  const handleDeleteBookPrompt = (book: Book) => {
    if (books.length <= 1) {
      Alert.alert(
        'Action Restricted',
        'You must have at least one active ledger book in your account.'
      );
      return;
    }

    Alert.alert(
      'Delete Ledger Book',
      `Delete "${book.name}"? Transactions associated with this book will remain stored in history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBook(book.id);
            if (selectedLedgerForDetail?.id === book.id) {
              setSelectedLedgerForDetail(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTxPrompt = (tx: Transaction) => {
    Alert.alert(
      'Delete Entry',
      `Delete this ${tx.type.toLowerCase()} of ${settings.currencySymbol}${tx.amount}? Account balances will update accordingly.`,
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

  const handleAddEntryToThisLedger = (book: Book) => {
    setPrefilledTransaction({
      bookId: book.id,
      dateTime: new Date().toISOString(),
    });
    setIsTransactionModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // VIEW 1: DEDICATED SEPARATE PAGE FOR A SPECIFIC LEDGER
  // --------------------------------------------------------------------------
  if (selectedLedgerForDetail) {
    const stats = getBookStats(selectedLedgerForDetail.id);

    return (
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.detailHeaderBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedLedgerForDetail(null)}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
            <Text style={styles.backBtnText}>All Ledgers</Text>
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => handleOpenEditBook(selectedLedgerForDetail)}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
            </TouchableOpacity>

            {books.length > 1 && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => handleDeleteBookPrompt(selectedLedgerForDetail)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.expense} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Ledger Title & Accent Banner */}
          <View
            style={[
              styles.ledgerHeroBanner,
              { borderLeftColor: selectedLedgerForDetail.color, borderLeftWidth: 5 },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{selectedLedgerForDetail.name}</Text>
                <Text style={styles.heroDesc}>
                  {selectedLedgerForDetail.description || 'Dedicated Ledger Book'}
                </Text>
              </View>
              <View
                style={[
                  styles.themeCircle,
                  { backgroundColor: selectedLedgerForDetail.color },
                ]}
              />
            </View>

            {/* Dashboard KPIs */}
            <View style={styles.kpiCardsRow}>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiBoxLabel}>Total Inflow</Text>
                <Text style={[styles.kpiBoxValue, { color: Colors.income }]}>
                  +{settings.currencySymbol}
                  {stats.inflow.toLocaleString()}
                </Text>
              </View>

              <View style={styles.kpiBox}>
                <Text style={styles.kpiBoxLabel}>Total Outflow</Text>
                <Text style={[styles.kpiBoxValue, { color: Colors.expense }]}>
                  -{settings.currencySymbol}
                  {stats.outflow.toLocaleString()}
                </Text>
              </View>

              <View style={styles.kpiBox}>
                <Text style={styles.kpiBoxLabel}>Net Balance</Text>
                <Text
                  style={[
                    styles.kpiBoxValue,
                    {
                      color:
                        stats.balance >= 0 ? Colors.textPrimary : Colors.expense,
                    },
                  ]}
                >
                  {settings.currencySymbol}
                  {stats.balance.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Direct Add Entry Button */}
            <TouchableOpacity
              style={styles.addEntryBannerBtn}
              onPress={() => handleAddEntryToThisLedger(selectedLedgerForDetail)}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.addEntryBannerBtnText}>
                + Add Entry to {selectedLedgerForDetail.name}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box within this Ledger */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search entries in ${selectedLedgerForDetail.name}...`}
              placeholderTextColor={Colors.textMuted}
              value={ledgerSearchQuery}
              onChangeText={setLedgerSearchQuery}
            />
            {ledgerSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setLedgerSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Entries Section Header */}
          <View style={styles.entriesSectionHeader}>
            <Text style={styles.entriesSectionTitle}>
              Ledger Transactions ({stats.count})
            </Text>
          </View>

          {/* Grouped Ledger Entries List */}
          {groupedLedgerTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Entries in this Ledger</Text>
              <Text style={styles.emptySubtitle}>
                Tap "+ Add Entry" to record income, expense, or transfers in this book.
              </Text>
            </View>
          ) : (
            groupedLedgerTransactions.map(([dateKey, txList]) => (
              <View key={dateKey} style={styles.dateGroupCard}>
                <Text style={styles.dateGroupTitle}>
                  {formatFriendlyDate(dateKey)}
                </Text>

                {txList.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const isExpense = tx.type === 'EXPENSE';
                  const isIncome = tx.type === 'INCOME';
                  const amountColor = isIncome
                    ? Colors.income
                    : isExpense
                    ? Colors.expense
                    : Colors.primary;
                  const prefix = isIncome ? '+' : isExpense ? '-' : '';
                  const sourceInfo = resolveAccountName(
                    tx.sourceAccountId,
                    accounts
                  );

                  return (
                    <View key={tx.id} style={styles.txRow}>
                      <View
                        style={[
                          styles.catIconWrap,
                          {
                            backgroundColor: cat ? `${cat.color}20` : '#F1F5F9',
                          },
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

                      <View style={{ flex: 1 }}>
                        <View style={styles.txTopLine}>
                          <Text style={styles.txTitle} numberOfLines={1}>
                            {cat?.name || 'Uncategorised'}
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
                          <View style={styles.tagWrap}>
                            <Text style={styles.tagText}>{sourceInfo.name}</Text>
                          </View>
                          <View style={styles.tagWrap}>
                            <Text style={styles.tagText}>{tx.mode}</Text>
                          </View>
                          <Text style={styles.txTime}>
                            {formatFriendlyTime(tx.dateTime)}
                          </Text>
                        </View>
                      </View>

                      {/* Edit and Delete Actions */}
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleEditTx(tx)}
                        >
                          <Ionicons name="pencil" size={15} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleDeleteTxPrompt(tx)}
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
            ))
          )}
        </ScrollView>

        {/* Modal: Edit Book */}
        <Modal
          visible={isEditBookModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsEditBookModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Edit Ledger Book</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="Ledger Name"
                placeholderTextColor={Colors.textMuted}
                value={editBookName}
                onChangeText={setEditBookName}
              />
              <TextInput
                style={[styles.dialogInput, { marginTop: 10 }]}
                placeholder="Description (optional)"
                placeholderTextColor={Colors.textMuted}
                value={editBookDesc}
                onChangeText={setEditBookDesc}
              />

              <Text style={styles.colorLabel}>Theme Accent Color:</Text>
              <View style={styles.colorsRow}>
                {[
                  '#2563EB',
                  '#10B981',
                  '#F59E0B',
                  '#8B5CF6',
                  '#EC4899',
                  '#06B6D4',
                  '#EF4444',
                ].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      editBookColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setEditBookColor(c)}
                  />
                ))}
              </View>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsEditBookModalOpen(false)}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogConfirmBtn}
                  onPress={handleSaveEditedBook}
                >
                  <Text style={styles.dialogConfirmText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 2: ALL LEDGERS GRID OVERVIEW (No duplicate app bar filter)
  // --------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* App Bar without duplicate ledger selector pills */}
      <Header title="Ledger Books" showBookSelector={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Your Ledger Books</Text>
            <Text style={styles.sectionSubtitle}>
              Tap any ledger to open its dedicated entries, balance, and management
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newBookBtn}
            onPress={() => setIsAddBookModalOpen(true)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newBookBtnText}>New Ledger</Text>
          </TouchableOpacity>
        </View>

        {/* Ledgers Cards Grid */}
        <View style={styles.ledgersGrid}>
          {books.map((book) => {
            const stats = getBookStats(book.id);

            return (
              <TouchableOpacity
                key={book.id}
                style={[
                  styles.ledgerOverviewCard,
                  { borderLeftColor: book.color, borderLeftWidth: 4 },
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedLedgerForDetail(book)}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardLedgerName} numberOfLines={1}>
                      {book.name}
                    </Text>
                    {book.description ? (
                      <Text style={styles.cardLedgerDesc} numberOfLines={1}>
                        {book.description}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.colorDotBadge,
                      { backgroundColor: book.color },
                    ]}
                  />
                </View>

                {/* Balance Figures */}
                <View style={styles.cardFiguresRow}>
                  <View>
                    <Text style={styles.cardFigureLabel}>Net Balance</Text>
                    <Text
                      style={[
                        styles.cardFigureValue,
                        {
                          color:
                            stats.balance >= 0
                              ? Colors.textPrimary
                              : Colors.expense,
                        },
                      ]}
                    >
                      {settings.currencySymbol}
                      {stats.balance.toLocaleString()}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardFigureLabel}>Entries</Text>
                    <Text style={styles.cardEntriesCount}>
                      {stats.count} transactions
                    </Text>
                  </View>
                </View>

                {/* Footer Action */}
                <View style={styles.cardFooterActionRow}>
                  <View style={styles.openLedgerBtn}>
                    <Text style={styles.openLedgerText}>Open Ledger</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={Colors.primary}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal: Create New Book */}
      <Modal
        visible={isAddBookModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddBookModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Create New Ledger Book</Text>
            <Text style={styles.dialogSubtitle}>
              Separate transactions by project, month, household, or trip.
            </Text>

            <TextInput
              style={styles.dialogInput}
              placeholder="Ledger Name (e.g. November 2026, Office Team)"
              placeholderTextColor={Colors.textMuted}
              value={newBookName}
              onChangeText={setNewBookName}
              autoFocus
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textMuted}
              value={newBookDesc}
              onChangeText={setNewBookDesc}
            />

            <Text style={styles.colorLabel}>Theme Accent Color:</Text>
            <View style={styles.colorsRow}>
              {[
                '#2563EB',
                '#10B981',
                '#F59E0B',
                '#8B5CF6',
                '#EC4899',
                '#06B6D4',
                '#EF4444',
              ].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    newBookColor === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setNewBookColor(c)}
                />
              ))}
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsAddBookModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleCreateBook}
              >
                <Text style={styles.dialogConfirmText}>Create Book</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 240,
  },
  newBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  newBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ledgersGrid: {
    gap: 12,
  },
  ledgerOverviewCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLedgerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cardLedgerDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  colorDotBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  cardFiguresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 10,
  },
  cardFigureLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  cardFigureValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  cardEntriesCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  cardFooterActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  openLedgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openLedgerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Separate Detail Page Styles
  detailHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.cardBackground,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
  },
  ledgerHeroBanner: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  heroDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  themeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  kpiCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  kpiBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  kpiBoxValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  addEntryBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addEntryBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    padding: 0,
  },
  entriesSectionHeader: {
    marginTop: 4,
  },
  entriesSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  dateGroupCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  dateGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  txTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  txRemark: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tagWrap: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  txTime: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  actionBtn: {
    padding: 4,
  },

  // Modal Styles
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
  dialogInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
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
});
