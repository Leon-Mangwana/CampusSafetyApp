import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'sos': return { emoji: '\u{1F6A8}', color: COLORS.danger };
    case 'incident': return { emoji: '\u{26A0}', color: COLORS.warning };
    default: return { emoji: '\u{1F514}', color: COLORS.primary };
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const result = await getNotifications();
      setNotifications(result.notifications || []);
    } catch {
      // Demo data
      setNotifications([
        {
          notificationId: '1', type: 'sos', message: 'SOS Alert: Student near Main Gate needs help.',
          timestamp: new Date(Date.now() - 120000).toISOString(), isRead: false,
        },
        {
          notificationId: '2', type: 'incident', message: 'High severity theft reported near Library Block B.',
          timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false,
        },
        {
          notificationId: '3', type: 'system', message: 'Welcome to MSU Campus Safety App!',
          timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true,
        },
      ]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch { /* ok */ }
    setNotifications((prev) =>
      prev.map((n) => (n.notificationId === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch { /* ok */ }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const renderNotification = ({ item }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.unreadCard]}
        onPress={() => handleMarkRead(item.notificationId)}
      >
        <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifMessage, !item.isRead && styles.unreadText]}>
            {item.message}
          </Text>
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
          <TouchableOpacity onPress={handleMarkAllRead}>
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'\u{1F514}'}</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifMessage: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  unreadText: { fontWeight: '600' },
  notifTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.primary, marginLeft: 8,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
});

export default NotificationsScreen;
