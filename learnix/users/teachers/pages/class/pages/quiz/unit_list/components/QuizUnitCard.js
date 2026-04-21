import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuizUnitCard({ unit, onManage }) {
    const circumference = 2 * Math.PI * 28;
    const strokeDashoffset = circumference - (unit.progress / 100) * circumference;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: unit.iconBg }]}>
                    <MaterialIcons name={unit.icon} size={28} color={unit.iconColor} />
                </View>
                <View style={styles.progressContainer}>
                    <View style={styles.progressCircle}>
                        <Text style={styles.progressText}>{unit.progress}%</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.unitTitle} numberOfLines={2}>{unit.title}</Text>

            <View style={styles.unitMeta}>
                <View style={styles.metaItem}>
                    <MaterialIcons name="auto-stories" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{unit.topicsCount} Topics</Text>
                </View>
                <View style={styles.metaItem}>
                    <MaterialIcons name="quiz" size={16} color="#595c5e" />
                    <Text style={styles.metaText}>{unit.quizzesCount} Quizzes</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.manageButton} onPress={onManage} activeOpacity={0.85}>
                <Text style={styles.manageButtonText}>Manage Unit</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e9eb',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#dfe3e6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    unitTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 16,
    },
    unitMeta: {
        flexDirection: 'column',
        gap: 8,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        fontWeight: '500',
        color: '#595c5e',
    },
    manageButton: {
        backgroundColor: '#dfe3e6',
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    manageButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
});
