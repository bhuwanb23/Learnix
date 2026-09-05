import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Import screens
import SplashScreen from '../components/SplashScreen';
import LoginScreen from '../pages/login/login';
import StudentsScreen from '../users/students/students';
import TeacherScreen from '../users/teachers/teacher';
import AdminScreen from '../users/admin/admin';
import PlacementScreen from '../users/placement_cell/placement_cell';
import ExamCellScreen from '../users/exam_cell/exam_cell';
import AccountsScreen from '../users/accounts_finance/accounts_finance';

// Import theme
import { COLORS } from '../constants/theme';

// Simple navigation state management
export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState('Splash');

  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  const handleSplashComplete = () => {
    setCurrentScreen('Login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return <SplashScreen onAnimationComplete={handleSplashComplete} />;
      case 'Login':
        return <LoginScreen navigation={{ navigate }} />;
      case 'Student':
        return <StudentsScreen navigation={{ navigate }} />;
      case 'Teacher':
        return <TeacherScreen navigation={{ navigate }} />;
      case 'Admin':
        return <AdminScreen navigation={{ navigate }} />;
      case 'Placement':
        return <PlacementScreen navigation={{ navigate }} />;
      case 'ExamCell':
        return <ExamCellScreen navigation={{ navigate }} />;
      case 'Accounts':
        return <AccountsScreen navigation={{ navigate }} />;
      case 'Main':
        return <MainScreen navigation={{ navigate }} />;
      default:
        return <SplashScreen onAnimationComplete={handleSplashComplete} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}

// Main Screen (placeholder for future main app screens)
function MainScreen({ navigation }) {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.title}>Welcome to Learnix!</Text>
      <Text style={styles.subtitle}>You're now logged in to your campus ERP</Text>
      
      <View style={styles.featureGrid}>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureTitle}>Dashboard</Text>
          <Text style={styles.featureDescription}>View your academic overview</Text>
        </View>
        
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📚</Text>
          <Text style={styles.featureTitle}>Courses</Text>
          <Text style={styles.featureDescription}>Manage your courses</Text>
        </View>
        
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>👤</Text>
          <Text style={styles.featureTitle}>Profile</Text>
          <Text style={styles.featureDescription}>Update your information</Text>
        </View>
        
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🤖</Text>
          <Text style={styles.featureTitle}>AI Assistant</Text>
          <Text style={styles.featureDescription}>Get help with campus queries</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  featureCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
