import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

export default function ConfirmDialog({
  visible = false,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {/* stop propagation */}}>
          <Text style={styles.title}>{title}</Text>
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.btn, styles.cancelBtn]}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.btn,
                styles.confirmBtn,
                destructive && styles.destructiveBtn,
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text
                style={[
                  styles.confirmText,
                  destructive && styles.destructiveText,
                ]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    ...typography.makeTextStyle('lg', 'bold', colors.textPrimary),
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.makeTextStyle('md', 'regular', colors.textSecondary),
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  btn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.softGray,
  },
  cancelText: {
    ...typography.makeTextStyle('md', 'medium', colors.textSecondary),
  },
  confirmBtn: {
    backgroundColor: colors.ocean,
  },
  confirmText: {
    ...typography.makeTextStyle('md', 'semibold', colors.white),
  },
  destructiveBtn: {
    backgroundColor: colors.error,
  },
  destructiveText: {
    color: colors.white,
  },
});
