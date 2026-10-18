import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import VehicleCard from '../../components/VehicleCard';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import * as vehicleService from '../../services/vehicleService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';

export default function MyVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadVehicles = useCallback(async () => {
    setError(null);
    try {
      const data = await vehicleService.getMyVehicles();
      setVehicles(data.vehicles || data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadVehicles();
    }, [loadVehicles])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const confirmDelete = (vehicle) => {
    setDeleteTarget(vehicle);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vehicleService.deleteVehicle(deleteTarget._id);
      setVehicles((prev) => prev.filter((v) => v._id !== deleteTarget._id));
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete vehicle.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingView message="Loading your vehicles…" />;
  if (error) return <ErrorView message={error} onRetry={() => { setLoading(true); loadVehicles(); }} />;

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Vehicles"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddVehicle')}
            accessibilityLabel="Add vehicle"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={26} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <VehicleCard
            vehicle={item}
            onPress={() => {}}
            onEdit={() => navigation.navigate('EditVehicle', { vehicle: item })}
            onDelete={() => confirmDelete(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          vehicles.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <EmptyState
            iconName="car-outline"
            title="No vehicles yet"
            subtitle="Add a vehicle to start booking washes."
            actionLabel="Add Vehicle"
            onAction={() => navigation.navigate('AddVehicle')}
          />
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${deleteTarget?.make} ${deleteTarget?.model}?`}
        confirmText={deleting ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
});
