import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import TopicHeader from './components/TopicHeader';
import UnitMetaCard from './components/UnitMetaCard';
import EditorialVisual from './components/EditorialVisual';
import TopicControls from './components/TopicControls';
import TopicCard from './components/TopicCard';
import TopicSummaryBar from './components/TopicSummaryBar';
import EditTopic from '../edit_topic/edit_topic';
import { HEADER, UNIT_META, VISUAL, FILTERS, TOPICS, SUMMARY } from './constants/topicData';

export default function TopicList({ route, navigation }) {
    const unitData = route?.params?.unitData || null;

    const [currentScreen, setCurrentScreen] = useState('topics');
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [reorderMode, setReorderMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTimer = useRef(null);

    const meta = {
        ...UNIT_META,
        title: unitData?.title ? `${unitData.number || 'Unit 02'}: ${unitData.title}` : UNIT_META.title,
        percent: unitData?.percent ?? UNIT_META.percent,
        statusLabel: unitData?.percent != null ? `${unitData.percent}% Complete` : UNIT_META.statusLabel,
        code: unitData?.code || UNIT_META.code,
    };

    const showToast = (message) => {
        setToast(message);
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
            Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                setToast(null);
            });
        }, 2400);
    };

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        };
    }, []);

    const handleBack = () => {
        if (currentScreen === 'EditTopic') {
            setCurrentScreen('topics');
            setSelectedTopic(null);
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handlePublish = () => {
        Alert.alert(
            'Publish Unit?',
            'This will sync the unit (topics, hours and quizzes) to the student syllabus.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Publish',
                    onPress: () => showToast('Unit published to student syllabus.'),
                },
            ]
        );
    };

    const handleFilter = (filterId) => {
        setActiveFilter(filterId);
    };

    const handleReorderToggle = () => {
        const next = !reorderMode;
        setReorderMode(next);
        showToast(next ? 'Reorder mode active. Drag topics to reposition.' : 'Reorder mode off.');
    };

    const handleAddTopic = () => {
        // Open the topic editor in create mode
        setSelectedTopic(null);
        setCurrentScreen('EditTopic');
    };

    const handleTopicAction = (actionId, topic) => {
        if (actionId === 'edit' || actionId === 'edit-details') {
            setSelectedTopic(topic);
            setCurrentScreen('EditTopic');
        } else if (actionId === 'log-delivery') {
            Alert.alert('Delivery Logged', `${topic.title} was logged as delivered for this week.`);
        } else if (actionId === 'schedule-class') {
            Alert.alert('Class Scheduled', `${topic.title} was added to next week's class schedule.`);
        } else if (actionId === 'publish') {
            Alert.alert('Topic Published', `${topic.title} was published to the student syllabus.`);
        } else if (actionId === 'delete') {
            Alert.alert(
                'Delete Topic?',
                `"${topic.title}" will be removed from the unit.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => showToast('Topic deleted.') },
                ]
            );
        } else if (actionId === 'notes') {
            showToast('Notes module for this topic will open here.');
        } else if (actionId === 'options') {
            Alert.alert(topic.title, 'Choose an action: duplicate, archive or move this topic. Full options arrive with the backend.');
        }
    };

    const handleSaveSync = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            showToast('Unit syllabus synced with classroom!');
        }, 650);
    };

    const visibleTopics = TOPICS.filter((topic) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'done') return topic.status === 'done';
        return topic.status !== 'done';
    });

    if (currentScreen === 'EditTopic') {
        return (
            <EditTopic
                route={{ params: { unitData, topicData: selectedTopic } }}
                navigation={{ goBack: handleBack }}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TopicHeader header={HEADER} onBack={handleBack} onPublish={handlePublish} />
                <UnitMetaCard unit={meta} />
                <EditorialVisual visual={VISUAL} />
                <TopicControls
                    filters={FILTERS}
                    activeFilter={activeFilter}
                    reorderMode={reorderMode}
                    onFilter={handleFilter}
                    onReorderToggle={handleReorderToggle}
                    onAddTopic={handleAddTopic}
                />

                {reorderMode && (
                    <View style={styles.reorderNotice}>
                        <MaterialIcons name="touch-app" size={18} color="#0050d4" />
                        <Text style={styles.reorderNoticeText}>
                            Drag cards by the handle to alter sequence. Changes are staged until synchronized.
                        </Text>
                    </View>
                )}

                <View style={styles.cardsList}>
                    {visibleTopics.map((topic) => (
                        <TopicCard
                            key={topic.id}
                            topic={topic}
                            reorderMode={reorderMode}
                            onAction={handleTopicAction}
                        />
                    ))}
                </View>
            </ScrollView>

            <View style={styles.summaryWrapper}>
                <TopicSummaryBar
                    summary={SUMMARY}
                    saving={saving}
                    onAddTopic={handleAddTopic}
                    onSaveSync={handleSaveSync}
                />
            </View>

            {toast && (
                <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
                    <View style={styles.toastInner}>
                        <MaterialIcons name="check-circle" size={16} color="#658eff" />
                        <Text style={styles.toastText}>{toast}</Text>
                    </View>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    reorderNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0, 80, 212, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
    },
    reorderNoticeText: {
        flex: 1,
        fontFamily: 'Manrope-Medium',
        fontSize: 12,
        fontWeight: '500',
        color: '#0050d4',
    },
    cardsList: {
        marginTop: 2,
    },
    summaryWrapper: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    toast: {
        position: 'absolute',
        bottom: 76,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    toastInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0b0f10',
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    toastText: {
        fontFamily: 'PlusJakartaSans-SemiBold',
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
});
