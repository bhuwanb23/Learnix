import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { STATUS_OPTIONS } from '../constants/attendanceData';

export default function AttendanceRow({ student, status, onSelect }) {
    return (
        <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {student.name}
                </Text>
                <Text style={styles.studentId}>{student.studentId}</Text>
            </View>

            <View style={styles.segment}>
                {STATUS_OPTIONS.map((option) => {
                    const active = status === option.id;
                    return (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.segmentButton,
                                active && { backgroundColor: option.bg },
                            ]}
                            onPress={() => onSelect(option.id)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    active && { color: option.color, fontWeight: '800' },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 12,
        marginHorizontal: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e8ec',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
    },
    info: {
        flex: 1,
        marginRight: 10,
    },
    name: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
    studentId: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
        marginTop: 2,
    },
    segment: {
        flexDirection: 'row',
        backgroundColor: '#eef1f3',
        borderRadius: 9,
        padding: 3,
        gap: 2,
    },
    segmentButton: {
        width: 30,
        height: 28,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#8a8f94',
    },
});