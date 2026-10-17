import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export default function EmptyState({
  iconName = 'folder-open-outline',
  title = 'Nothing here yet',
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.container}>
      <Ionicons name={iconName} size={72} color={colors.softGray} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.cloud,
  },
  title: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
});
