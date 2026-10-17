import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export default function LoadingView({ message }) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.ocean} />
      {message ? (
        <Text style={styles.message}>{message}</Text>
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
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
