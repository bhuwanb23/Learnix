import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function BiographySection({ bio }) {
  const [expanded, setExpanded] = useState(false);
  const visibleParagraphs = expanded ? bio.paragraphs : bio.paragraphs.slice(0, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{bio.title}</Text>
        {bio.paragraphs.length > 1 && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpanded((prev) => !prev)}
            activeOpacity={0.85}
          >
            <Text style={styles.expandText}>{expanded ? 'Collapse' : 'Expand'}</Text>
            <MaterialIcons
              name={expanded ? 'expand-less' : 'expand-more'}
              size={16}
              color="#0050d4"
            />
          </TouchableOpacity>
        )}
      </View>
      {visibleParagraphs.map((paragraph, index) => (
        <Text key={index} style={styles.text}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e8ec',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    letterSpacing: -0.3,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  expandText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#0050d4',
  },
  text: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 21,
    marginBottom: 10,
  },
});