import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import EditQuizHeader from './components/EditQuizHeader';
import EditQuizHero from './components/EditQuizHero';
import EditQuizForm from './components/EditQuizForm';
import EditQuizDangerZone from './components/EditQuizDangerZone';
import EditQuizBottomBar from './components/EditQuizBottomBar';

export default function EditQuizScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EditQuizHeader />
        <EditQuizHero />
        <EditQuizForm />
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
