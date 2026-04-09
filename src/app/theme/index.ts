import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

import {darkColors, lightColors} from '@/app/theme/colors';
import {radii, spacing} from '@/app/theme/spacing';
import {typography} from '@/app/theme/typography';

export type ColorSchemePreference = 'system' | 'light' | 'dark';
export type AppThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: AppThemeMode;
  colors: typeof lightColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  navigationTheme: NavigationTheme;
}

const createNavigationTheme = (
  mode: AppThemeMode,
  colors: typeof lightColors,
): NavigationTheme => {
  const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
};

export const createAppTheme = (mode: AppThemeMode): AppTheme => {
  const colors = mode === 'dark' ? darkColors : lightColors;

  return {
    mode,
    colors,
    spacing,
    radii,
    typography,
    navigationTheme: createNavigationTheme(mode, colors),
  };
};

