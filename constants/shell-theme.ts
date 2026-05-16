/**
 * Design system Team App — allineato a Scaramuzzo Manager (warm brown premium).
 * Token canonici + alias per compatibilità con il codice esistente.
 */

// —— Token canonici Manager ——
export const BG_SHELL = '#140905';
export const BG_SURFACE = '#1b0d08';
export const BG_ELEVATED = '#24140e';
export const BORDER_WARM = '#5c3a21';
export const ACCENT_CREAM = '#f3d8b6';
export const TEXT_BODY = '#c9b299';
export const TEXT_MUTED_SOFT = 'rgba(255,255,255,0.60)';
export const CTA_PRIMARY = '#0FA958';

// —— Alias superfici ——
/** @alias BG_SHELL */
export const SHELL = BG_SHELL;
/** @alias BG_SURFACE — header, input, aree incassate */
export const SURFACE_HEADER = BG_SURFACE;
/** @alias BG_ELEVATED — card e pannelli rialzati */
export const SURFACE_CARD = BG_ELEVATED;
/** @alias BG_ELEVATED */
export const SURFACE_ELEVATED = BG_ELEVATED;
/** Accento caldo per righe attive / fasce */
export const SURFACE_MEDIUM = '#341A09';
/** @alias BG_SURFACE */
export const SURFACE_SUNKEN = BG_SURFACE;
/** @alias BG_SURFACE */
export const SURFACE_ACTION = BG_SURFACE;

// —— Testo ——
/** Titoli e valori in evidenza */
export const TEXT_MAIN = '#F5E7D6';
/** @alias TEXT_BODY */
export const TEXT_MUTED = TEXT_BODY;
/** @alias TEXT_MUTED_SOFT */
export const TEXT_DIM = TEXT_MUTED_SOFT;
/** Stati secondari (es. “fuori”) — tono caldo, non grigio freddo */
export const TEXT_NEUTRAL = 'rgba(201,178,153,0.55)';

// —— Accenti crema / bronzo ——
/** @alias ACCENT_CREAM */
export const GOLD_LIGHT = ACCENT_CREAM;
export const GOLD_BRAND = '#c5a572';

export const BORDER_BRONZE = 'rgba(92,58,33,0.55)';
export const BORDER_WARM_SOFT = 'rgba(92,58,33,0.42)';
/** @alias BORDER_WARM_SOFT */
export const HEADER_BORDER_BRONZE = BORDER_WARM_SOFT;
export const BORDER_INSET = 'rgba(255,255,255,0.06)';
export const BORDER_INSET_SOFT = 'rgba(92,58,33,0.35)';

export const GOLD_EDGE = 'rgba(243,216,182,0.35)';
export const GOLD_RIM = 'rgba(243,216,182,0.45)';
export const GOLD_FILL_SOFT = 'rgba(243,216,182,0.12)';
export const GOLD_BORDER_SOFT = 'rgba(243,216,182,0.28)';
export const GOLD_BRAND_LINE = 'rgba(197,165,114,0.45)';

// —— Stati semantici ——
/** @alias CTA_PRIMARY — emerald */
export const POSITIVE = CTA_PRIMARY;
export const EMERALD = CTA_PRIMARY;
export const POSITIVE_FILL = 'rgba(15,169,88,0.14)';
export const POSITIVE_BORDER = 'rgba(15,169,88,0.42)';

export const WARNING = '#d9a24a';
export const WARNING_FILL = 'rgba(217,162,74,0.12)';
export const WARNING_BORDER = 'rgba(217,162,74,0.38)';

export const DANGER = '#e85d5d';
export const DANGER_FILL = 'rgba(232,93,93,0.12)';
export const DANGER_BORDER = 'rgba(232,93,93,0.38)';

export const NEUTRAL_PILL_FILL = 'rgba(197,165,114,0.08)';

// —— CTA ——
export const CTA_CREAM = ACCENT_CREAM;
export const CTA_ON_CREAM = '#0a0a0a';
/** Testo su pulsante verde primario */
export const CTA_ON_PRIMARY = '#FFFFFF';
/** @deprecated Usare CTA_ON_CREAM su fill crema; mantenuto per compat */
export const CTA_ON_LIGHT = CTA_ON_CREAM;
/** Login / azioni primarie Manager */
export const CTA_SURFACE = CTA_PRIMARY;

export const OVERLAY_SCRIM = 'rgba(0,0,0,0.58)';
export const FOOTER_SEPARATOR_BRONZE = BORDER_WARM_SOFT;

export const SHADOW_COLOR = '#000000';
export const SPINNER_TINT = ACCENT_CREAM;

/** Bordo standard card operative */
export const CARD_BORDER_COLOR = BORDER_BRONZE;

export const CARD_SHADOW_SUBTLE = {
  shadowColor: SHADOW_COLOR,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 12,
  elevation: 3,
};
