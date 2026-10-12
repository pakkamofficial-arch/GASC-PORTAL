import { Platform } from 'react-native';

export const theme = {
  colors: {
    // Primary Academic Brand
    primary: '#176B3A',         // Primary dark green
    primaryDark: '#0E4624',     // Deep government green for headers
    primaryLight: '#23894C',
    secondary: '#2E7D4F',       // Secondary institutional green

    // Surfaces & Backgrounds
    background: '#F1F8F1',      // Light mint background
    surface: '#FFFFFF',         // Crisp white card surface
    surfaceSubtle: '#F8FAF8',   // Soft tinted surface
    inputBg: '#FAFCFA',         // Neutral form input background

    // Typography
    text: '#202820',            // High-contrast primary text
    textSecondary: '#687268',   // Accessible secondary text
    textMuted: '#859185',       // De-emphasized metadata
    textWhite: '#FFFFFF',

    // Structural Elements
    border: '#DCE7DC',          // Neutral clean border
    borderFocus: '#176B3A',     // Active focus border
    divider: '#E4EDE4',         // Thin section divider

    // Functional State Colors (WCAG AA Compliant)
    success: '#1B8A46',         // Accessible green
    successBg: '#E8F5E9',
    warning: '#C88308',         // Accessible amber
    warningBg: '#FFF8E1',
    error: '#D32F2F',           // Accessible red
    errorBg: '#FFEBEE',
    info: '#1976D2',            // Accessible blue
    infoBg: '#E3F2FD',

    // Soft Brand Accent
    tint: '#E6F3E6',            // Soft mint highlight
    badgeNeutralBg: '#F0F4F0',
  },

  typography: {
    fonts: {
      regular: 'Inter_400Regular',
      medium: 'Inter_500Medium',
      semibold: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
      tamilRegular: 'NotoSansTamil_400Regular',
      tamilMedium: 'NotoSansTamil_500Medium',
      tamilSemiBold: 'NotoSansTamil_600SemiBold',
      tamilBold: 'NotoSansTamil_700Bold',
    },
    families: {
      primary: 'Inter_400Regular',
      primaryMedium: 'Inter_500Medium',
      primarySemiBold: 'Inter_600SemiBold',
      primaryBold: 'Inter_700Bold',
      tamil: 'NotoSansTamil_400Regular',
      tamilMedium: 'NotoSansTamil_500Medium',
      tamilBold: 'NotoSansTamil_700Bold',
    },
    sizes: {
      xs: 12,      // Smallest accessible metadata (minimum 12px)
      sm: 13,      // Form labels & compact details
      base: 15,    // Standard body text
      md: 16,      // Button labels, prominent body
      lg: 18,      // Section titles
      xl: 20,      // Prominent group titles
      xxl: 24,     // Screen headings
      metric: 26,  // Large numerical metric values
      title: 28,   // Main header screen title
    },
    lineHeights: {
      tight: 18,
      normal: 22,
      relaxed: 26,
      heading: 32,
    },
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  borderRadius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },

  shadows: {
    none: {
      shadowColor: 'transparent',
      elevation: 0,
    },
    subtle: {
      shadowColor: '#176B3A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    card: {
      shadowColor: '#176B3A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
  },
};

export type Theme = typeof theme;
