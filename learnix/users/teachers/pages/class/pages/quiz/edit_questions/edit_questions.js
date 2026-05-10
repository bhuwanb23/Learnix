import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditQuestionsHeader from './components/EditQuestionsHeader';
import QuestionListHeader from './components/QuestionListHeader';
import QuestionCard from './components/QuestionCard';
import AddQuestionButton from './components/AddQuestionButton';
import { QUIZ_INFO, QUESTIONS, HEADER } from './constants/editQuestionsData';

export default function EditQuestions({ route, navigation }) {
    const quizData = route?.params?.quizData || {
        id: 'quiz-1',
        name: 'Cell Biology 101',
        description: 'Curate and organize your question set.',
    };

    const [questions, setQuestions] = useState(QUESTIONS);

    const handleBack = () => {
        if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleImport = () => {
        console.log('Import questions');
    };

    const handleEditQuestion = (question) => {
        console.log('Edit question:', question.id);
    };

    const handleDeleteQuestion = (question) => {
        console.log('Delete question:', question.id);
        setQuestions(questions.filter(q => q.id !== question.id));
    };

    const handleAddQuestion = () => {
        console.log('Add new question');
    };

    const handleToggleExpand = (index, expanded) => {
        console.log('Question', index + 1, expanded ? 'expanded' : 'collapsed');
    };

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
