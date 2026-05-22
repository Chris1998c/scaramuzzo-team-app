import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { requireValidMobileSession } from '@/lib/mobile-session-read';
import { SHELL, SPINNER_TINT } from '@/constants/shell-theme';

/**
 * Gate iniziale: niente shell drawer — solo redirect verso login o area autenticata.
 */
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await requireValidMobileSession();
        if (cancelled) return;
        if (session !== null) {
          router.replace('/(drawer)/home');
        } else {
          router.replace('/login');
        }
      } catch {
        if (!cancelled) {
          router.replace('/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={SPINNER_TINT} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SHELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
