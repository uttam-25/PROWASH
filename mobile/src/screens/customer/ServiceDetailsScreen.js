import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

export default function ServiceDetailsScreen({ route, navigation }) {
  const { service } = route.params;

  if (!service) return null;

  const {
    _id,
    name,
    category,
    price,
    duration,
    description,
    vehicleTypes,
    imageUrl,
  } = service;

  return (
    <View style={styles.container}>
      <AppHeader title={name || 'Service Details'} showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="car-sport-outline" size={64} color={colors.aqua} />
            </View>
          )}
        </View>

        <View style={styles.detailCard}>
          {/* Title & price */}
          <View style={styles.titleRow}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.price}>₹{price}</Text>
          </View>

          {/* Category badge */}
          {category ? (
            <View style={styles.badgeRow}>
              <StatusBadge status={category} />
            </View>
          ) : null}

          {/* Duration */}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={colors.ocean} />
            <Text style={styles.metaText}>{duration} minutes</Text>
          </View>

          {/* Description */}
          {description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this service</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          ) : null}

          {/* Vehicle types */}
          {vehicleTypes && vehicleTypes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compatible vehicles</Text>
              <View style={styles.chipsRow}>
                {vehicleTypes.map((t) => (
                  <View key={t} style={styles.chip}>
                    <Ionicons name="car-outline" size={12} color={colors.ocean} />
                    <Text style={styles.chipText}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Book This Service"
          onPress={() => navigation.navigate('BookWash', { serviceId: _id, service })}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  banner: {
    height: 200,
    backgroundColor: colors.midnight,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.makeTextStyle('xxxl', 'bold', colors.textPrimary),
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    ...typography.makeTextStyle('xxl', 'bold', colors.ocean),
  },
  badgeRow: {
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metaText: {
    ...typography.makeTextStyle('md', 'medium', colors.textSecondary),
  },
  section: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textSecondary),
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.softGray,
    borderRadius: spacing.borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  chipText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textPrimary),
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
