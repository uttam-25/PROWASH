import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppButton from '../../components/AppButton';
import LoadingView from '../../components/LoadingView';
import VehicleCard from '../../components/VehicleCard';
import ServiceCard from '../../components/ServiceCard';
import * as vehicleService from '../../services/vehicleService';
import * as serviceService from '../../services/serviceService';
import { bookingService } from '../../services/bookingService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

function createRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepDots({ currentStep, total }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dotStyles.dot, i === currentStep && dotStyles.dotActive]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.ocean,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { label: 'Car', icon: 'car-outline', value: 'Car' },
  { label: 'Bike', icon: 'bicycle-outline', value: 'Bike' },
  { label: 'Scooty', icon: 'bicycle-outline', value: 'Scooty' },
];

export default function BookWashScreen() {
  const navigation = useNavigation();

  const [currentStep, setCurrentStep] = useState(0);
  const [vehicleType, setVehicleType] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceLatitude, setServiceLatitude] = useState('');
  const [serviceLongitude, setServiceLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmInFlightRef = useRef(false);
  const confirmRequestRef = useRef({ fingerprint: null, requestId: null });

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  const [slotError409, setSlotError409] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Back handler
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (currentStep > 0) {
          setCurrentStep((s) => s - 1);
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [currentStep])
  );

  // Load vehicles when step 1 is entered
  useEffect(() => {
    if (currentStep === 1 && vehicleType) {
      setLoadingVehicles(true);
      vehicleService
        .getMyVehicles()
        .then((data) => {
          const all = data.vehicles || data.data || [];
          // Filter by type — match case-insensitively
          setVehicles(all.filter((v) => v.type === vehicleType));
        })
        .catch(() => setVehicles([]))
        .finally(() => setLoadingVehicles(false));
    }
  }, [currentStep, vehicleType]);

  // Load services when step 2 is entered
  useEffect(() => {
    if (currentStep === 2 && vehicleType) {
      setLoadingServices(true);
      serviceService
        .getServices()
        .then((data) => {
          const all = data.services || data.data || [];
          // Filter by vehicleType
          setServices(
            all.filter(
              (s) =>
                !s.vehicleTypes ||
                s.vehicleTypes.length === 0 ||
                s.vehicleTypes.includes(vehicleType)
            )
          );
        })
        .catch(() => setServices([]))
        .finally(() => setLoadingServices(false));
    }
  }, [currentStep, vehicleType]);

  const loadSlots = useCallback(
    async (date) => {
      if (!selectedService) return;
      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const data = await bookingService.getAvailableSlots(selectedService._id, date);
        setSlots(data.data?.availableSlots || data.availableSlots || []);
      } catch (err) {
        setSlotsError(err?.response?.data?.message || 'Failed to load available slots.');
      } finally {
        setSlotsLoading(false);
      }
    },
    [selectedService]
  );

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    loadSlots(date);
  };

  const handleConfirmBooking = async () => {
    if (confirmInFlightRef.current) return;
    const lat = serviceLatitude.trim() === '' ? NaN : Number(serviceLatitude);
    const lng = serviceLongitude.trim() === '' ? NaN : Number(serviceLongitude);
    if (!serviceAddress.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setSubmitError('Enter a service address and valid latitude/longitude to find a nearby partner.');
      return;
    }

    confirmInFlightRef.current = true;
    setIsSubmitting(true);
    setSlotError409(false);
    setSubmitError(null);
    try {
      const requestData = {
        vehicleId: selectedVehicle._id,
        serviceId: selectedService._id,
        startAt: selectedSlot.startAt,
        paymentMethod,
        notes: notes.trim() || undefined,
        customerLocation: {
          address: serviceAddress.trim(),
          lat,
          lng,
        },
      };
      const fingerprint = JSON.stringify(requestData);
      if (confirmRequestRef.current.fingerprint !== fingerprint) {
        confirmRequestRef.current = { fingerprint, requestId: createRequestId() };
      }
      const result = await bookingService.createBooking(requestData, confirmRequestRef.current.requestId);
      const booking = result.data;
      if (paymentMethod === 'online') {
        navigation.navigate('Payment', {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          amount: selectedService.price,
          serviceName: selectedService.name,
        });
      } else {
        navigation.navigate('BookingSuccess', { booking: result.data });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        setSlotError409(true);
      } else {
        setSubmitError(
          err?.response?.data?.message || 'Failed to create booking. Please try again.'
        );
      }
    } finally {
      confirmInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    } else {
      navigation.goBack();
    }
  };

  const days = getNext14Days();

  // ── Render steps ──────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of vehicle?</Text>
      {VEHICLE_TYPES.map((vt) => (
        <TouchableOpacity
          key={vt.value}
          style={styles.typeCard}
          onPress={() => {
            setVehicleType(vt.value);
            setSelectedVehicle(null);
            setSelectedService(null);
            setCurrentStep(1);
          }}
          accessibilityRole="button"
          accessibilityLabel={vt.label}
        >
          <Ionicons name={vt.icon} size={40} color={colors.ocean} />
          <Text style={styles.typeLabel}>{vt.label}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderStep1 = () => {
    if (loadingVehicles) return <LoadingView message="Loading your vehicles…" />;
    return (
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Select your {vehicleType}</Text>
        {vehicles.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="car-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No {vehicleType}s added yet.</Text>
            <AppButton
              title={`Add ${vehicleType}`}
              onPress={() => navigation.navigate('HomeTab', { screen: 'AddVehicle' })}
              variant="outline"
              size="sm"
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          vehicles.map((v) => (
            <TouchableOpacity
              key={v._id}
              style={[
                styles.vehicleWrapper,
                selectedVehicle?._id === v._id && styles.vehicleWrapperSelected,
              ]}
              onPress={() => setSelectedVehicle(v)}
              accessibilityRole="button"
            >
              <VehicleCard vehicle={v} onPress={() => setSelectedVehicle(v)} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  };

  const renderStep2 = () => {
    if (loadingServices) return <LoadingView message="Loading services…" />;
    return (
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Choose a service</Text>
        {services.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No services available for {vehicleType}.</Text>
          </View>
        ) : (
          services.map((s) => (
            <TouchableOpacity
              key={s._id}
              style={[
                styles.serviceWrapper,
                selectedService?._id === s._id && styles.serviceWrapperSelected,
              ]}
              onPress={() =>
                setSelectedService(selectedService?._id === s._id ? null : s)
              }
              accessibilityRole="button"
            >
              <ServiceCard
                service={s}
                onPress={() =>
                  setSelectedService(selectedService?._id === s._id ? null : s)
                }
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  };

  const renderStep3 = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Pick a date & time</Text>

      {/* Date chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateChipRow}
      >
        {days.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.dateChip, selectedDate === d && styles.dateChipActive]}
            onPress={() => handleDateSelect(d)}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.dateChipText,
                selectedDate === d && styles.dateChipTextActive,
              ]}
            >
              {formatChipDate(d)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Slots */}
      {!selectedDate ? (
        <Text style={styles.hintText}>Select a date to see available slots.</Text>
      ) : slotsLoading ? (
        <ActivityIndicator color={colors.ocean} style={{ marginTop: spacing.lg }} />
      ) : slotsError ? (
        <Text style={styles.errorText}>{slotsError}</Text>
      ) : slots.length === 0 ? (
        <Text style={styles.hintText}>No slots available for this date.</Text>
      ) : (
        <View style={styles.slotGrid}>
          {slots.map((slot) => (
            <TouchableOpacity
              key={slot.startAt}
              style={[
                styles.slotChip,
                selectedSlot?.startAt === slot.startAt && styles.slotChipActive,
              ]}
              onPress={() => setSelectedSlot(slot)}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.slotChipText,
                  selectedSlot?.startAt === slot.startAt && styles.slotChipTextActive,
                ]}
              >
                {formatSlotTime(slot.startAt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderStep4 = () => {
    const vehicle = selectedVehicle || {};
    const service = selectedService || {};
    const slotDate = selectedSlot
      ? new Date(selectedSlot.startAt).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '—';
    const slotTime = selectedSlot ? formatSlotTime(selectedSlot.startAt) : '—';

    return (
      <ScrollView contentContainerStyle={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Confirm</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <SummaryRow label="Vehicle" value={`${vehicle.make || ''} ${vehicle.model || ''} · ${vehicle.licensePlate || ''}`} />
          <SummaryRow label="Service" value={`${service.name || ''} — ₹${service.price || 0}`} />
          <SummaryRow label="Duration" value={`${service.duration || 0} min`} />
          <SummaryRow label="Date" value={slotDate} />
          <SummaryRow label="Time" value={slotTime} />
          <SummaryRow label="Amount" value={`₹${service.price || 0}`} isHighlight />
        </View>

        <Text style={styles.fieldLabel}>Service Address</Text>
        <TextInput
          value={serviceAddress}
          onChangeText={setServiceAddress}
          placeholder="Address where the wash will take place"
          placeholderTextColor={colors.textSecondary}
          style={styles.locationInput}
          accessibilityLabel="Service address"
        />
        <Text style={styles.fieldLabel}>Service Location Coordinates</Text>
        <View style={styles.coordinatesRow}>
          <TextInput
            value={serviceLatitude}
            onChangeText={setServiceLatitude}
            placeholder="Latitude"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            style={[styles.locationInput, styles.coordinateInput]}
            accessibilityLabel="Service latitude"
          />
          <TextInput
            value={serviceLongitude}
            onChangeText={setServiceLongitude}
            placeholder="Longitude"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            style={[styles.locationInput, styles.coordinateInput]}
            accessibilityLabel="Service longitude"
          />
        </View>
        <Text style={styles.locationHint}>
          Coordinates are required to match an online partner within 2 km. Enter them from a map.
        </Text>

        {/* Notes */}
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions…"
          placeholderTextColor={colors.textSecondary}
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Booking notes"
        />

        {/* Payment method */}
        <Text style={styles.fieldLabel}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <TouchableOpacity
            style={[styles.paymentChip, paymentMethod === 'cod' && styles.paymentChipActive]}
            onPress={() => setPaymentMethod('cod')}
            accessibilityRole="radio"
            accessibilityLabel="Cash on Delivery"
          >
            <Text
              style={[
                styles.paymentChipText,
                paymentMethod === 'cod' && styles.paymentChipTextActive,
              ]}
            >
              Cash on Delivery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentChip, paymentMethod === 'online' && styles.paymentChipActive]}
            onPress={() => setPaymentMethod('online')}
            accessibilityRole="radio"
            accessibilityLabel="Pay Online"
          >
            <Text
              style={[
                styles.paymentChipText,
                paymentMethod === 'online' && styles.paymentChipTextActive,
              ]}
            >
              Pay Online
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error states */}
        {slotError409 ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>
              This slot was just taken by someone else.
            </Text>
            <AppButton
              title="Pick Another Time"
              onPress={() => {
                setSlotError409(false);
                setSelectedSlot(null);
                setCurrentStep(3);
              }}
              variant="outline"
              size="sm"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : null}

        {submitError ? (
          <Text style={styles.errorText}>{submitError}</Text>
        ) : null}

        {/* Confirm button */}
        <AppButton
          title={isSubmitting ? 'Confirming…' : 'Confirm Booking'}
          onPress={handleConfirmBooking}
          disabled={isSubmitting}
          size="lg"
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  const canContinue = [
    true, // step 0: type cards auto-advance
    !!selectedVehicle, // step 1
    !!selectedService, // step 2
    !!selectedSlot, // step 3
    false, // step 4: handled by Confirm button
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Wash</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress dots */}
      <StepDots currentStep={currentStep} total={5} />

      {/* Step content */}
      <View style={{ flex: 1 }}>
        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </View>

      {/* Continue footer (steps 1-3) */}
      {currentStep >= 1 && currentStep <= 3 ? (
        <View style={styles.footer}>
          <AppButton
            title="Continue"
            onPress={() => setCurrentStep((s) => s + 1)}
            disabled={!canContinue[currentStep]}
            size="lg"
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, isHighlight }) {
  return (
    <View style={summaryStyles.row}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={[summaryStyles.value, isHighlight && summaryStyles.highlight]}>{value}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    flex: 1,
  },
  value: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
    flex: 2,
    textAlign: 'right',
  },
  highlight: {
    color: colors.ocean,
    ...typography.makeTextStyle('md', 'bold', colors.ocean),
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
  },
  stepContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepTitle: {
    ...typography.makeTextStyle('xl', 'bold', colors.textPrimary),
    marginBottom: spacing.lg,
  },
  // Step 0 — vehicle type
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: spacing.md,
  },
  typeLabel: {
    ...typography.makeTextStyle('lg', 'semibold', colors.textPrimary),
    flex: 1,
  },
  // Step 1 — vehicles
  vehicleWrapper: {
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 0,
  },
  vehicleWrapperSelected: {
    borderColor: colors.ocean,
  },
  emptyBox: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Step 2 — services
  serviceWrapper: {
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceWrapperSelected: {
    borderColor: colors.ocean,
  },
  // Step 3 — date & time
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
    marginTop: spacing.md,
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
  // Step 4 — review
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  fieldLabel: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textSecondary),
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    minHeight: 80,
    marginBottom: spacing.lg,
  },
  locationInput: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    minHeight: 48,
    marginBottom: spacing.md,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coordinateInput: {
    flex: 1,
  },
  locationHint: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginBottom: spacing.lg,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  paymentChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  paymentChipActive: {
    borderColor: colors.ocean,
    backgroundColor: colors.ocean + '15',
  },
  paymentChipText: {
    ...typography.makeTextStyle('sm', 'semibold', colors.textPrimary),
  },
  paymentChipTextActive: {
    color: colors.ocean,
  },
  errorText: {
    ...typography.makeTextStyle('sm', 'regular', colors.error),
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.error + '15',
    borderRadius: spacing.borderRadius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  errorBoxText: {
    ...typography.makeTextStyle('sm', 'semibold', colors.error),
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
