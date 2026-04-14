import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PROGRESS_COLORS } from '../constants/progressData';

export default function SubjectProgression({ subjects, onViewDetails }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Subject Progression</Text>
                <TouchableOpacity onPress={onViewDetails} activeOpacity={0.7}>
                    <Text style={styles.viewDetails}>
                        View Details
                        <MaterialIcons name="arrow-forward" size={16} color={PROGRESS_COLORS.primary} />
                    </Text>
                </TouchableOpacity>
            </View>

            {subjects.map((subject) => (
                <View key={subject.id} style={styles.subjectCard}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: subject.iconBg }]}>
                        <MaterialIcons name={subject.icon} size={24} color={subject.iconColor} />
                    </View>

                    {/* Progress Info */}
                    <View style={styles.progressInfo}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.subjectName}>{subject.name}</Text>
                            <Text style={styles.progressPercent}>{subject.progress}%</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBar,
                                    {
                                        width: `${subject.progress}%`,
                                        backgroundColor: subject.iconColor,
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    {/* Sparkline */}
                    <View style={styles.sparkline}>
                        {subject.sparkline.map((height, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.sparklineBar,
                                    {
                                        height: `${height}%`,
                                        backgroundColor:
                                            index === subject.sparkline.length - 1
                                                ? subject.sparklineColor
                                                : `${subject.sparklineColor}50`,
                                    },
                                ]}
                            />
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurface,
    },
    viewDetails: {
        fontSize: 13,
        fontWeight: '700',
        color: PROGRESS_COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PROGRESS_COLORS.surfaceContainerLowest,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: `${PROGRESS_COLORS.outlineVariant}15`,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    progressInfo: {
        flex: 1,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 6,
    },
    subjectName: {
        fontSize: 15,
        fontWeight: '700',
        color: PROGRESS_COLORS.onSurface,
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '600',
        color: PROGRESS_COLORS.onSurfaceVariant,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: PROGRESS_COLORS.surfaceContainerLow,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 5,
    },
    sparkline: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        width: 60,
        height: 40,
        flexShrink: 0,
    },
    sparklineBar: {
        flex: 1,
        borderRadius: 2,
    },
});
