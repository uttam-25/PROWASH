import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import api from '../../services/api';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const VEHICLE_ICONS = {
  Car: 'car-outline',
  Bike: 'bicycle-outline',
  Scooty: 'bicycle-outline',
  SUV: 'car-sport-outline',
  Truck: 'bus-outline',
  Van: 'car-outline',
};

function VehicleRow({ vehicle }) {
  const iconName = VEHICLE_ICONS[vehicle.type] || 'car-outline';
  const ownerName = vehicle.owner?.name || 'Unknown Owner';

  return (
    <View style={styles.vehicleRow} accessibilityRole="text">
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
      </View>
    </View>
  );
}

export default function AdminVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const loadVehicles = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/admin/vehicles');
      const list = response.data?.data?.vehicles || response.data?.data || [];
      setVehicles(list);
    } catch (err) {
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVehicles();
  }, [loadVehicles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        (v.licensePlate || '').toLowerCase().includes(q) ||
        (v.owner?.name || '').toLowerCase().includes(q) ||
        (v.make || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q)
    );
  }, [vehicles, search]);

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

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by plate or owner…"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          accessibilityLabel="Search vehicles"
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
          <TouchableOpacity onPress={loadVehicles}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <VehicleRow vehicle={item} />}
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
              iconName="car-outline"
              title="No vehicles found"
              subtitle={
                search
                  ? `No results for "${search}"`
                  : 'Vehicles will appear here after customers add them.'
              }
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
  },
  vehicleType: {
    ...typography.makeTextStyle('xs', 'medium', colors.ocean),
  },
  vehicleColor: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginTop: 2,
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
