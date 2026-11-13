#!/usr/bin/env node
/**
 * Copia l'export statico Expo (`dist/`) in Manager `public/team/`
 * per hosting same-origin su https://manager.scaramuzzo.green/team/
 * (niente CORS: le API /api/mobile/* restano sullo stesso host).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const managerTeam = join(root, '..', 'scaramuzzo-manager', 'public', 'team');

if (!existsSync(dist)) {
  console.error('Manca dist/. Esegui prima: npm run export:web');
  process.exit(1);
}

if (!existsSync(join(root, '..', 'scaramuzzo-manager', 'public'))) {
  console.error('Repo Manager non trovato accanto a scaramuzzo-team-app (../scaramuzzo-manager/public).');
  process.exit(1);
}

rmSync(managerTeam, { recursive: true, force: true });
mkdirSync(managerTeam, { recursive: true });
cpSync(dist, managerTeam, { recursive: true });
console.log(`Synced ${dist} → ${managerTeam}`);
console.log('URL: https://manager.scaramuzzo.green/team/');
