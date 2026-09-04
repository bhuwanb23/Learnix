import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AssignmentCard({ assignment, onPress }) {
    const submissionPct = assignment.total > 0 ? Math.round((assignment.submitted / assignment.total) * 100) : 0;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: `${assignment.color}1a` }]}>
                    <MaterialIcons name="assignment" size={18} color={assignment.color} />
                </View>
                <View style={styles.titleWrap}>
                    <Text style={styles.title} numberOfLines={1}>
                        {assignment.title}
                    </Text>
                    <Text style={styles.subject}>
                        {assignment.subject} · {assignment.classCode}
                    </Text>
                </View>
                {assignment.status === 'graded' ? (
                    <View style={styles.gradedBadge}>
                        <MaterialIcons name="check-circle" size={12} color="#16a34a" />
                        <Text style={styles.gradedText}>Avg {assignment.avgGrade}%</Text>
                    </View>
                ) : (
                    <View style={styles.dueBadge}>
                        <MaterialIcons name="schedule" size={12} color="#d97706" />
                        <Text style={styles.dueText}>{assignment.dueDate}</Text>
                    </View>
                )}
            </View>

            {assignment.status !== 'graded' && (
                <View style={styles.progressSection}>
                    <View style={styles.progressHead}>
                        <Text style={styles.progressLabel}>Submissions</Text>
                        <Text style={styles.progressValue}>
                            {assignment.submitted}/{assignment.total}
                        </Text>
                    </View>
                    <View style={styles.track}>
                        <View
                            style={[styles.fill, { width: `${submissionPct}%`, backgroundColor: assignment.color }]}
                        />
                    </View>
                    <View style={styles.footer}>
                        <Text style={styles.footerHint}>
                            {assignment.status === 'active'
                                ? `${assignment.graded} graded · ${assignment.submitted - assignment.graded} pending`
                                : 'Not open for submissions yet'}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
                    </View>
                </View>
            )}

            {assignment.status === 'graded' && (
                <View style={styles.footer}>
                    <Text style={styles.footerHint}>All 24 submissions graded & returned</Text>
                    <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleWrap: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subject: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
        marginTop: 2,
    },
    dueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dueText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#d97706',
    },
    gradedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dcfce7',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    gradedText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#16a34a',
    },
    progressSection: {
        marginBottom: 10,
    },
    progressHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
    progressValue: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#2c2f31',
    },
    track: {
        height: 5,
        borderRadius: 3,
        backgroundColor: '#eef1f3',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    footerHint: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#595c5e',
    },
});