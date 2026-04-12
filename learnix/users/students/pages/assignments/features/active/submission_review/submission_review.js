import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import HeaderSection from './components/HeaderSection';
import SuccessCard from './components/SuccessCard';
import StudentInfoFooter from './components/StudentInfoFooter';
import { SUBMISSION_REVIEW_DATA } from './constants/submissionReviewData';

export default function SubmissionReviewScreen({ route, navigation, onNavigate }) {
    const clickedAssignment = route?.params?.assignment || {};
    const reviewData = {
        ...SUBMISSION_REVIEW_DATA,
        ...clickedAssignment,
    };

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('submission');
        } else {
            navigation.goBack();
        }
    };

    const handleReturnDashboard = () => {
        console.log('Return to dashboard');
    };

    const handleViewDetails = () => {
        console.log('View submission details');
    };

    return (
        <View style={styles.container}>
            <HeaderSection data={reviewData} onBack={handleBack} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <SuccessCard 
                    data={reviewData} 
                    onReturnDashboard={handleReturnDashboard} 
                    onViewDetails={handleViewDetails} 
                />
                <StudentInfoFooter data={reviewData} />
            </ScrollView>
        </View>
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
    scrollContent: {
        paddingBottom: 40,
    },
});