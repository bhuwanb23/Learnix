import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReportHeader from './components/ReportHeader';
import ReportStats from './components/ReportStats';
import CalendarHeatmap from './components/CalendarHeatmap';
import StudentReportList from './components/StudentReportList';
import { MONTH_STATS } from './constants/reportData';
import { STUDENTS } from '../roster_list/constants/rosterData';

export default function AttendanceReport({ route, navigation }) {
    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handlePrevMonth = () => {
        console.log('Previous month');
    };

    const handleNextMonth = () => {
        console.log('Next month');
    };

    const handleOpenStudent = (student) => {
        if (navigation?.navigate) {
            navigation.navigate('StudentDetail', { student });
        }
    };

    const monthTotal = MONTH_STATS.lectures;
    const reportStudents = STUDENTS.map((student) => ({
        ...student,
        monthPresent: Math.round((student.attendance / 100) * monthTotal),
    }));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ReportHeader
                onBack={handleBack}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
            />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ReportStats stats={MONTH_STATS} />
                <CalendarHeatmap />
                <StudentReportList
                    students={reportStudents}
                    monthTotal={monthTotal}
                    onPressStudent={handleOpenStudent}
                />
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
        paddingTop: 4,
    },
});