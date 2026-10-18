import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import * as bookingService from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const PAYMENT_METHODS = [
  {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay in cash when the technician arrives.',
    icon: 'cash-outline',
    enabled: true,
  },
  {
    id: 'razorpay',
    label: 'Razorpay',
    description: 'Requires merchant account setup — coming soon.',
    icon: 'card-outline',
    enabled: false,
  },
];

export default function PaymentScreen({ route, navigation }) {
  const { vehicleId, serviceId, date, time, amount } = route.params;

  const [selectedMethod, setSelectedMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await bookingService.createBooking({
        vehicleId,
        serviceId,
        scheduledDate: date,
        scheduledTime: time,
        paymentMethod: selectedMethod,
      });
      const booking = result.booking || result.data;
      navigation.replace('BookingSuccess', {
        bookingId: booking?._id,
        date,
        time,
        amount,
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Payment" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount summary */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{amount}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>

        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected,
              !method.enabled && styles.methodCardDisabled,
            ]}
            onPress={() => method.enabled && setSelectedMethod(method.id)}
            disabled={!method.enabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedMethod === method.id, disabled: !method.enabled }}
          >
            <View style={styles.methodIcon}>
              <Ionicons
                name={method.icon}
                size={24}
                color={
                  !method.enabled
                    ? colors.textSecondary
                    : selectedMethod === method.id
                    ? colors.ocean
                    : colors.textPrimary
                }
              />
            </View>
            <View style={styles.methodInfo}>
              <Text
                style={[
                  styles.methodLabel,
                  !method.enabled && styles.methodLabelDisabled,
                ]}
              >
                {method.label}
              </Text>
              <Text style={styles.methodDescription}>{method.description}</Text>
            </View>
            {method.enabled && (
              <View
                style={[
                  styles.radioOuter,
                  selectedMethod === method.id && styles.radioOuterSelected,
                ]}
              >
                {selectedMethod === method.id ? (
                  <View style={styles.radioInner} />
                ) : null}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title={`Pay ₹${amount}`}
          onPress={handlePay}
          loading={loading}
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
  amountCard: {
    backgroundColor: colors.midnight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  amountLabel: {
    ...typography.makeTextStyle('sm', 'semibold', colors.softGray),
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    ...typography.makeTextStyle('display', 'bold', colors.aqua),
  },
  sectionTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  methodCardSelected: {
    borderColor: colors.ocean,
  },
  methodCardDisabled: {
    opacity: 0.55,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.softGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: 2,
  },
  methodLabelDisabled: {
    color: colors.textSecondary,
  },
  methodDescription: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioOuterSelected: {
    borderColor: colors.ocean,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ocean,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.makeTextStyle('sm', 'regular', colors.error),
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
