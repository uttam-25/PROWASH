import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

function formatDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function BookingCard({ booking, onPress }) {
  if (!booking) return null;

  // Support both old field names (scheduledDate/totalAmount) and new (startAt/priceAtBooking)
  const service = booking.service || booking.serviceId || {};
  const vehicle = booking.vehicle || booking.vehicleId || {};
  const startAt = booking.startAt || booking.scheduledDate;
  const amount = booking.priceAtBooking ?? booking.totalAmount;
  const { status } = booking;

  const serviceName = service?.name || booking.serviceNameSnapshot || 'Unknown Service';
  const vehicleLabel = vehicle
    ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle'
    : 'Unknown Vehicle';

  const bookingRef = booking.bookingReference
    ? booking.bookingReference
    : '#' + (booking._id || '').slice(-8).toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${serviceName}, ${vehicleLabel}`}
    >
      {/* Reference + status */}
      <View style={styles.topRow}>
        <Text style={styles.refText} numberOfLines={1}>{bookingRef}</Text>
        <StatusBadge status={status} />
      </View>

      {/* Service name + amount */}
      <View style={styles.serviceRow}>
        <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
        {amount != null ? (
          <Text style={styles.amount}>₹{amount}</Text>
        ) : null}
      </View>

      {/* Vehicle */}
      <View style={styles.vehicleRow}>
        <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.vehicleText} numberOfLines={1}>{vehicleLabel}</Text>
      </View>

      {/* Date & time */}
      {startAt ? (
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(startAt)}</Text>
          <Text style={styles.separator}>·</Text>
          <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.dateText}>{formatTime(startAt)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  refText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    letterSpacing: 0.5,
    flex: 1,
    marginRight: spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  serviceName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    ...typography.makeTextStyle('md', 'bold', colors.ocean),
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  vehicleText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  separator: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
});
