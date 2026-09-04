import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
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
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleUpdate = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Quiz Updated', `"${quizData.name}" settings were saved.`, [
        { text: 'OK', onPress: () => handleBack() },
      ]);
    }, 700);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Quiz?',
      `"${quizData.name}" and all student attempts will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Quiz Deleted', 'The quiz was removed.', [
              { text: 'OK', onPress: () => handleBack() },
            ]);
          },
        },
      ]
    );
  };

  const handleMore = () => {
    Alert.alert(quizData.name, 'Duplicate, archive or share this quiz. Full options arrive with the backend.');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EditQuizHeader quizName={quizData.name} onBack={handleBack} onMore={handleMore} />
        <EditQuizHero quizData={quizData} />
        <EditQuizForm quizData={quizData} />
        <EditQuizDangerZone onDelete={handleDelete} />
      </ScrollView>
      <EditQuizBottomBar onCancel={handleBack} onUpdate={handleUpdate} saving={saving} />
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