import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import api from '../../services/api';
import { getAdminBookings } from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function StatCard({ label, icon, value }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={22} color={colors.ocean} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayBookings: '--',
    pending: '--',
    revenue: '--',
    customers: '--',
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [reportsRes, bookingsRes] = await Promise.allSettled([
        api.get('/admin/reports'),
        getAdminBookings({ limit: 5 }),
      ]);

      if (reportsRes.status === 'fulfilled') {
        const data = reportsRes.value.data?.data || reportsRes.value.data || {};
        setStats({
          todayBookings: data.todayBookings ?? 0,
          pending: data.bookingsByStatus?.pending ?? 0,
          revenue: `₹${Number(data.thisMonthRevenue ?? data.totalRevenue ?? 0).toLocaleString('en-IN')}`,
          customers: data.totalCustomers ?? 0,
        });
      }

      if (bookingsRes.status === 'fulfilled') {
        const list = bookingsRes.value.data?.bookings || bookingsRes.value.data || [];
        setRecentBookings(Array.isArray(list) ? list.slice(0, 5) : []);
      }
    } catch {
      // leave stats as placeholders
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [loadDashboard]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.badge}>Admin</Text>
            <Text style={styles.heading}>Dashboard</Text>
          </View>
        </View>
        <LoadingView message="Loading dashboard…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.badge}>Admin</Text>
          <Text style={styles.heading}>Dashboard</Text>
        </View>
      </View>

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
        {/* Admin info card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.ocean} />
          <View style={styles.infoText}>
            <Text style={styles.infoName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.infoEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Bookings Today"
            icon="calendar-outline"
            value={stats.todayBookings}
          />
          <StatCard
            label="Pending"
            icon="time-outline"
            value={stats.pending}
          />
          <StatCard
            label="Revenue"
            icon="cash-outline"
            value={stats.revenue}
          />
          <StatCard
            label="Customers"
            icon="people-outline"
            value={stats.customers}
          />
        </View>

        {/* Recent bookings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('BookingsTab')}
            accessibilityRole="button"
            accessibilityLabel="View all bookings"
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentBookings.length > 0 ? (
          recentBookings.map((b) => <BookingCard key={b._id} booking={b} />)
        ) : (
          <View style={styles.noBookings}>
            <Text style={styles.noBookingsText}>No recent bookings.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.midnight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  badge: {
    ...typography.makeTextStyle('xs', 'semibold', colors.aqua),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heading: {
    ...typography.makeTextStyle('xl', 'bold', colors.white),
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  infoText: {
    flex: 1,
  },
  infoName: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
  },
  infoEmail: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  seeAll: {
    ...typography.makeTextStyle('sm', 'semibold', colors.ocean),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '43%',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statIcon: {
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
  },
  statLabel: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'center',
  },
  noBookings: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noBookingsText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
});
