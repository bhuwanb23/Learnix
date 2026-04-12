import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACADEMIC_COLORS } from '../constants/academicData';

export default function StatsOverview({ data }) {
    return (
        <View style={styles.container}>
            {/* GPA Card */}
            <View style={styles.gpaCard}>
                <Text style={styles.label}>Cumulative GPA</Text>
                <View style={styles.gpaRow}>
                    <Text style={styles.gpaValue}>{data.gpa}</Text>
                    <Text style={styles.gpaScale}>/ {data.gpaScale}</Text>
                </View>
                <View style={styles.trendRow}>
                    <MaterialIcons name="trending-up" size={14} color={ACADEMIC_COLORS.success} />
                    <Text style={styles.trendText}>{data.gpaTrend}</Text>
                </View>
            </View>

            {/* Credits Progress Card */}
            <View style={styles.creditsCard}>
                <Text style={styles.label}>Academic Progress</Text>
                <View style={styles.creditsHeader}>
                    <Text style={styles.creditsValue}>
                        {data.creditsEarned} / {data.creditsTotal} Credits
                    </Text>
                    <Text style={styles.creditsPercentage}>{data.creditsPercentage}% Complete</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${data.creditsPercentage}%` },
                        ]}
                    />
                </View>
                <Text style={styles.creditsNote}>
                    {data.creditsRemaining} credits remaining for graduation in {data.graduationDate}
                </Text>
            </View>

            {/* Attendance Badge */}
            <View style={styles.attendanceCard}>
                <View style={styles.circleContainer}>
                    <View style={styles.circleBg}>
                        <View
                            style={[
                                styles.circleProgress,
                                {
                                    width: 50,
                                    height: 50,
                                    borderRadius: 25,
                                    borderWidth: 4,
                                    borderColor: ACADEMIC_COLORS.secondary,
                                    borderStyle: 'solid',
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.attendanceText}>{data.attendance}%</Text>
                </View>
                <View style={styles.attendanceLabel}>
                    <Text style={styles.label}>Attendance</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 10,
    },
    gpaCard: {
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}15`,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: ACADEMIC_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    gpaRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginBottom: 6,
    },
    gpaValue: {
        fontSize: 28,
        fontWeight: '800',
        color: ACADEMIC_COLORS.primary,
    },
    gpaScale: {
        fontSize: 13,
        color: ACADEMIC_COLORS.onSurfaceVariant,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    trendText: {
        fontSize: 11,
        fontWeight: '700',
        color: ACADEMIC_COLORS.success,
    },
    creditsCard: {
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}15`,
    },
    creditsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    creditsValue: {
        fontSize: 16,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
    creditsPercentage: {
        fontSize: 13,
        fontWeight: '700',
        color: ACADEMIC_COLORS.primary,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: ACADEMIC_COLORS.surfaceContainerHigh,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: ACADEMIC_COLORS.primary,
        borderRadius: 4,
    },
    creditsNote: {
        fontSize: 10,
        color: ACADEMIC_COLORS.onSurfaceVariant,
        marginTop: 6,
    },
    attendanceCard: {
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}15`,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circleBg: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleProgress: {
        borderRadius: 25,
    },
    attendanceText: {
        position: 'absolute',
        fontSize: 12,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
    attendanceLabel: {
        flex: 1,
    },
});
