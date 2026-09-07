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
};

const TAB_TITLES = {
  Dashboard: 'Exam Dashboard',
  Timetable: 'Exam Timetable',
  Evaluations: 'Evaluations',
  Results: 'Results',
  Profile: 'My Profile',
};

export default function ExamCellScreen({ navigation }) {
  useEffect(() => { setDemoUser('examcell@learnix.dev'); }, []);
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