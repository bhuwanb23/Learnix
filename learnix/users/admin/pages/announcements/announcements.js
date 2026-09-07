import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { api } from '../../../../services/api';

const STATUS_COLORS = {
  PUBLISHED: '#059669',
  PENDING: '#d97706',
  REJECTED: '#dc2626',
};

function mapAnnouncement(a) {
  return {
    id: a.id,
    title: a.title,
    content: a.content || a.body,
    audience: a.targetAudience || 'All',
    status: a.status,
    author: a.createdByUser?.name || 'Admin',
    publishedAt: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : null,
    requestedAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : null,
    color: STATUS_COLORS[a.status] || '#6366f1',
  };
}

export default function AnnouncementsModule({ navigation }) {
  const [tab, setTab] = useState('published');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', audience: 'all' });
  const [deciding, setDeciding] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await api.adminApi.announcements();
      setAnnouncements((data.announcements || []).map(mapAnnouncement));
    } catch (e) {
      console.warn('Failed to load announcements:', e);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements().finally(() => setLoading(false));
  }, [fetchAnnouncements]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  };

  const published = announcements.filter(a => a.status === 'PUBLISHED');
  const pending = announcements.filter(a => a.status === 'PENDING' || a.status === 'DRAFT');

  const handleApprove = async (item) => {
    setDeciding(item.id);
    try {
      await api.adminApi.decideAnnouncement(item.id, 'approve');
      setAnnouncements(prev => prev.map(a => a.id === item.id ? { ...a, status: 'PUBLISHED' } : a));
    } catch (e) {
      console.warn('Failed to approve:', e);
    } finally {
      setDeciding(null);
    }
  };

  const handleReject = async (item) => {
    setDeciding(item.id);
    try {
      await api.adminApi.decideAnnouncement(item.id, 'reject');
      setAnnouncements(prev => prev.map(a => a.id === item.id ? { ...a, status: 'REJECTED' } : a));
    } catch (e) {
      console.warn('Failed to reject:', e);
    } finally {
      setDeciding(null);
    }
  };

  const handleCompose = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Missing Fields', 'Please enter both a title and message content.');
      return;
    }
    try {
      await api.adminApi.createAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        targetAudience: form.audience,
      });
      setForm({ title: '', content: '', audience: 'all' });
      setShowCompose(false);
      fetchAnnouncements();
    } catch (e) {
      console.warn('Failed to create announcement:', e);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (showCompose) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowCompose(false)} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#2563eb" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>New Announcement</Text>
              <Text style={styles.headerSubtitle}>Compose a broadcast message</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm(p => ({ ...p, title: v }))}
              placeholder="e.g. Exam Schedule Released"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Message</Text>
          <View style={[styles.inputContainer, { minHeight: 100, alignItems: 'flex-start' }]}>
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              value={form.content}
              onChangeText={(v) => setForm(p => ({ ...p, content: v }))}
              placeholder="Write your announcement message..."
              placeholderTextColor="#cbd5e1"
              multiline
            />
          </View>

          <TouchableOpacity
            style={styles.publishBtn}
            onPress={handleCompose}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone" size={16} color="#fff" />
            <Text style={styles.publishBtnText}>Publish</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {['published', 'pending'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'published' ? `Published (${published.length})` : `Pending (${pending.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.composeBtn} onPress={() => setShowCompose(true)} activeOpacity={0.7}>
        <Ionicons name="create" size={14} color="#2563eb" />
        <Text style={styles.composeBtnText}>Compose</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {tab === 'published' && published.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '14' }]}>
              <Ionicons name="megaphone" size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.content}</Text>
              <Text style={styles.cardMeta}>{item.audience} • {item.author} • {item.publishedAt}</Text>
            </View>
          </View>
        ))}

        {tab === 'pending' && pending.map(item => (
          <View key={item.id} style={[styles.card, { borderLeftColor: '#d97706', borderLeftWidth: 4 }]}>
            <View style={[styles.iconWrap, { backgroundColor: '#d9770614' }]}>
              <Ionicons name="time" size={18} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.content}</Text>
              <Text style={styles.cardMeta}>{item.author} • {item.requestedAt} • Target: {item.audience}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                onPress={() => handleApprove(item)}
                disabled={deciding === item.id}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
                onPress={() => handleReject(item)}
                disabled={deciding === item.id}
              >
                <Ionicons name="close" size={14} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {((tab === 'published' && published.length === 0) || (tab === 'pending' && pending.length === 0)) && (
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No {tab} announcements</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb1A', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  headerSubtitle: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#fff' },
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginHorizontal: 16, marginTop: 12 },
  composeBtnText: { fontSize: 12, color: '#2563eb', fontFamily: 'Manrope-SemiBold' },
  scrollContent: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  cardDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 16 },
  cardMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
  fieldLabel: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: '#475569', marginBottom: 6, marginTop: 10 },
  inputContainer: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  input: { fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', padding: 0 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  publishBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Manrope-SemiBold' },
});
