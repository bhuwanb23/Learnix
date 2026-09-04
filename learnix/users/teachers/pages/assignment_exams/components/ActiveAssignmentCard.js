import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ActiveAssignmentCard({ assignment, onPress }) {
    const submissionPct = Math.round((assignment.submitted / assignment.total) * 100);
    const gradedPct = Math.round((assignment.graded / assignment.total) * 100);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.header}>
                <View style={[styles.subjectDot, { backgroundColor: assignment.color }]} />
                <View style={styles.titleWrap}>
                    <Text style={styles.title} numberOfLines={1}>
                        {assignment.title}
                    </Text>
                    <Text style={styles.subject}>
                        {assignment.subject} · {assignment.classCode}
                    </Text>
                </View>
                <View style={styles.dueBadge}>
                    <MaterialIcons name="schedule" size={12} color="#d97706" />
                    <Text style={styles.dueText}>{assignment.dueLabel}</Text>
                </View>
            </View>

            <View style={styles.metrics}>
                <View style={styles.metric}>
                    <View style={styles.metricHead}>
                        <Text style={styles.metricLabel}>Submissions</Text>
                        <Text style={styles.metricValue}>
                            {assignment.submitted}/{assignment.total}
                        </Text>
                    </View>
                    <View style={styles.track}>
                        <View
                            style={[styles.fill, { width: `${submissionPct}%`, backgroundColor: assignment.color }]}
                        />
                    </View>
                </View>
                <View style={styles.metric}>
                    <View style={styles.metricHead}>
                        <Text style={styles.metricLabel}>Graded</Text>
                        <Text style={styles.metricValue}>
                            {assignment.graded}/{assignment.submitted}
                        </Text>
                    </View>
                    <View style={styles.track}>
                        <View
                            style={[
                                styles.fill,
                                {
                                    width: `${gradedPct}%`,
                                    backgroundColor: assignment.graded > 0 ? '#16a34a' : '#c3c7cc',
                                },
                            ]}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.gradeHint}>
                    {assignment.graded < assignment.submitted
                        ? `${assignment.submitted - assignment.graded} awaiting grading`
                        : 'All submissions graded'}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
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
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    subjectDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 5,
        marginRight: 10,
    },
    titleWrap: {
        flex: 1,
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
    metrics: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 12,
    },
    metric: {
        flex: 1,
    },
    metricHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    metricLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
    metricValue: {
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
    },
    gradeHint: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#595c5e',
    },
});