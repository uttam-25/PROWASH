import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../services/api';
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

export default function AdminCustomerDetailsScreen({ route, navigation }) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState(null);

  const loadCustomer = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/admin/customers/' + customerId);
      const data = response.data?.data || response.data;
      setCustomer(data.customer || data);
      setBookings(data.bookings || []);
    } catch (err) {
      setError('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleToggleActive = async () => {
    try {
      setToggling(true);
      const response = await api.put('/admin/customers/' + customerId + '/toggle');
      const updated = response.data?.data?.customer || response.data?.data || {};
      setCustomer((prev) => ({ ...prev, isActive: updated.isActive ?? !prev.isActive }));
      Alert.alert(
        'Success',
        `Customer has been ${updated.isActive ? 'activated' : 'deactivated'}.`
      );
    } catch {
      Alert.alert('Error', 'Failed to update customer status.');
    } finally {
      setToggling(false);
      setConfirmVisible(false);
    }
  };

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

  const recentBookings = bookings.slice(0, 5);

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

        {/* Info */}
        <View style={styles.infoCard}>
          <InfoRow icon="mail-outline" label="Email" value={customer.email} />
          <InfoRow icon="call-outline" label="Phone" value={customer.phone} />
          <InfoRow icon="calendar-outline" label="Member Since" value={formatDate(customer.createdAt)} />
        </View>

        {/* Toggle action */}
        <AppButton
          title={customer.isActive ? 'Deactivate Account' : 'Activate Account'}
          onPress={() => setConfirmVisible(true)}
          variant={customer.isActive ? 'outline' : 'primary'}
          loading={toggling}
          style={styles.toggleBtn}
        />

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

      <ConfirmDialog
        visible={confirmVisible}
        title={customer.isActive ? 'Deactivate Customer' : 'Activate Customer'}
        message={
          customer.isActive
            ? `Deactivate ${customer.name}? They will not be able to log in.`
            : `Activate ${customer.name}? They will regain access to the app.`
        }
        confirmText={customer.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmVisible(false)}
        destructive={customer.isActive}
      />
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
  toggleBtn: {
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
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
