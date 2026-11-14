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
import {
  formatDateKey,
  formatFriendlyDate,
  generateMonthCalendar,
  getWeekdayHeaders,
} from '../../services/dateUtils';

interface CalendarStripProps {
  forceAllBooks?: boolean;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  forceAllBooks = false,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    transactions,
    selectedBookId,
    settings,
    setIsTransactionModalOpen,
    setPrefilledTransaction,
  } = useApp();

  const effectiveBookId = forceAllBooks ? 'ALL' : selectedBookId;

  const [currentViewDate, setCurrentViewDate] = useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
  const [pickerSelectedYear, setPickerSelectedYear] = useState<number>(
    () => currentViewDate.getFullYear()
  );

  // Map transaction dates to counts and types for color-coded indicators
  const transactionDatesMeta = useMemo(() => {
    const map: Record<string, { count: number; hasExpense: boolean; hasIncome: boolean }> = {};
    transactions.forEach((tx) => {
      if (effectiveBookId !== 'ALL' && tx.bookId !== effectiveBookId) return;
      const key = formatDateKey(new Date(tx.dateTime));
      if (!map[key]) {
        map[key] = { count: 0, hasExpense: false, hasIncome: false };
      }
      map[key].count += 1;
      if (tx.type === 'EXPENSE') map[key].hasExpense = true;
      if (tx.type === 'INCOME') map[key].hasIncome = true;
    });
    return map;
  }, [transactions, effectiveBookId]);

  const transactionDatesMap = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(transactionDatesMeta).forEach((k) => {
      counts[k] = transactionDatesMeta[k].count;
    });
    return counts;
  }, [transactionDatesMeta]);

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const calendarDays = useMemo(() => {
    return generateMonthCalendar(
      year,
      month,
      settings.firstDayOfWeek,
      selectedDate,
      transactionDatesMap
    );
  }, [year, month, settings.firstDayOfWeek, selectedDate, transactionDatesMap]);

  const weekdayHeaders = useMemo(() => {
    return getWeekdayHeaders(settings.firstDayOfWeek);
  }, [settings.firstDayOfWeek]);

  const monthName = currentViewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentViewDate(newDate);
    setSelectedDate(formatDateKey(newDate));
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentViewDate(newDate);
    setSelectedDate(formatDateKey(newDate));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentViewDate(today);
    setSelectedDate(formatDateKey(today));
  };

  const handleOpenMonthYearPicker = () => {
    setPickerSelectedYear(year);
    setIsMonthYearPickerOpen(true);
  };

  const handleSelectMonthYear = (selectedMonthIdx: number) => {
    const newDate = new Date(pickerSelectedYear, selectedMonthIdx, 1);
    setCurrentViewDate(newDate);
    setSelectedDate(formatDateKey(newDate));
    setIsMonthYearPickerOpen(false);
  };

  const handleStepPickerYear = (delta: number) => {
    const nextY = pickerSelectedYear + delta;
    if (nextY >= 1900 && nextY <= 2150) {
      setPickerSelectedYear(nextY);
    }
  };

  const handleQuickAddEntryForSelectedDate = () => {
    const dateToUse = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    setPrefilledTransaction({
      dateTime: dateToUse.toISOString(),
    });
    setIsTransactionModalOpen(true);
  };

  const selectedDateTxCount = transactionDatesMeta[selectedDate]?.count || 0;

  return (
    <View style={styles.container}>
      {/* PeFi-Style Month Header & Controls */}
      <View style={styles.headerRow}>
        <View style={styles.monthTitleContainer}>
          <TouchableOpacity
            style={styles.monthSelectorBtn}
            onPress={handleOpenMonthYearPicker}
            activeOpacity={0.7}
            accessibilityLabel="Switch Month and Year"
          >
            <Text style={styles.monthTitle}>{monthName}</Text>
            <Ionicons name="chevron-down" size={15} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.todayButton}
            onPress={handleJumpToToday}
            activeOpacity={0.7}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrevMonth}
            accessibilityLabel="Previous month"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={17} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNextMonth}
            accessibilityLabel="Next month"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={17} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday Labels (PeFi Minimalist uppercase) */}
      <View style={styles.weekdayRow}>
        {weekdayHeaders.map((dayLabel, index) => (
          <Text key={index} style={styles.weekdayText}>
            {dayLabel.slice(0, 3)}
          </Text>
        ))}
      </View>

      {/* Calendar Days Grid */}
      <View style={styles.daysGrid}>
        {calendarDays.map((item, index) => {
          const isSelected = item.dateString === selectedDate;
          const meta = transactionDatesMeta[item.dateString];

          // Indicator color (PeFi visual data cues)
          let dotColor = Colors.primary;
          if (meta) {
            if (meta.hasExpense && meta.hasIncome) dotColor = Colors.primary;
            else if (meta.hasExpense) dotColor = Colors.expense;
            else if (meta.hasIncome) dotColor = Colors.income;
          }
          if (isSelected) dotColor = Colors.textInverse;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                item.isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDate(item.dateString)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumber,
                  !item.isCurrentMonth && styles.dayNumberDimmed,
                  item.isToday && !isSelected && styles.dayNumberToday,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {item.dayNumber}
              </Text>

              {/* Indicator dot if transactions exist */}
              {item.hasTransactions ? (
                <View
                  style={[
                    styles.dotIndicator,
                    { backgroundColor: dotColor },
                  ]}
                />
              ) : (
                <View style={styles.dotPlaceholder} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* PeFi-Style Quick Add Entry on Selected Date Row */}
      {selectedDate && (
        <View style={styles.quickAddRow}>
          <View style={styles.selectedDateInfo}>
            <View style={styles.dateIconCircle}>
              <Ionicons name="calendar" size={14} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.selectedDateText}>
                {formatFriendlyDate(selectedDate)}
              </Text>
              <Text style={styles.selectedDateSub}>
                {selectedDateTxCount === 0
                  ? 'No entries recorded'
                  : `${selectedDateTxCount} ${selectedDateTxCount === 1 ? 'entry' : 'entries'}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.quickAddBtn}
            onPress={handleQuickAddEntryForSelectedDate}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.quickAddBtnText}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PeFi-Style Fast Month & Year Switcher Modal */}
      <Modal
        visible={isMonthYearPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsMonthYearPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.pickerHeaderRow}>
              <View>
                <Text style={styles.pickerTitle}>Jump to Month & Year</Text>
                <Text style={styles.pickerSubtitle}>Quickly navigate to any spending period</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMonthYearPickerOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Clean Year Stepper */}
            <View style={styles.yearStepperBar}>
              <TouchableOpacity
                style={styles.yearStepBtn}
                onPress={() => handleStepPickerYear(-1)}
              >
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
              </TouchableOpacity>

              <Text style={styles.yearDisplayText}>{pickerSelectedYear}</Text>

              <TouchableOpacity
                style={styles.yearStepBtn}
                onPress={() => handleStepPickerYear(1)}
              >
                <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Quick Year Jump Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickYearsRow}
            >
              {[1990, 2000, 2010, 2020, 2024, 2025, 2026, 2027, 2030, 2040, 2050].map((y) => {
                const isActive = pickerSelectedYear === y;
                return (
                  <TouchableOpacity
                    key={y}
                    style={[styles.quickYearChip, isActive && styles.quickYearChipActive]}
                    onPress={() => setPickerSelectedYear(y)}
                  >
                    <Text
                      style={[
                        styles.quickYearChipText,
                        isActive && styles.quickYearChipTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3x4 Months Grid */}
            <View style={styles.monthsGrid}>
              {MONTHS_SHORT.map((mName, idx) => {
                const isCurrentMonthActive =
                  pickerSelectedYear === year && month === idx;
                return (
                  <TouchableOpacity
                    key={mName}
                    style={[
                      styles.monthGridCell,
                      isCurrentMonthActive && styles.monthGridCellActive,
                    ]}
                    onPress={() => handleSelectMonthYear(idx)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.monthGridCellText,
                        isCurrentMonthActive && styles.monthGridCellTextActive,
                      ]}
                    >
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  todayButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayNumberDimmed: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  dayNumberToday: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dayNumberSelected: {
    color: Colors.textInverse,
    fontWeight: '800',
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  selectedDateSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  quickAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pickerSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 16,
  },
  yearStepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  yearStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearDisplayText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 70,
    textAlign: 'center',
  },
  quickYearsRow: {
    gap: 6,
    paddingVertical: 6,
    marginBottom: 12,
  },
  quickYearChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surfaceVariant,
  },
  quickYearChipActive: {
    backgroundColor: Colors.primary,
  },
  quickYearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickYearChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthGridCell: {
    width: '31%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthGridCellActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthGridCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  monthGridCellTextActive: {
    color: '#FFFFFF',
  },
});
