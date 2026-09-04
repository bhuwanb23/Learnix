import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function EditorActionBar({ saving, onDelete, onSaveDraft, onUpdate }) {
    return (
        <View style={styles.bar}>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.85}>
                <MaterialIcons name="delete" size={18} color="#b31b25" />
                <Text style={styles.deleteButtonText}>Delete Topic</Text>
            </TouchableOpacity>
            <View style={styles.rightButtons}>
                <TouchableOpacity style={styles.saveDraftButton} onPress={onSaveDraft} activeOpacity={0.85}>
                    <Text style={styles.saveDraftButtonText}>Save Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.updateButton} onPress={onUpdate} activeOpacity={0.85}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                    )}
                    <Text style={styles.updateButtonText}>{saving ? 'Updating...' : 'Update Topic'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        borderTopWidth: 1,
        borderTopColor: '#eef1f3',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 8,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 12,
    },
    deleteButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#b31b25',
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    saveDraftButton: {
        backgroundColor: '#dfe3e6',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 12,
    },
    saveDraftButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0050d4',
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 12,
        shadowColor: '#0050d4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 5,
    },
    updateButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
});
