import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DRAWER_SCREEN_PADDING_HORIZONTAL,
  DRAWER_SCREEN_PADDING_TOP,
  RADIUS_LG,
  RADIUS_MD,
} from '@/constants/shell-layout';
import {
  ACCENT_CREAM,
  CARD_BORDER_COLOR,
  CTA_ON_PRIMARY,
  CTA_PRIMARY,
  GOLD_EDGE,
  GOLD_RIM,
  POSITIVE,
  POSITIVE_BORDER,
  SHELL,
  SPINNER_TINT,
  SURFACE_ACTION,
  SURFACE_CARD,
  SURFACE_ELEVATED,
  TEXT_DIM,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_NEUTRAL,
} from '@/constants/shell-theme';
import {
  clockAttendanceUiErrorsFromResult,
  emptyClockAttendanceUiErrors,
  gpsCatchUiErrors,
} from '@/lib/clock-attendance-ui';
import {
  clockAttendance,
  fetchAttendance,
  formatClockNowHHmm,
  type AttendanceView,
} from '@/lib/mobile-attendance';
import { readStaffIdOrNull } from '@/lib/mobile-session-read';

function dashTime(value: string | null): string {
  return value ?? '—';
}

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [clockBusy, setClockBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AttendanceView | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSubtitle, setGpsSubtitle] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [distanceSubtitle, setDistanceSubtitle] = useState<string | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const staffId = await readStaffIdOrNull();
        if (staffId === null) {
          router.replace('/login');
          return;
        }

        const result = await fetchAttendance(staffId);
        if (!result.ok) {
          if (result.sessionEnded) {
            return;
          }
          setError(result.error ?? 'Impossibile caricare le presenze.');
          if (!isRefresh) {
            setView(null);
          }
          return;
        }

        setView(result.view);
      } catch {
        setError('Connessione non disponibile.');
        if (!isRefresh) {
          setView(null);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const onClock = useCallback(async () => {
    if (clockBusy) {
      return;
    }
    if (!view) {
      return;
    }
    const prev = view;
    try {
      setClockBusy(true);
      setError(null);
      const cleared = emptyClockAttendanceUiErrors();
      setGpsError(cleared.gpsError);
      setGpsSubtitle(cleared.gpsSubtitle);
      setDistanceError(cleared.distanceError);
      setDistanceSubtitle(cleared.distanceSubtitle);
      setClockError(cleared.clockError);
      setView({
        ...prev,
        status: prev.status === 'in' ? 'out' : 'in',
        lastActionTime: formatClockNowHHmm(),
      });
      const staffId = await readStaffIdOrNull();
      if (staffId === null) {
        setView(prev);
        router.replace('/login');
        return;
      }

      const result = await clockAttendance(staffId);
      if (!result.ok) {
        setView(prev);
        if (result.sessionEnded) {
          return;
        }
        const uiErr = clockAttendanceUiErrorsFromResult(result);
        setGpsError(uiErr.gpsError);
        setGpsSubtitle(uiErr.gpsSubtitle);
        setDistanceError(uiErr.distanceError);
        setDistanceSubtitle(uiErr.distanceSubtitle);
        setClockError(uiErr.clockError);
        return;
      }

      const refetch = await fetchAttendance(staffId);
      if (refetch.ok) {
        setView(refetch.view);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (!refetch.sessionEnded) {
        setError(refetch.error ?? 'Impossibile caricare le presenze.');
      }
    } catch (err) {
      setView(prev);
      const uiErr = gpsCatchUiErrors(err);
      setGpsError(uiErr.gpsError);
      setGpsSubtitle(uiErr.gpsSubtitle);
      setDistanceError(uiErr.distanceError);
      setDistanceSubtitle(uiErr.distanceSubtitle);
      setClockError(uiErr.clockError);
    } finally {
      setClockBusy(false);
    }
  }, [router, view, clockBusy]);

  if (!view && !error) {
    return (
      <View
        style={[
          styles.centered,
          {
            paddingTop: DRAWER_SCREEN_PADDING_TOP,
            paddingBottom: insets.bottom,
            paddingHorizontal: DRAWER_SCREEN_PADDING_HORIZONTAL,
          },
        ]}>
        <ActivityIndicator size="large" color={SPINNER_TINT} />
        <Text style={styles.loadingHint}>Caricamento presenze…</Text>
      </View>
    );
  }

  if (error && !view) {
    return (
      <View
        style={[
          styles.centered,
          {
            paddingTop: DRAWER_SCREEN_PADDING_TOP,
            paddingBottom: insets.bottom,
            paddingHorizontal: DRAWER_SCREEN_PADDING_HORIZONTAL,
          },
        ]}>
        <View style={styles.errorPanel}>
          <Text style={styles.errorTitle}>Presenze non disponibili</Text>
          <Text style={styles.errorBody}>Riprova più tardi</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          onPress={() => void load(false)}>
          <Text style={styles.retryLabel}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const v = view!;

  const mainButtonLabel = clockBusy
    ? 'Timbro in corso...'
    : v.status === 'out'
      ? 'Registra ingresso'
      : 'Registra uscita';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: DRAWER_SCREEN_PADDING_TOP,
          paddingHorizontal: DRAWER_SCREEN_PADDING_HORIZONTAL,
          paddingBottom: insets.bottom + 28,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SPINNER_TINT}
            colors={[SPINNER_TINT]}
          />
        }>
        {refreshing ? (
          <View style={styles.inlineLoadingRow}>
            <ActivityIndicator size="small" color={SPINNER_TINT} />
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <Text style={styles.cardKicker}>STATO ATTUALE</Text>
          <Text style={[styles.statusHuge, v.status === 'in' ? styles.statusIn : styles.statusOut]}>
            {v.status === 'in' ? 'SEI DENTRO' : 'SEI FUORI'}
          </Text>
          <Text style={styles.lastActionLine}>
            Ultima azione: {v.lastActionTime ? v.lastActionTime : '—'}
          </Text>
        </View>

        <View style={styles.actionCard}>
          {gpsError ? (
            <View style={styles.presenceErrorBox} accessibilityRole="alert">
              <Text style={styles.presenceErrorTitle}>{gpsError}</Text>
              {gpsSubtitle ? (
                <Text style={styles.presenceErrorSub}>{gpsSubtitle}</Text>
              ) : null}
            </View>
          ) : null}
          {distanceError ? (
            <View style={styles.presenceErrorBox} accessibilityRole="alert">
              <Text style={styles.presenceErrorTitle}>{distanceError}</Text>
              {distanceSubtitle ? (
                <Text style={styles.presenceErrorSub}>{distanceSubtitle}</Text>
              ) : null}
            </View>
          ) : null}
          {clockError ? (
            <Text style={styles.presenceErrorGeneric} accessibilityRole="alert">
              {clockError}
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              v.status === 'out' ? styles.ctaPrimary : styles.ctaOutlineGold,
              (pressed || clockBusy) && styles.ctaPressed,
              clockBusy && styles.ctaDisabled,
            ]}
            onPress={() => void onClock()}
            disabled={clockBusy}>
            {clockBusy ? (
              <View style={styles.ctaBusyRow}>
                <ActivityIndicator color={v.status === 'out' ? CTA_ON_PRIMARY : ACCENT_CREAM} />
                <Text style={v.status === 'out' ? styles.ctaPrimaryLabel : styles.ctaOutlineGoldLabel}>
                  {mainButtonLabel}
                </Text>
              </View>
            ) : (
              <Text style={v.status === 'out' ? styles.ctaPrimaryLabel : styles.ctaOutlineGoldLabel}>
                {mainButtonLabel}
              </Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>Riepilogo oggi</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Primo ingresso</Text>
            <Text style={styles.summaryValue}>{dashTime(v.todayFirstIn)}</Text>
          </View>
          <View style={styles.summaryRule} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ultima uscita</Text>
            <Text style={styles.summaryValue}>{dashTime(v.todayLastOut)}</Text>
          </View>
          <View style={styles.summaryRule} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Minuti lavorati</Text>
            <Text style={styles.summaryValue}>{dashTime(v.workedMinutesLabel)}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Storico</Text>
        <View style={styles.historyCard}>
          {v.history.length === 0 ? (
            <Text style={styles.historyEmpty}>Nessuna timbratura</Text>
          ) : (
            v.history.map((ev, i) => (
              <View
                key={`${ev.kind}-${ev.timeLabel}-${i}`}
                style={[styles.historyRow, i < v.history.length - 1 ? styles.historyRowBorder : null]}>
                <Text style={styles.historyKind}>{ev.kind === 'in' ? 'IN' : 'OUT'}</Text>
                <Text style={styles.historyTime}>{ev.timeLabel}</Text>
              </View>
            ))
          )}
        </View>

        {error ? (
          <Text style={styles.inlineError}>Aggiornamento non riuscito. Riprova più tardi.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SHELL,
  },
  centered: {
    flex: 1,
    backgroundColor: SHELL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingHint: {
    marginTop: 8,
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.12,
  },
  inlineLoadingRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
    minHeight: 28,
  },
  errorPanel: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: RADIUS_LG,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
  },
  errorTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  errorBody: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: POSITIVE_BORDER,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: SURFACE_CARD,
  },
  retryLabel: {
    color: ACCENT_CREAM,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
  statusCard: {
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
  cardKicker: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  statusHuge: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusIn: {
    color: POSITIVE,
  },
  statusOut: {
    color: TEXT_NEUTRAL,
  },
  lastActionLine: {
    color: TEXT_DIM,
    fontSize: 13,
    marginTop: 14,
    letterSpacing: 0.15,
  },
  actionCard: {
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
    borderColor: POSITIVE_BORDER,
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
  summaryCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: RADIUS_MD,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
  },
  summaryLabel: {
    flex: 1,
    color: TEXT_DIM,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  summaryValue: {
    color: TEXT_MAIN,
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  summaryRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CARD_BORDER_COLOR,
    marginVertical: 10,
  },
  historyCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: RADIUS_MD,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: CARD_BORDER_COLOR,
  },
  historyEmpty: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  historyRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER_COLOR,
  },
  historyKind: {
    color: ACCENT_CREAM,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    width: 44,
  },
  historyTime: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  inlineError: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
});
