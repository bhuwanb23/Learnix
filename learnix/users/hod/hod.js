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

// HD-06 the Courses desk: the course detail, opened from a course row on the
// Courses tab. It needs to know WHICH course it is showing, so it is opened
// with a PARAM and the shell carries it.
//
// Registering it HERE is load-bearing and its failure is SILENT, exactly as it is
// for the exam cell's block sub-screens: `renderContent` looks the key up in
// FEATURE_MODULES, finds nothing, falls through to the tab switcher, and puts the
// controller back on the Courses tab with no error anywhere. `audit-hod-courses-ui.ts`
// asserts it is present and points at its own component.
import CourseDetailScreen from './pages/courses/coursesDetail';

// HD-02 the Faculty desk: the individual faculty view, opened from a row on the
// Faculty tab. It needs to know WHICH teacher it is showing, so it is opened with
// a PARAM and the shell carries it.
//
// Registering it HERE is load-bearing and its failure is SILENT, exactly as it is
// for the Courses desk's detail: `renderContent` looks the key up in
// FEATURE_MODULES, finds nothing, falls through to the tab switcher, and puts the
// controller back on the Faculty tab with no error anywhere.
// `audit-hod-faculty-ui.ts` asserts it is present and points at its own component.
import FacultyDetailScreen from './pages/faculty/facultyDetail';

// HD-05 the Students desk: the individual student view, opened from a row on the
// Students tab. It needs to know WHICH student it is showing, so it is opened
// with a PARAM and the shell carries it.
//
// Registering it HERE is load-bearing and its failure is SILENT, exactly as it is
// for the Courses and Faculty details: `renderContent` looks the key up in
// FEATURE_MODULES, finds nothing, falls through to the tab switcher, and puts the
// controller back on the Students tab with no error anywhere.
// `audit-hod-students-ui.ts` asserts it is present and points at its own component.
import StudentDetailScreen from './pages/students/studentsDetail';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Demo identity for this app's API calls
import { setDemoUser } from '../../services/api';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  Syllabus: { title: 'Syllabus Approvals', component: SyllabusModule },
  Leave: { title: 'Leave Requests', component: LeaveModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
  CourseDetail: { title: 'Course', icon: 'book-outline', component: CourseDetailScreen },
  FacultyDetail: { title: 'Faculty', icon: 'person-outline', component: FacultyDetailScreen },
  StudentDetail: { title: 'Student', icon: 'school-outline', component: StudentDetailScreen },
};

const TAB_TITLES = {
  Dashboard: 'Department Dashboard',
  Faculty: 'Faculty',
  Courses: 'Courses',
  Students: 'Students',
  Profile: 'My Profile',
};

export default function HODScreen({ navigation }) {
  setDemoUser('hod@learnix.dev');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  // THE PARAM CHANNEL (HD-06).
  //
  // The shell's `navigate` used to take a screen name and nothing else, so a sub-screen that
  // needed to know WHICH record it was showing could not be told. That is why the course detail
  // was unreachable: it needs a course id, and there was no way to hand it one.
  //
  // So `navigate` and `openModule` now take an optional second argument, and the module receives
  // it as `route.params` — the same contract the exam cell's shell already uses.
  const [screenParams, setScreenParams] = useState(null);

  const insets = useSafeAreaInsetsWithPadding();

  const openScreen = (screen, params) => {
    setScreenParams(params ?? null);
    setCurrentScreen(screen);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen('main');
    setScreenParams(null);
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
    setScreenParams(null);
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
              navigate: (screen, params) => openScreen(screen, params),
              goBack: handleBackPress,
              openModule: (key, params) => openScreen(key, params),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
            route={{ params: screenParams }}
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
              navigate: (screen, params) => openScreen(screen, params),
              goBack: () => openScreen('main'),
              openModule: (key, params) => openScreen(key, params),
            }}
          />
        );
      case 'Courses':
        return (
          <CoursesModule
            navigation={{
              navigate: (screen, params) => openScreen(screen, params),
              goBack: () => openScreen('main'),
              openModule: (key, params) => openScreen(key, params),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Students':
        return (
          <StudentsModule
            navigation={{
              navigate: (screen, params) => openScreen(screen, params),
              goBack: () => openScreen('main'),
              openModule: (key, params) => openScreen(key, params),
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
              navigate: (screen, params) => openScreen(screen, params),
              goBack: () => openScreen('main'),
              openModule: (key, params) => openScreen(key, params),
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