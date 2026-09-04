import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

export default function ResultRow({ student, result, maxMarks, editable, onChangeMarks, onToggleAbsent }) {
    const isAbsent = result.status === 'absent';
    const grade = computeGrade(result.marks, maxMarks);

    return (
        <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {student.name}
                </Text>
                <Text style={styles.studentId}>{student.studentId}</Text>
            </View>

            {editable ? (
                <View style={styles.editWrap}>
                    <TouchableOpacity
                        style={[styles.absentToggle, isAbsent && styles.absentToggleActive]}
                        onPress={onToggleAbsent}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.absentText, isAbsent && styles.absentTextActive]}>
                            {isAbsent ? 'Absent' : 'Mark absent'}
                        </Text>
                    </TouchableOpacity>
                    {!isAbsent && (
                        <TextInput
                            style={styles.marksInput}
                            value={result.marks == null ? '' : String(result.marks)}
                            onChangeText={(text) => {
                                const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                onChangeMarks(Number.isNaN(parsed) ? null : Math.min(parsed, maxMarks));
                            }}
                            keyboardType="number-pad"
                            placeholder="–"
                            placeholderTextColor="#c3c7cc"
                            maxLength={3}
                        />
                    )}
                </View>
            ) : (
                <View style={styles.viewWrap}>
                    <Text style={[styles.marksText, isAbsent && { color: '#b31b25' }]}>
                        {isAbsent ? 'Absent' : result.marks}
                    </Text>
                    {!isAbsent && result.status === 'pass' && (
                        <Text style={styles.gradeText}>P · {grade}</Text>
                    )}
                    {!isAbsent && result.status === 'fail' && (
                        <Text style={[styles.gradeText, { color: '#b31b25' }]}>F · {grade}</Text>
                    )}
                </View>
            )}
        </View>
    );
}

function computeGrade(marks, maxMarks) {
    if (marks == null) return '—';
    const pct = (marks / maxMarks) * 100;
    if (pct >= 90) return 'A';
    if (pct >= 75) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
    },
    info: {
        flex: 1,
        marginRight: 8,
    },
    name: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
    studentId: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
        marginTop: 2,
    },
    editWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    absentToggle: {
        borderWidth: 1,
        borderColor: '#d6dadd',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    absentToggleActive: {
        backgroundColor: '#fde3e5',
        borderColor: '#b31b25',
    },
    absentText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
    },
    absentTextActive: {
        color: '#b31b25',
    },
    marksInput: {
        width: 56,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#e8efff',
        textAlign: 'center',
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#0050d4',
        paddingVertical: 0,
    },
    viewWrap: {
        alignItems: 'flex-end',
    },
    marksText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    gradeText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#16a34a',
        marginTop: 2,
    },
});