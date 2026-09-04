import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const CARD_META = [
  { key: 'present', label: 'Present', icon: 'check-circle', color: '#16a34a', bg: '#dcfce7' },
  { key: 'absent', label: 'Absent', icon: 'cancel', color: '#b31b25', bg: '#fde3e5' },
  { key: 'late', label: 'Late', icon: 'schedule', color: '#d97706', bg: '#fef3c7' },
  { key: 'excused', label: 'Excused', icon: 'event-available', color: '#0050d4', bg: '#dbeafe' },
];

export default function ReportStats({ stats }) {
    return (
        <View style={styles.grid}>
            {CARD_META.map((card) => (
                <View key={card.key} style={styles.card}>
                    <View style={[styles.iconWrap, { backgroundColor: card.bg }]}>
                        <MaterialIcons name={card.icon} size={16} color={card.color} />
                    </View>
                    <Text style={styles.value}>{stats[card.key]}</Text>
                    <Text style={styles.label}>{card.label}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    card: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e8ec',
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    value: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    label: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 9,
        color: '#8a8f94',
        textAlign: 'center',
    },
});