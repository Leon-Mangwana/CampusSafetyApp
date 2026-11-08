import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Alert,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import ErrorState from '../components/ErrorState';

const REFRESH_INTERVAL_MS = 30000;

const getNotificationIcon = (type) => {
  switch (type) {
    case 'sos': return { emoji: '\u{1F6A8}', color: COLORS.danger, label: 'SOS' };
    case 'incident': return { emoji: '\u{26A0}', color: COLORS.warning, label: 'Incident' };
    default: return { emoji: '\u{1F514}', color: COLORS.primary, label: 'System' };
  }
};

const timeAgo = (timestamp) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getNotifications();
      setNotifications(result.notifications || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not load notifications.');
    } finally {
      setLoaded(true);
    }
  }, []);

  const { refresh } = usePolling(fetchNotifications, REFRESH_INTERVAL_MS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (err) {
      setNotifications(previous);
      Alert.alert('Could not update', err?.message || 'Please try again.');
    }
  };

  const handleMarkAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch (err) {
      setNotifications(previous);
      Alert.alert('Could not update', err?.message || 'Please try again.');
    }
  };

  const renderNotification = ({ item }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.unreadCard]}
        onPress={() => !item.isRead && handleMarkRead(item.notificationId)}
        accessibilityRole="button"
        accessibilityLabel={`${icon.label} notification${item.isRead ? '' : ', unread'}: ${item.message}`}
      >
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifMessage, !item.isRead && styles.unreadText]}>{item.message}</Text>
          <Text style={styles.notifTime}>{timeAgo(item.timestamp)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} accessibilityRole="button">
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.notificationId}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={error ? (
          <ErrorState compact title="Could not refresh notifications" message={error} onRetry={refresh} />
        ) : null}
        ListEmptyComponent={loaded && !error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F514}'}</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  markAllText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  listContent: { padding: 12 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  unreadCard: { backgroundColor: '#E3F2FD' },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconEmoji: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifMessage: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  unreadText: { fontWeight: '600' },
  notifTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginLeft: 8 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
});

export default NotificationsScreen;
