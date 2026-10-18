import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function MenuRow({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? colors.error : colors.ocean}
        />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
        {label}
      </Text>
      {!danger ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function AdminMoreScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const initials = (user?.name || 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="More" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile mini-card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Navigation menu */}
        <View style={styles.menuCard}>
          <MenuRow
            icon="calendar-outline"
            label="Calendar"
            onPress={() => navigation.navigate('AdminCalendar')}
          />
          <Divider />
          <MenuRow
            icon="clipboard-outline"
            label="Schedule"
            onPress={() => navigation.navigate('AdminSchedule')}
          />
          <Divider />
          <MenuRow
            icon="car-outline"
            label="Vehicles"
            onPress={() => navigation.navigate('AdminVehicles')}
          />
          <Divider />
          <MenuRow
            icon="card-outline"
            label="Payments"
            onPress={() => navigation.navigate('AdminPayments')}
          />
          <Divider />
          <MenuRow
            icon="bar-chart-outline"
            label="Reports"
            onPress={() => navigation.navigate('AdminReports')}
          />
          <Divider />
          <MenuRow
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('AdminSettings')}
          />
        </View>

        {/* Logout */}
        <View style={styles.menuCard}>
          <MenuRow
            icon="log-out-outline"
            label="Logout"
            onPress={() => setLogoutVisible(true)}
            danger
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={logoutVisible}
        title="Logout"
        message="Are you sure you want to logout from the admin panel?"
        confirmText="Logout"
        onConfirm={handleLogout}
        onCancel={() => setLogoutVisible(false)}
        destructive
      />
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.midnight,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.makeTextStyle('lg', 'bold', colors.white),
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.makeTextStyle('md', 'semibold', colors.white),
  },
  profileEmail: {
    ...typography.makeTextStyle('sm', 'regular', 'rgba(255,255,255,0.65)'),
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: 'rgba(20,125,171,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: 'rgba(198,40,40,0.1)',
  },
  menuLabel: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
    flex: 1,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});
