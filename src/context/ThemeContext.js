import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@emper_theme_mode';

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext({
  isDark: false,
  mode: 'system',
  colors: lightColors,
  setMode: () => {},
});

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ThemeProvider = ({ children }) => {
  // 'light' | 'dark' | 'system'
  const [mode, setModeState] = useState('system');
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {}); // Non-critical — fall through to 'system'
  }, []);

  // Persist mode change
  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  }, []);

  // Resolve effective dark/light
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && systemScheme === 'dark');

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, mode, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
