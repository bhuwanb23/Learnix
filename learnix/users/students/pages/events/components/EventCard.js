import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';
import { getStatusColor, getStatusText, getPriceColor, formatDate, formatDateForDisplay } from '../constants/eventData';

const { width } = Dimensions.get('window');

export default function EventCard({ event, onPress, onJoin }) {
  const getStatusGradient = () => {
    if (event.isLive) return ['#FF6B6B', '#EE5A52']; // Red gradient for live
    if (event.status === 'upcoming') return ['#4FACFE', '#00F2FE']; // Blue gradient for upcoming
    if (event.status === 'workshop') return ['#FFB347', '#FFCC33']; // Orange gradient for workshop
    return ['#A8A8A8', '#8E8E8E']; // Gray gradient for others
  };

  const getStatusBadgeText = () => {
    if (event.isLive) return 'LIVE';
    if (event.status === 'workshop') return 'Workshop';
    return formatDate(event.date);
  };

  const getCategoryIcon = () => {
    if (event.status === 'workshop') return 'hammer-outline';
    if (event.status === 'certification') return 'ribbon-outline';
    if (event.isLive) return 'radio-outline';
    return 'calendar-outline';
  };

  const getPriceGradient = () => {
    if (event.price === 'Free') return ['#00C851', '#007E33'];
    return ['#FF6900', '#FCB900'];
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(event)}
      activeOpacity={0.8}
    >
      {/* Glassmorphism Background */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
        style={styles.glassBackground}
      />
      
      {/* Main Content Container */}
      <View style={styles.cardContent}>
        {/* Enhanced Image Container with Overlay */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.image} />
          
          {/* Dark Overlay for Better Text Readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.6)']}
            style={styles.imageOverlay}
          />
          
          {/* Animated Status Badge */}
          <LinearGradient
            colors={getStatusGradient()}
            style={styles.statusBadge}
          >
            <View style={styles.statusContent}>
              {event.isLive && <View style={styles.liveDot} />}
              <Ionicons 
                name={getCategoryIcon()} 
                size={12} 
                color="#FFFFFF" 
                style={styles.statusIcon}
              />
              <Text style={styles.statusText}>{getStatusBadgeText()}</Text>
            </View>
          </LinearGradient>

          {/* Enhanced Duration Badge */}
          {event.duration && (
            <View style={styles.durationBadge}>
              <View style={styles.durationContent}>
                <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                <Text style={styles.durationText}>{event.duration}</Text>
              </View>
            </View>
          )}

          {/* Floating Price Badge */}
          <LinearGradient
            colors={getPriceGradient()}
            style={styles.floatingPriceBadge}
          >
            <Text style={styles.floatingPriceText}>{event.price}</Text>
          </LinearGradient>
        </View>

        {/* Enhanced Content Section */}
        <View style={styles.content}>
          {/* Header with Category and Date */}
          <View style={styles.header}>
            <View style={styles.categoryContainer}>
              <View style={styles.categoryDot} />
              <Text style={styles.categoryText}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.dateTime}>
              {formatDateForDisplay(event.date)} • {event.time}
            </Text>
          </View>

          {/* Enhanced Title */}
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

          {/* Location with Enhanced Styling */}
          <View style={styles.locationContainer}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="location" size={12} color="#FF6B6B" />
            </View>
            <Text style={styles.location} numberOfLines={1}>{event.location}</Text>
          </View>

          {/* Enhanced Footer */}
          <View style={styles.footer}>
            {/* Improved Attendees Section */}
            <View style={styles.attendeesContainer}>
              <View style={styles.avatarStack}>
                {[1, 2, 3].map((index) => (
                  <LinearGradient
                    key={index}
                    colors={['#667eea', '#764ba2']}
                    style={[styles.avatarGradient, { zIndex: 4 - index }]}
                  >
                    <Ionicons name="person" size={8} color="#FFFFFF" />
                  </LinearGradient>
                ))}
                <View style={styles.attendeesCount}>
                  <Text style={styles.attendeesCountText}>+{event.attendees}</Text>
                </View>
              </View>
              <Text style={styles.attendeesText}>
                {event.maxAttendees ? `${event.attendees}/${event.maxAttendees}` : `${event.attendees}`} attending
              </Text>
            </View>

            {/* Enhanced Join Button */}
            <TouchableOpacity
              style={styles.joinButtonContainer}
              onPress={() => onJoin(event)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={event.price === 'Free' ? ['#00C851', '#007E33'] : ['#667eea', '#764ba2']}
                style={styles.joinButton}
              >
                <Ionicons 
                  name={event.price === 'Free' ? 'checkmark-circle' : 'card'} 
                  size={12} 
                  color="#FFFFFF" 
                  style={styles.joinButtonIcon}
                />
                <Text style={styles.joinButtonText}>
                  {event.price === 'Free' ? 'Join Free' : 'Register'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subtle Border Glow */}
      <View style={styles.borderGlow} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    marginBottom: SPACING.lg,
    marginHorizontal: 4,
    borderRadius: 24,
    overflow: 'hidden',
    // Enhanced shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  cardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    // Glassmorphism effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    // Pulsing animation effect (static for now)
    opacity: 0.9,
  },
  durationBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backdropFilter: 'blur(10px)',
  },
  durationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  floatingPriceBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4FACFE',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4FACFE',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 18,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  location: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  avatarGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attendeesCount: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 1,
  },
  attendeesCountText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#6B7280',
  },
  attendeesText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
  },
  joinButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    flexShrink: 0,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinButtonIcon: {
    marginRight: 3,
  },
  joinButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  borderGlow: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: -1,
  },
});
