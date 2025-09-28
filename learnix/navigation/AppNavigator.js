import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Import screens
import LandingScreen from '../pages/landing/landing';
import LoginScreen from '../pages/login/login';

// Import theme
import { COLORS } from '../constants/theme';

// Simple navigation state management
export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState('Landing');

  const navigate = (screenName) => {
    setCurrentScreen(screenName);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Landing':
        return <LandingScreen navigation={{ navigate }} />;
      case 'Login':
        return <LoginScreen navigation={{ navigate }} />;
      case 'Main':
        return <MainScreen navigation={{ navigate }} />;
      default:
        return <LandingScreen navigation={{ navigate }} />;
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
    backgroundColor: COLORS.primary,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
});
