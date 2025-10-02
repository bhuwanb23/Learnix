import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export default function TabNavigation({ 
  tabs = [
    { id: 'dashboard', title: 'Dashboard' },
    { id: 'assignments', title: 'Assignments' },
    { id: 'exams', title: 'Exams' },
  ],
  activeTab = 'assignments',
  onTabPress 
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (activeIndex !== -1) {
      Animated.spring(slideAnim, {
        toValue: activeIndex,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab, tabs]);

  const handleContainerLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const tabWidth = containerWidth / tabs.length;
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <View style={styles.container}>
      <View 
        style={styles.tabContainer}
        onLayout={handleContainerLayout}
      >
        {/* Tab buttons */}
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress && onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Active tab indicator */}
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: tabWidth,
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: tabs.map((_, i) => i),
                    outputRange: tabs.map((_, i) => i * tabWidth),
                    extrapolate: 'clamp',
                  }),
                }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    position: 'relative',
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
