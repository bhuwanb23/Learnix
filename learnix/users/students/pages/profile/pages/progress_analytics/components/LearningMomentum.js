import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PROGRESS_COLORS, HEATMAP_COLORS } from '../constants/progressData';

export default function LearningMomentum({ heatmapData }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Learning Momentum</Text>

            <View style={styles.heatmapGrid}>
                {heatmapData.map((row, rowIndex) =>
                    row.map((intensity, colIndex) => (
                        <View
                            key={`${rowIndex}-${colIndex}`}
                            style={[
                                styles.heatmapCell,
                                {
                                    backgroundColor: HEATMAP_COLORS[intensity],
                                },
                            ]}
                        />
                    ))
                )}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <Text style={styles.legendLabel}>Low Intensity</Text>
                <View style={styles.legendColors}>
                    {[0, 1, 2, 3].map((level) => (
                        <View
                            key={level}
                            style={[
                                styles.legendDot,
                                {
                                    backgroundColor: HEATMAP_COLORS[level],
                                },
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.legendLabel}>High Intensity</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: PROGRESS_COLORS.surfaceContainerLowest,
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurface,
        marginBottom: 12,
    },
    heatmapGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: 12,
    },
    heatmapCell: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    legendLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    legendColors: {
        flexDirection: 'row',
        gap: 3,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
});
