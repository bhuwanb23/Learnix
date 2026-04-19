import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_TRACKER_COLORS, TOPIC_TRACKER_DATA, NOTES_DATA, QUIZ_DATA, STUDY_HISTORY_DATA } from './constants/topicTrackerData';
import NotesCard from './components/NotesCard';
import QuizCard from './components/QuizCard';
import StudyHistoryCard from './components/StudyHistoryCard';

export default function TopicTrackerPage({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const headerTopPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleOpenNotes = () => {
        console.log('Opening notes');
    };

    const handleRetryQuiz = () => {
        console.log('Retrying quiz');
    };

    const handleViewLogs = () => {
        console.log('Viewing logs');
    };

    return (
        <View style={styles.container}>
            {/* <StatusBar style="dark" backgroundColor={TOPIC_TRACKER_COLORS.surface} /> */}
            <StatusBar style="light" backgroundColor="#0050d4" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: headerTopPad }]}>
                <View style={styles.leftSection}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color={TOPIC_TRACKER_COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Academic Curator</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroHeader}>
                        <View style={styles.heroTextSection}>
                            <Text style={styles.subjectLabel}>{TOPIC_TRACKER_DATA.subjectName}</Text>
                            <Text style={styles.heroTitle}>{TOPIC_TRACKER_DATA.topicTitle}</Text>
                        </View>
                        <View style={styles.progressSection}>
                            <Text style={styles.progressLabel}>Overall Progress</Text>
                            <View style={styles.progressRow}>
                                <Text style={styles.progressNumber}>{TOPIC_TRACKER_DATA.progressPercentage}%</Text>
                                <View style={styles.progressBarBg}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            { width: `${TOPIC_TRACKER_DATA.progressPercentage}%` }
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bento Grid Layout */}
                <View style={styles.bentoGrid}>
                    {/* Lecture Notes Card */}
                    <NotesCard 
                        data={NOTES_DATA}
                        onPress={handleOpenNotes}
                    />

                    {/* Quiz Insights Card */}
                    <QuizCard 
                        data={QUIZ_DATA}
                        onPress={handleRetryQuiz}
                    />

                    {/* Study History Card */}
                    <StudyHistoryCard 
                        data={STUDY_HISTORY_DATA}
                        onPress={handleViewLogs}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: TOPIC_TRACKER_COLORS.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        minHeight: 48,
        backgroundColor: TOPIC_TRACKER_COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: `${TOPIC_TRACKER_COLORS.outlineVariant}26`,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onSurface,
        letterSpacing: -0.3,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 32,
    },
    heroSection: {
        marginBottom: 28,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 16,
    },
    heroTextSection: {
        flex: 1,
    },
    subjectLabel: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Manrope-Bold',
        color: TOPIC_TRACKER_COLORS.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onSurface,
        letterSpacing: -1,
        lineHeight: 42,
    },
    progressSection: {
        alignItems: 'flex-end',
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '500',
        fontFamily: 'Manrope-Medium',
        color: TOPIC_TRACKER_COLORS.onSurfaceVariant,
        marginBottom: 8,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressNumber: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.primary,
        letterSpacing: -0.5,
    },
    progressBarBg: {
        width: 100,
        height: 8,
        backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerHigh,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: TOPIC_TRACKER_COLORS.primary,
        borderRadius: 999,
    },
    bentoGrid: {
        gap: 14,
    },
    notesCard: {
        backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerLowest,
        borderRadius: 12,
        padding: 20,
    },
    notesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    notesTextSection: {
        flex: 1,
    },
    notesTitle: {
        fontSize: 17,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onSurface,
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    notesDescription: {
        fontSize: 12,
        fontWeight: '500',
        fontFamily: 'Manrope-Medium',
        color: TOPIC_TRACKER_COLORS.onSurfaceVariant,
        lineHeight: 17,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TOPIC_TRACKER_COLORS.secondaryContainer,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        gap: 4,
    },
    statusIcon: {
        fontWeight: '700',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Manrope-Bold',
        color: TOPIC_TRACKER_COLORS.onSecondaryFixedVariant,
        letterSpacing: 0.5,
    },
    notesImageContainer: {
        width: '100%',
        aspectRatio: 21 / 9,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    notesImage: {
        width: '100%',
        height: '100%',
    },
    notesImageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: `${TOPIC_TRACKER_COLORS.primary}1A`,
    },
    notesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: TOPIC_TRACKER_COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 8,
    },
    notesButtonText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onPrimary,
    },
    quizCard: {
        backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerLow,
        borderRadius: 12,
        padding: 20,
        justifyContent: 'space-between',
    },
    quizHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    quizIconContainer: {
        padding: 10,
        backgroundColor: `${TOPIC_TRACKER_COLORS.primary}1A`,
        borderRadius: 8,
    },
    quizTitle: {
        fontSize: 17,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onSurface,
        letterSpacing: -0.3,
    },
    quizStats: {
        gap: 18,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
        fontFamily: 'Manrope-Medium',
        color: TOPIC_TRACKER_COLORS.onSurfaceVariant,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.primary,
        letterSpacing: -0.5,
    },
    statValueSecondary: {
        fontSize: 17,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onSurface,
    },
    accuracyText: {
        color: TOPIC_TRACKER_COLORS.secondary,
    },
    quizButton: {
        backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerHigh,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginTop: 24,
        alignItems: 'center',
    },
    quizButtonText: {
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onSurface,
    },
    historyCard: {
        backgroundColor: TOPIC_TRACKER_COLORS.primary,
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    historyIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyLabel: {
        fontSize: 11,
        fontWeight: '500',
        fontFamily: 'Manrope-Medium',
        color: `${TOPIC_TRACKER_COLORS.onPrimary}B3`,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 17,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onPrimary,
        letterSpacing: -0.3,
    },
    historyStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    historyStat: {
        alignItems: 'center',
    },
    historyStatLabel: {
        fontSize: 11,
        fontWeight: '500',
        fontFamily: 'Manrope-Medium',
        color: `${TOPIC_TRACKER_COLORS.onPrimary}B3`,
        marginBottom: 4,
    },
    historyStatValue: {
        fontSize: 20,
        fontWeight: '800',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onPrimary,
        letterSpacing: -0.3,
    },
    historyDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    historyButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    historyButtonText: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'PlusJakartaSans-Bold',
        color: TOPIC_TRACKER_COLORS.onPrimary,
    },
});
