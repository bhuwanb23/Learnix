import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { TOPIC_COLORS, UNIT_INFO, TOPICS } from './constants/topicListData';
import TopicListHeader from './components/TopicListHeader';
import UnitHeroSection from './components/UnitHeroSection';
import SearchFilterBar from './components/SearchFilterBar';
import TopicCard from './components/TopicCard';

export default function TopicListPage({ navigation, unit }) {
  const [currentPage, setCurrentPage] = useState('topics'); // 'topics' or 'notes'
  const [selectedTopic, setSelectedTopic] = useState(null);

  const navigateToNotes = (topic) => {
    console.log('Navigating to notes for:', topic.title);
    setSelectedTopic(topic);
    setCurrentPage('notes');
  };

  const navigateBackToTopics = () => {
    console.log('Navigating back to topics');
    setCurrentPage('topics');
    setSelectedTopic(null);
  };
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleTopicPress = (topic) => {
    console.log('Topic pressed:', topic.title);
    if (navigation?.navigateToNotes) {
      navigation.navigateToNotes(topic);
    } else {
      navigateToNotes(topic);
    }
  };

  const filteredTopics = searchQuery
    ? TOPICS.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TOPICS;

  // Render Notes Page
  if (currentPage === 'notes') {
    const NotesPage = require('../notes/notes').default;
    return (
      <NotesPage 
        navigation={{ goBack: navigateBackToTopics }}
        topic={selectedTopic}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TopicListHeader onBack={handleBack} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <UnitHeroSection unit={unit || UNIT_INFO} />

        <SearchFilterBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />

        <View style={styles.grid}>
          {filteredTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onPress={() => handleTopicPress(topic)}
              navigation={{ navigateToNotes }}
            />
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOPIC_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  grid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  bottomPadding: {
    height: 24,
  },
});
