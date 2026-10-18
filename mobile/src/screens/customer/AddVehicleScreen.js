import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import * as vehicleService from '../../services/vehicleService';
import { VEHICLE_TYPES } from '../../constants/index';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

export default function AddVehicleScreen({ navigation }) {
  const [type, setType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [photo, setPhoto] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!type) e.type = 'Vehicle type is required.';
    if (!make.trim()) e.make = 'Make is required.';
    if (!model.trim()) e.model = 'Model is required.';
    if (year && (isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1)) {
      e.year = 'Enter a valid year.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library access to upload a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await vehicleService.addVehicle({
        type,
        make: make.trim(),
        model: model.trim(),
        year: year ? Number(year) : undefined,
        licensePlate: licensePlate.trim() || undefined,
        color: color.trim() || undefined,
        photo: photo || undefined,
      });
      Alert.alert('Success', 'Vehicle added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add vehicle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="Add Vehicle" showBack onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Type Picker */}
        <Text style={styles.label}>Vehicle Type *</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, errors.type ? styles.pickerBtnError : null]}
          onPress={() => setShowTypePicker(!showTypePicker)}
          accessibilityRole="button"
          accessibilityLabel="Select vehicle type"
        >
          <Text style={type ? styles.pickerValue : styles.pickerPlaceholder}>
            {type || 'Select type…'}
          </Text>
          <Ionicons
            name={showTypePicker ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}
        {showTypePicker && (
          <View style={styles.typeList}>
            {VEHICLE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeItem, type === t && styles.typeItemActive]}
                onPress={() => { setType(t); setShowTypePicker(false); setErrors((e) => ({ ...e, type: undefined })); }}
                accessibilityRole="button"
              >
                <Text style={[styles.typeItemText, type === t && styles.typeItemTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <AppInput
          label="Make *"
          value={make}
          onChangeText={(v) => { setMake(v); setErrors((e) => ({ ...e, make: undefined })); }}
          placeholder="e.g. Maruti, Honda"
          error={errors.make}
          autoCapitalize="words"
        />
        <AppInput
          label="Model *"
          value={model}
          onChangeText={(v) => { setModel(v); setErrors((e) => ({ ...e, model: undefined })); }}
          placeholder="e.g. Swift, Activa"
          error={errors.model}
          autoCapitalize="words"
        />
        <AppInput
          label="Year"
          value={year}
          onChangeText={(v) => { setYear(v); setErrors((e) => ({ ...e, year: undefined })); }}
          placeholder="e.g. 2020"
          keyboardType="numeric"
          error={errors.year}
        />
        <AppInput
          label="License Plate"
          value={licensePlate}
          onChangeText={setLicensePlate}
          placeholder="e.g. MH01AB1234"
          autoCapitalize="characters"
        />
        <AppInput
          label="Color"
          value={color}
          onChangeText={setColor}
          placeholder="e.g. White, Silver"
          autoCapitalize="words"
        />

        {/* Photo picker */}
        <Text style={styles.label}>Photo (optional)</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={pickImage} accessibilityRole="button">
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <AppButton
          title="Add Vehicle"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    ...typography.makeTextStyle('sm', 'medium', colors.textPrimary),
    marginBottom: spacing.xs,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  pickerBtnError: {
    borderColor: colors.error,
  },
  pickerValue: {
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
  },
  pickerPlaceholder: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
  },
  typeList: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  typeItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeItemActive: {
    backgroundColor: colors.ocean,
  },
  typeItemText: {
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
  },
  typeItemTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },
  errorText: {
    ...typography.makeTextStyle('xs', 'regular', colors.error),
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  photoBtn: {
    marginBottom: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: '100%',
    height: 160,
  },
  photoPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    gap: spacing.sm,
  },
  photoPlaceholderText: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
