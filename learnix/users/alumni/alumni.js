import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import AlumniHeader from './components/AlumniHeader';
import AlumniBottomNavbar from './components/AlumniBottomNavbar';

// Import pages (bottom nav tabs)
import AlumniDashboard from './pages/dashboard/dashboard';
import AlumniDirectory from './pages/alumni/alumni';
import EventsModule from './pages/events/events';
import DonationsModule from './pages/donations/donations';
import AlumniProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import MentorshipModule from './pages/mentorship/mentorship';
import ChaptersModule from './pages/chapters/chapters';
import NotificationsScreen from './pages/notifications/notifications';

// Import theme
import { COLORS } from '../../constants/theme';
import { setDemoUser } from '../../services/api';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  Mentorship: { title: 'Mentorship Program', component: MentorshipModule },
  Chapters: { title: 'Alumni Chapters', component: ChaptersModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
};

const TAB_TITLES = {
  Dashboard: 'Alumni Relations Office',
  Alumni: 'Alumni Directory',
  Events: 'Alumni Events',
  Donations: 'Donations & Fundraising',
  Profile: 'My Profile',
};

export default function AlumniScreen({ navigation }) {
  setDemoUser('priya@learnix.dev');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  // Bumped when the user re-taps the tab they are already on. Tapping the active
  // tab is the universal "take me back to the top" gesture, but the tab modules
  // keep their own drill-down state (an open event, an open chapter), so setting
  // the same tab and screen values makes React bail out of the re-render and the
  // user is stranded on a detail screen with no way back. Remounting on the new
  // epoch resets that state, which is what the gesture means.
  const [tabEpoch, setTabEpoch] = useState(0);
  const insets = useSafeAreaInsetsWithPadding();

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) {
      setTabEpoch((n) => n + 1);
      setCurrentScreen('main');
      return;
    }
    setActiveTab(tabId);
    setCurrentScreen('main');
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
  };

  const getHeaderTitle = () => {
    if (currentScreen === 'main') return TAB_TITLES[activeTab];
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.title : 'Alumni Relations';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Alumni': return 'people-outline';
        case 'Events': return 'calendar-outline';
        case 'Donations': return 'gift-outline';
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
      case 'Alumni':
        return (
          <AlumniDirectory
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Events':
        return (
          <EventsModule
            key={`events-${tabEpoch}`}
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Donations':
        return (
          <DonationsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Profile':
        // `navigate` was missing here, so every cross-link out of the profile screen
        // was dead — including the notification-preferences row. The other ten cases all
        // pass it; this one had only `goBack`.
        return (
          <AlumniProfile
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Dashboard':
      default:
        return (
          <AlumniDashboard
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
      <AlumniHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <AlumniBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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