import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Components
import PerformanceOverview from './components/PerformanceOverview';
import HeatmapSection from './components/HeatmapSection';
import StrengthsWeaknesses from './components/StrengthsWeaknesses';
import AIRecommendations from './components/AIRecommendations';
import StudyResources from './components/StudyResources';
import QuickActions from './components/QuickActions';
import CriticalAlerts from './components/CriticalAlerts';

// Hooks
import { useWeakTopicsData } from './hooks/useWeakTopicsData';
import { useWeakTopicsActions } from './hooks/useWeakTopicsActions';

// Constants
import { COLORS, SPACING } from '../../../../../../constants/theme';

export default function WeakTopicsPage({ navigation }) {
  const {
    data,
    loading,
    error,
    refreshing,
    handleRefresh,
  } = useWeakTopicsData();

  const {
    handleStartStudy,
    handleViewProgress,
    handleAITutor,
    handleStudyGroup,
    handleResourceClick,
  } = useWeakTopicsActions(navigation);

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load weak topics data</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#F8FAFF', '#FFFFFF']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <CriticalAlerts alerts={data?.alerts} />
        
        <PerformanceOverview 
          performance={data?.performance}
          stats={data?.stats}
        />
        
        <HeatmapSection 
          heatmapData={data?.heatmapData}
        />
        
        <StrengthsWeaknesses 
          subjects={data?.subjects}
        />
        
        <AIRecommendations 
          recommendations={data?.aiRecommendations}
        />
        
        <StudyResources 
          resources={data?.studyResources}
          onResourceClick={handleResourceClick}
        />
        
        <QuickActions 
          onStartStudy={handleStartStudy}
          onViewProgress={handleViewProgress}
          onAITutor={handleAITutor}
          onStudyGroup={handleStudyGroup}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
