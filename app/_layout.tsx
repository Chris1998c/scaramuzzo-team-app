import 'react-native-gesture-handler';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AppIntroSplash } from '@/components/app-intro-splash';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Fuori da AUTH_STORAGE_KEYS: non viene cancellato da clearSession. */
const INTRO_SPLASH_SEEN_KEY = 'team_app_intro_splash_seen_v1';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [introMode, setIntroMode] = useState<'loading' | 'show' | 'hidden'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await SecureStore.getItemAsync(INTRO_SPLASH_SEEN_KEY);
        if (!cancelled) {
          setIntroMode(seen === '1' ? 'hidden' : 'show');
        }
      } catch {
        if (!cancelled) {
          setIntroMode('show');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onIntroFinish = useCallback(() => {
    setIntroMode('hidden');
    void SecureStore.setItemAsync(INTRO_SPLASH_SEEN_KEY, '1').catch(() => {
      /* best-effort */
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
          {introMode === 'show' ? <AppIntroSplash onFinish={onIntroFinish} /> : null}
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
