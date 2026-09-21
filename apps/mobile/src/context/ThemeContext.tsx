import React, { createContext, useContext } from 'react';

type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: ColorScheme;
}

export const ThemeContext = createContext<ThemeContextValue>({ colorScheme: 'light' });

export function useThemeContext() {
  return useContext(ThemeContext);
}
