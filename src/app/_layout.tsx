import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from '@/db';
import { setDbService } from '@/store/dbService';
import { useReferenceStore } from '@/store/reference';
import { useSettingsStore } from '@/store/settings';
import { darkTheme, lightTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await initDatabase();
        setDbService(db);
        await Promise.all([
          useSettingsStore.getState().load(),
          useReferenceStore.getState().load(),
        ]);
      } catch (error) {
        console.error('Database bootstrap failed', error);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const effectiveScheme = themeMode === 'system' ? colorScheme : themeMode;
  const theme = effectiveScheme === 'dark' ? darkTheme : lightTheme;

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="project/new" />
          <Stack.Screen name="project/[id]" />
          <Stack.Screen name="project/scenario/[scenarioId]" />
          <Stack.Screen name="docs" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
