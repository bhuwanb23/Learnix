import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function StudentReportList({ students, monthTotal, onPressStudent }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>By Student</Text>
            {students.map((student) => (
                <TouchableOpacity
                    key={student.studentId}
                    style={styles.row}
                    onPress={() => onPressStudent(student)}
                    activeOpacity={0.85}
                >
                    <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                        <Text style={[styles.avatarText, { color: student.avatarText }]}>
                            {student.id}
                        </Text>
                    </View>

                    <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>
                            {student.name}
                        </Text>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: `${student.attendance}%`,
                                        backgroundColor:
                                            student.attendance < 75 ? '#b31b25' : '#16a34a',
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.right}>
                        <Text style={styles.monthPresent}>
                            {student.monthPresent}/{monthTotal}
                        </Text>
                        <Text
                            style={[
                                styles.percent,
                                { color: student.attendance < 75 ? '#b31b25' : '#16a34a' },
                            ]}
                        >
                            {student.attendance}%
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}
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
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f4',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
    },
    info: {
        flex: 1,
    },
    name: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 6,
    },
    barTrack: {
        height: 5,
        borderRadius: 3,
        backgroundColor: '#eef1f3',
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    right: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    monthPresent: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#595c5e',
        marginBottom: 2,
    },
    percent: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
    },
});