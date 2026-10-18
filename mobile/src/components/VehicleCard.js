import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

const VEHICLE_ICONS = {
  Car: 'car-outline',
  SUV: 'car-sport-outline',
  Truck: 'car-outline',
  Van: 'car-outline',
  Bike: 'bicycle-outline',
  Scooty: 'bicycle-outline',
};

export default function VehicleCard({ vehicle, onPress, onEdit, onDelete }) {
  if (!vehicle) return null;

  const {
    type,
    make,
    model,
    year,
    licensePlate,
    color,
    isActive,
  } = vehicle;

  const iconName = VEHICLE_ICONS[type] || 'car-outline';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${make} ${model}`}
    >
      {/* Left icon */}
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={26} color={colors.ocean} />
      </View>

      {/* Center info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {make} {model}
        </Text>
        <View style={styles.metaRow}>
          {year ? <Text style={styles.meta}>{year}</Text> : null}
          {year && licensePlate ? <Text style={styles.dot}>·</Text> : null}
          {licensePlate ? (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{licensePlate}</Text>
            </View>
          ) : null}
          {color ? (
            <>
              <Text style={styles.dot}>·</Text>
              <View style={[styles.colorDot, { backgroundColor: color.toLowerCase() === color ? color : colors.textSecondary }]} />
              <Text style={styles.meta}>{color}</Text>
            </>
          ) : null}
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.typeBadge]}>
            <Text style={styles.typeText}>{type}</Text>
          </View>
          {isActive === false ? (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>Inactive</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Action buttons */}
      {(onEdit || onDelete) ? (
        <View style={styles.actions}>
          {onEdit ? (
            <TouchableOpacity
              onPress={onEdit}
              style={styles.actionBtn}
              accessibilityLabel="Edit vehicle"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.ocean} />
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.actionBtn}
              accessibilityLabel="Delete vehicle"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.softGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  meta: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  dot: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  plateBadge: {
    backgroundColor: colors.midnight,
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 6,
  },
  plateText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.white),
    letterSpacing: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.softGray,
    borderRadius: spacing.borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  typeText: {
    ...typography.makeTextStyle('xs', 'medium', colors.textSecondary),
  },
  inactiveBadge: {
    backgroundColor: colors.error,
    borderRadius: spacing.borderRadius.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  inactiveText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.white),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
});
