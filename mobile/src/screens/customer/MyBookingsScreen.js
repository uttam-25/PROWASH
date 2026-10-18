import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import EmptyState from '../../components/EmptyState';
import { bookingService } from '../../services/bookingService';
import { BOOKING_STATUS } from '../../constants/index';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Pending', value: BOOKING_STATUS.PENDING },
  { label: 'Confirmed', value: BOOKING_STATUS.CONFIRMED },
  { label: 'In Progress', value: BOOKING_STATUS.IN_PROGRESS },
  { label: 'Completed', value: BOOKING_STATUS.COMPLETED },
  { label: 'Cancelled', value: BOOKING_STATUS.CANCELLED },
];

export default function MyBookingsScreen({ navigation }) {
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadBookings = useCallback(async () => {
    setError(null);
    try {
      // Fetch all for client-side filtering (upcoming). For server-only filters, pass status param.
      const data = await bookingService.getMyBookings({});
      const bookings =
        data.data?.bookings ||
        data.data ||
        data.bookings ||
        [];
      setAllBookings(Array.isArray(bookings) ? bookings : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBookings();
    }, [loadBookings])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const now = new Date();

  const filtered = (() => {
    if (activeFilter === 'all') return allBookings;
    if (activeFilter === 'upcoming') {
      return allBookings.filter(
        (b) =>
          ['pending', 'confirmed', 'in_progress'].includes(b.status) &&
          new Date(b.startAt) >= now
      );
    }
    return allBookings.filter((b) => b.status === activeFilter);
  })();

  if (loading) return <LoadingView message="Loading your bookings…" />;
  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          setLoading(true);
          loadBookings();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="My Bookings" />

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterTab, activeFilter === f.value && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === f.value }}
          >
            <Text style={[styles.filterText, activeFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: item._id })}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <EmptyState
            iconName="calendar-outline"
            title="No bookings found"
            subtitle={
              activeFilter !== 'all'
                ? `No ${activeFilter.replace('_', ' ')} bookings.`
                : "You haven't made any bookings yet."
            }
          />
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  filters: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterTabActive: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  filterText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
});
