import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';

const audiences = [
  { key: 'ALL_STUDENTS', label: 'All Students' },
  { key: 'ALL_TEAMS', label: 'All Teams' },
  { key: 'VOLUNTEERS', label: 'Volunteers' },
];

const TYPE_COLORS = {
  BROADCAST: '#2563eb',
  EVENT: '#059669',
  EQUIPMENT: '#d97706',
  VENUE: '#0891b2',
  TEAM: '#7c3aed',
  EVENT_REG: '#dc2626',
  SYSTEM: '#64748b',
};

const TYPE_ICONS = {
  BROADCAST: 'megaphone-outline',
  EVENT: 'calendar-outline',
  EQUIPMENT: 'basketball-outline',
  VENUE: 'location-outline',
  TEAM: 'people-outline',
  EVENT_REG: 'person-add-outline',
  SYSTEM: 'information-circle-outline',
};

const fmtAgo = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

export default function Notifications({ navigation }) {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Inbox');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('ALL_STUDENTS');

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const d = await sportsApi.notifications();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    try {
      const res = await sportsApi.markAllRead();
      Alert.alert('All caught up', `${res.updated} notification(s) marked as read.`);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const sendBroadcast = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Incomplete', 'Add a subject and message before broadcasting.');
      return;
    }
    try {
      const res = await sportsApi.broadcast({
        audience,
        title: subject.trim(),
        body: message.trim(),
      });
      Alert.alert('Broadcast sent', `"${subject.trim()}" was delivered to ${res.recipients} recipient(s).`);
      setSubject('');
      setMessage('');
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const unreadCount = data.unread;

  const getTypeColor = (type) => TYPE_COLORS[type] || TYPE_COLORS.SYSTEM;
  const getTypeIcon = (type) => TYPE_ICONS[type] || TYPE_ICONS.SYSTEM;

  if (loading && data.notifications.length === 0 && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          <Text style={styles.headerSub}>{unreadCount} unread · tap the check to mark all read</Text>
        )}
        {error && <Text style={styles.headerSub}>{error} — pull to retry</Text>}
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

      {activeTab === 'Inbox' ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
        >
          {data.notifications.length === 0 && (
            <Text style={styles.emptyInbox}>Your inbox is empty.</Text>
          )}
          {data.notifications.map((n) => (
            <View key={n.id} style={[styles.card, !n.read && styles.cardUnread]}>
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: getTypeColor(n.type) + '1a' },
                  ]}
                >
                  <Ionicons name={getTypeIcon(n.type)} size={18} color={getTypeColor(n.type)} />
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.cardTime}>{fmtAgo(n.createdAt)}</Text>
                </View>
                <Text style={styles.cardMessage} numberOfLines={2}>{n.body}</Text>
                <View style={styles.audienceChip}>
                  <Ionicons name="pulse-outline" size={11} color={theme.colors.textMuted} />
                  <Text style={styles.audienceText}>{n.type}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Basketball tryouts this Saturday"
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
            <TouchableOpacity style={styles.sendBtn} onPress={sendBroadcast}>
              <Ionicons name="megaphone-outline" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Broadcast Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Broadcasts land instantly in the student app inbox. Tryout reminders, match alerts and
              equipment due notices are sent automatically by the system.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
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
  emptyInbox: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 12,
  },
  cardUnread: { borderColor: '#bfdbfe' },
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
