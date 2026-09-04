import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ATTENDANCE_HEADER, LECTURE_SLOT } from '../constants/attendanceData';

export default function AttendanceHeader({ onBack }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
            <View style={styles.topRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.85}>
                    <MaterialIcons name="arrow-back" size={22} color="#2c2f31" />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>{ATTENDANCE_HEADER.title}</Text>
                    <Text style={styles.subtitle}>{ATTENDANCE_HEADER.subtitle}</Text>
                </View>
            </View>
            <View style={styles.slotCard}>
                <MaterialIcons name="play-circle" size={16} color="#0050d4" />
                <View style={styles.slotTextWrap}>
                    <Text style={styles.slotLabel}>{LECTURE_SLOT.label}</Text>
                    <Text style={styles.slotUnit}>{LECTURE_SLOT.unit}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subtitle: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#8a8f94',
        marginTop: 2,
    },
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#e8efff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    slotTextWrap: {
        flex: 1,
    },
    slotLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    slotUnit: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#595c5e',
        marginTop: 2,
    },
});