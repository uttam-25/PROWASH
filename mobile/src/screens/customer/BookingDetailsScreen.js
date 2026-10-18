import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import ConfirmDialog from '../../components/ConfirmDialog';
import * as bookingService from '../../services/bookingService';
import { BOOKING_STATUS } from '../../constants/index';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={colors.ocean} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const CANCELLABLE_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];

export default function BookingDetailsScreen({ route, navigation }) {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadBooking = async () => {
    setError(null);
    try {
      const data = await bookingService.getBooking(bookingId);
      setBooking(data.booking || data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for cancellation.');
      return;
    }
    setCancelling(true);
    try {
      await bookingService.cancelBooking(bookingId, cancelReason.trim());
      setShowCancelDialog(false);
      setCancelReason('');
      loadBooking(); // refresh
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingView message="Loading booking details…" />;
  if (error) return <ErrorView message={error} onRetry={() => { setLoading(true); loadBooking(); }} />;
  if (!booking) return null;

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);
  const service = booking.service || {};
  const vehicle = booking.vehicle || {};
  const vehicleLabel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '—';

  return (
    <View style={styles.container}>
      <AppHeader title="Booking Details" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status header */}
        <View style={styles.statusCard}>
          <Text style={styles.bookingIdLabel}>Booking #{bookingId.slice(-8).toUpperCase()}</Text>
          <StatusBadge status={booking.status} />
        </View>

        {/* Service & amount */}
        <View style={styles.card}>
          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceName}>{service.name || '—'}</Text>
              <Text style={styles.serviceCategory}>{service.category || ''}</Text>
            </View>
            <Text style={styles.amount}>₹{booking.totalAmount}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <DetailRow icon="car-outline" label="Vehicle" value={vehicleLabel} />
          <View style={styles.rowDivider} />
          <DetailRow icon="calendar-outline" label="Date" value={formatDate(booking.scheduledDate)} />
          <View style={styles.rowDivider} />
          <DetailRow icon="time-outline" label="Time" value={booking.scheduledTime || '—'} />
          <View style={styles.rowDivider} />
          <DetailRow
            icon="wallet-outline"
            label="Payment"
            value={
              (booking.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay') +
              (booking.payment?.status ? ' · ' + booking.payment.status.toUpperCase() : '')
            }
          />
        </View>

        {/* Cancel section */}
        {canCancel ? (
          <View style={styles.cancelSection}>
            <Text style={styles.cancelSectionTitle}>Cancel Booking</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason for cancellation…"
              placeholderTextColor={colors.textSecondary}
              style={styles.cancelInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Cancellation reason"
            />
            <AppButton
              title="Cancel Booking"
              onPress={() => {
                if (!cancelReason.trim()) {
                  Alert.alert('Required', 'Please provide a reason for cancellation.');
                  return;
                }
                setShowCancelDialog(true);
              }}
              variant="outline"
              style={styles.cancelBtn}
            />
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={showCancelDialog}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmText={cancelling ? 'Cancelling…' : 'Yes, Cancel'}
        cancelText="Keep Booking"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statusCard: {
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
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  bookingIdLabel: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textSecondary),
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serviceName: {
    ...typography.makeTextStyle('lg', 'bold', colors.textPrimary),
    marginBottom: 2,
  },
  serviceCategory: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textTransform: 'capitalize',
  },
  amount: {
    ...typography.makeTextStyle('xl', 'bold', colors.ocean),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  detailIcon: {
    width: 28,
    paddingTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  cancelSection: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelSectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.error),
    marginBottom: spacing.sm,
  },
  cancelInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    minHeight: 80,
    marginBottom: spacing.md,
  },
  cancelBtn: {
    borderColor: colors.error,
  },
});
