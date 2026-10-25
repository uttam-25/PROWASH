import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

const STATUS_COLORS = {
  pending: { bg: colors.warning, text: colors.white },
  confirmed: { bg: colors.ocean, text: colors.white },
  searching_partner: { bg: colors.warning, text: colors.white },
  partner_assigned: { bg: colors.ocean, text: colors.white },
  partner_accepted: { bg: colors.ocean, text: colors.white },
  partner_on_way: { bg: colors.ocean, text: colors.white },
  partner_arrived: { bg: colors.aqua, text: colors.midnight },
  in_progress: { bg: colors.aqua, text: colors.midnight },
  completed: { bg: colors.success, text: colors.white },
  cancelled: { bg: colors.error, text: colors.white },
  active: { bg: colors.success, text: colors.white },
  inactive: { bg: colors.textSecondary, text: colors.white },
  paid: { bg: colors.success, text: colors.white },
  unpaid: { bg: colors.warning, text: colors.white },
  refunded: { bg: colors.textSecondary, text: colors.white },
};

const DEFAULT_COLORS = { bg: colors.softGray, text: colors.textSecondary };

export default function StatusBadge({ status }) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_');
  const { bg, text } = STATUS_COLORS[key] || DEFAULT_COLORS;

  const label = (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.full,
  },
  label: {
    ...typography.makeTextStyle('xs', 'semibold'),
    letterSpacing: 0.2,
  },
});
