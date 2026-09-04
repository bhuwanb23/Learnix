import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DetailHeader from './components/DetailHeader';
import OverviewCard from './components/OverviewCard';
import SubmissionsCard from './components/SubmissionsCard';
import DetailActions from './components/DetailActions';
import { ASSIGNMENT_DETAILS, DEFAULT_DETAIL } from './constants/assignmentDetailData';
import { SUBMISSIONS } from '../../constants/submissionsData';
import { STUDENTS } from '../../constants/studentsData';

export default function AssignmentDetail({ route, navigation }) {
    const assignment = route?.params?.assignment;
    const detail = assignment ? ASSIGNMENT_DETAILS[assignment.id] || DEFAULT_DETAIL : DEFAULT_DETAIL;
    const submissions = assignment ? SUBMISSIONS[assignment.id] || [] : [];

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleGrade = () => {
        if (navigation?.navigate && assignment) {
            navigation.navigate('GradeSubmission', { assignment });
        }
    };

    const handleEdit = () => {
        console.log('Edit assignment:', assignment?.id);
    };

    if (!assignment) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <DetailHeader title="Assignment" subtitle="Select an assignment first" onBack={handleBack} />
            </SafeAreaView>
        );
    }

    const rows = STUDENTS.map((student) => {
        const submission = submissions.find((sub) => sub.studentId === student.id) || {
            submitted: false,
            late: false,
            content: '',
            fileName: '',
            grade: null,
            graded: false,
            feedback: '',
            plagiarism: null,
        };
        return { student, submission };
    });

    const pendingCount = rows.filter((row) => row.submission.submitted && !row.submission.graded).length;

    const handlePressRow = (row) => {
        if (row.submission.submitted && !row.submission.graded) {
            handleGrade();
        } else if (row.submission.submitted && row.submission.graded) {
            console.log('View graded submission:', row.student.name);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <DetailHeader
                title={assignment.title}
                subtitle={`${assignment.subject} · ${assignment.classCode}`}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <OverviewCard
                    detail={detail}
                    dueDate={assignment.dueDate}
                    status={assignment.status}
                />
                <SubmissionsCard rows={rows} onPressRow={handlePressRow} />
            </ScrollView>
            <DetailActions
                pendingCount={pendingCount}
                onGrade={handleGrade}
                onEdit={handleEdit}
            />
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
        paddingTop: 4,
    },
});