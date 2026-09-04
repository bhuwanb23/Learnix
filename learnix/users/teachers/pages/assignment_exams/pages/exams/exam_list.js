import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExamHeader from './components/ExamHeader';
import ExamTabs from './components/ExamTabs';
import ExamCard from './components/ExamCard';
import { EXAM_HEADER, EXAM_TABS, EXAMS } from './constants/examData';

export default function ExamList({ route, navigation }) {
    const [activeTab, setActiveTab] = useState('upcoming');

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleAddExam = () => {
        if (navigation?.navigate) {
            navigation.navigate('CreateExam');
        }
    };

    const handleOpenExam = (exam) => {
        if (navigation?.navigate) {
            navigation.navigate('ExamDetail', { exam });
        }
    };

    const visibleExams = EXAMS.filter((exam) => exam.status === activeTab);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ExamHeader
                title={EXAM_HEADER.title}
                subtitle={EXAM_HEADER.subtitle}
                onBack={handleBack}
                onAdd={handleAddExam}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ExamTabs tabs={EXAM_TABS} activeTab={activeTab} onChange={setActiveTab} />
                <View style={styles.list}>
                    {visibleExams.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} onPress={() => handleOpenExam(exam)} />
                    ))}
                </View>
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
        paddingBottom: 24,
    },
    list: {
        paddingHorizontal: 20,
    },
});