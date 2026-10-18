import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import ServiceCard from '../../components/ServiceCard';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import EmptyState from '../../components/EmptyState';
import * as serviceService from '../../services/serviceService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

const FILTERS = ['All', 'Exterior', 'Interior', 'Full', 'Premium'];

export default function ServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadServices = useCallback(async () => {
    setError(null);
    try {
      const data = await serviceService.getServices();
      setServices(data.services || data.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadServices();
    }, [loadServices])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const filtered = activeFilter === 'All'
    ? services
    : services.filter(
        (s) => s.category?.toLowerCase() === activeFilter.toLowerCase()
      );

  if (loading) return <LoadingView message="Loading services…" />;
  if (error) return <ErrorView message={error} onRetry={() => { setLoading(true); loadServices(); }} />;

  return (
    <View style={styles.container}>
      <AppHeader title="Services" />

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === f }}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => navigation.navigate('ServiceDetails', { service: item })}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <EmptyState
            iconName="sparkles-outline"
            title="No services found"
            subtitle={activeFilter !== 'All' ? `No ${activeFilter.toLowerCase()} services available.` : 'Check back soon.'}
          />
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cloud,
  },
  filters: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterTabActive: {
    backgroundColor: colors.ocean,
    borderColor: colors.ocean,
  },
  filterText: {
    ...typography.makeTextStyle('sm', 'medium', colors.textSecondary),
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
});
