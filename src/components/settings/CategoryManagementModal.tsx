import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { Category, Subcategory } from '../../types';
import { CategoryExpensesModal } from './CategoryExpensesModal';
import { CategoryDeleteGuardModal } from './CategoryDeleteGuardModal';

interface CategoryManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#2563EB',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
];

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
  // Entertainment & Leisure
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

type FilterType = 'ALL' | 'EXPENSE' | 'INCOME';

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    categories,
    transactions,
    settings,
    addCategory,
    editCategory,
    deleteCategory,
    addSubcategory,
    editSubcategory,
    deleteSubcategory,
  } = useApp();

  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Viewing Expenses Modal State
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [viewingSubcategoryId, setViewingSubcategoryId] = useState<string | null>(null);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);

  // Delete Guard Modal State
  const [isDeleteGuardOpen, setIsDeleteGuardOpen] = useState(false);
  const [deleteGuardTarget, setDeleteGuardTarget] = useState<{
    type: 'CATEGORY' | 'SUBCATEGORY';
    category: Category | null;
    subcategory?: Subcategory | null;
  }>({
    type: 'CATEGORY',
    category: null,
    subcategory: null,
  });

  // Calculate transaction counts per category and subcategory
  const categoryTxCounts = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + 1;
    });
    return map;
  }, [transactions]);

  const subcategoryTxCounts = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.subcategoryId) {
        map[t.subcategoryId] = (map[t.subcategoryId] || 0) + 1;
      }
    });
    return map;
  }, [transactions]);

  // Add Category Modal State
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCatIcon, setNewCatIcon] = useState('fast-food');
  const [newCatColor, setNewCatColor] = useState('#EF4444');

  // Edit Category Modal State
  const [isEditCatModalOpen, setIsEditCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<'EXPENSE' | 'INCOME' | 'BOTH'>('EXPENSE');
  const [editCatIcon, setEditCatIcon] = useState('fast-food');
  const [editCatColor, setEditCatColor] = useState('#EF4444');

  // Subcategory Add / Edit State
  const [isAddSubModalOpen, setIsAddSubModalOpen] = useState(false);
  const [targetCatForSub, setTargetCatForSub] = useState<Category | null>(null);
  const [newSubName, setNewSubName] = useState('');

  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<{
    catId: string;
    catName: string;
    catIcon: string;
    catColor: string;
    catType: string;
    sub: Subcategory;
  } | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // Filtered categories
  const filteredCategories = categories.filter((c) => {
    if (filterType !== 'ALL') {
      if (c.type !== 'BOTH' && c.type !== filterType) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = c.name.toLowerCase().includes(q);
      const matchSub = c.subcategories.some((s) => s.name.toLowerCase().includes(q));
      if (!matchCat && !matchSub) return false;
    }
    return true;
  });

  const handleOpenAddCat = () => {
    setNewCatName('');
    setNewCatType('EXPENSE');
    setNewCatIcon('fast-food');
    setNewCatColor('#EF4444');
    setIsAddCatModalOpen(true);
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }
    addCategory(newCatName.trim(), newCatType, newCatIcon, newCatColor);
    setIsAddCatModalOpen(false);
  };

  const handleOpenEditCat = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatIcon(cat.icon);
    setEditCatColor(cat.color);
    setIsEditCatModalOpen(true);
  };

  const handleSaveEditedCategory = () => {
    if (!editingCategory) return;
    if (!editCatName.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }
    editCategory({
      ...editingCategory,
      name: editCatName.trim(),
      type: editCatType,
      icon: editCatIcon,
      color: editCatColor,
    });
    setIsEditCatModalOpen(false);
    setEditingCategory(null);
  };

  const handleViewCategoryExpenses = (cat: Category, subId: string | null = null) => {
    setViewingCategory(cat);
    setViewingSubcategoryId(subId);
    setIsExpensesModalOpen(true);
  };

  const handleDeleteCatPrompt = (cat: Category) => {
    const linkedTxs = transactions.filter(
      (t) => t.categoryId === cat.id || t.categoryId === cat.name
    );

    if (linkedTxs.length > 0) {
      setDeleteGuardTarget({
        type: 'CATEGORY',
        category: cat,
        subcategory: null,
      });
      setIsDeleteGuardOpen(true);
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

  // Subcategory Actions
  const handleOpenAddSub = (cat: Category) => {
    setTargetCatForSub(cat);
    setNewSubName('');
    setIsAddSubModalOpen(true);
  };

  const handleCreateSubcategory = () => {
    if (!targetCatForSub) return;
    if (!newSubName.trim()) {
      Alert.alert('Validation Error', 'Subcategory name cannot be empty.');
      return;
    }
    addSubcategory(targetCatForSub.id, newSubName.trim());
    setIsAddSubModalOpen(false);
    setTargetCatForSub(null);
  };

  const handleOpenEditSub = (cat: Category, sub: Subcategory) => {
    setEditingSubcategory({
      catId: cat.id,
      catName: cat.name,
      catIcon: cat.icon,
      catColor: cat.color,
      catType: cat.type,
      sub,
    });
    setEditSubName(sub.name);
    setIsEditSubModalOpen(true);
  };

  const handleSaveEditedSubcategory = () => {
    if (!editingSubcategory) return;
    if (!editSubName.trim()) {
      Alert.alert('Validation Error', 'Subcategory name cannot be empty.');
      return;
    }
    editSubcategory(editingSubcategory.catId, editingSubcategory.sub.id, editSubName.trim());
    setIsEditSubModalOpen(false);
    setEditingSubcategory(null);
  };

  const handleDeleteSubPrompt = (catId: string, sub: Subcategory) => {
    const cat = categories.find((c) => c.id === catId);
    const linkedSubTxs = transactions.filter(
      (t) =>
        (t.categoryId === catId || (cat && t.categoryId === cat.name)) &&
        (t.subcategoryId === sub.id || t.subcategoryId === sub.name)
    );

    if (linkedSubTxs.length > 0 && cat) {
      setDeleteGuardTarget({
        type: 'SUBCATEGORY',
        category: cat,
        subcategory: sub,
      });
      setIsDeleteGuardOpen(true);
    } else {
      Alert.alert(
        'Delete Subcategory',
        `Are you sure you want to delete subcategory "${sub.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteSubcategory(catId, sub.id),
          },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Manage Categories</Text>
            <Text style={styles.screenSubtitle}>
              Customize expense & income categories, icons, colors, and subcategories
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search & Actions Bar */}
        <View style={styles.searchActionBar}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories or subcategories..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.newCatBtn} onPress={handleOpenAddCat}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newCatBtnText}>New Category</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          {(['ALL', 'EXPENSE', 'INCOME'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.filterPill,
                filterType === t && styles.filterPillActive,
              ]}
              onPress={() => setFilterType(t)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterType === t && styles.filterPillTextActive,
                ]}
              >
                {t === 'ALL' ? 'All Categories' : t === 'EXPENSE' ? 'Expense' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.countText}>{filteredCategories.length} Categories</Text>
        </View>

        {/* Categories List */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCategoryId === cat.id;

            return (
              <View key={cat.id} style={styles.categoryCard}>
                {/* Main Category Row */}
                <View style={styles.catMainRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${cat.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={
                        (cat.icon as keyof typeof Ionicons.glyphMap) ||
                        'pricetag'
                      }
                      size={20}
                      color={cat.color}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.catInfoTouchable}
                    onPress={() => handleViewCategoryExpenses(cat)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catTitleRow}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <View
                        style={[
                          styles.typeBadge,
                          cat.type === 'INCOME'
                            ? styles.typeBadgeIncome
                            : styles.typeBadgeExpense,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            cat.type === 'INCOME'
                              ? { color: Colors.income }
                              : { color: Colors.expense },
                          ]}
                        >
                          {cat.type}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.subCountText}>
                      {cat.subcategories.length}{' '}
                      {cat.subcategories.length === 1
                        ? 'subcategory'
                        : 'subcategories'}{' '}
                      • {categoryTxCounts[cat.id] || 0}{' '}
                      {(categoryTxCounts[cat.id] || 0) === 1 ? 'expense' : 'expenses'} (Tap to view)
                    </Text>
                  </TouchableOpacity>

                  {/* Edit and Delete Category Actions */}
                  <View style={styles.catActions}>
                    <TouchableOpacity
                      style={styles.actionBtnExpenses}
                      onPress={() => handleViewCategoryExpenses(cat)}
                      accessibilityLabel={`View expenses for ${cat.name}`}
                    >
                      <Ionicons name="receipt-outline" size={13} color={Colors.primary} />
                      <Text style={styles.actionBtnExpensesText}>
                        {categoryTxCounts[cat.id] || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenEditCat(cat)}
                    >
                      <Ionicons name="pencil" size={16} color={Colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeleteCatPrompt(cat)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={Colors.expense}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.expandToggleBtn}
                      onPress={() =>
                        setExpandedCategoryId(isExpanded ? null : cat.id)
                      }
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subcategories Section (Expanded) */}
                {isExpanded && (
                  <View style={styles.subcategoriesBox}>
                    <View style={styles.subHeaderRow}>
                      <Text style={styles.subSectionTitle}>
                        Subcategories ({cat.subcategories.length})
                      </Text>
                      <TouchableOpacity
                        style={styles.addSubBtn}
                        onPress={() => handleOpenAddSub(cat)}
                      >
                        <Ionicons name="add" size={14} color={Colors.primary} />
                        <Text style={styles.addSubBtnText}>+ Add Subcategory</Text>
                      </TouchableOpacity>
                    </View>

                    {cat.subcategories.length === 0 ? (
                      <Text style={styles.noSubsText}>
                        No subcategories yet. Tap "+ Add Subcategory" to create one.
                      </Text>
                    ) : (
                      <View style={styles.subChipsGrid}>
                        {cat.subcategories.map((sub) => {
                          const subTxCount = subcategoryTxCounts[sub.id] || 0;
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={styles.subChip}
                              onPress={() => handleViewCategoryExpenses(cat, sub.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="pricetag-outline"
                                size={11}
                                color={cat.color}
                                style={{ marginRight: 2 }}
                              />
                              <Text style={styles.subChipName} numberOfLines={1}>
                                {sub.name}
                                {subTxCount > 0 ? ` (${subTxCount})` : ''}
                              </Text>
                              <TouchableOpacity
                                style={styles.subEditBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditSub(cat, sub);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              >
                                <Ionicons
                                  name="pencil"
                                  size={12}
                                  color={Colors.primary}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.subDeleteBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSubPrompt(cat.id, sub);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={12}
                                  color={Colors.expense}
                                />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Modal: Add Category */}
        <Modal
          visible={isAddCatModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsAddCatModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add New Category</Text>

              {/* Type Selector */}
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newCatType === 'EXPENSE' && styles.typeOptionActiveExp,
                  ]}
                  onPress={() => setNewCatType('EXPENSE')}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      newCatType === 'EXPENSE' && styles.typeOptionTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    newCatType === 'INCOME' && styles.typeOptionActiveInc,
                  ]}
                  onPress={() => setNewCatType('INCOME')}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      newCatType === 'INCOME' && styles.typeOptionTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.dialogInput}
                placeholder="Category Name (e.g. Health, Investments)"
                placeholderTextColor={Colors.textMuted}
                value={newCatName}
                onChangeText={setNewCatName}
                autoFocus
              />

              {/* Color Selector */}
              <Text style={styles.selectorLabel}>Theme Color:</Text>
              <View style={styles.colorsRow}>
                {CATEGORY_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      newCatColor === c && styles.colorDotActive,
                    ]}
                    onPress={() => setNewCatColor(c)}
                  />
                ))}
              </View>

              {/* Icon Selector Grid */}
              <Text style={styles.selectorLabel}>
                Choose Icon ({CATEGORY_ICONS.length} available):
              </Text>
              <ScrollView
                style={styles.iconsScrollView}
                contentContainerStyle={styles.iconsGrid}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
              >
                {CATEGORY_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconSelectBox,
                      newCatIcon === ic && styles.iconSelectBoxActive,
                    ]}
                    onPress={() => setNewCatIcon(ic)}
                  >
                    <Ionicons
                      name={ic}
                      size={20}
                      color={newCatIcon === ic ? Colors.primary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsAddCatModalOpen(false)}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogConfirmBtn}
                  onPress={handleCreateCategory}
                >
                  <Text style={styles.dialogConfirmText}>Create Category</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Edit Category */}
        <Modal
          visible={isEditCatModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsEditCatModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Edit Category</Text>

              {/* Type Selector */}
              <View style={styles.typeSelectorRow}>
                {(['EXPENSE', 'INCOME', 'BOTH'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeOption,
                      editCatType === t && styles.typeOptionActiveExp,
                    ]}
                    onPress={() => setEditCatType(t)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        editCatType === t && styles.typeOptionTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.dialogInput}
                placeholder="Category Name"
                placeholderTextColor={Colors.textMuted}
                value={editCatName}
                onChangeText={setEditCatName}
              />

              {/* Color Selector */}
              <Text style={styles.selectorLabel}>Theme Color:</Text>
              <View style={styles.colorsRow}>
                {CATEGORY_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      editCatColor === c && styles.colorDotActive,
                    ]}
                    onPress={() => setNewCatColor(c)}
                  />
                ))}
              </View>

              {/* Icon Selector Grid */}
              <Text style={styles.selectorLabel}>
                Choose Icon ({CATEGORY_ICONS.length} available):
              </Text>
              <ScrollView
                style={styles.iconsScrollView}
                contentContainerStyle={styles.iconsGrid}
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
              >
                {CATEGORY_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconSelectBox,
                      editCatIcon === ic && styles.iconSelectBoxActive,
                    ]}
                    onPress={() => setEditCatIcon(ic)}
                  >
                    <Ionicons
                      name={ic}
                      size={20}
                      color={editCatIcon === ic ? Colors.primary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsEditCatModalOpen(false)}
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

        {/* Modal: Add Subcategory */}
        <Modal
          visible={isAddSubModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsAddSubModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add New Subcategory</Text>

              {/* Show Parent Category Info */}
              {targetCatForSub && (
                <View style={styles.parentCatBanner}>
                  <View
                    style={[
                      styles.parentCatIconCircle,
                      { backgroundColor: `${targetCatForSub.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={
                        (targetCatForSub.icon as keyof typeof Ionicons.glyphMap) ||
                        'pricetag'
                      }
                      size={18}
                      color={targetCatForSub.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parentCatSubLabel}>Parent Category</Text>
                    <Text style={styles.parentCatName}>{targetCatForSub.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      targetCatForSub.type === 'INCOME'
                        ? styles.typeBadgeIncome
                        : styles.typeBadgeExpense,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        targetCatForSub.type === 'INCOME'
                          ? { color: Colors.income }
                          : { color: Colors.expense },
                      ]}
                    >
                      {targetCatForSub.type}
                    </Text>
                  </View>
                </View>
              )}

              <TextInput
                style={[styles.dialogInput, { marginTop: 12 }]}
                placeholder="Subcategory Name (e.g. Coffee, Groceries)"
                placeholderTextColor={Colors.textMuted}
                value={newSubName}
                onChangeText={setNewSubName}
                autoFocus
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsAddSubModalOpen(false)}
                >
                  <Text style={styles.dialogCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogConfirmBtn}
                  onPress={handleCreateSubcategory}
                >
                  <Text style={styles.dialogConfirmText}>Add Subcategory</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Edit Subcategory */}
        <Modal
          visible={isEditSubModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsEditSubModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Edit Subcategory</Text>

              {/* Show Parent Category Info */}
              {editingSubcategory && (
                <View style={styles.parentCatBanner}>
                  <View
                    style={[
                      styles.parentCatIconCircle,
                      { backgroundColor: `${editingSubcategory.catColor}20` },
                    ]}
                  >
                    <Ionicons
                      name={
                        (editingSubcategory.catIcon as keyof typeof Ionicons.glyphMap) ||
                        'pricetag'
                      }
                      size={18}
                      color={editingSubcategory.catColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parentCatSubLabel}>Parent Category</Text>
                    <Text style={styles.parentCatName}>{editingSubcategory.catName}</Text>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      editingSubcategory.catType === 'INCOME'
                        ? styles.typeBadgeIncome
                        : styles.typeBadgeExpense,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        editingSubcategory.catType === 'INCOME'
                          ? { color: Colors.income }
                          : { color: Colors.expense },
                      ]}
                    >
                      {editingSubcategory.catType}
                    </Text>
                  </View>
                </View>
              )}

              <TextInput
                style={[styles.dialogInput, { marginTop: 12 }]}
                placeholder="Subcategory Name"
                placeholderTextColor={Colors.textMuted}
                value={editSubName}
                onChangeText={setEditSubName}
                autoFocus
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setIsEditSubModalOpen(false)}
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

        {/* Category Expenses View Modal */}
        <CategoryExpensesModal
          visible={isExpensesModalOpen}
          category={viewingCategory}
          initialSubcategoryId={viewingSubcategoryId}
          onClose={() => {
            setIsExpensesModalOpen(false);
            setViewingCategory(null);
            setViewingSubcategoryId(null);
          }}
        />

        {/* Category & Subcategory Delete Guard Modal */}
        <CategoryDeleteGuardModal
          visible={isDeleteGuardOpen}
          targetType={deleteGuardTarget.type}
          category={deleteGuardTarget.category}
          subcategory={deleteGuardTarget.subcategory}
          onClose={() => setIsDeleteGuardOpen(false)}
          onViewExpenses={(cat, sub) => {
            handleViewCategoryExpenses(cat, sub?.id || null);
          }}
          onSuccessDeleted={(msg) => {
            Alert.alert('Category Updated', msg);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 280,
  },
  closeBtn: {
    padding: 6,
  },
  searchActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    padding: 0,
  },
  newCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  newCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countText: {
    marginLeft: 'auto',
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  categoryCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  catMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfoTouchable: {
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  typeBadgeExpense: {
    backgroundColor: '#FEE2E2',
  },
  typeBadgeIncome: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  subCountText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  catActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: 6,
  },
  actionBtnExpenses: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.primary}12`,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionBtnExpensesText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  expandToggleBtn: {
    padding: 4,
  },
  subcategoriesBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  addSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addSubBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  noSubsText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  subChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    maxWidth: 130,
  },
  subEditBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
  },
  subDeleteBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  parentCatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  parentCatIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentCatSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  parentCatName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  iconsScrollView: {
    maxHeight: 140,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 8,
    marginTop: 2,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
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
    marginBottom: 12,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeOptionActiveExp: {
    backgroundColor: Colors.expense,
  },
  typeOptionActiveInc: {
    backgroundColor: Colors.income,
  },
  typeOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dialogInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  iconsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  iconSelectBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconSelectBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
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
  dialogConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
