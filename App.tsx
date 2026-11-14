import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Colors } from './src/constants/theme';
import { AppProvider } from './src/context/AppContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { BooksScreen } from './src/screens/BooksScreen';
import { DebtsScreen } from './src/screens/DebtsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TransactionEntryModal } from './src/components/transaction/TransactionEntryModal';
import { GoogleSheetsExportModal } from './src/components/sheets/GoogleSheetsExportModal';

type Tab = 'HOME' | 'HISTORY' | 'BOOKS' | 'DEBTS' | 'SETTINGS';

function MainApp() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [historyDateFilter, setHistoryDateFilter] = useState<string | undefined>(
    undefined
  );

  const handleNavigateToHistory = (dateKey?: string) => {
    setHistoryDateFilter(dateKey);
    setActiveTab('HISTORY');
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Screen Render */}
      <View style={styles.content}>
        {activeTab === 'HOME' && (
          <HomeScreen onNavigateToHistory={handleNavigateToHistory} />
        )}
        {activeTab === 'HISTORY' && (
          <HistoryScreen initialDateFilter={historyDateFilter} />
        )}
        {activeTab === 'BOOKS' && <BooksScreen />}
        {activeTab === 'DEBTS' && <DebtsScreen />}
        {activeTab === 'SETTINGS' && <SettingsScreen />}
      </View>

      {/* Global Modals accessible across all tabs */}
      <TransactionEntryModal />
      <GoogleSheetsExportModal />

      {/* Bottom Tabs Navigation with Safe Area padding */}
      <View
        style={[
          styles.bottomTabBar,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <TabButton
          title="Home"
          iconName={activeTab === 'HOME' ? 'home' : 'home-outline'}
          isActive={activeTab === 'HOME'}
          onPress={() => setActiveTab('HOME')}
        />

        <TabButton
          title="History"
          iconName={activeTab === 'HISTORY' ? 'receipt' : 'receipt-outline'}
          isActive={activeTab === 'HISTORY'}
          onPress={() => {
            setHistoryDateFilter(undefined);
            setActiveTab('HISTORY');
          }}
        />

        <TabButton
          title="Ledgers"
          iconName={activeTab === 'BOOKS' ? 'book' : 'book-outline'}
          isActive={activeTab === 'BOOKS'}
          onPress={() => setActiveTab('BOOKS')}
        />

        <TabButton
          title="Debts"
          iconName={activeTab === 'DEBTS' ? 'swap-horizontal' : 'swap-horizontal-outline'}
          isActive={activeTab === 'DEBTS'}
          onPress={() => setActiveTab('DEBTS')}
        />

        <TabButton
          title="Settings"
          iconName={activeTab === 'SETTINGS' ? 'settings' : 'settings-outline'}
          isActive={activeTab === 'SETTINGS'}
          onPress={() => setActiveTab('SETTINGS')}
        />
      </View>
    </View>
  );
}

const TabButton: React.FC<{
  title: string;
  iconName: any;
  isActive: boolean;
  onPress: () => void;
}> = ({ title, iconName, isActive, onPress }) => (
  <TouchableOpacity
    style={styles.tabItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={iconName}
      size={22}
      color={isActive ? Colors.primary : Colors.textMuted}
    />
    <Text
      style={[
        styles.tabLabel,
        { color: isActive ? Colors.primary : Colors.textMuted },
        isActive && styles.tabLabelActive,
      ]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
