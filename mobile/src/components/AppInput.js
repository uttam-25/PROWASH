import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  leftIcon,
  rightIcon,
  multiline = false,
  style,
  inputStyle,
  editable = true,
  autoCapitalize = 'none',
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  ...rest
}) {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.ocean
    : colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          { borderColor },
          !editable && styles.disabled,
        ]}
      >
        {leftIcon ? (
          <View style={styles.iconLeft}>
            <Ionicons
              name={leftIcon}
              size={18}
              color={focused ? colors.ocean : colors.textSecondary}
            />
          </View>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            (rightIcon || secureTextEntry) ? styles.inputWithRight : null,
            multiline && styles.multiline,
            inputStyle,
          ]}
          accessibilityLabel={label || placeholder}
          {...rest}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setSecure((s) => !s)}
            style={styles.iconRight}
            accessibilityLabel={secure ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.iconRight}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.makeTextStyle('sm', 'medium', colors.textPrimary),
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderRadius: spacing.borderRadius.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
  },
  inputWithLeft: {
    paddingLeft: spacing.sm,
  },
  inputWithRight: {
    paddingRight: spacing.sm,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
  iconLeft: {
    paddingLeft: spacing.md,
  },
  iconRight: {
    paddingRight: spacing.md,
  },
  error: {
    ...typography.makeTextStyle('xs', 'regular', colors.error),
    marginTop: spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
});
