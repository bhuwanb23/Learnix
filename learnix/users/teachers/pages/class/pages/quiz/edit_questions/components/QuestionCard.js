import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const DIFFICULTY_COLORS = {
    Easy: { bg: 'rgba(123, 156, 255, 0.2)', text: '#00266e' },
    Medium: { bg: 'rgba(255, 149, 106, 0.2)', text: '#692200' },
    Hard: { bg: 'rgba(208, 184, 255, 0.2)', text: '#5b00c7' },
};

export default function QuestionCard({ 
    question, 
    index, 
    isExpanded = false, 
    onEdit, 
    onDelete,
    onToggleExpand 
}) {
    const [expanded, setExpanded] = useState(isExpanded);
    const difficulty = question.difficulty || 'Medium';
    const colors = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.Medium;

    const handleToggle = () => {
        setExpanded(!expanded);
        if (onToggleExpand) onToggleExpand(!expanded);
    };

    const questionNumber = String(index + 1).padStart(2, '0');

    if (!expanded) {
        // Collapsed View
        return (
            <TouchableOpacity style={styles.collapsedCard} onPress={handleToggle} activeOpacity={0.7}>
                <View style={styles.dragHandle}>
                    <MaterialIcons name="drag-indicator" size={24} color="#abadaf" />
                </View>
                <View style={styles.collapsedContent}>
                    <View style={styles.collapsedLeft}>
                        <View style={styles.questionNumberContainer}>
                            <Text style={styles.questionNumber}>{questionNumber}</Text>
                        </View>
                        <Text style={styles.collapsedQuestion} numberOfLines={1}>
                            {question.text}
                        </Text>
                    </View>
                    <View style={styles.collapsedRight}>
                        <View style={[styles.difficultyBadge, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.difficultyText, { color: colors.text }]}>
                                {difficulty}
                            </Text>
                        </View>
                        <MaterialIcons name="expand-more" size={24} color="#abadaf" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // Expanded View
    return (
        <View style={styles.expandedCard}>
            <View style={styles.cardHeader}>
                <View style={styles.dragHandle}>
                    <MaterialIcons name="drag-indicator" size={24} color="#abadaf" />
                </View>
                <View style={styles.cardHeaderContent}>
                    <View style={styles.cardHeaderTop}>
                        <View style={styles.questionMeta}>
                            <View style={styles.questionNumberContainerExpanded}>
                                <Text style={styles.questionNumberExpanded}>{questionNumber}</Text>
                            </View>
                            <View style={[styles.difficultyBadge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.difficultyText, { color: colors.text }]}>
                                    {difficulty}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.actionButton} onPress={onEdit} activeOpacity={0.7}>
                                <MaterialIcons name="edit" size={20} color="#595c5e" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete} activeOpacity={0.7}>
                                <MaterialIcons name="delete" size={20} color="#b31b25" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={styles.questionText}>{question.text}</Text>
                </View>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {question.options?.map((option, optIndex) => {
                    const isCorrect = option.isCorrect;
                    const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D
                    
                    if (question.options.length <= 4) {
                        // Grid layout for 4 or fewer options
                        return (
                            <View 
                                key={optIndex} 
                                style={[
                                    styles.optionCard,
                                    isCorrect && styles.correctOptionCard
                                ]}
                            >
                                <View style={styles.optionLeft}>
                                    <Text style={[styles.optionLetter, isCorrect && styles.correctOptionLetter]}>
                                        {optionLetter}
                                    </Text>
                                    <Text style={[styles.optionText, isCorrect && styles.correctOptionText]}>
                                        {option.text}
                                    </Text>
                                </View>
                                <MaterialIcons 
                                    name={isCorrect ? "check-circle" : "radio-button-unchecked"} 
                                    size={20} 
                                    color={isCorrect ? "#0050d4" : "#abadaf"} 
                                />
                            </View>
                        );
                    } else {
                        // Chip layout for more options
                        return (
                            <View 
                                key={optIndex}
                                style={[
                                    styles.optionChip,
                                    isCorrect && styles.correctOptionChip
                                ]}
                            >
                                {isCorrect && <View style={styles.correctDot} />}
                                <Text style={[styles.optionChipText, isCorrect && styles.correctOptionChipText]}>
                                    {option.text}
                                </Text>
                            </View>
                        );
                    }
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Collapsed styles
    collapsedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(238, 241, 243, 0.5)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.02)',
    },
    collapsedContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    collapsedLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    collapsedQuestion: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 15,
        color: '#747779',
        flex: 1,
    },
    collapsedRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    // Expanded styles
    expandedCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    dragHandle: {
        padding: 4,
    },
    cardHeaderContent: {
        flex: 1,
    },
    cardHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    questionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    questionNumberContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    questionNumber: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        color: '#747779',
    },
    questionNumberContainerExpanded: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(123, 156, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    questionNumberExpanded: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        color: '#0050d4',
    },
    difficultyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    difficultyText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 4,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
    },
    deleteButton: {
        backgroundColor: 'rgba(179, 27, 37, 0.1)',
    },
    questionText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
        lineHeight: 26,
    },

    // Options styles
    optionsContainer: {
        marginTop: 16,
        marginLeft: 36,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: '45%',
    },
    correctOptionCard: {
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
        borderWidth: 2,
        borderColor: '#0050d4',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionLetter: {
        fontFamily: 'Manrope-Bold',
        fontSize: 16,
        color: '#747779',
    },
    correctOptionLetter: {
        color: '#0050d4',
    },
    optionText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 15,
        color: '#595c5e',
    },
    correctOptionText: {
        fontFamily: 'Manrope-Bold',
        color: '#2c2f31',
    },
    optionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#eef1f3',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    correctOptionChip: {
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0, 80, 212, 0.2)',
    },
    correctDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0050d4',
    },
    optionChipText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#595c5e',
    },
    correctOptionChipText: {
        fontFamily: 'Manrope-SemiBold',
        color: '#2c2f31',
    },
});
