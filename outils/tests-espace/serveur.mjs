#!/usr/bin/env node
/* Serveurs locaux pour les tests de l'espace estimation (rien n'est écrit dans la vraie base, aucun e-mail ne part).

   - http://127.0.0.1:8790  fausse boîte d'envoi : reçoit les e-mails à la place du service d'envoi
                            (GET /boite : la liste, DELETE /boite : vider)
   - http://127.0.0.1:8788  le site, e-mails aux clients ouverts (lien de connexion…), plafonds de débit relevés
   - http://127.0.0.1:8789  le site comme en production aujourd'hui : pas d'e-mail aux clients, plafonds réels

   Lancer :  node serveur.mjs   (depuis outils/tests-espace/, après « npm install »)
   Variables : EE_ETAT=<dossier> pour garder les bases locales entre deux lancements (défaut : dossier temporaire). */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..', '..');
const etat = process.env.EE_ETAT || mkdtempSync(join(tmpdir(), 'ee-tests-'));
const wrangler = process.env.EE_WRANGLER || join(ici, 'node_modules', '.bin', 'wrangler');

/* ---------- fausse boîte d'envoi ---------- */
let boite = [];
createServer((req, res) => {
  const fin = (code, corps) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(corps)); };
  if (req.method === 'POST' && req.url === '/emails') {
    let brut = '';
    req.on('data', (c) => { brut += c; });
    req.on('end', () => { try { boite.push({ ...JSON.parse(brut), recu_le: new Date().toISOString() }); fin(200, { id: 'local-' + boite.length }); } catch (e) { fin(400, { error: 'json' }); } });
    return;
  }
  if (req.url === '/boite' && req.method === 'GET') return fin(200, boite);
  if (req.url === '/boite' && req.method === 'DELETE') { boite = []; return fin(200, { ok: true }); }
  fin(404, { error: 'introuvable' });
}).listen(8790, '127.0.0.1');

/* ---------- le site, deux fois ---------- */
function site(port, nom, variables) {
  const args = ['pages', 'dev', '.', '--port', String(port), '--ip', '127.0.0.1', '--compatibility-date=2025-09-01',
    '--d1', 'DB=f2650d3e-5a22-4532-873b-c1c69fab920f', '--persist-to', join(etat, nom), '--log-level', 'warn', '--inspector-port', String(port + 1000)];
  for (const [k, v] of Object.entries(variables)) args.push('--binding', `${k}=${v}`);
  // lancé depuis la racine du dépôt : wrangler y cherche le dossier functions/
  const p = spawn(wrangler, args, { cwd: racine, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  p.on('exit', (c) => { console.log(`[${nom}] arrêté (${c})`); process.exit(c || 0); });
  return p;
}
const enfants = [
  site(8788, 'avec-email', { RESEND_API_KEY: 'local', RESEND_API_URL: 'http://127.0.0.1:8790/emails', LIMITE_FACTEUR: '200', ADMIN_EMAILS: 'shawez@gravelin-immo.com', NOTIFY_EMAILS: 'shawez@gravelin-immo.com', PBKDF2_ITER: '10000' }),
  site(8789, 'sans-email', { PBKDF2_ITER: '10000' }),
];
const stop = () => { enfants.forEach((e) => e.kill('SIGTERM')); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
console.log(`Bases locales : ${etat}`);
