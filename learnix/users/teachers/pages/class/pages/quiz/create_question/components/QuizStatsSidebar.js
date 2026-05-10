import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function QuizStatsSidebar({ totalQuestions, duration, totalPoints, progress = 0.67 }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quiz Stats</Text>
            
            <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total Questions</Text>
                    <Text style={styles.statValue}>{totalQuestions}</Text>
                </View>
                
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Est. Duration</Text>
                    <Text style={styles.statValue}>{duration} min</Text>
                </View>
                
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total Points</Text>
                    <Text style={[styles.statValue, { color: '#0050d4' }]}>{totalPoints}</Text>
                </View>
            </View>
            
            <View style={styles.progressContainer}>
                <LinearGradient
                    colors={['#0050d4', '#7b9cff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBar, { width: `${progress * 100}%` }]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#eef1f3',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 12,
        fontWeight: '800',
        color: '#2c2f31',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
    },
    statsContainer: {
        gap: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#747779',
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 16,
        fontWeight: '800',
        color: '#2c2f31',
    },
    progressContainer: {
        height: 8,
        backgroundColor: '#d9dde0',
        borderRadius: 4,
        marginTop: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
});
