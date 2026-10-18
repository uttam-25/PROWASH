import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import LoadingView from '../../components/LoadingView';
import { getAdminBookings } from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function padZero(n) {
  return n < 10 ? '0' + n : String(n);
}

function toDateString(year, month, day) {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export default function AdminCalendarScreen({ navigation }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [bookingsByDate, setBookingsByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const monthKey = `${year}-${padZero(month + 1)}`;

  const loadBookings = useCallback(async () => {
    try {
      const data = await getAdminBookings({ month: monthKey });
      const list = data.data?.bookings || data.data || [];
      // Aggregate counts per day
      const counts = {};
      list.forEach((b) => {
        if (b.scheduledDate) {
          const d = b.scheduledDate.slice(0, 10);
          counts[d] = (counts[d] || 0) + 1;
        }
      });
      setBookingsByDate(counts);
    } catch {
      // silently handle, show empty calendar
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthKey]);

  useEffect(() => {
    setLoading(true);
    loadBookings();
  }, [loadBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBookings();
  }, [loadBookings]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    // Trailing empty cells to complete last row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push(null);
      }
    }
    return cells;
  }, [year, month]);

  const todayStr = toDateString(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const handleDayPress = (day) => {
    if (!day) return;
    const dateStr = toDateString(year, month, day);
    navigation.navigate('AdminSchedule', { date: dateStr });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Calendar" />
        <LoadingView message="Loading calendar…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Calendar" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.ocean]}
            tintColor={colors.ocean}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ocean} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.ocean} />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{wd}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }
            const dateStr = toDateString(year, month, day);
            const count = bookingsByDate[dateStr] || 0;
            const isToday = dateStr === todayStr;
            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.dayCell, isToday && styles.dayCellToday]}
                onPress={() => handleDayPress(day)}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${MONTH_NAMES[month]}, ${count} bookings`}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                  ]}
                >
                  {day}
                </Text>
                {count > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                ) : (
                  <View style={styles.countPlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.ocean }]} />
            <Text style={styles.legendText}>Has bookings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.aqua }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  navBtn: {
    padding: spacing.xs,
  },
  monthTitle: {
    ...typography.makeTextStyle('lg', 'bold', colors.textPrimary),
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 2,
  },
  dayCellToday: {
    backgroundColor: 'rgba(64,196,255,0.15)',
  },
  dayNumber: {
    ...typography.makeTextStyle('sm', 'medium', colors.textPrimary),
  },
  dayNumberToday: {
    color: colors.ocean,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.ocean,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  countText: {
    ...typography.makeTextStyle('xs', 'bold', colors.white),
    fontSize: 9,
  },
  countPlaceholder: {
    height: 16,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
});
