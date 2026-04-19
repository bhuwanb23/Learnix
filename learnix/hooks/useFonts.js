import { useState, useEffect } from 'react';
import * as Font from 'expo-font';
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

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Plus Jakarta Sans': PlusJakartaSans_400Regular,
        'Plus Jakarta Sans-SemiBold': PlusJakartaSans_600SemiBold,
        'Plus Jakarta Sans-Bold': PlusJakartaSans_700Bold,
        'Plus Jakarta Sans-ExtraBold': PlusJakartaSans_800ExtraBold,
        'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
        'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
        'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
        'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
        'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
        'Manrope': Manrope_400Regular,
        'Manrope-Regular': Manrope_400Regular,
        'Manrope-Medium': Manrope_500Medium,
        'Manrope-SemiBold': Manrope_600SemiBold,
        'Manrope-Bold': Manrope_700Bold,
        'Manrope-ExtraBold': Manrope_800ExtraBold,
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  return fontsLoaded;
};
