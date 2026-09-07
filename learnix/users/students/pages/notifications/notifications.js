import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../../../../services/api';
import { NOTIFICATION_COLORS } from './constants/notificationsData';
import NotificationCard from './components/NotificationCard';

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.studentApi.notifications();
      setNotifications((data.notifications || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.body,
        type: n.type?.toLowerCase() || 'info',
        time: formatTimeAgo(n.createdAt),
        unread: !n.read,
      })));
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleBack = () => navigation?.goBack?.();

  const handleMarkAllRead = async () => {
    try {
      await api.studentApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  };

  const handleNotificationPress = (notification) => {
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, unread: false } : n));
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#0050d4" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={NOTIFICATION_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up 🎉'}
        </Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0050d4" />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-off" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map(n => <NotificationCard key={n.id} notification={n} onPress={handleNotificationPress} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NOTIFICATION_COLORS.surface },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(171,173,175,0.15)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold', color: NOTIFICATION_COLORS.primary },
  markAllText: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold', color: NOTIFICATION_COLORS.primary },
  summaryRow: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryText: { fontSize: 13, fontWeight: '600', fontFamily: 'Manrope-SemiBold', color: '#666' },
  listContent: { paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
});
