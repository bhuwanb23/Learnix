import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Wire demo identity for this role app
import { setDemoUser } from '../../services/api';
setDemoUser('accounts@learnix.dev');

// Import components
import AccountsHeader from './components/AccountsHeader';
import AccountsBottomNavbar from './components/AccountsBottomNavbar';

// Import pages (bottom nav tabs)
import AccountsDashboard from './pages/dashboard/dashboard';
import CollectionsModule from './pages/collections/collections';
import DuesModule from './pages/dues/dues';
import PayrollModule from './pages/payroll/payroll';
import AccountsProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import FeeStructureModule from './pages/fee_structure/fee_structure';
import ExpensesModule from './pages/expenses/expenses';
import ScholarshipsModule from './pages/scholarships/scholarships';
import ReportsModule from './pages/reports/reports';
import NotificationsScreen from './pages/notifications/notifications';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  FeeStructure: { title: 'Fee Structure', component: FeeStructureModule },
  Expenses: { title: 'Expenses', component: ExpensesModule },
  Scholarships: { title: 'Scholarships', component: ScholarshipsModule },
  Reports: { title: 'Reports & Analytics', component: ReportsModule },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
};

const TAB_TITLES = {
  Dashboard: 'Finance Dashboard',
  Collections: 'Collections',
  Dues: 'Dues & Recovery',
  Payroll: 'Payroll',
  Profile: 'My Profile',
};

export default function AccountsScreen({ navigation }) {
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
    return mod ? mod.title : 'Accounts & Finance';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Collections': return 'cash-outline';
        case 'Dues': return 'alert-circle-outline';
        case 'Payroll': return 'card-outline';
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
      case 'Collections':
        return (
          <CollectionsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Dues':
        return (
          <DuesModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Payroll':
        return (
          <PayrollModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Profile':
        return <AccountsProfile navigation={{ goBack: handleBackPress }} />;
      case 'Dashboard':
      default:
        return (
          <AccountsDashboard
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
      <AccountsHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <AccountsBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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