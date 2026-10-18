import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { updateService } from '../../services/serviceService';
import { VEHICLE_TYPES } from '../../constants/index';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const CATEGORIES = ['exterior', 'interior', 'full', 'premium'];

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

export default function EditServiceScreen({ route, navigation }) {
  const { service } = route.params;

  const [form, setForm] = useState({
    name: service.name || '',
    description: service.description || '',
    category: service.category || '',
    vehicleTypes: service.vehicleTypes || [],
    price: service.price != null ? String(service.price) : '',
    duration: service.duration != null ? String(service.duration) : '',
    imageUrl: service.imageUrl || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const toggleVehicleType = (type) => {
    setForm((prev) => {
      const types = prev.vehicleTypes.includes(type)
        ? prev.vehicleTypes.filter((t) => t !== type)
        : [...prev.vehicleTypes, type];
      return { ...prev, vehicleTypes: types };
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Service name is required.';
    if (!form.category) errs.category = 'Please select a category.';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      errs.price = 'Enter a valid price.';
    }
    if (!form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 1) {
      errs.duration = 'Enter a valid duration in minutes.';
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      setLoading(true);
      await updateService(service._id, {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        vehicleTypes: form.vehicleTypes.length > 0 ? form.vehicleTypes : VEHICLE_TYPES,
        price: Number(form.price),
        duration: Number(form.duration),
        imageUrl: form.imageUrl.trim() || undefined,
      });
      Alert.alert('Success', 'Service updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update service. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Edit Service"
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
          <AppInput
            label="Service Name *"
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            placeholder="e.g. Premium Exterior Wash"
            error={errors.name}
            autoCapitalize="words"
          />

          <AppInput
            label="Description"
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            placeholder="Describe the service…"
            multiline
          />

          <SectionLabel text="Category *" />
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = form.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setField('category', cat)}
                  accessibilityRole="button"
                  accessibilityLabel={cat}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.category ? (
            <Text style={styles.fieldError}>{errors.category}</Text>
          ) : null}

          <SectionLabel text="Vehicle Types (leave empty for all)" />
          <View style={styles.chipRow}>
            {VEHICLE_TYPES.map((type) => {
              const isSelected = form.vehicleTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleVehicleType(type)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={type}
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppInput
            label="Price (₹) *"
            value={form.price}
            onChangeText={(v) => setField('price', v)}
            placeholder="e.g. 499"
            keyboardType="numeric"
            error={errors.price}
          />

          <AppInput
            label="Duration (minutes) *"
            value={form.duration}
            onChangeText={(v) => setField('duration', v)}
            placeholder="e.g. 60"
            keyboardType="numeric"
            error={errors.duration}
          />

          <AppInput
            label="Image URL (optional)"
            value={form.imageUrl}
            onChangeText={(v) => setField('imageUrl', v)}
            placeholder="https://..."
            keyboardType="url"
          />

          <AppButton
            title="Save Changes"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
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
  sectionLabel: {
    ...typography.makeTextStyle('sm', 'medium', colors.textPrimary),
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  chipText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  chipTextSelected: {
    color: colors.white,
  },
  fieldError: {
    ...typography.makeTextStyle('xs', 'regular', colors.error),
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
