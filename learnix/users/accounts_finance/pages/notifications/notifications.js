import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

const AUDIENCES = [
  { id: 'ALL_STUDENTS', label: 'All Students' },
  { id: 'DEFAULTERS', label: 'Defaulters' },
  { id: 'ALL_STAFF', label: 'All Staff' },
];

export default function NotificationsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('inbox');
  const [form, setForm] = useState({ title: '', content: '', audience: 'ALL_STUDENTS' });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.notifications();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const markAllRead = async () => {
    try { await accountsApi.markAllRead(); fetchData(); } catch (err) { Alert.alert('Error', err.message); }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Missing Fields', 'Please enter both a subject and message.');
      return;
    }
    try {
      await accountsApi.broadcast({ audience: form.audience, title: form.title.trim(), body: form.content.trim() });
      Alert.alert('Broadcast Sent', `Notification delivered to ${AUDIENCES.find((a) => a.id === form.audience)?.label}.`);
      setForm({ title: '', content: '', audience: 'ALL_STUDENTS' });
      setTab('inbox');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread ?? 0;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading…</Text></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {[{ id: 'inbox', label: `Inbox${unreadCount ? ` (${unreadCount})` : ''}` }, { id: 'broadcast', label: 'Broadcast' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'inbox' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllRow} onPress={markAllRead} activeOpacity={0.7}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No notifications</Text></View>
          ) : (
            notifications.map((n) => (
              <TouchableOpacity key={n.id} style={[styles.card, !n.read && styles.unreadCard]} onPress={markAllRead} activeOpacity={0.8}>
                <View style={[styles.iconContainer, { backgroundColor: '#2563eb14' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#2563eb" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{n.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.cardTime}>{n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN') : ''}</Text>
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.formHint}>Broadcast fee reminders, receipts, and updates to students and staff.</Text>
          <Text style={styles.fieldLabel}>Subject</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="e.g. Semester 5 Fee Reminder" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Message</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}><TextInput style={[styles.input, styles.textArea]} value={form.content} onChangeText={(v) => setForm((p) => ({ ...p, content: v }))} placeholder="Write your message..." placeholderTextColor="#cbd5e1" multiline /></View>
          <Text style={styles.fieldLabel}>Audience</Text>
          <View style={styles.audienceGrid}>
            {AUDIENCES.map((a) => (
              <TouchableOpacity key={a.id} style={[styles.audienceChip, form.audience === a.id && styles.audienceChipActive]} onPress={() => setForm((p) => ({ ...p, audience: a.id }))} activeOpacity={0.8}>
                <Text style={[styles.audienceText, form.audience === a.id && styles.audienceTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text style={styles.sendBtnText}>Send Broadcast</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, margin: 24, marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#2563eb' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  markAllRow: { alignSelf: 'flex-end', marginBottom: 12 },
  markAllText: { fontSize: 12, color: '#2563eb', fontFamily: 'Manrope-SemiBold' },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  unreadCard: { borderColor: '#bfdbfe', backgroundColor: '#f8faff' },
  iconContainer: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 17 },
  cardTime: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginLeft: 8, marginTop: 4 },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  textAreaContainer: { paddingVertical: 8 },
  textArea: { height: 96, textAlignVertical: 'top' },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  audienceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  audienceChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  audienceText: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  audienceTextActive: { color: '#FFFFFF' },
  sendBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
