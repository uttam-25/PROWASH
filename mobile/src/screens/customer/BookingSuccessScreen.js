import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date} at ${time}`;
}

export default function BookingSuccessScreen({ route, navigation }) {
  const booking = route.params?.booking || {};
  const vehicle = booking.vehicleId || booking.vehicle || {};
  const service = booking.serviceId || booking.service || {};
  const partner = booking.partnerId && typeof booking.partnerId === 'object'
    ? booking.partnerId
    : null;
  const heading = partner ? 'Partner Assigned!' : 'Booking Request Received';
  const subtitle = partner
    ? 'Your wash is scheduled. Your assigned partner will be there soon.'
    : 'We are finding a nearby partner and will update your booking when one is assigned.';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState(10);
  const [copied, setCopied] = useState(false);

  // Animate checkmark in
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Disable back gesture
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false, headerBackVisible: false });
  }, [navigation]);

  // 10 second countdown then navigate home
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigation.navigate('HomeTab');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigation]);

  const handleCopyRef = async () => {
    if (booking.bookingReference) {
      await Clipboard.setStringAsync(booking.bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleViewDetails = () => {
    navigation.navigate('BookingsTab', {
      screen: 'BookingDetails',
      params: { bookingId: booking._id },
    });
  };

  const handleGoHome = () => {
    navigation.navigate('HomeTab');
  };

  const vehicleLabel = [vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ');
  const plateLabel = vehicle.licensePlate || '';
  const vehicleSummary = [vehicleLabel, plateLabel].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Animated checkmark */}
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </Animated.View>

        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {booking.status ? <StatusBadge status={booking.status} /> : null}

        {/* Booking reference */}
        {booking.bookingReference ? (
          <TouchableOpacity
            style={styles.refRow}
            onPress={handleCopyRef}
            accessibilityRole="button"
            accessibilityLabel="Copy booking reference"
          >
            <Text style={styles.refText}>{booking.bookingReference}</Text>
            <Ionicons
              name={copied ? 'checkmark-outline' : 'copy-outline'}
              size={18}
              color={colors.ocean}
            />
            {copied ? <Text style={styles.copiedText}>Copied!</Text> : null}
          </TouchableOpacity>
        ) : null}

        {/* Details card */}
        <View style={styles.detailCard}>
          {vehicleSummary ? (
            <DetailRow label="Vehicle" value={vehicleSummary} />
          ) : null}
          {service.name ? (
            <DetailRow label="Service" value={service.name} />
          ) : null}
          {booking.startAt ? (
            <DetailRow label="Appointment" value={formatDateTime(booking.startAt)} />
          ) : null}
          {booking.customerLocation?.address ? (
            <DetailRow label="Service address" value={booking.customerLocation.address} />
          ) : null}
          {partner?.name ? <DetailRow label="Partner" value={partner.name} /> : null}
          {partner?.phone ? <DetailRow label="Partner phone" value={partner.phone} /> : null}
          {booking.partnerDistanceKm != null ? (
            <DetailRow
              label="Partner distance"
              value={`${Number(booking.partnerDistanceKm).toFixed(2)} km`}
            />
          ) : null}
          {booking.priceAtBooking != null ? (
            <DetailRow label="Amount" value={`₹${booking.priceAtBooking}`} isHighlight />
          ) : null}
          <DetailRow
            label="Payment"
            value={
              booking.paymentMethod === 'cod'
                ? 'Pay cash at the time of service'
                : 'Online payment required'
            }
          />
        </View>

        {/* Countdown */}
        <Text style={styles.countdown}>
          Auto-redirecting to Home in {countdown}s…
        </Text>

        {/* Actions */}
        <AppButton
          title="View Booking Details"
          onPress={handleViewDetails}
          size="lg"
          style={styles.primaryBtn}
        />
        <AppButton
          title="Go to Home"
          onPress={handleGoHome}
          variant="ghost"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, isHighlight }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, isHighlight && detailStyles.highlight]}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    flex: 1,
  },
  value: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
    flex: 2,
    textAlign: 'right',
  },
  highlight: {
    color: colors.ocean,
  },
});

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
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refText: {
    ...typography.makeTextStyle('md', 'bold', colors.textPrimary),
    fontFamily: 'monospace',
  },
  copiedText: {
    ...typography.makeTextStyle('xs', 'regular', colors.success),
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  countdown: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginBottom: spacing.md,
  },
  primaryBtn: {
    width: '100%',
    marginBottom: spacing.sm,
  },
});
