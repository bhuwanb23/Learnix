import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ProfileHeader({ student }) {
    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <View style={[styles.avatar, { backgroundColor: student.avatarBg }]}>
                    <Text style={[styles.avatarText, { color: student.avatarText }]}>{student.id}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{student.name}</Text>
                    <Text style={styles.studentId}>ID: {student.studentId}</Text>
                    <Text style={styles.rank}>Rank #{student.rank} in class</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: student.statusBg }]}>
                    <Text style={[styles.statusText, { color: student.statusColor }]}>{student.status}</Text>
                </View>
            </View>

            <View style={styles.gradeCard}>
                <View>
                    <Text style={styles.gradeLabel}>Overall Grade</Text>
                    <View style={styles.gradeRow}>
                        <Text style={styles.gradeValue}>{student.grade}%</Text>
                        <View style={styles.trend}>
                            {student.trend.map((value, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.trendBar,
                                        {
                                            height: `${value}%`,
                                            backgroundColor: student.trendColor,
                                            opacity: 0.4 + (value / 100) * 0.6,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                </View>
                <View style={styles.driver}>
                    <Text style={styles.driverLabel}>Key Driver</Text>
                    <Text style={[styles.driverValue, { color: student.driverColor }]}>
                        {student.keyDriver}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 18,
        fontWeight: '700',
    },
    info: {
        flex: 1,
    },
    name: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 17,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 2,
    },
    studentId: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
        marginBottom: 2,
    },
    rank: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#595c5e',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontFamily: 'Manrope-ExtraBold',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    gradeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderWidth: 1,
        borderColor: '#e5e8ec',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    gradeLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    gradeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    gradeValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 26,
        fontWeight: '700',
        color: '#2c2f31',
    },
    trend: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 28,
    },
    trendBar: {
        width: 6,
        borderRadius: 3,
    },
    driver: {
        flex: 1,
        marginLeft: 14,
    },
    driverLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#8a8f94',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    driverValue: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'right',
    },
});