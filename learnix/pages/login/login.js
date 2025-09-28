import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BlurView from '../../components/BlurView';

// Import components
import LoginCard from './components/LoginCard';
import SocialLogin from './components/SocialLogin';
import AnimatedBackground from './components/AnimatedBackground';
import FloatingElements from './components/FloatingElements';

// Import constants
import { COLORS, GRADIENTS, TYPOGRAPHY, ANIMATIONS } from './constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async (credentials) => {
    setIsLoading(true);
    // Simulate login process
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to main app
      navigation.navigate('Main');
    }, 2000);
  };

  const handleSocialLogin = (provider) => {
    console.log(`Login with ${provider}`);
    // Handle social login
  };

  const handleForgotPassword = () => {
    console.log('Forgot password');
    // Handle forgot password
  };

  const handleSignUp = () => {
    console.log('Sign up');
    // Navigate to sign up
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Animated Background */}
        <AnimatedBackground />
        
        {/* Floating Elements */}
        <FloatingElements />
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>Learnix</Text>
              <Text style={styles.subtitle}>Welcome back to your campus</Text>
            </View>

            {/* Login Card */}
            <LoginCard
              onLogin={handleLogin}
              onForgotPassword={handleForgotPassword}
              isLoading={isLoading}
            />

            {/* Social Login */}
            <SocialLogin onSocialLogin={handleSocialLogin} />

            {/* Sign Up Link */}
            <TouchableOpacity style={styles.signUpContainer} onPress={handleSignUp}>
              <Text style={styles.signUpText}>
                Don't have an account? <Text style={styles.signUpLink}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  signUpContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  signUpText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  signUpLink: {
    color: COLORS.accent,
    fontWeight: 'bold',
  },
});
