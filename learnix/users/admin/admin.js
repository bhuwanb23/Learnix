import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import components
import AdminHeader from './components/AdminHeader';
import AdminBottomNavbar from './components/AdminBottomNavbar';

// Import pages (bottom nav tabs)
import AdminDashboard from './pages/dashboard/dashboard';
import StudentsModule from './pages/students/students';
import TeachersModule from './pages/teachers/teachers';
import CoursesModule from './pages/courses/courses';
import ReportsModule from './pages/reports/reports';

// Import feature modules (opened from dashboard hub)
import AcademicsExaminations from './pages/AcademicsExaminations/academicsExaminations';
import TimetableModule from './pages/timetable/timetable';
import AttendanceModule from './pages/attendance/attendance';
import AssignmentsModule from './pages/assignments/assignments';
import PlacementsModule from './pages/placements/placements';
import EventsModule from './pages/events/events';
import LibraryModule from './pages/library/library';
import FeesModule from './pages/fees/fees';
import AnnouncementsModule from './pages/announcements/announcements';
import SettingsModule from './pages/settings/settings';
import NotificationsScreen from './pages/notifications/notifications';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  AcademicsExaminations: { title: 'Academics & Exams', component: AcademicsExaminations },
  Timetable: { title: 'Timetable', component: TimetableModule },
  Attendance: { title: 'Attendance', component: AttendanceModule },
  Assignments: { title: 'Assignments', component: AssignmentsModule },
  Placements: { title: 'Placements', component: PlacementsModule },
  Events: { title: 'Events', component: EventsModule },
  Library: { title: 'Library', component: LibraryModule },
  Fees: { title: 'Fees & Finance', component: FeesModule },
  Announcements: { title: 'Announcements', component: AnnouncementsModule },
  Settings: { title: 'Settings', component: SettingsModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
};

const TAB_TITLES = {
  Dashboard: 'Dashboard',
  Students: 'Students',
  Teachers: 'Teachers',
  Courses: 'Courses',
  Reports: 'Reports & Analytics',
};

export default function AdminScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  const insets = useSafeAreaInsetsWithPadding();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen('main');
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
  };

  const getHeaderTitle = () => {
    if (currentScreen === 'main') return TAB_TITLES[activeTab];
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.title : 'Admin';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Students': return 'people-outline';
        case 'Teachers': return 'school-outline';
        case 'Courses': return 'book-outline';
        case 'Reports': return 'analytics-outline';
        default: return 'grid-outline';
      }
    }
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.icon || 'apps-outline' : 'apps-outline';
  };

  const renderContent = () => {
    // Feature module sub-screens
    if (currentScreen !== 'main') {
      const mod = FEATURE_MODULES[currentScreen];
      if (mod) {
        const ModuleComponent = mod.component;
        return (
          <ModuleComponent
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      }
    }

    // Main tabs
    switch (activeTab) {
      case 'Students':
        return (
          <StudentsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Teachers':
        return (
          <TeachersModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Courses':
        return (
          <CoursesModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Reports':
        return (
          <ReportsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Dashboard':
      default:
        return (
          <AdminDashboard
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['left', 'right', 'bottom']}>
      <AdminHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={currentScreen === 'main' ? null : handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      <AdminBottomNavbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
});