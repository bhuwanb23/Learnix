import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

export default function TabNavigation({ 
  tabs = [
    { id: 'dashboard', title: 'Dashboard', icon: 'grid-outline' },
    { id: 'assignments', title: 'Assignments', icon: 'document-text-outline' },
    { id: 'exams', title: 'Exams', icon: 'school-outline' },
  ],
  activeTab = 'assignments',
  onTabPress 
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (activeIndex !== -1) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: activeIndex,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
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
      <LinearGradient
        colors={['#f8fafc', '#ffffff']}
        style={styles.backgroundGradient}
      />
      
      <View 
        style={styles.tabContainer}
        onLayout={handleContainerLayout}
      >
        {/* Tab buttons */}
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => onTabPress && onTabPress(tab.id)}
            activeOpacity={0.8}
          >
            <View style={styles.tabContent}>
              <View style={[
                styles.iconContainer,
                activeTab === tab.id && styles.activeIconContainer
              ]}>
                <Text style={[
                  styles.tabIcon,
                  activeTab === tab.id && styles.activeTabIcon
                ]}>
                  {tab.icon === 'grid-outline' ? '📊' : 
                   tab.icon === 'document-text-outline' ? '📝' : 
                   tab.icon === 'school-outline' ? '🎓' : '📋'}
                </Text>
              </View>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.activeTabText,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tab.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Active tab indicator */}
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: tabWidth - 8,
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: tabs.map((_, i) => i),
                      outputRange: tabs.map((_, i) => i * tabWidth + 4),
                      extrapolate: 'clamp',
                    }),
                  },
                  { scale: scaleAnim }
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#2563eb', '#1d4ed8']}
              style={styles.indicatorGradient}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  tabIcon: {
    fontSize: 12,
    opacity: 0.7,
  },
  activeTabIcon: {
    opacity: 1,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: 'Inter-Medium',
    numberOfLines: 1,
    maxWidth: '100%',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  indicatorGradient: {
    flex: 1,
    borderRadius: 2,
  },
});
