import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAssignmentExams } from './hooks/useAssignmentExams';
import OverviewCards from './components/OverviewCards';
import QuickActions from './components/QuickActions';
import PerformanceChart from './components/PerformanceChart';
import DeadlineChart from './components/DeadlineChart';
import RecentActivity from './components/RecentActivity';

export default function AssignmentExamsPage() {
  const { overview, actions, upload, performance, deadlines, activity, refreshing, onRefresh, onActionPress } = useAssignmentExams();
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1E40AF"]} tintColor="#1E40AF" />}
      >
        <OverviewCards items={overview} />
        <View style={styles.gap} />
        <QuickActions actions={actions} upload={upload} onPress={onActionPress} />
        <View style={styles.gap} />
        <PerformanceChart data={performance} />
        <View style={styles.gap} />
        <DeadlineChart data={deadlines} />
        <View style={styles.gap} />
        <RecentActivity items={activity} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  content: { padding: 8, paddingBottom: 24 },
  gap: { height: 12 },
});

