import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

const CATEGORY_ICONS = {
  exterior: 'car-outline',
  interior: 'sparkles-outline',
  full: 'car-sport-outline',
  premium: 'diamond-outline',
};

export default function ServiceCard({ service, onPress }) {
  if (!service) return null;

  const {
    name,
    category,
    price,
    duration,
    vehicleTypes,
    imageUrl,
    description,
  } = service;

  const iconName = CATEGORY_ICONS[category?.toLowerCase()] || 'sparkles-outline';
  const categoryLabel = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : '';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ₹${price}`}
    >
      {/* Image or icon banner */}
      <View style={styles.banner}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.iconBanner}>
            <Ionicons name={iconName} size={40} color={colors.aqua} />
          </View>
        )}
        {/* Category badge overlay */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{categoryLabel}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.price}>₹{price}</Text>
        </View>

        {/* Description snippet */}
        {description ? (
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        ) : null}

        {/* Meta row: duration + vehicle types */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{duration} min</Text>
          </View>
          {vehicleTypes && vehicleTypes.length > 0 ? (
            <View style={styles.chipsRow}>
              {vehicleTypes.slice(0, 3).map((t) => (
                <View key={t} style={styles.chip}>
                  <Text style={styles.chipText}>{t}</Text>
                </View>
              ))}
              {vehicleTypes.length > 3 ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>+{vehicleTypes.length - 3}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  banner: {
    height: 120,
    backgroundColor: colors.midnight,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconBanner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.midnight,
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.ocean,
    borderRadius: spacing.borderRadius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  categoryText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.white),
  },
  body: {
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    ...typography.makeTextStyle('lg', 'bold', colors.ocean),
  },
  description: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    backgroundColor: colors.softGray,
    borderRadius: spacing.borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chipText: {
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
  },
});
