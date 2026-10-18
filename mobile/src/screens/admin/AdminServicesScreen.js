import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const TYPE_FILTERS = ['All', 'Car', 'Bike', 'Scooty'];

const CATEGORY_COLORS = {
  exterior: colors.ocean,
  interior: colors.aqua,
  full: colors.success,
  premium: colors.warning,
  deep_clean: '#7B1FA2',
  addon: '#00838F',
};

function ServiceRow({ service, onEdit, onDelete, onToggle }) {
  const catColor = CATEGORY_COLORS[service.category] || colors.textSecondary;
  return (
    <TouchableOpacity
      style={styles.serviceRow}
      onPress={onEdit}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={service.name}
    >
      <View style={styles.serviceMain}>
        <View style={styles.nameRow}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {service.name}
          </Text>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22', borderColor: catColor }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>
              {(service.category || '').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.serviceDetails}>
          <Text style={styles.price}>₹{service.price}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.duration}>{service.duration} min</Text>
        </View>
      </View>
      <View style={styles.serviceActions}>
        <Switch
          value={service.isActive}
          onValueChange={(val) => onToggle(service, val)}
          trackColor={{ false: colors.softGray, true: colors.ocean + '66' }}
          thumbColor={service.isActive ? colors.ocean : colors.textSecondary}
          accessibilityLabel={service.isActive ? 'Active' : 'Inactive'}
        />
        <TouchableOpacity
          onPress={() => onDelete(service)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete service"
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadServices = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getServices({ includeInactive: true });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setServices(list);
    } catch (err) {
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadServices();
  }, [loadServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices();
  }, [loadServices]);

  const handleToggle = async (service, newValue) => {
    try {
      await adminService.updateService(service._id, { isActive: newValue });
      setServices((prev) =>
        prev.map((s) => (s._id === service._id ? { ...s, isActive: newValue } : s))
      );
    } catch {
      Alert.alert('Error', 'Failed to update service status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteService(deleteTarget._id);
      setServices((prev) => prev.filter((s) => s._id !== deleteTarget._id));
    } catch {
      Alert.alert('Error', 'Failed to delete service.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    let list = services;
    if (typeFilter && typeFilter !== '') {
      list = list.filter(
        (s) =>
          Array.isArray(s.vehicleTypes) &&
          s.vehicleTypes.some((t) => t.toLowerCase() === typeFilter.toLowerCase())
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => (s.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [services, typeFilter, search]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Services"
          rightAction={
            <TouchableOpacity
              onPress={() => navigation.navigate('AddService')}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Add service"
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          }
        />
        <LoadingView message="Loading services…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Services"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddService')}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="Add service"
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        }
      />

      {/* Vehicle type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={styles.chipBarContent}
      >
        {TYPE_FILTERS.map((t) => {
          const val = t === 'All' ? '' : t;
          const isActive = typeFilter === val;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setTypeFilter(val)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${t}`}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search services…"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          accessibilityLabel="Search services"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadServices}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ServiceRow
              service={item}
              onEdit={() => navigation.navigate('EditService', { service: item })}
              onDelete={(s) => setDeleteTarget(s)}
              onToggle={handleToggle}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.ocean]}
              tintColor={colors.ocean}
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="sparkles-outline"
              title="No services yet"
              subtitle="Add your first wash service to get started."
              actionLabel="Add Service"
              onAction={() => navigation.navigate('AddService')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Service"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  addBtn: {
    padding: 4,
  },
  chipBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  chipBarContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.softGray,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.ocean,
  },
  filterChipText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  filterChipTextActive: {
    color: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    paddingVertical: 4,
  },
  listContent: {
    padding: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  serviceMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  serviceName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1,
  },
  catBadgeText: {
    ...typography.makeTextStyle('xs', 'bold'),
    letterSpacing: 0.5,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  price: {
    ...typography.makeTextStyle('sm', 'semibold', colors.ocean),
  },
  separator: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  duration: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.makeTextStyle('md', 'regular', colors.error),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryText: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
  },
});
