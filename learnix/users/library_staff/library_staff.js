import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Wire demo identity for this role app
import { setDemoUser } from '../../services/api';

// Import components
import LibraryHeader from './components/LibraryHeader';
import LibraryBottomNavbar from './components/LibraryBottomNavbar';

// Import pages (bottom nav tabs)
import LibraryDashboard from './pages/dashboard/dashboard';
import CatalogModule from './pages/catalog/catalog';
import CirculationModule from './pages/circulation/circulation';
import FinesModule from './pages/fines/fines';
import LibraryProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import RequestsModule from './pages/requests/requests';
import DigitalLibraryModule from './pages/digital_library/digital_library';
import NotificationsScreen from './pages/notifications/notifications';

// Circulation sub-pages (pages/circulation/*)
import LoanDetail from './pages/circulation/loan_detail/loan_detail';
import IssueBookDesk from './pages/circulation/issue_book/issue_book';
import LoanHistoryScreen from './pages/circulation/loan_history/loan_history';
import StudentBorrowingProfile from './pages/circulation/student_profile/student_profile';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  Requests: { title: 'Book Requests', icon: 'cart-outline', component: RequestsModule },
  DigitalLibrary: { title: 'Digital Library', icon: 'cloud-outline', component: DigitalLibraryModule },
  Notifications: { title: 'Notifications', icon: 'notifications-outline', component: NotificationsScreen },

  // Circulation sub-pages
  LoanDetail: { title: 'Loan Detail', icon: 'document-text-outline', component: LoanDetail },
  IssueBook: { title: 'Issue Book', icon: 'arrow-forward-circle-outline', component: IssueBookDesk },
  LoanHistory: { title: 'Loan History', icon: 'time-outline', component: LoanHistoryScreen },
  StudentLookup: { title: 'Student Standing', icon: 'people-outline', component: StudentBorrowingProfile },
  StudentProfile: { title: 'Student Standing', icon: 'people-outline', component: StudentBorrowingProfile },
};

const TAB_TITLES = {
  Dashboard: 'Library Dashboard',
  Catalog: 'Catalog',
  Circulation: 'Circulation',
  Fines: 'Fines & Overdues',
  Profile: 'My Profile',
};

export default function LibraryStaffScreen({ navigation }) {
  setDemoUser('library@learnix.dev');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  const [routeParams, setRouteParams] = useState({});
  const insets = useSafeAreaInsetsWithPadding();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen('main');
    setRouteParams({});
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
    setRouteParams({});
  };

  // openModule(key, params) — params are handed to sub-screens via `route.params`.
  const openModule = (key, params) => {
    setCurrentScreen(key);
    setRouteParams(params || {});
  };

  const getHeaderTitle = () => {
    if (currentScreen === 'main') return TAB_TITLES[activeTab];
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.title : 'Library Staff';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Catalog': return 'book-outline';
        case 'Circulation': return 'swap-horizontal-outline';
        case 'Fines': return 'cash-outline';
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
            route={{ params: routeParams }}
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
      }
    }

    // Main tabs
    switch (activeTab) {
      case 'Catalog':
        return (
          <CatalogModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
            }}
          />
        );
      case 'Circulation':
        return (
          <CirculationModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
      case 'Fines':
        return (
          <FinesModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
            }}
          />
        );
      case 'Profile':
        return <LibraryProfile navigation={{ goBack: handleBackPress }} />;
      case 'Dashboard':
      default:
        return (
          <LibraryDashboard
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LibraryHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <LibraryBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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