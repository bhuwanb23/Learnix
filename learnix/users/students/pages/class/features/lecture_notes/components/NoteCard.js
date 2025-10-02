import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function NoteCard({ note, onPress, onDownload }) {
  const renderStars = (rating) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={10} color="#FBBF24" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={10} color="#FBBF24" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={10} color="#FBBF24" />
      );
    }
    
    return stars;
  };

  const renderTags = () => {
    return note.tags.map((tag, index) => (
      <View key={index} style={[styles.tag, { backgroundColor: getTagColor(note.type) }]}>
        <Text style={[styles.tagText, { color: getTagTextColor(note.type) }]}>
          {tag}
        </Text>
      </View>
    ));
  };

  const getTagColor = (type) => {
    switch (type) {
      case 'pdf': return '#DBEAFE';
      case 'ppt': return '#D1FAE5';
      case 'scan': return '#FEF3C7';
      case 'ai': return '#E9D5FF';
      default: return '#F3F4F6';
    }
  };

  const getTagTextColor = (type) => {
    switch (type) {
      case 'pdf': return '#1E40AF';
      case 'ppt': return '#065F46';
      case 'scan': return '#92400E';
      case 'ai': return '#6B21A8';
      default: return '#374151';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(note)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FAFBFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Decorative top border */}
        <LinearGradient
          colors={['#3B82F6', '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topBorder}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[note.iconColor || '#3B82F6', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name={note.icon} size={22} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{note.title}</Text>
              <View style={styles.authorContainer}>
                <Ionicons name="person-circle-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.author}>
                  {note.author}
                  {note.authorType && ` • ${note.authorType}`}
                </Text>
                <View style={styles.timeDot} />
                <Text style={styles.timeAgo}>{note.timeAgo}</Text>
              </View>
            </View>
          </View>
          
          {note.rating && (
            <View style={styles.rating}>
              <View style={styles.ratingBadge}>
                <View style={styles.stars}>
                  {renderStars(note.rating)}
                </View>
                <Text style={styles.ratingText}>{note.rating}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tags */}
        <View style={styles.tagsContainer}>
          {renderTags()}
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {note.description}
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Download/View Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDownload(note)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#3B82F6', '#1E40AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons 
                name={note.type === 'ai' ? 'eye-outline' : 'download-outline'} 
                size={16} 
                color="#FFFFFF" 
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => console.log('Share pressed')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="share-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => console.log('Bookmark pressed')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="bookmark-outline" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* More Options Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => console.log('More options pressed')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* AI Badge (if applicable) */}
          {note.type === 'ai' && (
            <View style={styles.aiIndicator}>
              <LinearGradient
                colors={['#A855F7', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiBadge}
              >
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.aiText}>AI</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Decorative shapes */}
        <View style={styles.decorativeShape1} />
        <View style={styles.decorativeShape2} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: '#E1E7FF',
    position: 'relative',
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 24,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  author: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  timeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textSecondary,
  },
  timeAgo: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  rating: {
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: SPACING.md,
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIndicator: {
    marginLeft: 'auto',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  aiText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  decorativeShape1: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  decorativeShape2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
  },
});
