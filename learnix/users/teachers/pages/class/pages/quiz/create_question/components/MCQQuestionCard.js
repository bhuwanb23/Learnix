import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function MCQQuestionCard({ 
    question, 
    index, 
    onDelete, 
    onDuplicate,
    onUpdate 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(question.text);
    const [points, setPoints] = useState(question.points || 15);
    const [difficulty, setDifficulty] = useState(question.difficulty || 'Moderate');

    const handleSave = () => {
        onUpdate({ ...question, text: editedText, points, difficulty });
        setIsEditing(false);
    };

    const handleOptionSelect = (optionIndex) => {
        const updatedOptions = question.options.map((opt, idx) => ({
            ...opt,
            isCorrect: idx === optionIndex
        }));
        onUpdate({ ...question, options: updatedOptions });
    };

    const adjustPoints = (delta) => {
        const newPoints = Math.max(1, Math.min(100, points + delta));
        setPoints(newPoints);
    };

    const questionNumber = String(index + 1).padStart(2, '0');

    return (
        <View style={styles.card}>
            <View style={styles.leftAccent} />
            
            <View style={styles.content}>
                <View style={styles.cardHeader}>
                    <View style={styles.questionMeta}>
                        <View style={styles.questionBadge}>
                            <Text style={styles.questionBadgeText}>Question {questionNumber}</Text>
                        </View>
                        <Text style={styles.questionType}>Multiple Choice</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.moreButton}
                        activeOpacity={0.7}
                        onPress={() =>
                            Alert.alert('Question Options', 'Duplicate, move or delete this question. Tap the icons below to delete or duplicate.', [
                                { text: 'Duplicate', onPress: () => onDuplicate(question) },
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => onDelete(question.id) },
                            ])
                        }
                    >
                        <MaterialIcons name="more-horiz" size={24} color="#abadaf" />
                    </TouchableOpacity>
                </View>

                {isEditing ? (
                    <TextInput
                        style={styles.questionInput}
                        value={editedText}
                        onChangeText={setEditedText}
                        multiline
                        onBlur={handleSave}
                        autoFocus
                    />
                ) : (
                    <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.7}>
                        <Text style={styles.questionText}>{question.text}</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.optionsContainer}>
                    {question.options.map((option, optIndex) => {
                        const isCorrect = option.isCorrect;
                        const optionLetter = String.fromCharCode(65 + optIndex);
                        
                        return (
                            <TouchableOpacity
                                key={optIndex}
                                style={[
                                    styles.optionCard,
                                    isCorrect && styles.correctOptionCard
                                ]}
                                onPress={() => handleOptionSelect(optIndex)}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.optionLetter,
                                    isCorrect && styles.correctOptionLetter
                                ]}>
                                    <Text style={[
                                        styles.optionLetterText,
                                        isCorrect && styles.correctOptionLetterText
                                    ]}>
                                        {optionLetter}
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.optionText,
                                    isCorrect && styles.correctOptionText
                                ]}>
                                    {option.text}
                                </Text>
                                <View style={[
                                    styles.checkIndicator,
                                    isCorrect && styles.correctCheckIndicator
                                ]}>
                                    {isCorrect && (
                                        <MaterialIcons name="check" size={14} color="#ffffff" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.footerLeft}>
                        <View style={styles.controlGroup}>
                            <Text style={styles.controlLabel}>Point Value</Text>
                            <View style={styles.pointsControl}>
                                <TouchableOpacity 
                                    style={styles.adjustButton}
                                    onPress={() => adjustPoints(-1)}
                                >
                                    <Text style={styles.adjustButtonText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.pointsText}>{points.toFixed(1)}</Text>
                                <TouchableOpacity 
                                    style={styles.adjustButton}
                                    onPress={() => adjustPoints(1)}
                                >
                                    <Text style={styles.adjustButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.controlGroup}>
                            <Text style={styles.controlLabel}>Difficulty</Text>
                            <TouchableOpacity style={styles.difficultySelector}>
                                <Text style={styles.difficultyText}>{difficulty}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.footerActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
                            <MaterialIcons name="delete" size={20} color="#b31b25" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={onDuplicate}>
                            <MaterialIcons name="content-copy" size={20} color="#747779" />
                        </TouchableOpacity>
                    </View>
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
        backgroundColor: '#0050d4',
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
        backgroundColor: '#eef1f3',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    questionBadgeText: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 11,
        fontWeight: '800',
        color: '#0050d4',
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
    questionInput: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 17,
        fontWeight: '700',
        color: '#2c2f31',
        lineHeight: 24,
        marginBottom: 20,
        backgroundColor: '#f5f7f9',
        padding: 12,
        borderRadius: 8,
        minHeight: 60,
    },
    optionsContainer: {
        gap: 10,
        marginBottom: 20,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
        backgroundColor: '#ffffff',
    },
    correctOptionCard: {
        borderColor: '#0050d4',
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
    },
    optionLetter: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    correctOptionLetter: {
        backgroundColor: '#0050d4',
    },
    optionLetterText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#747779',
    },
    correctOptionLetterText: {
        color: '#ffffff',
    },
    optionText: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#595c5e',
    },
    correctOptionText: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#2c2f31',
    },
    checkIndicator: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(116, 119, 121, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctCheckIndicator: {
        backgroundColor: '#0050d4',
        borderColor: '#0050d4',
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
        gap: 20,
    },
    controlGroup: {
        gap: 6,
    },
    controlLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        color: '#abadaf',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    pointsControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    adjustButton: {
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: '#dfe3e6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    adjustButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#595c5e',
    },
    pointsText: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 15,
        fontWeight: '800',
        color: '#2c2f31',
        minWidth: 35,
        textAlign: 'center',
    },
    difficultySelector: {
        paddingVertical: 4,
    },
    difficultyText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#a23800',
    },
    footerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
    },
});
