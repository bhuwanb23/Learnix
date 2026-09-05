import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  DEPARTMENTS,
  PROGRAMS,
  COURSES,
  COURSE_FILTERS,
  SYLLABUS_TEMPLATES,
} from './constants/coursesData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import FilterChips from '../../components/ui/FilterChips';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';

import CourseDetail from './pages/course_detail/course_detail';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'departments', label: 'Departments' },
  { id: 'programs', label: 'Programs' },
  { id: 'courses', label: 'Courses' },
  { id: 'syllabus', label: 'Syllabus' },
];

export default function CoursesModule({ navigation }) {
  const [tab, setTab] = useState('departments');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredCourses = useMemo(() => {
    return COURSES.filter((c) => {
      const matchesDept = departmentFilter === 'all' || c.department === departmentFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [departmentFilter, search]);

  if (selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="business" value="5" label="Departments" color="#7c3aed" />
        <StatCard icon="school" value="7" label="Programs" color="#059669" />
        <StatCard icon="book" value="156" label="Courses" color="#d97706" />
        <StatCard icon="document-text" value="48" label="Syllabi" color="#0284c7" />
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

      {tab === 'departments' ? (
        <>
          <SectionHeader title="Departments" actionLabel="Add Dept" actionIcon="add" onAction={() => Alert.alert('Add Department', 'Create a new academic department.')} />
          {DEPARTMENTS.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={styles.deptCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(dept.name, `${dept.programs} programs • ${dept.students} students\nHoD: ${dept.hod}`)}
            >
              <View style={[styles.deptIcon, { backgroundColor: dept.color + '1A' }]}>
                <Ionicons name="business" size={20} color={dept.color} />
              </View>
              <View style={styles.deptInfo}>
                <Text style={styles.deptName}>{dept.name}</Text>
                <Text style={styles.deptMeta}>Code: {dept.code} • HoD: {dept.hod}</Text>
              </View>
              <View style={styles.deptStats}>
                <Text style={styles.deptCount}>{dept.students}</Text>
                <Text style={styles.deptCountLabel}>students</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'programs' ? (
        <>
          <SectionHeader title="Programs" actionLabel="New Program" actionIcon="add" onAction={() => Alert.alert('New Program', 'Create a new academic program.')} />
          {PROGRAMS.map((program) => (
            <TouchableOpacity
              key={program.id}
              style={styles.programCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(program.name, `${program.type} • ${program.duration}\n${program.semesters} semesters • ${program.students} students`)}
            >
              <View style={[styles.programIcon, { backgroundColor: program.color + '1A' }]}>
                <Ionicons name="school" size={20} color={program.color} />
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.name}</Text>
                <Text style={styles.programMeta}>{program.department} • {program.duration}</Text>
              </View>
              <View style={[styles.typeChip, { backgroundColor: program.type === 'Undergraduate' ? '#0596691A' : '#7c3aed1A' }]}>
                <Text style={[styles.typeText, { color: program.type === 'Undergraduate' ? '#059669' : '#7c3aed' }]}>
                  {program.type === 'Undergraduate' ? 'UG' : 'PG'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'courses' ? (
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search courses by name or code..." />
          <FilterChips options={COURSE_FILTERS} selected={departmentFilter} onSelect={setDepartmentFilter} />
          <SectionHeader
            title={`Courses (${filteredCourses.length})`}
            actionLabel="Create Course"
            actionIcon="add"
            onAction={() => Alert.alert('Create Course', 'Create a new course with credits and teacher assignment.')}
          />
          {filteredCourses.length === 0 ? (
            <EmptyState icon="book-outline" title="No courses found" message="Try a different search or filter." />
          ) : (
            filteredCourses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => setSelectedCourse(course)}
                activeOpacity={0.8}
              >
                <View style={[styles.courseIcon, { backgroundColor: course.color + '1A' }]}>
                  <Text style={[styles.courseCode, { color: course.color }]}>{course.code}</Text>
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseMeta}>{course.program} • Sem {course.semester} • {course.credits} credits</Text>
                  <Text style={styles.courseTeacher}>{course.teacher}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))
          )}
        </>
      ) : null}

      {tab === 'syllabus' ? (
        <>
          <SectionHeader title="Syllabus Templates" actionLabel="New Template" actionIcon="add" onAction={() => Alert.alert('New Template', 'Create a syllabus template from a course.')} />
          {SYLLABUS_TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              activeOpacity={0.8}
              onPress={() => Alert.alert(template.name, `${template.program} • Sem ${template.semester}\n${template.units} units • Updated ${template.updatedAt}`)}
            >
              <View style={[styles.templateIcon, { backgroundColor: template.color + '1A' }]}>
                <Ionicons name="document-text" size={20} color={template.color} />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateMeta}>{template.program} • {template.units} units</Text>
              </View>
              <View style={[styles.templateStatus, { backgroundColor: template.status === 'Approved' ? '#0596691A' : '#d977061A' }]}>
                <Text style={[styles.templateStatusText, { color: template.status === 'Approved' ? '#059669' : '#d97706' }]}>
                  {template.status}
                </Text>
              </View>
            </TouchableOpacity>
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
  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  deptIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  deptMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  deptStats: {
    alignItems: 'flex-end',
  },
  deptCount: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  deptCountLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  programCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  programIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  programMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  typeChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  typeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  courseIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  courseCode: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  courseMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  courseTeacher: {
    fontSize: 10,
    color: '#7c3aed',
    fontFamily: 'Manrope-Medium',
    marginTop: 1,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  templateMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  templateStatus: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  templateStatusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
});