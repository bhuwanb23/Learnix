import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import EditQuizHeader from './components/EditQuizHeader';
import EditQuizHero from './components/EditQuizHero';
import EditQuizForm from './components/EditQuizForm';
import EditQuizDangerZone from './components/EditQuizDangerZone';
import EditQuizBottomBar from './components/EditQuizBottomBar';

export default function EditQuizScreen({ route, navigation }) {
  const quizData = route?.params?.quizData || {
    id: 'quiz-1',
    name: 'Synaptic Plasticity & Memory',
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EditQuizHeader quizName={quizData.name} navigation={navigation} />
        <EditQuizHero quizData={quizData} />
        <EditQuizForm quizData={quizData} />
        <EditQuizDangerZone />
      </ScrollView>
      <EditQuizBottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
});
