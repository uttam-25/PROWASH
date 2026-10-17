import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from '../../utils/storage';
import * as authService from '../../services/authService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';
import { ROLES } from '../../constants/index';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Animate logo in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    async function checkAuth() {
      try {
        const token = await getToken();
        if (!token) {
          navigateToWelcome();
          return;
        }
        const data = await authService.getMe();
        if (data && data.user) {
          if (data.user.role === ROLES.ADMIN) {
            navigation.replace('AdminHome');
          } else {
            navigation.replace('CustomerHome');
          }
        } else {
          navigateToWelcome();
        }
      } catch {
        navigateToWelcome();
      }
    }

    // Short delay so the animation is visible
    const timer = setTimeout(checkAuth, 1200);
    return () => clearTimeout(timer);
  }, []);

  function navigateToWelcome() {
    navigation.replace('Welcome');
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoArea,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconRing}>
          <Ionicons name="car-sport" size={52} color={colors.aqua} />
        </View>
        <Text style={styles.brand}>PROWASH</Text>
        <Text style={styles.tagline}>Premium Vehicle Cleaning & Care</Text>
      </Animated.View>

      <View style={styles.loaderArea}>
        <ActivityIndicator color={colors.aqua} size="small" />
        <Text style={styles.loaderText}>Starting up…</Text>
      </View>

      <Text style={styles.footer}>Clean cars. Happy rides.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.midnight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(64, 196, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(64, 196, 255, 0.25)',
  },
  brand: {
    fontSize: typography.fontSizes.display,
    fontWeight: typography.fontWeights.extrabold,
    color: colors.white,
    letterSpacing: 4,
  },
  tagline: {
    ...typography.makeTextStyle('sm', 'regular', colors.aqua),
    marginTop: spacing.xs,
    letterSpacing: 1,
    textAlign: 'center',
  },
  loaderArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loaderText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl,
    ...typography.makeTextStyle('xs', 'regular', 'rgba(255,255,255,0.3)'),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
