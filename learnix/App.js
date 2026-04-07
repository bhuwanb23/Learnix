import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // Plus Jakarta Sans variants
          'PlusJakartaSans-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
          'PlusJakartaSans-Medium': require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
          'PlusJakartaSans-SemiBold': require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
          'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
          'PlusJakartaSans-ExtraBold': require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
          
          // Manrope variants
          'Manrope-Regular': require('./assets/fonts/Manrope-Regular.ttf'),
          'Manrope-Medium': require('./assets/fonts/Manrope-Medium.ttf'),
          'Manrope-SemiBold': require('./assets/fonts/Manrope-SemiBold.ttf'),
          'Manrope-Bold': require('./assets/fonts/Manrope-Bold.ttf'),
          'Manrope-ExtraBold': require('./assets/fonts/Manrope-ExtraBold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Font loading error:', error);
        // Continue even if fonts fail to load
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
