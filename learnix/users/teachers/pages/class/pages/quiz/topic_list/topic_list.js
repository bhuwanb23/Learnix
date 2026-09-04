import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopicHeader from './components/TopicHeader';
import TopicCard from './components/TopicCard';
import { TOPICS, HEADER } from './constants/topicData';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import TopicDetail from '../topic_detail/topic_detail';
import EditTopic from '../../syllabus/edit_topic/edit_topic';

export default function TopicList({ route, navigation }) {
    const unitData = route?.params?.unitData || {
        id: 'unit-1',
        title: 'Neural Network Architectures',
    };

    const [currentScreen, setCurrentScreen] = React.useState('topics');
    const [selectedTopic, setSelectedTopic] = React.useState(null);

    const handleBack = () => {
        if (currentScreen === 'TopicDetail') {
            handleNavigate('main');
        } else if (currentScreen === 'EditTopic') {
            handleNavigate('main');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleNavigate = (screen, params = {}) => {
        if (screen === 'TopicDetail') {
            setCurrentScreen('TopicDetail');
            setSelectedTopic(params.topicData);
        } else if (screen === 'EditTopic') {
            setSelectedTopic(null);
            setCurrentScreen('EditTopic');
        } else if (screen === 'main') {
            setCurrentScreen('topics');
            setSelectedTopic(null);
        }
    };

    const handleOpenQuizDashboard = (topic) => {
        handleNavigate('TopicDetail', { topicData: topic });
    };

    const handleCreateTopic = () => {
        handleNavigate('EditTopic');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {currentScreen === 'EditTopic' ? (
                <EditTopic
                    route={{ params: { unitData, topicData: null } }}
                    navigation={{ goBack: handleBack }}
                />
            ) : currentScreen === 'TopicDetail' ? (
                <TopicDetail 
                    route={{ params: { topicData: selectedTopic } }} 
                    navigation={{ goBack: handleBack }} 
                />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerWrapper}>
                        <TopicHeader 
                            title={HEADER.title}
                            unitTitle={unitData.title}
                            onBack={handleBack}
                        />
                    </View>
                    <View style={styles.searchWrapper}>
                        <View style={styles.searchContainer}>
                            <MaterialIcons name="search" size={20} color="#747779" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Filter research topics or keywords..."
                                placeholderTextColor="#abadaf"
                            />
                        </View>
                    </View>
                    <View style={styles.topicsList}>
                        {TOPICS.map((topic) => (
                            <TopicCard
                                key={topic.id}
                                topic={topic}
                                onOpen={() => handleOpenQuizDashboard(topic)}
                            />
                        ))}
                        <TouchableOpacity style={styles.createCard} onPress={handleCreateTopic} activeOpacity={0.7}>
                            <View style={styles.createIconContainer}>
                                <MaterialIcons name="add" size={28} color="#595c5e" />
                            </View>
                            <Text style={styles.createTitle}>Propose New Topic</Text>
                            <Text style={styles.createSubtitle}>Add supplementary material to the curriculum</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
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
    headerWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
        marginBottom: 24,
    },
    searchWrapper: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef1f3',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#2c2f31',
    },
    topicsList: {
        paddingHorizontal: 24,
    },
    createCard: {
        backgroundColor: '#ffffff',
        padding: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e9eb',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
        gap: 8,
    },
    createIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eef1f3',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    createTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 18,
        fontWeight: '700',
        color: '#595c5e',
    },
    createSubtitle: {
        fontFamily: 'Manrope',
        fontSize: 13,
        color: 'rgba(89, 92, 94, 0.6)',
        textAlign: 'center',
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    placeholderTitle: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 24,
        fontWeight: '700',
        color: '#2c2f31',
        marginTop: 16,
        marginBottom: 8,
    },
    placeholderText: {
        fontFamily: 'Manrope',
        fontSize: 14,
        color: '#595c5e',
        textAlign: 'center',
    },
});
