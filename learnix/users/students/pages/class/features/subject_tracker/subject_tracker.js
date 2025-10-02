import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

// Components
import OverallProgress from './components/OverallProgress';
import SubjectCard from './components/SubjectCard';
import FloatingAIButton from './components/FloatingAIButton';
import AIChatModal from './components/AIChatModal';

// Hooks
import { useSubjectTracker } from './hooks/useSubjectTracker';

export default function SubjectTracker({ navigation }) {
  const {
    data,
    expandedSubjects,
    expandedUnits,
    aiChatVisible,
    chatMessages,
    toggleSubject,
    toggleUnit,
    toggleAiChat,
    sendAiMessage,
    explainTopic,
  } = useSubjectTracker();

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Overall Progress */}
        <OverallProgress progressData={data.overallProgress} />

        {/* Subjects List */}
        <View style={styles.subjectsContainer}>
          {data.subjects.map((subject, index) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              isExpanded={expandedSubjects[subject.id]}
              onToggle={() => toggleSubject(subject.id)}
              expandedUnits={expandedUnits}
              onToggleUnit={toggleUnit}
              onExplainTopic={explainTopic}
              delay={index * 150}
            />
          ))}
        </View>

        {/* Bottom spacing for floating button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating AI Button */}
      <FloatingAIButton onPress={toggleAiChat} />

      {/* AI Chat Modal */}
      <AIChatModal
        visible={aiChatVisible}
        onClose={toggleAiChat}
        messages={chatMessages}
        onSendMessage={sendAiMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating button
  },
  subjectsContainer: {
    paddingBottom: 16,
  },
  bottomSpacing: {
    height: 80,
  },
});
