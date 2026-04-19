import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ClassDashboard() {
    const route = useRoute();
    const navigation = useNavigation();
    const classData = route.params?.classData || {
        id: 'SEC-042',
        code: 'SEC-042',
        title: 'Advanced Cognitive Psychology',
        color: '#0050d4',
    };

    const stats = [
        { label: 'Attendance', value: '94%', change: '+2%', changeColor: '#22c55e', progress: 0.94, progressColor: '#0050d4' },
        { label: 'Avg Grade', value: '82.5', change: '/ 100', changeColor: '#94a3b8', progress: 0.825, progressColor: '#702ae1' },
        { label: 'Pending Grading', value: '14', change: '4 assignments due soon', changeColor: '#595c5e' },
        { label: 'Active Quizzes', value: '03', change: 'Ends in 2 days', changeColor: '#595c5e' },
    ];

    const quickActions = [
        { label: 'Notes', icon: 'description', color: '#0050d4', bgColor: 'rgba(123, 156, 255, 0.2)' },
        { label: 'Quizzes', icon: 'quiz', color: '#702ae1', bgColor: 'rgba(220, 201, 255, 0.2)' },
        { label: 'Syllabus', icon: 'calendar-today', color: '#a23800', bgColor: 'rgba(255, 149, 106, 0.2)' },
        { label: 'Roster', icon: 'group', color: '#595c5e', bgColor: 'rgba(89, 92, 94, 0.1)' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Top AppBar */}
                <View style={styles.appBar}>
                    <View style={styles.appBarLeft}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
                        </TouchableOpacity>
                        <Text style={styles.appBarTitle} numberOfLines={1}>{classData.title}</Text>
                    </View>
                    <View style={styles.appBarRight}>
                        <View style={styles.profileImage}>
                            <MaterialIcons name="person" size={24} color="#595c5e" />
                        </View>
                    </View>
                </View>

                {/* Hero Card */}
                <View style={[styles.heroCard, { backgroundColor: classData.color }]}>
                    <View style={styles.heroGradient} />
                    <View style={styles.heroContent}>
                        <View style={styles.heroText}>
                            <View style={styles.heroBadge}>
                                <Text style={styles.heroBadgeText}>UPCOMING SESSION</Text>
                            </View>
                            <Text style={styles.heroTitle}>Next Lecture: Tomorrow, 10:00 AM</Text>
                            <Text style={styles.heroSubtitle}>Topic: Neural Plasticity and Memory Consolidation in Adult Learners.</Text>
                        </View>
                        <TouchableOpacity style={styles.startButton} activeOpacity={0.85}>
                            <MaterialIcons name="play-circle" size={24} color="#0050d4" />
                            <Text style={styles.startButtonText}>Start Session</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                            <View style={styles.statValueRow}>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={[styles.statChange, { color: stat.changeColor }]}>{stat.change}</Text>
                            </View>
                            {stat.progress !== undefined && (
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${stat.progress * 100}%`, backgroundColor: stat.progressColor }]} />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Quick Actions & Class Pulse */}
                <View style={styles.contentGrid}>
                    <View style={styles.quickActionsSection}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.actionsGrid}>
                            {quickActions.map((action, index) => (
                                <TouchableOpacity key={index} style={styles.actionButton} activeOpacity={0.7}>
                                    <View style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
                                        <MaterialIcons name={action.icon} size={28} color={action.color} />
                                    </View>
                                    <Text style={styles.actionLabel}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.pulseSection}>
                        <View style={styles.pulseHeader}>
                            <Text style={styles.sectionTitle}>Class Pulse</Text>
                            <View style={styles.pulseLegend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#0050d4' }]} />
                                    <Text style={styles.legendText}>Engagement</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.pulseChart}>
                            <View style={styles.chartPlaceholder}>
                                <MaterialIcons name="show-chart" size={48} color="#0050d4" opacity={0.3} />
                            </View>
                            <View style={styles.chartLabels}>
                                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, index) => (
                                    <Text key={index} style={styles.dayLabel}>{day}</Text>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* AI Teaching Insights */}
                <View style={styles.aiCard}>
                    <View style={styles.aiIcon}>
                        <MaterialIcons name="auto-awesome" size={24} color="#ffffff" />
                    </View>
                    <View style={styles.aiContent}>
                        <Text style={styles.aiTitle}>AI Teaching Insights</Text>
                        <Text style={styles.aiText}>
                            Recent data suggests a performance gap in <Text style={styles.aiBold}>"Pre-frontal Cortex Functions"</Text>. 62% of students missed the correlation question in last night's quiz. Recommend a 10-minute recap during tomorrow's lecture.
                        </Text>
                        <View style={styles.aiActions}>
                            <TouchableOpacity activeOpacity={0.7}>
                                <Text style={styles.aiActionPrimary}>Add to tomorrow's slides</Text>
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.7}>
                                <Text style={styles.aiActionSecondary}>Dismiss</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollContent: {
        paddingBottom: 32,
    },
    appBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#f5f7f9',
    },
    appBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#eef1f3',
    },
    appBarTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    appBarRight: {
        marginLeft: 12,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e9eb',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    heroCard: {
        marginHorizontal: 24,
        marginVertical: 16,
        borderRadius: 12,
        padding: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    heroGradient: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 256,
        height: 256,
        borderRadius: 128,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
    },
    heroText: {
        flex: 1,
    },
    heroBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        marginBottom: 8,
    },
    heroBadgeText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 10,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 2,
    },
    heroTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontFamily: 'Manrope',
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    startButton: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    startButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#0050d4',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        minWidth: (width - 80) / 2,
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    statLabel: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 13,
        fontWeight: '600',
        color: '#595c5e',
        marginBottom: 4,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 8,
    },
    statValue: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#2c2f31',
    },
    statChange: {
        fontFamily: 'Manrope-Bold',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#e5e9eb',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    contentGrid: {
        paddingHorizontal: 24,
        gap: 32,
        marginBottom: 32,
    },
    sectionTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#2c2f31',
        marginBottom: 16,
    },
    quickActionsSection: {
        marginBottom: 8,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        minWidth: (width - 80) / 2,
        backgroundColor: '#eef1f3',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
    },
    pulseSection: {
        backgroundColor: '#ffffff',
        padding: 32,
        borderRadius: 12,
        minHeight: 256,
    },
    pulseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    pulseLegend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#0050d4',
    },
    pulseChart: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    chartPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    dayLabel: {
        fontFamily: 'Manrope-Bold',
        fontSize: 9,
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 2,
    },
    aiCard: {
        marginHorizontal: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        padding: 24,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 20,
        borderWidth: 1,
        borderColor: '#ffffff',
        shadowColor: '#2c2f31',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
    },
    aiIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#702ae1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiContent: {
        flex: 1,
    },
    aiTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: '#702ae1',
        marginBottom: 4,
    },
    aiText: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#2c2f31',
        lineHeight: 22,
    },
    aiBold: {
        fontWeight: '700',
    },
    aiActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    aiActionPrimary: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#702ae1',
    },
    aiActionSecondary: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#595c5e',
    },
});
