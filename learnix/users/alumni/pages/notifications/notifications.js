import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';

const TYPE_META = {
  EVENT: { label: 'Event', color: '#2563eb', icon: 'calendar-outline' },
  DONATION: { label: 'Donation', color: '#059669', icon: 'gift-outline' },
  MENTORSHIP: { label: 'Mentorship', color: '#0891b2', icon: 'hand-left-outline' },
  BROADCAST: { label: 'Broadcast', color: '#7c3aed', icon: 'megaphone-outline' },
  ANNOUNCEMENT: { label: 'Announcement', color: '#d97706', icon: 'megaphone-outline' },
  SYSTEM: { label: 'System', color: '#64748b', icon: 'server-outline' },
};

const AUDIENCES = [
  { key: 'ALL_ALUMNI', label: 'All Alumni' },
  { key: 'BATCH_2024', label: 'Batch 2024' },
  { key: 'CITY_BENGALURU', label: 'Bengaluru' },
  { key: 'MENTORS', label: 'Mentors' },
];

const TEMPLATES = [
  { key: 'EVENT_INVITE', title: 'Event Invite', icon: 'calendar-outline', color: '#2563eb', subject: 'You are invited to our upcoming event', body: 'We are hosting an upcoming alumni event on campus. Check the Events tab for details and RSVP.' },
  { key: 'NEWSLETTER', title: 'Newsletter', icon: 'mail-outline', color: '#059669', subject: 'Learnix Alumni Newsletter', body: 'Read the latest news, achievements and chapter updates from the alumni network.' },
  { key: 'REUNION', title: 'Reunion', icon: 'people-outline', color: '#d97706', subject: 'Reunion announcement', body: 'Save the date — our next alumni reunion is being planned. Details coming soon.' },
  { key: 'DONATION_APPEAL', title: 'Donation Appeal', icon: 'gift-outline', color: '#0891b2', subject: 'Support the new library wing', body: 'The New Library Wing campaign is underway. Every contribution counts — donate from the Donations tab.' },
];

const tabs = ['Inbox', 'Broadcast'];

export default function NotificationsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Inbox');
  const [audience, setAudience] = useState('ALL_ALUMNI');
  const [template, setTemplate] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await alumniApi.notifications();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const onMarkAllRead = async () => {
    setMarking(true);
    try {
      await alumniApi.markAllRead();
      await load(false);
    } catch (e) {
      Alert.alert('Cannot mark read', e.message);
    } finally {
      setMarking(false);
    }
  };

  const onSend = async () => {
    const t = template;
    const title = customTitle.trim() || t?.subject;
    const body = customBody.trim() || t?.body;
    if (!t && !title && !body) {
      Alert.alert('Pick a template', 'Choose a template or write a custom title + message.');
      return;
    }
    setSending(true);
    try {
      const res = await alumniApi.broadcast({
        audience,
        templateKey: t?.key ?? 'NEWSLETTER',
        title: title || 'Alumni update',
        body: body || 'Update from the Alumni Relations Office.',
      });
      Alert.alert('Broadcast Sent', `${res.recipients} alumn${res.recipients === 1 ? 'us' : 'i'} notified (in-app).`);
      setTemplate(null);
      setCustomTitle('');
      setCustomBody('');
    } catch (e) {
      Alert.alert('Cannot send', e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 16 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 10 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 10 }} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inbox = data?.notifications ?? [];
  const unreadCount = data?.unread ?? 0;
  const selectedAudience = AUDIENCES.find((a) => a.key === audience);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.tabsWrap}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Inbox' && unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Inbox' && (
        <>
          <View style={styles.inboxHeader}>
            <Text style={styles.inboxCount}>{unreadCount} unread</Text>
            {unreadCount > 0 && (
              <TouchableOpacity disabled={marking} onPress={onMarkAllRead}>
                {marking ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Text style={styles.markAll}>Mark all read</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {inbox.map((n, idx) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
            return (
              <AnimatedCard key={n.id} delay={idx * 40} style={[styles.notifCard, !n.read && styles.notifCardUnread]}>
                <View style={[styles.notifIcon, { backgroundColor: meta.color + '1a' }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={styles.notifBody}>
                  <View style={styles.notifTop}>
                    <Text style={[styles.notifType, { color: meta.color }]}>{meta.label}</Text>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBodyText} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>              </View>
            </AnimatedCard>
          );
          })}
          {inbox.length === 0 && <EmptyState icon="inbox-outline" title="Inbox is empty" subtitle="Notifications will appear here" color="#7c3aed" />}
        </>
      )}

      {activeTab === 'Broadcast' && (
        <>
          <Text style={styles.broadcastLabel}>Audience</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.audienceRow}
          >
            {AUDIENCES.map((a) => (
              <TouchableOpacity
                key={a.key}
                style={[styles.chip, audience === a.key && styles.chipActive]}
                onPress={() => setAudience(a.key)}
              >
                <Text style={[styles.chipText, audience === a.key && styles.chipTextActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.broadcastLabel}>Message Template</Text>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.templateCard, template?.key === t.key && styles.templateCardActive]}
              onPress={() => setTemplate(t)}
              activeOpacity={0.8}
            >
              <View style={[styles.templateIcon, { backgroundColor: t.color + '1a' }]}>
                <Ionicons name={t.icon} size={16} color={t.color} />
              </View>
              <View style={styles.templateBody}>
                <Text style={styles.templateTitle}>{t.title}</Text>
                <Text style={styles.templateSub}>{t.subject}</Text>
              </View>
              <Ionicons
                name={template?.key === t.key ? 'checkmark-circle' : 'chevron-forward'}
                size={16}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          ))}

          <Text style={styles.broadcastLabel}>Customize (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor={theme.colors.textMuted}
            value={customTitle}
            onChangeText={setCustomTitle}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Message"
            placeholderTextColor={theme.colors.textMuted}
            value={customBody}
            onChangeText={setCustomBody}
            multiline
          />

          <TouchableOpacity style={styles.sendBtn} disabled={sending} onPress={onSend}>
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={14} color="#fff" />
            )}
            <Text style={styles.sendText}>
              Send to {selectedAudience?.label ?? audience}
            </Text>
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.noteText}>
              Broadcasts are delivered in-app to every matched alumnus; email/push channels arrive with the messaging phase.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  inboxCount: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  markAll: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  notifCardUnread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fbff',
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBody: { flex: 1 },
  notifTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifType: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  notifTitle: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginTop: 3,
  },
  notifBodyText: {
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  broadcastLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  audienceRow: {
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: {
    color: '#fff',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  templateCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f5f9ff',
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateBody: { flex: 1 },
  templateTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  templateSub: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 4,
  },
  sendText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 6,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: '#1e40af',
    marginLeft: 8,
  },
});
