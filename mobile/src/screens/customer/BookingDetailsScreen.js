import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import ConfirmDialog from '../../components/ConfirmDialog';
import { bookingService } from '../../services/bookingService';
import { BOOKING_STATUS } from '../../constants/index';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatChipDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${d} ${month}`;
}

function formatSlotTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getNext14Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    days.push(toYMD(d));
  }
  return days;
}

const STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.ocean,
  in_progress: colors.aqua,
  completed: colors.success,
  cancelled: colors.error,
  rejected: colors.error,
  rescheduled: colors.ocean,
};

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={colors.ocean} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const CANCELLABLE_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingDetailsScreen({ route, navigation }) {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancel state
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Reschedule state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSlotsError, setRescheduleSlotsError] = useState(null);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  const loadBooking = async () => {
    setError(null);
    try {
      const data = await bookingService.getBookingById(bookingId);
      setBooking(data.booking || data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for cancellation.');
      return;
    }
    setCancelling(true);
    try {
      await bookingService.cancelBooking(bookingId, cancelReason.trim());
      setShowCancelDialog(false);
      setCancelReason('');
      setLoading(true);
      loadBooking();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const loadRescheduleSlots = async (date) => {
    if (!booking) return;
    const serviceId =
      (booking.serviceId?._id || booking.serviceId || booking.service?._id || booking.service)?.toString();
    if (!serviceId) return;

    setRescheduleSlotsLoading(true);
    setRescheduleSlotsError(null);
    setRescheduleSlots([]);
    setRescheduleSelectedSlot(null);
    try {
      const data = await bookingService.getAvailableSlots(serviceId, date);
      setRescheduleSlots(data.data?.availableSlots || data.availableSlots || []);
    } catch (err) {
      setRescheduleSlotsError(err?.response?.data?.message || 'Failed to load slots.');
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const handleRescheduleDateSelect = (date) => {
    setRescheduleDate(date);
    loadRescheduleSlots(date);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleSelectedSlot) return;
    setRescheduling(true);
    try {
      await bookingService.rescheduleBooking(bookingId, rescheduleSelectedSlot.startAt);
      setShowRescheduleModal(false);
      setRescheduleDate(null);
      setRescheduleSlots([]);
      setRescheduleSelectedSlot(null);
      setLoading(true);
      loadBooking();
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reschedule booking.');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) return <LoadingView message="Loading booking details…" />;
  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          setLoading(true);
          loadBooking();
        }}
      />
    );
  }
  if (!booking) return null;

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status);
  const canReschedule = CANCELLABLE_STATUSES.includes(booking.status);

  const service = booking.serviceId || booking.service || {};
  const vehicle = booking.vehicleId || booking.vehicle || {};
  const vehicleLabel = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '—';
  const ref = booking.bookingReference || '#' + bookingId.slice(-8).toUpperCase();

  const days = getNext14Days();

  return (
    <View style={styles.container}>
      <AppHeader title="Booking Details" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: reference + status */}
        <View style={styles.statusCard}>
          <Text style={styles.bookingIdLabel}>{ref}</Text>
          <StatusBadge status={booking.status} />
        </View>

        {/* Vehicle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle</Text>
          <DetailRow icon="car-outline" label="Vehicle" value={vehicleLabel} />
          {vehicle.licensePlate ? (
            <DetailRow icon="card-outline" label="Reg. Number" value={vehicle.licensePlate} />
          ) : null}
        </View>

        {/* Service */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service</Text>
          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceName}>{service.name || '—'}</Text>
              <Text style={styles.serviceCategory}>{service.category || ''}</Text>
            </View>
            <Text style={styles.amount}>₹{booking.priceAtBooking ?? booking.totalAmount ?? '—'}</Text>
          </View>
          {service.duration ? (
            <Text style={styles.serviceDuration}>{service.duration} min</Text>
          ) : null}
        </View>

        {/* Appointment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment</Text>
          <DetailRow icon="calendar-outline" label="Date" value={formatDate(booking.startAt)} />
          <View style={styles.rowDivider} />
          <DetailRow icon="time-outline" label="Time" value={formatTime(booking.startAt)} />
          {booking.endAt ? (
            <>
              <View style={styles.rowDivider} />
              <DetailRow icon="time-outline" label="Ends" value={formatTime(booking.endAt)} />
            </>
          ) : null}
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment</Text>
          <DetailRow
            icon="wallet-outline"
            label="Method"
            value={booking.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}
          />
          <View style={styles.rowDivider} />
          <DetailRow icon="checkmark-circle-outline" label="Status" value={booking.paymentStatus || '—'} />
        </View>

        {/* Notes */}
        {booking.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        ) : null}

        {/* Status timeline */}
        {booking.statusHistory && booking.statusHistory.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status History</Text>
            {booking.statusHistory.map((entry, idx) => {
              const dotColor = STATUS_COLORS[entry.status] || colors.textSecondary;
              return (
                <View key={idx} style={styles.timelineEntry}>
                  <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>
                      {entry.status.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {entry.changedAt
                        ? new Date(entry.changedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Text>
                    {entry.note ? (
                      <Text style={styles.timelineNote}>{entry.note}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Action buttons */}
        {canCancel ? (
          <View style={styles.cancelSection}>
            <Text style={styles.cancelSectionTitle}>Cancel Booking</Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason for cancellation…"
              placeholderTextColor={colors.textSecondary}
              style={styles.cancelInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Cancellation reason"
            />
            <View style={styles.actionRow}>
              {canReschedule ? (
                <AppButton
                  title="Reschedule"
                  onPress={() => setShowRescheduleModal(true)}
                  variant="outline"
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
              ) : null}
              <AppButton
                title="Cancel Booking"
                onPress={() => {
                  if (!cancelReason.trim()) {
                    Alert.alert('Required', 'Please provide a reason for cancellation.');
                    return;
                  }
                  setShowCancelDialog(true);
                }}
                variant="outline"
                style={[{ flex: 1 }, styles.cancelBtn]}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Cancel confirm dialog */}
      <ConfirmDialog
        visible={showCancelDialog}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? This action cannot be undone."
        confirmText={cancelling ? 'Cancelling…' : 'Yes, Cancel'}
        cancelText="Keep Booking"
        destructive
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
      />

      {/* Reschedule modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reschedule Booking</Text>
            <TouchableOpacity
              onPress={() => setShowRescheduleModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Date chips */}
            <Text style={styles.fieldLabel}>Select a date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateChipRow}
            >
              {days.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateChip, rescheduleDate === d && styles.dateChipActive]}
                  onPress={() => handleRescheduleDateSelect(d)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      rescheduleDate === d && styles.dateChipTextActive,
                    ]}
                  >
                    {formatChipDate(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Slots */}
            {!rescheduleDate ? (
              <Text style={styles.hintText}>Select a date to see available slots.</Text>
            ) : rescheduleSlotsLoading ? (
              <ActivityIndicator color={colors.ocean} style={{ marginTop: spacing.lg }} />
            ) : rescheduleSlotsError ? (
              <Text style={styles.errorText}>{rescheduleSlotsError}</Text>
            ) : rescheduleSlots.length === 0 ? (
              <Text style={styles.hintText}>No slots available for this date.</Text>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Select a time</Text>
                <View style={styles.slotGrid}>
                  {rescheduleSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot.startAt}
                      style={[
                        styles.slotChip,
                        rescheduleSelectedSlot?.startAt === slot.startAt && styles.slotChipActive,
                      ]}
                      onPress={() => setRescheduleSelectedSlot(slot)}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.slotChipText,
                          rescheduleSelectedSlot?.startAt === slot.startAt &&
                            styles.slotChipTextActive,
                        ]}
                      >
                        {formatSlotTime(slot.startAt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <AppButton
              title={rescheduling ? 'Rescheduling…' : 'Confirm Reschedule'}
              onPress={handleConfirmReschedule}
              disabled={!rescheduleSelectedSlot || rescheduling}
              size="lg"
              style={{ marginTop: spacing.xl }}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  bookingIdLabel: {
    ...typography.makeTextStyle('sm', 'bold', colors.textPrimary),
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTitle: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serviceName: {
    ...typography.makeTextStyle('lg', 'bold', colors.textPrimary),
    marginBottom: 2,
  },
  serviceCategory: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textTransform: 'capitalize',
  },
  serviceDuration: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: spacing.xs,
  },
  amount: {
    ...typography.makeTextStyle('xl', 'bold', colors.ocean),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  detailIcon: { width: 28, paddingTop: 2 },
  detailContent: { flex: 1 },
  detailLabel: {
    ...typography.makeTextStyle('xs', 'semibold', colors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
  },
  rowDivider: { height: 1, backgroundColor: colors.border },
  notesText: {
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
  },
  // Status history timeline
  timelineEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: spacing.sm,
  },
  timelineContent: { flex: 1 },
  timelineStatus: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
    textTransform: 'capitalize',
  },
  timelineDate: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginTop: 2,
  },
  timelineNote: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Cancel section
  cancelSection: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.md,
  },
  cancelSectionTitle: {
    ...typography.makeTextStyle('md', 'semibold', colors.error),
    marginBottom: spacing.sm,
  },
  cancelInput: {
    backgroundColor: colors.inputBg || colors.cloud,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    minHeight: 80,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    borderColor: colors.error,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  fieldLabel: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textSecondary),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  dateChipRow: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dateChipActive: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  dateChipText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  dateChipTextActive: {
    color: colors.white,
  },
  hintText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  slotChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: '30%',
    alignItems: 'center',
  },
  slotChipActive: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  slotChipText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  slotChipTextActive: {
    color: colors.white,
  },
  errorText: {
    ...typography.makeTextStyle('sm', 'regular', colors.error),
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
