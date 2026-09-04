import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SubmissionRow from './SubmissionRow';

export default function SubmissionsCard({ rows, onPressRow }) {
    const submitted = rows.filter((row) => row.submission.submitted).length;
    const graded = rows.filter((row) => row.submission.graded).length;

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Submissions</Text>
                <Text style={styles.count}>
                    {submitted} submitted · {graded} graded
                </Text>
            </View>
            {rows.map((row) => (
                <SubmissionRow
                    key={row.student.studentId}
                    student={row.student}
                    submission={row.submission}
                    onPress={() => onPressRow(row)}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    headRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    count: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
});