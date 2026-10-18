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

// Valid transitions per current status (mirrors server adminController)
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  rescheduled: ['confirmed', 'cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirm',
  in_progress: 'Mark In Progress',
  completed: 'Mark Completed',
  cancelled: 'Cancel',
  rejected: 'Reject',
};

const STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.ocean,
  in_progress: colors.aqua,
  completed: colors.success,
  cancelled: colors.error,
  rejected: colors.error,
  rescheduled: colors.ocean,
};

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const loadBooking = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/admin/bookings/' + bookingId);
      const b = response.data?.data || response.data;
      setBooking(b);
    } catch (err) {
      setError('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleUpdateStatus = async (newStatus) => {
    Alert.alert(
      'Update Status',
      `Change booking status to "${newStatus.replace(/_/g, ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'cancelled' || newStatus === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setUpdating(true);
              await updateBookingStatus(bookingId, newStatus);
              await loadBooking();
              Alert.alert('Success', 'Booking status updated.');
            } catch (err) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Failed to update booking status.'
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Booking Details" showBack onBack={() => navigation.goBack()} />
        <LoadingView message="Loading booking details…" />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Booking Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Booking not found.'}</Text>
          <TouchableOpacity onPress={loadBooking}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const customer = booking.customerId || booking.customer || {};
  const vehicle = booking.vehicleId || booking.vehicle || {};
  const service = booking.serviceId || booking.service || {};

  const validNextStatuses = VALID_TRANSITIONS[booking.status] || [];
  const isTerminal = validNextStatuses.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Booking Details" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status header */}
        <View style={styles.statusHeader}>
          <Text style={styles.bookingId}>
            {booking.bookingReference || ('#' + bookingId.slice(-8).toUpperCase())}
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
          <InfoRow icon="sparkles-outline" label="Service" value={service.name || booking.serviceNameSnapshot} />
          <InfoRow icon="grid-outline" label="Category" value={service.category} />
          <InfoRow icon="time-outline" label="Duration" value={service.duration ? `${service.duration} min` : null} />
          <InfoRow
            icon="cash-outline"
            label="Amount"
            value={booking.priceAtBooking != null ? `₹${booking.priceAtBooking}` : null}
          />
        </SectionCard>

        {/* Schedule info */}
        <SectionCard title="Appointment">
          <InfoRow icon="calendar-outline" label="Date" value={formatDate(booking.startAt)} />
          <InfoRow icon="time-outline" label="Time" value={formatTime(booking.startAt)} />
          {booking.endAt ? (
            <InfoRow icon="time-outline" label="Ends" value={formatTime(booking.endAt)} />
          ) : null}
          {booking.notes ? (
            <InfoRow icon="document-text-outline" label="Notes" value={booking.notes} />
          ) : null}
        </SectionCard>

        {/* Payment info */}
        <SectionCard title="Payment">
          <InfoRow
            icon="wallet-outline"
            label="Method"
            value={booking.paymentMethod === 'cod' ? 'Cash on Delivery' : booking.paymentMethod}
          />
          <InfoRow icon="checkmark-circle-outline" label="Payment Status" value={booking.paymentStatus} />
        </SectionCard>

        {/* Admin notes */}
        {booking.adminNotes ? (
          <SectionCard title="Admin Notes">
            <Text style={styles.notesText}>{booking.adminNotes}</Text>
          </SectionCard>
        ) : null}

        {/* Status update */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          {isTerminal ? (
            <Text style={styles.terminalText}>No further updates available for this booking.</Text>
          ) : (
            <View style={styles.actionButtons}>
              {validNextStatuses.map((status) => {
                const chipColor = STATUS_COLORS[status] || colors.textSecondary;
                const isDestructive = status === 'cancelled' || status === 'rejected';
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.actionChip,
                      { borderColor: chipColor },
                      isDestructive && styles.actionChipDestructive,
                    ]}
                    onPress={() => handleUpdateStatus(status)}
                    disabled={updating}
                    accessibilityRole="button"
                    accessibilityLabel={STATUS_LABELS[status] || status}
                  >
                    <Text style={[styles.actionChipText, { color: isDestructive ? colors.error : chipColor }]}>
                      {STATUS_LABELS[status] || status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
  infoContent: { flex: 1 },
  infoLabel: {
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
    marginBottom: 2,
  },
  infoValue: {
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
  },
  notesText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
  },
  terminalText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1.5,
    backgroundColor: colors.white,
  },
  actionChipDestructive: {
    borderColor: colors.error,
  },
  actionChipText: {
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
