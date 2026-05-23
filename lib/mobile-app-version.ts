import Constants from 'expo-constants';

/** Versione app inviata nelle timbrature (audit). */
export function getMobileAppVersion(): string {
  const fromExpo = Constants.expoConfig?.version;
  if (typeof fromExpo === 'string' && fromExpo.trim()) {
    return fromExpo.trim();
  }
  return '1.0.0';
}
