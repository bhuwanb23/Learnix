import { useState, useEffect } from 'react';
import * as Font from 'expo-font';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Plus Jakarta Sans': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
        'Plus Jakarta Sans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
        'Plus Jakarta Sans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
        'Manrope': require('../assets/fonts/Manrope-Regular.ttf'),
        'Manrope-Medium': require('../assets/fonts/Manrope-Medium.ttf'),
        'Manrope-SemiBold': require('../assets/fonts/Manrope-SemiBold.ttf'),
        'Manrope-Bold': require('../assets/fonts/Manrope-Bold.ttf'),
      });
      setFontsLoaded(true);
    }

    loadFonts();
  }, []);

  return fontsLoaded;
};
