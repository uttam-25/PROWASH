import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import StatusBadge from '../../components/StatusBadge';
import LoadingView from '../../components/LoadingView';
import EmptyState from '../../components/EmptyState';
import adminService from '../../services/adminService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function CustomerRow({ customer, onPress }) {
  const initials = (customer.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.customerRow}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={customer.name}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName} numberOfLines={1}>
          {customer.name}
        </Text>
        <Text style={styles.customerEmail} numberOfLines={1}>
          {customer.email}
        </Text>
        {customer.phone ? (
          <Text style={styles.customerPhone}>{customer.phone}</Text>
        ) : null}
        {customer.totalBookings != null ? (
          <Text style={styles.bookingsCount}>{customer.totalBookings} bookings</Text>
        ) : null}
      </View>
      <View style={styles.customerRight}>
        <StatusBadge status={customer.isActive ? 'active' : 'inactive'} />
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textSecondary}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const loadCustomers = useCallback(async (searchTerm) => {
    try {
      setError(null);
      const data = await adminService.getCustomers({
        search: searchTerm || undefined,
        page: 1,
        limit: 20,
      });
      const list = data?.data?.customers || data?.data || [];
      setCustomers(list);
    } catch (err) {
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers('');
  }, [loadCustomers]);

  const handleSearchChange = (text) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadCustomers(text);
    }, 400);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers(search);
  }, [loadCustomers, search]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Customers" />
        <LoadingView message="Loading customers…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Customers" />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Search by name…"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          accessibilityLabel="Search customers"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => handleSearchChange('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadCustomers(search)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <CustomerRow
              customer={item}
              onPress={() =>
                navigation.navigate('AdminCustomerDetails', { customerId: item._id })
              }
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            customers.length === 0 && styles.listEmpty,
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
              iconName="people-outline"
              title="No customers found"
              subtitle={
                search
                  ? `No results for "${search}"`
                  : 'Customers will appear here after they register.'
              }
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.makeTextStyle('md', 'regular', colors.textPrimary),
    paddingVertical: 4,
  },
  listContent: {
    padding: spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  customerRow: {
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.makeTextStyle('md', 'bold', colors.white),
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...typography.makeTextStyle('md', 'semibold', colors.textPrimary),
  },
  customerEmail: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
    marginTop: 1,
  },
  customerPhone: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
    marginTop: 1,
  },
  bookingsCount: {
    ...typography.makeTextStyle('xs', 'medium', colors.ocean),
    marginTop: 2,
  },
  customerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  chevron: {
    marginTop: 4,
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
