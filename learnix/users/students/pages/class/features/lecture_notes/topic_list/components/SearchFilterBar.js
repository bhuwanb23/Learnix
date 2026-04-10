import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_COLORS } from '../constants/topicListData';

export default function SearchFilterBar({ searchQuery, setSearchQuery }) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons 
          name="search" 
          size={20} 
          color={TOPIC_COLORS.onSurfaceVariant} 
          style={styles.icon} 
        />
        <TextInput
          style={styles.input}
          placeholder="Search topics in Unit 2..."
          placeholderTextColor={TOPIC_COLORS.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOPIC_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: TOPIC_COLORS.outlineVariant,
    borderColor: 'rgba(171, 173, 175, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: TOPIC_COLORS.onSurface,
  },
});
