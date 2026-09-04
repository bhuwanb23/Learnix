import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DetailActions({ pendingCount, onGrade, onEdit }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.85}>
                <MaterialIcons name="edit" size={17} color="#0050d4" />
                <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.gradeButton, pendingCount === 0 && styles.gradeButtonDisabled]}
                onPress={onGrade}
                activeOpacity={0.85}
                disabled={pendingCount === 0}
            >
                <MaterialIcons name="rate-review" size={17} color="#ffffff" />
                <Text style={styles.gradeText}>
                    {pendingCount > 0 ? `Grade ${pendingCount} pending` : 'All graded'}
                </Text>
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
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 18,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d6dadd',
    },
    editText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#0050d4',
    },
    gradeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0050d4',
        borderRadius: 12,
        height: 50,
    },
    gradeButtonDisabled: {
        backgroundColor: '#a8bfe8',
    },
    gradeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});