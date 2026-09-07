import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import NotificationCard from './components/NotificationCard';
import { api } from '../../../../services/api';

function formatNotification(n) {
  return {
    id: n.id,
    title: n.title,
    message: n.body,
    type: n.type?.toLowerCase() || 'info',
    time: formatTimeAgo(n.createdAt),
    unread: !n.read,
  };
}

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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.teacherApi.notifications();
      setItems((data.notifications || []).map(formatNotification));
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

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handlePress = (notification) => {
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)));
  };

  const handleMarkAll = async () => {
    try {
      await api.teacherApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  };

  const unreadCount = items.filter((n) => n.unread).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0050d4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAll} activeOpacity={0.8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0050d4']} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-off" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          items.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={handlePress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32, paddingTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e9eb' },
  headerText: { flex: 1 },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, fontWeight: '700', color: '#2c2f31' },
  subtitle: { fontFamily: 'Manrope-Medium', fontSize: 12, fontWeight: '500', color: '#8a8f94', marginTop: 2 },
  markAllButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: 'rgba(0, 80, 212, 0.1)' },
  markAllText: { fontFamily: 'Manrope-Bold', fontSize: 12, fontWeight: '700', color: '#0050d4' },
});
