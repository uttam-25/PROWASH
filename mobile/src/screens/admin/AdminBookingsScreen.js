import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import { getAdminBookings } from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AdminBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [error, setError] = useState(null);

  const loadBookings = useCallback(async (status) => {
    try {
      setError(null);
      const params = {};
      if (status) params.status = status;
      const data = await getAdminBookings(params);
      setBookings(data.data?.bookings || data.data || []);
    } catch (err) {
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadBookings(activeFilter);
  }, [activeFilter, loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings(activeFilter);
  }, [activeFilter, loadBookings]);

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    setLoading(true);
  };

  const handleBookingPress = (booking) => {
    navigation.navigate('AdminBookingDetails', { bookingId: booking._id });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Bookings" />
        <LoadingView message="Loading bookings…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Bookings" />

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterTab,
              activeFilter === f.value && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(f.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${f.label}`}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === f.value && styles.filterTabTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadBookings(activeFilter)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => handleBookingPress(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            bookings.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.ocean]}
              tintColor={colors.ocean}
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="calendar-outline"
              title="No bookings found"
              subtitle="Bookings will appear here once customers make reservations."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 52,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.softGray,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: colors.ocean,
  },
  filterTabText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.makeTextStyle('md', 'regular', colors.error),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryText: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
  },
});
