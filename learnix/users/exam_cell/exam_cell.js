import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import ExamCellHeader from './components/ExamCellHeader';
import ExamCellBottomNavbar from './components/ExamCellBottomNavbar';

// Import pages (bottom nav tabs)
import ExamDashboard from './pages/dashboard/dashboard';
import TimetableModule from './pages/timetable/timetable';
import EvaluationsModule from './pages/evaluations/evaluations';
import ResultsModule from './pages/results/results';
import ExamProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import HallTicketsModule from './pages/hall_tickets/hall_tickets';
import CheatingCasesModule from './pages/cheating_cases/cheating_cases';
import NotificationsScreen from './pages/notifications/notifications';

// X-02 Timetable sub-screens (docs/users/05 §3.9). The hub is
// `./pages/timetable/timetable`, reached through the Timetable tab; these eight
// are its blocks, and each `route` in `timetable.rules.ts` names one of them.
//
// Registering them HERE is load-bearing and its failure is silent. `renderContent`
// looks the key up in FEATURE_MODULES, finds nothing, falls through to the tab
// switcher and puts the controller back on the hub with no error anywhere.
// `audit-timetable-ui.ts` asserts all eight are present and point at their own
// component; `prove-timetable-teeth.sh` proves that assertion bites.
import TimetableCalendar from './pages/timetable/pages/calendar/calendar';
import TimetableExams from './pages/timetable/pages/exams/exams';
import TimetableAllocation from './pages/timetable/pages/allocation/allocation';
import TimetableSlots from './pages/timetable/pages/slots/slots';
import TimetableRooms from './pages/timetable/pages/rooms/rooms';
import TimetableDuty from './pages/timetable/pages/duty/duty';
import TimetableStudents from './pages/timetable/pages/students/students';
import TimetableConflicts from './pages/timetable/pages/conflicts/conflicts';

// Import theme
import { COLORS } from '../../constants/theme';
import { setDemoUser } from '../../services/api';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  HallTickets: { title: 'Hall Tickets', component: HallTicketsModule },
  CheatingCases: { title: 'Cheating Cases', component: CheatingCasesModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
  TimetableCalendar: { title: 'Examination Calendar', icon: 'calendar-outline', component: TimetableCalendar },
  TimetableExams: { title: 'Exam Schedules', icon: 'document-text-outline', component: TimetableExams },
  TimetableAllocation: { title: 'Course Allocation', icon: 'school-outline', component: TimetableAllocation },
  TimetableSlots: { title: 'Date & Time Slots', icon: 'time-outline', component: TimetableSlots },
  TimetableRooms: { title: 'Centres & Rooms', icon: 'business-outline', component: TimetableRooms },
  TimetableDuty: { title: 'Invigilator Duty', icon: 'people-outline', component: TimetableDuty },
  TimetableStudents: { title: 'Student Timetable', icon: 'person-outline', component: TimetableStudents },
  TimetableConflicts: { title: 'Clashes & Publishing', icon: 'warning-outline', component: TimetableConflicts },
};

const TAB_TITLES = {
  Dashboard: 'Exam Dashboard',
  Timetable: 'Exam Timetable',
  Evaluations: 'Evaluations',
  Results: 'Results',
  Profile: 'My Profile',
};

export default function ExamCellScreen({ navigation }) {
  setDemoUser('examcell@learnix.dev');
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
    return mod ? mod.title : 'Exam Cell';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Timetable': return 'calendar-outline';
        case 'Evaluations': return 'clipboard-outline';
        case 'Results': return 'trophy-outline';
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
      case 'Timetable':
        return (
          <TimetableModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
              // `switchTab` is what `goToRoute` uses for a block whose
              // published `isTab` is true. It was MISSING on this tab, so a
              // timetable block routed to a tab would have called
              // `undefined is not a function` — and because `goToRoute` checks
              // `TAB_ROUTES.includes(route)` first, that only ever happens for
              // a server change, which is exactly when nobody is watching.
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Evaluations':
        return (
          <EvaluationsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Results':
        return (
          <ResultsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Profile':
        return <ExamProfile navigation={{ goBack: handleBackPress }} />;
      case 'Dashboard':
      default:
        return (
          <ExamDashboard
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
      <ExamCellHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <ExamCellBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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