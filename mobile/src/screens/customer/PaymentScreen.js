import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import * as paymentService from '../../services/paymentService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

export default function PaymentScreen({ route, navigation }) {
  const { bookingId, bookingReference, amount, serviceName } = route.params || {};

  const [screenState, setScreenState] = useState('loading');
  const [orderData, setOrderData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initPayment() {
      setScreenState('loading');
      try {
        const result = await paymentService.createRazorpayOrder(bookingId);
        if (cancelled) return;
        setOrderData(result.data);
        setScreenState('ready');
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        if (status === 503 || code === 'RAZORPAY_NOT_CONFIGURED') {
          setScreenState('cod_fallback');
        } else {
          setErrorMessage(
            err?.response?.data?.message || 'Something went wrong. Please try again.'
          );
          setScreenState('error');
        }
      }
    }

    initPayment();
    return () => { cancelled = true; };
  }, [bookingId, retryCount]);

  if (screenState === 'loading') {
    return <LoadingView message="Preparing payment…" />;
  }

  if (screenState === 'error') {
    return (
      <View style={styles.container}>
        <AppHeader title="Payment" showBack onBack={() => navigation.goBack()} />
        <ErrorView
          message={errorMessage}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
      </View>
    );
  }

  if (screenState === 'cod_fallback') {
    return (
      <View style={styles.container}>
        <AppHeader title="Booking Confirmed" showBack={false} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successIconRow}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={44} color={colors.white} />
            </View>
          </View>

          <Text style={styles.refLabel}>Booking Reference</Text>
          <Text style={styles.refValue}>{bookingReference}</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoServiceName}>{serviceName}</Text>
            <Text style={styles.infoAmount}>Amount due: ₹{amount}</Text>
            <Text style={styles.infoMessage}>
              Your booking is confirmed. Please pay cash when the technician arrives.
            </Text>
          </View>

          <AppButton
            title="View My Bookings"
            onPress={() => navigation.navigate('BookingsTab')}
            size="lg"
            style={styles.actionBtn}
          />
        </ScrollView>
      </View>
    );
  }

  // screenState === 'ready'
  const orderId = orderData?.orderId;

  return (
    <View style={styles.container}>
      <AppHeader title="Complete Payment" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>₹{amount}</Text>
        </View>

        <Text style={styles.refLabel}>Booking Reference</Text>
        <Text style={styles.refValue}>{bookingReference}</Text>

        <Text style={styles.serviceNameText}>{serviceName}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoMessage}>
            Tap 'Pay Now' to open the Razorpay checkout.
          </Text>
        </View>

        <View style={styles.devNoteBox}>
          <Text style={styles.devNoteText}>
            Development mode: react-native-razorpay is not installed.{'\n'}
            Order ID: {orderId}
          </Text>
        </View>

        <AppButton
          title="View My Bookings"
          onPress={() => navigation.navigate('BookingsTab')}
          size="lg"
          style={styles.actionBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  // COD fallback success icon
  successIconRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shared ref styles
  refLabel: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    alignSelf: 'center',
  },
  refValue: {
    ...typography.makeTextStyle('xl', 'bold', colors.textPrimary),
    marginBottom: spacing.lg,
    alignSelf: 'center',
    textAlign: 'center',
  },
  // Info card (COD fallback body / ready body)
  infoCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    alignItems: 'center',
  },
  infoServiceName: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  infoAmount: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
    marginBottom: spacing.md,
  },
  infoMessage: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textAlign: 'center',
  },
  // Ready state amount card
  amountCard: {
    width: '100%',
    backgroundColor: colors.midnight,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  serviceNameText: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  // Dev note box
  devNoteBox: {
    width: '100%',
    backgroundColor: '#FFFDE7',
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FFF176',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  devNoteText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    width: '100%',
  },
});
