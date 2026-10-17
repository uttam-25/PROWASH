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

export default function ForgotPasswordScreen({ navigation }) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '' } });

  async function onSubmit({ email }) {
    setApiError('');
    setSubmitting(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Unable to send reset link. Please try again.';
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconArea}>
            <Ionicons name="key-outline" size={56} color={colors.ocean} />
          </View>

          <Text style={styles.heading}>Forgot Password?</Text>
          <Text style={styles.subheading}>
            Enter your registered email address and we'll send you a link to
            reset your password.
          </Text>

          {success ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={styles.successText}>
                Check your inbox! A reset link has been sent to your email.
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
                name="email"
                rules={{
                  required: 'Email is required.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address.',
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <AppInput
                    label="Email Address"
                    value={value}
                    onChangeText={onChange}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    leftIcon="mail-outline"
                    error={errors.email?.message}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />

              <AppButton
                title="Send Reset Link"
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
            style={styles.backToLogin}
            accessibilityRole="link"
          >
            <Ionicons name="arrow-back-outline" size={16} color={colors.ocean} />
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
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
    paddingTop: spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    padding: spacing.xs,
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
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  backToLoginText: {
    ...typography.makeTextStyle('md', 'medium', colors.ocean),
  },
});
