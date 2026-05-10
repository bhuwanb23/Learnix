import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AddQuestionButton({ onPress }) {
    return (
        <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
            <MaterialIcons name="add" size={28} color="#ffffff" style={styles.icon} />
            <Text style={styles.text}>Add Question</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0050d4',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 28,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        gap: 8,
    },
    icon: {
        fontWeight: '600',
    },
    text: {
        fontFamily: 'Manrope-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        paddingRight: 4,
    },
});
