import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function RecentCompletions({ completions }) {
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getScoreText = (item) => {
    if (item.type === 'quiz' && item.score) {
      return `Score: ${item.score}%`;
    }
    if (item.type === 'assignment' && item.grade) {
      return `Grade: ${item.grade}`;
    }
    return 'Completed';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recently Completed</Text>
      
      <View style={styles.completionsList}>
        {completions.map((item) => (
          <View key={item.id} style={styles.completionCard}>
            <View style={styles.completionIcon}>
              <Ionicons 
                name="checkmark" 
                size={12} 
                color="#FFFFFF" 
              />
            </View>
            
            <View style={styles.completionInfo}>
              <Text style={styles.completionTitle}>{item.title}</Text>
              <Text style={styles.completionDetails}>
                {getScoreText(item)} • {formatTimeAgo(item.date)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  completionsList: {
    gap: SPACING.sm,
  },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  completionInfo: {
    flex: 1,
  },
  completionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: '#14532D',
    marginBottom: 2,
  },
  completionDetails: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#15803D',
  },
});
