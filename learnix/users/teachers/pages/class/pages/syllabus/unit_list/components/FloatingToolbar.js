import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FloatingToolbar({ onAddUnit, onSync }) {
    return (
        <View style={styles.wrapper} pointerEvents="box-none">
            <View style={styles.toolbar}>
                <TouchableOpacity style={styles.primaryButton} onPress={onAddUnit} activeOpacity={0.85}>
                    <MaterialIcons name="add" size={18} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>Add New Unit</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.syncButton} onPress={onSync} activeOpacity={0.7}>
                    <MaterialIcons name="sync" size={18} color="#ffffff" />
                    <Text style={styles.syncButtonText}>Sync Calendar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 16,
        padding: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0050d4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    primaryButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 12,
    },
    syncButtonText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#ffffff',
    },
});
