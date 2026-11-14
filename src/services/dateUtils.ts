import { FirstDayOfWeek } from '../types';

export interface CalendarDay {
  date: Date;
  dateString: string; // "YYYY-MM-DD"
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTransactions: boolean;
  transactionCount: number;
}

/**
 * Format a Date object to "YYYY-MM-DD" in local time
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format timestamp or ISO string to friendly display: "24 Oct 2026"
 */
export function formatFriendlyDate(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const todayStr = formatDateKey(new Date());
  const targetStr = formatDateKey(d);

  if (targetStr === todayStr) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (targetStr === formatDateKey(yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format timestamp or ISO string to friendly time: "02:45 PM"
 */
export function formatFriendlyTime(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generates calendar month matrix respecting first day of week.
 */
export function generateMonthCalendar(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  firstDayOfWeek: FirstDayOfWeek,
  selectedDateString: string,
  transactionDatesMap: Record<string, number> = {}
): CalendarDay[] {
  const todayStr = formatDateKey(new Date());
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for first day (0: Sunday, 1: Monday, ... 6: Saturday)
  let firstDayIndex = firstDayOfMonth.getDay();
  
  // Calculate offset relative to firstDayOfWeek
  // If firstDayOfWeek = 1 (Mon), and firstDayIndex = 0 (Sun) -> offset = 6
  let leadingDays = (firstDayIndex - firstDayOfWeek + 7) % 7;

  const days: CalendarDay[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = leadingDays - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = formatDateKey(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateString,
      hasTransactions: (transactionDatesMap[dateStr] || 0) > 0,
      transactionCount: transactionDatesMap[dateStr] || 0,
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i);
    const dateStr = formatDateKey(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateString,
      hasTransactions: (transactionDatesMap[dateStr] || 0) > 0,
      transactionCount: transactionDatesMap[dateStr] || 0,
    });
  }

  // Next month leading days to complete grid (multiples of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = formatDateKey(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateString,
      hasTransactions: (transactionDatesMap[dateStr] || 0) > 0,
      transactionCount: transactionDatesMap[dateStr] || 0,
    });
  }

  return days;
}

/**
 * Returns weekday column headers based on firstDayOfWeek.
 */
export function getWeekdayHeaders(firstDayOfWeek: FirstDayOfWeek): string[] {
  const allHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: string[] = [];
  for (let i = 0; i < 7; i++) {
    result.push(allHeaders[(firstDayOfWeek + i) % 7]);
  }
  return result;
}
