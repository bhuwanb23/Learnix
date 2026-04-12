import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AssignmentDetailsScreen from './assignment_details/assignment_details';
import SubmissionScreen from './submission/submission';
import SubmissionReviewScreen from './submission_review/submission_review';

export default function ActiveAssignmentScreen({ route, navigation }) {
    const [currentView, setCurrentView] = useState('details'); // 'details', 'submission', 'review'
    const [selectedAssignment, setSelectedAssignment] = useState(route?.params?.assignment || null);

    const handleBack = () => {
        if (currentView !== 'details') {
            setCurrentView('details');
        } else {
            navigation.goBack();
        }
    };

    const navigateToView = (view) => {
        setCurrentView(view);
    };

    // Render the appropriate sub-page based on currentView
    const renderCurrentView = () => {
        switch (currentView) {
            case 'details':
                return (
                    <AssignmentDetailsScreen
                        route={{ params: { assignment: selectedAssignment } }}
                        navigation={{ goBack: handleBack }}
                        onNavigate={navigateToView}
                    />
                );
            case 'submission':
                return (
                    <SubmissionScreen
                        route={{ params: { assignment: selectedAssignment } }}
                        navigation={{ goBack: handleBack }}
                        onNavigate={navigateToView}
                    />
                );
            case 'review':
                return (
                    <SubmissionReviewScreen
                        route={{ params: { assignment: selectedAssignment } }}
                        navigation={{ goBack: handleBack }}
                        onNavigate={navigateToView}
                    />
                );
            default:
                return (
                    <AssignmentDetailsScreen
                        route={{ params: { assignment: selectedAssignment } }}
                        navigation={{ goBack: handleBack }}
                        onNavigate={navigateToView}
                    />
                );
        }
    };

    return (
        <View style={styles.container}>
            {renderCurrentView()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
});
