/* Tests node du compteur « visiteurs → demandes → RDV » (/api/mesure-site, /admin/stats/) sur un site local
   (base D1 locale neuve). Aucun cookie posé par le compteur, robots et essais jamais comptés, résultats réservés à l'agence.
   Lancer depuis outils/tests-espace/ :  node --test node/compteur.test.mjs */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { demarrer, client } from './serveur-test.mjs';

let site;
before(async () => { site = await demarrer({ port: 8897 }); });
after(async () => { if (site) await site.arreter(); });

const ADMIN = 'shawez@gravelin-immo.com';
const NAV = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const REPONSES = { type: 'appartement', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', lat: 47.32396, lon: 5.03633, delai: 'asap', surface: 72, pieces: 3, chambres: 2, epoque: 'nsp', etat: 'bon', etage: 1, etages_immeuble: 4 };
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function mesure(corps, ua = NAV) {
  const r = await fetch(site.base + '/api/mesure-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: site.base, 'User-Agent': ua }, body: JSON.stringify(corps) });
  return r;
}
async function lire(c, jours = 30) {
  const h = { 'User-Agent': NAV };
  if (c && c.jar.size) h.Cookie = [...c.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const r = await fetch(site.base + '/api/mesure-site?jours=' + jours, { headers: h });
  return { _status: r.status, ...(await r.json()) };
}
async function dernierLien(email, chemin) {
  for (let i = 0; i < 40; i++) {
    const m = [...site.boite].reverse().find((x) => [].concat(x.to).includes(email) && String(x.text || '').includes(chemin + '?lien='));
    if (m) return String(m.text).match(/\?lien=([A-Za-z0-9_-]+)/)[1];
    await attendre(150);
  }
  throw new Error('aucun lien reçu pour ' + email);
}

let agence;

test('le compteur répond 204, sans cookie ; robots, autre site et corps illisible ignorés sans erreur', async () => {
  const r = await mesure({ p: '/', n: 1, r: 'www.google.fr', u: '' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.getSetCookie().length, 0, 'aucun cookie');
  assert.equal((await mesure({ p: '/estimer/', n: 0, r: '', u: '' })).status, 204);
  assert.equal((await mesure({ p: '/biens/394-maison-dijon/', n: 1, r: '', u: 'instagram' })).status, 204);
  assert.equal((await mesure({ p: '/admin/', n: 1, r: '', u: '' })).status, 204);   // compté comme « /prive », jamais le détail
  // jamais comptés
  assert.equal((await mesure({ p: '/', n: 1, r: '', u: '' }, 'Mozilla/5.0 (compatible; Googlebot/2.1)')).status, 204);
  assert.equal((await mesure({ p: '/', n: 1, r: '', u: '' }, 'Mozilla/5.0 Chrome-Lighthouse')).status, 204);
  const ailleurs = await fetch(site.base + '/api/mesure-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://ailleurs.example', 'User-Agent': NAV }, body: '{"p":"/","n":1}' });
  assert.equal(ailleurs.status, 204);
  const illisible = await fetch(site.base + '/api/mesure-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: site.base, 'User-Agent': NAV }, body: 'pas du json' });
  assert.equal(illisible.status, 204);
  const gros = await mesure({ p: '/' + 'a'.repeat(700), n: 1 });
  assert.equal(gros.status, 204);
});

test('les résultats : refusés sans session (401) et à un client (403)', async () => {
  assert.equal((await lire(null))._status, 401);
  const c = client(site.base);
  const r = await c.appel('/estimation', { corps: { reponses: REPONSES, consentement: true, duree: 60000, contact: { civilite: 'Mme', prenom: 'Lina', nom: 'Essai', email: 'lina.compteur@exemple-test.fr', telephone: '06 11 22 33 44' } } });
  assert.equal(r._status, 201);
  assert.equal((await lire(c))._status, 403);
});

test('agence : visiteurs, sources, pages, demandes (essais exclus) et taux', async () => {
  // un essai « TEST » ne compte jamais
  const t = client(site.base);
  assert.equal((await t.appel('/estimation', { corps: { reponses: REPONSES, consentement: true, duree: 60000, contact: { civilite: 'M.', prenom: 'TEST Compteur', nom: 'Essai', email: 'test.compteur@exemple-test.fr', telephone: '06 11 22 33 45' } } }))._status, 201);
  agence = client(site.base);
  await agence.appel('/inscription', { corps: { civilite: 'M.', prenom: 'Shawez', nom: 'Ali', email: ADMIN, telephone: '07 67 57 92 28', mot_de_passe: 'Essai-local-2026', consentement: true } });
  agence = client(site.base);
  assert.equal((await agence.appel('/lien', { corps: { email: ADMIN, vers: 'admin' } })).envoye, true);
  const o = await agence.appel('/lien/ouvrir', { corps: { jeton: await dernierLien(ADMIN, '/admin/') } });
  assert.equal(o.compte.admin, true);
  const d = await lire(agence);
  assert.equal(d._status, 200);
  assert.equal(d.visites, 3, 'Google + Instagram + /admin/ (robots, autre site, illisible et trop long exclus)');
  assert.equal(d.vues, 4);
  assert.deepEqual(d.sources.map((s) => s.cle).sort(), ['direct', 'google', 'instagram']);
  assert.ok(d.pages.some((p) => p.chemin === '/prive'), 'les pages privées sont regroupées');
  assert.ok(!d.pages.some((p) => p.chemin.startsWith('/admin')));
  assert.equal(d.demandes, 1, 'la demande de Lina ; celle de « TEST » et celle de l\'agence ne comptent pas');
  assert.equal(d.taux_visite_demande, 33.3);
  assert.equal(d.rdv, 0);
  assert.equal(d.taux_demande_rdv, 0);
  assert.equal(d.objectifs.visite_demande, 5);
  assert.equal(d.par_jour.length, 1);
  assert.equal(d.par_jour[0].demandes, 1);
});

test('/admin/stats/ : page privée (nonce sur le script, jamais de mesure d\'audience ni de compteur)', async () => {
  const r = await fetch(site.base + '/admin/stats/');
  assert.equal(r.status, 200);
  const csp = r.headers.get('Content-Security-Policy') || '';
  assert.match(csp, /script-src 'nonce-/);
  const html = await r.text();
  assert.match(html, /<script nonce="/);
  assert.ok(!html.includes('id="mesure-site"'));
  assert.ok(!html.includes('metricool'));
});

test('les pages publiques portent le compteur, pas /mon-espace/', async () => {
  const accueil = await (await fetch(site.base + '/')).text();
  assert.ok(accueil.includes('id="mesure-site"'));
  const espace = await (await fetch(site.base + '/mon-espace/')).text();
  assert.ok(!espace.includes('id="mesure-site"'));
});
