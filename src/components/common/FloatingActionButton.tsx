import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

interface FABProps {
  onPress?: () => void;
  iconName?: any;
}

export const FloatingActionButton: React.FC<FABProps> = ({
  onPress,
  iconName = 'add',
}) => {
  const { setIsTransactionModalOpen, setPrefilledTransaction } = useApp();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setPrefilledTransaction(null);
      setIsTransactionModalOpen(true);
    }
  };

  return (
    <View style={styles.fabWrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.fab, Shadows.medium]}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityLabel="Add Transaction"
      >
        <Ionicons name={iconName} size={28} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 999,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
