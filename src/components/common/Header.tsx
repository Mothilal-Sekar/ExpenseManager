import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  showBookSelector?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'ExpenseManager',
  showBookSelector = true,
}) => {
  const {
    books,
    selectedBookId,
    setSelectedBookId,
    syncStatus,
    triggerManualSync,
    toggleOfflineSimulation,
    setIsSheetsModalOpen,
  } = useApp();

  const selectedBook = books.find((b) => b.id === selectedBookId);

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBookSelector ? (
          <View style={styles.bookSelectorRow}>
            <TouchableOpacity
              style={[
                styles.bookPill,
                selectedBookId === 'ALL' && styles.bookPillActive,
              ]}
              onPress={() => setSelectedBookId('ALL')}
            >
              <Text
                style={[
                  styles.bookPillText,
                  selectedBookId === 'ALL' && styles.bookPillTextActive,
                ]}
              >
                All Ledgers
              </Text>
            </TouchableOpacity>

            {books.map((b) => {
              const isActive = selectedBookId === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.bookPill,
                    isActive && { backgroundColor: b.color },
                  ]}
                  onPress={() => setSelectedBookId(b.id)}
                >
                  <Text
                    style={[
                      styles.bookPillText,
                      isActive && styles.bookPillTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.headerTitle}>{title}</Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {/* Google Sheets Monthly Export Trigger */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setIsSheetsModalOpen(true)}
          accessibilityLabel="Google Sheets Monthly Export"
        >
          <Ionicons name="document-text" size={20} color="#10B981" />
        </TouchableOpacity>

        {/* Sync Status & Offline Simulation Toggle */}
        <TouchableOpacity
          style={[
            styles.syncBadge,
            !syncStatus.isOnline
              ? styles.syncBadgeOffline
              : syncStatus.isSyncing
              ? styles.syncBadgeSyncing
              : styles.syncBadgeOnline,
          ]}
          onPress={() => {
            if (syncStatus.isOnline) {
              triggerManualSync();
            } else {
              toggleOfflineSimulation();
            }
          }}
          onLongPress={toggleOfflineSimulation}
        >
          <Ionicons
            name={
              !syncStatus.isOnline
                ? 'cloud-offline'
                : syncStatus.isSyncing
                ? 'sync'
                : 'cloud-done'
            }
            size={14}
            color={
              !syncStatus.isOnline
                ? '#EF4444'
                : syncStatus.isSyncing
                ? '#F59E0B'
                : '#10B981'
            }
          />
          <Text
            style={[
              styles.syncText,
              {
                color: !syncStatus.isOnline
                  ? '#EF4444'
                  : syncStatus.isSyncing
                  ? '#F59E0B'
                  : '#10B981',
              },
            ]}
          >
            {!syncStatus.isOnline
              ? `Offline (${syncStatus.pendingCount})`
              : syncStatus.isSyncing
              ? 'Syncing'
              : 'Synced'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bookSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bookPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: Colors.surfaceVariant,
  },
  bookPillActive: {
    backgroundColor: Colors.primary,
  },
  bookPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  bookPillTextActive: {
    color: Colors.textInverse,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  syncBadgeOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  syncBadgeSyncing: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  syncBadgeOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
