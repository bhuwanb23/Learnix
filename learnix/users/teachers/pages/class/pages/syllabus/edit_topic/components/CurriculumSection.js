import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FormSection from './FormSection';

export default function CurriculumSection({ section, data, bloom, difficulty, weights, onBloomChange, onDifficultyChange, onWeightToggle }) {
    return (
        <FormSection
            icon={section.icon}
            iconBg={section.iconBg}
            iconColor={section.iconColor}
            title={section.title}
            subtitle={section.subtitle}
        >
            {/* Bloom's taxonomy */}
            <View style={styles.group}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>{data.bloomLabel}</Text>
                    <Text style={styles.bloomHint}>{data.bloomHint}</Text>
                </View>
                <View style={styles.chipWrap}>
                    {data.bloomOptions.map((option) => {
                        const active = bloom === option;
                        return (
                            <TouchableOpacity
                                key={option}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => onBloomChange(option)}
                                activeOpacity={0.85}
                            >
                                {active && <MaterialIcons name="done" size={14} color="#f8f0ff" />}
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.gridRow}>
                {/* Difficulty */}
                <View style={styles.gridCol}>
                    <Text style={styles.label}>{data.difficultyLabel}</Text>
                    <View style={styles.difficultyGroup}>
                        {data.difficultyOptions.map((option) => {
                            const active = difficulty === option;
                            return (
                                <TouchableOpacity
                                    key={option}
                                    style={[styles.difficultyBtn, active && styles.difficultyBtnActive]}
                                    onPress={() => onDifficultyChange(option)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.difficultyText, active && styles.difficultyTextActive]}>
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Weight tags */}
                <View style={styles.gridCol}>
                    <Text style={styles.label}>{data.weightLabel}</Text>
                    <View style={styles.weightGroup}>
                        {data.weightOptions.map((option) => {
                            const active = weights[option.id];
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.weightChip, active && styles.weightChipActive]}
                                    onPress={() => onWeightToggle(option.id)}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.weightCheckbox, active && styles.weightCheckboxActive]}>
                                        {active && <MaterialIcons name="check" size={12} color="#ffffff" />}
                                    </View>
                                    <Text style={[styles.weightText, active && styles.weightTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </FormSection>
    );
}

const styles = StyleSheet.create({
    group: {
        gap: 8,
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
    bloomHint: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#702ae1',
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    chipActive: {
        backgroundColor: '#702ae1',
        shadowColor: '#702ae1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    chipText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#595c5e',
    },
    chipTextActive: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontWeight: '700',
        color: '#f8f0ff',
    },
    gridRow: {
        flexDirection: 'column',
        gap: 20,
        paddingTop: 4,
    },
    gridCol: {
        gap: 8,
    },
    difficultyGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    difficultyBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef1f3',
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    difficultyBtnActive: {
        backgroundColor: '#0050d4',
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    difficultyText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
        textAlign: 'center',
    },
    difficultyTextActive: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontWeight: '700',
        color: '#ffffff',
    },
    weightGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    weightChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    weightCheckbox: {
        width: 14,
        height: 14,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#0050d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    weightCheckboxActive: {
        backgroundColor: '#0050d4',
    },
    weightText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#595c5e',
    },
    weightTextActive: {
        color: '#2c2f31',
    },
});
