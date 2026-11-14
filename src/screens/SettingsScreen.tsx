import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Header } from '../components/common/Header';
import { useApp } from '../context/AppContext';
import { formatFriendlyDate, formatFriendlyTime } from '../services/dateUtils';
import { Account, AccountCategory, Category, FirstDayOfWeek, Subcategory } from '../types';
import { CategoryManagementModal } from '../components/settings/CategoryManagementModal';
import { CategoryExpensesModal } from '../components/settings/CategoryExpensesModal';
import { CategoryDeleteGuardModal } from '../components/settings/CategoryDeleteGuardModal';

export const ACCOUNT_CATEGORIES: {
  value: AccountCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { value: 'SAVINGS', label: 'Savings', icon: 'business-outline', color: '#2563EB' },
  { value: 'SALARY', label: 'Salary', icon: 'cash-outline', color: '#059669' },
  { value: 'CURRENT', label: 'Current / Biz', icon: 'briefcase-outline', color: '#D97706' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: 'card-outline', color: '#7C3AED' },
  { value: 'DEBIT_CARD', label: 'Debit Card', icon: 'card', color: '#0284C7' },
  { value: 'WALLET', label: 'Cash Wallet', icon: 'wallet-outline', color: '#16A34A' },
  { value: 'INVESTMENT', label: 'Investment', icon: 'trending-up-outline', color: '#DC2626' },
];

export const getAccountCategoryMeta = (cat?: AccountCategory) => {
  return (
    ACCOUNT_CATEGORIES.find((c) => c.value === cat) || {
      value: 'SAVINGS' as AccountCategory,
      label: 'Savings',
      icon: 'business-outline' as keyof typeof Ionicons.glyphMap,
      color: '#2563EB',
    }
  );
};

const CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  // Food & Dining
  'restaurant',
  'fast-food',
  'cafe',
  'pizza',
  'beer',
  'wine',
  'nutrition',
  // Shopping & Personal Care
  'cart',
  'basket',
  'bag-handle',
  'pricetag',
  'shirt',
  'watch',
  'glasses',
  // Housing & Bills
  'home',
  'business',
  'receipt',
  'flash',
  'water',
  'wifi',
  'call',
  'tv',
  'construct',
  'key',
  // Transport & Travel
  'car',
  'bus',
  'train',
  'subway',
  'bicycle',
  'airplane',
  'boat',
  'map',
  // Health & Fitness
  'medkit',
  'fitness',
  'heart',
  'bandage',
  'pulse',
  // Entertainment & Fun
  'game-controller',
  'film',
  'musical-notes',
  'ticket',
  'color-palette',
  'camera',
  'headset',
  // Family, Pets & Education
  'people',
  'happy',
  'school',
  'book',
  'gift',
  'paw',
  'ribbon',
  // Money, Savings & Work
  'cash',
  'wallet',
  'card',
  'briefcase',
  'trending-up',
  'analytics',
  'shield-checkmark',
  'trophy',
  'diamond',
];

export const SettingsScreen: React.FC = () => {
  const {
    accounts,
    categories,
    transactions,
    settings,
    syncStatus,
    updateSettings,
    addAccount,
    editAccount,
    emptyAccountBalance,
    deleteAccount,
    addCategory,
    editCategory,
    deleteCategory,
    addSubcategory,
    editSubcategory,
    deleteSubcategory,
    toggleOfflineSimulation,
    triggerManualSync,
    setIsSheetsModalOpen,
    signInWithGoogle,
    signOutGoogle,
    connectQuickDemoGoogleAccount,
    openGoogleSpreadsheet,
  } = useApp();

  // Modals state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isEditSubcatModalOpen, setIsEditSubcatModalOpen] = useState(false);
  const [isGoogleConfigModalOpen, setIsGoogleConfigModalOpen] = useState(false);
  const [isSetupGuideModalOpen, setIsSetupGuideModalOpen] = useState(false);
  const [isFamilyConfigModalOpen, setIsFamilyConfigModalOpen] = useState(false);
  const [isSpouseGuideModalOpen, setIsSpouseGuideModalOpen] = useState(false);
  const [familySyncKeyInput, setFamilySyncKeyInput] = useState(
    settings.householdSyncId || 'family-shared-vault'
  );
  const [deviceNameInput, setDeviceNameInput] = useState(
    settings.deviceName || 'Primary Phone'
  );
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Viewing Category Expenses state
  const [settingsViewingCategory, setSettingsViewingCategory] = useState<Category | null>(null);
  const [isSettingsExpensesModalOpen, setIsSettingsExpensesModalOpen] = useState(false);

  // Settings Delete Guard State
  const [isSettingsDeleteGuardOpen, setIsSettingsDeleteGuardOpen] = useState(false);
  const [settingsDeleteGuardTarget, setSettingsDeleteGuardTarget] = useState<{
    type: 'CATEGORY' | 'SUBCATEGORY';
    category: Category | null;
    subcategory?: Subcategory | null;
  }>({
    type: 'CATEGORY',
    category: null,
    subcategory: null,
  });

  const categoryTxCounts = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + 1;
    });
    return map;
  }, [transactions]);

  const [selectedCatForSubcat, setSelectedCatForSubcat] = useState<string | null>(
    null
  );
  const [newSubcatName, setNewSubcatName] = useState('');

  // Add Account form
  const [accountName, setAccountName] = useState('');
  const [bankInstitution, setBankInstitution] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [accountInitialBalance, setAccountInitialBalance] = useState('');
  const [accountType, setAccountType] = useState<'BANK' | 'CARD'>('BANK');
  const [accountCategory, setAccountCategory] = useState<AccountCategory>('SAVINGS');

  // Edit Account form
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editBankInstitution, setEditBankInstitution] = useState('');
  const [editAccountNumberLast4, setEditAccountNumberLast4] = useState('');
  const [editAccountType, setEditAccountType] = useState<'BANK' | 'CARD'>('BANK');
  const [editAccountCategory, setEditAccountCategory] = useState<AccountCategory>('SAVINGS');

  // Add Category form
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [catColor, setCatColor] = useState('#2563EB');

  // Edit Category form
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<'EXPENSE' | 'INCOME' | 'BOTH'>('EXPENSE');
  const [editCatColor, setEditCatColor] = useState('#2563EB');
  const [editCatIcon, setEditCatIcon] = useState('pricetag');

  // Edit Subcategory form
  const [editingSubcatCategoryId, setEditingSubcatCategoryId] = useState<string | null>(null);
  const [editingSubcatId, setEditingSubcatId] = useState<string | null>(null);
  const [editSubcatName, setEditSubcatName] = useState('');

  // Google Config form
  const [customClientId, setCustomClientId] = useState(
    settings.googleClientId || ''
  );
  const [demoEmailInput, setDemoEmailInput] = useState(
    settings.googleEmail || 'finance.tracker@gmail.com'
  );

  // Active accounts
  const activeAccounts = accounts.filter((a) => !a.isDeleted);
  const cashWallet = activeAccounts.find((a) => a.type === 'CASH_WALLET');
  const otherAccounts = activeAccounts.filter((a) => a.type !== 'CASH_WALLET');

  const handleSaveAccount = () => {
    if (!bankInstitution.trim() && !accountName.trim()) {
      Alert.alert('Required', 'Please enter a bank or card name.');
      return;
    }
    const initialBal = parseFloat(accountInitialBalance) || 0;

    addAccount({
      name: accountName.trim() || bankInstitution.trim(),
      type: accountType,
      accountCategory: accountCategory,
      bankName: bankInstitution.trim() || undefined,
      accountNumberLast4: accountNumberLast4.trim() || undefined,
      currentBalance: initialBal,
    });

    setAccountName('');
    setBankInstitution('');
    setAccountNumberLast4('');
    setAccountInitialBalance('');
    setAccountCategory('SAVINGS');
    setIsAddAccountModalOpen(false);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setEditAccountName(acc.name || '');
    setEditBankInstitution(acc.bankName || '');
    setEditAccountNumberLast4(acc.accountNumberLast4 || '');
    setEditAccountType(acc.type === 'CARD' ? 'CARD' : 'BANK');
    setEditAccountCategory(
      acc.accountCategory || (acc.type === 'CARD' ? 'CREDIT_CARD' : 'SAVINGS')
    );
    setIsEditAccountModalOpen(true);
  };

  const handleSaveEditedAccount = () => {
    if (!editingAccount) return;
    if (!editBankInstitution.trim() && !editAccountName.trim()) {
      Alert.alert('Required', 'Please enter an account name or institution.');
      return;
    }

    editAccount({
      ...editingAccount,
      name: editAccountName.trim() || editBankInstitution.trim(),
      bankName: editBankInstitution.trim() || undefined,
      accountNumberLast4: editAccountNumberLast4.trim() || undefined,
      type: editAccountType,
      accountCategory: editAccountCategory,
    });

    setIsEditAccountModalOpen(false);
    setEditingAccount(null);
  };

  const handleEmptyBalance = (account: Account) => {
    Alert.alert(
      'Empty Account Balance',
      `Are you sure you want to empty the balance of ${account.bankName || account.name}? This will record an auditable balance adjustment entry and reset its balance to 0.00.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Balance',
          style: 'destructive',
          onPress: () => emptyAccountBalance(account.id),
        },
      ]
    );
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to delete ${account.bankName || account.name}? All past transactions will remain in your history under "Uncategorised bank" rather than being deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => deleteAccount(account.id),
        },
      ]
    );
  };

  const handleSaveCategory = () => {
    if (!catName.trim()) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }
    addCategory(catName.trim(), catType, 'pricetag', catColor);
    setCatName('');
    setIsAddCategoryModalOpen(false);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatColor(cat.color || '#2563EB');
    setEditCatIcon(cat.icon || 'pricetag');
    setIsEditCategoryModalOpen(true);
  };

  const handleSaveEditedCategory = () => {
    if (!editingCategory) return;
    if (!editCatName.trim()) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    editCategory({
      ...editingCategory,
      name: editCatName.trim(),
      type: editCatType,
      color: editCatColor,
      icon: editCatIcon,
    });

    setIsEditCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (cat: Category) => {
    const linkedTxs = transactions.filter(
      (t) => t.categoryId === cat.id || t.categoryId === cat.name
    );

    if (linkedTxs.length > 0) {
      setSettingsDeleteGuardTarget({
        type: 'CATEGORY',
        category: cat,
        subcategory: null,
      });
      setIsSettingsDeleteGuardOpen(true);
    } else {
      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete category "${cat.name}"? There are no transactions linked.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteCategory(cat.id),
          },
        ]
      );
    }
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (!newSubcatName.trim()) {
      Alert.alert('Required', 'Please enter a subcategory name.');
      return;
    }
    addSubcategory(categoryId, newSubcatName.trim());
    setNewSubcatName('');
    setSelectedCatForSubcat(null);
  };

  const handleOpenEditSubcategory = (categoryId: string, sub: Subcategory) => {
    setEditingSubcatCategoryId(categoryId);
    setEditingSubcatId(sub.id);
    setEditSubcatName(sub.name);
    setIsEditSubcatModalOpen(true);
  };

  const handleSaveEditedSubcategory = () => {
    if (!editingSubcatCategoryId || !editingSubcatId) return;
    if (!editSubcatName.trim()) {
      Alert.alert('Required', 'Please enter a subcategory name.');
      return;
    }

    editSubcategory(
      editingSubcatCategoryId,
      editingSubcatId,
      editSubcatName.trim()
    );
    setIsEditSubcatModalOpen(false);
    setEditingSubcatCategoryId(null);
    setEditingSubcatId(null);
    setEditSubcatName('');
  };

  const handleDeleteSubcategory = (categoryId: string, sub: Subcategory) => {
    const cat = categories.find((c) => c.id === categoryId);
    const linkedSubTxs = transactions.filter(
      (t) =>
        (t.categoryId === categoryId || (cat && t.categoryId === cat.name)) &&
        (t.subcategoryId === sub.id || t.subcategoryId === sub.name)
    );

    if (linkedSubTxs.length > 0 && cat) {
      setSettingsDeleteGuardTarget({
        type: 'SUBCATEGORY',
        category: cat,
        subcategory: sub,
      });
      setIsSettingsDeleteGuardOpen(true);
    } else {
      Alert.alert(
        'Delete Subcategory',
        `Are you sure you want to delete subcategory "${sub.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteSubcategory(categoryId, sub.id),
          },
        ]
      );
    }
  };

  const handleInteractiveGoogleSignIn = async () => {
    setIsSigningIn(true);
    const result = await signInWithGoogle(customClientId);
    setIsSigningIn(false);

    if (result.success) {
      Alert.alert(
        'Google Connected',
        'Your Google account is now authenticated with Google Drive, Sheets, and Firestore real-time synchronization.'
      );
    } else if (result.error && result.error !== 'Sign-in was cancelled by user') {
      Alert.alert(
        'Google OAuth Notice',
        `${result.error}\n\nTip: You can also use the "Quick Connect Demo Account" for instant testing without setting up a Google Cloud Console client ID.`
      );
    }
  };

  const handleShareSyncKeyWithSpouse = async () => {
    const key = settings.householdSyncId || 'family-shared-vault';
    try {
      await Share.share({
        title: 'Join our Expense Manager Family Ledger',
        message: `Hey! Install our Personal Finance & Expense Manager app and connect to our shared family vault:\n\n🔑 Household Sync Key: ${key}\n\nEnter this in Settings > Spouse & Family Sharing so our transactions sync in real-time across both our devices!`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleSaveFamilyConfig = () => {
    if (!familySyncKeyInput.trim()) {
      Alert.alert('Required', 'Please enter a Household Sync Key.');
      return;
    }
    updateSettings({
      householdSyncId: familySyncKeyInput.trim(),
      deviceName: deviceNameInput.trim() || 'My Phone',
    });
    setIsFamilyConfigModalOpen(false);
    Alert.alert(
      'Household Key Saved',
      `This device is now connected to sync room "${familySyncKeyInput.trim()}". Enter the exact same key on your spouse's phone to share expenses in real-time!`
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Settings & Accounts" showBookSelector={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Google Account & Realtime Cloud Sync */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={styles.sectionTitle}>Realtime Google Integration</Text>
            </View>
            <TouchableOpacity
              style={styles.sheetsPreviewBtn}
              onPress={() => setIsSheetsModalOpen(true)}
            >
              <Text style={styles.sheetsPreviewBtnText}>View Sheets</Text>
            </TouchableOpacity>
          </View>

          {/* Account Status Card */}
          {settings.googleConnected ? (
            <View style={styles.connectedCard}>
              <View style={styles.connectedTopRow}>
                <View style={styles.userAvatarBox}>
                  <Text style={styles.userAvatarText}>
                    {(settings.googleUserName || settings.googleEmail || 'G')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userNameText}>
                    {settings.googleUserName || 'Google Account'}
                  </Text>
                  <Text style={styles.userEmailText}>{settings.googleEmail}</Text>
                  <View style={styles.statusChipsRow}>
                    <View style={styles.liveChip}>
                      <View style={styles.greenDot} />
                      <Text style={styles.liveChipText}>Firestore Realtime</Text>
                    </View>
                    <View style={styles.liveChip}>
                      <View style={styles.greenDot} />
                      <Text style={styles.liveChipText}>Sheets Sync Active</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.connectedActionsRow}>
                <TouchableOpacity
                  style={styles.openDriveBtn}
                  onPress={openGoogleSpreadsheet}
                >
                  <Ionicons name="open-outline" size={14} color="#059669" />
                  <Text style={styles.openDriveBtnText}>
                    Open in Google Sheets
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disconnectBtn}
                  onPress={signOutGoogle}
                >
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.unconnectedBox}>
              <Text style={styles.unconnectedDesc}>
                Connect your Google account to automatically synchronize transactions
                in real time to Google Firestore and create monthly Google Sheets
                reports in Google Drive.
              </Text>

              <View style={styles.authButtonsRow}>
                <TouchableOpacity
                  style={styles.googleSignInBtn}
                  onPress={handleInteractiveGoogleSignIn}
                  disabled={isSigningIn}
                >
                  {isSigningIn ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={16} color="#FFFFFF" />
                      <Text style={styles.googleSignInBtnText}>
                        Sign in with Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickDemoBtn}
                  onPress={() => setIsGoogleConfigModalOpen(true)}
                >
                  <Ionicons name="flash-outline" size={14} color={Colors.primary} />
                  <Text style={styles.quickDemoBtnText}>Quick Connect / Config</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Offline Simulation Switch */}
          <View style={styles.settingItemRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingItemTitle}>Simulate Offline Mode</Text>
              <Text style={styles.settingItemSubtitle}>
                Test offline caching. Transactions queue locally and automatically
                flush to Firestore & Google Sheets when toggled back online.
              </Text>
            </View>
            <Switch
              value={settings.isOfflineSimulated}
              onValueChange={toggleOfflineSimulation}
              trackColor={{ false: '#CBD5E1', true: Colors.warning }}
            />
          </View>

          {/* Manual Sync Button */}
          <TouchableOpacity
            style={styles.manualSyncBtn}
            onPress={triggerManualSync}
            disabled={syncStatus.isSyncing}
          >
            <Ionicons
              name={syncStatus.isSyncing ? 'sync' : 'refresh'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.manualSyncBtnText}>
              {syncStatus.isSyncing
                ? 'Syncing with Firestore & Sheets...'
                : 'Manual Sync to Firestore & Sheets Now'}
            </Text>
          </TouchableOpacity>

          {settings.lastSyncedToSheets ? (
            <Text style={styles.lastSyncCaption}>
              Last synced: {formatFriendlyTime(settings.lastSyncedToSheets)}
            </Text>
          ) : null}

          {/* Expandable Live Sync Logs */}
          <TouchableOpacity
            style={styles.toggleLogsBtn}
            onPress={() => setShowLogs(!showLogs)}
          >
            <Text style={styles.toggleLogsText}>
              {showLogs ? 'Hide Live Sync Logs' : 'View Live Sync Activity Logs'}
            </Text>
            <Ionicons
              name={showLogs ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showLogs && (
            <View style={styles.logsContainer}>
              {syncStatus.syncLogs.map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <View
                    style={[
                      styles.logDot,
                      log.type === 'success'
                        ? styles.logDotSuccess
                        : log.type === 'error'
                        ? styles.logDotError
                        : styles.logDotInfo,
                    ]}
                  />
                  <Text style={styles.logTime}>
                    {formatFriendlyTime(log.timestamp)}
                  </Text>
                  <Text style={styles.logMessage} numberOfLines={2}>
                    {log.message}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SECTION: Spouse & Multi-Device Shared Sync */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="people" size={18} color="#EC4899" />
              <Text style={styles.sectionTitle}>Spouse & Family Sharing</Text>
            </View>
            <View style={styles.sharingLiveBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.sharingLiveBadgeText}>2-Way Live Sync</Text>
            </View>
          </View>
          <Text style={styles.sectionHelpText}>
            Share real-time expenses with your spouse across two or more phones. Changes made on either phone update instantly!
          </Text>

          <View style={styles.householdKeyCard}>
            <View style={styles.householdKeyTop}>
              <View style={styles.householdIconBox}>
                <Ionicons name="home" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.householdKeyLabel}>Household Sync Key (Family ID):</Text>
                <Text style={styles.householdKeyValue}>
                  {settings.householdSyncId || 'Not Configured'}
                </Text>
                <Text style={styles.deviceNickText}>
                  This Device: <Text style={{ fontWeight: '700' }}>{settings.deviceName || 'Primary Phone'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.householdActionsRow}>
              <TouchableOpacity
                style={styles.shareCodeBtn}
                onPress={handleShareSyncKeyWithSpouse}
              >
                <Ionicons name="share-social-outline" size={15} color="#FFFFFF" />
                <Text style={styles.shareCodeBtnText}>Share Key to Spouse</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.configKeyBtn}
                onPress={() => {
                  setFamilySyncKeyInput(settings.householdSyncId || 'family-shared-vault');
                  setDeviceNameInput(settings.deviceName || 'Primary Phone');
                  setIsFamilyConfigModalOpen(true);
                }}
              >
                <Ionicons name="settings-outline" size={14} color={Colors.primary} />
                <Text style={styles.configKeyBtnText}>Change Key</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Guide Trigger */}
          <TouchableOpacity
            style={styles.spouseGuideBtn}
            onPress={() => setIsSpouseGuideModalOpen(true)}
          >
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.spouseGuideBtnText}>How Multi-Device Spouse Sync Works</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: Calendar Preferences (First Day of Week) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>First Day of the Week</Text>
          </View>
          <Text style={styles.sectionHelpText}>
            Configures the weekly start day in your Home calendar grid.
          </Text>

          <View style={styles.daySelectorRow}>
            {[
              { label: 'Sunday', value: 0 as FirstDayOfWeek },
              { label: 'Monday', value: 1 as FirstDayOfWeek },
              { label: 'Saturday', value: 6 as FirstDayOfWeek },
            ].map((d) => {
              const isSelected = settings.firstDayOfWeek === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[
                    styles.dayOptionBtn,
                    isSelected && styles.dayOptionBtnSelected,
                  ]}
                  onPress={() => updateSettings({ firstDayOfWeek: d.value })}
                >
                  <Text
                    style={[
                      styles.dayOptionText,
                      isSelected && styles.dayOptionTextSelected,
                    ]}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: Bank Accounts & Wallets */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Accounts & Balances</Text>
            </View>
            <TouchableOpacity
              style={styles.addSmallBtn}
              onPress={() => setIsAddAccountModalOpen(true)}
            >
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addSmallBtnText}>Add Account</Text>
            </TouchableOpacity>
          </View>

          {/* Cash Wallet */}
          {cashWallet && (
            <View style={[styles.accountCard, styles.cashWalletCard]}>
              <View style={styles.accountCardLeft}>
                <View style={styles.cashIconWrap}>
                  <Ionicons name="cash" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleWithBadgeRow}>
                    <Text style={styles.accountCardTitle}>Cash Wallet</Text>
                    <View style={[styles.catBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="wallet-outline" size={10} color="#16A34A" style={{ marginRight: 3 }} />
                      <Text style={[styles.catBadgeText, { color: '#16A34A' }]}>Wallet</Text>
                    </View>
                  </View>
                  <Text style={styles.accountCardSub}>Physical Cash In Hand</Text>
                </View>
              </View>

              <View style={styles.accountCardRight}>
                <Text style={styles.accountBalanceText}>
                  {settings.currencySymbol}
                  {cashWallet.currentBalance.toLocaleString()}
                </Text>
                <View style={styles.accountActionsRow}>
                  <TouchableOpacity
                    style={styles.editAccBtn}
                    onPress={() => handleOpenEditAccount(cashWallet)}
                  >
                    <Ionicons name="pencil" size={11} color={Colors.primary} />
                    <Text style={styles.editAccText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emptyBalBtn}
                    onPress={() => handleEmptyBalance(cashWallet)}
                  >
                    <Text style={styles.emptyBalText}>Empty</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Other Bank Accounts & Cards */}
          {otherAccounts.map((acc) => {
            const catMeta = getAccountCategoryMeta(acc.accountCategory);
            return (
              <View key={acc.id} style={styles.accountCard}>
                <View style={styles.accountCardLeft}>
                  <View style={styles.bankIconWrap}>
                    <Ionicons
                      name={acc.type === 'CARD' ? 'card' : 'business'}
                      size={18}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleWithBadgeRow}>
                      <Text style={styles.accountCardTitle}>
                        {acc.bankName || acc.name}
                      </Text>
                      {acc.accountCategory && (
                        <View
                          style={[
                            styles.catBadge,
                            { backgroundColor: `${catMeta.color}18` },
                          ]}
                        >
                          <Ionicons
                            name={catMeta.icon}
                            size={10}
                            color={catMeta.color}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={[styles.catBadgeText, { color: catMeta.color }]}>
                            {catMeta.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.accountCardSub}>
                      {acc.type === 'CARD' ? 'Card' : 'Bank Account'}{' '}
                      {acc.accountNumberLast4
                        ? `(..${acc.accountNumberLast4})`
                        : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountCardRight}>
                  <Text style={styles.accountBalanceText}>
                    {settings.currencySymbol}
                    {acc.currentBalance.toLocaleString()}
                  </Text>
                  <View style={styles.accountActionsRow}>
                    <TouchableOpacity
                      style={styles.editAccBtn}
                      onPress={() => handleOpenEditAccount(acc)}
                    >
                      <Ionicons name="pencil" size={11} color={Colors.primary} />
                      <Text style={styles.editAccText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.emptyBalBtn}
                      onPress={() => handleEmptyBalance(acc)}
                    >
                      <Text style={styles.emptyBalText}>Empty</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteAccBtn}
                      onPress={() => handleDeleteAccount(acc)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
                        color={Colors.expense}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* SECTION 4: Categories & Subcategories Customization (Separate Dedicated Manager) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="grid-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Categories & Subcategories</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{categories.length} Categories</Text>
            </View>
          </View>
          <Text style={styles.sectionHelpText}>
            Customize expense & income categories, icons, colors, and all subcategories in a dedicated manager.
          </Text>

          <TouchableOpacity
            style={styles.manageCategoriesCardBtn}
            onPress={() => setIsCategoryManagerOpen(true)}
          >
            <View style={styles.manageCatLeft}>
              <View style={styles.manageCatIconCircle}>
                <Ionicons name="color-palette-outline" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.manageCatTitle}>Open Category & Subcategory Manager</Text>
                <Text style={styles.manageCatSubtitle}>
                  Edit or delete categories, customize badges & colors, and organize subcategories
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Quick Category Expenses List (Tap to view expenses) */}
          <View style={styles.quickCatSection}>
            <Text style={styles.quickCatHeader}>Category Expenses (Tap to view):</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCatChipsRow}
            >
              {categories.map((c) => {
                const count = categoryTxCounts[c.id] || 0;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.quickCatChip}
                    onPress={() => {
                      setSettingsViewingCategory(c);
                      setIsSettingsExpensesModalOpen(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.quickCatIconCircle, { backgroundColor: `${c.color}20` }]}>
                      <Ionicons
                        name={(c.icon as keyof typeof Ionicons.glyphMap) || 'pricetag'}
                        size={14}
                        color={c.color}
                      />
                    </View>
                    <Text style={styles.quickCatName}>{c.name}</Text>
                    <View style={styles.quickCatCountBadge}>
                      <Text style={styles.quickCatCountText}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* SECTION 5: App Configuration & Deployment Guide */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>App Setup & Configuration Guide</Text>
            </View>
            <TouchableOpacity
              style={styles.guideBadgeBtn}
              onPress={() => setIsSetupGuideModalOpen(true)}
            >
              <Text style={styles.guideBadgeBtnText}>Read Full Guide</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.guideSummaryText}>
            Follow these steps to configure actual Google OAuth credentials,
            connect your live Firebase Firestore database, and run on Android/iOS.
          </Text>

          <View style={styles.quickStepsContainer}>
            <View style={styles.quickStepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickStepTitle}>Google Cloud OAuth</Text>
                <Text style={styles.quickStepDesc}>
                  Enable Sheets & Drive APIs in Google Cloud Console. Add OAuth Client ID.
                </Text>
              </View>
            </View>

            <View style={styles.quickStepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickStepTitle}>Firebase Firestore</Text>
                <Text style={styles.quickStepDesc}>
                  Create project in console.firebase.google.com and enable Firestore rules.
                </Text>
              </View>
            </View>

            <View style={styles.quickStepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickStepTitle}>Run on Device (Expo Go / EAS)</Text>
                <Text style={styles.quickStepDesc}>
                  Scan QR with Expo Go app or build native APK using EAS CLI.
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.openGuideModalBtn}
            onPress={() => setIsSetupGuideModalOpen(true)}
          >
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text style={styles.openGuideModalBtnText}>
              View Complete Step-by-Step Instructions
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal: Google OAuth / Quick Connect Config */}
      <Modal
        visible={isGoogleConfigModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsGoogleConfigModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Google Account & Cloud Setup</Text>
            <Text style={styles.dialogSubtitle}>
              Configure realtime synchronization with Google Drive, Sheets, and
              Firestore.
            </Text>

            {/* Quick Connect Demo */}
            <View style={styles.quickConnectBox}>
              <Text style={styles.quickConnectTitle}>Instant 1-Tap Connect</Text>
              <Text style={styles.quickConnectDesc}>
                Connect immediately with an active Google profile without waiting
                for GCP Console verification.
              </Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="Google Email (e.g. user.finance@gmail.com)"
                placeholderTextColor={Colors.textMuted}
                value={demoEmailInput}
                onChangeText={setDemoEmailInput}
              />
              <TouchableOpacity
                style={styles.quickConnectActionButton}
                onPress={() => {
                  connectQuickDemoGoogleAccount(demoEmailInput);
                  setIsGoogleConfigModalOpen(false);
                }}
              >
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.quickConnectActionButtonText}>
                  Connect Demo Account Now
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom OAuth Client ID */}
            <Text style={[styles.colorLabel, { marginTop: 14 }]}>
              Custom Google OAuth Client ID (Optional):
            </Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="e.g. 123456...apps.googleusercontent.com"
              placeholderTextColor={Colors.textMuted}
              value={customClientId}
              onChangeText={setCustomClientId}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsGoogleConfigModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={() => {
                  updateSettings({ googleClientId: customClientId.trim() });
                  setIsGoogleConfigModalOpen(false);
                }}
              >
                <Text style={styles.dialogConfirmText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Bank Account */}
      <Modal
        visible={isAddAccountModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddAccountModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Add Bank / Card Account</Text>

            <View style={styles.accTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  accountType === 'BANK' && styles.accTypeBtnActive,
                ]}
                onPress={() => {
                  setAccountType('BANK');
                  if (accountCategory === 'CREDIT_CARD') {
                    setAccountCategory('SAVINGS');
                  }
                }}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    accountType === 'BANK' && styles.accTypeTextActive,
                  ]}
                >
                  Bank Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  accountType === 'CARD' && styles.accTypeBtnActive,
                ]}
                onPress={() => {
                  setAccountType('CARD');
                  setAccountCategory('CREDIT_CARD');
                }}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    accountType === 'CARD' && styles.accTypeTextActive,
                  ]}
                >
                  Card
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.dialogInput}
              placeholder="Bank / Card Name (e.g. Axis Bank, Amex)"
              placeholderTextColor={Colors.textMuted}
              value={bankInstitution}
              onChangeText={setBankInstitution}
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Account Nickname (e.g. Salary Account)"
              placeholderTextColor={Colors.textMuted}
              value={accountName}
              onChangeText={setAccountName}
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Last 4 Digits (e.g. 5621)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              value={accountNumberLast4}
              onChangeText={setAccountNumberLast4}
            />

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Initial Balance (e.g. 25000)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={accountInitialBalance}
              onChangeText={setAccountInitialBalance}
            />

            <Text style={styles.inputSectionLabel}>Account / Bank Category:</Text>
            <View style={styles.catPickerGrid}>
              {ACCOUNT_CATEGORIES.map((cat) => {
                const isSelected = accountCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.catPickerChip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => setAccountCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={12}
                      color={isSelected ? '#FFFFFF' : cat.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.catPickerChipText,
                        isSelected && styles.catPickerChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsAddAccountModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveAccount}
              >
                <Text style={styles.dialogConfirmText}>Save Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Bank Account & Category */}
      <Modal
        visible={isEditAccountModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsEditAccountModalOpen(false);
          setEditingAccount(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Account & Category</Text>
            <Text style={styles.dialogSubtitle}>
              Update institution details, nickname, or switch the bank category.
            </Text>

            {editingAccount?.type !== 'CASH_WALLET' && (
              <View style={styles.accTypeToggle}>
                <TouchableOpacity
                  style={[
                    styles.accTypeBtn,
                    editAccountType === 'BANK' && styles.accTypeBtnActive,
                  ]}
                  onPress={() => {
                    setEditAccountType('BANK');
                    if (editAccountCategory === 'CREDIT_CARD') {
                      setEditAccountCategory('SAVINGS');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.accTypeText,
                      editAccountType === 'BANK' && styles.accTypeTextActive,
                    ]}
                  >
                    Bank Account
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.accTypeBtn,
                    editAccountType === 'CARD' && styles.accTypeBtnActive,
                  ]}
                  onPress={() => {
                    setEditAccountType('CARD');
                    setEditAccountCategory('CREDIT_CARD');
                  }}
                >
                  <Text
                    style={[
                      styles.accTypeText,
                      editAccountType === 'CARD' && styles.accTypeTextActive,
                    ]}
                  >
                    Card
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {editingAccount?.type !== 'CASH_WALLET' && (
              <TextInput
                style={styles.dialogInput}
                placeholder="Bank / Card Name (e.g. Axis Bank, Amex)"
                placeholderTextColor={Colors.textMuted}
                value={editBankInstitution}
                onChangeText={setEditBankInstitution}
              />
            )}

            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              placeholder="Account Nickname (e.g. Salary Account)"
              placeholderTextColor={Colors.textMuted}
              value={editAccountName}
              onChangeText={setEditAccountName}
            />

            {editingAccount?.type !== 'CASH_WALLET' && (
              <TextInput
                style={[styles.dialogInput, { marginTop: 10 }]}
                placeholder="Last 4 Digits (e.g. 5621)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                value={editAccountNumberLast4}
                onChangeText={setEditAccountNumberLast4}
              />
            )}

            <Text style={styles.inputSectionLabel}>Change Bank Category:</Text>
            <View style={styles.catPickerGrid}>
              {ACCOUNT_CATEGORIES.map((cat) => {
                const isSelected = editAccountCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.catPickerChip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => setEditAccountCategory(cat.value)}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={12}
                      color={isSelected ? '#FFFFFF' : cat.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.catPickerChipText,
                        isSelected && styles.catPickerChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => {
                  setIsEditAccountModalOpen(false);
                  setEditingAccount(null);
                }}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveEditedAccount}
              >
                <Text style={styles.dialogConfirmText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Add Category */}
      <Modal
        visible={isAddCategoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddCategoryModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Add New Category</Text>

            <View style={styles.accTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  catType === 'EXPENSE' && styles.accTypeBtnActiveExpense,
                ]}
                onPress={() => setCatType('EXPENSE')}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    catType === 'EXPENSE' && styles.accTypeTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  catType === 'INCOME' && styles.accTypeBtnActiveIncome,
                ]}
                onPress={() => setCatType('INCOME')}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    catType === 'INCOME' && styles.accTypeTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.dialogInput}
              placeholder="Category Name (e.g. Pets, Education)"
              placeholderTextColor={Colors.textMuted}
              value={catName}
              onChangeText={setCatName}
            />

            <Text style={styles.colorLabel}>Badge Color:</Text>
            <View style={styles.colorsRow}>
              {['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'].map(
                (c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      catColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setCatColor(c)}
                  />
                )
              )}
            </View>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsAddCategoryModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveCategory}
              >
                <Text style={styles.dialogConfirmText}>Save Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Category */}
      <Modal
        visible={isEditCategoryModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsEditCategoryModalOpen(false);
          setEditingCategory(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Category</Text>
            <Text style={styles.dialogSubtitle}>
              Update category name, entry type, icon, or color badge.
            </Text>

            <View style={styles.accTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  editCatType === 'EXPENSE' && styles.accTypeBtnActiveExpense,
                ]}
                onPress={() => setEditCatType('EXPENSE')}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    editCatType === 'EXPENSE' && styles.accTypeTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  editCatType === 'INCOME' && styles.accTypeBtnActiveIncome,
                ]}
                onPress={() => setEditCatType('INCOME')}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    editCatType === 'INCOME' && styles.accTypeTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.accTypeBtn,
                  editCatType === 'BOTH' && styles.accTypeBtnActive,
                ]}
                onPress={() => setEditCatType('BOTH')}
              >
                <Text
                  style={[
                    styles.accTypeText,
                    editCatType === 'BOTH' && styles.accTypeTextActive,
                  ]}
                >
                  Both
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.dialogInput}
              placeholder="Category Name"
              placeholderTextColor={Colors.textMuted}
              value={editCatName}
              onChangeText={setEditCatName}
            />

            <Text style={styles.colorLabel}>Badge Color:</Text>
            <View style={styles.colorsRow}>
              {['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'].map(
                (c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      editCatColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setEditCatColor(c)}
                  />
                )
              )}
            </View>

            <Text style={styles.colorLabel}>Category Icon:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScrollRow}>
              {CATEGORY_ICONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconOptionBtn,
                    editCatIcon === iconName && styles.iconOptionBtnActive,
                  ]}
                  onPress={() => setEditCatIcon(iconName)}
                >
                  <Ionicons
                    name={iconName}
                    size={18}
                    color={editCatIcon === iconName ? Colors.primary : Colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => {
                  setIsEditCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveEditedCategory}
              >
                <Text style={styles.dialogConfirmText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit Subcategory */}
      <Modal
        visible={isEditSubcatModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setIsEditSubcatModalOpen(false);
          setEditingSubcatCategoryId(null);
          setEditingSubcatId(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Edit Subcategory</Text>
            <Text style={styles.dialogSubtitle}>
              Rename this subcategory tag.
            </Text>

            <TextInput
              style={styles.dialogInput}
              placeholder="Subcategory Name"
              placeholderTextColor={Colors.textMuted}
              value={editSubcatName}
              onChangeText={setEditSubcatName}
              autoFocus
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => {
                  setIsEditSubcatModalOpen(false);
                  setEditingSubcatCategoryId(null);
                  setEditingSubcatId(null);
                }}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveEditedSubcategory}
              >
                <Text style={styles.dialogConfirmText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Production Setup Guide */}
      <Modal
        visible={isSetupGuideModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSetupGuideModalOpen(false)}
      >
        <View style={styles.modalBackdropFull}>
          <View style={styles.guideModalHeader}>
            <View>
              <Text style={styles.guideModalTitle}>App Configuration Guide</Text>
              <Text style={styles.guideModalSubtitle}>
                How to set up Google Cloud, Firestore, and run on physical devices
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeGuideBtn}
              onPress={() => setIsSetupGuideModalOpen(false)}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.guideScrollContent} showsVerticalScrollIndicator={false}>
            {/* Step 1 */}
            <View style={styles.guideSection}>
              <View style={styles.guideStepHeader}>
                <View style={styles.stepCircle}><Text style={styles.stepCircleText}>1</Text></View>
                <Text style={styles.guideStepHeading}>Google Cloud & Google Sheets API</Text>
              </View>
              <Text style={styles.guideStepParagraph}>
                To automatically create monthly spreadsheets in Google Drive:
              </Text>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Go to <Text style={styles.boldText}>console.cloud.google.com</Text> and create a new project (e.g. "Personal Expense Manager").
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Navigate to <Text style={styles.boldText}>APIs & Services {'>'} Library</Text> and enable both:
                  {"\n"}- <Text style={styles.boldText}>Google Sheets API</Text>
                  {"\n"}- <Text style={styles.boldText}>Google Drive API</Text>
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Go to <Text style={styles.boldText}>OAuth Consent Screen</Text>, select "External", and add the scopes:
                  {"\n"}- <Text style={styles.monoText}>.../auth/spreadsheets</Text>
                  {"\n"}- <Text style={styles.monoText}>.../auth/drive.file</Text>
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Go to <Text style={styles.boldText}>Credentials {'>'} Create Credentials {'>'} OAuth Client ID</Text>. Choose "Web application" (and "Android/iOS" if generating native builds). Add redirect URI: <Text style={styles.monoText}>expensemanager://</Text>
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.guideSection}>
              <View style={styles.guideStepHeader}>
                <View style={styles.stepCircle}><Text style={styles.stepCircleText}>2</Text></View>
                <Text style={styles.guideStepHeading}>Google Firebase Firestore (Realtime)</Text>
              </View>
              <Text style={styles.guideStepParagraph}>
                For real-time multi-device cloud synchronization:
              </Text>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Open <Text style={styles.boldText}>console.firebase.google.com</Text> and select/create your Firebase project.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Click <Text style={styles.boldText}>Build {'>'} Firestore Database</Text> and create a database in Production mode.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Under <Text style={styles.boldText}>Rules</Text>, configure authentication security:
                  {"\n"}<Text style={styles.monoText}>allow read, write: if request.auth != null;</Text>
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.guideSection}>
              <View style={styles.guideStepHeader}>
                <View style={styles.stepCircle}><Text style={styles.stepCircleText}>3</Text></View>
                <Text style={styles.guideStepHeading}>Testing & Running on Physical Device</Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Expo Go (Quickest):</Text> Install the Expo Go app from the App Store or Google Play Store. Run <Text style={styles.monoText}>npx expo start</Text> in the terminal and scan the QR code.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Web Browser:</Text> Press <Text style={styles.monoText}>w</Text> in terminal or run <Text style={styles.monoText}>npx expo start --web</Text>.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Native APK Build (EAS):</Text> Run <Text style={styles.monoText}>npx eas build -p android --profile preview</Text> to get a standalone installable APK link!
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* Modal: Family & Spouse Sync Configuration */}
      <Modal
        visible={isFamilyConfigModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFamilyConfigModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Household & Spouse Sync</Text>
            <Text style={styles.dialogSubtitle}>
              Both phones must use the exact same Household Sync Key to share transactions in real time.
            </Text>

            <Text style={styles.inputSectionLabel}>Household Sync Key (Family ID):</Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="e.g. sharma-family-2026"
              placeholderTextColor={Colors.textMuted}
              value={familySyncKeyInput}
              onChangeText={setFamilySyncKeyInput}
              autoCapitalize="none"
            />

            <Text style={[styles.inputSectionLabel, { marginTop: 12 }]}>
              This Device Nickname:
            </Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="e.g. Shalini's Phone, Husband's Phone"
              placeholderTextColor={Colors.textMuted}
              value={deviceNameInput}
              onChangeText={setDeviceNameInput}
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsFamilyConfigModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveFamilyConfig}
              >
                <Text style={styles.dialogConfirmText}>Save & Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Spouse Multi-Device Guide */}
      <Modal
        visible={isSpouseGuideModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSpouseGuideModalOpen(false)}
      >
        <View style={styles.modalBackdropFull}>
          <View style={styles.guideModalHeader}>
            <View>
              <Text style={styles.guideModalTitle}>Spouse & Multi-Device Setup</Text>
              <Text style={styles.guideModalSubtitle}>
                How to share expenses seamlessly on two or more devices
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeGuideBtn}
              onPress={() => setIsSpouseGuideModalOpen(false)}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.guideScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.guideSection}>
              <View style={styles.guideStepHeader}>
                <View style={styles.stepCircle}><Text style={styles.stepCircleText}>1</Text></View>
                <Text style={styles.guideStepHeading}>Install App on Spouse's Phone</Text>
              </View>
              <Text style={styles.guideStepParagraph}>
                Open the app on your spouse's phone via Expo Go (scan QR code) or by installing the standalone APK.
              </Text>
            </View>

            <View style={styles.guideSection}>
              <View style={styles.guideStepHeader}>
                <View style={styles.stepCircle}><Text style={styles.stepCircleText}>2</Text></View>
                <Text style={styles.guideStepHeading}>Connect to Household Key</Text>
              </View>
              <Text style={styles.guideStepParagraph}>
                Go to <Text style={styles.boldText}>Settings {'>'} Spouse & Family Sharing</Text> on both phones. Enter the exact same Household Sync Key:
              </Text>
              <View style={styles.codeSnippetBox}>
                <Text style={styles.codeSnippetText}>{settings.householdSyncId || 'family-shared-vault'}</Text>
              </View>
            </View>

            <View style={styles.guideSection}>
              <View style={styles.guideStepHeader}>
                <View style={styles.stepCircle}><Text style={styles.stepCircleText}>3</Text></View>
                <Text style={styles.guideStepHeading}>Live 2-Way Synchronization</Text>
              </View>
              <Text style={styles.guideStepParagraph}>
                Whenever you or your spouse record an expense, income, or debt payment:
              </Text>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  The entry immediately syncs via Google Firestore and appears on the other phone in 1-2 seconds.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Use the <Text style={styles.boldText}>Household & Family</Text> ledger book for shared groceries, home bills, and vacation costs.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  Both of you can have your own individual Cash Wallets ("His Cash", "Her Cash") or joint bank accounts.
                </Text>
              </View>
              <View style={styles.stepBulletItem}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.bulletText}>
                  If either person is offline without mobile network, entries are saved locally and auto-merge as soon as network returns.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Dedicated Separate Category & Subcategory Manager Modal */}
      <CategoryManagementModal
        visible={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
      />

      {/* Category Expenses Modal */}
      <CategoryExpensesModal
        visible={isSettingsExpensesModalOpen}
        category={settingsViewingCategory}
        onClose={() => {
          setIsSettingsExpensesModalOpen(false);
          setSettingsViewingCategory(null);
        }}
      />

      {/* Category Delete Guard Modal */}
      <CategoryDeleteGuardModal
        visible={isSettingsDeleteGuardOpen}
        targetType={settingsDeleteGuardTarget.type}
        category={settingsDeleteGuardTarget.category}
        subcategory={settingsDeleteGuardTarget.subcategory}
        onClose={() => setIsSettingsDeleteGuardOpen(false)}
        onViewExpenses={(cat) => {
          setSettingsViewingCategory(cat);
          setIsSettingsExpensesModalOpen(true);
        }}
        onSuccessDeleted={(msg) => {
          Alert.alert('Category Deleted', msg);
        }}
      />
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
    gap: 16,
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 140,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  sectionHelpText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  manageCategoriesCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceVariant,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manageCatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  manageCatIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageCatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  manageCatSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickCatSection: {
    marginTop: 14,
  },
  quickCatHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quickCatChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  quickCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickCatIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCatName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickCatCountBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quickCatCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sheetsPreviewBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sheetsPreviewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  connectedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  connectedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userEmailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  connectedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  openDriveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  openDriveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  disconnectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.expense,
  },
  unconnectedBox: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  unconnectedDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  authButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4285F4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  googleSignInBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickDemoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingItemSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  manualSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  manualSyncBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  lastSyncCaption: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  toggleLogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 6,
  },
  toggleLogsText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  logsContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    maxHeight: 140,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logDotSuccess: {
    backgroundColor: '#10B981',
  },
  logDotInfo: {
    backgroundColor: '#38BDF8',
  },
  logDotError: {
    backgroundColor: '#EF4444',
  },
  logTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 11,
    color: '#E2E8F0',
    flex: 1,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayOptionBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dayOptionTextSelected: {
    color: Colors.textInverse,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'center',
  },
  addSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cashWalletCard: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    borderRadius: 12,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 140,
  },
  cashIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accountCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  accountCardRight: {
    alignItems: 'flex-end',
  },
  accountBalanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  accountActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  editAccBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editAccText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyBalBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  emptyBalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  deleteAccBtn: {
    padding: 4,
  },
  categoriesList: {
    gap: 10,
  },
  catConfigCard: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
  },
  catConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  catConfigLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 120,
  },
  catHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editCatActionBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  deleteCatActionBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  subcatActionBtn: {
    padding: 2,
    marginLeft: 3,
  },
  catConfigIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catConfigName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  catConfigType: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  addSubcatTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSubcatTriggerText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  inlineSubcatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  inlineAddBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  subcatTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  subcatTag: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  subcatTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
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
  quickConnectBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  quickConnectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickConnectDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  quickConnectActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  quickConnectActionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accTypeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  accTypeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  accTypeBtnActive: {
    backgroundColor: Colors.primary,
  },
  accTypeBtnActiveExpense: {
    backgroundColor: Colors.expense,
  },
  accTypeBtnActiveIncome: {
    backgroundColor: Colors.income,
  },
  accTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  accTypeTextActive: {
    color: Colors.textInverse,
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
  inputSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  catPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPickerChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catPickerChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  iconScrollRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
  },
  iconOptionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconOptionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dialogConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  guideBadgeBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  guideBadgeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  guideSummaryText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  quickStepsContainer: {
    gap: 10,
    marginBottom: 14,
  },
  quickStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quickStepDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  openGuideModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 10,
  },
  openGuideModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalBackdropFull: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  guideModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  guideModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  guideModalSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closeGuideBtn: {
    padding: 4,
  },
  guideScrollContent: {
    flex: 1,
    padding: 16,
  },
  guideSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  guideStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guideStepHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  guideStepParagraph: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  stepBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  bulletSymbol: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
  },
  bulletText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  monoText: {
    fontFamily: 'monospace',
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sharingLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sharingLiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BE185D',
  },
  householdKeyCard: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  householdKeyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  householdIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdKeyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  householdKeyValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  deviceNickText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  householdActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  shareCodeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareCodeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  configKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  configKeyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  spouseGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  spouseGuideBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
    marginLeft: 6,
  },
  codeSnippetBox: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    alignItems: 'center',
  },
  codeSnippetText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
});
