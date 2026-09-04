import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MARK_ALL } from '../constants/attendanceData';

export default function SaveAttendanceBar({ counts, total, onMarkAll, onSave }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 14 }]}>
            <TouchableOpacity style={styles.markAllButton} onPress={onMarkAll} activeOpacity={0.85}>
                <MaterialIcons name={MARK_ALL.icon} size={16} color="#0050d4" />
                <Text style={styles.markAllText}>{MARK_ALL.label}</Text>
            </TouchableOpacity>

            <View style={styles.saveWrap}>
                <Text style={styles.summary}>
                    <Text style={styles.summaryStrong}>{counts.present}</Text> present ·{' '}
                    <Text style={styles.summaryStrong}>{counts.absent}</Text> absent ·{' '}
                    <Text style={styles.summaryStrong}>{counts.late}</Text> late ·{' '}
                    <Text style={styles.summaryStrong}>{counts.excused}</Text> excused
                </Text>
                <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.85}>
                    <Text style={styles.saveText}>Save · {total} students</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e8ec',
        paddingHorizontal: 20,
        paddingTop: 14,
        gap: 10,
    },
    markAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: '#e8efff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    markAllText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
    saveWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    summary: {
        flex: 1,
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#595c5e',
    },
    summaryStrong: {
        fontFamily: 'Manrope-Bold',
        fontWeight: '700',
        color: '#2c2f31',
    },
    saveButton: {
        backgroundColor: '#0050d4',
        borderRadius: 12,
        paddingHorizontal: 18,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
    },
});