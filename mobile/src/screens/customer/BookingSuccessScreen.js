import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BookingSuccessScreen({ route, navigation }) {
  const { bookingId, date, time, amount } = route.params || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Success icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>

        <Text style={styles.heading}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Your wash has been scheduled. We'll see you soon!</Text>

        {/* Booking details card */}
        <View style={styles.detailCard}>
          {bookingId ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking ID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>#{bookingId.slice(-8).toUpperCase()}</Text>
            </View>
          ) : null}
          {date ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(date)}</Text>
            </View>
          ) : null}
          {time ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>{time}</Text>
            </View>
          ) : null}
          {amount ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailValue, styles.amountText]}>₹{amount}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <AppButton
            title="View My Bookings"
            onPress={() => navigation.navigate('BookingsTab')}
            size="lg"
            style={styles.primaryBtn}
          />
          <AppButton
            title="Go Home"
            onPress={() => navigation.navigate('HomeTab')}
            variant="ghost"
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconCircle: {
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.makeTextStyle('xxxl', 'bold', colors.textPrimary),
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 280,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  detailValue: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    color: colors.ocean,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryBtn: {
    marginBottom: spacing.sm,
  },
});
