import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { libraryApi } from '../../../../services/api';
import { theme } from '../../../../constants/theme';

const audiences = ['ALL_STUDENTS', 'BORROWERS', 'OVERDUE_MEMBERS'];
const audienceLabels = { ALL_STUDENTS: 'All Students', BORROWERS: 'Borrowers', OVERDUE_MEMBERS: 'Overdue Members' };

export default function Notifications({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Inbox');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('ALL_STUDENTS');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.notifications();
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
    try {
      await libraryApi.markAllRead();
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Incomplete', 'Add a subject and message before broadcasting.');
      return;
    }
    try {
      await libraryApi.broadcast({ audience, title: subject.trim(), body: message.trim() });
      Alert.alert('Broadcast sent', `"${subject}" was pushed to ${audienceLabels[audience]}.`);
      setSubject('');
      setMessage('');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const getTypeColor = (type) => {
    if (!type) return '#0891b2';
    if (type.includes('FINE')) return '#dc2626';
    if (type.includes('BOOK')) return '#2563eb';
    if (type.includes('REQUEST')) return '#d97706';
    return '#0891b2';
  };

  const getTypeIcon = (type) => {
    if (!type) return 'information-circle-outline';
    if (type.includes('FINE')) return 'cash-outline';
    if (type.includes('BOOK')) return 'book-outline';
    if (type.includes('REQUEST')) return 'cart-outline';
    return 'information-circle-outline';
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread ?? 0;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading notifications…</Text></View>;
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
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity style={styles.headerIconBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {activeTab === 'Inbox' && (
          <Text style={styles.headerSub}>{unreadCount} unread · tap the bell to mark all read</Text>
        )}
      </LinearGradient>

      <View style={styles.tabsRow}>
        {['Inbox', 'Broadcast'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Inbox' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}><Ionicons name="notifications-off-outline" size={40} color="#94a3b8" /><Text style={styles.emptyText}>No notifications</Text></View>
          ) : (
            notifications.map((n) => {
              const color = getTypeColor(n.type);
              const timeAgo = n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
              return (
                <TouchableOpacity key={n.id} style={styles.card} onPress={markAllRead}>
                  <View style={styles.iconWrap}>
                    <View style={[styles.iconCircle, { backgroundColor: color + '1a' }]}>
                      <Ionicons name={getTypeIcon(n.type)} size={18} color={color} />
                    </View>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.cardTime}>{timeAgo}</Text>
                    </View>
                    <Text style={styles.cardMessage} numberOfLines={2}>{n.body}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput style={styles.input} placeholder="e.g. Exam season library hours" placeholderTextColor="#9ca3af" value={subject} onChangeText={setSubject} />
            <Text style={styles.formLabel}>Message</Text>
            <TextInput style={[styles.input, styles.messageInput]} placeholder="Write the announcement for students..." placeholderTextColor="#9ca3af" value={message} onChangeText={setMessage} multiline textAlignVertical="top" />
            <Text style={styles.formLabel}>Audience</Text>
            <View style={styles.audienceRow}>
              {audiences.map((a) => (
                <TouchableOpacity key={a} style={[styles.audienceChipBtn, audience === a && styles.audienceChipActive]} onPress={() => setAudience(a)}>
                  <Text style={[styles.audienceChipText, audience === a && styles.audienceChipTextActive]}>{audienceLabels[a]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendBroadcast}>
              <Ionicons name="megaphone-outline" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Broadcast to Students</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Broadcasts push instantly to the student app as notifications. Due reminders are sent automatically 3 days, 1 day and on the due date.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  header: { paddingTop: theme.spacing.xl + 10, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope-Bold', color: '#fff' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 12, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 8 },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: theme.colors.primary },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginTop: 12 },
  iconWrap: { position: 'relative', marginRight: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#fff' },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginRight: 8 },
  cardTime: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  cardMessage: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 18, marginTop: 4 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginTop: 12 },
  formLabel: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  messageInput: { minHeight: 100 },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap' },
  audienceChipBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.surfaceMuted, marginRight: 8, marginBottom: 8 },
  audienceChipActive: { backgroundColor: theme.colors.primary },
  audienceChipText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  audienceChipTextActive: { color: '#fff' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  sendBtnText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 8 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.primaryLight, borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 24 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginLeft: 10, lineHeight: 18 },
});
