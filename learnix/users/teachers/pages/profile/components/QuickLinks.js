import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuickLinks({ links, onPress }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quick Links</Text>
            <View style={styles.grid}>
                {links.map((link) => (
                    <TouchableOpacity
                        key={link.id}
                        style={styles.card}
                        onPress={() => onPress(link.id)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: `${link.color}1a` }]}>
                            <MaterialIcons name={link.icon} size={20} color={link.color} />
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {link.label}
                        </Text>
                        <Text style={styles.cardHint} numberOfLines={1}>
                            {link.hint}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 17,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    card: {
        width: '48.5%',
        flexGrow: 1,
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
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    cardHint: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
});