import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function ReviewRow({ icon, label, value }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewIcon}>
        <Ionicons name={icon} size={18} color={colors.ocean} />
      </View>
      <View style={styles.reviewContent}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingReviewScreen({ route, navigation }) {
  const { vehicleId, serviceId, service, vehicle, date, time } = route.params;

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  const vehicleLabel = vehicle
    ? `${vehicle.make} ${vehicle.model}${vehicle.licensePlate ? ' · ' + vehicle.licensePlate : ''}`
    : '—';

  return (
    <View style={styles.container}>
      <AppHeader title="Review Booking" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Booking Summary</Text>

        <View style={styles.card}>
          <ReviewRow icon="sparkles-outline" label="Service" value={service?.name || '—'} />
          <View style={styles.divider} />
          <ReviewRow icon="car-outline" label="Vehicle" value={vehicleLabel} />
          <View style={styles.divider} />
          <ReviewRow icon="calendar-outline" label="Date" value={formattedDate} />
          <View style={styles.divider} />
          <ReviewRow icon="time-outline" label="Time" value={time || '—'} />
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{service?.price ?? 0}</Text>
        </View>

        <Text style={styles.note}>
          You can cancel this booking before it starts. By continuing, you agree to our booking policy.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Confirm & Pay"
          onPress={() =>
            navigation.navigate('Payment', {
              vehicleId,
              serviceId,
              service,
              vehicle,
              date,
              time,
              amount: service?.price ?? 0,
            })
          }
          size="lg"
        />
      </View>
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
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.makeTextStyle('xl', 'bold', colors.textPrimary),
    marginBottom: spacing.md,
  },
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
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  reviewIcon: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  reviewContent: {
    flex: 1,
  },
  reviewLabel: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewValue: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: -spacing.md,
  },
  totalCard: {
    backgroundColor: colors.midnight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  totalLabel: {
    ...typography.makeTextStyle('lg', 'semibold', colors.white),
  },
  totalValue: {
    ...typography.makeTextStyle('xxl', 'bold', colors.aqua),
  },
  note: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
