import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { REPORT_MONTH, LECTURE_DAYS, WEEKDAY_LABELS } from '../constants/reportData';

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

const LEGEND = [
  { key: 'P', label: 'Present' },
  { key: 'A', label: 'Absent' },
  { key: 'L', label: 'Late' },
  { key: 'E', label: 'Excused' },
];

export default function CalendarHeatmap() {
    const firstWeekday = new Date(REPORT_MONTH.year, REPORT_MONTH.month, 1).getDay();
    const daysInMonth = new Date(REPORT_MONTH.year, REPORT_MONTH.month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) {
        cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(day);
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
        rows.push(cells.slice(i, i + 7));
    }

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Lecture Calendar</Text>
                <Text style={styles.month}>{REPORT_MONTH.label}</Text>
            </View>

            <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((label, index) => (
                    <Text key={index} style={styles.weekday}>
                        {label}
                    </Text>
                ))}
            </View>

            {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.weekRow}>
                    {row.map((day, colIndex) => {
                        if (day === null) {
                            return <View key={colIndex} style={styles.dayCell} />;
                        }
                        const status = LECTURE_DAYS[day];
                        const hasLecture = Boolean(status);
                        return (
                            <View
                                key={colIndex}
                                style={[
                                    styles.dayCell,
                                    hasLecture && { backgroundColor: STATUS_BG[status] },
                                ]}
                            >
                                {hasLecture ? (
                                    <View
                                        style={[
                                            styles.statusDot,
                                            { backgroundColor: STATUS_COLORS[status] },
                                        ]}
                                    />
                                ) : null}
                                <Text
                                    style={[
                                        styles.dayText,
                                        hasLecture && { color: STATUS_COLORS[status], fontWeight: '700' },
                                    ]}
                                >
                                    {day}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            ))}

            <View style={styles.legendRow}>
                {LEGEND.map((item) => (
                    <View key={item.key} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[item.key] }]} />
                        <Text style={styles.legendText}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 18,
        marginHorizontal: 20,
        marginBottom: 20,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    month: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    weekday: {
        flex: 1,
        textAlign: 'center',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#8a8f94',
        paddingVertical: 4,
    },
    dayCell: {
        flex: 1,
        aspectRatio: 1.25,
        margin: 2,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f7f9',
    },
    statusDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dayText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
    },
    legendRow: {
        flexDirection: 'row',
        gap: 14,
        marginTop: 12,
        justifyContent: 'center',
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
});