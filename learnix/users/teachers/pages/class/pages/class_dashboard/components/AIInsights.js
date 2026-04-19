import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AI_INSIGHT } from '../constants/dashboardData';

export default function AIInsights() {
    return (
        <View style={styles.aiCard}>
            <View style={styles.aiIcon}>
                <MaterialIcons name={AI_INSIGHT.icon} size={24} color="#ffffff" />
            </View>
            <View style={styles.aiContent}>
                <Text style={styles.aiTitle}>{AI_INSIGHT.title}</Text>
                <Text style={styles.aiText}>
                    Recent data suggests a performance gap in <Text style={styles.aiBold}>"{AI_INSIGHT.highlight}"</Text>. {AI_INSIGHT.content.split('"')[2]}
                </Text>
                <View style={styles.aiActions}>
                    {AI_INSIGHT.actions.map((action, index) => (
                        <TouchableOpacity key={index} activeOpacity={0.7}>
                            <Text style={action.type === 'primary' ? styles.aiActionPrimary : styles.aiActionSecondary}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    aiCard: {
        marginHorizontal: 24,
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        flexDirection: 'column',
        gap: 16,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    aiIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#702ae1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiContent: {
        flex: 1,
    },
    aiTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#702ae1',
        marginBottom: 8,
    },
    aiText: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#2c2f31',
        lineHeight: 22,
    },
    aiBold: {
        fontWeight: '700',
    },
    aiActions: {
        flexDirection: 'column',
        gap: 8,
        marginTop: 8,
    },
    aiActionPrimary: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#702ae1',
    },
    aiActionSecondary: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#595c5e',
    },
});
