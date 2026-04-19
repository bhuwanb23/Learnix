import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import AppNavigator from './navigation/AppNavigator';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // Plus Jakarta Sans variants (aligned with requested 400/600/700/800)
          'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
          'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
          'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
          'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
          'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,

          // Backward compatibility aliases
          'Plus Jakarta Sans': PlusJakartaSans_400Regular,
          'Plus Jakarta Sans-SemiBold': PlusJakartaSans_600SemiBold,
          'Plus Jakarta Sans-Bold': PlusJakartaSans_700Bold,

          // Manrope variants
          'Manrope-Regular': Manrope_400Regular,
          'Manrope-Medium': Manrope_500Medium,
          'Manrope-SemiBold': Manrope_600SemiBold,
          'Manrope-Bold': Manrope_700Bold,
          'Manrope-ExtraBold': Manrope_800ExtraBold,
          'Manrope': Manrope_400Regular,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Font loading error (fonts not installed yet):', error.message);
        // Continue even if fonts fail to load - will use system fonts
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0050d4" translucent />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
