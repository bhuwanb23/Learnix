import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hodApi } from '../../../../../../services/api';

const COURSE_COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#7c3aed', '#dc2626'];

export default function FacultyDetail({ facultyId, facultyList, onBack }) {
  const [reassigning, setReassigning] = useState(false);

  // Faculty payload comes from the list call (real workload/classes).
  const faculty = useMemo(
    () => (facultyList ?? []).find((f) => f.id === facultyId) ?? null,
    [facultyList, facultyId],
  );

  if (!faculty) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const pct = Math.min(faculty.utilizationPct, 100);

  const pickReassignTarget = async (offering) => {
    const others = (facultyList ?? []).filter((f) => f.id !== facultyId && f.status === 'ACTIVE');
    if (others.length === 0) {
      Alert.alert('No substitutes', 'No other active faculty in the department to reassign to.');
      return;
    }
    const options = others.map((f, i) => ({
      text: `${f.name} (${f.workload}/${f.maxWorkload})`,
      onPress: async () => {
        setReassigning(true);
        try {
          await hodApi.reassign(offering.id, f.id);
          Alert.alert('Reassigned', `${offering.code} (${offering.section}) is now handled by ${f.name}.`);
          onBack(); // triggers a refresh of the list in the parent
        } catch (e) {
          Alert.alert('Cannot reassign', e.message);
        } finally {
          setReassigning(false);
        }
      },
    }));
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(`Reassign ${offering.code}`, `Weekly hours: ${offering.weeklyHours}. Move to:`, options);
  };

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
          <Text style={styles.name}>{faculty.name}{faculty.isHod ? ' · HOD' : ''}</Text>
          <Text style={styles.meta}>{faculty.designation}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{faculty.classes.length}</Text>
              <Text style={styles.heroStatLabel}>Classes</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {faculty.classes.reduce((s, c) => s + c.students, 0)}
              </Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{pct}%</Text>
              <Text style={styles.heroStatLabel}>Workload</Text>
            </View>
          </View>
        </LinearGradient>

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
                { width: pct + '%', backgroundColor: pct > 90 ? '#dc2626' : pct > 75 ? '#d97706' : theme.colors.primary },
              ]}
            />
          </View>
          <Text style={styles.workloadMeta}>
            {faculty.workload} of {faculty.maxWorkload} weekly hours · status: {faculty.status === 'ACTIVE' ? 'Active' : 'On Leave'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Classes Taught</Text>
        {faculty.classes.map((c, idx) => {
          const color = COURSE_COLORS[idx % COURSE_COLORS.length];
          return (
            <View key={c.id} style={styles.classCard}>
              <View style={[styles.classIcon, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.classCode, { color }]}>{c.code}</Text>
              </View>
              <View style={styles.classBody}>
                <Text style={styles.className}>{c.name}</Text>
                <Text style={styles.classMeta}>
                  {c.section} · {c.students} students · {c.weeklyHours} hrs/week
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reassignBtn}
                disabled={reassigning}
                onPress={() => pickReassignTarget(c)}
              >
                <Ionicons name="git-compare-outline" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
        {faculty.classes.length === 0 && (
          <Text style={styles.emptyText}>No class offerings assigned this year.</Text>
        )}

        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.leaveCard}>
          <View style={styles.leaveRow}>
            <Text style={styles.leaveLabel}>Email</Text>
            <Text style={styles.leaveValue} numberOfLines={1}>{faculty.email}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  content: { paddingBottom: 32 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 12, paddingHorizontal: 16 },
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
  reassignBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    paddingVertical: 13,
  },
  leaveLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  leaveValue: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    maxWidth: '60%',
  },
});
