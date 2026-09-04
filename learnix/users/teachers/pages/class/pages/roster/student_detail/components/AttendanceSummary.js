import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LECTURE_LEGEND } from '../constants/studentDetailData';

const STATUS_COLORS = {
  P: '#16a34a',
  A: '#b31b25',
  L: '#d97706',
  E: '#0050d4',
};

const STATUS_BG = {
  P: '#dcfce7',
  A: '#fde3e5',
  L: '#fef3c7',
  E: '#dbeafe',
};

export default function AttendanceSummary({ attendance, lastLectures }) {
    const presentCount = lastLectures.filter((day) => day === 'P').length;

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Attendance</Text>

            <View style={styles.headRow}>
                <View>
                    <Text style={styles.percent}>{attendance}%</Text>
                    <Text style={styles.subLabel}>overall this term</Text>
                </View>
                <View style={styles.track}>
                    <View
                        style={[
                            styles.fill,
                            {
                                width: `${attendance}%`,
                                backgroundColor: attendance < 75 ? '#b31b25' : '#16a34a',
                            },
                        ]}
                    />
                </View>
            </View>

            <Text style={styles.sectionLabel}>Last 10 lectures</Text>
            <View style={styles.chipsRow}>
                {lastLectures.map((day, index) => (
                    <View
                        key={index}
                        style={[styles.chip, { backgroundColor: STATUS_BG[day] || '#eef1f3' }]}
                    >
                        <Text style={[styles.chipText, { color: STATUS_COLORS[day] || '#595c5e' }]}>
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.legendRow}>
                {LECTURE_LEGEND.map((item) => (
                    <View key={item.key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.presentNote}>
                Present in {presentCount} of the last {lastLectures.length} lectures
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 16,
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
    headRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    percent: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 26,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
    track: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#eef1f3',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
    sectionLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 12,
        color: '#595c5e',
        marginBottom: 10,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
    },
    chip: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
    },
    legendRow: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
    },
    presentNote: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        color: '#8a8f94',
    },
});