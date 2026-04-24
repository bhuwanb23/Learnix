import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function StatsRow({ stats }) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
            {stats.map((stat) => (
                <View key={stat.id} style={styles.statCard}>
                    <View style={styles.statHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: stat.iconBg }]}>
                            <MaterialIcons name={stat.icon} size={20} color={stat.iconColor} />
                        </View>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
        marginRight: 12,
        minWidth: 220,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#595c5e',
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
        marginBottom: 8,
    },
    statSubtitle: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
});
