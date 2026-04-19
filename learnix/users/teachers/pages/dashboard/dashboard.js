import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useTeacherDashboard from './hooks/useTeacherDashboard';
import HeroHeader from './components/HeroHeader';
import QuickActions from './components/QuickActions';
import ScheduleList from './components/ScheduleList';
import PerformanceOverview from './components/PerformanceOverview';
import InsightsGrid from './components/InsightsGrid';
import RecentSubmissions from './components/RecentSubmissions';

export default function TeacherDashboard() {
  const { data, loading, error, refresh, handleQuickAction } = useTeacherDashboard();

  const onRefresh = () => refresh();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0050d4" />
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={['#0050d4']} />}
      >
        <HeroHeader header={data.header} />
        <QuickActions actions={data.quickActions} onPress={handleQuickAction} />
        <ScheduleList items={data.schedule} onPressAll={() => {}} />
        <PerformanceOverview performance={data.performance} />
        <InsightsGrid insights={data.insights} />
        <RecentSubmissions submissions={data.submissions} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  content: { 
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24,
    backgroundColor: '#f5f7f9',
  },
  stateText: { 
    marginTop: 12, 
    color: '#64748b',
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
  },
});


