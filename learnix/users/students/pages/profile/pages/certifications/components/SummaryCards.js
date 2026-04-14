import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CERTIFICATION_COLORS } from '../constants/certificationData';

export default function SummaryCards({ data }) {
    const circumference = 2 * Math.PI * 40;
    const offset = circumference * (1 - data.masteryProgress / 100);

    return (
        <View style={styles.container}>
            {/* Hero Card */}
            <View style={styles.heroCard}>
                <View style={styles.heroContent}>
                    <Text style={styles.heroLabel}>ACADEMIC EXCELLENCE</Text>
                    <Text style={styles.heroTitle}>
                        Your achievements,{'\n'}curated.
                    </Text>
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{data.totalCertificates}</Text>
                        <Text style={styles.statLabel}>Total Certificates</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{String(data.currentTerm).padStart(2, '0')}</Text>
                        <Text style={styles.statLabel}>Current Term</Text>
                    </View>
                </View>
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
                <Text style={styles.progressLabel}>Mastery Progress</Text>
                <View style={styles.circleContainer}>
                    <View style={styles.circleBg}>
                        <View
                            style={[
                                styles.circleProgress,
                                {
                                    transform: [{ rotate: '-90deg' }],
                                },
                            ]}
                        />
                    </View>
                    <View style={styles.circleOverlay}>
                        <Text style={styles.circleText}>{data.masteryProgress}%</Text>
                    </View>
                </View>
                <Text style={styles.progressDescription}>
                    You're in the top <Text style={styles.highlightText}>{data.topPercent}%</Text> of learners this month.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    heroCard: {
        backgroundColor: CERTIFICATION_COLORS.primary,
        borderRadius: 24,
        padding: 24,
        minHeight: 180,
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    heroContent: {
        zIndex: 1,
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: CERTIFICATION_COLORS.onPrimary,
        opacity: 0.8,
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: CERTIFICATION_COLORS.onPrimary,
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        zIndex: 1,
    },
    statBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: CERTIFICATION_COLORS.onPrimary,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: CERTIFICATION_COLORS.onPrimary,
        opacity: 0.8,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    progressCard: {
        backgroundColor: CERTIFICATION_COLORS.surfaceContainerLowest,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: `${CERTIFICATION_COLORS.onSurface}99`,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    circleContainer: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    circleBg: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 10,
        borderColor: `${CERTIFICATION_COLORS.surfaceContainerHigh}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleProgress: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 10,
        borderColor: CERTIFICATION_COLORS.primary,
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
    },
    circleOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleText: {
        fontSize: 28,
        fontWeight: '800',
        color: CERTIFICATION_COLORS.onSurface,
    },
    progressDescription: {
        fontSize: 13,
        fontWeight: '500',
        color: CERTIFICATION_COLORS.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 18,
    },
    highlightText: {
        color: CERTIFICATION_COLORS.secondary,
        fontWeight: '700',
    },
});
