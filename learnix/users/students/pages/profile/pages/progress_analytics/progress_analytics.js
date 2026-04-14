import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PROGRESS_COLORS, PERFORMANCE_DATA, SUBJECTS, MASTERY_LEVELS, CURATOR_TIP, HEATMAP_DATA } from './constants/progressData';
import PerformanceSnapshot from './components/PerformanceSnapshot';
import SubjectProgression from './components/SubjectProgression';
import MasteryLevels from './components/MasteryLevels';
import LearningMomentum from './components/LearningMomentum';

export default function ProgressAnalyticsPage({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleViewDetails = () => {
        // Future: Navigate to detailed subject view
        console.log('View subject details');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={PROGRESS_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Student Dashboard</Text>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <PerformanceSnapshot data={PERFORMANCE_DATA} />
                
                <SubjectProgression subjects={SUBJECTS} onViewDetails={handleViewDetails} />
                
                <MasteryLevels levels={MASTERY_LEVELS} tip={CURATOR_TIP} />
                
                <LearningMomentum heatmapData={HEATMAP_DATA} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PROGRESS_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: PROGRESS_COLORS.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PROGRESS_COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
});
