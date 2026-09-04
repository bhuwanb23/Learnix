import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentProfileHeader from './components/StudentProfileHeader';
import InfoSection from './components/InfoSection';
import AttendanceSummary from './components/AttendanceSummary';
import StudentNotes from './components/StudentNotes';
import { STUDENT_DETAILS, DEFAULT_DETAIL } from './constants/studentDetailData';

export default function StudentDetail({ route, navigation }) {
    const student = route?.params?.student;
    const detail = student ? STUDENT_DETAILS[student.id] || {} : {};

    const info = {
        ...DEFAULT_DETAIL,
        ...detail,
    };

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    if (!student) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.missing}>
                    <StudentProfileHeader
                        student={{
                            id: '?',
                            name: 'Student not found',
                            studentId: '—',
                            status: 'present',
                            avatarBg: '#eef1f3',
                            avatarText: '#8a8f94',
                        }}
                        onBack={handleBack}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const infoRows = [
        { icon: 'mail', label: 'Email', value: info.email },
        { icon: 'phone', label: 'Phone', value: info.phone },
        { icon: 'group', label: 'Section', value: info.section },
        { icon: 'school', label: 'Enrolled', value: info.enrollmentDate },
        { icon: 'favorite', label: 'Guardian', value: info.guardian },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <StudentProfileHeader student={student} onBack={handleBack} />
                <InfoSection title="Student Information" rows={infoRows} />
                <AttendanceSummary attendance={student.attendance} lastLectures={info.lastLectures} />
                <StudentNotes note={info.note} />
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
        paddingTop: 8,
    },
    missing: {
        flex: 1,
    },
});