import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuizPreviewHeader({ title, quizName, onBack, onEdit, navigation }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <View style={styles.headerBottom}>
                <Text style={styles.quizName}>{quizName}</Text>
                <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.85}>
                    <Text style={styles.editButtonText}>Edit Quiz</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#0050d4',
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quizName: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
        flex: 1,
    },
    editButton: {
        backgroundColor: '#0050d4',
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});
