import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import HeroHeader from './components/HeroHeader';
import QuickActionCards from './components/QuickActionCards';
import PerformanceHeatmap from './components/PerformanceHeatmap';
import AttendanceWidget from './components/AttendanceWidget';
import ScheduleSection from './components/ScheduleSection';
import NotificationsPanel from './components/NotificationsPanel';
import AIStudyBuddyChat from './components/AIStudyBuddyChat';
import { api } from '../../../../services/api';

export default function Dashboard({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const data = await api.studentApi.dashboard();
      setDashboardData({
        user: data.user || { name: 'Student', semester: '', program: '', avatar: '' },
        quickActions: [
          { id: 'classes', label: 'My Classes', icon: 'school', color: '#0050d4' },
          { id: 'assignments', label: 'Assignments', icon: 'assignment', color: '#702ae1' },
          { id: 'events', label: 'Events', icon: 'event', color: '#059669' },
          { id: 'profile', label: 'Profile', icon: 'person', color: '#a23800' },
          // Sub-screen, not a bottom-nav tab — routed via SUB_SCREENS below.
          { id: 'mentorship', label: 'Mentorship', icon: 'people', color: '#6d28d9' },
        ],
        attendance: data.attendance || { overallPct: 0, totalSessions: 0, present: 0, absent: 0, late: 0 },
        schedule: data.schedule || [],
        performance: { radarMetrics: [], attendanceStats: [], averageAttendance: data.attendance?.overallPct || 0 },
        notifications: data.notifications || [],
        aiBuddy: { quickPrompts: ['What classes do I have today?', 'Show my upcoming assignments', 'How is my attendance?'] },
      });
    } catch (e) {
      console.warn('Failed to load dashboard:', e);
      // Fallback to static data
      setDashboardData({
        user: { name: 'Student', semester: '', program: '', avatar: '' },
        quickActions: [
          { id: 'classes', label: 'My Classes', icon: 'school', color: '#0050d4' },
          { id: 'assignments', label: 'Assignments', icon: 'assignment', color: '#702ae1' },
          { id: 'events', label: 'Events', icon: 'event', color: '#059669' },
          { id: 'profile', label: 'Profile', icon: 'person', color: '#a23800' },
          { id: 'mentorship', label: 'Mentorship', icon: 'people', color: '#6d28d9' },
        ],
        attendance: { overallPct: 0, totalSessions: 0, present: 0, absent: 0, late: 0 },
        schedule: [],
        performance: { radarMetrics: [], attendanceStats: [], averageAttendance: 0 },
        notifications: [],
        aiBuddy: { quickPrompts: ['What classes do I have today?'] },
      });
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

// Quick actions that are NOT bottom-nav tabs. They open a full screen instead,
// and `navigation.navigate` would have set them as an unknown tab — landing the
// student back on the dashboard, so the tap did nothing visible.
const SUB_SCREENS = ['Mentorship'];

const handleQuickAction = (actionId) => {
  const screen = actionId.charAt(0).toUpperCase() + actionId.slice(1);
  if (SUB_SCREENS.includes(screen)) {
    navigation?.navigateToScreen?.(screen);
    return;
  }
  navigation?.navigate?.(screen);
};


  if (!dashboardData) return null;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0050d4" />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <HeroHeader userData={dashboardData.user} />
        <QuickActionCards actions={dashboardData.quickActions} onActionPress={handleQuickAction} />
        <AttendanceWidget attendanceData={dashboardData.attendance} />
        <ScheduleSection scheduleData={dashboardData.schedule} navigation={navigation} />
        <PerformanceHeatmap performanceData={dashboardData.performance} />
        <NotificationsPanel notifications={dashboardData.notifications} navigation={navigation} />
        <AIStudyBuddyChat aiData={dashboardData.aiBuddy} onSendMessage={() => {}} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scrollView: { flex: 1 },
});
