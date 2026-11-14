import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { buildMonthlyGoogleSheetData } from '../../services/googleSheetsService';
import { formatDateKey, formatFriendlyDate, formatFriendlyTime } from '../../services/dateUtils';
import { resolveAccountName } from '../../services/balanceEngine';
import { DatePickerModal } from '../common/DatePickerModal';

type PrimaryExportTab = 'EXCEL_EXPORT' | 'SHEETS_SYNC';
type DatePreset = 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';

export const GoogleSheetsExportModal: React.FC = () => {
  const {
    isSheetsModalOpen,
    setIsSheetsModalOpen,
    transactions,
    accounts,
    categories,
    books,
    settings,
    syncStatus,
    triggerManualSync,
    openGoogleSpreadsheet,
  } = useApp();

  // Primary mode
  const [primaryTab, setPrimaryTab] = useState<PrimaryExportTab>('EXCEL_EXPORT');

  // Excel / CSV Export options
  const [selectedExportBookId, setSelectedExportBookId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');

  // Date range state
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [customStartDate, setCustomStartDate] = useState<string>(firstDayThisMonth);
  const [customEndDate, setCustomEndDate] = useState<string>(lastDayThisMonth);
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);

  // Google Sheets state
  const [sheetsActiveTab, setSheetsActiveTab] = useState<'TRANSACTIONS' | 'DASHBOARD'>('TRANSACTIONS');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Apply Date Presets
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const d = new Date();
    if (preset === 'THIS_MONTH') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else if (preset === 'LAST_30_DAYS') {
      const start = new Date(d.getTime() - 30 * 86400000).toISOString().split('T')[0];
      const end = d.toISOString().split('T')[0];
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else if (preset === 'THIS_YEAR') {
      const start = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = new Date(d.getFullYear(), 11, 31).toISOString().split('T')[0];
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else if (preset === 'ALL_TIME') {
      setCustomStartDate('2020-01-01');
      setCustomEndDate('2030-12-31');
    }
  };

  // Filter transactions for Excel / CSV export
  const filteredExportTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Ledger filter
      if (selectedExportBookId !== 'ALL' && tx.bookId !== selectedExportBookId) {
        return false;
      }
      // 2. Date range filter
      const txDateKey = formatDateKey(new Date(tx.dateTime));
      if (customStartDate && txDateKey < customStartDate) return false;
      if (customEndDate && txDateKey > customEndDate) return false;
      return true;
    });
  }, [transactions, selectedExportBookId, customStartDate, customEndDate]);

  // Aggregate stats
  const exportStats = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    filteredExportTransactions.forEach((tx) => {
      if (tx.type === 'INCOME') inflow += tx.amount;
      else if (tx.type === 'EXPENSE') outflow += tx.amount;
    });
    return {
      count: filteredExportTransactions.length,
      inflow,
      outflow,
      net: inflow - outflow,
    };
  }, [filteredExportTransactions]);

  // Selected ledger name
  const selectedBookName = useMemo(() => {
    if (selectedExportBookId === 'ALL') return 'All Ledgers';
    const b = books.find((x) => x.id === selectedExportBookId);
    return b ? b.name : 'Selected Ledger';
  }, [books, selectedExportBookId]);

  // Generate Excel / CSV string
  const generateCSV = () => {
    const headers = [
      'Date',
      'Time',
      'Ledger Book',
      'Type',
      'Category',
      'Subcategory',
      'Amount',
      'Mode',
      'Account / Bank',
      'Destination Account',
      'Remark',
      'Skip Balance Update',
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredExportTransactions.map((tx) => {
      const d = new Date(tx.dateTime);
      const dateStr = formatDateKey(d);
      const timeStr = formatFriendlyTime(tx.dateTime);
      const book = books.find((b) => b.id === tx.bookId)?.name || 'Default';
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catName = cat?.name || 'Uncategorised';
      const subName =
        cat?.subcategories.find((s) => s.id === tx.subcategoryId)?.name || 'General';
      const accName = resolveAccountName(tx.sourceAccountId, accounts).name;
      const destAccName = tx.destinationAccountId
        ? resolveAccountName(tx.destinationAccountId, accounts).name
        : '';

      return [
        escapeCSV(dateStr),
        escapeCSV(timeStr),
        escapeCSV(book),
        escapeCSV(tx.type),
        escapeCSV(catName),
        escapeCSV(subName),
        tx.amount,
        escapeCSV(tx.mode),
        escapeCSV(accName),
        escapeCSV(destAccName),
        escapeCSV(tx.remark || ''),
        escapeCSV(tx.skipBalanceUpdate ? 'YES' : 'NO'),
      ].join(',');
    });

    // UTF-8 BOM for Microsoft Excel compatibility
    return '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n');
  };

  // Trigger Share or Download
  const handleExportCSV = async () => {
    if (filteredExportTransactions.length === 0) {
      Alert.alert('Empty Export', 'No transactions found for the selected ledger and date range.');
      return;
    }

    const csvContent = generateCSV();
    const filename = `Expense_Report_${selectedBookName.replace(/[^a-zA-Z0-9]/g, '_')}_${customStartDate}_to_${customEndDate}.csv`;

    try {
      if (Platform.OS === 'web') {
        // Standard browser download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Download Started', `Saved "${filename}" to your downloads folder.`);
      } else {
        // Mobile Share sheet
        await Share.share({
          title: filename,
          message: csvContent,
        });
      }
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not share CSV file.');
    }
  };

  // Google Sheets target month
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const sheetData = useMemo(() => {
    return buildMonthlyGoogleSheetData(
      targetDate,
      transactions,
      accounts,
      categories,
      books,
      settings.currencySymbol
    );
  }, [targetDate, transactions, accounts, categories, books, settings.currencySymbol]);

  const monthLabel = targetDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleExportGoogleSheets = async () => {
    setIsExporting(true);
    await triggerManualSync();
    setIsExporting(false);
    Alert.alert(
      'Export Successful',
      `Spreadsheet "${sheetData.spreadsheetTitle}" with tabs "Transactions" and "Expense Dashboard" was synchronized to ${settings.googleEmail} in Google Drive.`
    );
  };

  return (
    <Modal
      visible={isSheetsModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsSheetsModalOpen(false)}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setIsSheetsModalOpen(false)}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleCol}>
            <Text style={styles.topBarTitle}>Export & Spreadsheet Center</Text>
            <Text style={styles.topBarSubtitle}>
              Excel CSV Export & Realtime Google Sheets Sync
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Primary Tabs: Excel / CSV Export vs Google Sheets Cloud */}
        <View style={styles.primaryTabsRow}>
          <TouchableOpacity
            style={[
              styles.primaryTabBtn,
              primaryTab === 'EXCEL_EXPORT' && styles.primaryTabBtnActive,
            ]}
            onPress={() => setPrimaryTab('EXCEL_EXPORT')}
          >
            <Ionicons
              name="document-text"
              size={16}
              color={primaryTab === 'EXCEL_EXPORT' ? '#FFFFFF' : '#059669'}
            />
            <Text
              style={[
                styles.primaryTabText,
                primaryTab === 'EXCEL_EXPORT' && styles.primaryTabTextActive,
              ]}
            >
              Excel / CSV Export
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryTabBtn,
              primaryTab === 'SHEETS_SYNC' && styles.primaryTabBtnActive,
            ]}
            onPress={() => setPrimaryTab('SHEETS_SYNC')}
          >
            <Ionicons
              name="logo-google"
              size={15}
              color={primaryTab === 'SHEETS_SYNC' ? '#FFFFFF' : '#2563EB'}
            />
            <Text
              style={[
                styles.primaryTabText,
                primaryTab === 'SHEETS_SYNC' && styles.primaryTabTextActive,
              ]}
            >
              Google Sheets Sync
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================== */}
        {/* TAB 1: EXCEL / CSV EXPORT (Ledger + Custom Date Range) */}
        {/* ============================================================== */}
        {primaryTab === 'EXCEL_EXPORT' && (
          <ScrollView style={styles.exportScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Select Ledger Book */}
            <View style={styles.filterSectionCard}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="book-outline" size={16} color={Colors.primary} />
                <Text style={styles.filterSectionTitle}>Select Ledger Book:</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pillsScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.ledgerPill,
                    selectedExportBookId === 'ALL' && styles.ledgerPillActive,
                  ]}
                  onPress={() => setSelectedExportBookId('ALL')}
                >
                  <Text
                    style={[
                      styles.ledgerPillText,
                      selectedExportBookId === 'ALL' && styles.ledgerPillTextActive,
                    ]}
                  >
                    All Ledgers ({transactions.length})
                  </Text>
                </TouchableOpacity>

                {books.map((b) => {
                  const isSelected = selectedExportBookId === b.id;
                  const count = transactions.filter((t) => t.bookId === b.id).length;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.ledgerPill,
                        isSelected && { backgroundColor: b.color, borderColor: b.color },
                      ]}
                      onPress={() => setSelectedExportBookId(b.id)}
                    >
                      <Text
                        style={[
                          styles.ledgerPillText,
                          isSelected && styles.ledgerPillTextActive,
                        ]}
                      >
                        {b.name} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Custom Date Range & Presets */}
            <View style={styles.filterSectionCard}>
              <View style={styles.filterSectionHeader}>
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.filterSectionTitle}>Select Date Range:</Text>
              </View>

              <View style={styles.presetsRow}>
                {[
                  { key: 'THIS_MONTH' as DatePreset, label: 'This Month' },
                  { key: 'LAST_MONTH' as DatePreset, label: 'Last Month' },
                  { key: 'LAST_30_DAYS' as DatePreset, label: 'Last 30 Days' },
                  { key: 'THIS_YEAR' as DatePreset, label: 'This Year' },
                  { key: 'ALL_TIME' as DatePreset, label: 'All Time' },
                  { key: 'CUSTOM' as DatePreset, label: 'Custom' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.presetChip,
                      datePreset === item.key && styles.presetChipActive,
                    ]}
                    onPress={() => handleSelectPreset(item.key)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        datePreset === item.key && styles.presetChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Interactive Start Date & End Date Pickers */}
              <View style={styles.dateInputsRow}>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setDatePickerTarget('START')}
                >
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <View style={styles.datePickerBtnTexts}>
                    <Text style={styles.dateInputLabel}>From Date</Text>
                    <Text style={styles.dateValText} numberOfLines={1}>
                      {formatFriendlyDate(customStartDate)}
                    </Text>
                    <Text style={styles.dateSubValText}>{customStartDate}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setDatePickerTarget('END')}
                >
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <View style={styles.datePickerBtnTexts}>
                    <Text style={styles.dateInputLabel}>To Date</Text>
                    <Text style={styles.dateValText} numberOfLines={1}>
                      {formatFriendlyDate(customEndDate)}
                    </Text>
                    <Text style={styles.dateSubValText}>{customEndDate}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Export Summary Metrics */}
            <View style={styles.metricsBox}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Entries</Text>
                <Text style={styles.metricValue}>{exportStats.count}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Inflow</Text>
                <Text style={[styles.metricValue, { color: Colors.income }]}>
                  {settings.currencySymbol}
                  {exportStats.inflow.toLocaleString()}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Total Outflow</Text>
                <Text style={[styles.metricValue, { color: Colors.expense }]}>
                  {settings.currencySymbol}
                  {exportStats.outflow.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* 4. Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.excelExportBtn}
                onPress={handleExportCSV}
              >
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text style={styles.excelExportBtnText}>
                  Export & Share Excel (CSV)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 5. Every Day Transaction Breakdown Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>
                Every Day Transaction Preview ({exportStats.count}):
              </Text>

              {filteredExportTransactions.length === 0 ? (
                <View style={styles.noResultsBox}>
                  <Ionicons name="search-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.noResultsText}>
                    No transactions match the selected ledger and date filters.
                  </Text>
                </View>
              ) : (
                filteredExportTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const acc = accounts.find((a) => a.id === tx.sourceAccountId);
                  const isExp = tx.type === 'EXPENSE';
                  const isInc = tx.type === 'INCOME';

                  return (
                    <View key={tx.id} style={styles.txPreviewCard}>
                      <View style={styles.txPreviewTop}>
                        <View style={styles.txPreviewLeft}>
                          <Text style={styles.txDateText}>
                            {formatFriendlyDate(tx.dateTime.split('T')[0])} •{' '}
                            {formatFriendlyTime(tx.dateTime)}
                          </Text>
                          <Text style={styles.txCatTitle}>
                            {cat?.name || 'Uncategorised'}
                            {tx.remark ? ` — ${tx.remark}` : ''}
                          </Text>
                          <Text style={styles.txSubText}>
                            {acc?.name || acc?.bankName || 'Account'} ({tx.mode})
                          </Text>
                        </View>

                        <View style={styles.txPreviewRight}>
                          <Text
                            style={[
                              styles.txAmountText,
                              isExp && { color: Colors.expense },
                              isInc && { color: Colors.income },
                            ]}
                          >
                            {isExp ? '-' : isInc ? '+' : ''}
                            {settings.currencySymbol}
                            {tx.amount.toLocaleString()}
                          </Text>
                          <View
                            style={[
                              styles.txTypeBadge,
                              isExp && styles.txTypeBadgeExp,
                              isInc && styles.txTypeBadgeInc,
                            ]}
                          >
                            <Text
                              style={[
                                styles.txTypeBadgeText,
                                isExp && { color: Colors.expense },
                                isInc && { color: Colors.income },
                              ]}
                            >
                              {tx.type}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* TAB 2: GOOGLE SHEETS MONTHLY SYNC */}
        {/* ============================================================== */}
        {primaryTab === 'SHEETS_SYNC' && (
          <View style={{ flex: 1 }}>
            {/* Month Selector Bar */}
            <View style={styles.monthSelectorBar}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => setSelectedMonthOffset((prev) => prev - 1)}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.monthCenter}>
                <Ionicons name="document-text" size={16} color="#10B981" />
                <Text style={styles.monthText}>{monthLabel}</Text>
                <Text style={styles.fileSlug}>({sheetData.spreadsheetTitle})</Text>
              </View>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => setSelectedMonthOffset((prev) => prev + 1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher: "Transactions" vs "Expense Dashboard" */}
            <View style={styles.tabSwitchContainer}>
              <TouchableOpacity
                style={[
                  styles.tabSwitchBtn,
                  sheetsActiveTab === 'TRANSACTIONS' && styles.tabSwitchBtnActive,
                ]}
                onPress={() => setSheetsActiveTab('TRANSACTIONS')}
              >
                <Text
                  style={[
                    styles.tabSwitchText,
                    sheetsActiveTab === 'TRANSACTIONS' && styles.tabSwitchTextActive,
                  ]}
                >
                  Sheet 1: Transactions ({sheetData.sheets.transactionsTab.rows.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabSwitchBtn,
                  sheetsActiveTab === 'DASHBOARD' && styles.tabSwitchBtnActive,
                ]}
                onPress={() => setSheetsActiveTab('DASHBOARD')}
              >
                <Text
                  style={[
                    styles.tabSwitchText,
                    sheetsActiveTab === 'DASHBOARD' && styles.tabSwitchTextActive,
                  ]}
                >
                  Sheet 2: Dashboard
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sheets Table Content */}
            {sheetsActiveTab === 'TRANSACTIONS' ? (
              <ScrollView style={styles.contentScroll} horizontal>
                <ScrollView style={styles.contentScrollVertical}>
                  <View style={styles.sheetTable}>
                    <View style={styles.tableHeaderRow}>
                      {sheetData.sheets.transactionsTab.headers.map((h, i) => (
                        <Text key={i} style={[styles.tableHeaderCell, getColWidth(i)]}>
                          {h}
                        </Text>
                      ))}
                    </View>
                    {sheetData.sheets.transactionsTab.rows.map((row, rIdx) => (
                      <View
                        key={rIdx}
                        style={[
                          styles.tableRow,
                          rIdx % 2 === 1 && styles.tableRowAlt,
                        ]}
                      >
                        {row.map((cell, cIdx) => (
                          <Text
                            key={cIdx}
                            style={[
                              styles.tableCell,
                              getColWidth(cIdx),
                              cIdx === 3 && cell === 'EXPENSE' && { color: Colors.expense },
                              cIdx === 3 && cell === 'INCOME' && { color: Colors.income },
                            ]}
                            numberOfLines={1}
                          >
                            {cell}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            ) : (
              <ScrollView style={styles.contentScrollVertical} contentContainerStyle={{ padding: 16 }}>
                <Text style={styles.sectionHeader}>Spreadsheet Formulas & KPIs</Text>
                <View style={styles.kpiGrid}>
                  {sheetData.sheets.dashboardTab.kpis.map((kpi, idx) => (
                    <View key={idx} style={styles.kpiCard}>
                      <Text style={styles.kpiLabel}>{kpi.label}</Text>
                      <Text style={styles.kpiValue}>{kpi.evaluatedValue}</Text>
                      <Text style={styles.kpiFormula}>{kpi.formula}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Bottom Google Sheets Sync Buttons */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.syncBtn}
                onPress={handleExportGoogleSheets}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color={Colors.textInverse} />
                    <Text style={styles.syncBtnText}>
                      Sync & Push to Google Sheets
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.openExternalBtn}
                onPress={openGoogleSpreadsheet}
              >
                <Ionicons name="open-outline" size={16} color="#0F766E" />
                <Text style={styles.openExternalBtnText}>
                  Open in Google Sheets
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Universal Date Picker */}
        <DatePickerModal
          visible={datePickerTarget !== null}
          mode="date"
          title={datePickerTarget === 'START' ? 'Select Start Date' : 'Select End Date'}
          initialDate={datePickerTarget === 'START' ? customStartDate : customEndDate}
          onConfirm={(pickedDate) => {
            if (datePickerTarget === 'START') {
              setCustomStartDate(pickedDate);
            } else if (datePickerTarget === 'END') {
              setCustomEndDate(pickedDate);
            }
            setDatePreset('CUSTOM');
            setDatePickerTarget(null);
          }}
          onClose={() => setDatePickerTarget(null)}
        />
      </View>
    </Modal>
  );
};

function getColWidth(index: number) {
  switch (index) {
    case 0:
      return { width: 110 };
    case 1:
      return { width: 90 };
    case 2:
      return { width: 80 };
    case 3:
      return { width: 90 };
    case 4:
      return { width: 110 };
    case 5:
      return { width: 100 };
    case 6:
      return { width: 85 };
    case 7:
      return { width: 70 };
    case 8:
      return { width: 130 };
    case 9:
      return { width: 110 };
    case 10:
      return { width: 90 };
    case 11:
      return { width: 75 };
    case 12:
      return { width: 160 };
    default:
      return { width: 100 };
  }
}

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
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: 4,
  },
  titleCol: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  primaryTabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    gap: 6,
  },
  primaryTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  primaryTabBtnActive: {
    backgroundColor: '#059669',
  },
  primaryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  primaryTabTextActive: {
    color: '#FFFFFF',
  },
  exportScroll: {
    flex: 1,
    padding: 16,
  },
  filterSectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pillsScroll: {
    flexDirection: 'row',
  },
  ledgerPill: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ledgerPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ledgerPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  ledgerPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  datePickerBtnTexts: {
    flex: 1,
  },
  dateValText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dateSubValText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dateInputCol: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dateTextInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#15803D',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#BBF7D0',
  },
  actionButtonsContainer: {
    marginBottom: 16,
  },
  excelExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  excelExportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewSection: {
    marginBottom: 40,
  },
  previewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  noResultsBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noResultsText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
  txPreviewCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  txPreviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  txPreviewLeft: {
    flex: 1,
    marginRight: 10,
  },
  txDateText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  txCatTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  txSubText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  txPreviewRight: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  txTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
    marginTop: 4,
  },
  txTypeBadgeExp: {
    backgroundColor: '#FEE2E2',
  },
  txTypeBadgeInc: {
    backgroundColor: '#DCFCE7',
  },
  txTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthNavBtn: {
    padding: 6,
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  fileSlug: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  tabSwitchBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceVariant,
  },
  tabSwitchBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabSwitchText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabSwitchTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollVertical: {
    flex: 1,
  },
  sheetTable: {
    padding: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 11,
    color: Colors.textPrimary,
    paddingHorizontal: 6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 10,
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kpiLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginVertical: 2,
  },
  kpiFormula: {
    fontSize: 9,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  openExternalBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
});
