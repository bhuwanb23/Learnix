import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBar from './components/AppBar';
import HeroCard from './components/HeroCard';
import StatsGrid from './components/StatsGrid';
import QuickActions from './components/QuickActions';
import ClassPulse from './components/ClassPulse';
import AIInsights from './components/AIInsights';
import { DASHBOARD_STATS, QUICK_ACTIONS } from './constants/dashboardData';

export default function ClassDashboard({ route, navigation }) {
    const classData = route?.params?.classData || {
        id: 'SEC-042',
        code: 'SEC-042',
        title: 'Advanced Cognitive Psychology',
        color: '#0050d4',
    };

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleActionPress = (action) => {
        if (action.screen === 'LectureNotes') {
            navigation?.navigate?.('LectureNotes', { classData });
        } else if (action.screen === 'Quiz') {
            navigation?.navigate?.('Quiz', { classData });
        } else if (action.screen === 'Syllabus') {
            navigation?.navigate?.('Syllabus', { classData });
        } else if (action.screen === 'Roster') {
            navigation?.navigate?.('Roster', { classData });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <AppBar title={classData.title} onBack={handleBack} />
                <HeroCard color={classData.color} />
                <StatsGrid stats={DASHBOARD_STATS} />
                <View style={styles.contentGrid}>
                    <QuickActions actions={QUICK_ACTIONS} onActionPress={handleActionPress} />
                    <ClassPulse />
                </View>
                <AIInsights />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollContent: {
        paddingBottom: 32,
    },
    contentGrid: {
        paddingHorizontal: 24,
        gap: 32,
        marginBottom: 32,
    },
});
