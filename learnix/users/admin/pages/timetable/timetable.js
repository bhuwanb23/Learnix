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

import { WEEK_DAYS, TIMETABLE, TEACHER_ALLOCATION, CONFLICTS } from './constants/timetableData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import ActionButton from '../../components/ui/ActionButton';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'weekly', label: 'Weekly View' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'conflicts', label: 'Conflicts' },
];

export default function TimetableModule({ navigation }) {
  const [tab, setTab] = useState('weekly');
  const [selectedDay, setSelectedDay] = useState('mon');

  const handleAddPeriod = () => {
    Alert.alert('Add Period', 'Schedule a new class period for this slot.');
  };

  const handleAutoGenerate = () => {
    Alert.alert(
      'Auto Generate',
      'Generate an optimized timetable for the selected semester?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => Alert.alert('Done', 'Timetable generated with 0 conflicts.') },
      ]
    );
  };

  const handleResolveConflict = (conflict) => {
    Alert.alert(
      'Resolve Conflict',
      conflict.description,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Auto-Fix', onPress: () => Alert.alert('Fixed', 'Conflict resolved — slot reassigned automatically.') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="calendar" value="96" label="Periods / Week" color="#7c3aed" />
        <StatCard icon="people" value="89" label="Teachers" color="#059669" />
        <StatCard icon="business" value="28" label="Rooms Used" color="#d97706" />
        <StatCard icon="warning" value={CONFLICTS.length} label="Conflicts" color="#dc2626" />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
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

      {tab === 'weekly' ? (
        <>
          <SectionHeader title="Weekly Timetable" actionLabel="Auto Generate" actionIcon="sparkles" onAction={handleAutoGenerate} />

          {/* Day selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayContent}>
            {WEEK_DAYS.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[styles.dayChip, selectedDay === day.id && styles.dayChipActive]}
                onPress={() => setSelectedDay(day.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayText, selectedDay === day.id && styles.dayTextActive]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.dayFull}>{WEEK_DAYS.find((d) => d.id === selectedDay).full}</Text>

          {(TIMETABLE[selectedDay] || []).map((period) => (
            <TouchableOpacity
              key={period.id}
              style={styles.periodCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(period.subject, `${period.class}\n${period.teacher}\nRoom ${period.room} • ${period.time}`)}
            >
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{period.time.split(' - ')[0]}</Text>
                <Text style={styles.timeSub}>{period.time.split(' - ')[1]}</Text>
              </View>
              <View style={styles.periodInfo}>
                <Text style={styles.periodSubject}>{period.subject}</Text>
                <Text style={styles.periodClass}>{period.class}</Text>
                <Text style={styles.periodTeacher}>{period.teacher}</Text>
              </View>
              <View style={styles.roomBox}>
                <Ionicons name="business" size={14} color="#7c3aed" />
                <Text style={styles.roomText}>{period.room}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <ActionButton label="Add Period" icon="add" variant="secondary" onPress={handleAddPeriod} />
        </>
      ) : null}

      {tab === 'allocation' ? (
        <>
          <SectionHeader title="Teacher Allocation" actionLabel="Balance Load" actionIcon="git-compare" onAction={() => Alert.alert('Balanced', 'Workload redistributed across faculty.')} />
          {TEACHER_ALLOCATION.map((alloc) => (
            <View key={alloc.id} style={styles.allocCard}>
              <View style={styles.allocHeader}>
                <View style={[styles.allocAvatar, { backgroundColor: alloc.color + '1A' }]}>
                  <Text style={[styles.allocInitial, { color: alloc.color }]}>{alloc.teacher.charAt(0)}</Text>
                </View>
                <View style={styles.allocInfo}>
                  <Text style={styles.allocName}>{alloc.teacher}</Text>
                  <Text style={styles.allocMeta}>{alloc.department} • {alloc.classes} classes</Text>
                </View>
                <Text style={[styles.allocHours, { color: alloc.utilization >= 90 ? '#dc2626' : alloc.utilization >= 75 ? '#d97706' : '#059669' }]}>
                  {alloc.hours}/{alloc.maxHours}h
                </Text>
              </View>
              <View style={styles.allocTrack}>
                <View style={[styles.allocFill, { width: `${alloc.utilization}%`, backgroundColor: alloc.utilization >= 90 ? '#dc2626' : alloc.utilization >= 75 ? '#d97706' : '#059669' }]} />
              </View>
              <Text style={styles.allocNote}>{alloc.utilization}% utilization</Text>
            </View>
          ))}
        </>
      ) : null}

      {tab === 'conflicts' ? (
        <>
          <SectionHeader title="Conflict Detection" actionLabel="Resolve All" actionIcon="checkmark-done" onAction={() => Alert.alert('Resolved', 'All conflicts auto-resolved.')} />
          {CONFLICTS.map((conflict) => (
            <View key={conflict.id} style={styles.conflictCard}>
              <View style={[styles.conflictIcon, { backgroundColor: conflict.color + '1A' }]}>
                <Ionicons name="warning" size={18} color={conflict.color} />
              </View>
              <View style={styles.conflictInfo}>
                <View style={styles.conflictHeaderRow}>
                  <Text style={styles.conflictType}>{conflict.type}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: conflict.color + '1A' }]}>
                    <Text style={[styles.severityText, { color: conflict.color }]}>{conflict.severity}</Text>
                  </View>
                </View>
                <Text style={styles.conflictDesc}>{conflict.description}</Text>
              </View>
              <TouchableOpacity
                style={styles.fixBtn}
                onPress={() => handleResolveConflict(conflict)}
                activeOpacity={0.8}
              >
                <Ionicons name="build-outline" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#7c3aed',
  },
  dayScroll: {
    flexGrow: 0,
    marginBottom: SPACING.sm,
  },
  dayContent: {
    paddingRight: SPACING.md,
  },
  dayChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#f1f5f9',
    marginRight: SPACING.sm,
  },
  dayChipActive: {
    backgroundColor: '#7c3aed',
  },
  dayText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#475569',
    fontFamily: 'Manrope-SemiBold',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  dayFull: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: SPACING.sm,
  },
  periodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  timeBox: {
    width: 64,
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  timeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  timeSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  periodInfo: {
    flex: 1,
  },
  periodSubject: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  periodClass: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  periodTeacher: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  roomBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c3aed1A',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  roomText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#7c3aed',
    fontFamily: 'Manrope-SemiBold',
  },
  allocCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  allocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  allocAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  allocInitial: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  allocInfo: {
    flex: 1,
  },
  allocName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  allocMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  allocHours: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  allocTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocFill: {
    height: '100%',
    borderRadius: 4,
  },
  allocNote: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  conflictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  conflictIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  conflictType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  severityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  severityText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  conflictDesc: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  fixBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
});