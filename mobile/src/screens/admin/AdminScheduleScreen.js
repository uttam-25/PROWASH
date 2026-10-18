import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SettingRow({ label, desc, children }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingLabel}>{label}</Text>
        {desc ? <Text style={styles.settingDesc}>{desc}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function AdminScheduleScreen() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Section saving states
  const [savingHours, setSavingHours] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingDays, setSavingDays] = useState(false);
  const [savingBreaks, setSavingBreaks] = useState(false);

  // Working hours fields
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');

  // Slot settings
  const [slotInterval, setSlotInterval] = useState('30');
  const [maxConcurrent, setMaxConcurrent] = useState('3');

  // Working days
  const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5, 6]);

  // Breaks (local editable list)
  const [breaks, setBreaks] = useState([]);
  const [newBreakStart, setNewBreakStart] = useState('');
  const [newBreakEnd, setNewBreakEnd] = useState('');

  // Blocked periods
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [newBlockLabel, setNewBlockLabel] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('');
  const [newBlockEnd, setNewBlockEnd] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  // Holidays
  const [holidays, setHolidays] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);

  const applyScheduleToState = (s) => {
    if (!s) return;
    setOpeningTime(s.openingTime || '08:00');
    setClosingTime(s.closingTime || '20:00');
    setSlotInterval(String(s.slotIntervalMinutes || 30));
    setMaxConcurrent(String(s.maxConcurrentBookings || 3));
    setWorkingDays(s.workingDays || [1, 2, 3, 4, 5, 6]);
    setBreaks(s.breaks || []);
    setBlockedPeriods(s.blockedPeriods || []);
    setHolidays(s.holidays || []);
  };

  const loadSchedule = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getSchedule();
      const s = data?.data || data;
      setSchedule(s);
      applyScheduleToState(s);
    } catch (err) {
      setError('Failed to load schedule. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSchedule();
  }, [loadSchedule]);

  // Section 1: Save working hours
  const handleSaveHours = async () => {
    const timeRe = /^\d{2}:\d{2}$/;
    if (!timeRe.test(openingTime) || !timeRe.test(closingTime)) {
      Alert.alert('Invalid', 'Times must be in HH:MM format.');
      return;
    }
    try {
      setSavingHours(true);
      await adminService.updateSchedule({ openingTime, closingTime });
      Alert.alert('Saved', 'Working hours updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingHours(false);
    }
  };

  // Section 2: Save slot settings
  const handleSaveSlot = async () => {
    const interval = parseInt(slotInterval, 10);
    const concurrent = parseInt(maxConcurrent, 10);
    if (isNaN(interval) || interval < 5) {
      Alert.alert('Invalid', 'Slot interval must be at least 5 minutes.');
      return;
    }
    if (isNaN(concurrent) || concurrent < 1) {
      Alert.alert('Invalid', 'Max concurrent bookings must be at least 1.');
      return;
    }
    try {
      setSavingSlot(true);
      await adminService.updateSchedule({
        slotIntervalMinutes: interval,
        maxConcurrentBookings: concurrent,
      });
      Alert.alert('Saved', 'Slot settings updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingSlot(false);
    }
  };

  // Section 3: Save working days
  const toggleDay = (dayIndex) => {
    setWorkingDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSaveDays = async () => {
    try {
      setSavingDays(true);
      await adminService.updateSchedule({ workingDays });
      Alert.alert('Saved', 'Working days updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingDays(false);
    }
  };

  // Section 4: Breaks
  const handleAddBreak = () => {
    const timeRe = /^\d{2}:\d{2}$/;
    if (!timeRe.test(newBreakStart) || !timeRe.test(newBreakEnd)) {
      Alert.alert('Invalid', 'Break times must be in HH:MM format.');
      return;
    }
    setBreaks((prev) => [...prev, { startTime: newBreakStart, endTime: newBreakEnd }]);
    setNewBreakStart('');
    setNewBreakEnd('');
  };

  const handleDeleteBreak = (idx) => {
    setBreaks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveBreaks = async () => {
    try {
      setSavingBreaks(true);
      await adminService.updateSchedule({ breaks });
      Alert.alert('Saved', 'Breaks updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save.');
    } finally {
      setSavingBreaks(false);
    }
  };

  // Section 5: Blocked periods
  const handleAddBlockedPeriod = async () => {
    if (!newBlockStart || !newBlockEnd) {
      Alert.alert('Invalid', 'Please provide start and end dates/times.');
      return;
    }
    try {
      setSavingBlock(true);
      const data = await adminService.addBlockedPeriod({
        label: newBlockLabel || 'Blocked',
        startAt: newBlockStart,
        endAt: newBlockEnd,
      });
      const updated = data?.data;
      if (updated?.blockedPeriods) setBlockedPeriods(updated.blockedPeriods);
      setNewBlockLabel('');
      setNewBlockStart('');
      setNewBlockEnd('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add blocked period.');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleRemoveBlockedPeriod = async (period) => {
    try {
      const data = await adminService.removeBlockedPeriod(period._id);
      const updated = data?.data;
      if (updated?.blockedPeriods) {
        setBlockedPeriods(updated.blockedPeriods);
      } else {
        setBlockedPeriods((prev) => prev.filter((p) => p._id !== period._id));
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to remove blocked period.');
    }
  };

  // Section 6: Holidays
  const handleAddHoliday = async () => {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(newHolidayDate)) {
      Alert.alert('Invalid', 'Date must be in YYYY-MM-DD format.');
      return;
    }
    try {
      setSavingHoliday(true);
      const data = await adminService.addHoliday({
        date: newHolidayDate,
        label: newHolidayLabel || 'Holiday',
      });
      const updated = data?.data;
      if (updated?.holidays) setHolidays(updated.holidays);
      setNewHolidayDate('');
      setNewHolidayLabel('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add holiday.');
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleRemoveHoliday = async (holiday) => {
    try {
      const data = await adminService.removeHoliday(holiday._id);
      const updated = data?.data;
      if (updated?.holidays) {
        setHolidays(updated.holidays);
      } else {
        setHolidays((prev) => prev.filter((h) => h._id !== holiday._id));
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to remove holiday.');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Schedule" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.ocean} />
          <Text style={styles.loadingText}>Loading schedule…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Schedule" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadSchedule}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Schedule" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.ocean]}
            tintColor={colors.ocean}
          />
        }
      >
        {/* Section 1: Working Hours */}
        <SectionCard title="Working Hours">
          <SettingRow label="Opening Time" desc="HH:MM (24-hour)">
            <TextInput
              style={styles.timeInput}
              value={openingTime}
              onChangeText={setOpeningTime}
              placeholder="08:00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Opening time"
            />
          </SettingRow>
          <SettingRow label="Closing Time" desc="HH:MM (24-hour)">
            <TextInput
              style={styles.timeInput}
              value={closingTime}
              onChangeText={setClosingTime}
              placeholder="20:00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Closing time"
            />
          </SettingRow>
          <AppButton
            title="Save Hours"
            onPress={handleSaveHours}
            loading={savingHours}
            style={styles.saveBtn}
          />
        </SectionCard>

        {/* Section 2: Slot Settings */}
        <SectionCard title="Slot Settings">
          <SettingRow label="Slot Interval (min)" desc="Duration between slots">
            <TextInput
              style={styles.numInput}
              value={slotInterval}
              onChangeText={setSlotInterval}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Slot interval"
            />
          </SettingRow>
          <SettingRow label="Max Concurrent Bookings" desc="Per slot">
            <TextInput
              style={styles.numInput}
              value={maxConcurrent}
              onChangeText={setMaxConcurrent}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Max concurrent bookings"
            />
          </SettingRow>
          <AppButton
            title="Save Slot Settings"
            onPress={handleSaveSlot}
            loading={savingSlot}
            style={styles.saveBtn}
          />
        </SectionCard>

        {/* Section 3: Working Days */}
        <SectionCard title="Working Days">
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day, idx) => {
              const isActive = workingDays.includes(idx);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, isActive && styles.dayChipActive]}
                  onPress={() => toggleDay(idx)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day}
                  accessibilityState={{ checked: isActive }}
                >
                  <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <AppButton
            title="Save Working Days"
            onPress={handleSaveDays}
            loading={savingDays}
            style={styles.saveBtn}
          />
        </SectionCard>

        {/* Section 4: Breaks */}
        <SectionCard title="Daily Breaks">
          {breaks.map((b, idx) => (
            <View key={idx} style={styles.listItemRow}>
              <Text style={styles.listItemText}>
                {b.startTime} – {b.endTime}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteBreak(idx)}
                accessibilityRole="button"
                accessibilityLabel="Remove break"
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.timeInput, styles.addInput]}
              value={newBreakStart}
              onChangeText={setNewBreakStart}
              placeholder="Start (HH:MM)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Break start time"
            />
            <TextInput
              style={[styles.timeInput, styles.addInput]}
              value={newBreakEnd}
              onChangeText={setNewBreakEnd}
              placeholder="End (HH:MM)"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Break end time"
            />
            <TouchableOpacity
              onPress={handleAddBreak}
              style={styles.addIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Add break"
            >
              <Ionicons name="add-circle-outline" size={26} color={colors.ocean} />
            </TouchableOpacity>
          </View>
          <AppButton
            title="Save Breaks"
            onPress={handleSaveBreaks}
            loading={savingBreaks}
            style={styles.saveBtn}
          />
        </SectionCard>

        {/* Section 5: Blocked Periods */}
        <SectionCard title="Blocked Periods">
          {blockedPeriods.map((p) => (
            <View key={p._id || p.startAt} style={styles.listItemRow}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{p.label || 'Blocked'}</Text>
                <Text style={styles.listItemSub}>
                  {p.startAt ? new Date(p.startAt).toLocaleString('en-IN') : ''} –{' '}
                  {p.endAt ? new Date(p.endAt).toLocaleString('en-IN') : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveBlockedPeriod(p)}
                accessibilityRole="button"
                accessibilityLabel="Remove blocked period"
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            style={styles.fullInput}
            value={newBlockLabel}
            onChangeText={setNewBlockLabel}
            placeholder="Label (e.g. Maintenance)"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Blocked period label"
          />
          <TextInput
            style={styles.fullInput}
            value={newBlockStart}
            onChangeText={setNewBlockStart}
            placeholder="Start (ISO date: 2025-01-15T09:00)"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Blocked period start"
          />
          <TextInput
            style={styles.fullInput}
            value={newBlockEnd}
            onChangeText={setNewBlockEnd}
            placeholder="End (ISO date: 2025-01-15T17:00)"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Blocked period end"
          />
          <AppButton
            title="Add Blocked Period"
            onPress={handleAddBlockedPeriod}
            loading={savingBlock}
            variant="outline"
            style={styles.saveBtn}
          />
        </SectionCard>

        {/* Section 6: Holidays */}
        <SectionCard title="Holidays">
          {holidays.map((h) => (
            <View key={h._id || h.date} style={styles.listItemRow}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{h.label || 'Holiday'}</Text>
                <Text style={styles.listItemSub}>{h.date}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveHoliday(h)}
                accessibilityRole="button"
                accessibilityLabel="Remove holiday"
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            style={styles.fullInput}
            value={newHolidayDate}
            onChangeText={setNewHolidayDate}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Holiday date"
          />
          <TextInput
            style={styles.fullInput}
            value={newHolidayLabel}
            onChangeText={setNewHolidayLabel}
            placeholder="Label (e.g. Christmas)"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Holiday label"
          />
          <AppButton
            title="Add Holiday"
            onPress={handleAddHoliday}
            loading={savingHoliday}
            variant="outline"
            style={styles.saveBtn}
          />
        </SectionCard>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.makeTextStyle('md', 'regular', colors.error),
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryText: {
    ...typography.makeTextStyle('md', 'semibold', colors.ocean),
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
  settingLeft: {
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
  timeInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 80,
    textAlign: 'center',
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    backgroundColor: colors.white,
  },
  numInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 70,
    textAlign: 'center',
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    backgroundColor: colors.white,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dayChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dayChipActive: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  dayChipText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  dayChipTextActive: {
    color: colors.white,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  listItemContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  listItemTitle: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
  },
  listItemSub: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  listItemText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
    flex: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  addInput: {
    flex: 1,
    minWidth: 0,
  },
  addIconBtn: {
    padding: 4,
  },
  fullInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    ...typography.makeTextStyle('sm', 'regular', colors.textPrimary),
    backgroundColor: colors.white,
  },
});
