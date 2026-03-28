import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import { API_BASE_URL } from '@/constants/api';
import { readMobileErrorPayload } from '@/lib/api-session';
import { readStaffIdOrNull } from '@/lib/mobile-session-read';
import {
  collaboratorNameFromLoginPayload,
  effectiveLoginPayload,
} from '@/lib/collaborator-identity';
import {
  BORDER_BRONZE,
  BORDER_INSET,
  CTA_ON_LIGHT,
  CTA_SURFACE,
  SHELL,
  SURFACE_CARD,
  SURFACE_SUNKEN,
  TEXT_MAIN,
  TEXT_MUTED,
} from '@/constants/shell-theme';

const RADIUS_LG = 24;
const RADIUS_MD = 20;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const goHomeIfSession = useCallback(async () => {
    try {
      const staffId = await readStaffIdOrNull();
      if (staffId !== null) {
        router.replace('/(drawer)/home');
      }
    } catch {
      /* stay on login */
    }
  }, [router]);

  useEffect(() => {
    void goHomeIfSession();
  }, [goHomeIfSession]);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/mobile/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, pin }),
      });

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          if (!response.ok) {
            Alert.alert('Errore', 'Risposta non valida dal server.');
            return;
          }
        }
      }

      if (!response.ok) {
        const message =
          readMobileErrorPayload(data) ?? 'Errore durante il login';
        Alert.alert(message);
        return;
      }

      const payload = effectiveLoginPayload(data);
      const staffIdVal = String(payload.staff_id ?? '');
      const salonIdVal = String(payload.salon_id ?? '');
      const nameFromApi = collaboratorNameFromLoginPayload(payload);
      const staffCodeFromApi =
        payload.staff_code != null ? String(payload.staff_code).trim() : '';
      const staffCodeToSave = staffCodeFromApi || code.trim();

      await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.staffId, staffIdVal);
      await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.salonId, salonIdVal);
      await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.collaboratorName, nameFromApi);
      await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.staffCode, staffCodeToSave);

      const accessToken =
        typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
      const tokenType =
        typeof payload.token_type === 'string' ? payload.token_type.trim() : '';
      if (accessToken) {
        await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.accessToken, accessToken);
      } else {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.accessToken).catch(() => {});
      }
      if (tokenType) {
        await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.tokenType, tokenType);
      } else {
        await SecureStore.deleteItemAsync(AUTH_STORAGE_KEYS.tokenType).catch(() => {});
      }

      router.replace('/(drawer)/home');
    } catch {
      Alert.alert('Errore di rete', 'Controlla la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.loginShell}>
        <View style={styles.header}>
          <Text style={styles.heroTitle}>Scaramuzzo Team</Text>
          <Text style={styles.heroSubtitleMuted}>Accesso sicuro</Text>
        </View>

        <View style={styles.loginCard}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Codice collaboratore"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="PIN"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
            secureTextEntry
            keyboardType="number-pad"
          />

          <Pressable
            style={({ pressed }) => [
              styles.ctaPrimary,
              styles.loginCta,
              (pressed || loading) && styles.ctaPressed,
              loading && styles.ctaDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.ctaPrimaryLabel}>
              {loading ? 'Caricamento...' : 'Accedi'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SHELL,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  loginShell: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    color: TEXT_MAIN,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitleMuted: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: RADIUS_LG,
    padding: 24,
    gap: 16,
    marginTop: 28,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  input: {
    width: '100%',
    backgroundColor: SURFACE_SUNKEN,
    color: TEXT_MAIN,
    borderRadius: RADIUS_MD,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: BORDER_INSET,
  },
  loginCta: {
    marginTop: 8,
  },
  ctaPrimary: {
    width: '100%',
    backgroundColor: CTA_SURFACE,
    borderRadius: RADIUS_MD,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaPrimaryLabel: {
    color: CTA_ON_LIGHT,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
