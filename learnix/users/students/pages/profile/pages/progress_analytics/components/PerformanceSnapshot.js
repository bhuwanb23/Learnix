import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PROGRESS_COLORS } from '../constants/progressData';

export default function PerformanceSnapshot({ data }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Performance <Text style={styles.highlight}>Snapshot</Text>
            </Text>

            <View style={styles.cardsContainer}>
                {/* Overall Completion Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Overall Completion</Text>
                    <Text style={styles.cardValue}>{data.overallCompletion}%</Text>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${data.overallCompletion}%` },
                            ]}
                        />
                    </View>
                </View>

                {/* Avg Quiz Score Card */}
                <View style={[styles.card, styles.quizCard]}>
                    <Text style={[styles.cardLabel, styles.quizLabel]}>Avg Quiz Score</Text>
                    <Text style={[styles.cardValue, styles.quizValue]}>
                        {data.avgQuizScore}
                        <Text style={styles.quizScale}>/{data.quizScoreScale}</Text>
                    </Text>
                    <View style={styles.trendRow}>
                        <MaterialIcons name="trending-up" size={16} color={PROGRESS_COLORS.onPrimary} />
                        <Text style={styles.trendText}>{data.quizScoreTrend}</Text>
                    </View>
                </View>

                {/* Weekly Intensity Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Weekly Intensity</Text>
                    <Text style={[styles.cardValue, styles.hoursValue]}>{data.weeklyHours}h</Text>
                    <View style={styles.intensityBars}>
                        {data.weeklyIntensity.map((height, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.intensityBar,
                                    {
                                        height: `${height}%`,
                                        backgroundColor:
                                            index === 3
                                                ? PROGRESS_COLORS.secondary
                                                : `${PROGRESS_COLORS.secondary}30`,
                                    },
                                ]}
                            />
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: PROGRESS_COLORS.onSurface,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    highlight: {
        color: PROGRESS_COLORS.primary,
    },
    cardsContainer: {
        gap: 12,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: PROGRESS_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        minHeight: 100,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: `${PROGRESS_COLORS.outlineVariant}15`,
    },
    cardLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 32,
        fontWeight: '900',
        color: PROGRESS_COLORS.primary,
        marginBottom: 8,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: PROGRESS_COLORS.surfaceContainerHigh,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: PROGRESS_COLORS.primary,
        borderRadius: 4,
    },
    quizCard: {
        backgroundColor: PROGRESS_COLORS.primary,
    },
    quizLabel: {
        color: PROGRESS_COLORS.onPrimary,
    },
    quizValue: {
        color: PROGRESS_COLORS.onPrimary,
    },
    quizScale: {
        fontSize: 18,
        opacity: 0.6,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
        color: PROGRESS_COLORS.onPrimary,
    },
    hoursValue: {
        color: PROGRESS_COLORS.secondary,
    },
    intensityBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 40,
    },
    intensityBar: {
        flex: 1,
        borderRadius: 2,
    },
});
