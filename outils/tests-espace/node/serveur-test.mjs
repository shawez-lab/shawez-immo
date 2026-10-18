/* Un site local pour les tests node : wrangler pages dev sur une base D1 locale neuve (dossier temporaire), et une
   fausse boîte d'envoi qui reçoit les e-mails à la place du service d'envoi. Rien ne touche la production.
   Ports : EE_NODE_PORT (défaut 8893) pour le site, +1 pour la boîte. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..', '..', '..');
const wrangler = process.env.EE_WRANGLER || join(ici, '..', 'node_modules', '.bin', 'wrangler');

export async function demarrer({ port = Number(process.env.EE_NODE_PORT || 8893), variables = {} } = {}) {
  const etat = mkdtempSync(join(tmpdir(), 'ee-node-'));
  const boite = [];
  const portBoite = port + 1;
  const srvBoite = createServer((req, res) => {
    let brut = '';
    req.on('data', (c) => { brut += c; });
    req.on('end', () => {
      try { boite.push(JSON.parse(brut)); } catch (e) { /* ignoré */ }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ id: 'local-' + boite.length }));
    });
  });
  await new Promise((ok) => srvBoite.listen(portBoite, '127.0.0.1', ok));
  const vars = {
    RESEND_API_KEY: 'local', RESEND_API_URL: `http://127.0.0.1:${portBoite}/emails`, ADMIN_EMAILS: 'shawez@gravelin-immo.com',
    NOTIFY_EMAILS: 'shawez@gravelin-immo.com', PBKDF2_ITER: '10000', ...variables,
  };
  const args = ['pages', 'dev', '.', '--port', String(port), '--ip', '127.0.0.1', '--compatibility-date=2025-09-01',
    '--d1', 'DB=f2650d3e-5a22-4532-873b-c1c69fab920f', '--persist-to', etat, '--log-level', 'error', '--inspector-port', String(port + 1100)];
  for (const [k, v] of Object.entries(vars)) args.push('--binding', `${k}=${v}`);
  const p = spawn(wrangler, args, { cwd: racine, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(base + '/api/espace/sante'); if (r.ok) break; } catch (e) { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return {
    base, boite,
    async arreter() {
      p.kill('SIGTERM'); srvBoite.close();
      await new Promise((r) => setTimeout(r, 500));
      try { rmSync(etat, { recursive: true, force: true }); } catch (e) { /* rien */ }
    },
  };
}

/* Un navigateur minimal : garde ses cookies, envoie l'origine du site pour les requêtes qui modifient. */
export function client(base) {
  const jar = new Map();
  const cookies = [];
  // chemin de l'API (« /moi ») ; page: true pour une page du site (« /admin/ »)
  async function appel(chemin, { methode, corps, brut = false, entetes = {}, page = false } = {}) {
    const m = methode || (corps !== undefined ? 'POST' : 'GET');
    const h = { ...entetes };
    if (m !== 'GET') h.Origin = h.Origin === undefined ? base : h.Origin;
    if (h.Origin === null) delete h.Origin;
    if (corps !== undefined) h['Content-Type'] = 'application/json';
    if (jar.size) h.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(base + (page ? chemin : '/api/espace' + chemin), {
      method: m, headers: h, body: corps !== undefined ? JSON.stringify(corps) : undefined, redirect: 'manual',
    });
    for (const c of r.headers.getSetCookie()) {
      cookies.push(c);
      const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (/Max-Age=0/i.test(c) || v === '') jar.delete(k); else jar.set(k, v);
    }
    if (brut) return r;
    let d = {};
    try { d = await r.json(); } catch (e) { /* pas du JSON */ }
    return { ...d, _status: r.status };
  }
  return { appel, jar, cookies };
}
