import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Car', value: 'Car' },
  { label: 'Bike', value: 'Bike' },
  { label: 'Scooty', value: 'Scooty' },
];

const VEHICLE_ICONS = {
  Car: 'car-outline',
  Bike: 'bicycle-outline',
  Scooty: 'bicycle-outline',
  SUV: 'car-sport-outline',
  Truck: 'bus-outline',
  Van: 'car-outline',
};

function VehicleRow({ vehicle, expanded, onPress }) {
  const iconName = VEHICLE_ICONS[vehicle.type] || 'car-outline';
  const ownerName = vehicle.owner?.name || 'Unknown Owner';

  return (
    <TouchableOpacity
      style={styles.vehicleRow}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.make} ${vehicle.model}`}
    >
      <View style={styles.vehicleRowMain}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={24} color={colors.ocean} />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName} numberOfLines={1}>
            {vehicle.make} {vehicle.model}
          </Text>
          <Text style={styles.ownerName} numberOfLines={1}>
            {ownerName}
          </Text>
          {vehicle.licensePlate ? (
            <View style={styles.platePill}>
              <Text style={styles.plateText}>{vehicle.licensePlate}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.vehicleRight}>
          <Text style={styles.vehicleType}>{vehicle.type}</Text>
          {vehicle.color ? (
            <Text style={styles.vehicleColor}>{vehicle.color}</Text>
          ) : null}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </View>
      {expanded ? (
        <View style={styles.expandedInfo}>
          {vehicle.owner?.email ? (
            <Text style={styles.expandedText}>
              <Text style={styles.expandedLabel}>Email: </Text>
              {vehicle.owner.email}
            </Text>
          ) : null}
          {vehicle.owner?.phone ? (
            <Text style={styles.expandedText}>
              <Text style={styles.expandedLabel}>Phone: </Text>
              {vehicle.owner.phone}
            </Text>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function AdminVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);

  const loadVehicles = useCallback(async (type, searchTerm) => {
    try {
      setError(null);
      const data = await adminService.getVehicles({
        type: type || undefined,
        search: searchTerm?.trim() || undefined,
      });
      const list = data?.data?.vehicles || data?.data || [];
      setVehicles(list);
    } catch (err) {
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadVehicles(activeType, search);
  }, [loadVehicles, activeType]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVehicles(activeType, search);
  }, [loadVehicles, activeType, search]);

  const handleTypeChange = (value) => {
    setActiveType(value);
    setLoading(true);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    loadVehicles(activeType, search);
  };

  const toggleExpanded = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Vehicles"
          showBack
          onBack={() => navigation.goBack()}
        />
        <LoadingView message="Loading vehicles…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Vehicles"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={styles.chipBarContent}
      >
        {TYPE_FILTERS.map((f) => {
          const isActive = activeType === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => handleTypeChange(f.value)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f.label}`}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {f.label}
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
          onSubmitEditing={handleSearchSubmit}
          placeholder="Search by plate or owner…"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search vehicles"
        />
        {search.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setLoading(true);
              loadVehicles(activeType, '');
            }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadVehicles(activeType, search)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <VehicleRow
              vehicle={item}
              expanded={expandedId === item._id}
              onPress={() => toggleExpanded(item._id)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            vehicles.length === 0 && styles.listEmpty,
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
              iconName="car-outline"
              title="No vehicles found"
              subtitle="Vehicles will appear here after customers add them."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
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
  vehicleRow: {
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
  vehicleRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,125,171,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
  },
  ownerName: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  platePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.softGray,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  plateText: {
    ...typography.makeTextStyle('xs', 'bold', colors.textPrimary),
    letterSpacing: 1,
  },
  vehicleRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  vehicleType: {
    ...typography.makeTextStyle('xs', 'medium', colors.ocean),
  },
  vehicleColor: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  expandedInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  expandedText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  expandedLabel: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
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
