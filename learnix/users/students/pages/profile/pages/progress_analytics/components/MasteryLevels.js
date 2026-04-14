import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PROGRESS_COLORS } from '../constants/progressData';

export default function MasteryLevels({ levels, tip }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mastery Levels</Text>

            <View style={styles.levelsContainer}>
                {levels.map((level) => {
                    const circumference = 2 * Math.PI * 40;
                    const offset = circumference * (1 - level.percentage / 100);

                    return (
                        <View key={level.id} style={styles.levelRow}>
                            {/* Circular Progress */}
                            <View style={styles.circleContainer}>
                                <View style={styles.circleBg}>
                                    <View
                                        style={[
                                            styles.circleProgress,
                                            {
                                                width: 80,
                                                height: 80,
                                                borderRadius: 40,
                                                borderWidth: 6,
                                                borderColor: level.color,
                                                borderStyle: 'solid',
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.circleText}>{level.percentage}%</Text>
                            </View>

                            {/* Level Info */}
                            <View style={styles.levelInfo}>
                                <Text style={styles.levelName}>{level.name}</Text>
                                <Text style={styles.levelDescription}>{level.level}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Curator's Tip */}
            <View style={styles.tipCard}>
                <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipText}>{tip.content}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: PROGRESS_COLORS.surfaceContainerLow,
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurface,
        marginBottom: 16,
    },
    levelsContainer: {
        gap: 20,
        marginBottom: 16,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    circleContainer: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        flexShrink: 0,
    },
    circleBg: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circleProgress: {
        borderRadius: 40,
    },
    circleText: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurface,
    },
    levelInfo: {
        flex: 1,
    },
    levelName: {
        fontSize: 15,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurface,
        marginBottom: 2,
    },
    levelDescription: {
        fontSize: 12,
        color: PROGRESS_COLORS.onSurfaceVariant,
    },
    tipCard: {
        backgroundColor: `${PROGRESS_COLORS.primaryContainer}30`,
        padding: 14,
        borderRadius: 10,
        marginTop: 8,
    },
    tipContent: {
        position: 'relative',
        zIndex: 1,
    },
    tipTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: PROGRESS_COLORS.primaryDim,
        marginBottom: 4,
    },
    tipText: {
        fontSize: 11,
        color: `${PROGRESS_COLORS.onSurface}90`,
        lineHeight: 16,
    },
});
