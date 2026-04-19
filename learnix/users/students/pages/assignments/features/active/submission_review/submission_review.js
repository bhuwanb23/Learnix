import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SuccessCard from './components/SuccessCard';
import StudentInfoFooter from './components/StudentInfoFooter';
import { SUBMISSION_REVIEW_DATA } from './constants/submissionReviewData';

export default function SubmissionReviewScreen({ route }) {
    const clickedAssignment = route?.params?.assignment || {};
    const merged = {
        ...SUBMISSION_REVIEW_DATA,
        ...clickedAssignment,
    };
    // Dashboard assignments use `files` as a number; SuccessCard expects an array of file objects.
    const reviewData = {
        ...merged,
        files: Array.isArray(merged.files) ? merged.files : SUBMISSION_REVIEW_DATA.files,
    };

    const handleReturnDashboard = () => {
        console.log('Return to dashboard');
    };

    const handleViewDetails = () => {
        console.log('View submission details');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <SuccessCard 
                    data={reviewData} 
                    onReturnDashboard={handleReturnDashboard} 
                    onViewDetails={handleViewDetails} 
                />
                {/* <StudentInfoFooter data={reviewData} /> */}
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
    scrollContent: {
        paddingBottom: 40,
    },
});