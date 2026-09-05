import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';

const classes = [
  { id: '1', code: 'CS301', name: 'Data Structures', students: 62, attendance: 72, color: '#2563eb' },
  { id: '2', code: 'CS304', name: 'DBMS', students: 58, attendance: 81, color: '#059669' },
  { id: '3', code: 'CS305', name: 'Computer Networks', students: 55, attendance: 78, color: '#0891b2' },
];

export default function FacultyDetail({ faculty, onBack }) {
  const [evaluation, setEvaluation] = useState('4.2 / 5.0');

  const pct = Math.round((faculty.workload / faculty.maxWorkload) * 100);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{faculty.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{faculty.name}</Text>
          <Text style={styles.meta}>{faculty.designation}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{faculty.classes}</Text>
              <Text style={styles.heroStatLabel}>Classes</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{faculty.subjects.length}</Text>
              <Text style={styles.heroStatLabel}>Subjects</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{evaluation}</Text>
              <Text style={styles.heroStatLabel}>Evaluation</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Message', `Opening chat with ${faculty.name}...`)}
          >
            <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Workload', 'Workload planner opens here to reassign classes.')}
          >
            <Ionicons name="git-compare-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Reassign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Alert.alert('Evaluate', `Submit evaluation for ${faculty.name}.`)}
          >
            <Ionicons name="star-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Evaluate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.workloadCard}>
          <View style={styles.workloadTop}>
            <Text style={styles.workloadTitle}>Workload Utilization</Text>
            <Text style={[styles.workloadPct, { color: pct > 90 ? '#dc2626' : theme.colors.primary }]}>
              {pct}%
            </Text>
          </View>
          <View style={styles.workloadTrack}>
            <View
              style={[
                styles.workloadFill,
                { width: pct + '%', backgroundColor: pct > 90 ? '#dc2626' : theme.colors.primary },
              ]}
            />
          </View>
          <Text style={styles.workloadMeta}>
            {faculty.workload} of {faculty.maxWorkload} weekly hours · subjects: {faculty.subjects.join(', ')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Classes Taught</Text>
        {classes.map((c) => {
          const attColor = c.attendance < 75 ? '#dc2626' : c.attendance < 80 ? '#d97706' : '#059669';
          return (
            <View key={c.id} style={styles.classCard}>
              <View style={[styles.classIcon, { backgroundColor: c.color + '1a' }]}>
                <Text style={[styles.classCode, { color: c.color }]}>{c.code}</Text>
              </View>
              <View style={styles.classBody}>
                <Text style={styles.className}>{c.name}</Text>
                <Text style={styles.classMeta}>{c.students} students</Text>
                <View style={styles.attRow}>
                  <Text style={styles.attLabel}>Attendance</Text>
                  <View style={styles.attTrack}>
                    <View
                      style={[styles.attFill, { width: c.attendance + '%', backgroundColor: attColor }]}
                    />
                  </View>
                  <Text style={[styles.attValue, { color: attColor }]}>{c.attendance}%</Text>
                </View>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Leave Balance</Text>
        <View style={styles.leaveCard}>
          {[
            { label: 'Casual Leave', used: '3', total: '10' },
            { label: 'Medical Leave', used: '1', total: '8' },
            { label: 'Earned Leave', used: '5', total: '15' },
          ].map((l, idx) => (
            <View key={l.label} style={[styles.leaveRow, idx < 2 && styles.leaveBorder]}>
              <Text style={styles.leaveLabel}>{l.label}</Text>
              <Text style={styles.leaveValue}>
                {l.used} / {l.total} days
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  workloadCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  workloadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workloadTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  workloadPct: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
  },
  workloadTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 10,
    overflow: 'hidden',
  },
  workloadFill: { height: 6, borderRadius: 3 },
  workloadMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  classCard: {
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
  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classCode: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
  },
  classBody: { flex: 1 },
  className: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  classMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  attLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginRight: 6,
  },
  attTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 6,
  },
  attFill: { height: 5, borderRadius: 3 },
  attValue: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    marginHorizontal: 16,
  },
  leaveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  leaveBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leaveLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  leaveValue: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
});