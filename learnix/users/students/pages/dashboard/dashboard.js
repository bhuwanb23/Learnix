import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
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

  const handleAIMessage = (message) => {
    console.log('AI Message sent:', message);
    // Handle AI message sending
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0050d4"
          />
        }
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
        <ScheduleSection scheduleData={dashboardData.schedule} />

        {/* Performance Heatmap */}
        <PerformanceHeatmap performanceData={dashboardData.performance} />

        {/* Notifications Panel */}
        <NotificationsPanel notifications={dashboardData.notifications} />

        {/* AI Study Buddy Chat */}
        <AIStudyBuddyChat
          aiData={dashboardData.aiBuddy}
          onSendMessage={handleAIMessage}
        />
      </ScrollView>
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
