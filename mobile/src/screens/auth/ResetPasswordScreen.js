import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import * as authService from '../../services/authService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

export default function ResetPasswordScreen({ route, navigation }) {
  // Token comes from deep-link: prowash://reset-password/:token
  const resetToken = route?.params?.token || '';

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { password: '', confirmPassword: '' } });

  const passwordValue = watch('password');

  async function onSubmit({ password }) {
    if (!resetToken) {
      setApiError('Invalid or missing reset token. Please request a new link.');
      return;
    }
    setApiError('');
    setSubmitting(true);
    try {
      await authService.resetPassword(resetToken, password);
      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Password reset failed. The link may have expired.';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconArea}>
            <Ionicons name="lock-open-outline" size={52} color={colors.ocean} />
          </View>

          <Text style={styles.heading}>Reset Password</Text>
          <Text style={styles.subheading}>
            Enter your new password below. Make it strong!
          </Text>

          {success ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={styles.successText}>
                Password reset successfully! You can now sign in with your new
                password.
              </Text>
            </View>
          ) : (
            <>
              {apiError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              ) : null}

              <Controller
                control={control}
                name="password"
                rules={{
                  required: 'New password is required.',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters.',
                  },
                  validate: (v) =>
                    (/[A-Z]/.test(v) && /\d/.test(v)) ||
                    'Password must have one uppercase letter and one number.',
                }}
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="New Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    secureTextEntry
                    leftIcon="lock-closed-outline"
                    error={errors.password?.message}
                    returnKeyType="next"
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                rules={{
                  required: 'Please confirm your password.',
                  validate: (v) =>
                    v === passwordValue || 'Passwords do not match.',
                }}
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Confirm New Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Re-enter new password"
                    secureTextEntry
                    leftIcon="lock-closed-outline"
                    error={errors.confirmPassword?.message}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />

              <AppButton
                title="Reset Password"
                onPress={handleSubmit(onSubmit)}
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={submitting}
                style={styles.submitBtn}
              />
            </>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
            accessibilityRole="link"
          >
            <Text style={styles.loginLinkText}>
              {success ? 'Go to Sign In' : 'Back to Sign In'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  iconArea: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(20,125,171,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heading: {
    ...typography.makeTextStyle('xxxl', 'bold', colors.textPrimary),
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(46,125,50,0.1)',
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  successText: {
    ...typography.makeTextStyle('md', 'regular', colors.success),
    flex: 1,
    lineHeight: 22,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198,40,40,0.08)',
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.makeTextStyle('sm', 'regular', colors.error),
    flex: 1,
  },
  submitBtn: {
    marginBottom: spacing.lg,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loginLinkText: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
  },
});
