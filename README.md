# Scaramuzzo Team App

App mobile Expo per i collaboratori (presenze, agenda, statistiche operative).

## Avvio in sviluppo

1. Installa le dipendenze: `npm install`
2. Configura `.env` con `EXPO_PUBLIC_API_BASE_URL` (URL del gestionale Scaramuzzo Manager)
3. Avvia Metro: `npx expo start`

## Script utili

- `npm run lint` — ESLint (Expo)
- `npm run ios` / `npm run android` / `npm run web` — apre il target scelto

## Struttura

- `app/` — schermate Expo Router (login, drawer: Home, Appuntamenti, Statistiche, Presenze)
- `lib/` — client API mobile, parser statistiche e presenze
- `constants/` — tema UI e configurazione
- `assets/images/` — logo app, icon/splash per build Expo
