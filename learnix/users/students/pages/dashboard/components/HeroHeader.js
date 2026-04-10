import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

export default function HeroHeader({ userData }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Abstract background shapes */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      
      <View style={styles.content}>
        <Text style={styles.greeting}>Good Morning, {userData.name}</Text>
        <Text style={styles.subtitle}>{userData.greeting}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 16,
    padding: 32,
    backgroundColor: '#2563eb',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bgShape1: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bgShape2: {
    position: 'absolute',
    left: -25,
    bottom: -25,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(123, 156, 255, 0.2)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    lineHeight: 22,
    fontFamily: 'Manrope-Medium',
  },
});
