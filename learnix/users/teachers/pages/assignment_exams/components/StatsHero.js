import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function StatsHero({ stats, onPressStat }) {
    return (
        <View style={styles.container}>
            {stats.map((stat) => (
                <TouchableOpacity
                    key={stat.id}
                    style={styles.card}
                    onPress={() => onPressStat && onPressStat(stat.id)}
                    activeOpacity={0.85}
                >
                    <View style={[styles.iconWrap, { backgroundColor: `${stat.color}1a` }]}>
                        <MaterialIcons name={stat.icon} size={18} color={stat.color} />
                    </View>
                    <Text style={styles.value}>{stat.value}</Text>
                    <Text style={styles.label}>{stat.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    card: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    value: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    label: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 9,
        color: '#8a8f94',
        lineHeight: 12,
    },
});