import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import LoadingView from '../../components/LoadingView';
import VehicleCard from '../../components/VehicleCard';
import BookingCard from '../../components/BookingCard';
import ServiceCard from '../../components/ServiceCard';
import EmptyState from '../../components/EmptyState';
import * as vehicleService from '../../services/vehicleService';
import * as bookingService from '../../services/bookingService';
import * as serviceService from '../../services/serviceService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';
import { useFocusEffect } from '@react-navigation/native';

function SectionHeader({ title, icon, onSeeAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={icon} size={18} color={colors.ocean} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll ? (
        <TouchableOpacity onPress={onSeeAll} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function CustomerHomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = useCallback(async () => {
    try {
      const [vehicleRes, bookingRes, serviceRes] = await Promise.allSettled([
        vehicleService.getMyVehicles(),
        bookingService.getMyBookings(),
        serviceService.getServices(),
      ]);

      if (vehicleRes.status === 'fulfilled') {
        const v = vehicleRes.value;
        setVehicles(v.vehicles || v.data || []);
      }
      if (bookingRes.status === 'fulfilled') {
        const b = bookingRes.value;
        setBookings(b.bookings || b.data || []);
      }
      if (serviceRes.status === 'fulfilled') {
        const s = serviceRes.value;
        setServices(s.services || s.data || []);
      }
    } catch {
      // Individual failures handled by Promise.allSettled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <LoadingView message="Loading PROWASH…" />;

  const recentVehicles = vehicles.slice(0, 2);
  const recentBookings = bookings.slice(0, 3);
  const featuredServices = services.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'Customer'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationsTab')}
          style={styles.headerBtn}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Hero book-a-wash CTA */}
      <TouchableOpacity
        style={styles.heroCard}
        onPress={() => navigation.navigate('ServicesTab')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Book a Wash"
      >
        <Ionicons name="car-sport" size={36} color={colors.aqua} />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Book a Wash</Text>
          <Text style={styles.heroSub}>Professional cleaning at your doorstep.</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.aqua} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.ocean]}
            tintColor={colors.ocean}
          />
        }
      >
        {/* Vehicles section */}
        <View style={styles.section}>
          <SectionHeader
            title="Your Vehicles"
            icon="car-outline"
            onSeeAll={() => navigation.navigate('HomeTab', { screen: 'MyVehicles' })}
          />
          {recentVehicles.length === 0 ? (
            <View style={styles.emptyInline}>
              <EmptyState
                iconName="car-outline"
                title="No vehicles added"
                subtitle="Add your first vehicle to get started."
                actionLabel="Add Vehicle"
                onAction={() => navigation.navigate('HomeTab', { screen: 'AddVehicle' })}
              />
            </View>
          ) : (
            recentVehicles.map((v) => (
              <VehicleCard
                key={v._id}
                vehicle={v}
                onPress={() => {}}
                onEdit={() => navigation.navigate('HomeTab', {
                  screen: 'EditVehicle',
                  params: { vehicle: v },
                })}
              />
            ))
          )}
        </View>

        {/* Recent bookings section */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent Bookings"
            icon="calendar-outline"
            onSeeAll={() => navigation.navigate('BookingsTab')}
          />
          {recentBookings.length === 0 ? (
            <View style={styles.emptyInline}>
              <EmptyState
                iconName="calendar-outline"
                title="No bookings yet"
                subtitle="Book a wash to see it here."
              />
            </View>
          ) : (
            recentBookings.map((b) => (
              <BookingCard
                key={b._id}
                booking={b}
                onPress={() => navigation.navigate('BookingsTab', {
                  screen: 'BookingDetails',
                  params: { bookingId: b._id },
                })}
              />
            ))
          )}
        </View>

        {/* Services section */}
        <View style={styles.section}>
          <SectionHeader
            title="Our Services"
            icon="sparkles-outline"
            onSeeAll={() => navigation.navigate('ServicesTab')}
          />
          {featuredServices.length === 0 ? (
            <View style={styles.emptyInline}>
              <EmptyState
                iconName="sparkles-outline"
                title="No services available"
                subtitle="Check back soon."
              />
            </View>
          ) : (
            featuredServices.map((s) => (
              <ServiceCard
                key={s._id}
                service={s}
                onPress={() => navigation.navigate('ServicesTab', {
                  screen: 'ServiceDetails',
                  params: { service: s },
                })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.midnight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.makeTextStyle('sm', 'regular', colors.aqua),
  },
  userName: {
    ...typography.makeTextStyle('xl', 'bold', colors.white),
  },
  headerBtn: {
    padding: spacing.sm,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ocean,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    elevation: 4,
    shadowColor: colors.ocean,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    ...typography.makeTextStyle('lg', 'bold', colors.white),
  },
  heroSub: {
    ...typography.makeTextStyle('sm', 'regular', 'rgba(255,255,255,0.8)'),
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
  },
  seeAll: {
    ...typography.makeTextStyle('sm', 'semibold', colors.ocean),
  },
  emptyInline: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    minHeight: 140,
  },
});
