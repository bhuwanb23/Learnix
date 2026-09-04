import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SubmissionViewer({ student, submission }) {
    return (
        <View style={styles.card}>
            <View style={styles.studentRow}>
                <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                    <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
                </View>
                <View style={styles.studentInfo}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.studentId}>{student.studentId}</Text>
                </View>
                {submission.late ? (
                    <View style={styles.lateBadge}>
                        <MaterialIcons name="schedule" size={11} color="#d97706" />
                        <Text style={styles.lateText}>Late</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.contentBox}>
                <Text style={styles.contentLabel}>Submission</Text>
                <Text style={styles.contentText}>{submission.content}</Text>
            </View>

            <View style={styles.fileRow}>
                <MaterialIcons name="insert-drive-file" size={16} color="#0050d4" />
                <Text style={styles.fileText}>{submission.fileName || 'no file attached'}</Text>
            </View>

            {submission.plagiarism != null && (
                <View style={styles.plagRow}>
                    <MaterialIcons
                        name={submission.plagiarism >= 5 ? 'warning' : 'verified'}
                        size={15}
                        color={submission.plagiarism >= 5 ? '#b31b25' : '#16a34a'}
                    />
                    <Text
                        style={[
                            styles.plagText,
                            { color: submission.plagiarism >= 5 ? '#b31b25' : '#16a34a' },
                        ]}
                    >
                        Plagiarism score: {submission.plagiarism}% —{' '}
                        {submission.plagiarism >= 5 ? 'review required' : 'looks original'}
                    </Text>
                </View>
            )}
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
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
    },
    studentInfo: {
        flex: 1,
    },
    name: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    studentId: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
        marginTop: 2,
    },
    lateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    lateText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#d97706',
    },
    contentBox: {
        backgroundColor: '#f5f7f9',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
    },
    contentLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    contentText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        lineHeight: 18,
        color: '#2c2f31',
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    fileText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#0050d4',
    },
    plagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f5f7f9',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    plagText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
    },
});