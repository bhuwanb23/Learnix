import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const initialNotifications = [
  {
    id: '1',
    title: 'Syllabus submitted for approval',
    message: 'Dr. Arjun Nair submitted the AI & ML syllabus (Sem 6, 6 units) for department approval.',
    time: '30 min ago',
    audience: 'Department',
    type: 'syllabus',
    unread: true,
  },
  {
    id: '2',
    title: 'Leave request — Dr. Priya Venkatesh',
    message: 'Casual leave Oct 20-21 (2 days). Approve or reject before the faculty meeting.',
    time: '2 hrs ago',
    audience: 'HOD',
    type: 'leave',
    unread: true,
  },
  {
    id: '3',
    title: 'CS301 attendance below 75%',
    message: 'Data Structures dropped to 68% this week. 6 students flagged at risk of detention.',
    time: '4 hrs ago',
    audience: 'Faculty',
    type: 'alert',
    unread: false,
  },
  {
    id: '4',
    title: 'Department meeting Friday 4 PM',
    message: 'Agenda: semester-end evaluation schedule, new course proposals and NAAC documentation.',
    time: 'Yesterday',
    audience: 'Faculty',
    type: 'meeting',
    unread: false,
  },
  {
    id: '5',
    title: 'Exam results published',
    message: 'Semester 5 results for CSE published by the Exam Cell. Department pass rate 91%.',
    time: '2 days ago',
    audience: 'Department',
    type: 'result',
    unread: false,
  },
];

const audiences = ['All Faculty', 'Department Students', 'HOD Office', 'All CSE'];

export default function Notifications({ navigation }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState('Inbox');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('All Faculty');

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const markRead = (id) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const sendBroadcast = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Incomplete', 'Add a subject and message before broadcasting.');
      return;
    }
    Alert.alert('Broadcast sent', `"${subject}" was pushed to ${audience}.`);
    setSubject('');
    setMessage('');
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getTypeColor = (type) => {
    switch (type) {
      case 'syllabus': return '#2563eb';
      case 'leave': return '#059669';
      case 'alert': return '#dc2626';
      case 'meeting': return '#d97706';
      case 'result': return '#0891b2';
      default: return '#0891b2';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'syllabus': return 'document-text-outline';
      case 'leave': return 'calendar-outline';
      case 'alert': return 'warning-outline';
      case 'meeting': return 'people-outline';
      case 'result': return 'school-outline';
      default: return 'information-circle-outline';
    }
  };

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
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {notifications.map((n) => (
            <TouchableOpacity key={n.id} style={styles.card} onPress={() => markRead(n.id)}>
              <View style={styles.iconWrap}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: getTypeColor(n.type) + '1a' },
                  ]}
                >
                  <Ionicons name={getTypeIcon(n.type)} size={18} color={getTypeColor(n.type)} />
                </View>
                {n.unread && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.cardTime}>{n.time}</Text>
                </View>
                <Text style={styles.cardMessage} numberOfLines={2}>{n.message}</Text>
                <View style={styles.audienceChip}>
                  <Ionicons name="business-outline" size={11} color={theme.colors.textMuted} />
                  <Text style={styles.audienceText}>{n.audience}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
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
            <Text style={styles.formLabel}>Audience</Text>
            <View style={styles.audienceRow}>
              {audiences.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.audienceChipBtn, audience === a && styles.audienceChipActive]}
                  onPress={() => setAudience(a)}
                >
                  <Text
                    style={[
                      styles.audienceChipText,
                      audience === a && styles.audienceChipTextActive,
                    ]}
                  >
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.sendBtn} onPress={sendBroadcast}>
              <Ionicons name="megaphone-outline" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Broadcast</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Broadcasts reach faculty and students instantly. Syllabus submissions, leave requests
              and attendance alerts arrive automatically.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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