import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateQuizHeader from './components/CreateQuizHeader';
import Breadcrumb from './components/Breadcrumb';
import HeaderEditorial from './components/HeaderEditorial';
import BasicInfoCard from './components/BasicInfoCard';
import TopicSelector from './components/TopicSelector';
import QuestionCounter from './components/QuestionCounter';
import DifficultySelector from './components/DifficultySelector';
import TimeLimitSlider from './components/TimeLimitSlider';
import ActionButtons from './components/ActionButtons';
import { HEADER, EDITORIAL, BREADCRUMB_ITEMS, DEFAULT_QUIZ_DATA } from './constants/createQuizData';

export default function CreateQuiz({ route, navigation }) {
    const topicData = route?.params?.topicData || {
        id: 'topic-1',
        title: 'Data Structures',
    };

    const [quizTitle, setQuizTitle] = useState(DEFAULT_QUIZ_DATA.title);
    const [description, setDescription] = useState(DEFAULT_QUIZ_DATA.description);
    const [selectedTopic, setSelectedTopic] = useState(DEFAULT_QUIZ_DATA.topic);
    const [questionCount, setQuestionCount] = useState(DEFAULT_QUIZ_DATA.questionCount);
    const [difficulty, setDifficulty] = useState(DEFAULT_QUIZ_DATA.difficulty);
    const [timeLimit, setTimeLimit] = useState(DEFAULT_QUIZ_DATA.timeLimit);
    const [quizTitleError, setQuizTitleError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Discard Changes?',
            'You have unsaved changes. Are you sure you want to discard them?',
            [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: handleBack },
            ]
        );
    };

    const validateForm = () => {
        if (!quizTitle.trim()) {
            setQuizTitleError('Quiz title is required');
            return false;
        }
        setQuizTitleError('');
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        
        // Simulate API call
        setTimeout(() => {
            const quizData = {
                id: `quiz-${Date.now()}`,
                title: quizTitle,
                description,
                topic: selectedTopic,
                questionCount,
                difficulty,
                timeLimit,
                topicId: topicData.id,
            };
            
            console.log('Quiz created:', quizData);
            setIsSaving(false);
            
            // Navigate back with success
            Alert.alert(
                'Quiz Created!',
                `Your quiz "${quizTitle}" has been created successfully.`,
                [
                    { text: 'OK', onPress: handleBack },
                ]
            );
        }, 1500);
    };

    const handleIncrementQuestions = () => {
        if (questionCount < 50) {
            setQuestionCount(questionCount + 1);
        }
    };

    const handleDecrementQuestions = () => {
        if (questionCount > 1) {
            setQuestionCount(questionCount - 1);
        }
    };

    const handleTimeLimitChange = (value) => {
        setTimeLimit(Math.round(value));
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <CreateQuizHeader 
                onBack={handleBack}
                onSave={handleSave}
                onCancel={handleCancel}
            />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Breadcrumb items={BREADCRUMB_ITEMS} />
                    
                    <HeaderEditorial 
                        title={EDITORIAL.title}
                        subtitle={`${EDITORIAL.subtitle.split('module')[0]}${topicData.title}${EDITORIAL.subtitle.split('module')[1]}`}
                    />

                    {/* Basic Information */}
                    <BasicInfoCard 
                        quizTitle={quizTitle}
                        setQuizTitle={setQuizTitle}
                        description={description}
                        setDescription={setDescription}
                        quizTitleError={quizTitleError}
                    />

                    {/* Configuration Grid */}
                    <View style={styles.configGrid}>
                        <View style={styles.configRow}>
                            <View style={styles.configItem}>
                                <TopicSelector 
                                    selectedTopic={selectedTopic}
                                    onSelectTopic={setSelectedTopic}
                                />
                            </View>
                            <View style={styles.configItem}>
                                <QuestionCounter 
                                    count={questionCount}
                                    onIncrement={handleIncrementQuestions}
                                    onDecrement={handleDecrementQuestions}
                                />
                            </View>
                        </View>

                        <DifficultySelector 
                            selectedDifficulty={difficulty}
                            onSelectDifficulty={setDifficulty}
                        />

                        <TimeLimitSlider 
                            value={timeLimit}
                            onValueChange={handleTimeLimitChange}
                        />
                    </View>

                    {/* Action Buttons */}
                    <ActionButtons 
                        onCancel={handleCancel}
                        onSave={handleSave}
                        isSaving={isSaving}
                    />
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
        paddingBottom: 40,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    configGrid: {
        gap: 0,
    },
    configRow: {
        flexDirection: 'column',
    },
    configItem: {
        flex: 1,
    },
});
