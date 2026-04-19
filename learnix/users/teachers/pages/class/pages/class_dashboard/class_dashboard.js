import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardHeader from './components/DashboardHeader';
import HeroCard from './components/HeroCard';
import StatsGrid from './components/StatsGrid';
import QuickActions from './components/QuickActions';
import ClassPulse from './components/ClassPulse';
import AIInsights from './components/AIInsights';
import {
  HEADER,
  HERO,
  STATS,
  QUICK_ACTIONS,
  CLASS_PULSE,
  AI_INSIGHT,
} from './constants/dashboardData';

export default function ClassDashboardPage({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader title={HEADER.title} />
        <HeroCard hero={HERO} />
        <StatsGrid stats={STATS} />
        <View style={styles.grid}>
          <View style={styles.leftColumn}>
            <QuickActions actions={QUICK_ACTIONS} />
          </View>
          <View style={styles.rightColumn}>
            <ClassPulse pulseData={CLASS_PULSE} />
          </View>
        </View>
        <AIInsights insight={AI_INSIGHT} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 24,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 2,
  },
});