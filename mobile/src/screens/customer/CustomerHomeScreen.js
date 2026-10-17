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

function SectionPlaceholder({ title, icon }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.ocean} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Coming in Phase 2</Text>
      </View>
    </View>
  );
}

export default function CustomerHomeScreen() {
  const { user, logout } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'Customer'}
          </Text>
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

      {/* Welcome card */}
      <View style={styles.heroCard}>
        <Ionicons name="car-sport" size={36} color={colors.aqua} />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Book a Wash</Text>
          <Text style={styles.heroSub}>
            Professional cleaning at your doorstep.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionPlaceholder title="Your Vehicles" icon="car-outline" />
        <SectionPlaceholder title="Recent Bookings" icon="calendar-outline" />
        <SectionPlaceholder title="Our Services" icon="sparkles-outline" />
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
  greeting: {
    ...typography.makeTextStyle('sm', 'regular', colors.aqua),
  },
  userName: {
    ...typography.makeTextStyle('xl', 'bold', colors.white),
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ocean,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    elevation: 4,
    shadowColor: colors.ocean,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    ...typography.makeTextStyle('lg', 'bold', colors.white),
  },
  heroSub: {
    ...typography.makeTextStyle('sm', 'regular', 'rgba(255,255,255,0.8)'),
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
  },
  placeholder: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
  },
});
