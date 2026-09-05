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

import ActionButton from '../../../../components/ui/ActionButton';
import SectionHeader from '../../../../components/ui/SectionHeader';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const UNITS = [
  { id: 'U1', name: 'Arrays & Linked Lists', topics: 8, status: 'Completed' },
  { id: 'U2', name: 'Stacks & Queues', topics: 6, status: 'Completed' },
  { id: 'U3', name: 'Trees & Graphs', topics: 10, status: 'In Progress' },
  { id: 'U4', name: 'Sorting & Searching', topics: 7, status: 'Pending' },
  { id: 'U5', name: 'Hashing & Heaps', topics: 5, status: 'Pending' },
];

export default function CourseDetail({ course, onBack }) {
  const [tab, setTab] = useState('syllabus');

  const handleEdit = () => {
    Alert.alert('Edit Course', `Editing ${course.name} (${course.code}).`);
  };

  const handleAssignTeacher = () => {
    Alert.alert('Assign Teacher', 'Select a teacher from the department faculty list.');
  };

  const handleExportSyllabus = () => {
    Alert.alert('Exported', `${course.name} syllabus downloaded as PDF.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#2563eb" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{course.name}</Text>
            <Text style={styles.headerSubtitle}>{course.code} • {course.program} • Sem {course.semester}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={18} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Course stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{course.credits}</Text>
            <Text style={styles.statLabel}>Credits</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>62</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Units</Text>
          </View>
        </View>

        {/* Teacher card */}
        <View style={styles.teacherCard}>
          <View style={styles.teacherAvatar}>
            <Text style={styles.teacherInitial}>{course.teacher.charAt(0)}</Text>
          </View>
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherLabel}>Course Teacher</Text>
            <Text style={styles.teacherName}>{course.teacher}</Text>
          </View>
          <TouchableOpacity style={styles.assignBtn} onPress={handleAssignTeacher} activeOpacity={0.8}>
            <Text style={styles.assignBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {['syllabus', 'students', 'overview'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.activeTab]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'syllabus' ? (
          <>
            <SectionHeader title="Syllabus Units" actionLabel="Add Unit" actionIcon="add" onAction={() => Alert.alert('Add Unit', 'Create a new unit for this course.')} />
            {UNITS.map((unit) => (
              <TouchableOpacity
                key={unit.id}
                style={styles.unitCard}
                activeOpacity={0.8}
                onPress={() => Alert.alert(unit.name, `${unit.topics} topics • Status: ${unit.status}`)}
              >
                <View style={[styles.unitIcon, { backgroundColor: unit.status === 'Completed' ? '#0596691A' : unit.status === 'In Progress' ? '#d977061A' : '#f1f5f9' }]}>
                  <Ionicons
                    name={unit.status === 'Completed' ? 'checkmark-circle' : unit.status === 'In Progress' ? 'time' : 'ellipse-outline'}
                    size={18}
                    color={unit.status === 'Completed' ? '#059669' : unit.status === 'In Progress' ? '#d97706' : '#94a3b8'}
                  />
                </View>
                <View style={styles.unitInfo}>
                  <Text style={styles.unitName}>{unit.name}</Text>
                  <Text style={styles.unitMeta}>{unit.topics} topics</Text>
                </View>
                <View style={[styles.unitStatus, { backgroundColor: unit.status === 'Completed' ? '#0596691A' : unit.status === 'In Progress' ? '#d977061A' : '#f1f5f9' }]}>
                  <Text style={[styles.unitStatusText, { color: unit.status === 'Completed' ? '#059669' : unit.status === 'In Progress' ? '#d97706' : '#94a3b8' }]}>
                    {unit.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <ActionButton label="Export Syllabus PDF" icon="download-outline" variant="secondary" onPress={handleExportSyllabus} />
          </>
        ) : null}

        {tab === 'students' ? (
          <>
            <SectionHeader title="Enrolled Students (62)" actionLabel="Manage" actionIcon="people" onAction={() => Alert.alert('Manage Students', 'Add or remove students from this course.')} />
            {['Aarav Mehta', 'Vikram Singh', 'Ananya Reddy', 'Kabir Joshi', 'Meghna Das'].map((name, i) => (
              <View key={name} style={styles.studentRow}>
                <View style={[styles.studentAvatar, { backgroundColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'][i] + '14' }]}>
                  <Text style={[styles.studentInitial, { color: ['#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2'][i] }]}>
                    {name.split(' ').map((w) => w[0]).join('')}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{name}</Text>
                  <Text style={styles.studentMeta}>Roll: CSE-2{i + 1}-0{i + 1}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            ))}
          </>
        ) : null}

        {tab === 'overview' ? (
          <>
            <SectionHeader title="Course Overview" />
            <View style={styles.overviewCard}>
              {[
                { label: 'Course Code', value: course.code },
                { label: 'Department', value: course.department },
                { label: 'Program', value: course.program },
                { label: 'Semester', value: `Semester ${course.semester}` },
                { label: 'Credits', value: `${course.credits} credits` },
                { label: 'Assessment', value: 'Mid-term 30% • Final 50% • Assignments 20%' },
              ].map((row) => (
                <View key={row.label} style={styles.overviewRow}>
                  <Text style={styles.overviewLabel}>{row.label}</Text>
                  <Text style={styles.overviewValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  teacherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  teacherInitial: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  teacherName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  assignBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#2563eb1A',
  },
  assignBtnText: {
    fontSize: 11,
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  unitIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  unitMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  unitStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  unitStatusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  studentInitial: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  studentMeta: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  overviewLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  overviewValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
});