// Font constants matching the HTML design
// Plus Jakarta Sans for headlines, Manrope for body text

export const FONTS = {
  // Plus Jakarta Sans - For headlines, titles, and important text
  plusJakartaSans: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semiBold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
    extraBold: 'PlusJakartaSans-ExtraBold',
  },
  
  // Manrope - For body text, descriptions, and general content
  manrope: {
    regular: 'Manrope-Regular',
    medium: 'Manrope-Medium',
    semiBold: 'Manrope-SemiBold',
    bold: 'Manrope-Bold',
    extraBold: 'Manrope-ExtraBold',
  },
  
  // Convenience mappings for common use cases
  headline: 'PlusJakartaSans-Bold',
  headlineExtraBold: 'PlusJakartaSans-ExtraBold',
  headlineSemiBold: 'PlusJakartaSans-SemiBold',
  
  body: 'Manrope-Regular',
  bodyMedium: 'Manrope-Medium',
  bodySemiBold: 'Manrope-SemiBold',
  bodyBold: 'Manrope-Bold',
};

// Helper function to get font family
export const getFont = (type, weight = 'regular') => {
  if (type === 'headline') {
    return FONTS.plusJakartaSans[weight] || FONTS.headline;
  }
  return FONTS.manrope[weight] || FONTS.body;
};

// Predefined font styles for consistent usage
export const FONT_STYLES = {
  // Headlines (Plus Jakarta Sans)
  h1: {
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 36,
    lineHeight: 44,
  },
  h2: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 30,
    lineHeight: 38,
  },
  h3: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  
  // Body text (Manrope)
  bodyLarge: {
    fontFamily: 'Manrope-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Labels and buttons
  label: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
};
