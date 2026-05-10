import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuizPreviewHeader from './components/QuizPreviewHeader';
import QuizMetaInfo from './components/QuizMetaInfo';
import QuestionCard from './components/QuestionCard';
import { QUIZ_HEADER, QUESTIONS, HEADER } from './constants/quizPreviewData';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import EditQuizScreen from '../edit_quiz/EditQuizScreen';

export default function QuizPreview({ route, navigation }) {
    const quizData = route?.params?.quizData || {
        id: 'quiz-1',
        name: 'Synaptic Plasticity & Memory',
    };

    const [currentScreen, setCurrentScreen] = useState('preview');

    const handleNavigate = (screen, params = {}) => {
        if (screen === 'EditQuiz') {
            setCurrentScreen('EditQuiz');
        } else if (screen === 'main') {
            setCurrentScreen('preview');
        }
    };

    const handleBack = () => {
        if (currentScreen === 'EditQuiz') {
            handleNavigate('main');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleEdit = () => {
        handleNavigate('EditQuiz');
    };

    const handleManageQuestions = () => {
        console.log('Manage questions');
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {currentScreen === 'EditQuiz' ? (
                <EditQuizScreen 
                    route={{ params: { quizData } }} 
                    navigation={{ goBack: handleBack }} 
                />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerWrapper}>
                        <QuizPreviewHeader 
                            title={HEADER.title}
                            quizName={quizData.name}
                            onBack={handleBack}
                            onEdit={handleEdit}
                            navigation={navigation}
                        />
                    </View>
                    <View style={styles.content}>
                        <QuizMetaInfo
                            subject={QUIZ_HEADER.subject}
                            title={QUIZ_HEADER.title}
                            description={QUIZ_HEADER.description}
                            timeRemaining={QUIZ_HEADER.timeRemaining}
                        />
                        {QUESTIONS.map((question) => (
                            <QuestionCard key={question.id} question={question} />
                        ))}
                    </View>
                    <TouchableOpacity style={styles.floatingButton} onPress={handleManageQuestions} activeOpacity={0.85}>
                        <MaterialIcons name="settings-suggest" size={24} color="#2c2f31" />
                        <Text style={styles.floatingButtonText}>Manage Questions</Text>
                    </TouchableOpacity>
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
        paddingBottom: 100,
    },
    headerWrapper: {
        paddingHorizontal: 24,
        paddingTop: 16,
        marginBottom: 24,
    },
    content: {
        paddingHorizontal: 24,
    },
    floatingButton: {
        position: 'absolute',
        bottom: 128,
        right: 24,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#e5e9eb',
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    floatingButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 13,
        fontWeight: '700',
        color: '#2c2f31',
        paddingRight: 8,
    },
});
