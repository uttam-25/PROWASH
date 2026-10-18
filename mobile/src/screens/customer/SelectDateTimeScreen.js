import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import * as bookingService from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

export default function SelectDateTimeScreen({ route, navigation }) {
  const { vehicleId, serviceId, service, vehicle } = route.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isDateDisabled = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    return d < today;
  };

  const handleDateSelect = async (day) => {
    if (isDateDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    setSelectedDate(d);
    setSelectedTime(null);
    setSlotError(null);
    setLoadingSlots(true);
    try {
      const dateStr = toDateString(d);
      const data = await bookingService.getAvailability(dateStr);
      setSlots(data.slots || data.data || []);
    } catch (err) {
      setSlotError('Could not load time slots. Please try again.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('BookingReview', {
      vehicleId,
      serviceId,
      service,
      vehicle,
      date: toDateString(selectedDate),
      time: selectedTime,
    });
  };

  // Build calendar grid
  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const selectedDateStr = selectedDate ? toDateString(selectedDate) : null;

  return (
    <View style={styles.container}>
      <AppHeader title="Select Date & Time" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={colors.ocean} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
            <Ionicons name="chevron-forward" size={22} color={colors.ocean} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {calendarCells.map((day, idx) => {
            if (!day) return <View key={'empty-' + idx} style={styles.calCell} />;
            const disabled = isDateDisabled(day);
            const cellDate = new Date(viewYear, viewMonth, day);
            const isToday = toDateString(cellDate) === toDateString(today);
            const isSelected = selectedDate && toDateString(cellDate) === selectedDateStr;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.calCell,
                  isToday && styles.calCellToday,
                  isSelected && styles.calCellSelected,
                  disabled && styles.calCellDisabled,
                ]}
                onPress={() => handleDateSelect(day)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${MONTHS[viewMonth]}`}
                accessibilityState={{ selected: !!isSelected, disabled }}
              >
                <Text
                  style={[
                    styles.calCellText,
                    isToday && styles.calCellTextToday,
                    isSelected && styles.calCellTextSelected,
                    disabled && styles.calCellTextDisabled,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time slots */}
        {selectedDate ? (
          <View style={styles.slotsSection}>
            <Text style={styles.slotsTitle}>Available Times</Text>
            {loadingSlots ? (
              <ActivityIndicator size="small" color={colors.ocean} style={{ marginTop: spacing.md }} />
            ) : slotError ? (
              <Text style={styles.slotError}>{slotError}</Text>
            ) : slots.length === 0 ? (
              <Text style={styles.noSlots}>No slots available for this date.</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => {
                  const isAvailable = slot.available !== false;
                  const isSelectedSlot = selectedTime === slot.time;
                  return (
                    <TouchableOpacity
                      key={slot.time}
                      style={[
                        styles.slotChip,
                        isAvailable ? styles.slotChipAvailable : styles.slotChipUnavailable,
                        isSelectedSlot && styles.slotChipSelected,
                      ]}
                      onPress={() => isAvailable && setSelectedTime(slot.time)}
                      disabled={!isAvailable}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelectedSlot, disabled: !isAvailable }}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          isAvailable ? styles.slotTextAvailable : styles.slotTextUnavailable,
                          isSelectedSlot && styles.slotTextSelected,
                        ]}
                      >
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedDate || !selectedTime}
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
  },
  monthLabel: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  calCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellToday: {
    backgroundColor: colors.softGray,
    borderRadius: 999,
  },
  calCellSelected: {
    backgroundColor: colors.ocean,
    borderRadius: 999,
  },
  calCellDisabled: {
    opacity: 0.3,
  },
  calCellText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
  },
  calCellTextToday: {
    fontWeight: typography.fontWeights.bold,
    color: colors.ocean,
  },
  calCellTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  calCellTextDisabled: {
    color: colors.textSecondary,
  },
  slotsSection: {
    marginBottom: spacing.lg,
  },
  slotsTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1.5,
  },
  slotChipAvailable: {
    backgroundColor: colors.white,
    borderColor: colors.ocean,
  },
  slotChipUnavailable: {
    backgroundColor: colors.softGray,
    borderColor: colors.border,
  },
  slotChipSelected: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  slotText: {
    ...typography.makeTextStyle('sm', 'medium'),
  },
  slotTextAvailable: {
    color: colors.ocean,
  },
  slotTextUnavailable: {
    color: colors.textSecondary,
  },
  slotTextSelected: {
    color: colors.white,
  },
  slotError: {
    ...typography.makeTextStyle('sm', 'regular', colors.error),
    marginTop: spacing.sm,
  },
  noSlots: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
