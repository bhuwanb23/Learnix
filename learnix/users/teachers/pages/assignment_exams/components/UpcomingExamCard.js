import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function UpcomingExamCard({ exam, onPress }) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={[styles.dateBlock, { backgroundColor: `${exam.color}1a` }]}>
                <Text style={[styles.dateDay, { color: exam.color }]}>{exam.date.split(' ')[1]}</Text>
                <Text style={[styles.dateMonth, { color: exam.color }]}>{exam.date.split(' ')[0]}</Text>
            </View>

            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>
                    {exam.title}
                </Text>
                <Text style={styles.subject}>
                    {exam.subject} · {exam.classCode}
                </Text>
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <MaterialIcons name="schedule" size={12} color="#8a8f94" />
                        <Text style={styles.metaText}>{exam.time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <MaterialIcons name="meeting-room" size={12} color="#8a8f94" />
                        <Text style={styles.metaText}>{exam.room}</Text>
                    </View>
                </View>
            </View>

            <MaterialIcons name="chevron-right" size={20} color="#c3c7cc" />
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
    dateBlock: {
        width: 52,
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    dateDay: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 18,
    },
    dateMonth: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    info: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    subject: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 11,
        color: '#8a8f94',
        marginTop: 2,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 14,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 10,
        color: '#595c5e',
    },
});