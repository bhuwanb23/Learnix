import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TopicCard({ topic, onOpen }) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: topic.iconBg }]}>
                    <MaterialIcons name={topic.icon} size={28} color={topic.iconColor} />
                </View>
                <Text style={styles.lastUpdated}>{topic.lastUpdated}</Text>
            </View>

            <Text style={styles.topicTitle} numberOfLines={2}>{topic.title}</Text>
            <Text style={styles.topicDescription} numberOfLines={2}>{topic.description}</Text>

            <View style={styles.cardFooter}>
                <View style={styles.quizBadge}>
                    <Text style={styles.quizBadgeText}>{topic.quizzesCount} Quizzes</Text>
                </View>
                <TouchableOpacity style={styles.openButton} onPress={onOpen} activeOpacity={0.7}>
                    <Text style={styles.openButtonText}>Open Quiz Dashboard</Text>
                    <MaterialIcons name="arrow-forward" size={18} color="#0050d4" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lastUpdated: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#595c5e',
    },
    topicTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 22,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 8,
        lineHeight: 28,
    },
    topicDescription: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#595c5e',
        marginBottom: 24,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quizBadge: {
        backgroundColor: '#eef1f3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    quizBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#595c5e',
    },
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    openButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#0050d4',
    },
});
