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
        <Ionicons key={i} name="star" size={12} color="#FBBF24" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#FBBF24" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#FBBF24" />
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
        colors={['#FFFFFF', '#F8FAFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: note.backgroundColor }]}>
              <Ionicons name={note.icon} size={20} color={note.iconColor} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{note.title}</Text>
              <Text style={styles.author}>
                {note.author}
                {note.authorType && ` • ${note.authorType}`} • {note.timeAgo}
              </Text>
            </View>
          </View>
          
          {note.rating && (
            <View style={styles.rating}>
              <View style={styles.stars}>
                {renderStars(note.rating)}
              </View>
              <Text style={styles.ratingText}>{note.rating}</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.stats}>
            {note.downloads && (
              <View style={styles.stat}>
                <Ionicons name="download-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{note.downloads}</Text>
              </View>
            )}
            {note.views && (
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{note.views > 1000 ? `${(note.views/1000).toFixed(1)}k` : note.views}</Text>
              </View>
            )}
            {note.pages && (
              <Text style={styles.statText}>{note.pages} pages</Text>
            )}
            {note.readTime && (
              <Text style={styles.statText}>{note.readTime}</Text>
            )}
            {note.type === 'ai' && (
              <View style={styles.stat}>
                <Ionicons name="hardware-chip-outline" size={14} color="#A855F7" />
                <Text style={[styles.statText, { color: '#A855F7' }]}>AI Generated</Text>
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => onDownload(note)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={note.type === 'ai' ? 'eye-outline' : 'download-outline'} 
              size={14} 
              color="#3B82F6" 
            />
            <Text style={styles.downloadText}>
              {note.type === 'ai' ? 'View' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  author: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  rating: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
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
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  downloadText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#3B82F6',
  },
});
