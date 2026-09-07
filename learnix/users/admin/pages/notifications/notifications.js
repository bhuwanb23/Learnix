import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { api, setDemoUser } from '../../../../services/api';

const ICON_MAP = {
  'person-add': { icon: 'person-add', color: '#2563eb' },
  'warning': { icon: 'warning', color: '#ef4444' },
  'calendar': { icon: 'calendar', color: '#d97706' },
  'cash': { icon: 'cash', color: '#059669' },
  'briefcase': { icon: 'briefcase', color: '#0284c7' },
  'checkmark-circle': { icon: 'checkmark-circle', color: '#059669' },
  'school': { icon: 'school', color: '#2563eb' },
  'book': { icon: 'book', color: '#d97706' },
};

function mapNotification(n) {
  const mapped = ICON_MAP[n.type] || { icon: 'notifications', color: '#6366f1' };
  return {
    id: n.id,
    title: n.title,
    description: n.body,
    time: n.timeAgo || formatTimeAgo(n.createdAt),
    type: mapped.icon,
    color: mapped.color,
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.adminApi.notifications();
      setNotifications((data.notifications || []).map(mapNotification));
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

  const handleMarkAllRead = async () => {
    try {
      await api.adminApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim() || !broadcastTarget) return;
    setSending(true);
    try {
      await api.adminApi.broadcast({
        audience: broadcastTarget,
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
      });
      setShowBroadcast(false);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastTarget('');
    } catch (e) {
      console.warn('Failed to send broadcast:', e);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {unreadCount > 0 && (
          <Text style={styles.unreadText}>{unreadCount} unread</Text>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.broadcastBtn} onPress={() => setShowBroadcast(true)} activeOpacity={0.7}>
          <Ionicons name="megaphone" size={14} color="#2563eb" />
          <Text style={styles.broadcastBtnText}>Broadcast</Text>
        </TouchableOpacity>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map(item => (
            <View
              key={item.id}
              style={[styles.card, item.unread && styles.unreadCard]}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '14' }]}>
                <Ionicons name={item.type} size={18} color={item.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
              {item.unread ? <View style={styles.unreadDot} /> : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={showBroadcast} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Broadcast</Text>
              <TouchableOpacity onPress={() => setShowBroadcast(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Audience</Text>
            {['all', 'all_faculty', 'all_students'].map(aud => (
              <TouchableOpacity
                key={aud}
                style={[styles.audienceOption, broadcastTarget === aud && styles.audienceSelected]}
                onPress={() => setBroadcastTarget(aud)}
              >
                <Text style={[styles.audienceText, broadcastTarget === aud && styles.audienceTextSelected]}>
                  {aud === 'all' ? 'All Users' : aud === 'all_faculty' ? 'All Faculty' : 'All Students'}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              placeholder="Notification title"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={broadcastBody}
              onChangeText={setBroadcastBody}
              placeholder="Type your message..."
              placeholderTextColor="#94a3b8"
              multiline
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!broadcastTarget || !broadcastTitle.trim() || !broadcastBody.trim()) && styles.sendBtnDisabled]}
              onPress={handleSendBroadcast}
              disabled={sending || !broadcastTarget || !broadcastTitle.trim() || !broadcastBody.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.sendBtnText}>{sending ? 'Sending...' : 'Send Broadcast'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: '#f1f5f9', gap: 10 },
  unreadText: { fontSize: TYPOGRAPHY.fontSize.xs, color: '#475569', fontFamily: 'Manrope-Medium' },
  markAllText: { fontSize: TYPOGRAPHY.fontSize.xs, color: '#2563eb', fontFamily: 'Manrope-SemiBold' },
  broadcastBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  broadcastBtnText: { fontSize: 11, color: '#2563eb', fontFamily: 'Manrope-SemiBold' },
  scrollContent: { padding: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 12 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ffffff', borderRadius: 16, padding: SPACING.md, marginBottom: SPACING.sm },
  unreadCard: { borderWidth: 1, borderColor: '#bfdbfe' },
  iconContainer: { width: 38, height: 38, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: '#0f172a', fontFamily: 'Manrope-SemiBold', marginBottom: 2 },
  cardDesc: { fontSize: TYPOGRAPHY.fontSize.xs, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18 },
  cardTime: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginLeft: SPACING.sm, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontFamily: 'Manrope-Bold', color: '#0f172a' },
  fieldLabel: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#475569', marginBottom: 6, marginTop: 10 },
  audienceOption: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f1f5f9', marginBottom: 6 },
  audienceSelected: { backgroundColor: '#2563eb' },
  audienceText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: '#475569' },
  audienceTextSelected: { color: '#ffffff' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Manrope-Regular', color: '#0f172a', backgroundColor: '#f8fafc' },
  sendBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#ffffff', fontSize: 15, fontFamily: 'Manrope-SemiBold' },
});
