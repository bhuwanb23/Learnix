import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import TimetableSection from './components/TimetableSection';
import QuickActions from './components/QuickActions';
import SyllabusTracker from './components/SyllabusTracker';
import PendingTasks from './components/PendingTasks';
import NavButtons from './components/NavButtons';
import RecentActivity from './components/RecentActivity';
import { useTeacherClass } from './hooks/useTeacherClass';

export default function TeacherClassPage() {
  const {
    timetable,
    quickActions,
    syllabus,
    pendingTasks,
    navButtons,
    recent,
    refreshing,
    onRefresh,
    handleActionPress,
    handleNavPress,
  } = useTeacherClass();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} tintColor="#2563EB" />}
        contentContainerStyle={styles.content}
      >
        <TimetableSection data={timetable} />
        <View style={styles.gap} />
        <QuickActions actions={quickActions} onPress={handleActionPress} />
        <View style={styles.gap} />
        <SyllabusTracker data={syllabus} />
        <View style={styles.gap} />
        <PendingTasks data={pendingTasks} />
        <View style={styles.gap} />
        <NavButtons items={navButtons} onPress={handleNavPress} />
        <View style={styles.gap} />
        <RecentActivity items={recent} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  content: { padding: 8, paddingBottom: 32 },
  gap: { height: 12 },
});

