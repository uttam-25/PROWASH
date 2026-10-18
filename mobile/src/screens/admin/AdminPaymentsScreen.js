import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import { getAdminPayments, updatePaymentStatus } from '../../services/paymentService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

const METHOD_LABELS = {
  cod: 'Cash on Delivery',
  razorpay: 'Razorpay',
};

function PaymentRow({ payment, onMarkPaid }) {
  const customer = payment.customer || {};
  const booking = payment.booking || {};
  const serviceName = booking.service?.name || 'Service';

  return (
    <View style={styles.paymentRow}>
      <View style={styles.paymentTop}>
        <View style={styles.methodBadge}>
          <Ionicons
            name={payment.method === 'cod' ? 'cash-outline' : 'card-outline'}
            size={14}
            color={colors.ocean}
          />
          <Text style={styles.methodText}>
            {METHOD_LABELS[payment.method] || payment.method}
          </Text>
        </View>
        <Text style={styles.amount}>₹{payment.amount}</Text>
      </View>

      <Text style={styles.customerName} numberOfLines={1}>
        {customer.name || 'Unknown Customer'}
      </Text>
      <Text style={styles.serviceName} numberOfLines={1}>
        {serviceName}
      </Text>

      <View style={styles.paymentBottom}>
        <Text style={styles.dateText}>
          {payment.createdAt
            ? new Date(payment.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'N/A'}
        </Text>
        <View style={styles.rightActions}>
          <StatusBadge status={payment.status} />
          {payment.status === 'pending' && payment.method === 'cod' ? (
            <TouchableOpacity
              style={styles.markPaidBtn}
              onPress={() => onMarkPaid(payment)}
              accessibilityRole="button"
              accessibilityLabel="Mark as paid"
            >
              <Text style={styles.markPaidText}>Mark Paid</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function AdminPaymentsScreen({ navigation }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [error, setError] = useState(null);

  const loadPayments = useCallback(async (status) => {
    try {
      setError(null);
      const params = {};
      if (status) params.status = status;
      const data = await getAdminPayments(params);
      setPayments(data.data?.payments || data.data || []);
    } catch (err) {
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadPayments(activeFilter);
  }, [activeFilter, loadPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments(activeFilter);
  }, [activeFilter, loadPayments]);

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    setLoading(true);
  };

  const handleMarkPaid = (payment) => {
    Alert.alert(
      'Mark as Paid',
      `Mark this COD payment of ₹${payment.amount} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            try {
              await updatePaymentStatus(payment._id, 'paid');
              setPayments((prev) =>
                prev.map((p) => (p._id === payment._id ? { ...p, status: 'paid' } : p))
              );
            } catch {
              Alert.alert('Error', 'Failed to update payment status.');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Payments"
          showBack
          onBack={() => navigation.goBack()}
        />
        <LoadingView message="Loading payments…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Payments"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterTab,
              activeFilter === f.value && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(f.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${f.label}`}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === f.value && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadPayments(activeFilter)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PaymentRow payment={item} onMarkPaid={handleMarkPaid} />
          )}
          contentContainerStyle={[
            styles.listContent,
            payments.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.ocean]}
              tintColor={colors.ocean}
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="wallet-outline"
              title="No payments found"
              subtitle="Payment records will appear here after bookings are made."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.softGray,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.ocean,
  },
  filterTabText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  paymentRow: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  paymentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,125,171,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: spacing.borderRadius.sm,
  },
  methodText: {
    ...typography.makeTextStyle('xs', 'medium', colors.ocean),
  },
  amount: {
    ...typography.makeTextStyle('lg', 'bold', colors.textPrimary),
  },
  customerName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: 2,
  },
  serviceName: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginBottom: spacing.sm,
  },
  paymentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  markPaidBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
  },
  markPaidText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.white),
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
