import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function StatsGrid({ stats }) {
    return (
        <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <View style={styles.statValueColumn}>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={[styles.statChange, { color: stat.changeColor }]}>{stat.change}</Text>
                    </View>
                    {stat.progress !== undefined && (
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${stat.progress * 100}%`, backgroundColor: stat.progressColor }]} />
                        </View>
                    )}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    statsGrid: {
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    statLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
        marginBottom: 8,
    },
    statValueColumn: {
        flexDirection: 'column',
        gap: 4,
        marginBottom: 12,
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '700',
        color: '#2c2f31',
    },
    statChange: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#e5e9eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
});
