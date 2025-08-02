import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
export type themeType = {
    background: string;
    highlight: string;
    primary: string;
    secondary: string;
    warning: string;
    card: string;
}
export const darkTheme = {
    background: 'black',
    highlight: "#c74515",
    primary: 'white',
    secondary: '#6c757d',
    warning: 'red',
    card: '#1a1a1a',
  };
  
  export const lightTheme = {
    background: '#f8f9fa',
    highlight: "#c74515",
    primary: '#2c3e50',
    secondary: '#6c757d',
    warning: '#e74c3c',
    card: '#ffffff',
  };
  
  export type ThemeType = themeType

const ThemeContext = createContext<{
  theme: ThemeType;
  toggleTheme: () => void;
}>({
  theme: lightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Get initial theme based on system preference
  const getInitialTheme = () => {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? darkTheme : lightTheme;
  };

  const [theme, setTheme] = useState<ThemeType>(getInitialTheme);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const newTheme = colorScheme === 'dark' ? darkTheme : lightTheme;
      setTheme(newTheme);
    });

    return () => subscription?.remove();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === darkTheme ? lightTheme : darkTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
