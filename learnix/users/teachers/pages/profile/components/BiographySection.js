import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function BiographySection({ bio }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{bio.title}</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.expandText}>Expand</Text>
        </TouchableOpacity>
      </View>
      {bio.paragraphs.map((paragraph, index) => (
        <Text key={index} style={styles.text}>{paragraph}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
  },
  expandText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#0050d4',
  },
  text: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 22,
    marginBottom: 12,
  },
});
