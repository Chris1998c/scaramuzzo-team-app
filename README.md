# Scaramuzzo Team App

App mobile Expo per i collaboratori (presenze, agenda, statistiche operative). Consuma le API `POST /api/mobile/*` di **Scaramuzzo Manager** (non include backend proprio in produzione).

## Avvio in sviluppo

1. Installa le dipendenze: `npm install`
2. Copia `.env.example` → `.env` e imposta **`EXPO_PUBLIC_API_BASE_URL`** (URL del Manager; obbligatorio anche per build EAS)
3. Avvia Metro: `npx expo start`

## Script utili

- `npm run lint` — ESLint (Expo)
- `npm run typecheck` — TypeScript (solo app mobile; esclude `server-app/`)
- `npm run ios` / `npm run android` / `npm run web` — apre il target scelto

## Struttura

- `app/` — schermate Expo Router (login, drawer: Home, Appuntamenti, Statistiche, Presenze)
- `lib/` — client API mobile, sessione JWT, parser statistiche e presenze
- `constants/` — tema UI e configurazione
- `assets/images/` — logo app, icon/splash per build Expo

## Sessione mobile

Dopo il login il Manager deve restituire `access_token` (JWT). L’app considera la sessione valida solo con **`staff_id` + `access_token`** in SecureStore; senza token le schermate protette reindirizzano al login.

## Build interna (EAS)

È presente un `eas.json` di base (`preview` / `internal`). Prima di una build:

1. Configurare `EXPO_PUBLIC_API_BASE_URL` come secret o env EAS per il profilo usato
2. Eseguire `npx eas build --profile preview --platform ios` (o android) quando il progetto EAS è collegato

Non è inclusa una build automatica in CI.

## Cartella `server-app/` (non produzione)

`server-app/` è un **mock Next.js + MySQL** storico per prove locali. **Non fa parte della Team App in produzione** e non va deployato con l’app Expo. Per il pilota usare sempre il Manager reale.

- Escluso da `tsc` / ESLint del progetto mobile
- `server-app/.next/` è in `.gitignore` (artifact di build)
