import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom hook to get safe area insets with additional bottom padding
export default function useSafeAreaInsetsWithPadding() {
  const insets = useSafeAreaInsets();
  
  return {
    ...insets,
    // Add extra bottom padding for better UX
    bottom: Math.max(insets.bottom, 20),
  };
}
