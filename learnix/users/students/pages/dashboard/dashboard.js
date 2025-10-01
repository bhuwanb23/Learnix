import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';

// Import components
import QuickActions from './components/QuickActions';
import AttendanceWidget from './components/AttendanceWidget';
import ScheduleWidget from './components/ScheduleWidget';
import AIStudyBuddyWidget from './components/AIStudyBuddyWidget';
import PerformanceWidget from './components/PerformanceWidget';
import NotificationsWidget from './components/NotificationsWidget';

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

  const handleNotificationPress = (notificationId) => {
    console.log('Notification pressed:', notificationId);
    // Handle notification press
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
            tintColor="#2563eb"
          />
        }
      >
        {/* Quick Actions */}
        <QuickActions
          actions={dashboardData.quickActions}
          onActionPress={handleQuickAction}
        />

        {/* Dashboard Content */}
        <View style={styles.content}>
          {/* Attendance Widget */}
          <AttendanceWidget attendanceData={dashboardData.attendance} />

          {/* Schedule Widget */}
          <ScheduleWidget scheduleData={dashboardData.schedule} />

          {/* AI Study Buddy Widget */}
          <AIStudyBuddyWidget
            aiData={dashboardData.aiBuddy}
            onSendMessage={handleAIMessage}
          />

          {/* Performance Widget */}
          <PerformanceWidget performanceData={dashboardData.performance} />

          {/* Notifications Widget */}
          <NotificationsWidget
            notifications={dashboardData.notifications}
            onNotificationPress={handleNotificationPress}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
});
