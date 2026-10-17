import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const STATS = [
  { label: 'Bookings Today', icon: 'calendar-outline', value: '--' },
  { label: 'Pending', icon: 'time-outline', value: '--' },
  { label: 'Revenue', icon: 'cash-outline', value: '--' },
  { label: 'Customers', icon: 'people-outline', value: '--' },
];

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

export default function AdminHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.badge}>Admin</Text>
          <Text style={styles.heading}>Dashboard</Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={styles.logoutBtn}
          accessibilityLabel="Logout"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </View>

        {/* Phase 2 notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.ocean} />
          <Text style={styles.noticeText}>
            Full admin features — bookings, customers, services, payments, and
            reports — will be available in Phase 2.
          </Text>
        </View>
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
  logoutBtn: {
    padding: spacing.sm,
  },
  scrollContent: {
    padding: spacing.lg,
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(20,125,171,0.08)',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    flex: 1,
    lineHeight: 20,
  },
});
