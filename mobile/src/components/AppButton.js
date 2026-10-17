import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

const variantStyles = {
  primary: {
    bg: colors.ocean,
    text: colors.white,
    border: colors.ocean,
  },
  secondary: {
    bg: colors.midnight,
    text: colors.white,
    border: colors.midnight,
  },
  outline: {
    bg: 'transparent',
    text: colors.ocean,
    border: colors.ocean,
  },
  ghost: {
    bg: 'transparent',
    text: colors.ocean,
    border: 'transparent',
  },
};

const sizeStyles = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: typography.fontSizes.sm },
  md: { paddingVertical: 14, paddingHorizontal: spacing.lg, fontSize: typography.fontSizes.md },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: typography.fontSizes.lg },
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const v = variantStyles[variant] || variantStyles.primary;
  const s = sizeStyles[size] || sizeStyles.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={v.text}
          size="small"
          accessibilityLabel="Loading"
        />
      ) : (
        <Text
          style={[
            styles.label,
            { color: v.text, fontSize: s.fontSize },
            textStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
});
