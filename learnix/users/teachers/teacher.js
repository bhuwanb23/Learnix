import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherHeader from './components/TeacherHeader';
import TeacherBottomNavbar from './components/TeacherBottomNavbar';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

export default function TeacherScreen() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const insets = useSafeAreaInsetsWithPadding();

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <View style={styles.card}> 
            <Text style={styles.cardTitle}>Teacher Dashboard</Text>
            <Text style={styles.cardText}>Overview of classes, assignments, and exams.</Text>
          </View>
        );
      case 'Classes':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Classes</Text>
            <Text style={styles.cardText}>Manage schedules, attendance, and materials.</Text>
          </View>
        );
      case 'Assignments':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assignments</Text>
            <Text style={styles.cardText}>Create, review, and grade submissions.</Text>
          </View>
        );
      case 'Exams':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Exams</Text>
            <Text style={styles.cardText}>Schedule and publish results.</Text>
          </View>
        );
      case 'Profile':
        return (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardText}>Update your information and settings.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TeacherHeader />
      <ScrollView style={[styles.content, { paddingBottom: insets.bottom + SPACING.lg }]} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>
      <TeacherBottomNavbar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});

