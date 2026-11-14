export const Colors = {
  primary: '#2563EB', // Vibrant modern blue
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  secondary: '#64748B',
  accent: '#8B5CF6',
  
  // Backgrounds & Surfaces
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Financial status colors
  income: '#10B981', // Emerald green
  incomeLight: '#ECFDF5',
  expense: '#EF4444', // Red
  expenseLight: '#FEF2F2',
  transfer: '#3B82F6', // Blue
  transferLight: '#EFF6FF',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  
  // Badges & Accounts
  badgeCash: '#059669',
  badgeCard: '#7C3AED',
  badgeBank: '#2563EB',
  badgeUpi: '#D97706',
  badgeUncategorised: '#64748B',
};

export const Typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: Colors.textPrimary },
  h2: { fontSize: 20, fontWeight: '700' as const, color: Colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
  body: { fontSize: 14, fontWeight: '400' as const, color: Colors.textPrimary },
  bodyMuted: { fontSize: 13, fontWeight: '400' as const, color: Colors.textMuted },
  caption: { fontSize: 12, fontWeight: '500' as const, color: Colors.textSecondary },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
};
