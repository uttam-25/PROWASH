import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.ocean} style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

function StatBox({ label, value, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: color || colors.textPrimary }]}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminCustomerDetailsScreen({ route, navigation }) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, cancelled: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCustomer = useCallback(async () => {
    try {
      setError(null);
      const response = await adminService.getCustomerDetails(customerId);
      const data = response?.data || response;
      setCustomer(data.customer || data);
      setStats(data.stats || { total: 0, completed: 0, pending: 0, cancelled: 0 });
      setVehicles(data.vehicles || []);
      setRecentBookings((data.recentBookings || []).slice(0, 5));
    } catch (err) {
      setError('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Customer Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <LoadingView message="Loading customer…" />
      </SafeAreaView>
    );
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Customer Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Customer not found.'}</Text>
          <TouchableOpacity onPress={loadCustomer}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (customer.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Customer Details"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox label="Total" value={stats.total} color={colors.ocean} />
          <StatBox label="Completed" value={stats.completed} color={colors.success} />
          <StatBox label="Pending" value={stats.pending} color={colors.warning} />
          <StatBox label="Cancelled" value={stats.cancelled} color={colors.error} />
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <InfoRow icon="mail-outline" label="Email" value={customer.email} />
          <InfoRow icon="call-outline" label="Phone" value={customer.phone} />
          <InfoRow icon="calendar-outline" label="Member Since" value={formatDate(customer.createdAt)} />
        </View>

        {/* Vehicles section */}
        {vehicles.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicles</Text>
            {vehicles.map((v) => (
              <View key={v._id} style={styles.vehicleRow} accessibilityRole="text">
                <Ionicons name="car-outline" size={18} color={colors.ocean} style={styles.vehicleIcon} />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {[v.make, v.model].filter(Boolean).join(' ') || 'Unknown Vehicle'}
                  </Text>
                  <Text style={styles.vehicleMeta}>
                    {[v.type, v.licensePlate].filter(Boolean).join(' · ') || ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Recent bookings */}
        {recentBookings.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {recentBookings.map((b) => (
              <BookingCard key={b._id} booking={b} />
            ))}
          </View>
        ) : (
          <View style={styles.noBookings}>
            <Text style={styles.noBookingsText}>No bookings found for this customer.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    ...typography.makeTextStyle('xxl', 'bold', colors.white),
  },
  customerName: {
    ...typography.makeTextStyle('xl', 'bold', colors.textPrimary),
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statValue: {
    ...typography.makeTextStyle('xl', 'bold', colors.textPrimary),
  },
  statLabel: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'center',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoIcon: {
    width: 22,
  },
  infoLabel: {
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
    marginBottom: 2,
  },
  infoValue: {
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
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
  vehicleIcon: {
    marginRight: spacing.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
  },
  vehicleMeta: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  noBookings: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  noBookingsText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
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
