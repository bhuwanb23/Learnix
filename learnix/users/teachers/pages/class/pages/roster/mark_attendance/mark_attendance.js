import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttendanceHeader from './components/AttendanceHeader';
import AttendanceDateBar from './components/AttendanceDateBar';
import AttendanceRow from './components/AttendanceRow';
import SaveAttendanceBar from './components/SaveAttendanceBar';
import { STUDENTS } from '../roster_list/constants/rosterData';

const INITIAL_STATUS = 'present';

export default function MarkAttendance({ route, navigation }) {
    const [date, setDate] = useState(() => new Date());
    const [statuses, setStatuses] = useState(() => {
        const initial = {};
        STUDENTS.forEach((student) => {
            initial[student.studentId] = INITIAL_STATUS;
        });
        return initial;
    });

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const shiftDate = (delta) => {
        if (delta === 0) {
            setDate(new Date());
            return;
        }
        const next = new Date(date);
        next.setDate(next.getDate() + delta);
        setDate(next);
    };

    const isToday = date.toDateString() === new Date().toDateString();
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const setStatus = (studentId, status) => {
        setStatuses((prev) => ({ ...prev, [studentId]: status }));
    };

    const markAllPresent = () => {
        setStatuses((prev) => {
            const next = {};
            Object.keys(prev).forEach((key) => {
                next[key] = 'present';
            });
            return next;
        });
    };

    const counts = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
    };
    Object.values(statuses).forEach((status) => {
        counts[status] = (counts[status] || 0) + 1;
    });

    const handleSave = () => {
        Alert.alert(
            'Save Attendance?',
            `${counts.present} present, ${counts.late} late, ${counts.absent} absent, ${counts.excused} excused for ${formattedDate}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Save', onPress: () => handleBack() },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AttendanceHeader onBack={handleBack} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <AttendanceDateBar date={formattedDate} onChange={shiftDate} isToday={isToday} />
                <Text style={styles.sectionLabel}>Students</Text>
                {STUDENTS.map((student) => (
                    <AttendanceRow
                        key={student.studentId}
                        student={student}
                        status={statuses[student.studentId]}
                        onSelect={(status) => setStatus(student.studentId, status)}
                    />
                ))}
            </ScrollView>
            <SaveAttendanceBar
                counts={counts}
                total={STUDENTS.length}
                onMarkAll={markAllPresent}
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
        paddingBottom: 24,
    },
    sectionLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        marginHorizontal: 20,
        marginBottom: 10,
    },
});