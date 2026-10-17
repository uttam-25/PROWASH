import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';
import { APP_NAME, TAGLINE } from '../../constants/index';

const FEATURES = [
  { icon: 'flash-outline', label: 'Fast & Reliable Service' },
  { icon: 'shield-checkmark-outline', label: 'Certified Professionals' },
  { icon: 'location-outline', label: 'Doorstep Booking' },
];

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Gradient simulation — layered Views */}
      <View style={styles.bgTop} />
      <View style={styles.bgMiddle} />
      <View style={styles.bgBottom} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & brand */}
          <Animated.View
            style={[
              styles.heroArea,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.iconRing}>
              <Ionicons name="car-sport" size={54} color={colors.aqua} />
            </View>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.tagline}>{TAGLINE}</Text>
          </Animated.View>

          {/* Feature bullets */}
          <Animated.View
            style={[styles.features, { opacity: fadeAnim }]}
          >
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={18} color={colors.aqua} />
                </View>
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Separator */}
          <Text style={styles.separator}>Clean • Fast • Reliable</Text>

          {/* CTAs */}
          <View style={styles.ctaArea}>
            <AppButton
              title="Get Started"
              variant="primary"
              size="lg"
              onPress={() => navigation.navigate('Register')}
              style={styles.ctaBtn}
            />
            <AppButton
              title="Sign In"
              variant="outline"
              size="lg"
              onPress={() => navigation.navigate('Login')}
              style={[styles.ctaBtn, styles.signInBtn]}
              textStyle={{ color: colors.white }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Layered background for gradient effect
  bgTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.midnight,
    bottom: '50%',
  },
  bgMiddle: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ocean,
    top: '40%',
    bottom: '20%',
    opacity: 0.35,
  },
  bgBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.midnight,
    top: '60%',
    opacity: 0.9,
  },

  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },

  heroArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(64,196,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(64,196,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: typography.fontSizes.display,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
    letterSpacing: 4,
  },
  tagline: {
    ...typography.makeTextStyle('md', 'regular', colors.aqua),
    marginTop: spacing.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  features: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(64,196,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.makeTextStyle('md', 'medium', colors.cloud),
  },

  separator: {
    ...typography.makeTextStyle('sm', 'regular', 'rgba(255,255,255,0.4)'),
    letterSpacing: 2,
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
  },

  ctaArea: {
    width: '100%',
  },
  ctaBtn: {
    width: '100%',
    marginBottom: spacing.md,
  },
  signInBtn: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
