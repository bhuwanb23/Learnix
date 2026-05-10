import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function CreateQuizHeader({ onBack, onSave, onCancel }) {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={24} color="#2c2f31" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Quiz</Text>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.7}>
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#f5f7f9',
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#2c2f31',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    saveButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#0050d4',
    },
});
