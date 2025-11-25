/**
 * Theme colors and design tokens
 * Centralized design system using Tailwind tokens
 * Dark theme with zinc backgrounds and orange accents
 */

import { Platform } from 'react-native';

// Orange accent colors (from icon gradient: bright orange → reddish-orange)
const accentOrange = '#F97316'; // accent-500 (primary)
const accentOrangeLight = '#FB923C'; // accent-400
const accentOrangeDark = '#EA580C'; // accent-600

// Zinc backgrounds for dark theme
const backgroundPrimary = '#18181B'; // zinc-900
const backgroundSecondary = '#27272A'; // zinc-800
const backgroundTertiary = '#3F3F46'; // zinc-700

// Text colors (zinc scale)
const textPrimary = '#FAFAFA'; // zinc-50
const textSecondary = '#A1A1AA'; // zinc-400
const textTertiary = '#71717A'; // zinc-500

// Border colors
const borderDefault = '#3F3F46'; // zinc-700

export const Colors = {
  light: {
    text: '#18181B', // zinc-900 (inverse for light mode)
    background: '#FAFAFA', // zinc-50
    tint: accentOrange,
    icon: '#71717A', // zinc-500
    tabIconDefault: '#71717A',
    tabIconSelected: accentOrange,
  },
  dark: {
    text: textPrimary,
    background: backgroundPrimary,
    tint: accentOrange, // Orange accent (replaces blue)
    icon: textSecondary,
    tabIconDefault: textSecondary,
    tabIconSelected: accentOrange, // Orange accent (replaces white)
  },
};

// Design tokens exported for programmatic access
export const DesignTokens = {
  colors: {
    accent: {
      primary: accentOrange,
      light: accentOrangeLight,
      dark: accentOrangeDark,
    },
    background: {
      primary: backgroundPrimary,
      secondary: backgroundSecondary,
      tertiary: backgroundTertiary,
    },
    text: {
      primary: textPrimary,
      secondary: textSecondary,
      tertiary: textTertiary,
    },
    border: {
      default: borderDefault,
    },
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
