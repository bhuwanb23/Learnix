import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Text } from 'react-native';
import useTeacherDashboard from './hooks/useTeacherDashboard';
import QuickActions from './components/QuickActions';
import HeroHeader from './components/HeroHeader';
import ScheduleList from './components/ScheduleList';
import NavCards from './components/NavCards';
import Reminders from './components/Reminders';
import RecentNotifications from './components/RecentNotifications';
import { COLORS, SPACING } from '../../../../constants/theme';

export default function TeacherDashboard() {
  const { data, loading, error, refresh, handleQuickAction } = useTeacherDashboard();

  const onRefresh = () => refresh();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.stateText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <HeroHeader header={data.header} />
      <QuickActions actions={data.quickActions} onPress={handleQuickAction} />
      <ScheduleList items={data.schedule} onPressAll={() => {}} />
      <NavCards cards={data.navCards} onPress={() => {}} />
      <Reminders items={data.reminders} />
      <RecentNotifications items={data.notifications} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  stateText: { marginTop: SPACING.sm, color: '#6B7280' },
});


