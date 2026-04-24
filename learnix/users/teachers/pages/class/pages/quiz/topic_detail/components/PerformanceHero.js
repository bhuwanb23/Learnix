import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function PerformanceHero({ title, subtitle, value, trend }) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.label}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
                <View style={styles.valueRow}>
                    <Text style={styles.value}>{value}</Text>
                    <View style={styles.trendContainer}>
                        <MaterialIcons name="trending-up" size={16} color="#702ae1" />
                        <Text style={styles.trendText}>{trend}</Text>
                    </View>
                </View>
            </View>
            <View style={styles.chartContainer}>
                <View style={[styles.bar, { height: '40%', backgroundColor: 'rgba(0, 80, 212, 0.2)' }]} />
                <View style={[styles.bar, { height: '35%', backgroundColor: 'rgba(0, 80, 212, 0.2)' }]} />
                <View style={[styles.bar, { height: '55%', backgroundColor: 'rgba(0, 80, 212, 0.2)' }]} />
                <View style={[styles.bar, { height: '70%', backgroundColor: 'rgba(0, 80, 212, 0.4)' }]} />
                <View style={[styles.bar, { height: '65%', backgroundColor: 'rgba(0, 80, 212, 0.4)' }]} />
                <View style={[styles.bar, { height: '85%', backgroundColor: 'rgba(0, 80, 212, 0.6)' }]} />
                <View style={[styles.bar, { height: '95%', backgroundColor: '#0050d4' }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 24,
        flexDirection: 'column',
        gap: 24,
        marginBottom: 24,
    },
    content: {
        zIndex: 1,
    },
    label: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        fontWeight: '600',
        color: '#595c5e',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 12,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 12,
    },
    value: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 40,
        fontWeight: '800',
        color: '#0050d4',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#702ae1',
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 100,
        gap: 4,
    },
    bar: {
        flex: 1,
        borderRadius: 2,
    },
});
