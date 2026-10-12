import React, { createContext, useContext } from 'react';
import { theme } from '../theme/tokens';

const ThemeContext = createContext(theme);

export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
