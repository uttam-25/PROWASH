import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import api from '../../services/api';
import { updateBookingStatus } from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.ocean,
  in_progress: colors.aqua,
  completed: colors.success,
  cancelled: colors.error,
};

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
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function AdminBookingDetailsScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const loadBooking = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/admin/bookings/' + bookingId);
      const b = response.data?.data?.booking || response.data?.data || response.data;
      setBooking(b);
      setSelectedStatus(b?.status || '');
    } catch (err) {
      // Fall back to listing all and finding by id
      try {
        const listRes = await api.get('/admin/bookings');
        const list = listRes.data?.data?.bookings || listRes.data?.data || [];
        const found = list.find((b) => b._id === bookingId);
        if (found) {
          setBooking(found);
          setSelectedStatus(found.status || '');
        } else {
          setError('Booking not found.');
        }
      } catch {
        setError('Failed to load booking details.');
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === booking?.status) return;
    try {
      setUpdating(true);
      await updateBookingStatus(bookingId, selectedStatus);
      setBooking((prev) => ({ ...prev, status: selectedStatus }));
      Alert.alert('Success', 'Booking status updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update booking status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Booking Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <LoadingView message="Loading booking details…" />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Booking Details"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Booking not found.'}</Text>
          <TouchableOpacity onPress={loadBooking}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const customer = booking.customer || {};
  const vehicle = booking.vehicle || {};
  const service = booking.service || {};
  const payment = booking.payment || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Booking Details"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status header */}
        <View style={styles.statusHeader}>
          <Text style={styles.bookingId}>
            #{bookingId.slice(-8).toUpperCase()}
          </Text>
          <StatusBadge status={booking.status} />
        </View>

        {/* Customer info */}
        <SectionCard title="Customer">
          <InfoRow icon="person-outline" label="Name" value={customer.name} />
          <InfoRow icon="mail-outline" label="Email" value={customer.email} />
          <InfoRow icon="call-outline" label="Phone" value={customer.phone} />
        </SectionCard>

        {/* Vehicle info */}
        <SectionCard title="Vehicle">
          <InfoRow icon="car-outline" label="Type" value={vehicle.type} />
          <InfoRow
            icon="build-outline"
            label="Make / Model"
            value={vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : null}
          />
          <InfoRow icon="card-outline" label="License Plate" value={vehicle.licensePlate} />
          <InfoRow icon="color-palette-outline" label="Color" value={vehicle.color} />
        </SectionCard>

        {/* Service info */}
        <SectionCard title="Service">
          <InfoRow icon="sparkles-outline" label="Service" value={service.name} />
          <InfoRow icon="grid-outline" label="Category" value={service.category} />
          <InfoRow icon="time-outline" label="Duration" value={service.duration ? `${service.duration} min` : null} />
          <InfoRow icon="cash-outline" label="Amount" value={`₹${booking.totalAmount}`} />
        </SectionCard>

        {/* Schedule info */}
        <SectionCard title="Schedule">
          <InfoRow icon="calendar-outline" label="Date" value={formatDate(booking.scheduledDate)} />
          <InfoRow icon="time-outline" label="Time" value={booking.scheduledTime} />
          {booking.notes ? (
            <InfoRow icon="document-text-outline" label="Notes" value={booking.notes} />
          ) : null}
        </SectionCard>

        {/* Payment info */}
        <SectionCard title="Payment">
          <InfoRow icon="wallet-outline" label="Method" value={booking.paymentMethod === 'cod' ? 'Cash on Delivery' : booking.paymentMethod} />
          <InfoRow icon="checkmark-circle-outline" label="Payment Status" value={payment.status} />
        </SectionCard>

        {/* Status update */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusChips}>
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStatus === opt.value;
              const chipColor = STATUS_COLORS[opt.value] || colors.textSecondary;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.statusChip,
                    { borderColor: chipColor },
                    isSelected && { backgroundColor: chipColor },
                  ]}
                  onPress={() => setSelectedStatus(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: isSelected ? colors.white : chipColor },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <AppButton
            title="Update Status"
            onPress={handleUpdateStatus}
            loading={updating}
            disabled={!selectedStatus || selectedStatus === booking.status}
            style={styles.updateBtn}
          />
        </View>
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  bookingId: {
    ...typography.makeTextStyle('md', 'bold', colors.textPrimary),
    fontFamily: 'monospace',
  },
  sectionCard: {
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
  sectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
    width: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
    marginBottom: 2,
  },
  infoValue: {
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1.5,
  },
  statusChipText: {
    ...typography.makeTextStyle('sm', 'semibold'),
  },
  updateBtn: {
    marginTop: spacing.sm,
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
