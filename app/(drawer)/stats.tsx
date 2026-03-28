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
} from '@/constants/shell-layout';
import {
  BORDER_BRONZE,
  BORDER_INSET_SOFT,
  GOLD_BRAND_LINE,
  GOLD_EDGE,
  GOLD_LIGHT,
  SHELL,
  SPINNER_TINT,
  SURFACE_CARD,
  SURFACE_ELEVATED,
  TEXT_DIM,
  TEXT_MAIN,
  TEXT_MUTED,
} from '@/constants/shell-theme';
import {
  fetchMobileStats,
  isStatsEffectivelyEmpty,
  type MobileStatsView,
  type StatsPeriodPreset,
} from '@/lib/mobile-stats';
import { readStaffIdOrNull } from '@/lib/mobile-session-read';

const RADIUS_LG = 24;
const RADIUS_MD = 18;

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [preset, setPreset] = useState<StatsPeriodPreset>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<MobileStatsView | null>(null);
  const [rangeLabel, setRangeLabel] = useState({ short: '', range: '' });

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const staffId = await readStaffIdOrNull();
        if (staffId === null) {
          router.replace('/login');
          return;
        }

        const result = await fetchMobileStats(staffId, preset);
        if (!result.ok) {
          if (result.sessionEnded) {
            return;
          }
          setError(result.error ?? 'Impossibile caricare le statistiche.');
          setView(null);
          return;
        }

        setView(result.view);
        setRangeLabel({ short: result.range.labelShort, range: result.range.labelRange });
      } catch {
        setError('Connessione non disponibile.');
        setView(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [preset, router]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  if (loading && !view && !error) {
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
        <Text style={styles.loadingHint}>Caricamento statistiche…</Text>
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
          <Text style={styles.errorKicker}>Errore</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          onPress={() => void load(false)}>
          <Text style={styles.retryLabel}>Riprova</Text>
        </Pressable>
      </View>
    );
  }

  const v = view;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: DRAWER_SCREEN_PADDING_TOP,
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
        <View style={styles.periodRow}>
          <Text style={styles.periodHint}>Periodo</Text>
          <View style={styles.periodRight}>
            {loading && view ? (
              <ActivityIndicator size="small" color={SPINNER_TINT} />
            ) : null}
            <View style={styles.segment}>
              <Pressable
                onPress={() => setPreset('today')}
                style={({ pressed }) => [
                  styles.segmentBtn,
                  preset === 'today' && styles.segmentBtnActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.segmentLabel, preset === 'today' && styles.segmentLabelActive]}>
                  Oggi
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPreset('month')}
                style={({ pressed }) => [
                  styles.segmentBtn,
                  preset === 'month' && styles.segmentBtnActive,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.segmentLabel, preset === 'month' && styles.segmentLabelActive]}>
                  Mese
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.rangeTitle}>{rangeLabel.short}</Text>
        <Text style={styles.rangeSub}>{rangeLabel.range}</Text>

        {v && isStatsEffectivelyEmpty(v) ? (
          <View style={styles.emptyPeriodBanner}>
            <Text style={styles.emptyPeriodTitle}>Nessun dato in questo periodo</Text>
            <Text style={styles.emptyPeriodBody}>
              I valori sono a zero finché non ci sono attività registrate nel periodo selezionato.
            </Text>
          </View>
        ) : null}

        {v ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroKicker}>Riepilogo operativo</Text>
              <KpiRow label="Servizi effettuati" value={v.servicesPerformed} />
              <View style={styles.kpiRule} />
              <KpiRow label="Appuntamenti completati" value={v.appointmentsCompleted} />
              <View style={styles.kpiRule} />
              <KpiRow label="Clienti serviti" value={v.clientsServed} />
              <View style={styles.kpiRule} />
              <KpiRow label="Prodotti venduti (qty)" value={v.productsSoldQty} />
              <View style={styles.kpiRule} />
              <KpiRow label="Giorni lavorati (statistiche)" value={v.daysWorked} />
            </View>

            <SectionBlock
              title="Servizi per categoria"
              subtitle="Distribuzione per categoria (solo servizi effettivi)."
              empty="Nessun servizio nel periodo per categoria."
              rows={v.byCategory.map((c) => ({
                key: c.category_name,
                left: c.category_name,
                right: String(c.count),
              }))}
            />

            <SectionBlock
              title="Servizi più effettuati"
              subtitle="Ordinati per frequenza nel periodo."
              empty="Nessun servizio nel periodo."
              rows={v.topServices.map((s) => ({
                key: s.name,
                left: s.name,
                right: String(s.count),
              }))}
            />

            <SectionBlock
              title="Prodotti venduti"
              subtitle="Quantità attribuite nel periodo."
              empty="Nessun prodotto nel periodo."
              rows={v.topProducts.map((p) => ({
                key: p.name,
                left: p.name,
                right: String(p.qty),
              }))}
            />
          </>
        ) : null}

        {error && v ? (
          <Text style={styles.inlineError}>Aggiornamento non riuscito: {error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function KpiRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.kpiRow}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function SectionBlock({
  title,
  subtitle,
  empty,
  rows,
}: {
  title: string;
  subtitle: string;
  empty: string;
  rows: { key: string; left: string; right: string }[];
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyText}>{empty}</Text>
      ) : (
        rows.map((r, i) => (
          <View
            key={r.key + String(i)}
            style={[styles.rankRow, i < rows.length - 1 ? styles.rankRowBorder : null]}>
            <Text style={styles.rankLeft} numberOfLines={2}>
              {r.left}
            </Text>
            <Text style={styles.rankRight}>{r.right}</Text>
          </View>
        ))
      )}
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
  loadingHint: {
    marginTop: 8,
    color: TEXT_MUTED,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.12,
  },
  errorPanel: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: RADIUS_LG,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  errorKicker: {
    color: GOLD_LIGHT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  errorBody: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: GOLD_EDGE,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: SURFACE_CARD,
  },
  retryLabel: {
    color: GOLD_LIGHT,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  periodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  periodHint: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  segmentBtnActive: {
    backgroundColor: SURFACE_CARD,
    borderWidth: 1,
    borderColor: GOLD_BRAND_LINE,
  },
  segmentLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  segmentLabelActive: {
    color: GOLD_LIGHT,
  },
  rangeTitle: {
    color: TEXT_MAIN,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  rangeSub: {
    color: TEXT_DIM,
    fontSize: 13,
    marginBottom: 20,
    letterSpacing: 0.15,
  },
  emptyPeriodBanner: {
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS_MD,
    backgroundColor: SURFACE_CARD,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  emptyPeriodTitle: {
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  emptyPeriodBody: {
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.08,
  },
  heroCard: {
    backgroundColor: SURFACE_ELEVATED,
    borderRadius: RADIUS_LG,
    paddingHorizontal: 22,
    paddingVertical: 22,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: BORDER_INSET_SOFT,
    borderLeftWidth: 3,
    borderLeftColor: GOLD_EDGE,
  },
  heroKicker: {
    color: GOLD_LIGHT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  kpiLabel: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  kpiValue: {
    color: TEXT_MAIN,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  kpiRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_INSET_SOFT,
    marginVertical: 12,
  },
  sectionCard: {
    backgroundColor: SURFACE_CARD,
    borderRadius: RADIUS_MD,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_BRONZE,
  },
  sectionTitle: {
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 6,
  },
  sectionSub: {
    color: TEXT_DIM,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
    letterSpacing: 0.08,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  rankRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_INSET_SOFT,
  },
  rankLeft: {
    flex: 1,
    color: TEXT_MAIN,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  rankRight: {
    color: GOLD_LIGHT,
    fontSize: 14,
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
