import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import {
  fetchMobileStats,
  STATS_PERIOD_THIS_MONTH,
  STATS_RETRY_MESSAGE,
  STATS_UNAVAILABLE_MESSAGE,
} from '@/lib/mobile-stats';
import {
  clockAttendance,
  fetchAttendance,
  formatClockNowHHmm,
  type AttendanceView,
} from '@/lib/mobile-attendance';
import {
  fetchMyAppointments,
  filterTodayRows,
  formatAppointmentTime,
  formatStatusLabel,
  servicesPreview,
  type MyAppointmentRow,
} from '@/lib/my-appointments';
import {
  DRAWER_SCREEN_PADDING_HORIZONTAL,
  DRAWER_SCREEN_PADDING_TOP,
  RADIUS_LG,
  RADIUS_MD,
} from '@/constants/shell-layout';
import { firstNameFromDisplayName } from '@/lib/collaborator-identity';
import { requireValidMobileSession } from '@/lib/mobile-session-read';
import {
  ACCENT_CREAM,
  CARD_BORDER_COLOR,
  CTA_ON_PRIMARY,
  CTA_PRIMARY,
  GOLD_EDGE,
  GOLD_RIM,
  POSITIVE,
  SHELL,
  SURFACE_ACTION,
  SURFACE_CARD,
  SURFACE_ELEVATED,
  TEXT_DIM,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_NEUTRAL,
} from '@/constants/shell-theme';
const AGENDA_PREVIEW_MAX = 5;

const MSG_ATT_LOAD = 'Impossibile caricare le presenze';

function dashAttendance(value: string | null | undefined): string {
  return value == null || value === '' ? '—' : value;
}

type DashboardStats = {
  services_count?: unknown;
  clients_count?: unknown;
  products_count?: unknown;
  worked_days_count?: unknown;
};

function formatDashboardStat(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isFinite(n)) return String(n);
  return '—';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceView, setAttendanceView] = useState<AttendanceView | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [collaboratorName, setCollaboratorName] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({});
  const [statsFetched, setStatsFetched] = useState(false);
  const [agendaToday, setAgendaToday] = useState<MyAppointmentRow[]>([]);
  const [agendaTodayTotal, setAgendaTodayTotal] = useState(0);
  const [agendaFetchState, setAgendaFetchState] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle'
  );
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);
  const [statsUnavailable, setStatsUnavailable] = useState(false);

  const fetchHomeMonthStats = async (staffId: number) => {
    setStatsUnavailable(false);
    try {
      const statRes = await fetchMobileStats(staffId, 'month');
      if (statRes.ok) {
        setDashboardStats({
          services_count: statRes.view.servicesPerformed,
          clients_count: statRes.view.clientsServed,
          products_count: statRes.view.productsSoldQty,
          worked_days_count: statRes.view.daysWorked,
        });
        setStatsUnavailable(false);
        return;
      }
      if (!statRes.sessionEnded) {
        setDashboardStats({});
        setStatsUnavailable(true);
      }
    } catch {
      setDashboardStats({});
      setStatsUnavailable(true);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await requireValidMobileSession();
        if (session === null) {
          router.replace('/login');
          return;
        }
        const { staffId } = session;

        const [storedName, storedStaffCode] = await Promise.all([
          SecureStore.getItemAsync(AUTH_STORAGE_KEYS.collaboratorName),
          SecureStore.getItemAsync(AUTH_STORAGE_KEYS.staffCode),
        ]);
        const name = storedName?.trim() ?? '';
        const codeStored = storedStaffCode?.trim() ?? '';
        if (name) {
          setCollaboratorName(name);
        }
        if (codeStored) {
          setStaffCode(codeStored);
        }

        const loadAttendance = async () => {
          const result = await fetchAttendance(staffId);
          if (result.ok) {
            setAttendanceView(result.view);
            setAttendanceError(null);
          } else if (!result.sessionEnded) {
            setAttendanceView(null);
            setAttendanceError(result.error ?? MSG_ATT_LOAD);
          }
        };

        await Promise.all([loadAttendance(), fetchHomeMonthStats(staffId)]);

        setStatsFetched(true);
        setSessionReady(true);
      } catch {
        router.replace('/login');
      }
    };

    void checkSession();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const session = await requireValidMobileSession();
          if (cancelled) return;
          if (session === null) {
            router.replace('/login');
            return;
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
    }, [router])
  );

  useFocusEffect(
    useCallback(() => {
      if (!sessionReady) return;
      let cancelled = false;
      (async () => {
        const session = await requireValidMobileSession();
        if (session === null || cancelled) {
          if (!cancelled) {
            router.replace('/login');
          }
          return;
        }
        const { staffId } = session;

        setAgendaFetchState('loading');
        const res = await fetchMyAppointments(staffId);
        if (cancelled) return;

        if (!res.ok && res.sessionEnded) {
          return;
        }
        if (res.ok) {
          setAgendaError(null);
          const today = filterTodayRows(res.rows);
          setAgendaTodayTotal(today.length);
          setAgendaToday(today.slice(0, AGENDA_PREVIEW_MAX));
          setAgendaFetchState('ok');
        } else {
          setAgendaToday([]);
          setAgendaTodayTotal(0);
          setAgendaError(res.error ?? null);
          setAgendaFetchState('error');
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [sessionReady, router])
  );

  useFocusEffect(
    useCallback(() => {
      if (!sessionReady) return;
      let cancelled = false;
      (async () => {
        const session = await requireValidMobileSession();
        if (session === null || cancelled) {
          if (!cancelled) {
            router.replace('/login');
          }
          return;
        }
        const { staffId } = session;

        const result = await fetchAttendance(staffId);
        if (cancelled) return;
        if (result.ok) {
          setAttendanceView(result.view);
          setAttendanceError(null);
        } else if (!result.sessionEnded) {
          setAttendanceError(result.error ?? MSG_ATT_LOAD);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [sessionReady, router])
  );

  const handleClockAttendance = async () => {
    if (attendanceLoading) {
      return;
    }
    if (!attendanceView) {
      return;
    }
    const prev = attendanceView;
    try {
      setAttendanceLoading(true);
      setGpsError(null);
      setDistanceError(null);
      setClockError(null);
      setAttendanceView({
        ...prev,
        status: prev.status === 'in' ? 'out' : 'in',
        lastActionTime: formatClockNowHHmm(),
      });

      const session = await requireValidMobileSession();
      if (session === null) {
        setAttendanceView(prev);
        router.replace('/login');
        return;
      }
      const { staffId } = session;

      const result = await clockAttendance(staffId);
      if (!result.ok) {
        setAttendanceView(prev);
        if (result.sessionEnded) {
          return;
        }
        if (result.httpStatus === 403) {
          setDistanceError(
            result.error?.trim() || 'Sei troppo lontano dal salone per timbrare'
          );
        } else {
          setClockError(result.error ?? 'Impossibile registrare la timbratura.');
        }
        return;
      }

      const refetch = await fetchAttendance(staffId);
      if (refetch.ok) {
        setAttendanceView(refetch.view);
        setAttendanceError(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (!refetch.sessionEnded) {
        setAttendanceError(refetch.error ?? MSG_ATT_LOAD);
      }
    } catch {
      setAttendanceView(prev);
      setGpsError('Posizione non disponibile');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const mainButtonLabel = attendanceLoading
    ? 'Timbro in corso...'
    : attendanceView?.status === 'out'
      ? 'Registra ingresso'
      : 'Registra uscita';

  if (!sessionReady) {
    return (
      <View
        style={[
          styles.sessionGate,
          {
            paddingTop: DRAWER_SCREEN_PADDING_TOP,
            paddingHorizontal: DRAWER_SCREEN_PADDING_HORIZONTAL,
          },
        ]}
      />
    );
  }

  return (
    <View style={styles.dashboardRoot}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.dashboardScroll,
          { paddingTop: DRAWER_SCREEN_PADDING_TOP, paddingBottom: insets.bottom + 28 },
        ]}>
        {collaboratorName || staffCode ? (
          <View style={styles.identityStrip} accessibilityLabel="Identità collaboratore">
            {collaboratorName ? (
              <>
                <Text style={styles.identityGreeting} numberOfLines={2}>
                  Ciao, {firstNameFromDisplayName(collaboratorName)}
                </Text>
                {staffCode ? (
                  <Text style={styles.identityCodeLine}>Codice {staffCode}</Text>
                ) : null}
              </>
            ) : staffCode ? (
              <Text style={styles.identityGreeting}>Codice {staffCode}</Text>
            ) : null}
          </View>
        ) : null}

        {attendanceError && !attendanceView ? (
          <View style={styles.statusCardPremium}>
            <Text style={styles.statusCardKicker}>STATO ATTUALE</Text>
            <Text style={styles.attendanceErrorMuted}>{attendanceError}</Text>
          </View>
        ) : attendanceView ? (
          <>
            <View style={styles.statusCardPremium}>
              <Text style={styles.statusCardKicker}>STATO ATTUALE</Text>
              <Text
                style={[
                  styles.statusValueLarge,
                  attendanceView.status === 'in' ? styles.statusValueIn : styles.statusValueOut,
                ]}>
                {attendanceView.status === 'in' ? 'SEI DENTRO' : 'SEI FUORI'}
              </Text>
              <Text style={styles.statusLastLine}>
                Ultima azione:{' '}
                {attendanceView.lastActionTime ? attendanceView.lastActionTime : '—'}
              </Text>
            </View>

            <View style={styles.actionCardPremium}>
              {gpsError ? (
                <View style={styles.presenceErrorBox} accessibilityRole="alert">
                  <Text style={styles.presenceErrorTitle}>{gpsError}</Text>
                  <Text style={styles.presenceErrorSub}>Attiva il GPS per timbrare</Text>
                </View>
              ) : null}
              {distanceError ? (
                <View style={styles.presenceErrorBox} accessibilityRole="alert">
                  <Text style={styles.presenceErrorTitle}>{distanceError}</Text>
                  <Text style={styles.presenceErrorSub}>
                    Avvicinati entro 500 metri per timbrare
                  </Text>
                </View>
              ) : null}
              {clockError ? (
                <Text style={styles.presenceErrorGeneric} accessibilityRole="alert">
                  {clockError}
                </Text>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  attendanceView.status === 'out' ? styles.ctaPrimary : styles.ctaOutlineGold,
                  (pressed || attendanceLoading) && styles.ctaPressed,
                  attendanceLoading && styles.ctaDisabled,
                ]}
                onPress={() => void handleClockAttendance()}
                disabled={attendanceLoading}>
                {attendanceLoading ? (
                  <View style={styles.ctaBusyRow}>
                    <ActivityIndicator
                      color={attendanceView.status === 'out' ? CTA_ON_PRIMARY : ACCENT_CREAM}
                    />
                    <Text
                      style={
                        attendanceView.status === 'out'
                          ? styles.ctaPrimaryLabel
                          : styles.ctaOutlineGoldLabel
                      }>
                      {mainButtonLabel}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={
                      attendanceView.status === 'out'
                        ? styles.ctaPrimaryLabel
                        : styles.ctaOutlineGoldLabel
                    }>
                    {mainButtonLabel}
                  </Text>
                )}
              </Pressable>
              <Text style={styles.attendanceMiniToday}>
                Ingresso {dashAttendance(attendanceView.todayFirstIn)} · Uscita{' '}
                {dashAttendance(attendanceView.todayLastOut)} ·{' '}
                {attendanceView.workedMinutesLabel ?? '—'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.statusCardPremium}>
            <Text style={styles.statusCardKicker}>STATO ATTUALE</Text>
            <Text style={styles.statusValueLarge}>…</Text>
          </View>
        )}

        <Text style={styles.sectionHeading}>I miei numeri</Text>
        {statsFetched && !statsUnavailable ? (
          <Text style={styles.kpiPeriodHint}>{STATS_PERIOD_THIS_MONTH}</Text>
        ) : null}
        {statsUnavailable ? (
          <View style={styles.statsUnavailableWrap} accessibilityRole="alert">
            <Text style={styles.dashboardErrorMuted}>{STATS_UNAVAILABLE_MESSAGE}</Text>
            <Text style={styles.statsUnavailableHint}>{STATS_RETRY_MESSAGE}</Text>
          </View>
        ) : null}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statMiniCard}>
              <Text style={styles.statMiniLabel}>Servizi</Text>
              <Text
                style={[styles.statMiniValue, !statsFetched && styles.statMiniValuePending]}>
                {!statsFetched ? '…' : formatDashboardStat(dashboardStats.services_count)}
              </Text>
            </View>
            <View style={styles.statMiniCard}>
              <Text style={styles.statMiniLabel}>Clienti</Text>
              <Text
                style={[styles.statMiniValue, !statsFetched && styles.statMiniValuePending]}>
                {!statsFetched ? '…' : formatDashboardStat(dashboardStats.clients_count)}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statMiniCard}>
              <Text style={styles.statMiniLabel}>Prodotti</Text>
              <Text
                style={[styles.statMiniValue, !statsFetched && styles.statMiniValuePending]}>
                {!statsFetched ? '…' : formatDashboardStat(dashboardStats.products_count)}
              </Text>
            </View>
            <View style={styles.statMiniCard}>
              <Text style={styles.statMiniLabel}>Giorni lavorati</Text>
              <Text
                style={[styles.statMiniValue, !statsFetched && styles.statMiniValuePending]}>
                {!statsFetched ? '…' : formatDashboardStat(dashboardStats.worked_days_count)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Agenda di oggi</Text>
        <View style={styles.agendaCard}>
          {agendaFetchState === 'loading' || agendaFetchState === 'idle' ? (
            <Text style={styles.agendaMeta}>Caricamento agenda…</Text>
          ) : agendaFetchState === 'error' ? (
            <>
              <Text style={styles.agendaTitle}>Agenda non disponibile</Text>
              <Text style={styles.agendaSubtitle}>
                {agendaError ??
                  'Impossibile caricare gli appuntamenti. Apri Appuntamenti per riprovare.'}
              </Text>
            </>
          ) : agendaTodayTotal === 0 ? (
            <>
              <Text style={styles.agendaTitle}>Nessun appuntamento in agenda per oggi</Text>
              <Text style={styles.agendaSubtitle}>
                Non risultano appuntamenti assegnati per oggi. Per gli altri giorni usa la sezione
                Appuntamenti.
              </Text>
            </>
          ) : (
            <>
              {agendaToday.map((row, idx) => (
                <View
                  key={row.id}
                  style={[styles.agendaRow, idx < agendaToday.length - 1 ? styles.agendaRowBorder : null]}>
                  <View style={styles.agendaRowTop}>
                    <Text style={styles.agendaTime}>
                      {formatAppointmentTime(row.start_time)}
                      {row.end_time ? ` – ${formatAppointmentTime(row.end_time)}` : ''}
                    </Text>
                    <Text style={styles.agendaStatus} numberOfLines={1}>
                      {formatStatusLabel(row.status)}
                    </Text>
                  </View>
                  <Text style={styles.agendaClient} numberOfLines={2}>
                    {row.customer_name}
                  </Text>
                  {servicesPreview(row.services) ? (
                    <Text style={styles.agendaServices} numberOfLines={2}>
                      {servicesPreview(row.services)}
                    </Text>
                  ) : null}
                </View>
              ))}
              {agendaTodayTotal > AGENDA_PREVIEW_MAX ? (
                <Text style={styles.agendaMoreHint}>
                  +{agendaTodayTotal - AGENDA_PREVIEW_MAX} altri oggi · dettaglio in Appuntamenti
                </Text>
              ) : null}
              <Pressable
                onPress={() => router.push('/appointments')}
                style={({ pressed }) => [styles.agendaLink, pressed && styles.ctaPressed]}
                accessibilityRole="button"
                accessibilityLabel="Apri tutti gli appuntamenti">
                <Text style={styles.agendaLinkText}>Vedi tutti gli appuntamenti</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionGate: {
    flex: 1,
    backgroundColor: SHELL,
  },
  dashboardRoot: {
    flex: 1,
    backgroundColor: SHELL,
    paddingHorizontal: DRAWER_SCREEN_PADDING_HORIZONTAL,
  },
  dashboardScroll: {
    flexGrow: 1,
  },
  identityStrip: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  identityGreeting: {
    color: TEXT_MAIN,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.35,
    lineHeight: 30,
  },
  identityCodeLine: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: 8,
  },
  statusCardPremium: {
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: RADIUS_LG,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
    borderLeftWidth: 3,
    borderLeftColor: GOLD_EDGE,
  },
  statusCardKicker: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  attendanceErrorMuted: {
    color: TEXT_DIM,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.12,
  },
  attendanceMiniToday: {
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.08,
    marginTop: 16,
  },
  statusValueLarge: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusValueIn: {
    color: POSITIVE,
  },
  statusValueOut: {
    color: TEXT_NEUTRAL,
  },
  statusLastLine: {
    color: TEXT_DIM,
    fontSize: 13,
    marginTop: 14,
    letterSpacing: 0.15,
  },
  actionCardPremium: {
    backgroundColor: SURFACE_ACTION,
    borderRadius: RADIUS_LG,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
  },
  presenceErrorBox: {
    marginBottom: 14,
  },
  presenceErrorTitle: {
    color: TEXT_MAIN,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  presenceErrorSub: {
    color: TEXT_DIM,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  presenceErrorGeneric: {
    color: TEXT_DIM,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
    letterSpacing: 0.08,
  },
  ctaBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  ctaPrimary: {
    width: '100%',
    backgroundColor: CTA_PRIMARY,
    borderRadius: RADIUS_MD,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,169,88,0.42)',
  },
  ctaPrimaryLabel: {
    color: CTA_ON_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  ctaOutlineGold: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: RADIUS_MD,
    borderWidth: 1.5,
    borderColor: GOLD_RIM,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOutlineGoldLabel: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  sectionHeading: {
    color: ACCENT_CREAM,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginTop: 4,
  },
  kpiPeriodHint: {
    color: TEXT_DIM,
    fontSize: 11,
    lineHeight: 16,
    marginTop: -6,
    marginBottom: 12,
    letterSpacing: 0.06,
  },
  statsUnavailableWrap: {
    marginBottom: 12,
    gap: 4,
  },
  dashboardErrorMuted: {
    color: TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.06,
  },
  statsUnavailableHint: {
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.06,
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
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
  },
  statMiniLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statMiniValue: {
    color: TEXT_MAIN,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  statMiniValuePending: {
    color: TEXT_DIM,
    fontWeight: '500',
    opacity: 0.85,
  },
  agendaCard: {
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: RADIUS_LG,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
    borderLeftWidth: 3,
    borderLeftColor: GOLD_EDGE,
  },
  agendaTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  agendaSubtitle: {
    color: TEXT_DIM,
    fontSize: 13,
    marginTop: 10,
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  agendaMeta: {
    color: TEXT_MUTED,
    fontSize: 14,
    letterSpacing: 0.12,
  },
  agendaRow: {
    paddingVertical: 12,
  },
  agendaRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER_COLOR,
  },
  agendaRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  agendaTime: {
    color: ACCENT_CREAM,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },
  agendaStatus: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: '42%',
    textAlign: 'right',
  },
  agendaClient: {
    color: TEXT_MAIN,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.08,
    marginBottom: 4,
  },
  agendaServices: {
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.06,
  },
  agendaMoreHint: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  agendaLink: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  agendaLinkText: {
    color: ACCENT_CREAM,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
