import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DRAWER_SCREEN_PADDING_HORIZONTAL,
  DRAWER_SCREEN_PADDING_TOP,
} from '@/constants/shell-layout';
import { diffCalendarDaysFromTodayRome } from '@/lib/date-rome';
import {
  dateKeyFromStart,
  formatAppointmentTime,
  formatStatusLabel,
  type MyAppointmentRow,
  fetchMyAppointments,
} from '@/lib/my-appointments';
import { readStaffIdOrNull } from '@/lib/mobile-session-read';
import {
  BORDER_BRONZE,
  CARD_SHADOW_SUBTLE,
  GOLD_BRAND,
  GOLD_BRAND_LINE,
  GOLD_LIGHT,
  GOLD_RIM,
  NEUTRAL_PILL_FILL,
  POSITIVE,
  POSITIVE_BORDER,
  POSITIVE_FILL,
  SHELL,
  SPINNER_TINT,
  SURFACE_HEADER,
  SURFACE_CARD,
  SURFACE_MEDIUM,
  TEXT_MAIN,
  TEXT_MUTED,
  WARNING,
  WARNING_BORDER,
  WARNING_FILL,
} from '@/constants/shell-theme';

const RADIUS_3XL = 28;
const RADIUS_2XL = 22;
const RADIUS_INNER = 16;

type StatusVisual = 'positive' | 'warning' | 'neutral';

function statusVisual(status: string | null | undefined): StatusVisual {
  const k = (status ?? '').toLowerCase().replace(/\s+/g, '_');
  if (['completed', 'confirmed'].includes(k)) return 'positive';
  if (['cancelled', 'canceled', 'no_show'].includes(k)) return 'neutral';
  if (['scheduled', 'pending', 'in_progress'].includes(k)) return 'warning';
  return 'neutral';
}

function capitalizeIt(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type AgendaSection = {
  dateKey: string;
  titlePrimary: string;
  titleSecondary?: string;
  data: MyAppointmentRow[];
};

function sectionTitlesForDay(dateKey: string): { primary: string; secondary?: string } {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return { primary: dateKey };

  const dayDate = new Date(y, m - 1, day);
  const diffDays = diffCalendarDaysFromTodayRome(dateKey);
  if (diffDays === null) {
    return { primary: dateKey };
  }

  const longHuman = capitalizeIt(
    dayDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  if (diffDays === 0) return { primary: 'Oggi', secondary: longHuman };
  if (diffDays === 1) return { primary: 'Domani', secondary: longHuman };
  return { primary: longHuman };
}

function groupAppointmentsByDay(rows: MyAppointmentRow[]): AgendaSection[] {
  const map = new Map<string, MyAppointmentRow[]>();
  for (const r of rows) {
    const key = dateKeyFromStart(r.start_time);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const keys = [...map.keys()].sort();
  return keys.map((dateKey) => {
    const { primary, secondary } = sectionTitlesForDay(dateKey);
    const items = (map.get(dateKey) ?? []).sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    return {
      dateKey,
      titlePrimary: primary,
      titleSecondary: secondary,
      data: items,
    };
  });
}

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rows, setRows] = useState<MyAppointmentRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }
    setError(null);

    try {
      const staffId = await readStaffIdOrNull();
      if (staffId === null) {
        setRows([]);
        router.replace('/login');
        return;
      }

      const result = await fetchMyAppointments(staffId);
      if (!result.ok) {
        if (result.sessionEnded) {
          return;
        }
        setError(result.error ?? 'Impossibile caricare gli appuntamenti.');
        setRows([]);
        return;
      }

      const sorted = [...result.rows].sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setRows(sorted);
   } catch {
      setError('Connessione non disponibile. Riprova tra poco.');
      setRows([]);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const sections = useMemo(() => groupAppointmentsByDay(rows), [rows]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: AgendaSection }) => (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccent} />
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitlePrimary}>{section.titlePrimary}</Text>
              {section.titleSecondary ? (
                <Text style={styles.sectionTitleSecondary}>{section.titleSecondary}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    ),
    []
  );

  const renderItem = useCallback(({ item }: { item: MyAppointmentRow }) => {
    const statusLabel = formatStatusLabel(item.status);
    const sv = statusVisual(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.timeBand}>
          <Text style={styles.timeBandLabel}>Fascia oraria</Text>
          <View style={styles.timeBandRow}>
            <Text style={styles.timeValue}>{formatAppointmentTime(item.start_time)}</Text>
            <Text style={styles.timeDash}>—</Text>
            <Text style={styles.timeValue}>{formatAppointmentTime(item.end_time)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <Text style={styles.microLabel}>Cliente</Text>
        <Text style={styles.clientName} numberOfLines={2}>
          {item.customer_name}
        </Text>

        <Text style={[styles.microLabel, styles.microLabelSpaced]}>Servizi</Text>
        {item.services.length > 0 ? (
          <View style={styles.servicesList}>
            {item.services.map((line, idx) => (
              <Text key={`${item.id}-svc-${idx}`} style={styles.serviceLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.servicesEmpty}>Nessun servizio associato</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.statusMicro}>Stato</Text>
          <View style={[styles.statusPill, styles[`pill_${sv}`]]}>
            <Text style={[styles.pillTextBase, styles[`pillText_${sv}`]]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item: MyAppointmentRow) => String(item.id), []);

  if (initialLoading) {
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
        <View style={styles.loadingRule} />
        <ActivityIndicator size="large" color={SPINNER_TINT} />
        <Text style={styles.loadingTitle}>Caricamento</Text>
        <Text style={styles.loadingHint}>Sincronizzazione agenda in corso…</Text>
      </View>
    );
  }

  if (error) {
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
        <View style={styles.panelMuted}>
          <Text style={styles.panelKicker}>Errore</Text>
          <Text style={styles.panelTitle}>Aggiornamento non riuscito</Text>
          <Text style={styles.panelBody}>{error}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressedOpacity]}
          onPress={() => void load(false)}>
          <Text style={styles.retryLabel}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        SectionSeparatorComponent={() => <View style={styles.sectionSpacer} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: DRAWER_SCREEN_PADDING_TOP, paddingBottom: insets.bottom + 28 },
          sections.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SPINNER_TINT}
            colors={[SPINNER_TINT]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Nessun appuntamento</Text>
            <Text style={styles.emptySub}>
              Non risultano appuntamenti a cui sei assegnato. Tirare giù per aggiornare.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SHELL,
    paddingHorizontal: DRAWER_SCREEN_PADDING_HORIZONTAL,
  },
  centered: {
    flex: 1,
    backgroundColor: SHELL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRule: {
    width: 56,
    height: 3,
    backgroundColor: GOLD_BRAND,
    borderRadius: 2,
    marginBottom: 28,
    opacity: 0.85,
  },
  loadingTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 22,
    letterSpacing: 0.3,
  },
  loadingHint: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 10,
    letterSpacing: 0.12,
    textAlign: 'center',
    maxWidth: 280,
  },
  listContent: {
    flexGrow: 1,
  },
  listEmpty: {
    justifyContent: 'center',
  },
  sectionSpacer: {
    height: 4,
  },
  sectionHeader: {
    backgroundColor: SHELL,
    paddingHorizontal: 0,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SHELL,
  },
  sectionHeaderCard: {
    backgroundColor: SURFACE_HEADER,
    borderRadius: RADIUS_2XL,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  sectionAccent: {
    width: 4,
    borderRadius: 2,
    backgroundColor: GOLD_BRAND,
    opacity: 0.95,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 6,
  },
  sectionTitlePrimary: {
    color: GOLD_LIGHT,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  sectionTitleSecondary: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 19,
  },
  card: {
    backgroundColor: SURFACE_CARD,
    borderRadius: RADIUS_3XL,
    padding: 18,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
    ...CARD_SHADOW_SUBTLE,
  },
  timeBand: {
    backgroundColor: SURFACE_MEDIUM,
    borderRadius: RADIUS_INNER,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  timeBandLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  timeBandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeValue: {
    color: GOLD_LIGHT,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.35,
    fontVariant: ['tabular-nums'],
  },
  timeDash: {
    color: GOLD_BRAND,
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.7,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_BRONZE,
    marginVertical: 14,
  },
  microLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  microLabelSpaced: {
    marginTop: 12,
  },
  clientName: {
    color: TEXT_MAIN,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 23,
    letterSpacing: 0.08,
  },
  servicesList: {
    borderLeftWidth: 2,
    borderLeftColor: GOLD_BRAND_LINE,
    paddingLeft: 12,
    gap: 10,
    paddingTop: 2,
    paddingBottom: 2,
  },
  serviceLine: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.06,
  },
  servicesEmpty: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.08,
    opacity: 0.85,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusMicro: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '70%',
    minWidth: 88,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillTextBase: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  pill_positive: {
    backgroundColor: POSITIVE_FILL,
    borderColor: POSITIVE_BORDER,
  },
  pillText_positive: {
    color: POSITIVE,
  },
  pill_warning: {
    backgroundColor: WARNING_FILL,
    borderColor: WARNING_BORDER,
  },
  pillText_warning: {
    color: WARNING,
  },
  pill_neutral: {
    backgroundColor: NEUTRAL_PILL_FILL,
    borderColor: BORDER_BRONZE,
  },
  pillText_neutral: {
    color: GOLD_LIGHT,
  },
  emptyPanel: {
    paddingVertical: 44,
    paddingHorizontal: 22,
    marginTop: 12,
    backgroundColor: SURFACE_HEADER,
    borderRadius: RADIUS_3XL,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  emptyTitle: {
    color: TEXT_MAIN,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.15,
  },
  emptySub: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  panelMuted: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: SURFACE_HEADER,
    borderRadius: RADIUS_3XL,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  panelKicker: {
    color: GOLD_LIGHT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  panelTitle: {
    color: TEXT_MAIN,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.15,
  },
  panelBody: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  retryBtn: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: GOLD_RIM,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: SURFACE_MEDIUM,
  },
  retryLabel: {
    color: GOLD_LIGHT,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pressedOpacity: {
    opacity: 0.82,
  },
});
