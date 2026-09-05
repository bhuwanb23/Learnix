import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuestionCard({ question }) {
    const renderMultipleChoice = () => (
        <View style={styles.optionsContainer}>
            {question.options.map((option) => (
                <View key={option.label} style={[styles.option, option.correct && styles.correctOption]}>
                    <View style={[styles.optionLabel, option.correct && styles.correctOptionLabel]}>
                        <Text style={[styles.optionLabelText, option.correct && styles.correctOptionLabelText]}>{option.label}</Text>
                    </View>
                    <Text style={[styles.optionText, option.correct && styles.correctOptionText]}>{option.text}</Text>
                    {option.correct && (
                        <View style={styles.correctBadge}>
                            <Text style={styles.correctBadgeText}>Correct Answer</Text>
                            <MaterialIcons name="check-circle" size={20} color="#0050d4" />
                        </View>
                    )}
                </View>
            ))}
        </View>
    );

    const renderMultiSelect = () => (
        <View style={styles.optionsContainer}>
            {question.hasImage && (
                <Image source={{ uri: question.imageUrl }} style={styles.questionImage} resizeMode="cover" />
            )}
            {question.options.map((option) => (
                <View key={option.label} style={[styles.option, option.correct && styles.correctOption]}>
                    <View style={[styles.multiSelectLabel, option.correct && styles.correctMultiSelectLabel]}>
                        {option.correct ? (
                            <MaterialIcons name="check" size={16} color="#ffffff" />
                        ) : (
                            <View style={styles.emptyCheckbox} />
                        )}
                    </View>
                    <Text style={[styles.optionText, option.correct && styles.correctOptionText]}>{option.text}</Text>
                    {option.correct && (
                        <MaterialIcons name="done-all" size={20} color="#0050d4" />
                    )}
                </View>
            ))}
        </View>
    );

    const renderShortAnswer = () => (
        <View style={styles.shortAnswerContainer}>
            <View style={styles.studentPreview}>
                <Text style={styles.studentPreviewText}>Student text area preview...</Text>
            </View>
            <View style={styles.referenceKey}>
                <View style={styles.referenceHeader}>
                    <MaterialIcons name="auto-awesome" size={16} color="#702ae1" />
                    <Text style={styles.referenceHeaderTitle}>Teacher Reference Key</Text>
                </View>
                <Text style={styles.referenceText}>{question.referenceKey}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.questionHeader}>
                <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>QUESTION {question.number}</Text>
                </View>
                <Text style={styles.pointsText}>{question.points}</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
            {question.type === 'multiple-choice' && renderMultipleChoice()}
            {question.type === 'multi-select' && renderMultiSelect()}
            {question.type === 'short-answer' && renderShortAnswer()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
        marginBottom: 16,
    },
    questionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    questionNumber: {
        backgroundColor: '#dfe3e6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    questionNumberText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#595c5e',
    },
    pointsText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#595c5e',
    },
    questionText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 24,
        lineHeight: 24,
    },
    optionsContainer: {
        gap: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#eef1f3',
        gap: 12,
    },
    correctOption: {
        backgroundColor: 'rgba(0, 80, 212, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 80, 212, 0.3)',
    },
    optionLabel: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#abadaf',
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctOptionLabel: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
    },
    optionLabelText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#595c5e',
    },
    correctOptionLabelText: {
        color: '#ffffff',
    },
    optionText: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        fontWeight: '500',
        color: '#2c2f31',
    },
    correctOptionText: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
    },
    correctBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    correctBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#0050d4',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    multiSelectLabel: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#abadaf',
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctMultiSelectLabel: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
    },
    emptyCheckbox: {
        width: 12,
        height: 12,
    },
    questionImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    shortAnswerContainer: {
        gap: 12,
    },
    studentPreview: {
        backgroundColor: '#eef1f3',
        padding: 16,
        borderRadius: 12,
    },
    studentPreviewText: {
        fontFamily: 'Manrope-Regular',
        fontSize: 13,
        fontStyle: 'italic',
        color: '#595c5e',
    },
    referenceKey: {
        backgroundColor: 'rgba(112, 42, 225, 0.05)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(112, 42, 225, 0.2)',
    },
    referenceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    referenceHeaderTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#702ae1',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    referenceText: {
        fontFamily: 'Manrope',
        fontSize: 13,
        color: '#2c2f31',
        lineHeight: 18,
    },
});
