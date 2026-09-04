import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FormatPicker({ formats, selected, onSelect }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Format</Text>
            <View style={styles.row}>
                {formats.map((format) => {
                    const active = selected === format.id;
                    return (
                        <TouchableOpacity
                            key={format.id}
                            style={[styles.card, active && styles.cardActive]}
                            onPress={() => onSelect(format.id)}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.iconWrap, { backgroundColor: `${format.color}1a` }]}>
                                <MaterialIcons name={format.icon} size={20} color={format.color} />
                            </View>
                            <Text style={[styles.title, active && { color: '#0050d4' }]}>
                                {format.label}
                            </Text>
                            <Text style={styles.subtitle}>{format.subtitle}</Text>
                            {active && (
                                <View style={styles.check}>
                                    <MaterialIcons name="check-circle" size={16} color="#0050d4" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    card: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        alignItems: 'center',
        position: 'relative',
    },
    cardActive: {
        borderColor: '#0050d4',
        backgroundColor: '#f5f9ff',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 9,
        color: '#8a8f94',
        textAlign: 'center',
    },
    check: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
});