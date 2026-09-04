import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const average = (values) => Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

export default function BreakdownCard({ detail }) {
    const tiles = [
        { label: 'Quizzes', value: `${average(detail.quizzes)}%`, icon: 'quiz', color: '#0050d4' },
        { label: 'Assignments', value: `${average(detail.assignments)}%`, icon: 'assignment', color: '#702ae1' },
        { label: 'Midterm', value: `${detail.exam}%`, icon: 'fact-check', color: '#16a34a' },
        { label: 'Attendance', value: `${detail.attendance}%`, icon: 'event-available', color: '#d97706' },
    ];

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Performance Breakdown</Text>

            <View style={styles.tileGrid}>
                {tiles.map((tile) => (
                    <View key={tile.label} style={styles.tile}>
                        <View style={[styles.iconWrap, { backgroundColor: `${tile.color}1a` }]}>
                            <MaterialIcons name={tile.icon} size={16} color={tile.color} />
                        </View>
                        <Text style={styles.tileValue}>{tile.value}</Text>
                        <Text style={styles.tileLabel}>{tile.label}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionLabel}>Quiz trend</Text>
            <View style={styles.trendRow}>
                {detail.quizzes.map((score, index) => (
                    <View key={index} style={styles.trendItem}>
                        <View style={styles.trendBarTrack}>
                            <View
                                style={[
                                    styles.trendBarFill,
                                    {
                                        height: `${score}%`,
                                        backgroundColor:
                                            index === detail.quizzes.length - 1
                                                ? detail.trendColor
                                                : `${detail.trendColor}66`,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.trendLabel}>Q{index + 1}</Text>
                        <Text style={styles.trendValue}>{score}</Text>
                    </View>
                ))}
            </View>
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
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 14,
    },
    tileGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 18,
    },
    tile: {
        flex: 1,
        backgroundColor: '#f5f7f9',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    tileValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    tileLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 9,
        color: '#8a8f94',
        textAlign: 'center',
    },
    sectionLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    trendRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-end',
    },
    trendItem: {
        flex: 1,
        alignItems: 'center',
    },
    trendBarTrack: {
        width: '100%',
        height: 60,
        backgroundColor: '#eef1f3',
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    trendBarFill: {
        width: '100%',
        borderRadius: 6,
        backgroundColor: '#0050d4',
        opacity: 0.85,
    },
    trendLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 9,
        color: '#8a8f94',
        marginTop: 5,
    },
    trendValue: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#2c2f31',
        marginTop: 1,
    },
});