/**
 * Design system Team App — unica sorgente per colori/superfici coerenti con Scaramuzzo Manager.
 */

/** Sfondo schermata principale / shell. */
export const SHELL = '#140905';
/** Top bar / superfici compatte. */
export const SURFACE_HEADER = '#1b0d08';
/** Card / pannelli principali. */
export const SURFACE_CARD = '#24140e';
/** Superficie media (accenti, righe attive). */
export const SURFACE_MEDIUM = '#341A09';
/** Card secondarie / blocchi dashboard (grigio caldo). */
export const SURFACE_ELEVATED = '#161616';
/** Campi input / aree incassate. */
export const SURFACE_SUNKEN = '#111111';
/** Blocco azione / riquadro compatto. */
export const SURFACE_ACTION = '#121212';

export const TEXT_MAIN = '#F5E7D6';
export const TEXT_MUTED = '#c9b299';
/** Stati secondari freddi (es. “fuori”, righe attenuate). */
export const TEXT_NEUTRAL = '#9ca3af';
/** Testo molto attenuato (info secondarie). */
export const TEXT_DIM = '#6b6b6b';

export const GOLD_LIGHT = '#f3d8b6';
export const GOLD_BRAND = '#c5a572';

/** Bronzo per linee UI (soft). */
export const BORDER_BRONZE = 'rgba(92,58,33,0.55)';
/** Bordo inferiore top bar — #5c3a21 attenuato. */
export const HEADER_BORDER_BRONZE = 'rgba(92,58,33,0.42)';
/** Bordi leggeri su superfici scure. */
export const BORDER_INSET = 'rgba(255,255,255,0.06)';
export const BORDER_INSET_SOFT = 'rgba(255,255,255,0.05)';
/** Evidenza oro su separatori / card. */
export const GOLD_EDGE = 'rgba(243,216,182,0.35)';
export const GOLD_RIM = 'rgba(243,216,182,0.45)';
export const GOLD_FILL_SOFT = 'rgba(243,216,182,0.12)';
export const GOLD_BORDER_SOFT = 'rgba(243,216,182,0.28)';
export const GOLD_BRAND_LINE = 'rgba(197,165,114,0.45)';

export const POSITIVE = '#0FA958';
/** Badge / pill da verde brand. */
export const POSITIVE_FILL = 'rgba(15,169,88,0.12)';
export const POSITIVE_BORDER = 'rgba(15,169,88,0.38)';

/** Amber — warning / stati attesa. */
export const WARNING = '#d9a24a';
export const WARNING_FILL = 'rgba(217,162,74,0.1)';
export const WARNING_BORDER = 'rgba(217,162,74,0.38)';

/** Pill neutra (bronzo). */
export const NEUTRAL_PILL_FILL = 'rgba(197,165,114,0.08)';

/** CTA ad alto contrasto su sfondo scuro (es. login). */
export const CTA_SURFACE = '#FFFFFF';
export const CTA_ON_LIGHT = '#0a0a0a';

/** Scrim overlay drawer (sfondo scuro semi-trasparente). */
export const OVERLAY_SCRIM = 'rgba(0,0,0,0.58)';

/** Separatore sopra footer drawer (bronzo soft, coerente con header). */
export const FOOTER_SEPARATOR_BRONZE = 'rgba(92,58,33,0.45)';

/** Ombra neutra per card elevate. */
export const SHADOW_COLOR = '#000000';

/** ActivityIndicator / RefreshControl — unico accento caricamento. */
export const SPINNER_TINT = GOLD_BRAND;

/** Ombra leggera lista card (iOS shadow + Android elevation). */
export const CARD_SHADOW_SUBTLE = {
  shadowColor: SHADOW_COLOR,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.14,
  shadowRadius: 10,
  elevation: 2,
};
