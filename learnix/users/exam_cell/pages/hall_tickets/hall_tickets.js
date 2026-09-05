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

import { TICKET_STATS, TICKETS, BLOCKED_STUDENTS } from './constants/hallTicketsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function HallTicketsModule({ navigation }) {
  const [tab, setTab] = useState('tickets');
  const [search, setSearch] = useState('');

  const filteredTickets = TICKETS.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = () => {
    Alert.alert(
      'Generate Hall Tickets',
      'Generate hall tickets for all eligible students (Semester 3 finals)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => Alert.alert('Generated', '1,240 hall tickets generated and pushed to student apps.') },
      ]
    );
  };

  const handleTicketAction = (ticket) => {
    Alert.alert(
      'Hall Ticket',
      `${ticket.name} (${ticket.rollNo})\n${ticket.exams} exams • Sem 3 finals`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Reminder', onPress: () => Alert.alert('Reminder Sent', `${ticket.name} notified to download their hall ticket.`) },
      ]
    );
  };

  const handleUnblock = (student) => {
    Alert.alert(
      'Unblock Student',
      `Allow ${student.name} to appear for exams? Their issue must be resolved first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', onPress: () => Alert.alert('Unblocked', `${student.name} can now download their hall ticket.`) },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {TICKET_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'tickets', label: 'Tickets' },
          { id: 'blocked', label: `Blocked (${BLOCKED_STUDENTS.length})` },
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

      {tab === 'tickets' ? (
        <>
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.generateBtnText}>Generate All Hall Tickets</Text>
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or roll no"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {filteredTickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              activeOpacity={0.8}
              onPress={() => handleTicketAction(ticket)}
            >
              <View style={[styles.ticketIcon, { backgroundColor: ticket.color + '14' }]}>
                <Ionicons name="ticket-outline" size={18} color={ticket.color} />
              </View>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketName}>{ticket.name}</Text>
                <Text style={styles.ticketMeta}>{ticket.rollNo} • {ticket.exams} exams</Text>
                <View style={styles.ticketChips}>
                  <View style={[styles.dlChip, { backgroundColor: ticket.downloaded ? '#0596691A' : '#64748b1A' }]}>
                    <Text style={[styles.dlText, { color: ticket.downloaded ? '#059669' : '#64748b' }]}>
                      {ticket.downloaded ? 'Downloaded' : 'Not downloaded'}
                    </Text>
                  </View>
                  {ticket.verified ? (
                    <View style={[styles.dlChip, { backgroundColor: '#2563eb1A' }]}>
                      <Text style={[styles.dlText, { color: '#2563eb' }]}>Verified on site</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Blocked from Exams</Text>
          {BLOCKED_STUDENTS.map((student) => (
            <View key={student.id} style={styles.blockedCard}>
              <View style={[styles.blockedIcon, { backgroundColor: student.color + '14' }]}>
                <Ionicons name="lock-closed-outline" size={18} color={student.color} />
              </View>
              <View style={styles.blockedInfo}>
                <Text style={styles.blockedName}>{student.name}</Text>
                <Text style={styles.blockedMeta}>{student.rollNo}</Text>
                <Text style={[styles.blockedReason, { color: student.color }]}>{student.reason}</Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(student)} activeOpacity={0.7}>
                <Ionicons name="lock-open-outline" size={16} color="#2563eb" />
              </TouchableOpacity>
            </View>
          ))}
          <Text style={styles.blockedNote}>Tap the unlock icon after the issue is resolved.</Text>
        </>
      )}
    </ScrollView>
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#2563eb',
  },
  generateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Manrope-Regular',
    marginLeft: 8,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  ticketIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  ticketMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  ticketChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  dlChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dlText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  blockedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blockedInfo: {
    flex: 1,
  },
  blockedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  blockedMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  blockedReason: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    marginTop: 1,
  },
  unblockBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedNote: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
});