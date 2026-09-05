import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ACTIVE_ASSIGNMENT_DATA } from './constants/activeAssignmentData';
import HeaderSection from './components/HeaderSection';
import CountdownTimer from './components/CountdownTimer';
import HeaderCard from './components/HeaderCard';
import GuidelinesCard from './components/GuidelinesCard';
import InstructorCard from './components/InstructorCard';
import ResourcesCard from './components/ResourcesCard';
import VisualInsightCard from './components/VisualInsightCard';
import BottomActionBar from './components/BottomActionBar';

export default function AssignmentDetailsScreen({ route, navigation, onNavigate }) {
    const clickedAssignment = route?.params?.assignment || {};
    const assignmentData = {
        ...ACTIVE_ASSIGNMENT_DATA,
        ...clickedAssignment,
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const handleContinueWork = () => {
        if (onNavigate) {
            onNavigate('submission');
        }
    };

    const handleSubmit = () => {
        if (onNavigate) {
            onNavigate('submission');
        }
    };

    return (
        <View style={styles.container}>
            <HeaderSection assignment={assignmentData} onBack={handleBack} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <CountdownTimer assignment={assignmentData} />
                <HeaderCard assignment={assignmentData} />
                <GuidelinesCard assignment={assignmentData} />
                <InstructorCard assignment={assignmentData} />
                <ResourcesCard assignment={assignmentData} />
            </ScrollView>
            <BottomActionBar onContinueWork={handleContinueWork} onSubmit={handleSubmit} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: ACTIVE_ASSIGNMENT_DATA.surface,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
});
