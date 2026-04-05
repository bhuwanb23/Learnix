import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import pages
import Dashboard from './pages/dashboard/dashboard';
import AssignmentPage from './pages/assignments/assignment';
import ProfilePage from './pages/profile/profile';
import EventsPage from './pages/events/events';
import ClassPage from './pages/class/class';

// Import components
import StudentHeader from './components/StudentHeader';
import StudentBottomNavbar from './components/StudentBottomNavbar';

// Import theme
import { COLORS } from '../../constants/theme';

export default function StudentsScreen() {
  const [activeTab, setActiveTab] = useState('Home');

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return <Dashboard />;
      case 'Classes':
        return <ClassPage />;
      case 'Assignments':
        return <AssignmentPage />;
      case 'Events':
        return <EventsPage />;
      case 'Profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header - Always visible */}
      <StudentHeader activeTab={activeTab} />
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      {/* Bottom Navigation - Always visible */}
      <StudentBottomNavbar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
