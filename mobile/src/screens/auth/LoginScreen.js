import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
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
import { ROLES } from '../../constants/index';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit({ email, password }) {
    setApiError('');
    setSubmitting(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      // Navigate based on role
      if (data?.user?.role === ROLES.ADMIN) {
        navigation.replace('AdminHome');
      } else {
        navigation.replace('CustomerHome');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Login failed. Please check your credentials.';
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
          {/* Header */}
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

          <Text style={styles.heading}>Welcome back</Text>
          <Text style={styles.subheading}>Sign in to continue</Text>

          {/* API error */}
          {apiError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.error}
              />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          ) : null}

          {/* Form */}
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
            name="password"
            rules={{ required: 'Password is required.' }}
            render={({ field: { onChange, value } }) => (
              <AppInput
                label="Password"
                value={value}
                onChangeText={onChange}
                placeholder="Your password"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.password?.message}
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
            accessibilityRole="link"
            accessibilityLabel="Forgot Password"
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <AppButton
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting}
            style={styles.submitBtn}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="link"
            >
              <Text style={styles.registerLink}>Create account</Text>
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.xs,
  },
  forgotText: {
    ...typography.makeTextStyle('sm', 'medium', colors.ocean),
  },
  submitBtn: {
    marginBottom: spacing.lg,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
  },
  registerLink: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
  },
});
