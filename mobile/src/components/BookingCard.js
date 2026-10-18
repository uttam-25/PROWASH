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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BookingCard({ booking, onPress }) {
  if (!booking) return null;

  const {
    service,
    vehicle,
    scheduledDate,
    scheduledTime,
    status,
    totalAmount,
  } = booking;

  const serviceName = service?.name || 'Unknown Service';
  const vehicleLabel = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${serviceName}, ${vehicleLabel}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
        <Text style={styles.amount}>₹{totalAmount}</Text>
      </View>

      <View style={styles.vehicleRow}>
        <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.vehicleText} numberOfLines={1}>{vehicleLabel}</Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.dateText}>{formatDate(scheduledDate)}</Text>
          {scheduledTime ? (
            <>
              <Text style={styles.separator}>·</Text>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.dateText}>{scheduledTime}</Text>
            </>
          ) : null}
        </View>
        <StatusBadge status={status} />
      </View>
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
    marginBottom: spacing.sm,
  },
  vehicleText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
