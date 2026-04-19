import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function StatsGrid({ stats }) {
    return (
        <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <View style={styles.statValueRow}>
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
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        minWidth: (width - 80) / 2,
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    statLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        fontWeight: '600',
        color: '#595c5e',
        marginBottom: 4,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 8,
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#2c2f31',
    },
    statChange: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
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
