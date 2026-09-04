import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopicDetailHeader from './components/TopicDetailHeader';
import PerformanceHero from './components/PerformanceHero';
import StatsRow from './components/StatsRow';
import QuizList from './components/QuizList';
import AIInsightCard from './components/AIInsightCard';
import { QUIZ_STATS, QUIZZES, HEADER, AI_INSIGHT } from './constants/topicDetailData';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import QuizPreview from '../quiz_preview/quiz_preview';
import CreateQuiz from '../create_quiz/create_quiz';
import EditQuizScreen from '../edit_quiz/EditQuizScreen';
import Quizzes from '../quizzes/quizzes';

export default function TopicDetail({ route, navigation }) {
    const topicData = route?.params?.topicData || {
        id: 'topic-1',
        title: 'Perceptrons & Feedforward Models',
    };

    const [currentScreen, setCurrentScreen] = useState('detail');
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    const handleNavigate = (screen, params = {}) => {
        if (screen === 'QuizPreview') {
            setCurrentScreen('QuizPreview');
            setSelectedQuiz(params.quizData);
        } else if (screen === 'CreateQuiz') {
            setCurrentScreen('CreateQuiz');
        } else if (screen === 'EditQuiz') {
            setCurrentScreen('EditQuiz');
            setSelectedQuiz(params.quizData);
        } else if (screen === 'Quizzes') {
            setCurrentScreen('Quizzes');
        } else if (screen === 'main') {
            setCurrentScreen('detail');
            setSelectedQuiz(null);
        }
    };

    const handleBack = () => {
        if (currentScreen === 'QuizPreview' || currentScreen === 'CreateQuiz' || currentScreen === 'EditQuiz' || currentScreen === 'Quizzes') {
            handleNavigate('main');
        } else if (navigation?.goBack) {
            navigation.goBack();
        }
    };

    const handleEdit = (quiz) => {
        handleNavigate('EditQuiz', { quizData: quiz });
    };

    const handleDelete = (quiz) => {
        Alert.alert(
            'Delete Quiz?',
            `"${quiz.name}" and its submissions will be permanently removed.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Quiz deleted', 'The quiz was removed.') },
            ]
        );
    };

    const handleManage = (quiz) => {
        handleNavigate('QuizPreview', { quizData: quiz });
    };

    const handleGenerateQuiz = () => {
        handleNavigate('CreateQuiz', { topicData });
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {currentScreen === 'Quizzes' ? (
                <Quizzes
                    route={{ params: { topicData } }}
                    navigation={{ goBack: handleBack, navigate: handleNavigate }}
                />
            ) : currentScreen === 'EditQuiz' ? (
                <EditQuizScreen
                    route={{ params: { quizData: selectedQuiz } }}
                    navigation={{ goBack: handleBack }}
                />
            ) : currentScreen === 'QuizPreview' ? (
                <QuizPreview 
                    route={{ params: { quizData: selectedQuiz } }} 
                    navigation={{ goBack: handleBack }} 
                />
            ) : currentScreen === 'CreateQuiz' ? (
                <CreateQuiz 
                    route={{ params: { topicData } }} 
                    navigation={{ goBack: handleBack }} 
                />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerWrapper}>
                        <TopicDetailHeader 
                            title={HEADER.title}
                            topicName={topicData.title}
                            onBack={handleBack}
                        />
                    </View>
                    <View style={styles.content}>
                        <PerformanceHero
                            title={HEADER.performanceTitle}
                            subtitle={HEADER.performanceSubtitle}
                            value={HEADER.performanceValue}
                            trend={HEADER.performanceTrend}
                        />
                        <StatsRow stats={QUIZ_STATS} />
                        <QuizList 
                            quizzes={QUIZZES}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onManage={handleManage}
                            onViewAll={() => handleNavigate('Quizzes')}
                        />
                        <AIInsightCard 
                            insight={AI_INSIGHT}
                            onGenerate={handleGenerateQuiz}
                        />
                    </View>
                    <TouchableOpacity style={styles.floatingButton} onPress={handleGenerateQuiz} activeOpacity={0.85}>
                        <MaterialIcons name="add" size={24} color="#ffffff" />
                        <Text style={styles.floatingButtonText}>Create New Quiz</Text>
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
        bottom: 24,
        right: 24,
        backgroundColor: '#0050d4',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 28,
        shadowColor: '#0050d4',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    floatingButtonText: {
        fontFamily: 'Manrope-Bold',
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});
