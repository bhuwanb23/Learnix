import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function ExamPreparation({ 
  preparationItems = [
    {
      id: '1',
      title: 'Past Papers',
      description: '15 papers available',
      icon: 'document-text-outline',
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      onPress: () => {},
    },
    {
      id: '2',
      title: 'AI Predictions',
      description: 'Likely exam questions',
      icon: 'bulb-outline',
      color: '#8B5CF6',
      backgroundColor: '#F3E8FF',
      onPress: () => {},
    },
    {
      id: '3',
      title: 'Study Analytics',
      description: 'Track your progress',
      icon: 'analytics-outline',
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      onPress: () => {},
    },
  ],
  onItemPress 
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <Text style={styles.title}>Exam Preparation</Text>
      
      <View style={styles.itemsContainer}>
        {preparationItems.map((item, index) => (
          <Animated.View
            key={item.id}
            style={{
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 30 + (index * 10)],
                  extrapolate: 'clamp',
                }),
              }],
            }}
          >
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() => onItemPress && onItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemLeft}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: item.backgroundColor }
                  ]}>
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={item.color}
                    />
                  </View>
                  
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  </View>
                </View>
                
                <View style={styles.itemRight}>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </View>
              </View>
              
              {/* Hover effect background */}
              <View style={styles.hoverBackground} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  itemsContainer: {
    gap: SPACING.sm,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
  },
  itemRight: {
    marginLeft: SPACING.sm,
  },
  hoverBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.02)',
    opacity: 0,
  },
});
