import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

const INITIAL_NOTIFICATIONS = [
  { id: 'N1', title: '287 students applied to TCS drive', desc: 'Registration closes in 2 days — send a reminder', time: '10 min ago', type: 'people', color: '#2563eb', unread: true },
  { id: 'N2', title: 'Shortlist results sent', desc: '85 candidates notified for Infosys tech interviews', time: '1 hr ago', type: 'checkmark-done', color: '#059669', unread: true },
  { id: 'N3', title: '3 offer letters pending acceptance', desc: 'Amazon offers awaiting student confirmation', time: '3 hrs ago', type: 'ribbon', color: '#0284c7', unread: true },
  { id: 'N4', title: 'Drive request from Zoho', desc: 'Zoho Corporation requested a campus drive for Jan', time: '5 hrs ago', type: 'business', color: '#d97706', unread: false },
  { id: 'N5', title: 'Wipro pre-placement talk confirmed', desc: 'Dec 18, Main Auditorium • 410 students invited', time: 'Yesterday', type: 'mic', color: '#4f46e5', unread: false },
  { id: 'N6', title: 'New applications received', desc: '38 students applied to Deloitte Analyst role', time: 'Yesterday', type: 'document-text', color: '#64748b', unread: false },
];

const AUDIENCES = ['All Students', 'Final Year', '3rd Year', 'CSE & ECE', 'Placed Students'];

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [tab, setTab] = useState('inbox');
  const [form, setForm] = useState({ title: '', content: '', audience: 'All Students' });

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleSend = () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Missing Fields', 'Please enter both a subject and message.');
      return;
    }
    Alert.alert(
      'Send Broadcast',
      `Send "${form.title}" to ${form.audience}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            setForm({ title: '', content: '', audience: 'All Students' });
            setTab('inbox');
            Alert.alert('Broadcast Sent', `Notification delivered to ${form.audience} via app + SMS.`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {[
          { id: 'inbox', label: `Inbox${unreadCount ? ` (${unreadCount})` : ''}` },
          { id: 'broadcast', label: 'Broadcast' },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'inbox' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {unreadCount > 0 ? (
            <TouchableOpacity style={styles.markAllRow} onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null}
          {notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, item.unread && styles.unreadCard]}
              onPress={() => handleMarkRead(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '14' }]}>
                <Ionicons name={item.type} size={18} color={item.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
              {item.unread ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.formHint}>Broadcast drive updates, shortlist results, and reminders directly to students.</Text>

          <Text style={styles.fieldLabel}>Subject</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="e.g. TCS Drive Reminder"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          <Text style={styles.fieldLabel}>Message</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.content}
              onChangeText={(v) => setForm((p) => ({ ...p, content: v }))}
              placeholder="Write your message to students..."
              placeholderTextColor="#cbd5e1"
              multiline
            />
          </View>

          <Text style={styles.fieldLabel}>Audience</Text>
          <View style={styles.audienceGrid}>
            {AUDIENCES.map((aud) => (
              <TouchableOpacity
                key={aud}
                style={[styles.audienceChip, form.audience === aud && styles.audienceChipActive]}
                onPress={() => setForm((p) => ({ ...p, audience: aud }))}
                activeOpacity={0.8}
              >
                <Text style={[styles.audienceText, form.audience === aud && styles.audienceTextActive]}>{aud}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 4,
    margin: 24,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  markAllRow: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  markAllText: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  unreadCard: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8faff',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 17,
  },
  cardTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 8,
    marginTop: 4,
  },
  formHint: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Manrope-Bold',
    marginBottom: 6,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: {
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
  },
  textAreaContainer: {
    paddingVertical: 8,
  },
  textArea: {
    height: 96,
    textAlignVertical: 'top',
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  audienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audienceChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  audienceText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  audienceTextActive: {
    color: '#FFFFFF',
  },
  sendBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});