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
        <View style={styles.container}>
            <LinearGradient
                colors={['#F0F7FF', '#FFFFFF', '#F8FAFF']}
                style={styles.backgroundGradient}
            >
                {/* Animated Background Shapes */}
                <View style={styles.backgroundShapes}>
                    <View style={[styles.shape, styles.shape1]} />
                    <View style={[styles.shape, styles.shape2]} />
                    <View style={[styles.shape, styles.shape3]} />
                    <View style={[styles.shape, styles.shape4]} />
                </View>

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    backgroundShapes: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    shape: {
        position: 'absolute',
        borderRadius: 50,
        opacity: 0.1,
    },
    shape1: {
        width: 120,
        height: 120,
        backgroundColor: '#3B82F6',
        top: 50,
        right: -30,
        borderRadius: 60,
    },
    shape2: {
        width: 80,
        height: 80,
        backgroundColor: '#8B5CF6',
        top: 200,
        left: -20,
        borderRadius: 40,
    },
    shape3: {
        width: 100,
        height: 100,
        backgroundColor: '#06B6D4',
        bottom: 300,
        right: -40,
        borderRadius: 50,
    },
    shape4: {
        width: 60,
        height: 60,
        backgroundColor: '#10B981',
        bottom: 100,
        left: -10,
        borderRadius: 30,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: SPACING.sm, // Reduced from lg to sm
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
