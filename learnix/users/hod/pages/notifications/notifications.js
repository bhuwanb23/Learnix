import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';

const TYPE_META = {
  SYLLABUS: { color: '#2563eb', icon: 'document-text-outline' },
  LEAVE: { color: '#059669', icon: 'calendar-outline' },
  BROADCAST: { color: '#7c3aed', icon: 'megaphone-outline' },
  MENTORSHIP: { color: '#0891b2', icon: 'people-outline' },
  EVENT: { color: '#d97706', icon: 'calendar-outline' },
  SYSTEM: { color: '#64748b', icon: 'information-circle-outline' },
};

const AUDIENCES = [
  { key: 'ALL_FACULTY', label: 'All Faculty' },
  { key: 'DEPT_STUDENTS', label: 'Dept Students' },
];

export default function Notifications({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Inbox');
  const [audience, setAudience] = useState('ALL_FACULTY');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await hodApi.notifications();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await hodApi.markAllRead();
      await load();
    } catch (e) {
      Alert.alert('Cannot mark read', e.message);
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
      const res = await hodApi.broadcast({
        audience,
        title: subject.trim(),
        body: message.trim(),
      });
      Alert.alert('Broadcast sent', `"${subject.trim()}" was delivered to ${res.recipients} recipient${res.recipients === 1 ? '' : 's'}.`);
      setSubject('');
      setMessage('');
    } catch (e) {
      Alert.alert('Cannot send', e.message);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = data?.unread ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity style={styles.headerIconBtn} disabled={marking || unreadCount === 0} onPress={markAllRead}>
            {marking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {activeTab === 'Inbox' && (
          <Text style={styles.headerSub}>{unreadCount} unread · tap the check to mark all read</Text>
        )}
      </LinearGradient>

      <View style={styles.tabsRow}>
        {['Inbox', 'Broadcast'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'Inbox' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {notifications.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            return (
              <View key={n.id} style={styles.card}>
                <View style={styles.iconWrap}>
                  <View style={[styles.iconCircle, { backgroundColor: meta.color + '1a' }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  {!n.read && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                    <Text style={styles.cardTime}>
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.cardMessage} numberOfLines={2}>{n.body}</Text>
                  <View style={styles.audienceChip}>
                    <Ionicons name="business-outline" size={11} color={theme.colors.textMuted} />
                    <Text style={styles.audienceText}>{n.type}</Text>
                  </View>
                </View>
              </View>
            );
          })}
          {notifications.length === 0 && (
            <Text style={styles.emptyText}>Inbox is empty.</Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Audience</Text>
            <View style={styles.audienceRow}>
              {AUDIENCES.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.audienceChipBtn, audience === a.key && styles.audienceChipActive]}
                  onPress={() => setAudience(a.key)}
                >
                  <Text
                    style={[
                      styles.audienceChipText,
                      audience === a.key && styles.audienceChipTextActive,
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Faculty meeting rescheduled"
              placeholderTextColor="#9ca3af"
              value={subject}
              onChangeText={setSubject}
            />
            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Write the announcement..."
              placeholderTextColor="#9ca3af"
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.sendBtn} disabled={sending} onPress={sendBroadcast}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="megaphone-outline" size={18} color="#fff" />
              )}
              <Text style={styles.sendBtnText}>Broadcast</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Broadcasts reach your department instantly in-app. Syllabus submissions, leave
              requests and alerts arrive automatically in this inbox.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  header: {
    paddingTop: theme.spacing.xl + 10,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  tabText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: { color: theme.colors.primary },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 12,
  },
  iconWrap: { position: 'relative', marginRight: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginRight: 8,
  },
  cardTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  cardMessage: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  audienceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  audienceText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginTop: 12,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  messageInput: { minHeight: 100 },
  audienceRow: { flexDirection: 'row', flexWrap: 'wrap' },
  audienceChipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
    marginBottom: 8,
  },
  audienceChipActive: { backgroundColor: theme.colors.primary },
  audienceChipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  audienceChipTextActive: { color: '#fff' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  sendBtnText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginLeft: 10,
    lineHeight: 18,
  },
});
