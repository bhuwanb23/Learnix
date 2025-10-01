import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import StudentHeader from './components/StudentHeader';
import StudentBottomNavbar from './components/StudentBottomNavbar';
import Dashboard from './pages/dashboard/dashboard';
import AssignmentPage from './pages/assignments/assignment';

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
        return <Dashboard navigation={{ navigate: handleTabChange }} />;
      case 'Classes':
        return (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>Classes</Text>
            <Text style={styles.placeholderSubtext}>Lecture notes, syllabus, quizzes, weak-topic alerts</Text>
          </View>
        );
      case 'Assignments':
        return <AssignmentPage />;
      case 'Events':
        return (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>Events & Campus Life</Text>
            <Text style={styles.placeholderSubtext}>Event registration, RSVPs, hostel info, collaborations</Text>
          </View>
        );
      case 'Profile':
        return (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>Profile & Wallet</Text>
            <Text style={styles.placeholderSubtext}>Personal info, habit tracker, campus wallet, achievements</Text>
          </View>
        );
      default:
        return <Dashboard navigation={{ navigate: handleTabChange }} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <StudentHeader activeTab={activeTab} />
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      {/* Bottom Navigation */}
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
