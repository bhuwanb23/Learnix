import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function SelectionChips({ label, options, selected, onChange }) {
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
                            onPress={() => onChange(option.id)}
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    styles.dot,
                                    { backgroundColor: active ? '#ffffff' : option.color || '#8a8f94' },
                                ]}
                            />
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
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    chips: {
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chipText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        fontWeight: '600',
        color: '#2c2f31',
    },
    chipTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
});