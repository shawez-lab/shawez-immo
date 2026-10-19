/* Tests node, sur un site local (wrangler pages dev, base D1 locale neuve, fausse boîte d'envoi) : connexion,
   sessions, liens reçus par e-mail, droits (un client ne voit jamais l'agence ni les données d'un autre client),
   pages privées, RGPD. Aucun compte réel, aucun vrai mot de passe, rien n'est envoyé.
   Lancer depuis outils/tests-espace/ :  node --test node/   (ou npm run test:node) */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demarrer, client } from './serveur-test.mjs';

let site;
before(async () => { site = await demarrer(); });
after(async () => { if (site) await site.arreter(); });

const ADMIN = 'shawez@gravelin-immo.com';
const MDP = 'Essai-local-2026';
let n = 0;
const emailTest = (p) => `${p}.${Date.now().toString(36)}${(n++).toString(36)}@exemple-test.fr`;
const REPONSES = { type: 'appartement', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', lat: 47.32396, lon: 5.03633, delai: 'asap', surface: 72, pieces: 3, chambres: 2, epoque: 'nsp', etat: 'bon', etage: 1, etages_immeuble: 4 };
const estimation = (c, email, prenom = 'Lina') => c.appel('/estimation', { corps: { reponses: REPONSES, consentement: true, duree: 60000, contact: { civilite: 'Mme', prenom, nom: 'Essai', email, telephone: '06 11 22 33 44' } } });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
async function dernierLien(email, chemin = '/mon-espace/') {
  for (let i = 0; i < 40; i++) {
    const m = [...site.boite].reverse().find((x) => [].concat(x.to).includes(email) && String(x.text || '').includes(chemin + '?lien='));
    if (m) return String(m.text).match(/\?lien=([A-Za-z0-9_-]+)/)[1];
    await attendre(150);
  }
  throw new Error('aucun lien reçu pour ' + email);
}
const cookie = (c, nom) => c.cookies.filter((x) => x.startsWith(nom + '=')).pop() || '';

let A, B, emailA, emailB, demandeA, demandeB, agence;

test('toute requête qui modifie doit venir du site : sans origine ou d\'ailleurs, refusée', async () => {
  const c = client(site.base);
  assert.equal((await c.appel('/connexion', { corps: { email: 'x@exemple-test.fr', mot_de_passe: MDP }, entetes: { Origin: null } }))._status, 403);
  assert.equal((await c.appel('/connexion', { corps: { email: 'x@exemple-test.fr', mot_de_passe: MDP }, entetes: { Origin: 'https://ailleurs.example' } }))._status, 403);
  assert.equal((await c.appel('/deconnexion', { corps: {}, entetes: { Origin: 'https://ailleurs.example' } }))._status, 403);
});

test('estimation : le compte est créé et la session ouverte, cookie HttpOnly + Secure + SameSite', async () => {
  A = client(site.base); B = client(site.base);
  emailA = emailTest('a'); emailB = emailTest('b');
  const ra = await estimation(A, emailA);
  assert.equal(ra._status, 201);
  demandeA = ra.demande_id;
  const s = cookie(A, 'se_session');
  assert.match(s, /HttpOnly/); assert.match(s, /Secure/); assert.match(s, /SameSite=Lax/); assert.match(s, /Max-Age=2592000/);
  assert.equal((await A.appel('/moi')).compte.email, emailA);
  const rb = await estimation(B, emailB, 'Bruno');
  assert.equal(rb._status, 201);
  demandeB = rb.demande_id;
});

test('un client ne voit jamais l\'espace agence', async () => {
  for (const [chemin, opts] of [['/admin/demandes'], ['/admin/comptes'], ['/admin/export.csv?quoi=demandes'], ['/admin/journal-agence'], ['/admin/promesses'],
    ['/admin/demande', { corps: { id: demandeB, notes: 'x' } }], ['/admin/compte/lien', { corps: { id: 1, type: 'acces' } }], ['/admin/flux', { corps: {} }],
    ['/admin/demande/supprimer', { corps: { id: demandeB } }], ['/admin/compte/supprimer', { corps: { id: 1 } }], ['/admin/reglages', { corps: { rdv_url: '' } }]]) {
    const r = await A.appel(chemin, opts);
    assert.equal(r._status, 403, chemin);
    assert.equal(r.error, 'interdit', chemin);
  }
  // sans session : 401
  assert.equal((await client(site.base).appel('/admin/demandes'))._status, 401);
});

test('un client ne voit jamais les données d\'un autre client', async () => {
  // B ne peut ni demander une visite ni déposer un fichier sur le dossier de A
  assert.equal((await B.appel('/visite', { corps: { demande: demandeA, creneaux: [] } }))._status, 404);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(64).fill(0)]);
  const depot = async (c, id) => {
    const h = { Origin: site.base, 'Content-Type': 'image/png', 'X-Fichier-Nom': 'photo.png', Cookie: [...c.jar].map(([k, v]) => `${k}=${v}`).join('; ') };
    const r = await fetch(`${site.base}/api/espace/fichier?demande=${id}&role=photo`, { method: 'POST', headers: h, body: png });
    return { _status: r.status, ...(await r.json()) };
  };
  assert.equal((await depot(B, demandeA))._status, 404);
  const f = await depot(A, demandeA);
  assert.equal(f._status, 201);
  // B ne peut ni lire ni retirer le fichier de A ; sans session non plus
  assert.equal((await B.appel('/fichier?id=' + encodeURIComponent(f.fichier.id)))._status, 404);
  assert.equal((await B.appel('/fichier/supprimer', { corps: { id: f.fichier.id } }))._status, 404);
  assert.equal((await client(site.base).appel('/fichier?id=' + encodeURIComponent(f.fichier.id)))._status, 401);
  const lu = await A.appel('/fichier?id=' + encodeURIComponent(f.fichier.id), { brut: true });
  assert.equal(lu.status, 200);
  assert.equal(lu.headers.get('x-content-type-options'), 'nosniff');
  // la liste de B ne contient que son dossier
  const moiB = await B.appel('/moi');
  assert.deepEqual(moiB.demandes.map((d) => d.id), [demandeB]);
  // export RGPD de B : rien de A
  const ex = await B.appel('/moi/export', { brut: true });
  const txt = await ex.text();
  assert.ok(!txt.includes(emailA));
});

test('agence : une adresse de l\'agence n\'ouvre rien sans la preuve par e-mail ; l\'intrus perd la main', async () => {
  const intrus = client(site.base);
  const r = await intrus.appel('/inscription', { corps: { civilite: 'M.', prenom: 'Intrus', nom: 'Essai', email: ADMIN, telephone: '06 00 00 00 00', mot_de_passe: MDP, consentement: true } });
  assert.equal(r._status, 201);
  const refus = await intrus.appel('/admin/demandes');
  assert.equal(refus._status, 403);
  assert.equal(refus.error, 'admin_non_verifie');
  // la vraie agence demande son lien : il ouvre /admin/
  agence = client(site.base);
  assert.equal((await agence.appel('/lien', { corps: { email: ADMIN, vers: 'admin' } })).envoye, true);
  const j = await dernierLien(ADMIN, '/admin/');
  const o = await agence.appel('/lien/ouvrir', { corps: { jeton: j } });
  assert.equal(o._status, 200);
  assert.equal(o.compte.admin, true);
  assert.equal(o.mot_de_passe_retire, true, 'le mot de passe posé par l\'intrus est retiré');
  // session de l'agence : 7 jours
  assert.match(cookie(agence, 'se_session'), /Max-Age=604800/);
  const liste = await agence.appel('/admin/demandes');
  assert.equal(liste._status, 200);
  const ids = liste.demandes.map((d) => d.id);
  assert.ok(ids.includes(demandeA) && ids.includes(demandeB));
  // l'intrus est déconnecté et son mot de passe ne marche plus
  assert.equal((await intrus.appel('/moi')).compte, null);
  assert.equal((await client(site.base).appel('/connexion', { corps: { email: ADMIN, mot_de_passe: MDP } })).error, 'sans_mot_de_passe');
  // le lien ne sert qu'une fois
  assert.equal((await client(site.base).appel('/lien/ouvrir', { corps: { jeton: j } })).error, 'jeton');
  // un lien inventé est refusé
  assert.equal((await client(site.base).appel('/lien/ouvrir', { corps: { jeton: 'x'.repeat(43) } })).error, 'jeton');
});

test('agence : pas de suppression de son propre compte ni d\'un compte de l\'agence ; suppression d\'un dossier inexistant : 404', async () => {
  const comptes = (await agence.appel('/admin/comptes')).comptes;
  const moi = comptes.find((c) => c.email === ADMIN);
  assert.equal((await agence.appel('/admin/compte/supprimer', { corps: { id: moi.id } })).error, 'soi_meme');
  assert.equal((await agence.appel('/admin/demande/supprimer', { corps: { id: 999999 } }))._status, 404);
  assert.equal((await agence.appel('/admin/compte/lien', { corps: { id: moi.id, type: 'acces' } })).error, 'compte_agence');
  // journal de l'agence : la table n'existe pas tant que la migration n'est pas appliquée → rien ne casse
  const ja = await agence.appel('/admin/journal-agence');
  assert.equal(ja._status, 200);
  assert.equal(ja.actif, false);
});

test('mot de passe : trop d\'essais → bloqué ; adresse inconnue → même réponse qu\'un mauvais mot de passe', async () => {
  assert.equal((await A.appel('/mot-de-passe/definir', { corps: { mot_de_passe: MDP } }))._status, 200);
  const x = client(site.base);
  assert.equal((await x.appel('/connexion', { corps: { email: emailTest('inconnu'), mot_de_passe: MDP } })).error, 'identifiants');
  let codes = [];
  for (let i = 0; i < 11; i++) codes.push((await x.appel('/connexion', { corps: { email: emailA, mot_de_passe: 'mauvais-' + i } }))._status);
  assert.deepEqual(codes.slice(0, 10), new Array(10).fill(401));
  assert.equal(codes[10], 429);
});

test('déconnexion de tous les appareils : les autres sessions sont fermées', async () => {
  const B2 = client(site.base);
  assert.equal((await B.appel('/mot-de-passe/definir', { corps: { mot_de_passe: MDP } }))._status, 200);
  assert.equal((await B2.appel('/connexion', { corps: { email: emailB, mot_de_passe: MDP } }))._status, 200);
  assert.equal((await B.appel('/moi')).compte.email, emailB);
  const r = await B2.appel('/deconnexion', { corps: { partout: true } });
  assert.equal(r._status, 200); assert.equal(r.partout, true);
  assert.match(cookie(B2, 'se_session'), /Max-Age=0/);
  assert.equal((await B.appel('/moi')).compte, null, 'l\'autre appareil est déconnecté');
  // et un appel après expiration retire le témoin « connecté »
  const e = await B.appel('/visite', { corps: { demande: demandeB, creneaux: [] } });
  assert.equal(e.error, 'connexion');
});

test('RGPD : export de ses données (fichier JSON), sans les notes internes ni les empreintes', async () => {
  await agence.appel('/admin/demande', { corps: { id: demandeA, notes: 'NOTE-INTERNE-AGENCE' } });
  const r = await A.appel('/moi/export', { brut: true });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="mes-donnees-\d{4}-\d{2}-\d{2}\.json"/);
  const d = JSON.parse(await r.text());
  assert.equal(d.compte.email, emailA);
  assert.equal(d.dossiers.length, 1);
  assert.equal(d.dossiers[0].adresse, REPONSES.adresse);
  const brut = JSON.stringify(d);
  assert.ok(!brut.includes('NOTE-INTERNE-AGENCE'));
  assert.ok(!brut.includes('pbkdf2'));
  assert.equal((await client(site.base).appel('/moi/export'))._status, 401);
});

test('pages privées : politique de sécurité à nonce sur chaque script, aucun service tiers, jamais en cache', async () => {
  for (const p of ['/admin/', '/admin/promesses/', '/mon-espace/']) {
    const r = await client(site.base).appel(p, { page: true, brut: true });
    assert.equal(r.status, 200, p);
    const csp = r.headers.get('content-security-policy') || '';
    const nonce = (csp.match(/'nonce-([A-Za-z0-9_-]+)'/) || [])[1];
    assert.ok(nonce, p + ' : nonce');
    assert.match(csp, /frame-ancestors 'none'/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    const html = await r.text();
    const scripts = html.match(/<script\b[^>]*>/g) || [];
    assert.ok(scripts.length >= 3, p + ' : scripts');
    for (const s of scripts) if (!/type="application\/ld\+json"/.test(s)) assert.ok(s.includes(`nonce="${nonce}"`), p + ' : ' + s);
    assert.ok(!/tracker\.metricool\.com/.test(html), p + ' : pas de mesure d\'audience');
    // deux affichages, deux nonces
    const r2 = await client(site.base).appel(p, { page: true, brut: true });
    assert.notEqual((r2.headers.get('content-security-policy').match(/'nonce-([^']+)'/) || [])[1], nonce);
  }
});

test('fichiers internes : le code de l\'API et le schéma de la base ne sont jamais servis', async () => {
  for (const p of ['/functions/schema.sql', '/functions/_lib/base.js', '/functions/migrations/2026-10-18-admin.sql', '/outils/espace.py']) {
    const r = await client(site.base).appel(p, { page: true, brut: true });
    assert.equal(r.status, 404, p);
  }
});

test('API : réponses jamais interprétées comme une page ni mises en cache', async () => {
  const r = await client(site.base).appel('/moi', { brut: true });
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(r.headers.get('content-type'), /application\/json/);
});

test('migration du 18/10/2026 : seulement des ajouts, relançable, appliquée sur une copie du schéma', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { SCHEMA, SCHEMA_SP } = await import('../../../functions/_lib/base.js');
  const sql = readFileSync(new URL('../../../functions/migrations/2026-10-18-admin.sql', import.meta.url), 'utf8');
  const sansCommentaires = sql.replace(/--.*$/gm, '');
  assert.ok(!/\b(DROP|DELETE|UPDATE|ALTER|REPLACE|INSERT)\b/i.test(sansCommentaires), 'aucune suppression ni modification');
  const d = new DatabaseSync(':memory:');
  d.exec(SCHEMA); d.exec(SCHEMA_SP);
  d.exec("INSERT INTO comptes (email, mdp, cree_le) VALUES ('x@exemple-test.fr', '', '2026-10-18')");
  d.exec(sql); d.exec(sql);   // deux fois : sans erreur
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM comptes').get().n, 1, 'les données restent');
  d.exec("INSERT INTO journal_agence (par, action, cree_le) VALUES ('shawez@gravelin-immo.com', 'export', '2026-10-18')");
  assert.equal(d.prepare('SELECT COUNT(*) AS n FROM journal_agence').get().n, 1);
});
