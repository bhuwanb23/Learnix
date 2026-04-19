import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { SPACING, BORDER_RADIUS } from '../../../constants/theme';

const navigationItems = [
  {
    id: 'Home',
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
    description: 'Dashboard, attendance, schedule, AI Study Buddy',
  },
  {
    id: 'Classes',
    label: 'Classes',
    icon: 'book-outline',
    activeIcon: 'book',
    description: 'Lecture notes, syllabus, quizzes, weak-topic alerts',
  },
  {
    id: 'Assignments',
    label: 'Assignments',
    icon: 'create-outline',
    activeIcon: 'create',
    description: 'Submit work, take quizzes, exam schedule, analytics',
  },
  {
    id: 'Events',
    label: 'Events',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    description: 'Event registration, RSVPs, hostel info, collaborations',
  },
  {
    id: 'Placement',
    label: 'Placement',
    icon: 'briefcase-outline',
    activeIcon: 'briefcase',
    description: 'Job opportunities, placement stats, interview prep',
  },
];

export default function StudentBottomNavbar({ activeTab, onTabChange }) {
  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        {navigationItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              activeTab === item.id && styles.navItemActive,
            ]}
            onPress={() => onTabChange(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={activeTab === item.id ? item.activeIcon : item.icon}
                size={18}
                color={activeTab === item.id ? '#2563eb' : 'rgba(255, 255, 255, 0.7)'}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm + 2,
  },
  navbar: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 9,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
