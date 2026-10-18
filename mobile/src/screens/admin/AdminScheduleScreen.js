import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import BookingCard from '../../components/BookingCard';
import LoadingView from '../../components/LoadingView';
import api from '../../services/api';
import { getAdminBookings } from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AdminScheduleScreen({ route, navigation }) {
  const { date } = route.params;
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [maxBookings, setMaxBookings] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [slotsRes, bookingsRes] = await Promise.allSettled([
        api.get('/availability?date=' + date),
        getAdminBookings({ date }),
      ]);

      if (slotsRes.status === 'fulfilled') {
        const slotsData = slotsRes.value.data?.data || [];
        setSlots(Array.isArray(slotsData) ? slotsData : []);
      }

      if (bookingsRes.status === 'fulfilled') {
        const bList = bookingsRes.value.data?.bookings || bookingsRes.value.data || [];
        setBookings(bList);
      }
    } catch {
      // proceed with empty data
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    const max = parseInt(maxBookings, 10);
    if (isNaN(max) || max < 1) {
      Alert.alert('Invalid Input', 'Please enter a valid max bookings value (minimum 1).');
      return;
    }
    try {
      setSaving(true);
      await api.post('/admin/schedule', {
        date,
        isOpen,
        maxBookings: max,
      });
      Alert.alert('Saved', 'Schedule settings saved successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save schedule settings.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Schedule"
          subtitle={formatDisplayDate(date)}
          showBack
          onBack={() => navigation.goBack()}
        />
        <LoadingView message="Loading schedule…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Schedule"
        subtitle={formatDisplayDate(date)}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Day settings */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Day Settings</Text>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Open for Business</Text>
                <Text style={styles.settingDesc}>Accept new bookings on this day</Text>
              </View>
              <Switch
                value={isOpen}
                onValueChange={setIsOpen}
                trackColor={{ false: colors.softGray, true: colors.ocean + '66' }}
                thumbColor={isOpen ? colors.ocean : colors.textSecondary}
                accessibilityLabel="Open for business toggle"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <Text style={styles.settingLabel}>Max Bookings</Text>
                <Text style={styles.settingDesc}>Maximum bookings per day</Text>
              </View>
              <TextInput
                style={styles.maxInput}
                value={maxBookings}
                onChangeText={setMaxBookings}
                keyboardType="numeric"
                accessibilityLabel="Max bookings"
              />
            </View>

            <AppButton
              title="Save Settings"
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            />
          </View>

          {/* Time slots */}
          {slots.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Time Slots</Text>
              <View style={styles.slotsGrid}>
                {slots.map((slot) => (
                  <View
                    key={slot.time}
                    style={[
                      styles.slotChip,
                      slot.available ? styles.slotAvailable : styles.slotBooked,
                    ]}
                    accessibilityRole="text"
                    accessibilityLabel={`${slot.time} ${slot.available ? 'available' : 'booked'}`}
                  >
                    <Text
                      style={[
                        styles.slotTime,
                        slot.available ? styles.slotTimeAvail : styles.slotTimeBooked,
                      ]}
                    >
                      {slot.time}
                    </Text>
                    {!slot.available ? (
                      <Ionicons name="close-circle" size={10} color={colors.error} />
                    ) : null}
                  </View>
                ))}
              </View>
              <View style={styles.slotLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                  <Text style={styles.legendText}>Booked</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Bookings for the day */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Bookings for this day ({bookings.length})
            </Text>
            {bookings.length > 0 ? (
              bookings.map((b) => <BookingCard key={b._id} booking={b} />)
            ) : (
              <View style={styles.noBookings}>
                <Text style={styles.noBookingsText}>No bookings on this day.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  settingLabelGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
  },
  settingDesc: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  maxInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 60,
    textAlign: 'center',
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
  },
  slotAvailable: {
    backgroundColor: 'rgba(46,125,50,0.08)',
    borderColor: colors.success,
  },
  slotBooked: {
    backgroundColor: 'rgba(198,40,40,0.08)',
    borderColor: colors.error,
  },
  slotTime: {
    ...typography.makeTextStyle('xs', 'medium'),
  },
  slotTimeAvail: {
    color: colors.success,
  },
  slotTimeBooked: {
    color: colors.error,
  },
  slotLegend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  section: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    marginBottom: spacing.md,
  },
  noBookings: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noBookingsText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
});
