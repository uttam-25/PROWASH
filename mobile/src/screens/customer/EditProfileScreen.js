import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/authService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function EditProfileScreen({ route, navigation }) {
  const { changePassword: startWithPassword } = route.params || {};
  const { user, login, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.photo || null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const validateProfile = () => {
    const e = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const data = await authService.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        photo: avatar || undefined,
      });
      Alert.alert('Success', 'Profile updated!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    const e = {};
    if (!currentPassword) e.currentPassword = 'Current password is required.';
    if (!newPassword || newPassword.length < 6) e.newPassword = 'New password must be at least 6 characters.';
    if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    setPwLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      Alert.alert('Success', 'Password changed. Please log in again.', [
        { text: 'OK', onPress: logout },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Edit Profile" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} accessibilityRole="button" activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{getInitials(name || user?.name)}</Text>
              )}
              <View style={styles.avatarEdit}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Profile fields */}
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <AppInput
          label="Full Name *"
          value={name}
          onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }}
          placeholder="Your full name"
          error={errors.name}
          autoCapitalize="words"
          leftIcon="person-outline"
        />
        <AppInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 9876543210"
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />
        <AppInput
          label="Email"
          value={user?.email || ''}
          editable={false}
          placeholder=""
          leftIcon="mail-outline"
        />

        <AppButton
          title="Save Profile"
          onPress={handleSaveProfile}
          loading={loading}
          style={styles.saveBtn}
        />

        {/* Change password */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Change Password</Text>
        <AppInput
          label="Current Password"
          value={currentPassword}
          onChangeText={(v) => { setCurrentPassword(v); setPwErrors((e) => ({ ...e, currentPassword: undefined })); }}
          placeholder="Enter current password"
          secureTextEntry
          error={pwErrors.currentPassword}
          leftIcon="lock-closed-outline"
        />
        <AppInput
          label="New Password"
          value={newPassword}
          onChangeText={(v) => { setNewPassword(v); setPwErrors((e) => ({ ...e, newPassword: undefined })); }}
          placeholder="At least 6 characters"
          secureTextEntry
          error={pwErrors.newPassword}
          leftIcon="lock-open-outline"
        />
        <AppInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); setPwErrors((e) => ({ ...e, confirmPassword: undefined })); }}
          placeholder="Repeat new password"
          secureTextEntry
          error={pwErrors.confirmPassword}
          leftIcon="lock-open-outline"
        />
        <AppButton
          title="Change Password"
          onPress={handleChangePassword}
          loading={pwLoading}
          variant="outline"
          style={styles.pwBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarInitials: {
    ...typography.makeTextStyle('xxl', 'bold', colors.white),
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  pwBtn: {
    marginTop: spacing.sm,
  },
});
