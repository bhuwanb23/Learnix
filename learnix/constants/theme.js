// Color palette - Clean ERP Style
export const COLORS = {
  // Primary colors
  primary: '#2563eb', // Professional blue
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  secondary: '#64748b', // Neutral gray
  accent: '#0ea5e9', // Light blue accent
  
  // Neutral colors
  white: '#ffffff',
  black: '#0f172a',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  
  // Text colors
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textLight: '#94a3b8',
  
  // Status colors
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0284c7',
  
  // Background colors
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

export const DARK_COLORS = {
  // Primary colors
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',
  secondary: '#94a3b8',
  accent: '#38bdf8',
  
  // Neutral colors
  white: '#0f172a',
  black: '#ffffff',
  gray50: '#1e293b',
  gray100: '#334155',
  gray200: '#475569',
  gray300: '#64748b',
  gray400: '#94a3b8',
  gray500: '#cbd5e1',
  gray600: '#e2e8f0',
  gray700: '#f1f5f9',
  gray800: '#f8fafc',
  gray900: '#ffffff',
  
  // Text colors
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
  textLight: '#64748b',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  
  // Background colors
  background: '#0f172a',
  backgroundSecondary: '#1e293b',
  surface: '#1e293b',
  surfaceHover: '#334155',
  border: '#334155',
  borderLight: '#1e293b',
};

// Gradient definitions - Minimal and professional
export const GRADIENTS = {
  primary: ['#2563eb', '#3b82f6'],
  secondary: ['#64748b', '#94a3b8'],
  accent: ['#0ea5e9', '#38bdf8'],
  background: ['#ffffff', '#f8fafc'],
  card: ['#ffffff', '#f8fafc'],
  button: ['#2563eb', '#1d4ed8'],
  subtle: ['rgba(37, 99, 235, 0.05)', 'rgba(37, 99, 235, 0.02)'],
};

// Typography - Clean and readable
export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  
  // Font sizes (with both naming conventions for compatibility)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  
  // Font weights (with both naming conventions for compatibility)
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
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

// Animation configurations - Subtle and professional
export const ANIMATIONS = {
  // Durations
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
    slowest: 700,
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  
  // Animation presets - Minimal
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  
  slideUp: {
    from: { transform: [{ translateY: 20 }] },
    to: { transform: [{ translateY: 0 }] },
  },
  
  slideDown: {
    from: { transform: [{ translateY: -20 }] },
    to: { transform: [{ translateY: 0 }] },
  },
  
  slideLeft: {
    from: { transform: [{ translateX: 20 }] },
    to: { transform: [{ translateX: 0 }] },
  },
  
  slideRight: {
    from: { transform: [{ translateX: -20 }] },
    to: { transform: [{ translateX: 0 }] },
  },
  
  scale: {
    from: { transform: [{ scale: 0.95 }] },
    to: { transform: [{ scale: 1 }] },
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

// Border radius - Clean and minimal
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  full: 9999,
};

// Shadows - Subtle and professional
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};