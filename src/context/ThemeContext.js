import React, { createContext, useContext, useState } from 'react';
import { theme } from '../theme/tokens';

const ThemeContext = createContext({ ...theme, mode: 'light', toggleMode: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const colors = mode === 'dark' ? {
    ...theme.colors,
    ink: '#F4F7F5',
    inkSoft: '#B5C1BC',
    muted: '#B5C1BC',
    canvas: '#101A17',
    surface: '#1A2822',
    border: '#33443B',
    limePale: '#233B2E',
    errorPale: '#482625',
  } : theme.colors;
  const value = {
    ...theme,
    colors,
    mode,
    toggleMode: () => setMode(current => current === 'light' ? 'dark' : 'light'),
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
