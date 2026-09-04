import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RosterActions({ onMarkAttendance, onReport, onAddStudent }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={onMarkAttendance} activeOpacity={0.85}>
                <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                <Text style={styles.primaryText}>Mark Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={onReport} activeOpacity={0.85}>
                <MaterialIcons name="assessment" size={20} color="#0050d4" />
                <Text style={styles.iconLabel}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={onAddStudent} activeOpacity={0.85}>
                <MaterialIcons name="person-add" size={20} color="#0050d4" />
                <Text style={styles.iconLabel}>Add</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e8ec',
        paddingHorizontal: 20,
        paddingTop: 14,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0050d4',
        borderRadius: 12,
        height: 50,
    },
    primaryText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e8efff',
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 16,
    },
    iconLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#0050d4',
        marginTop: 2,
    },
});