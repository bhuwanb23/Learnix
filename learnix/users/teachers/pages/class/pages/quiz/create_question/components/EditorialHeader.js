import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EditorialHeader({ quizTitle, quizDescription, topicName }) {
    return (
        <View style={styles.container}>
            <View style={styles.badgeRow}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Editor Mode</Text>
                </View>
                <View style={styles.divider} />
            </View>
            <Text style={styles.title}>{quizTitle}</Text>
            <Text style={styles.description}>
                {quizDescription || `Design a balanced evaluation for the ${topicName} cohort. Use the cards below to curate specific inquiry patterns and difficulty scaling.`}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    badge: {
        backgroundColor: 'rgba(0, 80, 212, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    badgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#0050d4',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#dfe3e6',
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
        marginBottom: 12,
        lineHeight: 36,
        letterSpacing: -0.5,
    },
    description: {
        fontFamily: 'Manrope',
        fontSize: 15,
        color: '#747779',
        lineHeight: 22,
    },
});
