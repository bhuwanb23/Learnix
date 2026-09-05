import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_COLORS } from '../constants/unitListData';

export default function QuickResources({ resources }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Resources</Text>

      <View style={styles.grid}>
        {resources.map((resource) => (
          <View
            key={resource.id}
            style={[
              styles.resourceCard,
              { 
                backgroundColor: resource.bgColor,
                flex: resource.span,
              }
            ]}
          >
            <View style={styles.resourceContent}>
              <Text style={[styles.resourceTitle, { color: resource.textColor }]}>
                {resource.title}
              </Text>
              <Text style={[styles.resourceDescription, { color: resource.textColor + 'B3' }]}>
                {resource.description}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.resourceButton,
                  { backgroundColor: resource.textColor }
                ]}
                activeOpacity={0.7}
                onPress={() => Alert.alert(resource.title, resource.description)}
              >
                <Text style={[styles.resourceButtonText, { color: resource.bgColor }]}>
                  {resource.buttonText}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Background icon */}
            <View style={styles.bgIconContainer}>
              <Ionicons 
                name={resource.icon} 
                size={80} 
                color={resource.textColor} 
                style={styles.bgIcon} 
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_COLORS.onSurface,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  resourceCard: {
    borderRadius: 14,
    padding: 24,
    minHeight: 180,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  resourceContent: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
  },
  resourceDescription: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  resourceButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  resourceButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  bgIconContainer: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    opacity: 0.08,
  },
  bgIcon: {
    transform: [{ scale: 1.2 }],
  },
});
