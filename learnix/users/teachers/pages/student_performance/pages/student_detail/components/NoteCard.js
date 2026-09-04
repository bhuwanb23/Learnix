import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function NoteCard({ note }) {
    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <MaterialIcons name="sticky-note-2" size={17} color="#0050d4" />
                <Text style={styles.title}>Teacher Note</Text>
            </View>
            <Text style={styles.note}>{note}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    headRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 8,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    note: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        lineHeight: 19,
        color: '#595c5e',
    },
});