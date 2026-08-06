import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

/**
 * SlorCalcPro brand themes (Material Design 3).
 * Palette: deep navy (professional) + solar amber (accent).
 */
const shared = {
  roundness: 3,
};

export const lightTheme = {
  ...MD3LightTheme,
  ...shared,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0B4F6C',
    onPrimary: '#FFFFFF',
    primaryContainer: '#CFE8F3',
    onPrimaryContainer: '#001E2A',
    secondary: '#F5A623',
    onSecondary: '#2A1600',
    secondaryContainer: '#FFDCB0',
    onSecondaryContainer: '#3A2300',
    tertiary: '#1B7F4B',
    onTertiary: '#FFFFFF',
    background: '#F8FAFB',
    onBackground: '#131C20',
    surface: '#FFFFFF',
    onSurface: '#131C20',
    surfaceVariant: '#E5EDF1',
    onSurfaceVariant: '#3F4850',
    outline: '#6F7C84',
    error: '#B3261E',
    onError: '#FFFFFF',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  ...shared,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#9CCFE8',
    onPrimary: '#00344A',
    primaryContainer: '#0A4C68',
    onPrimaryContainer: '#CFE8F3',
    secondary: '#F5A623',
    onSecondary: '#3A2300',
    secondaryContainer: '#5C3800',
    onSecondaryContainer: '#FFDCB0',
    tertiary: '#6FE0A0',
    onTertiary: '#00391F',
    background: '#101418',
    onBackground: '#DEE8EC',
    surface: '#101418',
    onSurface: '#DEE8EC',
    surfaceVariant: '#1C262C',
    onSurfaceVariant: '#BCC7CE',
    outline: '#869299',
    error: '#FFB4AB',
    onError: '#690005',
  },
};

export type AppTheme = typeof lightTheme;
