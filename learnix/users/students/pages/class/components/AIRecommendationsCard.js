import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function AIRecommendationsCard({ data }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>✨</Text>
        <Text style={styles.title}>{data.title}</Text>
      </View>
      
      <Text style={styles.message}>
        Based on your last Statistics quiz, you should focus on{' '}
        <Text style={styles.highlight}>{data.highlight}</Text>.
      </Text>

      <View style={styles.resourcesList}>
        {data.resources.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            style={styles.resourceItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.resourceIcon, { color: '#702ae1' }]}>
              {resource.icon === 'play_circle' ? '▶️' : '📄'}
            </Text>
            <View>
              <Text style={styles.resourceType}>{resource.type}</Text>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#eef1f3',
    borderLeftWidth: 4,
    borderLeftColor: '#702ae1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Plus Jakarta Sans',
  },
  message: {
    fontSize: 14,
    color: '#595c5e',
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: 'Manrope',
    marginBottom: 24,
  },
  highlight: {
    color: '#702ae1',
    fontWeight: '700',
  },
  resourcesList: {
    gap: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resourceIcon: {
    fontSize: 20,
  },
  resourceType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope',
  },
  resourceTitle: {
    fontSize: 11,
    color: '#595c5e',
    fontFamily: 'Manrope',
  },
});
