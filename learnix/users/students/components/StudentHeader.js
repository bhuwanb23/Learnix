import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

export default function StudentHeader({ activeTab, onProfilePress }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  // Match Dashboard horizontal rhythm (same as scroll paddingHorizontal on Home)
  const containerPaddingHorizontal = isDesktop ? 28 : isTablet ? 20 : 12;
  const headingSize = isDesktop ? 24 : isTablet ? 23 : 20;
  const actionIconSize = isTablet ? 25 : 22;
  // Push the whole card below the status bar / notch; inner layout unchanged (margin, not extra padding inside).
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);

  const mountainDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mountainLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mountainDrift, {
          toValue: 3,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(mountainDrift, {
          toValue: 0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    );

    mountainLoop.start();

    return () => {
      mountainLoop.stop();
    };
  }, [mountainDrift]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: containerPaddingHorizontal,
          marginHorizontal: isDesktop ? 28 : isTablet ? 20 : 12,
          marginTop: (isTablet ? SPACING.md : SPACING.sm) + safeTop,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <Animated.View style={[styles.mountainBack, { transform: [{ translateY: mountainDrift }] }]} />
      <Animated.View style={[styles.mountainMid, { transform: [{ translateY: mountainDrift }] }]} />
      <Animated.View style={[styles.mountainFront, { transform: [{ translateY: mountainDrift }] }]} />

      {/* Top Section */}
      <View style={[styles.topSection, isTablet && styles.topSectionTablet]}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={[styles.studentName, { fontSize: headingSize }]}>John Doe</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Profile */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onProfilePress}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={actionIconSize} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Notifications */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="notifications-outline" size={actionIconSize} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563eb',
    paddingTop: 4,
    paddingBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
    minHeight: 54,
  },
  topSectionTablet: {
    minHeight: 60,
  },
  mountainBack: {
    position: 'absolute',
    bottom: -28,
    left: -16,
    width: 180,
    height: 86,
    borderTopLeftRadius: 110,
    borderTopRightRadius: 110,
    backgroundColor: 'rgba(29, 78, 216, 0.45)',
    zIndex: 0,
  },
  mountainMid: {
    position: 'absolute',
    bottom: -34,
    left: 88,
    width: 210,
    height: 98,
    borderTopLeftRadius: 130,
    borderTopRightRadius: 130,
    backgroundColor: 'rgba(30, 64, 175, 0.5)',
    zIndex: 0,
  },
  mountainFront: {
    position: 'absolute',
    bottom: -42,
    right: -24,
    width: 210,
    height: 110,
    borderTopLeftRadius: 135,
    borderTopRightRadius: 135,
    backgroundColor: 'rgba(30, 58, 138, 0.65)',
    zIndex: 0,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 1,
    fontFamily: 'Manrope-Medium',
    letterSpacing: 0.2,
  },
  studentName: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    position: 'relative',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs + 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: BORDER_RADIUS.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.1,
  },
});
