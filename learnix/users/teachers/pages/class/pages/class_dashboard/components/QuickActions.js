import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function QuickActions({ actions }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
                {actions.map((action, index) => (
                    <TouchableOpacity key={index} style={styles.actionButton} activeOpacity={0.7}>
                        <View style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
                            <MaterialIcons name={action.icon} size={28} color={action.color} />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 16,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        minWidth: (width - 80) / 2,
        backgroundColor: '#eef1f3',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
});
