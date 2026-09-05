import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

const INITIAL_NOTIFICATIONS = [
  {
    id: '1',
    title: 'New student enrollment pending approval',
    description: 'Rahul Sharma (B.Tech CSE, Sem 3) submitted enrollment request',
    time: '2 min ago',
    type: 'person-add',
    color: '#7c3aed',
    unread: true,
  },
  {
    id: '2',
    title: '3 cheating alerts awaiting review',
    description: 'AI detection flagged suspicious patterns in Chemistry mid-term',
    time: '25 min ago',
    type: 'warning',
    color: '#ef4444',
    unread: true,
  },
  {
    id: '3',
    title: 'Teacher leave request',
    description: 'Dr. Meera Iyer requested 2 days leave (Oct 12-13)',
    time: '1 hr ago',
    type: 'calendar',
    color: '#d97706',
    unread: true,
  },
  {
    id: '4',
    title: 'Fee payment received',
    description: '₹42,000 received from Priya Patel (BBA Sem 1)',
    time: '3 hrs ago',
    type: 'cash',
    color: '#059669',
    unread: false,
  },
  {
    id: '5',
    title: 'Placement drive approved',
    description: 'TCS campus drive scheduled for Dec 10',
    time: '5 hrs ago',
    type: 'briefcase',
    color: '#0284c7',
    unread: false,
  },
  {
    id: '6',
    title: 'Exam timetable published',
    description: 'Semester 4 final exam timetable is now live',
    time: 'Yesterday',
    type: 'calendar-outline',
    color: '#7c3aed',
    unread: false,
  },
  {
    id: '7',
    title: 'Library fine reminder',
    description: '12 books overdue — total fine ₹480 pending',
    time: 'Yesterday',
    type: 'book',
    color: '#d97706',
    unread: false,
  },
];

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <View style={styles.container}>
      {unreadCount > 0 ? (
        <View style={styles.topBar}>
          <Text style={styles.unreadText}>{unreadCount} unread notifications</Text>
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {notifications.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, item.unread && styles.unreadCard]}
            onPress={() => handleMarkRead(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '1A' }]}>
              <Ionicons name={item.type} size={18} color={item.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            {item.unread ? <View style={styles.unreadDot} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#f3f4f6',
  },
  unreadText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  markAllText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#7c3aed',
    fontFamily: 'Manrope-SemiBold',
  },
  scrollContent: {
    padding: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  unreadCard: {
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
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
    backgroundColor: '#7c3aed',
    marginLeft: SPACING.sm,
    marginTop: 4,
  },
});