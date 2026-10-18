import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import LoadingView from '../../components/LoadingView';
import ErrorView from '../../components/ErrorView';
import EmptyState from '../../components/EmptyState';
import * as notificationService from '../../services/notificationService';
import colors from '../../theme/colors';
import spacing from '../../theme/spacing';
import typography from '../../theme/typography';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationItem({ notification, onPress }) {
  const { title, body, isRead, createdAt } = notification;
  return (
    <TouchableOpacity
      style={[styles.item, !isRead && styles.itemUnread]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {!isRead && <View style={styles.unreadBar} />}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, !isRead && styles.itemTitleUnread]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.itemTime}>{timeAgo(createdAt)}</Text>
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setError(null);
    try {
      const data = await notificationService.getMyNotifications();
      setNotifications(data.data?.notifications || data.notifications || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // silent — marking read is non-critical
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silent
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) return <LoadingView message="Loading notifications…" />;
  if (error) return <ErrorView message={error} onRetry={() => { setLoading(true); loadNotifications(); }} />;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Notifications"
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} accessibilityRole="button">
              <Text style={styles.markAllText}>Mark all</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleMarkRead(item._id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <EmptyState
            iconName="notifications-outline"
            title="No notifications"
            subtitle="You're all caught up!"
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
  markAllText: {
    ...typography.makeTextStyle('sm', 'semibold', colors.aqua),
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemUnread: {
    backgroundColor: '#EFF6FB',
  },
  unreadBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.ocean,
    marginRight: spacing.sm,
    alignSelf: 'stretch',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    ...typography.makeTextStyle('md', 'medium', colors.textPrimary),
    flex: 1,
    marginRight: spacing.sm,
  },
  itemTitleUnread: {
    fontWeight: typography.fontWeights.bold,
  },
  itemTime: {
    ...typography.makeTextStyle('xs', 'regular', colors.textSecondary),
  },
  itemBody: {
    ...typography.makeTextStyle('sm', 'regular', colors.textSecondary),
  },
});
