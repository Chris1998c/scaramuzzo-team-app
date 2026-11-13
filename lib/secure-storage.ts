import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage sessione Team App.
 * - Native: expo-secure-store (Keychain / Keystore)
 * - Web: sessionStorage (tab/PWA session; niente token in URL o localStorage)
 *
 * Non usare per dati non di sessione che devono sopravvivere al reload del browser.
 */

const WEB_PREFIX = 'scz_team_sess:';

function webKey(key: string): string {
  return `${WEB_PREFIX}${key}`;
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof sessionStorage === 'undefined') {
        return null;
      }
      return sessionStorage.getItem(webKey(key));
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof sessionStorage === 'undefined') {
        return;
      }
      sessionStorage.setItem(webKey(key), value);
    } catch {
      /* best-effort */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof sessionStorage === 'undefined') {
        return;
      }
      sessionStorage.removeItem(webKey(key));
    } catch {
      /* best-effort */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
