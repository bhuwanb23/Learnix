import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ResultRow from './ResultRow';

export default function ResultsCard({ rows, editable, maxMarks, onChangeMarks, onToggleAbsent }) {
    const marked = rows.filter((row) => row.result.marks != null || row.result.status === 'absent').length;
    const average = (() => {
        const withMarks = rows.filter((row) => row.result.marks != null);
        if (withMarks.length === 0) return null;
        const sum = withMarks.reduce((acc, row) => acc + row.result.marks, 0);
        return Math.round(sum / withMarks.length);
    })();

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Results</Text>
                <Text style={styles.count}>
                    {editable
                        ? `${marked}/${rows.length} entered`
                        : average != null
                            ? `Class avg ${average}`
                            : `${marked}/${rows.length}`}
                </Text>
            </View>
            {rows.map((row) => (
                <ResultRow
                    key={row.student.studentId}
                    student={row.student}
                    result={row.result}
                    maxMarks={maxMarks}
                    editable={editable}
                    onChangeMarks={(marks) => onChangeMarks(row.student.studentId, marks)}
                    onToggleAbsent={() => onToggleAbsent(row.student.studentId)}
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