import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { changePassword } from '../../services/authService';
import { APP_NAME, TAGLINE } from '../../constants/index';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

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

export default function AdminSettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  const initials = (user?.name || 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const setPwField = (key, value) => {
    setPwForm((prev) => ({ ...prev, [key]: value }));
    if (pwErrors[key]) setPwErrors((prev) => ({ ...prev, [key]: null }));
  };

  const handleChangePassword = async () => {
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Current password is required.';
    if (!pwForm.newPassword || pwForm.newPassword.length < 6)
      errs.newPassword = 'New password must be at least 6 characters.';
    if (pwForm.newPassword !== pwForm.confirmPassword)
      errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      return;
    }
    try {
      setPwLoading(true);
      await changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      Alert.alert('Success', 'Password changed successfully.');
      setShowChangePassword(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      Alert.alert('Error', msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    await logout();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Settings" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.ocean} />
            <Text style={styles.roleText}>Admin</Text>
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="key-outline"
              label="Change Password"
              onPress={() => setShowChangePassword((v) => !v)}
            />
          </View>
        </View>

        {/* Change password form */}
        {showChangePassword ? (
          <View style={styles.passwordForm}>
            <AppInput
              label="Current Password"
              value={pwForm.currentPassword}
              onChangeText={(v) => setPwField('currentPassword', v)}
              secureTextEntry
              error={pwErrors.currentPassword}
              placeholder="Enter current password"
            />
            <AppInput
              label="New Password"
              value={pwForm.newPassword}
              onChangeText={(v) => setPwField('newPassword', v)}
              secureTextEntry
              error={pwErrors.newPassword}
              placeholder="Min. 6 characters"
            />
            <AppInput
              label="Confirm New Password"
              value={pwForm.confirmPassword}
              onChangeText={(v) => setPwField('confirmPassword', v)}
              secureTextEntry
              error={pwErrors.confirmPassword}
              placeholder="Repeat new password"
            />
            <AppButton
              title="Update Password"
              onPress={handleChangePassword}
              loading={pwLoading}
            />
          </View>
        ) : null}

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.menuCard}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.ocean} style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>App Version</Text>
                <Text style={styles.infoValue}>v{APP_VERSION}</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.aboutBlock}>
              <Text style={styles.aboutName}>{APP_NAME}</Text>
              <Text style={styles.aboutTagline}>{TAGLINE}</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuRow
              icon="log-out-outline"
              label="Logout"
              onPress={() => setLogoutVisible(true)}
              danger
            />
          </View>
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
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.midnight,
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
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
  },
  profileEmail: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20,125,171,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.full,
  },
  roleText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.ocean),
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoIcon: {
    width: 32,
  },
  infoLabel: {
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
    marginBottom: 2,
  },
  infoValue: {
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
  },
  aboutBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: 0,
  },
  aboutName: {
    ...typography.makeTextStyle('xl', 'extrabold', colors.midnight),
    letterSpacing: 2,
  },
  aboutTagline: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  passwordForm: {
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
});
