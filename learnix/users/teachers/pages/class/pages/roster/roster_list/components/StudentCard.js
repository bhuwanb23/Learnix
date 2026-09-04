import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { STATUS_META } from '../constants/rosterData';

const RISK_THRESHOLD = 75;

export default function StudentCard({ student, onPress }) {
    const status = STATUS_META[student.status] || STATUS_META.present;
    const atRisk = student.risk || student.attendance < RISK_THRESHOLD;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
            </View>

            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                        {student.name}
                    </Text>
                    {atRisk && (
                        <MaterialIcons name="warning" size={15} color="#b31b25" />
                    )}
                </View>
                <Text style={styles.studentId}>ID: {student.studentId}</Text>

                <View style={styles.attendanceRow}>
                    <View style={styles.barTrack}>
                        <View
                            style={[
                                styles.barFill,
                                {
                                    width: `${student.attendance}%`,
                                    backgroundColor: atRisk ? '#b31b25' : '#16a34a',
                                },
                            ]}
                        />
                    </View>
                    <Text style={[styles.attendanceText, { color: atRisk ? '#b31b25' : '#16a34a' }]}>
                        {student.attendance}%
                    </Text>
                </View>
            </View>

            <View style={styles.rightCol}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <MaterialIcons name={status.icon} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        fontWeight: '700',
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
        flexShrink: 1,
    },
    studentId: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
        marginTop: 2,
        marginBottom: 8,
    },
    attendanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    barTrack: {
        flex: 1,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#eef1f3',
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    attendanceText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        width: 36,
        textAlign: 'right',
    },
    rightCol: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        paddingLeft: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});