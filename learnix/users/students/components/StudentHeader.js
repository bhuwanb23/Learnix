import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

export default function StudentHeader({ activeTab, currentScreen, onBackPress }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getScreenTitle = () => {
    if (currentScreen === 'LectureNotes') return 'Lecture Notes';
    if (currentScreen === 'QuizArena') return 'Quiz Arena';
    if (currentScreen === 'SubjectTracker') return 'Subject Tracker';
    return null;
  };

  const getScreenIcon = () => {
    if (currentScreen === 'LectureNotes') return 'book-outline';
    if (currentScreen === 'QuizArena') return 'help-circle-outline';
    if (currentScreen === 'SubjectTracker') return 'list-outline';
    return 'book-outline';
  };

  const screenTitle = getScreenTitle();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.greetingContainer}>
          {currentScreen && onBackPress ? (
            // Sub-screen header with back button and title
            <View style={styles.subScreenHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={onBackPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.titleSection}>
                <Ionicons name={getScreenIcon()} size={20} color="#FFFFFF" />
                <Text style={styles.screenTitle}>{screenTitle}</Text>
              </View>
            </View>
          ) : (
            // Main header with greeting
            <>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.studentName}>John Doe</Text>
            </>
          )}
        </View>
        
        <View style={styles.headerActions}>
          {/* Notifications */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563eb',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1d4ed8',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 1,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  studentName: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    position: 'relative',
    padding: SPACING.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: BORDER_RADIUS.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.1,
  },
  subScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
});
