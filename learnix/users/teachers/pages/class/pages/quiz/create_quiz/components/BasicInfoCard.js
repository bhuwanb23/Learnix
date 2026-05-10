import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

export default function BasicInfoCard({ 
    quizTitle, 
    setQuizTitle, 
    description, 
    setDescription,
    quizTitleError
}) {
    return (
        <View style={styles.card}>
            {/* Quiz Title Input */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>QUIZ TITLE</Text>
                <TextInput
                    style={[
                        styles.input,
                        quizTitleError && styles.inputError
                    ]}
                    placeholder="e.g., Binary Search Trees & Complexity"
                    placeholderTextColor="#abadaf"
                    value={quizTitle}
                    onChangeText={setQuizTitle}
                />
                {quizTitleError && (
                    <Text style={styles.errorText}>{quizTitleError}</Text>
                )}
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Briefly outline the learning objectives covered in this assessment..."
                    placeholderTextColor="#abadaf"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#eef1f3',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#747779',
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        color: '#2c2f31',
        borderWidth: 1,
        borderColor: 'rgba(116, 119, 121, 0.15)',
    },
    inputError: {
        borderColor: '#b31b25',
        borderWidth: 2,
    },
    errorText: {
        fontFamily: 'Manrope',
        fontSize: 12,
        color: '#b31b25',
        marginLeft: 4,
        marginTop: 4,
    },
    textArea: {
        height: 100,
        paddingTop: 16,
    },
});
