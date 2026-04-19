import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopicHeader from './components/TopicHeader';
import TopicCard from './components/TopicCard';
import { TOPICS, HEADER } from './constants/topicData';
import CreateEditNotes from '../create_edit_notes/create_edit_notes';

export default function TopicList({ route, navigation }) {
    const unitData = route?.params?.unitData || {
        id: 'unit-1',
        title: 'Introduction to Data Structures',
    };

    const [currentScreen, setCurrentScreen] = React.useState('topics');
    const [selectedTopic, setSelectedTopic] = React.useState(null);

    const handleNavigate = (screen, params = {}) => {
        if (screen === 'CreateEditNotes') {
            setCurrentScreen('CreateEditNotes');
            setSelectedTopic(params.topicData);
        } else if (screen === 'main') {
            setCurrentScreen('topics');
            setSelectedTopic(null);
        }
    };

    const handleBack = () => {
        if (currentScreen === 'CreateEditNotes') {
            handleNavigate('main');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleOpenModule = (topic) => {
        handleNavigate('CreateEditNotes', { topicData: topic });
    };

    const handleEdit = (topic) => {
        console.log('Edit topic:', topic.id);
    };

    const handleDelete = (topic) => {
        console.log('Delete topic:', topic.id);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {currentScreen === 'CreateEditNotes' ? (
                <CreateEditNotes 
                    route={{ params: { topicData: selectedTopic } }} 
                    navigation={{ goBack: handleBack }} 
                />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TopicHeader title={HEADER.title} onBack={handleBack} />
                    <View style={styles.topicsList}>
                        {TOPICS.map((topic) => (
                            <TopicCard
                                key={topic.id}
                                topic={topic}
                                onOpen={() => handleOpenModule(topic)}
                                onEdit={() => handleEdit(topic)}
                                onDelete={() => handleDelete(topic)}
                            />
                        ))}
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
    topicsList: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
});