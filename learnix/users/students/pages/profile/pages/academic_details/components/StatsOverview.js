import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ACADEMIC_COLORS } from '../constants/academicData';

export default function StatsOverview({ data }) {
    const attendanceCircumference = 2 * Math.PI * 34;
    const attendanceOffset = attendanceCircumference * (1 - data.attendance / 100);

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
                    <MaterialIcons name="trending-up" size={16} color={ACADEMIC_COLORS.success} />
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
                                    width: 68,
                                    height: 68,
                                    borderRadius: 34,
                                    borderWidth: 4,
                                    borderColor: ACADEMIC_COLORS.secondary,
                                    borderStyle: 'solid',
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.attendanceText}>{data.attendance}%</Text>
                </View>
                <Text style={styles.label}>Attendance</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    gpaCard: {
        flex: 1,
        minWidth: 140,
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}10`,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: ACADEMIC_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    gpaRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginBottom: 8,
    },
    gpaValue: {
        fontSize: 32,
        fontWeight: '800',
        color: ACADEMIC_COLORS.primary,
    },
    gpaScale: {
        fontSize: 14,
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
        flex: 1.5,
        minWidth: 200,
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}10`,
    },
    creditsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    creditsValue: {
        fontSize: 18,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
    creditsPercentage: {
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.primary,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: ACADEMIC_COLORS.surfaceContainerHigh,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: ACADEMIC_COLORS.primary,
        borderRadius: 5,
    },
    creditsNote: {
        fontSize: 11,
        color: ACADEMIC_COLORS.onSurfaceVariant,
        marginTop: 8,
    },
    attendanceCard: {
        flex: 1,
        minWidth: 120,
        backgroundColor: ACADEMIC_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${ACADEMIC_COLORS.outlineVariant}10`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleContainer: {
        width: 68,
        height: 68,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    circleBg: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleProgress: {
        borderRadius: 34,
    },
    attendanceText: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: '700',
        color: ACADEMIC_COLORS.onSurface,
    },
});
