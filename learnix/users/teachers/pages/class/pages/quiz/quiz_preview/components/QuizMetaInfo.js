import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuizMetaInfo({ subject, title, description, timeRemaining }) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.subject}>{subject}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            <View style={styles.timerContainer}>
                <View style={styles.timerIcon}>
                    <MaterialIcons name="timer" size={24} color="#0050d4" />
                </View>
                <View style={styles.timerInfo}>
                    <Text style={styles.timerLabel}>Time Remaining</Text>
                    <Text style={styles.timerValue}>{timeRemaining}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        gap: 24,
        marginBottom: 32,
    },
    content: {
        gap: 8,
    },
    subject: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
        letterSpacing: 1,
    },
    title: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2f31',
    },
    description: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#595c5e',
        lineHeight: 20,
    },
    timerContainer: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
    },
    timerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 4,
        borderColor: 'rgba(0, 80, 212, 0.2)',
        borderTopColor: '#0050d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerInfo: {
        flex: 1,
    },
    timerLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#595c5e',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    timerValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '800',
        color: '#2c2f31',
    },
});
