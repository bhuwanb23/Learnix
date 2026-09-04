import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateActions({ onCancel, onSave, valid, saveLabel, saveIcon }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.85}>
                <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.saveButton, !valid && styles.saveButtonDisabled]}
                onPress={onSave}
                activeOpacity={0.85}
                disabled={!valid}
            >
                <MaterialIcons name={saveIcon} size={17} color="#ffffff" />
                <Text style={styles.saveText}>{saveLabel}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e8ec',
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    cancelButton: {
        paddingHorizontal: 20,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#d6dadd',
    },
    cancelText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#595c5e',
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0050d4',
        borderRadius: 12,
        height: 50,
    },
    saveButtonDisabled: {
        backgroundColor: '#a8bfe8',
    },
    saveText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
});