import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { twInstance } from '@/tw';

export type ColorScheme = 'light' | 'dark';

export interface ThemeContextValue {
  colorScheme: ColorScheme;
  isDark: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

export const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  isDark: false,
  setColorScheme: () => {},
  toggleColorScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const rnColorScheme = useRNColorScheme();
  const [colorScheme, setInternalColorScheme] = useState<ColorScheme>('light');

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') {
          setInternalColorScheme(saved);
          (twInstance as any).setColorScheme?.(saved);
        } else if (rnColorScheme === 'dark' || rnColorScheme === 'light') {
          setInternalColorScheme(rnColorScheme);
          (twInstance as any).setColorScheme?.(rnColorScheme);
        }
      })
      .catch(() => {});
  }, [rnColorScheme]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setInternalColorScheme(scheme);
    (twInstance as any).setColorScheme?.(scheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, scheme).catch(() => {});
  }, []);

  const toggleColorScheme = useCallback(() => {
    const next = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(next);
  }, [colorScheme, setColorScheme]);

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        isDark: colorScheme === 'dark',
        setColorScheme,
        toggleColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
