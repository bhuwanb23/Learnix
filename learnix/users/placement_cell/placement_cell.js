import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import PlacementHeader from './components/PlacementHeader';
import PlacementBottomNavbar from './components/PlacementBottomNavbar';

// Import pages (bottom nav tabs)
import PlacementDashboard from './pages/dashboard/dashboard';
import DrivesModule from './pages/drives/drives';
import ApplicationsModule from './pages/applications/applications';
import StudentsModule from './pages/students/students';
import PlacementProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import JobsModule from './pages/jobs/jobs';
import CompaniesModule from './pages/companies/companies';
import NotificationsScreen from './pages/notifications/notifications';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  Jobs: { title: 'Jobs', component: JobsModule },
  Companies: { title: 'Companies', component: CompaniesModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
};

const TAB_TITLES = {
  Dashboard: 'Placement Dashboard',
  Drives: 'Placement Drives',
  Applications: 'Applications',
  Students: 'Students',
  Profile: 'My Profile',
};

export default function PlacementScreen({ navigation }) {
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
    return mod ? mod.title : 'Placement Cell';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Drives': return 'briefcase-outline';
        case 'Applications': return 'document-text-outline';
        case 'Students': return 'people-outline';
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
      case 'Drives':
        return (
          <DrivesModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Applications':
        return (
          <ApplicationsModule
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
        return <PlacementProfile navigation={{ goBack: handleBackPress }} />;
      case 'Dashboard':
      default:
        return (
          <PlacementDashboard
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
      <PlacementHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <PlacementBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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