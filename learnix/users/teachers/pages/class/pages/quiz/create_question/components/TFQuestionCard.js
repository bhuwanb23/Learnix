import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TFQuestionCard({ 
    question, 
    index, 
    onUpdate 
}) {
    const [points, setPoints] = useState(question.points || 5);

    const handleOptionSelect = (isTrue) => {
        onUpdate({ 
            ...question, 
            selectedAnswer: isTrue ? 'True' : 'False',
            isCorrect: isTrue === question.correctAnswer 
        });
    };

    const questionNumber = String(index + 1).padStart(2, '0');

    return (
        <View style={[styles.card, { borderLeftColor: '#702ae1' }]}>
            <View style={[styles.leftAccent, { backgroundColor: '#702ae1' }]} />
            
            <View style={styles.content}>
                <View style={styles.cardHeader}>
                    <View style={styles.questionMeta}>
                        <View style={[styles.questionBadge, { backgroundColor: 'rgba(112, 42, 225, 0.1)' }]}>
                            <Text style={[styles.questionBadgeText, { color: '#702ae1' }]}>
                                Question {questionNumber}
                            </Text>
                        </View>
                        <Text style={styles.questionType}>True / False</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.moreButton}
                        activeOpacity={0.7}
                        onPress={() => Alert.alert('Question Options', 'Convert to multiple choice or adjust the answer key here.')}
                    >
                        <MaterialIcons name="more-horiz" size={24} color="#abadaf" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.questionText}>{question.text}</Text>

                <View style={styles.tfContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tfButton,
                            question.selectedAnswer === 'True' && styles.selectedTfButton
                        ]}
                        onPress={() => handleOptionSelect(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tfButtonText,
                            question.selectedAnswer === 'True' && styles.selectedTfButtonText
                        ]}>
                            True
                        </Text>
                        {question.selectedAnswer === 'True' && (
                            <MaterialIcons name="check-circle" size={24} color="#0050d4" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tfButton,
                            question.selectedAnswer === 'False' && styles.unselectedTfButton
                        ]}
                        onPress={() => handleOptionSelect(false)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tfButtonText,
                            question.selectedAnswer === 'False' && styles.unselectedTfButtonText
                        ]}>
                            False
                        </Text>
                        {question.selectedAnswer !== 'True' && question.selectedAnswer !== undefined && (
                            <MaterialIcons name="circle" size={24} color="#abadaf" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.footerLeft}>
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>{points} Points</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: 'rgba(208, 184, 255, 0.3)' }]}>
                            <Text style={[styles.chipText, { color: '#5b00c7' }]}>
                                Difficulty: {question.difficulty || 'Easy'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => Alert.alert('Edit Feedback', 'Explanation shown to students after submission can be edited here.')}>
                        <Text style={styles.editFeedbackText}>Edit Feedback</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
        overflow: 'hidden',
    },
    leftAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    content: {
        padding: 20,
        paddingLeft: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    questionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    questionBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    questionBadgeText: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 11,
        fontWeight: '800',
    },
    questionType: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#abadaf',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    moreButton: {
        padding: 4,
    },
    questionText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 17,
        fontWeight: '700',
        color: '#2c2f31',
        lineHeight: 24,
        marginBottom: 20,
    },
    tfContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    tfButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(116, 119, 121, 0.15)',
        alignItems: 'center',
        gap: 8,
    },
    selectedTfButton: {
        borderColor: '#0050d4',
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
    },
    unselectedTfButton: {
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
    },
    tfButtonText: {
        fontFamily: 'Manrope-ExtraBold',
        fontSize: 14,
        fontWeight: '800',
        color: '#747779',
        textTransform: 'uppercase',
    },
    selectedTfButtonText: {
        color: '#0050d4',
    },
    unselectedTfButtonText: {
        color: '#abadaf',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(116, 119, 121, 0.1)',
    },
    footerLeft: {
        flexDirection: 'row',
        gap: 10,
    },
    chip: {
        backgroundColor: '#eef1f3',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    chipText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#2c2f31',
    },
    editFeedbackText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
