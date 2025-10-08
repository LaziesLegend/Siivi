import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ThemeColor = 'default' | 'blue' | 'green' | 'purple' | 'orange';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultThemeColor?: ThemeColor;
  storageKey?: string;
  colorStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  themeColor: ThemeColor;
  setTheme: (theme: Theme) => void;
  setThemeColor: (themeColor: ThemeColor) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  themeColor: 'default',
  setTheme: () => null,
  setThemeColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultThemeColor = 'default',
  storageKey = 'ui-theme',
  colorStorageKey = 'ui-theme-color',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [themeColor, setThemeColor] = useState<ThemeColor>(
    () => (localStorage.getItem(colorStorageKey) as ThemeColor) || defaultThemeColor
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    // Remove all theme color classes
    root.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-purple', 'theme-orange');
    
    // Add the selected theme color class
    if (themeColor !== 'default') {
      root.classList.add(`theme-${themeColor}`);
    }
  }, [theme, themeColor]);

  const value = {
    theme,
    themeColor,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    setThemeColor: (themeColor: ThemeColor) => {
      localStorage.setItem(colorStorageKey, themeColor);
      setThemeColor(themeColor);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};