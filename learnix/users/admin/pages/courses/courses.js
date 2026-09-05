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
        <StatCard icon="business" value="5" label="Departments" color="#2563eb" />
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
        <View style={styles.block}>
          <SectionHeader title="Departments" subtitle="Academic departments and their heads" actionLabel="Add Dept" actionIcon="add" onAction={() => Alert.alert('Add Department', 'Create a new academic department.')} />
          {DEPARTMENTS.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={styles.deptCard}
              activeOpacity={0.85}
              onPress={() => Alert.alert(dept.name, `${dept.programs} programs • ${dept.students} students\nHoD: ${dept.hod}`)}
            >
              <View style={[styles.deptIcon, { backgroundColor: dept.color + '14' }]}>
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
        </View>
      ) : null}

      {tab === 'programs' ? (
        <View style={styles.block}>
          <SectionHeader title="Programs" subtitle="Degree programs across departments" actionLabel="New Program" actionIcon="add" onAction={() => Alert.alert('New Program', 'Create a new academic program.')} />
          {PROGRAMS.map((program) => (
            <TouchableOpacity
              key={program.id}
              style={styles.programCard}
              activeOpacity={0.85}
              onPress={() => Alert.alert(program.name, `${program.type} • ${program.duration}\n${program.semesters} semesters • ${program.students} students`)}
            >
              <View style={[styles.programIcon, { backgroundColor: program.color + '14' }]}>
                <Ionicons name="school" size={20} color={program.color} />
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.name}</Text>
                <Text style={styles.programMeta}>{program.department} • {program.duration}</Text>
              </View>
              <View style={[styles.typeChip, { backgroundColor: program.type === 'Undergraduate' ? '#05966914' : '#2563eb14' }]}>
                <Text style={[styles.typeText, { color: program.type === 'Undergraduate' ? '#059669' : '#2563eb' }]}>
                  {program.type === 'Undergraduate' ? 'UG' : 'PG'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {tab === 'courses' ? (
        <View style={styles.block}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search courses by name or code..." />
          <FilterChips options={COURSE_FILTERS} selected={departmentFilter} onSelect={setDepartmentFilter} />
          <SectionHeader
            title="Courses"
            subtitle={`${filteredCourses.length} of ${COURSES.length} shown`}
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
                activeOpacity={0.85}
              >
                <View style={[styles.courseIcon, { backgroundColor: course.color + '14' }]}>
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
        </View>
      ) : null}

      {tab === 'syllabus' ? (
        <View style={styles.block}>
          <SectionHeader title="Syllabus Templates" subtitle="Course syllabus blueprints" actionLabel="New Template" actionIcon="add" onAction={() => Alert.alert('New Template', 'Create a syllabus template from a course.')} />
          {SYLLABUS_TEMPLATES.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              activeOpacity={0.85}
              onPress={() => Alert.alert(template.name, `${template.program} • Sem ${template.semester}\n${template.units} units • Updated ${template.updatedAt}`)}
            >
              <View style={[styles.templateIcon, { backgroundColor: template.color + '14' }]}>
                <Ionicons name="document-text" size={20} color={template.color} />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateMeta}>{template.program} • {template.units} units</Text>
              </View>
              <View style={[styles.templateStatus, { backgroundColor: template.status === 'Approved' ? '#05966914' : '#d9770614' }]}>
                <Text style={[styles.templateStatusText, { color: template.status === 'Approved' ? '#059669' : '#d97706' }]}>
                  {template.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
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
  block: {
    marginTop: 20,
  },
  deptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  deptIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deptInfo: {
    flex: 1,
  },
  deptName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  programIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  programMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  courseIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  courseCode: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  courseMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  courseTeacher: {
    fontSize: 10,
    color: '#2563eb',
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    marginTop: 1,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  templateIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  templateMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  templateStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  templateStatusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});