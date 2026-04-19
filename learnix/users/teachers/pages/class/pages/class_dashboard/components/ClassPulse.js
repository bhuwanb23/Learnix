import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DAYS_LABELS } from '../constants/dashboardData';

export default function ClassPulse() {
    return (
        <View style={styles.pulseSection}>
            <View style={styles.pulseHeader}>
                <Text style={styles.sectionTitle}>Class Pulse</Text>
                <View style={styles.pulseLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#0050d4' }]} />
                        <Text style={styles.legendText}>Engagement</Text>
                    </View>
                </View>
            </View>
            <View style={styles.pulseChart}>
                <View style={styles.chartPlaceholder}>
                    <MaterialIcons name="show-chart" size={48} color="#0050d4" opacity={0.3} />
                </View>
                <View style={styles.chartLabels}>
                    {DAYS_LABELS.map((day, index) => (
                        <Text key={index} style={styles.dayLabel}>{day}</Text>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    pulseSection: {
        backgroundColor: '#ffffff',
        padding: 32,
        borderRadius: 12,
        minHeight: 256,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 16,
    },
    pulseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    pulseLegend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
    },
    pulseChart: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    chartPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    dayLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 2,
    },
});
