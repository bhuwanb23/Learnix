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

        {/* Quick Action Cards & Performance Heatmap - Side by side */}
        <View style={styles.topGrid}>
          <View style={styles.leftColumn}>
            <QuickActionCards
              actions={dashboardData.quickActions}
              onActionPress={handleQuickAction}
            />
            <PerformanceHeatmap performanceData={dashboardData.performance} />
          </View>
          
          <View style={styles.rightColumn}>
            {/* Attendance Widget */}
            <AttendanceWidget attendanceData={dashboardData.attendance} />

            {/* Schedule Section */}
            <ScheduleSection scheduleData={dashboardData.schedule} />
          </View>
        </View>

        {/* Notifications & AI Study Buddy - Bottom section */}
        <View style={styles.bottomGrid}>
          <View style={styles.bottomLeft}>
            <NotificationsPanel notifications={dashboardData.notifications} />
          </View>
          
          <View style={styles.bottomRight}>
            <AIStudyBuddyChat
              aiData={dashboardData.aiBuddy}
              onSendMessage={handleAIMessage}
            />
          </View>
        </View>
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
  topGrid: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    gap: 0,
  },
  leftColumn: {
    width: '33.33%',
    paddingRight: 6,
  },
  rightColumn: {
    width: '66.67%',
    paddingLeft: 6,
  },
  bottomGrid: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingBottom: 16,
    gap: 0,
  },
  bottomLeft: {
    width: '50%',
    paddingRight: 6,
  },
  bottomRight: {
    width: '50%',
    paddingLeft: 6,
  },
});
