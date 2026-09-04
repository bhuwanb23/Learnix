import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradeHeader from './components/GradeHeader';
import SubmissionViewer from './components/SubmissionViewer';
import RubricCard from './components/RubricCard';
import GradeInputCard from './components/GradeInputCard';
import GradeNavBar from './components/GradeNavBar';
import { RUBRIC } from './constants/gradingData';
import { SUBMISSIONS } from '../../constants/submissionsData';
import { STUDENTS } from '../../constants/studentsData';

export default function GradeSubmission({ route, navigation }) {
    const assignment = route?.params?.assignment;
    const submissions = assignment ? SUBMISSIONS[assignment.id] || [] : [];

    const [queue] = useState(() =>
        submissions.filter((sub) => sub.submitted && !sub.graded)
    );
    const [index, setIndex] = useState(0);
    const [grade, setGrade] = useState(0);
    const [feedback, setFeedback] = useState('');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    if (!assignment) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <GradeHeader assignmentTitle="Grading" index={0} total={0} onBack={handleBack} />
            </SafeAreaView>
        );
    }

    const current = queue[index];

    const handleSave = () => {
        console.log('Grade saved:', current?.studentId, grade, feedback);
        if (index >= queue.length - 1) {
            handleBack();
            return;
        }
        setIndex(index + 1);
        setGrade(0);
        setFeedback('');
    };

    const handleSkip = () => {
        if (index >= queue.length - 1) {
            handleBack();
            return;
        }
        setIndex(index + 1);
        setGrade(0);
        setFeedback('');
    };

    if (!current) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <GradeHeader assignmentTitle={assignment.title} index={0} total={0} onBack={handleBack} />
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🎉</Text>
                    <Text style={styles.emptyTitle}>All submissions graded</Text>
                    <Text style={styles.emptyText}>
                        There are no pending submissions left for {assignment.title}.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const student = STUDENTS.find((item) => item.id === current.studentId) || {
        id: '?',
        name: current.studentId,
        studentId: current.studentId,
        avatarBg: '#eef1f3',
        avatarText: '#8a8f94',
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <GradeHeader
                assignmentTitle={assignment.title}
                index={index}
                total={queue.length}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <SubmissionViewer student={student} submission={current} />
                <RubricCard rubric={RUBRIC} />
                <GradeInputCard
                    grade={grade}
                    onChangeGrade={setGrade}
                    feedback={feedback}
                    onChangeFeedback={setFeedback}
                />
            </ScrollView>
            <GradeNavBar
                isLast={index >= queue.length - 1}
                onSkip={handleSkip}
                onSave={handleSave}
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
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: 80,
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    emptyTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 4,
    },
    emptyText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#8a8f94',
        textAlign: 'center',
        lineHeight: 18,
    },
});