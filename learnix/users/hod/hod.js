import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import HodHeader from './components/HodHeader';
import HodBottomNavbar from './components/HodBottomNavbar';

// Import pages (bottom nav tabs)
import HodDashboard from './pages/dashboard/dashboard';
import FacultyModule from './pages/faculty/faculty';
import CoursesModule from './pages/courses/courses';
import StudentsModule from './pages/students/students';
import HodProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import SyllabusModule from './pages/syllabus/syllabus';
import LeaveModule from './pages/leave/leave';
import NotificationsScreen from './pages/notifications/notifications';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Demo identity for this app's API calls
import { setDemoUser } from '../../services/api';

setDemoUser('hod@learnix.dev');

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  Syllabus: { title: 'Syllabus Approvals', component: SyllabusModule },
  Leave: { title: 'Leave Requests', component: LeaveModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
};

const TAB_TITLES = {
  Dashboard: 'Department Dashboard',
  Faculty: 'Faculty',
  Courses: 'Courses',
  Students: 'Students',
  Profile: 'My Profile',
};

export default function HODScreen({ navigation }) {
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
    return mod ? mod.title : 'Department Office';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Faculty': return 'people-outline';
        case 'Courses': return 'book-outline';
        case 'Students': return 'school-outline';
        case 'Profile': return 'person-outline';
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
      case 'Faculty':
        return (
          <FacultyModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Courses':
        return (
          <CoursesModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Students':
        return (
          <StudentsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Profile':
        return <HodProfile navigation={{ goBack: handleBackPress }} />;
      case 'Dashboard':
      default:
        return (
          <HodDashboard
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <HodHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <HodBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    flex: 1,
  },
});