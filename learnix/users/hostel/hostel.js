import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import HostelHeader from './components/HostelHeader';
import HostelBottomNavbar from './components/HostelBottomNavbar';

// Import pages (bottom nav tabs)
import HostelDashboard from './pages/dashboard/dashboard';
import RoomsModule from './pages/rooms/rooms';
import ResidentsModule from './pages/residents/residents';
import MessModule from './pages/mess/mess';
import HostelProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import GatePassesModule from './pages/gate_passes/gate_passes';
import ComplaintsModule from './pages/complaints/complaints';
import VisitorsModule from './pages/visitors/visitors';
import NotificationsScreen from './pages/notifications/notifications';
// The profile's own sub-screens. They are separate files because each one is a real screen with
// real data, not a section of the profile — and a menu row that navigates nowhere is the exact
// dead button this shell already had.
import MyPermissionsScreen from './pages/profile/my_permissions/my_permissions';
import ChangePasswordScreen from './pages/profile/change_password/change_password';
import ActivityScreen from './pages/profile/activity/activity';
import HelpSupportScreen from './pages/profile/help_support/help_support';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Demo identity — the Hostel app logs in as the Chief Warden
import { setDemoUser } from '../../services/api';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  GatePasses: { title: 'Gate Passes', component: GatePassesModule },
  Complaints: { title: 'Complaints', component: ComplaintsModule },
  Visitors: { title: 'Visitors', component: VisitorsModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
  // The profile's sub-screens, reachable from the profile tab. They live in the same registry
  // because they are opened the same way — a `navigate` that sets `currentScreen` — and a second
  // registry would need a second branch in `renderContent` for no reason.
  MyPermissions: { title: 'Access & Permissions', component: MyPermissionsScreen },
  ChangePassword: { title: 'Change Password', component: ChangePasswordScreen },
  Activity: { title: 'Sign-in history', component: ActivityScreen },
  HelpSupport: { title: 'Help & Support', component: HelpSupportScreen },
};

const TAB_TITLES = {
  Dashboard: 'Hostel Dashboard',
  Rooms: 'Rooms & Allocation',
  Residents: 'Residents',
  Mess: 'Mess Management',
  Profile: 'My Profile',
};

export default function HostelScreen({ navigation }) {
  setDemoUser('hostel@learnix.dev');
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
    return mod ? mod.title : 'Hostel Office';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Rooms': return 'bed-outline';
        case 'Residents': return 'people-outline';
        case 'Mess': return 'restaurant-outline';
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
      case 'Rooms':
        return (
          <RoomsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Residents':
        return (
          <ResidentsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Mess':
        return (
          <MessModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Profile':
        // `navigate` is what makes the profile's menu rows work. It was missing here, so every row
        // was a dead button — the screen called `navigation.navigate(...)` on an object that had only
        // `goBack`, and the optional chaining swallowed the failure. Now the rows open the
        // sub-screens registered in `FEATURE_MODULES`.
        return (
          <HostelProfile
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
          <HostelDashboard
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
      <HostelHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <HostelBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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