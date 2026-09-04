import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function FilterChips({ filters, activeFilter, onChange }) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            {filters.map((filter) => (
                <TouchableOpacity
                    key={filter.id}
                    style={[styles.chip, activeFilter === filter.id && styles.chipActive]}
                    activeOpacity={0.85}
                    onPress={() => onChange(filter.id)}
                >
                    <Text style={[styles.chipText, activeFilter === filter.id && styles.chipTextActive]}>
                        {filter.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    content: {
        paddingHorizontal: 20,
        gap: 10,
    },
    chip: {
        backgroundColor: '#eef1f3',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    chipActive: {
        backgroundColor: '#0050d4',
    },
    chipText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
    },
    chipTextActive: {
        color: '#ffffff',
    },
});