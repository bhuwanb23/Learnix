import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AddQuestionFAB({ onPress }) {
    return (
        <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
            <MaterialIcons name="add" size={32} color="#ffffff" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0050d4',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
});
