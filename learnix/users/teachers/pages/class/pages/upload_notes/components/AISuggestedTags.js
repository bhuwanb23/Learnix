import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

const AISuggestedTags = ({ 
  aiSuggestedTags, 
  selectedTags, 
  customTags,
  onTagToggle, 
  onAddCustomTag,
  onCustomTagChange 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Suggested Tags</Text>
        <View style={styles.aiBadge}>
          <Text style={styles.aiIcon}>✨</Text>
          <Text style={styles.aiLabel}>AI</Text>
        </View>
      </View>

      <View style={styles.tagsContainer}>
        {aiSuggestedTags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagPill,
              selectedTags.includes(tag.id) 
                ? styles.selectedTag 
                : styles.unselectedTag
            ]}
            onPress={() => onTagToggle(tag.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tagText,
                selectedTags.includes(tag.id) 
                  ? styles.selectedTagText 
                  : styles.unselectedTagText
              ]}
            >
              {tag.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customTagContainer}>
        <TextInput
          style={styles.customTagInput}
          value={customTags}
          onChangeText={onCustomTagChange}
          placeholder="Add custom tags..."
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={() => onAddCustomTag(customTags)}
          returnKeyType="done"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  aiIcon: {
    fontSize: 12,
    color: '#2563EB'
  },
  aiLabel: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  selectedTag: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB'
  },
  unselectedTag: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB'
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500'
  },
  selectedTagText: {
    color: '#2563EB'
  },
  unselectedTagText: {
    color: '#6B7280'
  },
  customTagContainer: {
    marginTop: 4
  },
  customTagInput: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF'
  }
});

export default AISuggestedTags;
