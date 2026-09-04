import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ExamMetaCard({ exam, detail }) {
    const metaRows = [
        { icon: 'calendar-today', label: 'Date', value: exam.date },
        { icon: 'schedule', label: 'Time', value: exam.time },
        { icon: 'meeting-room', label: 'Room', value: exam.room },
        { icon: 'timer', label: 'Duration', value: exam.duration },
        { icon: 'star', label: 'Max Marks', value: detail.maxMarks },
        { icon: 'group', label: 'Class', value: exam.classCode },
    ];

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Exam Details</Text>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: exam.status === 'upcoming' ? '#dbeafe' : '#dcfce7' },
                    ]}
                >
                    <Text
                        style={[
                            styles.statusText,
                            { color: exam.status === 'upcoming' ? '#0050d4' : '#16a34a' },
                        ]}
                    >
                        {exam.status === 'upcoming' ? 'Scheduled' : 'Completed'}
                    </Text>
                </View>
            </View>

            <Text style={styles.description}>{detail.description}</Text>

            <View style={styles.metaGrid}>
                {metaRows.map((row) => (
                    <View key={row.label} style={styles.metaItem}>
                        <MaterialIcons name={row.icon} size={15} color="#0050d4" />
                        <View style={styles.metaTextWrap}>
                            <Text style={styles.metaLabel}>{row.label}</Text>
                            <Text style={styles.metaValue}>{row.value}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.scaleBox}>
                <Text style={styles.scaleLabel}>Grading Scale</Text>
                <Text style={styles.scaleText}>{detail.gradingScale}</Text>
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
        marginBottom: 16,
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
        marginBottom: 10,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#2c2f31',
    },
    statusBadge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    description: {
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        lineHeight: 18,
        color: '#595c5e',
        marginBottom: 14,
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '48%',
        backgroundColor: '#f5f7f9',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    metaTextWrap: {
        flex: 1,
    },
    metaLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 9,
        color: '#8a8f94',
    },
    metaValue: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c2f31',
        marginTop: 1,
    },
    scaleBox: {
        backgroundColor: '#e8efff',
        borderRadius: 10,
        padding: 12,
    },
    scaleLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#0050d4',
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    scaleText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 11,
        color: '#2c2f31',
    },
});