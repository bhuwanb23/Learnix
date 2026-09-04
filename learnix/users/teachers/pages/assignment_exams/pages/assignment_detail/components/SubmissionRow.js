import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SubmissionRow({ student, submission, onPress }) {
    const status = !submission.submitted
        ? { label: 'Missing', color: '#b31b25', bg: '#fde3e5', icon: 'cancel' }
        : submission.late
            ? { label: 'Late', color: '#d97706', bg: '#fef3c7', icon: 'schedule' }
            : submission.graded
                ? { label: 'Graded', color: '#16a34a', bg: '#dcfce7', icon: 'check-circle' }
                : { label: 'Submitted', color: '#0050d4', bg: '#dbeafe', icon: 'check-circle' };

    const rowContent = (
        <>
            <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {student.name}
                </Text>
                <Text style={styles.studentId}>{student.studentId}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <MaterialIcons name={status.icon} size={11} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>

            {submission.submitted && submission.graded ? (
                <Text style={styles.grade}>{submission.grade}</Text>
            ) : submission.submitted ? (
                <View style={styles.gradeCta}>
                    <Text style={styles.gradeCtaText}>Grade</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#0050d4" />
                </View>
            ) : null}
        </>
    );

    if (!submission.submitted) {
        return <View style={styles.row}>{rowContent}</View>;
    }

    return (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
            {rowContent}
        </TouchableOpacity>
    );
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
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    grade: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#16a34a',
        marginLeft: 10,
        width: 28,
        textAlign: 'right',
    },
    gradeCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginLeft: 10,
    },
    gradeCtaText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
    },
});