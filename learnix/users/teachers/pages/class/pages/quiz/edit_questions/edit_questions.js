import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditQuestionsHeader from './components/EditQuestionsHeader';
import QuestionListHeader from './components/QuestionListHeader';
import QuestionCard from './components/QuestionCard';
import AddQuestionButton from './components/AddQuestionButton';
import CreateQuestion from '../create_question/create_question';
import { QUIZ_INFO, QUESTIONS, HEADER } from './constants/editQuestionsData';

export default function EditQuestions({ route, navigation }) {
    const quizData = route?.params?.quizData || {
        id: 'quiz-1',
        name: 'Cell Biology 101',
        description: 'Curate and organize your question set.',
    };

    const [questions, setQuestions] = useState(QUESTIONS);
    const [currentScreen, setCurrentScreen] = useState('list');

    const handleBack = () => {
        if (currentScreen === 'CreateQuestion') {
            setCurrentScreen('list');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleImport = () => {
        Alert.alert('Import Questions', 'Importing from the question bank is available once the backend is connected. You can add questions one by one below.');
    };

    const handleEditQuestion = (question) => {
        setCurrentScreen('CreateQuestion');
    };

    const handleDeleteQuestion = (question) => {
        Alert.alert(
            'Delete Question?',
            'This question will be removed from the quiz.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => setQuestions(questions.filter(q => q.id !== question.id)),
                },
            ]
        );
    };

    const handleAddQuestion = () => {
        setCurrentScreen('CreateQuestion');
    };

    const handleToggleExpand = () => {
        // Expansion handled inside QuestionCard
    };

    if (currentScreen === 'CreateQuestion') {
        return (
            <CreateQuestion
                route={{ params: { quizData } }}
                navigation={{ goBack: handleBack }}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <EditQuestionsHeader 
                onBack={handleBack}
                quizTitle={quizData.name}
            />
            
            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <QuestionListHeader 
                        quizTitle={quizData.name || QUIZ_INFO.title}
                        quizDescription={quizData.description || QUIZ_INFO.description}
                        onImport={handleImport}
                    />

                    <View style={styles.questionsList}>
                        {questions.map((question, index) => (
                            <QuestionCard
                                key={question.id}
                                question={question}
                                index={index}
                                isExpanded={index === 0} // First question expanded by default
                                onEdit={() => handleEditQuestion(question)}
                                onDelete={() => handleDeleteQuestion(question)}
                                onToggleExpand={(expanded) => handleToggleExpand(index, expanded)}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>

            <AddQuestionButton onPress={handleAddQuestion} />
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
    questionsList: {
        marginTop: 8,
    },
});
