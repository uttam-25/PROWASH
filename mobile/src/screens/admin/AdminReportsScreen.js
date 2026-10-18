import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const STATUS_BAR_COLORS = {
  pending: colors.warning,
  confirmed: colors.ocean,
  in_progress: colors.aqua,
  completed: colors.success,
  cancelled: colors.error,
};

function StatCard({ icon, label, value, sub }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={22} color={colors.ocean} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function AdminReportsScreen({ navigation }) {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadReports = useCallback(async () => {
    try {
      setError(null);
      const response = await adminService.getReports();
      setReports(response?.data || response);
    } catch (err) {
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [loadReports]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Reports"
          showBack
          onBack={() => navigation.goBack()}
        />
        <LoadingView message="Loading reports…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Reports"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadReports}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Extract data with safe defaults
  const totalBookings = reports?.totalBookings ?? 0;
  const totalRevenue = reports?.totalRevenue ?? 0;
  const todayAppointments = reports?.todayAppointments ?? 0;
  const monthRevenue = reports?.thisMonthRevenue ?? 0;
  const totalCustomers = reports?.totalCustomers ?? 0;
  const bookingsByStatus = reports?.bookingsByStatus || {};
  const recentBookingsList = (reports?.recentBookings || []).slice(0, 10);
  const monthlyRevenue = reports?.monthlyRevenue || [];
  const bookingsByVehicleType = reports?.bookingsByVehicleType || { Car: 0, Bike: 0, Scooty: 0 };
  const bookingsByService = (reports?.bookingsByService || []).slice(0, 5);

  // Normalize bookingsByStatus
  let statusBreakdown = [];
  if (Array.isArray(bookingsByStatus)) {
    statusBreakdown = bookingsByStatus.map((item) => ({
      status: item._id || item.status,
      count: item.count || 0,
    }));
  } else if (typeof bookingsByStatus === 'object') {
    statusBreakdown = Object.entries(bookingsByStatus).map(([status, count]) => ({
      status,
      count,
    }));
  }

  const completedBookings =
    statusBreakdown.find((s) => s.status === 'completed')?.count ??
    (bookingsByStatus?.completed || 0);
  const cancelledBookings =
    statusBreakdown.find((s) => s.status === 'cancelled')?.count ??
    (bookingsByStatus?.cancelled || 0);

  const maxCount = statusBreakdown.reduce((m, s) => Math.max(m, s.count), 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Reports"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.ocean]}
            tintColor={colors.ocean}
          />
        }
      >
        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar-outline"
            label="Total Bookings"
            value={totalBookings}
          />
          <StatCard
            icon="cash-outline"
            label="Total Revenue"
            value={`₹${Number(totalRevenue).toLocaleString('en-IN')}`}
          />
          <StatCard
            icon="today-outline"
            label="Today's Bookings"
            value={todayAppointments}
          />
          <StatCard
            icon="trending-up-outline"
            label="This Month"
            value={`₹${Number(monthRevenue).toLocaleString('en-IN')}`}
            sub="Revenue"
          />
          <StatCard
            icon="people-outline"
            label="Total Customers"
            value={totalCustomers}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Completed"
            value={completedBookings}
          />
          <StatCard
            icon="close-circle-outline"
            label="Cancelled"
            value={cancelledBookings}
          />
        </View>

        {/* Status bar chart */}
        {statusBreakdown.length > 0 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Bookings by Status</Text>
            {statusBreakdown.map(({ status, count }) => {
              const barColor = STATUS_BAR_COLORS[status] || colors.textSecondary;
              const barFlex = Math.max(count, 0);
              const emptyFlex = Math.max(maxCount - count, 0);
              return (
                <View key={status} style={styles.barRow} accessibilityRole="text">
                  <Text style={styles.barLabel}>
                    {(status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <View style={styles.barTrack}>
                    {barFlex > 0 ? (
                      <View
                        style={[styles.barFill, { flex: barFlex, backgroundColor: barColor }]}
                      />
                    ) : null}
                    {emptyFlex > 0 ? (
                      <View style={[styles.barEmpty, { flex: emptyFlex }]} />
                    ) : null}
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Monthly Revenue chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly Revenue</Text>
          {monthlyRevenue.length === 0 ? (
            <Text style={styles.emptyText}>No monthly data yet.</Text>
          ) : (
            (() => {
              const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
              return monthlyRevenue.map((item) => {
                const barFlex = item.revenue / maxRevenue;
                const emptyFlex = 1 - barFlex;
                return (
                  <View key={item.month} style={styles.barRow} accessibilityRole="text">
                    <Text style={styles.barLabel}>{item.month}</Text>
                    <View style={styles.barTrack}>
                      {barFlex > 0 ? (
                        <View
                          style={[
                            styles.barFill,
                            { flex: barFlex, backgroundColor: colors.ocean },
                          ]}
                        />
                      ) : null}
                      {emptyFlex > 0 ? (
                        <View style={[styles.barEmpty, { flex: emptyFlex }]} />
                      ) : null}
                    </View>
                    <View style={styles.revenueValueWrap}>
                      <Text style={styles.barCount}>
                        ₹{Number(item.revenue).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.barSubCount}>{item.bookings} bookings</Text>
                    </View>
                  </View>
                );
              });
            })()
          )}
        </View>

        {/* Bookings by Vehicle Type */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Bookings by Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            {[
              { key: 'Car', icon: 'car-outline' },
              { key: 'Bike', icon: 'bicycle-outline' },
              { key: 'Scooty', icon: 'speedometer-outline' },
            ].map(({ key, icon }) => (
              <View key={key} style={styles.vehicleChip}>
                <Ionicons name={icon} size={22} color={colors.ocean} />
                <Text style={styles.vehicleChipCount}>
                  {bookingsByVehicleType[key] ?? 0}
                </Text>
                <Text style={styles.vehicleChipLabel}>{key}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Services */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top Services</Text>
          {bookingsByService.length === 0 ? (
            <Text style={styles.emptyText}>No service data yet.</Text>
          ) : (
            bookingsByService.map((item, idx) => (
              <View key={item.serviceName || idx} style={styles.serviceRow}>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {item.serviceName}
                </Text>
                <Text style={styles.serviceStats}>
                  {item.count} bookings | ₹{Number(item.revenue).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Recent bookings */}
        {recentBookingsList.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {recentBookingsList.map((b) => (
              <BookingCard key={b._id} booking={b} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '43%',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20,125,171,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.makeTextStyle('xxl', 'bold', colors.textPrimary),
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'center',
  },
  statSub: {
    ...typography.makeTextStyle('xs', 'regular', colors.ocean),
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  chartTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barLabel: {
    width: 90,
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
  },
  barTrack: {
    flex: 1,
    height: 16,
    flexDirection: 'row',
    borderRadius: spacing.borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.softGray,
  },
  barFill: {
    borderRadius: spacing.borderRadius.sm,
  },
  barEmpty: {
    backgroundColor: 'transparent',
  },
  barCount: {
    width: 28,
    textAlign: 'right',
    ...typography.makeTextStyle('xs', 'semibold', colors.textPrimary),
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  revenueValueWrap: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  barSubCount: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'right',
  },
  emptyText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  vehicleChip: {
    flex: 1,
    backgroundColor: colors.cloud,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  vehicleChipCount: {
    ...typography.makeTextStyle('xl', 'bold', colors.textPrimary),
  },
  vehicleChipLabel: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  serviceName: {
    flex: 1,
    ...typography.makeTextStyle('sm', 'medium', colors.textPrimary),
  },
  serviceStats: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'right',
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
