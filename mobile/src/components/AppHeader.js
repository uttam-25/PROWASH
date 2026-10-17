import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad + spacing.sm },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>
          {rightAction ? rightAction : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.midnight,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  spacer: {
    width: 40,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.makeTextStyle('lg', 'bold', colors.white),
    textAlign: 'center',
  },
  subtitle: {
    ...typography.makeTextStyle('sm', 'regular', colors.softGray),
    textAlign: 'center',
    marginTop: 2,
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
