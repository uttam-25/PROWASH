import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import VehicleCard from '../../components/VehicleCard';
import EmptyState from '../../components/EmptyState';
import ErrorView from '../../components/ErrorView';
import * as vehicleService from '../../services/vehicleService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

export default function BookWashScreen({ route, navigation }) {
  const { serviceId, service } = route.params || {};

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadVehicles = useCallback(async () => {
    setError(null);
    try {
      const data = await vehicleService.getMyVehicles();
      setVehicles(data.vehicles || data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleContinue = () => {
    navigation.navigate('SelectDateTime', {
      vehicleId: selectedVehicle._id,
      serviceId,
      service,
      vehicle: selectedVehicle,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Book a Wash" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ocean} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <AppHeader title="Book a Wash" showBack onBack={() => navigation.goBack()} />
        <ErrorView message={error} onRetry={() => { setLoading(true); loadVehicles(); }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Book a Wash" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Service summary */}
        {service ? (
          <View style={styles.serviceCard}>
            <Text style={styles.serviceLabel}>Service</Text>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.servicePrice}>₹{service.price}</Text>
            </View>
          </View>
        ) : null}

        {/* Vehicle selection */}
        <Text style={styles.sectionTitle}>Select a Vehicle</Text>

        {vehicles.length === 0 ? (
          <EmptyState
            iconName="car-outline"
            title="No vehicles added"
            subtitle="Add a vehicle to continue booking."
            actionLabel="Add Vehicle"
            onAction={() => navigation.navigate('HomeTab', { screen: 'AddVehicle' })}
          />
        ) : (
          vehicles.map((v) => (
            <View
              key={v._id}
              style={[
                styles.vehicleWrapper,
                selectedVehicle?._id === v._id && styles.vehicleWrapperSelected,
              ]}
            >
              <VehicleCard
                vehicle={v}
                onPress={() => setSelectedVehicle(v)}
              />
            </View>
          ))
        )}
      </ScrollView>

      {vehicles.length > 0 ? (
        <View style={styles.footer}>
          <AppButton
            title="Continue"
            onPress={handleContinue}
            disabled={!selectedVehicle}
            size="lg"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  serviceCard: {
    backgroundColor: colors.midnight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  serviceLabel: {
    ...typography.makeTextStyle('xs', 'semibold', colors.aqua),
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceName: {
    ...typography.makeTextStyle('lg', 'bold', colors.white),
  },
  servicePrice: {
    ...typography.makeTextStyle('lg', 'bold', colors.aqua),
  },
  sectionTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  vehicleWrapper: {
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 0,
  },
  vehicleWrapperSelected: {
    borderColor: colors.ocean,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
