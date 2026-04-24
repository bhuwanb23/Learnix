import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuizList({ quizzes, onEdit, onDelete, onManage }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Recent Quizzes</Text>
                <TouchableOpacity style={styles.viewAllButton} activeOpacity={0.7}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#0050d4" />
                </TouchableOpacity>
            </View>
            <View style={styles.listContainer}>
                {quizzes.map((quiz) => (
                    <View key={quiz.id} style={styles.quizItem}>
                        <View style={styles.quizInfo}>
                            <Text style={styles.quizName}>{quiz.name}</Text>
                            <Text style={styles.quizModified}>{quiz.modified}</Text>
                        </View>
                        <View style={styles.quizStatus}>
                            <View style={[styles.statusBadge, { backgroundColor: quiz.statusBg }]}>
                                <Text style={[styles.statusText, { color: quiz.statusTextColor }]}>{quiz.status}</Text>
                            </View>
                        </View>
                        <View style={styles.quizSubmissions}>
                            <Text style={styles.submissionsText}>{quiz.submissions}</Text>
                        </View>
                        <View style={styles.quizScore}>
                            {quiz.avgScore !== null ? (
                                <View style={styles.scoreContainer}>
                                    <View style={styles.scoreBar}>
                                        <View style={[styles.scoreFill, { 
                                            width: `${quiz.avgScore}%`,
                                            backgroundColor: quiz.avgScoreColor
                                        }]} />
                                    </View>
                                    <Text style={styles.scoreText}>{quiz.avgScore}%</Text>
                                </View>
                            ) : (
                                <Text style={styles.noScoreText}>-</Text>
                            )}
                        </View>
                        <View style={styles.quizActions}>
                            <TouchableOpacity style={styles.actionButton} onPress={() => onEdit?.(quiz)} activeOpacity={0.7}>
                                <MaterialIcons name="edit" size={18} color="#595c5e" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton} onPress={() => onDelete?.(quiz)} activeOpacity={0.7}>
                                <MaterialIcons name="delete" size={18} color="#b31b25" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.manageButton} onPress={() => onManage?.(quiz)} activeOpacity={0.7}>
                                <Text style={styles.manageButtonText}>Manage</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#0050d4',
    },
    listContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    quizItem: {
        flexDirection: 'column',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e9eb',
        gap: 8,
    },
    quizInfo: {
        marginBottom: 4,
    },
    quizName: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    quizModified: {
        fontFamily: 'Manrope',
        fontSize: 11,
        color: '#595c5e',
        marginTop: 2,
    },
    quizStatus: {
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    quizSubmissions: {
        marginBottom: 4,
    },
    submissionsText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#2c2f31',
    },
    quizScore: {
        marginBottom: 12,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#dfe3e6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    scoreFill: {
        height: '100%',
        borderRadius: 4,
    },
    scoreText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        minWidth: 36,
    },
    noScoreText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#595c5e',
    },
    quizActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 4,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
    },
    manageButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: 'rgba(0, 80, 212, 0.05)',
    },
    manageButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: '#0050d4',
    },
});
