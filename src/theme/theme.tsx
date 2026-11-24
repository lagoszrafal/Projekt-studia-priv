import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ColorTokens } from './colors';
import { radii, spacing } from './spacing';
import { typography } from './typography';

export type ThemePreference = 'light' | 'dark' | 'system';
export type VaultlyTheme = {
  colors: ColorTokens; spacing: typeof spacing; radii: typeof radii;
  typography: typeof typography; isDark: boolean;
};
const ThemeContext = createContext<VaultlyTheme | null>(null);

export function ThemeProvider({ children, preference = 'system' }: PropsWithChildren<{ preference?: ThemePreference }>) {
  const system = useColorScheme();
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark');
  const value = useMemo(
    () => ({ colors: isDark ? darkColors : lightColors, spacing, radii, typography, isDark }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): VaultlyTheme {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme musi być użyte wewnątrz ThemeProvider.');
  return value;
}
