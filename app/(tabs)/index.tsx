import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT_IN = '#4ade80';
const GOLD = '#f3d8b6';
const CARD = '#111';
const CARD_ELEVATED = '#161616';
const MUTED = '#737373';
const BG_DEEP = '#050505';
const RADIUS_LG = 24;
const RADIUS_MD = 20;

const STORAGE_KEYS = {
  staffId: 'staff_id',
  salonId: 'salon_id',
  collaboratorName: 'collaborator_name',
  staffCode: 'staff_code',
} as const;

type DashboardStats = {
  services_count?: unknown;
  clients_count?: unknown;
  products_count?: unknown;
  worked_days_count?: unknown;
};

function formatDashboardStat(value: unknown): string {
  if (value === null || value === undefined) return '--';
  const n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return '--';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState<'in' | 'out' | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [status, setStatus] = useState<'out' | 'in'>('out');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [lastActionLine, setLastActionLine] = useState('Ultima azione: —');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({});

  const fetchDashboardStats = async (staffId: number) => {
    try {
      const response = await fetch('http://192.168.1.6:3000/api/mobile/dashboard/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staff_id: staffId }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setDashboardStats({
        services_count: data?.services_count,
        clients_count: data?.clients_count,
        products_count: data?.products_count,
        worked_days_count: data?.worked_days_count,
      });
    } catch {
      // Placeholders remain until a successful load.
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedStaffId = await SecureStore.getItemAsync(STORAGE_KEYS.staffId);
        if (storedStaffId) {
          setIsLogged(true);
          Alert.alert('Già loggato');

          const [storedName, storedStaffCode] = await Promise.all([
            SecureStore.getItemAsync(STORAGE_KEYS.collaboratorName),
            SecureStore.getItemAsync(STORAGE_KEYS.staffCode),
          ]);
          const name = storedName?.trim() ?? '';
          const codeStored = storedStaffCode?.trim() ?? '';
          if (name) {
            setCollaboratorName(name);
          }
          if (codeStored) {
            setStaffCode(codeStored);
          }

          const staffId = Number(storedStaffId);
          if (!Number.isNaN(staffId)) {
            const loadAttendanceStatus = async () => {
              try {
                const statusResponse = await fetch(
                  'http://192.168.1.6:3000/api/mobile/attendance/status',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ staff_id: staffId }),
                  }
                );

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  setStatus(statusData?.status === 'in' ? 'in' : 'out');
                } else {
                  setStatus('out');
                }
              } catch {
                setStatus('out');
              }
            };

            await Promise.all([loadAttendanceStatus(), fetchDashboardStats(staffId)]);
          } else {
            setStatus('out');
          }
        }
      } catch {
        // Ignore secure storage read errors for now.
      }
    };

    checkSession();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://192.168.1.6:3000/api/mobile/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data?.message || 'Errore durante il login';
        Alert.alert(message);
        return;
      }

      const staffIdVal = String(data?.staff_id ?? '');
      const salonIdVal = String(data?.salon_id ?? '');
      const nameFromApi =
        data?.collaborator_name != null ? String(data.collaborator_name).trim() : '';
      const staffCodeFromApi =
        data?.staff_code != null ? String(data.staff_code).trim() : '';
      const staffCodeToSave = staffCodeFromApi || code.trim();

      await SecureStore.setItemAsync(STORAGE_KEYS.staffId, staffIdVal);
      await SecureStore.setItemAsync(STORAGE_KEYS.salonId, salonIdVal);
      await SecureStore.setItemAsync(STORAGE_KEYS.collaboratorName, nameFromApi);
      await SecureStore.setItemAsync(STORAGE_KEYS.staffCode, staffCodeToSave);

      setCollaboratorName(nameFromApi);
      setStaffCode(staffCodeToSave);
      setIsLogged(true);
      const loginStaffId = Number(staffIdVal);
      if (!Number.isNaN(loginStaffId)) {
        void fetchDashboardStats(loginStaffId);
      }
      Alert.alert('Login OK');
    } catch {
      Alert.alert('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (action: 'in' | 'out') => {
    try {
      setAttendanceLoading(true);
      setAttendanceAction(action);

      const storedStaffId = await SecureStore.getItemAsync(STORAGE_KEYS.staffId);
      const staffId = Number(storedStaffId);

      if (!storedStaffId || Number.isNaN(staffId)) {
        Alert.alert('Staff ID non valido');
        return;
      }

      const { status: locationPermission } = await Location.requestForegroundPermissionsAsync();
      if (locationPermission !== 'granted') {
        Alert.alert('Permesso posizione richiesto');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      const response = await fetch('http://192.168.1.6:3000/api/mobile/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: staffId,
          action,
          lat: latitude,
          lng: longitude,
        }),
      });

      if (!response.ok) {
        let message = 'Errore durante la timbratura';
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            message = errorData.error;
          }
        } catch {
          // Keep fallback message if response body is not valid JSON.
        }
        Alert.alert(message);
        return;
      }

      setStatus(action);
      const time = new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastActionLine(`Ultima azione: ${time}`);
      Alert.alert(action === 'in' ? 'Entrata registrata' : 'Uscita registrata');
    } catch {
      Alert.alert('Errore di rete');
    } finally {
      setAttendanceLoading(false);
      setAttendanceAction(null);
    }
  };

  const pendingAction = status === 'out' ? 'in' : 'out';
  const handleLogout = async () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        /* best-effort per key */
      }
    }
    setIsLogged(false);
    setCollaboratorName('');
    setStaffCode('');
    setStatus('out');
    setLastActionLine('Ultima azione: —');
    setCode('');
    setPin('');
    setDashboardStats({});
  };

  const mainButtonLabel =
    attendanceLoading && attendanceAction === pendingAction
      ? 'Elaborazione...'
      : status === 'out'
        ? 'Registra ingresso'
        : 'Registra uscita';

  if (isLogged) {
    return (
      <View style={[styles.dashboardRoot, { paddingTop: insets.top + 6 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.dashboardScroll,
            { paddingBottom: insets.bottom + 28 },
          ]}>
          <View style={styles.dashHeader}>
            <Text style={styles.logoWordmark}>SCARAMUZZO</Text>
            <Text style={styles.logoTeam}>TEAM</Text>
            <View style={styles.logoRule} />
            {collaboratorName ? (
              <Text style={styles.dashCollaboratorName}>{collaboratorName}</Text>
            ) : null}
            {staffCode ? (
              <Text style={styles.dashStaffCode}>Codice · {staffCode}</Text>
            ) : null}
          </View>

          <View style={styles.statusCardPremium}>
            <View style={styles.salonBadge}>
              <Text style={styles.salonBadgeText}>Salone attivo</Text>
            </View>
            <Text style={styles.statusCardKicker}>Stato di oggi</Text>
            <Text
              style={[
                styles.statusValueLarge,
                status === 'in' ? styles.statusValueIn : styles.statusValueOut,
              ]}>
              {status === 'in' ? 'SEI DENTRO' : 'SEI FUORI'}
            </Text>
            <Text style={styles.statusLastLine}>{lastActionLine}</Text>
          </View>

          <View style={styles.actionCardPremium}>
            <Pressable
              style={({ pressed }) => [
                status === 'out' ? styles.ctaGold : styles.ctaOutlineGold,
                (pressed || attendanceLoading) && styles.ctaPressed,
                attendanceLoading && styles.ctaDisabled,
              ]}
              onPress={() => handleAttendance(pendingAction)}
              disabled={attendanceLoading}>
              <Text
                style={
                  status === 'out' ? styles.ctaGoldLabel : styles.ctaOutlineGoldLabel
                }>
                {mainButtonLabel}
              </Text>
            </Pressable>
            <View style={styles.actionInfoBlock}>
              <View style={styles.actionInfoRow}>
                <View style={styles.actionInfoBullet} />
                <Text style={styles.actionInfoText}>Posizione attiva</Text>
              </View>
              <View style={styles.actionInfoRow}>
                <View style={styles.actionInfoBullet} />
                <Text style={styles.actionInfoText}>Salone verificato</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeading}>I miei numeri</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <View style={styles.statMiniCard}>
                <Text style={styles.statMiniLabel}>Servizi</Text>
                <Text style={styles.statMiniValue}>
                  {formatDashboardStat(dashboardStats.services_count)}
                </Text>
              </View>
              <View style={styles.statMiniCard}>
                <Text style={styles.statMiniLabel}>Clienti</Text>
                <Text style={styles.statMiniValue}>
                  {formatDashboardStat(dashboardStats.clients_count)}
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statMiniCard}>
                <Text style={styles.statMiniLabel}>Prodotti</Text>
                <Text style={styles.statMiniValue}>
                  {formatDashboardStat(dashboardStats.products_count)}
                </Text>
              </View>
              <View style={styles.statMiniCard}>
                <Text style={styles.statMiniLabel}>Giorni lavorati</Text>
                <Text style={styles.statMiniValue}>
                  {formatDashboardStat(dashboardStats.worked_days_count)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Agenda di oggi</Text>
          <View style={styles.agendaCard}>
            <Text style={styles.agendaTitle}>Nessun appuntamento visibile</Text>
            <Text style={styles.agendaSubtitle}>
              Qui vedrai i servizi e gli appuntamenti della giornata
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.logoutFooter, pressed && styles.logoutPressed]}
            onPress={handleLogout}>
            <Text style={styles.logoutFooterLabel}>Esci dall'account</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, styles.rootCentered, { paddingTop: insets.top + 24 }]}>
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
            placeholderTextColor={MUTED}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="PIN"
            placeholderTextColor={MUTED}
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
    backgroundColor: '#000',
    paddingHorizontal: 24,
  },
  dashboardRoot: {
    flex: 1,
    backgroundColor: BG_DEEP,
    paddingHorizontal: 22,
  },
  dashboardScroll: {
    flexGrow: 1,
    paddingTop: 8,
  },
  dashHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWordmark: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
  },
  logoTeam: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    marginTop: 4,
  },
  logoRule: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(243,216,182,0.35)',
    marginTop: 14,
    borderRadius: 1,
  },
  dashCollaboratorName: {
    color: '#f5f5f5',
    fontSize: 17,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  dashStaffCode: {
    color: '#5c5c5c',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  statusCardPremium: {
    backgroundColor: CARD_ELEVATED,
    borderRadius: RADIUS_LG,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  salonBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(243,216,182,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(243,216,182,0.28)',
  },
  salonBadgeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statusCardKicker: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  statusValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusValueIn: {
    color: ACCENT_IN,
  },
  statusValueOut: {
    color: '#9ca3af',
  },
  statusLastLine: {
    color: '#6b6b6b',
    fontSize: 13,
    marginTop: 14,
    letterSpacing: 0.15,
  },
  actionCardPremium: {
    backgroundColor: '#121212',
    borderRadius: RADIUS_LG,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ctaGold: {
    width: '100%',
    backgroundColor: GOLD,
    borderRadius: RADIUS_MD,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGoldLabel: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  ctaOutlineGold: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: RADIUS_MD,
    borderWidth: 1.5,
    borderColor: 'rgba(243,216,182,0.45)',
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOutlineGoldLabel: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  actionInfoBlock: {
    marginTop: 20,
    gap: 12,
  },
  actionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionInfoBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(243,216,182,0.5)',
  },
  actionInfoText: {
    color: '#6b6b6b',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  sectionHeading: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginTop: 4,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: CARD_ELEVATED,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statMiniLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statMiniValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  agendaCard: {
    backgroundColor: CARD_ELEVATED,
    borderRadius: RADIUS_LG,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(243,216,182,0.35)',
  },
  agendaTitle: {
    color: '#e5e5e5',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  agendaSubtitle: {
    color: '#5c5c5c',
    fontSize: 13,
    marginTop: 10,
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  logoutFooter: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutFooterLabel: {
    color: '#525252',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  rootCentered: {
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitleMuted: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  ctaPrimary: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: RADIUS_MD,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSecondary: {
    width: '100%',
    backgroundColor: CARD,
    borderRadius: RADIUS_MD,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ctaSecondaryLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerHints: {
    marginTop: 28,
    gap: 6,
    alignItems: 'center',
  },
  hint: {
    color: '#525252',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  loginShell: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  loginCard: {
    backgroundColor: CARD_ELEVATED,
    borderRadius: RADIUS_LG,
    padding: 24,
    gap: 16,
    marginTop: 28,
  },
  input: {
    width: '100%',
    backgroundColor: CARD,
    color: '#fff',
    borderRadius: RADIUS_MD,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  loginCta: {
    marginTop: 8,
  },
  logoutPressed: {
    opacity: 0.65,
  },
});
