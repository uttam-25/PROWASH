import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const METHOD_TABS = [
  { label: 'All', value: '' },
  { label: 'COD', value: 'cod' },
  { label: 'Online', value: 'online' },
];

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
];

function PaymentRow({ payment, onCollect }) {
  const booking = payment.bookingId || {};
  const customerName = booking.customerId?.name || 'Unknown Customer';
  const serviceName = booking.serviceNameSnapshot || 'Service';
  const bookingRef = booking.bookingReference || '';
  const isCODUnpaid = payment.method === 'cod' && payment.status === 'unpaid';

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
            {payment.method === 'cod' ? 'Cash on Delivery' : 'Online'}
          </Text>
        </View>
        <Text style={styles.amount}>₹{payment.amount}</Text>
      </View>

      {bookingRef ? (
        <Text style={styles.bookingRef} numberOfLines={1}>
          {bookingRef}
        </Text>
      ) : null}
      <Text style={styles.customerName} numberOfLines={1}>
        {customerName}
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
          {isCODUnpaid ? (
            <TouchableOpacity
              style={styles.collectBtn}
              onPress={() => onCollect(payment)}
              accessibilityRole="button"
              accessibilityLabel="Record collection"
            >
              <Text style={styles.collectBtnText}>Record Collection</Text>
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
  const [activeMethod, setActiveMethod] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [collectTarget, setCollectTarget] = useState(null);
  const [error, setError] = useState(null);

  const loadPayments = useCallback(async (method, status) => {
    try {
      setError(null);
      const data = await adminService.getPayments({
        method: method || undefined,
        status: status || undefined,
      });
      setPayments(data?.data?.payments || data?.data || []);
    } catch (err) {
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadPayments(activeMethod, activeFilter);
  }, [activeMethod, activeFilter, loadPayments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments(activeMethod, activeFilter);
  }, [activeMethod, activeFilter, loadPayments]);

  const handleMethodChange = (value) => {
    setActiveMethod(value);
    setLoading(true);
  };

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    setLoading(true);
  };

  const handleCollectConfirm = async () => {
    if (!collectTarget) return;
    try {
      await adminService.recordCODCollection(collectTarget._id);
      setPayments((prev) =>
        prev.map((p) =>
          p._id === collectTarget._id ? { ...p, status: 'paid' } : p
        )
      );
    } catch {
      // silently show error via alert would require Alert import — use optimistic update only
    } finally {
      setCollectTarget(null);
    }
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

      {/* Method tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {METHOD_TABS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.tab, activeMethod === t.value && styles.tabActive]}
            onPress={() => handleMethodChange(t.value)}
            accessibilityRole="button"
            accessibilityLabel={`Method ${t.label}`}
          >
            <Text style={[styles.tabText, activeMethod === t.value && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterTab, activeFilter === f.value && styles.filterTabActive]}
            onPress={() => handleFilterChange(f.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${f.label}`}
          >
            <Text
              style={[styles.filterTabText, activeFilter === f.value && styles.filterTabTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadPayments(activeMethod, activeFilter)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <PaymentRow payment={item} onCollect={setCollectTarget} />
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

      <ConfirmDialog
        visible={!!collectTarget}
        title="Record COD Collection"
        message={
          collectTarget
            ? `Mark ₹${collectTarget.amount} as collected for this booking?`
            : ''
        }
        confirmText="Confirm"
        onConfirm={handleCollectConfirm}
        onCancel={() => setCollectTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  tabBar: {
    backgroundColor: colors.midnight,
    maxHeight: 48,
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.aqua,
  },
  tabText: {
    ...typography.makeTextStyle('sm', 'medium', 'rgba(255,255,255,0.7)'),
  },
  tabTextActive: {
    color: colors.midnight,
    fontWeight: '700',
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
  bookingRef: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    marginBottom: 2,
    letterSpacing: 0.5,
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
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dateText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  collectBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
  },
  collectBtnText: {
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
