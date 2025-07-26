/**
 * DishDecide Brand Colors
 * Warm, inviting palette that creates an emotionally safe and supportive environment
 */

// Brand colors
export const BrandColors = {
  primary: '#E67E50',      // Warm signature orange
  primaryLight: '#F4A577',  // Lighter orange for hover states
  cream: '#FDF6F0',        // Light, grounding background
  burgundy: '#8B3A3A',     // Deep burgundy for trust and depth
  softBlack: '#2C2825',    // Warm black, not harsh
  warmGray: '#6B6560',     // Utility gray with warmth
  lightBeige: '#F5E6D3',   // Input backgrounds, soft surfaces
  borderLight: '#E6D5C7',  // Subtle borders
  success: '#7CB342',      // Soft green for success states
  white: '#FFFFFF',        // Pure white
};

// Legacy color system (for compatibility)
const tintColorLight = BrandColors.primary;
const tintColorDark = BrandColors.cream;

export const Colors = {
  light: {
    text: BrandColors.softBlack,
    background: BrandColors.cream,
    tint: tintColorLight,
    icon: BrandColors.warmGray,
    tabIconDefault: BrandColors.warmGray,
    tabIconSelected: BrandColors.primary,
  },
  dark: {
    text: BrandColors.cream,
    background: BrandColors.softBlack,
    tint: tintColorDark,
    icon: BrandColors.warmGray,
    tabIconDefault: BrandColors.warmGray,
    tabIconSelected: BrandColors.cream,
  },
};
