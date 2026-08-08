import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

/**
 * SlorCalcPro brand themes (Material Design 3).
 *
 * Identity: deep solar navy (sky/water) primary, warm sun-amber secondary,
 * and leaf-green tertiary for eco/battery. A near-full MD3 token set keeps
 * cards, dialogs, FABs and overlays consistently on-brand.
 */
const shared = {
  roundness: 8,
};

export const lightTheme = {
  ...MD3LightTheme,
  ...shared,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0B4F6C',
    onPrimary: '#FFFFFF',
    primaryContainer: '#CEE8F4',
    onPrimaryContainer: '#001F2C',
    secondary: '#F5A623',
    onSecondary: '#2A1600',
    secondaryContainer: '#FFDDB3',
    onSecondaryContainer: '#3A2300',
    tertiary: '#1B7F4B',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#C5F0D2',
    onTertiaryContainer: '#00391F',
    background: '#F6FAFC',
    onBackground: '#131C20',
    surface: '#FFFFFF',
    onSurface: '#131C20',
    surfaceVariant: '#E4ECF1',
    onSurfaceVariant: '#3F4850',
    outline: '#6F7C84',
    outlineVariant: '#D2DEE5',
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',
    surfaceTint: '#0B4F6C',
    inverseSurface: '#2B3439',
    inverseOnSurface: '#EDF2F5',
    inversePrimary: '#9CCFE8',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 30, 44, 0.7)',
    surfaceDisabled: 'rgba(19, 28, 32, 0.12)',
    onSurfaceDisabled: 'rgba(19, 28, 32, 0.38)',
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
    secondary: '#FFC05B',
    onSecondary: '#3A2300',
    secondaryContainer: '#5C3800',
    onSecondaryContainer: '#FFDCB0',
    tertiary: '#6FE0A0',
    onTertiary: '#00391F',
    tertiaryContainer: '#0A5C35',
    onTertiaryContainer: '#8FF8B6',
    background: '#0E1418',
    onBackground: '#DEE8EC',
    surface: '#0E1418',
    onSurface: '#DEE8EC',
    surfaceVariant: '#1C262C',
    onSurfaceVariant: '#BCC7CE',
    outline: '#869299',
    outlineVariant: '#2C3A41',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    surfaceTint: '#9CCFE8',
    inverseSurface: '#DEE8EC',
    inverseOnSurface: '#2B3439',
    inversePrimary: '#0B4F6C',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(14, 20, 24, 0.7)',
    surfaceDisabled: 'rgba(222, 232, 236, 0.12)',
    onSurfaceDisabled: 'rgba(222, 232, 236, 0.38)',
  },
};

export type AppTheme = typeof lightTheme;
