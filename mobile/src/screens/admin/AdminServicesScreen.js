import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { getServices, deleteService, updateService } from '../../services/serviceService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const CATEGORY_COLORS = {
  exterior: colors.ocean,
  interior: colors.aqua,
  full: colors.success,
  premium: colors.warning,
};

function ServiceRow({ service, onEdit, onDelete, onToggle }) {
  const catColor = CATEGORY_COLORS[service.category] || colors.textSecondary;
  return (
    <TouchableOpacity
      style={styles.serviceRow}
      onPress={onEdit}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={service.name}
    >
      <View style={styles.serviceMain}>
        <View style={styles.nameRow}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {service.name}
          </Text>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22', borderColor: catColor }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>
              {(service.category || '').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.serviceDetails}>
          <Text style={styles.price}>₹{service.price}</Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.duration}>{service.duration} min</Text>
        </View>
      </View>
      <View style={styles.serviceActions}>
        <Switch
          value={service.isActive}
          onValueChange={(val) => onToggle(service, val)}
          trackColor={{ false: colors.softGray, true: colors.ocean + '66' }}
          thumbColor={service.isActive ? colors.ocean : colors.textSecondary}
          accessibilityLabel={service.isActive ? 'Active' : 'Inactive'}
        />
        <TouchableOpacity
          onPress={() => onDelete(service)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete service"
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function AdminServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const loadServices = useCallback(async () => {
    try {
      setError(null);
      const data = await getServices();
      // getServices returns {data:[...]} or the array directly
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setServices(list);
    } catch (err) {
      setError('Failed to load services. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadServices();
  }, [loadServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices();
  }, [loadServices]);

  const handleToggle = async (service, newValue) => {
    try {
      await updateService(service._id, { isActive: newValue });
      setServices((prev) =>
        prev.map((s) => (s._id === service._id ? { ...s, isActive: newValue } : s))
      );
    } catch {
      Alert.alert('Error', 'Failed to update service status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService(deleteTarget._id);
      setServices((prev) => prev.filter((s) => s._id !== deleteTarget._id));
    } catch {
      Alert.alert('Error', 'Failed to delete service.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Services"
          rightAction={
            <TouchableOpacity
              onPress={() => navigation.navigate('AddService')}
              style={styles.addBtn}
              accessibilityRole="button"
              accessibilityLabel="Add service"
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          }
        />
        <LoadingView message="Loading services…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Services"
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddService')}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="Add service"
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        }
      />

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadServices}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ServiceRow
              service={item}
              onEdit={() => navigation.navigate('EditService', { service: item })}
              onDelete={(s) => setDeleteTarget(s)}
              onToggle={handleToggle}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            services.length === 0 && styles.listEmpty,
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
              iconName="sparkles-outline"
              title="No services yet"
              subtitle="Add your first wash service to get started."
              actionLabel="Add Service"
              onAction={() => navigation.navigate('AddService')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Service"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  addBtn: {
    padding: 4,
  },
  listContent: {
    padding: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  serviceMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  serviceName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1,
  },
  catBadgeText: {
    ...typography.makeTextStyle('xs', 'bold'),
    letterSpacing: 0.5,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  price: {
    ...typography.makeTextStyle('sm', 'semibold', colors.ocean),
  },
  separator: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  duration: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.xs,
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
