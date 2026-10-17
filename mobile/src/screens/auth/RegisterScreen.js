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
import { useAuth } from '../../hooks/useAuth';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  async function onSubmit({ name, email, phone, password }) {
    setApiError('');
    setSubmitting(true);
    try {
      // Role is always 'customer' — never exposed to the user
      await register({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password });
      navigation.replace('CustomerHome');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Registration failed. Please try again.';
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

          <View style={styles.logoArea}>
            <Ionicons name="car-sport" size={40} color={colors.ocean} />
            <Text style={styles.brand}>PROWASH</Text>
          </View>

          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Join PROWASH today</Text>

          {apiError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="name"
            rules={{
              required: 'Full name is required.',
              minLength: { value: 2, message: 'Name must be at least 2 characters.' },
            }}
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Full Name"
                value={value}
                onChangeText={onChange}
                placeholder="Your full name"
                leftIcon="person-outline"
                error={errors.name?.message}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
          />

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
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="phone"
            rules={{
              required: 'Phone number is required.',
              pattern: {
                value: /^(\+91|0)?[6-9]\d{9}$/,
                message: 'Enter a valid 10-digit mobile number.',
              },
            }}
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Mobile Number"
                value={value}
                onChangeText={onChange}
                placeholder="9876543210"
                keyboardType="phone-pad"
                leftIcon="call-outline"
                error={errors.phone?.message}
                returnKeyType="next"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required.',
              minLength: { value: 8, message: 'Password must be at least 8 characters.' },
              validate: (v) =>
                (/[A-Z]/.test(v) && /\d/.test(v)) ||
                'Password must have one uppercase letter and one number.',
            }}
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Password"
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
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                placeholder="Re-enter your password"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.confirmPassword?.message}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <AppButton
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting}
            style={styles.submitBtn}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="link"
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  brand: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.midnight,
    letterSpacing: 2,
  },
  heading: {
    ...typography.makeTextStyle('xxxl', 'bold', colors.textPrimary),
    marginBottom: spacing.xs,
  },
  subheading: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    marginBottom: spacing.xl,
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
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
  },
  loginLink: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
  },
});
