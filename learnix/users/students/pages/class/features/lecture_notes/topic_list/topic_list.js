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
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleTopicPress = (topic) => {
    Alert.alert(
      'Open Topic',
      `Open ${topic.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => console.log('Open topic:', topic.id) },
      ]
    );
  };

  const filteredTopics = searchQuery
    ? TOPICS.filter(topic =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TOPICS;

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
