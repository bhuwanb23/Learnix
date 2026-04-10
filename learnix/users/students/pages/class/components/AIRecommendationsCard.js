import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function AIRecommendationsCard({ data }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="auto-awesome" size={24} color="#702ae1" />
        <Text style={styles.title}>{data.title}</Text>
      </View>
      
      <Text style={styles.message}>
        {data.message.split(data.highlight)[0]}
        <Text style={styles.highlight}>{data.highlight}</Text>
        {data.message.split(data.highlight)[1]}
      </Text>

      <View style={styles.resourcesList}>
        {data.resources.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            style={styles.resourceItem}
            activeOpacity={0.7}
          >
            <MaterialIcons name={resource.icon.replace('_', '-')} size={24} color="#702ae1" />
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
    // Removed margin since parent has padding
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    backgroundColor: '#eef1f3', // bg-surface-container-low
    borderLeftWidth: 4, // border-l-4
    borderLeftColor: '#702ae1', // border-secondary
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
    marginBottom: 16, // mb-4
  },
  title: {
    fontSize: 16, // Assuming base size
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
  },
  message: {
    fontSize: 14, // text-sm
    color: '#595c5e', // text-on-surface-variant
    lineHeight: 24, // leading-relaxed
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
    marginBottom: 24, // mb-6
  },
  highlight: {
    color: '#702ae1', // text-secondary
    fontWeight: '700', // font-bold
  },
  resourcesList: {
    gap: 12, // space-y-3
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // gap-3
    padding: 12, // p-3
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderRadius: 8, // rounded-lg
  },
  resourceType: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface (assuming)
    fontFamily: 'Manrope-Bold',
  },
  resourceTitle: {
    fontSize: 12, // text-xs
    color: '#595c5e', // text-on-surface-variant
    fontFamily: 'Manrope-Medium',
  },
});
