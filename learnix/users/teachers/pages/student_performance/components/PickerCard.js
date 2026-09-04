import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

function ChipRow({ label, options, selected, onChange }) {
    return (
        <View>
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
                                {option.label || option.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

export default function PickerCard({
    classOptions,
    selectedClass,
    onSelectClass,
    subjectOptions,
    selectedSubject,
    onSelectSubject,
}) {
    return (
        <View style={styles.card}>
            <ChipRow
                label="Class"
                options={classOptions}
                selected={selectedClass}
                onChange={onSelectClass}
            />
            <View style={styles.divider} />
            <ChipRow
                label="Subject"
                options={subjectOptions}
                selected={selectedSubject}
                onChange={onSelectSubject}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    chips: {
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    chipText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#2c2f31',
    },
    chipTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f2f4',
        marginVertical: 14,
    },
});