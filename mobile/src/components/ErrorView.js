import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export default function ErrorView({ message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color={colors.error}
        accessibilityLabel="Error icon"
      />
      <Text style={styles.message} accessibilityRole="alert">
        {message}
      </Text>
      {onRetry ? (
        <AppButton
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          size="sm"
          style={styles.retryBtn}
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
    backgroundColor: colors.cloud,
    padding: spacing.xl,
  },
  message: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  retryBtn: {
    minWidth: 140,
  },
});
