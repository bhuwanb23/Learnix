import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CreateQuestionHeader from './components/CreateQuestionHeader';
import EditorialHeader from './components/EditorialHeader';
import MCQQuestionCard from './components/MCQQuestionCard';
import TFQuestionCard from './components/TFQuestionCard';
import QuizStatsSidebar from './components/QuizStatsSidebar';
import ProctoringRules from './components/ProctoringRules';
import AddQuestionFAB from './components/AddQuestionFAB';
import { DEFAULT_QUIZ, SAMPLE_QUESTIONS, PROCORING_RULES } from './constants/createQuestionData';

export default function CreateQuestion({ route, navigation }) {
    const quizData = route?.params?.quizData || DEFAULT_QUIZ;
    const topicData = route?.params?.topicData || { title: 'Cognitive Psychology' };

    const [questions, setQuestions] = useState(SAMPLE_QUESTIONS);
    const [isPublishing, setIsPublishing] = useState(false);

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const progress = Math.min(questions.length / quizData.totalQuestions, 1);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handlePublish = () => {
        Alert.alert(
            'Publish Quiz?',
            `This will publish "${quizData.title || 'Untitled Quiz'}" with ${questions.length} questions. Students will be able to access it immediately.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Publish', 
                    onPress: () => {
                        setIsPublishing(true);
                        setTimeout(() => {
                            setIsPublishing(false);
                            Alert.alert(
                                'Quiz Published!',
                                'Your quiz is now live and available to students.',
                                [{ text: 'OK', onPress: handleBack }]
                            );
                        }, 1500);
                    }
                },
            ]
        );
    };

    const handleSearch = () => {
        Alert.alert('Search Question Bank', 'Search across your saved questions will open here once the backend is connected.');
    };

    const handleUpdateQuestion = (updatedQuestion) => {
        setQuestions(questions.map(q => 
            q.id === updatedQuestion.id ? updatedQuestion : q
        ));
    };

    const handleDeleteQuestion = (questionId) => {
        Alert.alert(
            'Delete Question?',
            'This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => {
                        setQuestions(questions.filter(q => q.id !== questionId));
                    }
                },
            ]
        );
    };

    const handleDuplicateQuestion = (question) => {
        const newQuestion = {
            ...question,
            id: `q${Date.now()}`,
        };
        setQuestions([...questions, newQuestion]);
    };

    const handleAddQuestion = () => {
        const newQuestion = {
            id: `q${Date.now()}`,
            type: 'MCQ',
            text: 'Enter your question here...',
            options: [
                { text: 'Option A', isCorrect: true },
                { text: 'Option B', isCorrect: false },
                { text: 'Option C', isCorrect: false },
            ],
            points: 10,
            difficulty: 'Moderate',
        };
        setQuestions([...questions, newQuestion]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <CreateQuestionHeader 
                onBack={handleBack}
                onPublish={handlePublish}
                onSearch={handleSearch}
            />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <EditorialHeader 
                        quizTitle={quizData.title}
                        topicName={topicData.title}
                    />

                    <View style={styles.mainLayout}>
                        <View style={styles.questionsColumn}>
                            {questions.map((question, index) => (
                                question.type === 'MCQ' ? (
                                    <MCQQuestionCard
                                        key={question.id}
                                        question={question}
                                        index={index}
                                        onUpdate={handleUpdateQuestion}
                                        onDelete={() => handleDeleteQuestion(question.id)}
                                        onDuplicate={() => handleDuplicateQuestion(question)}
                                    />
                                ) : (
                                    <TFQuestionCard
                                        key={question.id}
                                        question={question}
                                        index={index}
                                        onUpdate={handleUpdateQuestion}
                                    />
                                )
                            ))}
                        </View>

                        <View style={styles.sidebarColumn}>
                            <QuizStatsSidebar 
                                totalQuestions={questions.length}
                                duration={quizData.duration}
                                totalPoints={totalPoints}
                                progress={progress}
                            />
                            <ProctoringRules rules={PROCORING_RULES} />
                        </View>
                    </View>
                </View>
            </ScrollView>

            <AddQuestionFAB onPress={handleAddQuestion} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    scrollContent: {
        paddingBottom: 140,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    mainLayout: {
        flexDirection: 'column',
    },
    questionsColumn: {
        flex: 1,
    },
    sidebarColumn: {
        marginTop: 16,
    },
});
