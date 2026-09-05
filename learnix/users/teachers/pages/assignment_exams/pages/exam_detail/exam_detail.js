import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateHeader from '../../components/CreateHeader';
import ExamMetaCard from './components/ExamMetaCard';
import ResultsCard from './components/ResultsCard';
import PublishBar from './components/PublishBar';
import { EXAM_DETAILS, DEFAULT_EXAM_DETAIL, RESULTS, RESULT_ACTIONS } from './constants/examDetailData';
import { STUDENTS } from '../../constants/studentsData';

export default function ExamDetail({ route, navigation }) {
    const exam = route?.params?.exam;
    const detail = exam ? EXAM_DETAILS[exam.id] || DEFAULT_EXAM_DETAIL : DEFAULT_EXAM_DETAIL;

    const [results, setResults] = useState(() => {
        const stored = exam ? RESULTS[exam.id] || [] : [];
        const map = {};
        stored.forEach((entry) => {
            map[entry.studentId] = { marks: entry.marks, status: entry.status };
        });
        STUDENTS.forEach((student) => {
            if (!map[student.studentId]) {
                map[student.studentId] = { marks: null, status: null };
            }
        });
        return map;
    });

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    if (!exam) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <CreateHeader title="Exam" subtitle="Select an exam first" onBack={handleBack} />
            </SafeAreaView>
        );
    }

    const handleChangeMarks = (studentId, marks) => {
        setResults((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], marks, status: marks == null ? null : 'pass' },
        }));
    };

    const handleToggleAbsent = (studentId) => {
        setResults((prev) => {
            const current = prev[studentId];
            const isAbsent = current.status === 'absent';
            return {
                ...prev,
                [studentId]: isAbsent
                    ? { marks: null, status: null }
                    : { marks: 0, status: 'absent' },
            };
        });
    };

    const rows = STUDENTS.map((student) => ({
        student,
        result: results[student.studentId] || { marks: null, status: null },
    }));

    const isUpcoming = exam.status === 'upcoming';
    const published = exam.results === 'published';
    const complete = isUpcoming || rows.every((row) => row.result.marks != null || row.result.status === 'absent');

    const handleSaveDraft = () => {
        handleBack();
    };

    const handlePublish = () => {
        handleBack();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <CreateHeader
                title={exam.title}
                subtitle={`${exam.subject} · ${exam.classCode}`}
                onBack={handleBack}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <ExamMetaCard exam={exam} detail={detail} />

                {isUpcoming ? (
                    <View style={styles.placeholderCard}>
                        <Text style={styles.placeholderIcon}>📝</Text>
                        <Text style={styles.placeholderTitle}>{RESULT_ACTIONS.resultsNotStarted}</Text>
                        <Text style={styles.placeholderText}>
                            Results entry will unlock once the exam is completed.
                        </Text>
                    </View>
                ) : (
                    <ResultsCard
                        rows={rows}
                        editable
                        maxMarks={detail.maxMarks}
                        onChangeMarks={handleChangeMarks}
                        onToggleAbsent={handleToggleAbsent}
                    />
                )}
            </ScrollView>
            {!isUpcoming && (
                <PublishBar
                    complete={complete}
                    published={published}
                    onSaveDraft={handleSaveDraft}
                    onPublish={handlePublish}
                />
            )}
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
    placeholderCard: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 28,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#e5e8ec',
    },
    placeholderIcon: {
        fontSize: 34,
        marginBottom: 10,
    },
    placeholderTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 4,
        textAlign: 'center',
    },
    placeholderText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#8a8f94',
        textAlign: 'center',
        lineHeight: 18,
    },
});