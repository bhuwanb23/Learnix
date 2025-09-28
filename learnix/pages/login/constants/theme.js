// Color palette
export const COLORS = {
  // Primary colors
  primary: '#1e3a8a', // Deep blue
  primaryDark: '#1e40af',
  secondary: '#3b82f6', // Blue
  accent: '#8b5cf6', // Purple
  accentLight: '#a78bfa',
  
  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  textLight: '#e2e8f0',
  textDark: '#1e293b',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Background colors
  background: '#0f172a',
  surface: 'rgba(255, 255, 255, 0.1)',
  surfaceLight: 'rgba(255, 255, 255, 0.05)',
};

// Gradient definitions
export const GRADIENTS = {
  primary: ['#1e3a8a', '#3b82f6', '#8b5cf6'],
  secondary: ['#3b82f6', '#8b5cf6', '#ec4899'],
  accent: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
  background: ['#0f172a', '#1e293b', '#334155'],
  card: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
  button: ['#8b5cf6', '#a78bfa'],
  wave: ['rgba(59, 130, 246, 0.2)', 'rgba(147, 51, 234, 0.1)', 'transparent'],
};

// Typography
export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  
  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: -0.025,
    normal: 0,
    wide: 0.025,
    wider: 0.05,
    widest: 0.1,
  },
};

// Animation configurations
export const ANIMATIONS = {
  // Durations
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 800,
    slowest: 1000,
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  
  // Animation presets
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  
  slideUp: {
    from: { transform: [{ translateY: 50 }] },
    to: { transform: [{ translateY: 0 }] },
  },
  
  slideDown: {
    from: { transform: [{ translateY: -50 }] },
    to: { transform: [{ translateY: 0 }] },
  },
  
  slideLeft: {
    from: { transform: [{ translateX: 50 }] },
    to: { transform: [{ translateX: 0 }] },
  },
  
  slideRight: {
    from: { transform: [{ translateX: -50 }] },
    to: { transform: [{ translateX: 0 }] },
  },
  
  scale: {
    from: { transform: [{ scale: 0.8 }] },
    to: { transform: [{ scale: 1 }] },
  },
  
  rotate: {
    from: { transform: [{ rotate: '0deg' }] },
    to: { transform: [{ rotate: '360deg' }] },
  },
};

// Spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
};

// Border radius
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
