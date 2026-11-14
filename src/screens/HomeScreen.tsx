import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Header } from '../components/common/Header';
import { SummaryCard } from '../components/common/SummaryCard';
import { MonthlyBudgetCard } from '../components/home/MonthlyBudgetCard';
import { CalendarStrip } from '../components/home/CalendarStrip';
import { DayTransactionsList } from '../components/home/DayTransactionsList';
import { ExpenseCharts } from '../components/home/ExpenseCharts';
import { FloatingActionButton } from '../components/common/FloatingActionButton';

interface HomeScreenProps {
  onNavigateToHistory: (dateKey?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToHistory,
}) => {
  return (
    <View style={styles.container}>
      {/* Clean Global Header without cluttered 10+ ledger pills */}
      <Header title="Expense Manager" showBookSelector={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Summary Card */}
        <SummaryCard forceAllBooks={true} />

        {/* Monthly Budget Planning & Category Allocation Card */}
        <MonthlyBudgetCard />

        {/* Visual Category Spending Chart */}
        <ExpenseCharts forceAllBooks={true} />

        {/* Interactive Calendar Strip */}
        <CalendarStrip forceAllBooks={true} />

        {/* Selected Day's Transactions (Up to 5) */}
        <DayTransactionsList
          onNavigateToHistory={onNavigateToHistory}
          forceAllBooks={true}
        />
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
});
