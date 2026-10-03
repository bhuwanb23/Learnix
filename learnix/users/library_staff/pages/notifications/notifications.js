import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

const audiences = ['ALL_STUDENTS', 'BORROWERS', 'OVERDUE_MEMBERS'];
const audienceLabels = {
  ALL_STUDENTS: 'All Students',
  BORROWERS: 'Borrowers',
  OVERDUE_MEMBERS: 'Overdue Members',
};
const audienceIcons = {
  ALL_STUDENTS: 'school-outline',
  BORROWERS: 'people-outline',
  OVERDUE_MEMBERS: 'alarm-outline',
};

const TABS = ['Inbox', 'Broadcast'];

export default function Notifications({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Inbox');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('ALL_STUDENTS');
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

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
    setMarking(true);
    try {
      await libraryApi.markAllRead();
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setMarking(false);
    }
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Incomplete', 'Add a subject and message before broadcasting.');
      return;
    }
    setSending(true);
    try {
      await libraryApi.broadcast({ audience, title: subject.trim(), body: message.trim() });
      Alert.alert('Broadcast sent', `"${subject.trim()}" was pushed to ${audienceLabels[audience]}.`);
      setSubject('');
      setMessage('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  };

  const getTypeColor = (type) => {
    if (!type) return THEME;
    if (type.includes('FINE')) return '#dc2626';
    if (type.includes('BOOK')) return '#2563eb';
    if (type.includes('REQUEST')) return '#d97706';
    return THEME;
  };

  const getTypeIcon = (type) => {
    if (!type) return 'information-circle-outline';
    if (type.includes('FINE')) return 'cash-outline';
    if (type.includes('BOOK')) return 'book-outline';
    if (type.includes('REQUEST')) return 'cart-outline';
    return 'information-circle-outline';
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
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

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread ?? 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}>
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            {activeTab === tab ? <Ionicons name={tab === 'Inbox' ? 'notifications-outline' : 'megaphone-outline'} size={14} color={THEME} style={styles.tabIcon} /> : null}
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Inbox' ? (
        <>
          <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
            {[
              { label: 'Unread', value: unreadCount, icon: 'mail-unread-outline', color: '#dc2626' },
              { label: 'Total', value: notifications.length, icon: 'notifications-outline', color: THEME },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statCell}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                    <Ionicons name={s.icon} size={18} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </AnimatedCard>

          {unreadCount > 0 && (
            <AnimatedCard delay={80} style={styles.block}>
              <View style={styles.markAllRow}>
                <View style={styles.markAllTextWrap}>
                  <Text style={styles.markAllTitle}>You have {unreadCount} unread</Text>
                  <Text style={styles.markAllSub}>Clear the inbox so nothing slips through.</Text>
                </View>
                <TouchableOpacity style={[styles.markAllBtn, marking && styles.btnBusy]} onPress={markAllRead} activeOpacity={0.8} disabled={marking}>
                  {marking
                    ? <ActivityIndicator size="small" color={THEME} />
                    : <Ionicons name="checkmark-done" size={16} color={THEME} />}
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          )}

          <Text style={styles.sectionLabel}>Activity</Text>

          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications-off-outline"
              title="Nothing here yet"
              subtitle="Loan activity, fines and request updates will land here as they happen."
              color={THEME}
            />
          ) : (
            notifications.map((n, idx) => {
              const color = getTypeColor(n.type);
              const timeAgo = n.createdAt
                ? new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : '';
              return (
                <AnimatedCard key={n.id} delay={140 + idx * 50} style={styles.block}>
                  <View style={styles.notifRow}>
                    <View style={[styles.notifIcon, { backgroundColor: color + '14' }]}>
                      <Ionicons name={getTypeIcon(n.type)} size={18} color={color} />
                    </View>
                    <View style={styles.notifBody}>
                      <View style={styles.notifTop}>
                        <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]} numberOfLines={1}>{n.title}</Text>
                        {timeAgo ? <Text style={styles.notifTime}>{timeAgo}</Text> : null}
                      </View>
                      <Text style={styles.notifMessage} numberOfLines={2}>{n.body}</Text>
                    </View>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                </AnimatedCard>
              );
            })
          )}
        </>
      ) : (
        <>
          <AnimatedCard delay={0} style={styles.block}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons name="megaphone-outline" size={18} color={THEME} />
              </View>
              <View style={styles.formHeaderText}>
                <Text style={styles.formTitle}>Send an announcement</Text>
                <Text style={styles.formSubtitle}>Pushes instantly to the student app.</Text>
              </View>
            </View>

            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Exam season library hours"
              placeholderTextColor="#9ca3af"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Write the announcement for students..."
              placeholderTextColor="#9ca3af"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.formLabel}>Audience</Text>
            <View style={styles.audienceRow}>
              {audiences.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.audienceChip, audience === a && styles.audienceChipActive]}
                  onPress={() => setAudience(a)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={audienceIcons[a]}
                    size={13}
                    color={audience === a ? '#fff' : '#64748b'}
                  />
                  <Text style={[styles.audienceChipText, audience === a && styles.audienceChipTextActive]}>
                    {audienceLabels[a]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnBusy]}
              onPress={sendBroadcast}
              activeOpacity={0.85}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#fff" />}
              <Text style={styles.sendBtnText}>{sending ? 'Sending…' : `Broadcast to ${audienceLabels[audience]}`}</Text>
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard delay={80} style={styles.block}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
              </View>
              <Text style={styles.infoText}>
                Due reminders are sent automatically 3 days and 1 day before the due date, and again on the day itself. Overdue members get a final alert after 7 days.
              </Text>
            </View>
          </AnimatedCard>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: THEME + '14' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  tabTextActive: { color: THEME, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Mark all read
  markAllRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  markAllTextWrap: { flex: 1, paddingRight: 10 },
  markAllTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  markAllSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  markAllBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: THEME + '14', borderWidth: 1, borderColor: THEME + '33', justifyContent: 'center', alignItems: 'center' },
  btnBusy: { opacity: 0.6 },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10, marginTop: 8 },

  // Notification rows
  notifRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  notifIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifBody: { flex: 1 },
  notifTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155', fontFamily: 'Manrope-SemiBold', marginRight: 8 },
  notifTitleUnread: { fontWeight: '700', color: '#0f172a' },
  notifTime: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  notifMessage: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 17, marginTop: 3 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: THEME, marginLeft: 8 },

  // Broadcast form
  formHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  formIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  formHeaderText: { flex: 1 },
  formTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  formSubtitle: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  formLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Medium' },
  messageInput: { minHeight: 100 },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  audienceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  audienceChipActive: { backgroundColor: THEME, borderColor: THEME },
  audienceChipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  audienceChipTextActive: { color: '#fff' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  sendBtnBusy: { opacity: 0.8 },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },

  // Info
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  infoIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  infoText: { flex: 1, fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 18 },
});
