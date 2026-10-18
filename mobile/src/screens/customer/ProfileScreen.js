import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : colors.ocean} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {!danger && (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar and user info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          {user?.phone ? (
            <Text style={styles.userPhone}>{user.phone}</Text>
          ) : null}
          <Text style={styles.memberSince}>
            Member since {formatDate(user?.createdAt)}
          </Text>
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          <MenuItem
            icon="pencil-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => navigation.navigate('EditProfile', { changePassword: true })}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="car-outline"
            label="My Vehicles"
            onPress={() => navigation.navigate('HomeTab', { screen: 'MyVehicles' })}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="calendar-outline"
            label="My Bookings"
            onPress={() => navigation.navigate('BookingsTab')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate('NotificationsTab')}
          />
        </View>

        {/* Logout */}
        <View style={styles.menuCard}>
          <MenuItem
            icon="log-out-outline"
            label="Log Out"
            onPress={() => setShowLogout(true)}
            danger
          />
        </View>

        <Text style={styles.version}>PROWASH · Premium Vehicle Cleaning & Care</Text>
      </ScrollView>

      <ConfirmDialog
        visible={showLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        destructive
        onConfirm={logout}
        onCancel={() => setShowLogout(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    backgroundColor: colors.midnight,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.makeTextStyle('xxl', 'bold', colors.white),
  },
  userName: {
    ...typography.makeTextStyle('xxl', 'bold', colors.white),
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  userEmail: {
    ...typography.makeTextStyle('sm', 'regular', colors.softGray),
    marginBottom: 4,
  },
  userPhone: {
    ...typography.makeTextStyle('sm', 'regular', colors.softGray),
    marginBottom: 4,
  },
  memberSince: {
    ...typography.makeTextStyle('xs', 'regular', colors.aqua),
    marginTop: spacing.sm,
  },
  menuCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.softGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconDanger: {
    backgroundColor: '#FFEBEE',
  },
  menuLabel: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
    flex: 1,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  version: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
