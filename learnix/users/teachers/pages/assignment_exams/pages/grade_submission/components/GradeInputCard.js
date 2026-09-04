import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GRADE_PRESETS, GRADE_LABELS } from '../constants/gradingData';

export default function GradeInputCard({ grade, onChangeGrade, feedback, onChangeFeedback }) {
    const clamp = (value) => Math.max(0, Math.min(100, value));

    return (
        <View style={styles.card}>
            <Text style={styles.title}>{GRADE_LABELS.gradeInput}</Text>

            <View style={styles.stepperRow}>
                <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => onChangeGrade(clamp(grade - 5))}
                    activeOpacity={0.85}
                >
                    <MaterialIcons name="remove" size={18} color="#2c2f31" />
                </TouchableOpacity>
                <TextInput
                    style={styles.gradeInput}
                    value={String(grade)}
                    onChangeText={(text) => {
                        const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
                        onChangeGrade(Number.isNaN(parsed) ? 0 : clamp(parsed));
                    }}
                    keyboardType="number-pad"
                    maxLength={3}
                />
                <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => onChangeGrade(clamp(grade + 5))}
                    activeOpacity={0.85}
                >
                    <MaterialIcons name="add" size={18} color="#2c2f31" />
                </TouchableOpacity>
            </View>

            <View style={styles.presetsRow}>
                {GRADE_PRESETS.map((preset) => (
                    <TouchableOpacity
                        key={preset}
                        style={[styles.preset, grade === preset && styles.presetActive]}
                        onPress={() => onChangeGrade(preset)}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.presetText, grade === preset && styles.presetTextActive]}>
                            {preset}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.feedbackLabel}>Feedback</Text>
            <TextInput
                style={styles.feedbackInput}
                placeholder={GRADE_LABELS.feedbackPlaceholder}
                placeholderTextColor="#a6abb1"
                value={feedback}
                onChangeText={onChangeFeedback}
                multiline
                textAlignVertical="top"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 12,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        marginBottom: 12,
    },
    stepButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradeInput: {
        width: 96,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#e8efff',
        textAlign: 'center',
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 26,
        fontWeight: '700',
        color: '#0050d4',
        paddingVertical: 0,
    },
    presetsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    preset: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#eef1f3',
    },
    presetActive: {
        backgroundColor: '#0050d4',
    },
    presetText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#595c5e',
    },
    presetTextActive: {
        color: '#ffffff',
    },
    feedbackLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    feedbackInput: {
        minHeight: 84,
        backgroundColor: '#f5f7f9',
        borderRadius: 10,
        padding: 12,
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        color: '#2c2f31',
    },
});