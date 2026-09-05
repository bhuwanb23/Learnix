import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

const initialInbox = [
  { id: 'N1', type: 'Event', title: 'Alumni Networking Meet — RSVP Reminder', time: '1 hr ago', unread: true, color: '#2563eb', icon: 'calendar-outline' },
  { id: 'N2', type: 'Donation', title: '₹1,00,000 pledge received from Arjun Nair', time: '3 hrs ago', unread: true, color: '#059669', icon: 'gift-outline' },
  { id: 'N3', type: 'Mentorship', title: 'New mentorship request — Vikram Singh ↔ Ishaan Gupta', time: '5 hrs ago', unread: true, color: '#0891b2', icon: 'hand-left-outline' },
  { id: 'N4', type: 'Chapter', title: 'Bengaluru chapter meet confirmed — Dec 6', time: 'Yesterday', unread: false, color: '#d97706', icon: 'location-outline' },
  { id: 'N5', type: 'Event', title: 'Golden Jubilee Reunion photo gallery published', time: '2 days ago', unread: false, color: '#dc2626', icon: 'images-outline' },
  { id: 'N6', type: 'Newsletter', title: 'November newsletter delivered to 12,450 alumni', time: '3 days ago', unread: false, color: '#7c3aed', icon: 'mail-outline' },
];

const audiences = ['All Alumni', 'Batch 2024', 'Bengaluru', 'Mentors'];

const templates = [
  { id: 'T1', title: 'Event Invite', icon: 'calendar-outline', color: '#2563eb' },
  { id: 'T2', title: 'Newsletter', icon: 'mail-outline', color: '#059669' },
  { id: 'T3', title: 'Reunion Announcement', icon: 'people-outline', color: '#d97706' },
  { id: 'T4', title: 'Donation Appeal', icon: 'gift-outline', color: '#0891b2' },
];

const tabs = ['Inbox', 'Broadcast'];

export default function NotificationsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Inbox');
  const [inbox, setInbox] = useState(initialInbox);
  const [audience, setAudience] = useState('All Alumni');

  const unreadCount = inbox.filter((n) => n.unread).length;

  const markAllRead = () => {
    setInbox((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markRead = (id) => {
    setInbox((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const sendBroadcast = (template) => {
    Alert.alert(
      'Broadcast Sent',
      `${template.title} queued for ${audience}. Push notification + email delivery.`
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAll}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>
          {inbox.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.notifCard, n.unread && styles.notifCardUnread]}
              onPress={() => markRead(n.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.notifIcon, { backgroundColor: n.color + '1a' }]}>
                <Ionicons name={n.icon} size={16} color={n.color} />
              </View>
              <View style={styles.notifBody}>
                <View style={styles.notifTop}>
                  <Text style={[styles.notifType, { color: n.color }]}>{n.type}</Text>
                  {n.unread && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifTime}>{n.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
            {audiences.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, audience === a && styles.chipActive]}
                onPress={() => setAudience(a)}
              >
                <Text style={[styles.chipText, audience === a && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.broadcastLabel}>Message Template</Text>
          {templates.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.templateCard}
              onPress={() => sendBroadcast(t)}
              activeOpacity={0.8}
            >
              <View style={[styles.templateIcon, { backgroundColor: t.color + '1a' }]}>
                <Ionicons name={t.icon} size={16} color={t.color} />
              </View>
              <View style={styles.templateBody}>
                <Text style={styles.templateTitle}>{t.title}</Text>
                <Text style={styles.templateSub}>
                  Push + email to {audience}
                </Text>
              </View>
              <Ionicons name="send-outline" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          ))}

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.primary} />
            <Text style={styles.noteText}>
              Broadcasts are delivered instantly to the student and alumni apps.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  notifTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
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