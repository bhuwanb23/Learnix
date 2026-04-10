import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { WEAK_TOPICS_COLORS, STATS_DATA, GAPS_DATA, TIMELINE_DATA, STUDY_TIP, ACTION_CARDS } from './constants/weakTopicsData';
import WeakTopicsHeader from './components/WeakTopicsHeader';
import StatsCards from './components/StatsCards';
import GapCard from './components/GapCard';
import ActivityTimeline from './components/ActivityTimeline';
import ActionCards from './components/ActionCards';

export default function OverviewInsightsPage({ navigation }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <WeakTopicsHeader onBack={handleBack} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <StatsCards stats={STATS_DATA} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Mistake Deep Dive</Text>
              <Text style={styles.sectionSubtitle}>Key focus areas identified from your last quiz.</Text>
            </View>
            <Text style={styles.viewAllText}>View All Gaps</Text>
          </View>

          {GAPS_DATA.map((gap) => (
            <GapCard key={gap.id} gap={gap} />
          ))}
        </View>

        <View style={styles.grid}>
          <View style={styles.mainContent}>
            <ActivityTimeline items={TIMELINE_DATA} studyTip={STUDY_TIP} />
          </View>
        </View>

        <View style={styles.section}>
          <ActionCards cards={ACTION_CARDS} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WEAK_TOPICS_COLORS.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.primary,
  },
  grid: {
    gap: 20,
    marginBottom: 24,
  },
  mainContent: {
    flex: 1,
  },
});
