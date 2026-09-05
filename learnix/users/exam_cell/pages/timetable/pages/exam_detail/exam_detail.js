import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const ROOM_SLOTS = [
  { id: 'RS1', room: 'Room 101', capacity: 60, allocated: 60, invigilator: 'Dr. R. Menon', color: '#2563eb' },
  { id: 'RS2', room: 'Room 102', capacity: 60, allocated: 55, invigilator: 'Prof. S. Iyer', color: '#059669' },
  { id: 'RS3', room: 'Room 103', capacity: 60, allocated: 48, invigilator: 'Dr. K. Nair', color: '#d97706' },
  { id: 'RS4', room: 'Room 104', capacity: 60, allocated: 17, invigilator: 'Prof. A. Rao', color: '#0284c7' },
];

export default function ExamDetail({ exam, onBack }) {
  const [tab, setTab] = useState('rooms');

  const handleNotify = () => {
    Alert.alert(
      'Notify Students',
      `Send exam reminder to ${exam.students} students for ${exam.subject} (${exam.date})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => Alert.alert('Sent', `Reminder sent to ${exam.students} students.`) },
      ]
    );
  };

  const handleEditSlot = (slot) => {
    Alert.alert('Edit Allocation', `${slot.room} — ${slot.allocated}/${slot.capacity} students\nInvigilator: ${slot.invigilator}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{exam.subject}</Text>
            <Text style={styles.headerSubtitle}>{exam.code} • {exam.sem}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={[styles.examIcon, { backgroundColor: exam.color + '14' }]}>
            <Ionicons name="create-outline" size={22} color={exam.color} />
          </View>
          <Text style={styles.examTitle}>{exam.subject}</Text>
          <Text style={styles.examCode}>{exam.code} • {exam.sem}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>{exam.date}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={12} color="#059669" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>{exam.time}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="business-outline" size={12} color="#d97706" />
              <Text style={[styles.badgeText, { color: '#d97706' }]}>{exam.room}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{exam.students}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{exam.invigilators}</Text>
            <Text style={styles.statLabel}>Invigilators</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Seat Allocation</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notifyBtn} onPress={handleNotify} activeOpacity={0.85}>
          <Ionicons name="megaphone-outline" size={16} color="#FFFFFF" />
          <Text style={styles.notifyBtnText}>Notify Students</Text>
        </TouchableOpacity>

        <View style={styles.tabsRow}>
          {[
            { id: 'rooms', label: 'Room Allocations' },
            { id: 'roster', label: 'Invigilator Roster' },
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

        {tab === 'rooms' ? (
          <>
            <Text style={styles.sectionLabel}>Seat Allocations</Text>
            {ROOM_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={styles.slotCard}
                activeOpacity={0.8}
                onPress={() => handleEditSlot(slot)}
              >
                <View style={[styles.slotIcon, { backgroundColor: slot.color + '14' }]}>
                  <Ionicons name="business-outline" size={18} color={slot.color} />
                </View>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotRoom}>{slot.room}</Text>
                  <Text style={styles.slotMeta}>{slot.allocated}/{slot.capacity} students • {slot.invigilator}</Text>
                  <View style={styles.slotTrack}>
                    <View style={[styles.slotFill, { width: `${(slot.allocated / slot.capacity) * 100}%`, backgroundColor: slot.color }]} />
                  </View>
                </View>
                <Text style={[styles.slotPct, { color: slot.color }]}>
                  {Math.round((slot.allocated / slot.capacity) * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Invigilation Duty</Text>
            {ROOM_SLOTS.map((slot) => (
              <View key={slot.id} style={styles.rosterCard}>
                <View style={[styles.rosterAvatar, { backgroundColor: slot.color + '14' }]}>
                  <Text style={[styles.rosterInitial, { color: slot.color }]}>{slot.invigilator.replace('Dr. ', '').replace('Prof. ', '').charAt(0)}</Text>
                </View>
                <View style={styles.rosterInfo}>
                  <Text style={styles.rosterName}>{slot.invigilator}</Text>
                  <Text style={styles.rosterMeta}>{slot.room} • {slot.allocated} students</Text>
                </View>
                <View style={[styles.dutyChip, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[styles.dutyText, { color: '#2563eb' }]}>Duty Assigned</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  examIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  examTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  examCode: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  notifyBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
  },
  notifyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  slotIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotInfo: {
    flex: 1,
  },
  slotRoom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  slotMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  slotTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#eef2f7',
    marginTop: 6,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 3,
  },
  slotPct: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    marginLeft: 10,
  },
  rosterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  rosterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rosterInitial: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  rosterInfo: {
    flex: 1,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  rosterMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  dutyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dutyText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});