import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function ChipSelector({ label, options, selected, onSelect }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
            >
                {options.map((option) => {
                    const active = selected === option.id;
                    return (
                        <TouchableOpacity
                            key={option.id}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => onSelect(option.id)}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
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
    chips: {
        gap: 8,
    },
    chip: {
        backgroundColor: '#eef1f3',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#e8efff',
        borderColor: '#0050d4',
    },
    chipText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
    },
    chipTextActive: {
        color: '#0050d4',
        fontWeight: '700',
    },
});