import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

const DIFFICULTY_COLORS = {
    Easy: { bg: '#10b981', text: '#ffffff' },
    Medium: { bg: '#0050d4', text: '#ffffff' },
    Hard: { bg: '#b31b25', text: '#ffffff' },
};

export default function DifficultySelector({ selectedDifficulty, onSelectDifficulty }) {
    return (
        <View style={styles.card}>
            <Text style={styles.label}>DIFFICULTY LEVEL</Text>
            <View style={styles.selectorContainer}>
                {DIFFICULTY_LEVELS.map((difficulty) => {
                    const isSelected = selectedDifficulty === difficulty;
                    const colors = DIFFICULTY_COLORS[difficulty];
                    
                    return (
                        <TouchableOpacity
                            key={difficulty}
                            style={[
                                styles.difficultyButton,
                                isSelected && { 
                                    backgroundColor: colors.bg,
                                    shadowColor: colors.bg,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }
                            ]}
                            onPress={() => onSelectDifficulty(difficulty)}
                            activeOpacity={0.7}
                        >
                            <Text 
                                style={[
                                    styles.difficultyText,
                                    isSelected && { color: colors.text }
                                ]}
                            >
                                {difficulty}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#eef1f3',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#747779',
        marginLeft: 4,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    selectorContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 6,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
    },
    difficultyButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    difficultyText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#747779',
    },
});
