import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ActionButtons({ onCancel, onSave, isSaving }) {
    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onCancel}
                activeOpacity={0.7}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.savingButton]} 
                onPress={onSave}
                disabled={isSaving}
                activeOpacity={0.85}
            >
                <Text style={styles.saveButtonText}>
                    Create Questions
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 16,
        paddingTop: 16,
        paddingBottom: 40,
    },
    cancelButton: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
    },
    cancelButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#747779',
    },
    saveButton: {
        backgroundColor: '#0050d4',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    savingButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});
