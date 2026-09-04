import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ExamCard({ exam, onPress }) {
    const [month, day] = exam.date.split(' ');

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={[styles.dateBlock, { backgroundColor: `${exam.color}1a` }]}>
                <Text style={[styles.dateDay, { color: exam.color }]}>{day}</Text>
                <Text style={[styles.dateMonth, { color: exam.color }]}>{month}</Text>
            </View>

            <View style={styles.info}>
                <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                        {exam.title}
                    </Text>
                    {exam.status === 'past' && exam.results === 'published' && (
                        <View style={styles.publishedBadge}>
                            <MaterialIcons name="check-circle" size={11} color="#16a34a" />
                            <Text style={styles.publishedText}>Published</Text>
                        </View>
                    )}
                    {exam.status === 'past' && exam.results === 'draft' && (
                        <View style={styles.draftBadge}>
                            <MaterialIcons name="edit" size={11} color="#d97706" />
                            <Text style={styles.draftText}>Results draft</Text>
                        </View>
                    )}
                </View>
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
                    <View style={styles.metaItem}>
                        <MaterialIcons name="timer" size={12} color="#8a8f94" />
                        <Text style={styles.metaText}>{exam.duration}</Text>
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
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
        flexShrink: 1,
    },
    publishedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#dcfce7',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    publishedText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 8,
        fontWeight: '700',
        color: '#16a34a',
        textTransform: 'uppercase',
    },
    draftBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#fef3c7',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    draftText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 8,
        fontWeight: '700',
        color: '#d97706',
        textTransform: 'uppercase',
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
        gap: 12,
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