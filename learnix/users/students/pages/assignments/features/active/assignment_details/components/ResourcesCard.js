import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function ResourcesCard({ assignment }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Required Reading</Text>
      <View style={styles.resourcesList}>
        {assignment.resources.map((resource) => (
          <TouchableOpacity key={resource.id} style={styles.resourceItem}>
            <MaterialIcons 
              name={resource.icon} 
              size={20} 
              color={ACTIVE_ASSIGNMENT_COLORS.secondary} 
            />
            <Text style={styles.resourceName}>{resource.name}</Text>
            <MaterialIcons 
              name={resource.type === 'article' ? 'download' : 'open-in-new'} 
              size={14} 
              color={ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant} 
              style={styles.resourceAction}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLowest,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  resourcesList: {
    gap: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLow,
  },
  resourceName: {
    flex: 1,
    fontFamily: 'Manrope-SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
  },
  resourceAction: {
    opacity: 0.4,
  },
});
