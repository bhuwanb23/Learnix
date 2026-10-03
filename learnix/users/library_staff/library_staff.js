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

// Digital library sub-pages (pages/digital_library/*)
import DigitalResourceDetail from './pages/digital_library/resource_detail/resource_detail';
import DigitalResourceForm from './pages/digital_library/resource_form/resource_form';
import DigitalAccessGrants from './pages/digital_library/access_grants/access_grants';
import DigitalUsageReport from './pages/digital_library/digital_usage/digital_usage';
import NotificationsScreen from './pages/notifications/notifications';

// Profile sub-pages (pages/profile/*)
import LibrarySettingsScreen from './pages/profile/library_settings/library_settings';
import StaffDirectory from './pages/profile/staff_directory/staff_directory';
import MyPermissions from './pages/profile/my_permissions/my_permissions';
import ChangePassword from './pages/profile/change_password/change_password';
import HelpSupport from './pages/profile/help_support/help_support';

// Notifications sub-pages (pages/notifications/*)
import ComposeBroadcast from './pages/notifications/compose_broadcast/compose_broadcast';
import BroadcastHistory from './pages/notifications/broadcast_history/broadcast_history';
import AudienceInsights from './pages/notifications/audience_insights/audience_insights';
import ReminderSchedule from './pages/notifications/reminder_schedule/reminder_schedule';

// Circulation sub-pages (pages/circulation/*)
import LoanDetail from './pages/circulation/loan_detail/loan_detail';
import IssueBookDesk from './pages/circulation/issue_book/issue_book';
import LoanHistoryScreen from './pages/circulation/loan_history/loan_history';
import StudentBorrowingProfile from './pages/circulation/student_profile/student_profile';

// Fines sub-pages (pages/fines/*)
import FineDetail from './pages/fines/fine_detail/fine_detail';
import SettleFine from './pages/fines/settle_fine/settle_fine';
import StudentFines from './pages/fines/student_fines/student_fines';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  Requests: { title: 'Book Requests', icon: 'cart-outline', component: RequestsModule },
  DigitalLibrary: { title: 'Digital Library', icon: 'cloud-outline', component: DigitalLibraryModule },

  // Digital library sub-pages
  ResourceDetail: { title: 'Resource Detail', icon: 'document-text-outline', component: DigitalResourceDetail },
  ResourceForm: { title: 'Add Resource', icon: 'add-circle-outline', component: DigitalResourceForm },
  AccessGrants: { title: 'Access Grants', icon: 'key-outline', component: DigitalAccessGrants },
  DigitalUsage: { title: 'Usage Report', icon: 'stats-chart-outline', component: DigitalUsageReport },
  Notifications: { title: 'Notifications', icon: 'notifications-outline', component: NotificationsScreen },

  // Notifications sub-pages
  ComposeBroadcast: { title: 'New Broadcast', icon: 'megaphone-outline', component: ComposeBroadcast },
  BroadcastHistory: { title: 'Broadcast History', icon: 'paper-plane-outline', component: BroadcastHistory },
  AudienceInsights: { title: 'Audiences', icon: 'people-outline', component: AudienceInsights },
  ReminderSchedule: { title: 'Reminder Schedule', icon: 'alarm-outline', component: ReminderSchedule },

  // Profile sub-pages
  LibrarySettings: { title: 'Library Settings', icon: 'settings-outline', component: LibrarySettingsScreen },
  StaffDirectory: { title: 'Library Staff', icon: 'people-outline', component: StaffDirectory },
  MyPermissions: { title: 'Access & Permissions', icon: 'shield-checkmark-outline', component: MyPermissions },
  ChangePassword: { title: 'Change Password', icon: 'lock-closed-outline', component: ChangePassword },
  HelpSupport: { title: 'Help & Support', icon: 'help-circle-outline', component: HelpSupport },

  // Circulation sub-pages
  LoanDetail: { title: 'Loan Detail', icon: 'document-text-outline', component: LoanDetail },
  IssueBook: { title: 'Issue Book', icon: 'arrow-forward-circle-outline', component: IssueBookDesk },
  LoanHistory: { title: 'Loan History', icon: 'time-outline', component: LoanHistoryScreen },
  StudentLookup: { title: 'Student Standing', icon: 'people-outline', component: StudentBorrowingProfile },
  StudentProfile: { title: 'Student Standing', icon: 'people-outline', component: StudentBorrowingProfile },

  // Fines sub-pages
  FineDetail: { title: 'Fine Detail', icon: 'cash-outline', component: FineDetail },
  SettleFine: { title: 'Settle Fine', icon: 'checkmark-circle-outline', component: SettleFine },
  StudentFines: { title: 'Student Fines', icon: 'people-outline', component: StudentFines },
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
    // The resource form doubles as add and edit — title follows its mode.
    if (currentScreen === 'ResourceForm') {
      return routeParams?.resourceId ? 'Edit Resource' : 'Add Resource';
    }
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
        return (
          <LibraryProfile
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
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