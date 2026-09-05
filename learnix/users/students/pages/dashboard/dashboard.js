import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';

// Import new components
import HeroHeader from './components/HeroHeader';
import QuickActionCards from './components/QuickActionCards';
import PerformanceHeatmap from './components/PerformanceHeatmap';
import AttendanceWidget from './components/AttendanceWidget';
import ScheduleSection from './components/ScheduleSection';
import NotificationsPanel from './components/NotificationsPanel';
import AIStudyBuddyChat from './components/AIStudyBuddyChat';

// Import data
import { DASHBOARD_DATA } from './constants/dashboardData';

export default function Dashboard({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(DASHBOARD_DATA);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const handleQuickAction = (actionId) => {
    // Handle quick action navigation
    switch (actionId) {
      case 'classes':
        navigation.navigate('Classes');
        break;
      case 'assignments':
        navigation.navigate('Assignments');
        break;
      case 'events':
        navigation.navigate('Events');
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
      default:
        break;
    }
  };

  const handleAIMessage = () => {
    // AI reply is simulated inside AIStudyBuddyChat; nothing needed here.
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0050d4"
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Header */}
        <HeroHeader userData={dashboardData.user} />

        {/* Quick Action Cards */}
        <QuickActionCards
          actions={dashboardData.quickActions}
          onActionPress={handleQuickAction}
        />

        {/* Attendance Widget */}
        <AttendanceWidget attendanceData={dashboardData.attendance} />

        {/* Schedule Section */}
        <ScheduleSection scheduleData={dashboardData.schedule} navigation={navigation} />

        {/* Performance Heatmap */}
        <PerformanceHeatmap performanceData={dashboardData.performance} />

        {/* Notifications Panel */}
        <NotificationsPanel notifications={dashboardData.notifications} navigation={navigation} />

        {/* AI Study Buddy Chat */}
        <AIStudyBuddyChat
          aiData={dashboardData.aiBuddy}
          onSendMessage={handleAIMessage}
        />
      </Animated.ScrollView>
    </View>
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
});
