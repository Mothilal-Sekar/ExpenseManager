import React, { useMemo, useState, useEffect } from 'react';
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
import {
  formatDateKey,
  formatFriendlyDate,
  generateMonthCalendar,
  getWeekdayHeaders,
} from '../../services/dateUtils';
import { FirstDayOfWeek } from '../../types';

interface DatePickerModalProps {
  visible: boolean;
  mode?: 'date' | 'datetime';
  initialDate?: string | Date;
  title?: string;
  onConfirm: (dateString: string) => void;
  onClose: () => void;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUICK_YEARS = [1990, 2000, 2010, 2020, 2024, 2025, 2026, 2030, 2040, 2050];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  mode = 'date',
  initialDate,
  title = 'Select Date',
  onConfirm,
  onClose,
}) => {
  // Parse initial date safely
  const parsedInitial = useMemo(() => {
    if (!initialDate) return new Date();
    if (initialDate instanceof Date) return initialDate;
    if (typeof initialDate === 'string') {
      if (initialDate.includes('T')) return new Date(initialDate);
      return new Date(`${initialDate}T12:00:00`);
    }
    return new Date();
  }, [initialDate]);

  // View mode: 'CALENDAR' (days grid) or 'MONTH_YEAR' (fast jump)
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'MONTH_YEAR'>('CALENDAR');

  // Selected date components
  const [selectedYear, setSelectedYear] = useState<number>(() => parsedInitial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => parsedInitial.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(() => parsedInitial.getDate());

  // Time components for datetime mode
  const [hour12, setHour12] = useState<number>(() => {
    const h = parsedInitial.getHours();
    return h === 0 ? 12 : h > 12 ? h - 12 : h;
  });
  const [minute, setMinute] = useState<number>(() => {
    const m = parsedInitial.getMinutes();
    return Math.round(m / 5) * 5 % 60;
  });
  const [period, setPeriod] = useState<'AM' | 'PM'>(() =>
    parsedInitial.getHours() >= 12 ? 'PM' : 'AM'
  );

  // Synchronize state whenever modal opens
  useEffect(() => {
    if (visible) {
      const y = parsedInitial.getFullYear();
      const m = parsedInitial.getMonth();
      const d = parsedInitial.getDate();
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(d);
      setViewMode('CALENDAR');

      const h = parsedInitial.getHours();
      setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinute(Math.round(parsedInitial.getMinutes() / 5) * 5 % 60);
      setPeriod(h >= 12 ? 'PM' : 'AM');
    }
  }, [visible, parsedInitial]);

  // Selected date key in YYYY-MM-DD
  const selectedDateKey = useMemo(() => {
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const dStr = String(selectedDay).padStart(2, '0');
    return `${selectedYear}-${mStr}-${dStr}`;
  }, [selectedYear, selectedMonth, selectedDay]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    return generateMonthCalendar(
      selectedYear,
      selectedMonth,
      0 as FirstDayOfWeek,
      selectedDateKey,
      {}
    );
  }, [selectedYear, selectedMonth, selectedDateKey]);

  // Weekday column headers
  const weekdayHeaders = useMemo(() => {
    return getWeekdayHeaders(0 as FirstDayOfWeek);
  }, []);

  // Quick jump to Today
  const handleJumpToToday = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setViewMode('CALENDAR');

    if (mode === 'datetime') {
      const h = now.getHours();
      setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinute(Math.round(now.getMinutes() / 5) * 5 % 60);
      setPeriod(h >= 12 ? 'PM' : 'AM');
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Time stepper handlers
  const handleStepHour = (delta: number) => {
    let nextH = hour12 + delta;
    if (nextH > 12) nextH = 1;
    if (nextH < 1) nextH = 12;
    setHour12(nextH);
  };

  const handleStepMinute = (delta: number) => {
    let nextM = minute + delta;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    setMinute(nextM);
  };

  // Confirm selection
  const handleConfirm = () => {
    if (mode === 'datetime') {
      let finalHour = hour12 % 12;
      if (period === 'PM') finalHour += 12;
      const resultDate = new Date(
        selectedYear,
        selectedMonth,
        selectedDay,
        finalHour,
        minute,
        0
      );
      onConfirm(resultDate.toISOString());
    } else {
      onConfirm(selectedDateKey);
    }
    onClose();
  };

  const formattedPreview = useMemo(() => {
    return formatFriendlyDate(selectedDateKey);
  }, [selectedDateKey]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {formattedPreview}
                {mode === 'datetime'
                  ? ` • ${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`
                  : ''}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.todayPill}
                onPress={handleJumpToToday}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles-outline" size={12} color={Colors.primary} />
                <Text style={styles.todayPillText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Month & Year Navigation Bar */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.navArrow}
              onPress={handlePrevMonth}
              accessibilityLabel="Previous Month"
            >
              <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.monthYearBtn,
                viewMode === 'MONTH_YEAR' && styles.monthYearBtnActive,
              ]}
              onPress={() =>
                setViewMode(viewMode === 'CALENDAR' ? 'MONTH_YEAR' : 'CALENDAR')
              }
              activeOpacity={0.7}
            >
              <Text style={styles.monthYearText}>
                {MONTHS_FULL[selectedMonth]} {selectedYear}
              </Text>
              <Ionicons
                name={viewMode === 'MONTH_YEAR' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navArrow}
              onPress={handleNextMonth}
              accessibilityLabel="Next Month"
            >
              <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid OR Month/Year Selector */}
          {viewMode === 'CALENDAR' ? (
            <View style={styles.calendarSection}>
              {/* Weekday Row */}
              <View style={styles.weekdaysRow}>
                {weekdayHeaders.map((w, idx) => (
                  <Text key={idx} style={styles.weekdayText}>
                    {w.slice(0, 3)}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {calendarDays.map((item, idx) => {
                  const isSelected = item.dateString === selectedDateKey;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        item.isToday && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => {
                        setSelectedYear(item.date.getFullYear());
                        setSelectedMonth(item.date.getMonth());
                        setSelectedDay(item.date.getDate());
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !item.isCurrentMonth && styles.dayTextDimmed,
                          item.isToday && !isSelected && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {item.dayNumber}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Month & Year Selection View */
            <View style={styles.monthYearSection}>
              {/* Year Stepper */}
              <View style={styles.yearRow}>
                <TouchableOpacity
                  style={styles.yearStepBtn}
                  onPress={() => setSelectedYear((y) => y - 1)}
                >
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                </TouchableOpacity>

                <Text style={styles.yearText}>{selectedYear}</Text>

                <TouchableOpacity
                  style={styles.yearStepBtn}
                  onPress={() => setSelectedYear((y) => y + 1)}
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
                {QUICK_YEARS.map((y) => {
                  const isActive = selectedYear === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      style={[styles.yearChip, isActive && styles.yearChipActive]}
                      onPress={() => setSelectedYear(y)}
                    >
                      <Text
                        style={[
                          styles.yearChipText,
                          isActive && styles.yearChipTextActive,
                        ]}
                      >
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 3x4 Month Grid */}
              <View style={styles.monthsGrid}>
                {MONTHS_SHORT.map((mName, idx) => {
                  const isSelected = selectedMonth === idx;
                  return (
                    <TouchableOpacity
                      key={mName}
                      style={[
                        styles.monthCell,
                        isSelected && styles.monthCellSelected,
                      ]}
                      onPress={() => {
                        setSelectedMonth(idx);
                        setViewMode('CALENDAR');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.monthCellText,
                          isSelected && styles.monthCellTextSelected,
                        ]}
                      >
                        {mName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Time Picker (Simple Compact Inline Row) */}
          {mode === 'datetime' && (
            <View style={styles.timeRow}>
              <View style={styles.timeLabelWrap}>
                <Ionicons name="time-outline" size={16} color={Colors.primary} />
                <Text style={styles.timeLabel}>Time</Text>
              </View>

              <View style={styles.timeControlsWrap}>
                {/* Hour */}
                <View style={styles.stepperBox}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepHour(-1)}
                  >
                    <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperNum}>
                    {String(hour12).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepHour(1)}
                  >
                    <Ionicons name="add" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeColon}>:</Text>

                {/* Minute */}
                <View style={styles.stepperBox}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepMinute(-5)}
                  >
                    <Ionicons name="remove" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperNum}>
                    {String(minute).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleStepMinute(5)}
                  >
                    <Ionicons name="add" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* AM / PM Segmented */}
                <View style={styles.amPmBox}>
                  <TouchableOpacity
                    style={[
                      styles.amPmBtn,
                      period === 'AM' && styles.amPmBtnActive,
                    ]}
                    onPress={() => setPeriod('AM')}
                  >
                    <Text
                      style={[
                        styles.amPmText,
                        period === 'AM' && styles.amPmTextActive,
                      ]}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.amPmBtn,
                      period === 'PM' && styles.amPmBtnActive,
                    ]}
                    onPress={() => setPeriod('PM')}
                  >
                    <Text
                      style={[
                        styles.amPmText,
                        period === 'PM' && styles.amPmTextActive,
                      ]}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Confirm</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
  },
  navArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthYearBtnActive: {
    backgroundColor: Colors.cardBackground,
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  calendarSection: {
    marginTop: 2,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    width: 38,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 4,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayTextDimmed: {
    color: Colors.textMuted,
    opacity: 0.45,
  },
  dayTextToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthYearSection: {
    paddingVertical: 4,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  yearStepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  quickYearsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 10,
  },
  yearChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surfaceVariant,
  },
  yearChipActive: {
    backgroundColor: Colors.primary,
  },
  yearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  yearChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '31%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
  },
  monthCellSelected: {
    backgroundColor: Colors.primary,
  },
  monthCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  monthCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  timeLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  timeControlsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNum: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  amPmBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    padding: 2,
  },
  amPmBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amPmBtnActive: {
    backgroundColor: Colors.primary,
  },
  amPmText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  amPmTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
