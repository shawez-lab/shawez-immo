/* B03 d'AIMMO : le site demande au socle AIMMO, en ombre (functions/_lib/socle.js).
   Sans serveur : l'API de l'espace est appelée directement, sur une base SQLite en mémoire qui imite D1, avec une fausse
   boîte d'envoi et un faux socle. Rien ne sort de la machine. Les adresses et les noms sont inventés.
   Lancer depuis outils/tests-espace/ :  node --test node/socle-ombre.test.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequest } from '../../../functions/api/espace/[[route]].js';
import {
  adresseSocle, socleConfigure, chiffresDu, texteDuCourrier, demanderAuSocle, comparer, rapportOmbre,
} from '../../../functions/_lib/socle.js';

/* ---------- une base D1 en mémoire ---------- */
function fausseD1() {
  const sq = new DatabaseSync(':memory:');
  const val = (a) => a.map((x) => (x === undefined ? null : typeof x === 'boolean' ? Number(x) : x));
  const ordre = (sql, args = []) => ({
    bind: (...a) => ordre(sql, a),
    async first(col) { const r = sq.prepare(sql).get(...val(args)); return r ? (col ? r[col] : { ...r }) : null; },
    async all() { return { results: sq.prepare(sql).all(...val(args)).map((r) => ({ ...r })) }; },
    async run() { sq.prepare(sql).run(...val(args)); return { success: true }; },
  });
  return { prepare: (sql) => ordre(sql), async batch(l) { for (const o of l) await o.run(); return []; }, sq };
}

const DB = fausseD1();
const CLE = 'k'.repeat(40);
const SOCLE = 'https://socle.essai.invalid';
const BOITE = 'https://boite.essai.invalid/emails';
const boite = [];
const auSocle = [];
let socle = async () => new Response(JSON.stringify({ ok: true, mode: 'essai', sent: false, data: { status: 'would_send', rule: null, code: null, reason: 'ok' } }), { status: 200 });

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u === BOITE) { boite.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
  if (u.startsWith(SOCLE)) { auSocle.push({ url: u, headers: init.headers, corps: JSON.parse(init.body) }); return socle(init); }
  throw new Error('appel sortant inattendu');
};

const ENV = { DB, HORLOGE_TEST: '1', RESEND_API_KEY: 'local', RESEND_API_URL: BOITE, PBKDF2_ITER: '10000', ADMIN_EMAILS: 'agence@exemple-essai.fr', LIMITE_FACTEUR: '1000' };
const RELIE = { ...ENV, AIMMO_API_URL: SOCLE, AIMMO_SITE_AUTO_KEY: CLE };

async function appeler(env, route, maintenant) {
  const attente = [];
  const request = new Request(`https://shawez-immo.com/api/espace/${route}${maintenant ? `?maintenant=${encodeURIComponent(maintenant)}` : ''}`);
  const t0 = Date.now();
  const r = await onRequest({ request, env, params: { route: route.split('/') }, waitUntil: (p) => attente.push(p) });
  const duree = Date.now() - t0;
  await Promise.all(attente);
  return { status: r.status, corps: await r.json(), duree };
}

// 10 h à Paris, un jour d'hiver : ni heures calmes, ni heure des rappels
const MATIN = '2026-11-16T09:00:00.000Z';
// 18 h 30 à Paris : heure des rappels de la veille
const SOIR = '2026-11-16T17:30:00.000Z';
let numero = 0;

async function dossier(email) {
  numero++;
  await appeler(ENV, 'taches', MATIN);   // tables créées au premier appel
  const c = await DB.prepare("INSERT INTO comptes (email, mdp, prenom, verifie, cree_le) VALUES (?1, '', 'Lina', 1, ?2) RETURNING id").bind(email, MATIN).first();
  const d = await DB.prepare("INSERT INTO demandes (reference, compte_id, source, type, adresse, reponses, contact, statut, cree_le) VALUES (?1, ?2, 'shawez-immo', 'appartement', '30 rue de l''Essai', '{}', '{}', 'visite', ?3) RETURNING id")
    .bind(`ESSAI-${numero}`, c.id, MATIN).first();
  return d.id;
}
const COURRIER = { sujet: 'Votre visite est confirmée', titre: 'Visite', paragraphes: ['Je viendrai le 17 novembre à 14 h 30.', 'À bientôt.'], bouton: 'Ouvrir mon espace' };
async function courrierGarde(demandeId, contenu = COURRIER) {
  return (await DB.prepare("INSERT INTO courriers (demande_id, motif, contenu, origine, cree_le) VALUES (?1, 'visite_fixee', ?2, 'https://shawez-immo.com', ?3) RETURNING id")
    .bind(demandeId, JSON.stringify(contenu), MATIN).first()).id;
}
const lignesOmbre = async () => (await DB.prepare('SELECT * FROM socle_ombre ORDER BY id').all()).results;
const sansLien = (m) => ({ to: m.to, subject: m.subject, text: m.text.replace(/lien=[A-Za-z0-9_-]+/g, 'lien=…'), html: m.html.replace(/lien=[A-Za-z0-9_-]+/g, 'lien=…') });
const vider = async () => { boite.length = 0; auSocle.length = 0; await DB.prepare('DELETE FROM socle_ombre').run().catch(() => {}); };

/* ---------- règles de la demande ---------- */

test('mise en service : adresse du socle en https seulement, clé de 32 caractères au moins, coupure par AIMMO_OMBRE', () => {
  assert.equal(adresseSocle({ AIMMO_API_URL: 'https://aimmo-api.exemple.workers.dev/' }), 'https://aimmo-api.exemple.workers.dev/v1/automatisations/envoi');
  assert.equal(adresseSocle({ AIMMO_API_URL: 'http://aimmo-api.exemple.workers.dev' }), null);
  assert.equal(adresseSocle({ AIMMO_API_URL: 'https://moi:secret@aimmo.exemple' }), null);
  assert.equal(adresseSocle({ AIMMO_API_URL: 'http://127.0.0.1:8787' }), 'http://127.0.0.1:8787/v1/automatisations/envoi');
  assert.equal(socleConfigure({}), false);
  assert.equal(socleConfigure({ AIMMO_API_URL: SOCLE, AIMMO_SITE_AUTO_KEY: 'courte' }), false);
  assert.equal(socleConfigure({ AIMMO_API_URL: SOCLE, AIMMO_SITE_AUTO_KEY: CLE }), true);
  assert.equal(socleConfigure({ AIMMO_API_URL: SOCLE, AIMMO_SITE_AUTO_KEY: CLE, AIMMO_OMBRE: '0' }), false);
});

test('texte demandé au socle : sujet et paragraphes tels qu\'ils partent, sans lien personnel ; ses chiffres seulement', () => {
  const t = texteDuCourrier(COURRIER);
  assert.equal(t, 'Votre visite est confirmée\n\nJe viendrai le 17 novembre à 14 h 30.\n\nÀ bientôt.');
  assert.ok(!/lien|http/.test(t));
  assert.deepEqual(chiffresDu(t), ['17', '14', '30']);
  assert.deepEqual(chiffresDu('le 07 à 09 h 05, 7 fois'), ['7', '9', '5']);
  assert.ok(texteDuCourrier({ sujet: 'x', paragraphes: ['y'.repeat(5000)] }).length <= 4000);
});

test('question au socle : forme de la demande, réponse lue, jamais d\'erreur levée', async () => {
  const vus = [];
  const repond = (status, corps) => async (url, init) => { vus.push({ url, init }); return new Response(JSON.stringify(corps), { status }); };
  const q = { automation: 'courrier_vendeur', email: 'lina@exemple-essai.fr', ref: 'courrier-1', texte: 'Le 17 à 14 h.' };
  let r = await demanderAuSocle(RELIE, q, { fetchImpl: repond(200, { ok: true, mode: 'essai', sent: false, data: { status: 'would_send', rule: null, code: null } }) });
  assert.deepEqual(r, { statut: 'part', regle: null, code: null, erreur: null });
  assert.equal(vus[0].url, `${SOCLE}/v1/automatisations/envoi`);
  assert.equal(vus[0].init.headers.Authorization, `Bearer ${CLE}`);
  assert.deepEqual(JSON.parse(vus[0].init.body), { automation: 'courrier_vendeur', email: 'lina@exemple-essai.fr', ref: 'courrier-1', text: 'Le 17 à 14 h.', figures: ['17', '14'] });
  r = await demanderAuSocle(RELIE, q, { fetchImpl: repond(200, { ok: true, mode: 'essai', sent: false, data: { status: 'refused', rule: 'R05', code: null } }) });
  assert.deepEqual(r, { statut: 'ne_part_pas', regle: 'R05', code: null, erreur: null });
  r = await demanderAuSocle(RELIE, q, { fetchImpl: repond(200, { ok: true, mode: 'essai', sent: false, data: { status: 'refused', rule: null, code: 'unknown_person' } }) });
  assert.deepEqual(r, { statut: 'ne_part_pas', regle: null, code: 'unknown_person', erreur: null });
  // une réponse qui dirait « envoyé » n'est pas celle du mode essai : illisible, jamais prise pour un accord
  r = await demanderAuSocle(RELIE, q, { fetchImpl: repond(200, { ok: true, sent: true, data: { status: 'would_send' } }) });
  assert.equal(r.statut, null); assert.equal(r.erreur, 'reponse_illisible');
  r = await demanderAuSocle(RELIE, q, { fetchImpl: repond(401, { ok: false }) });
  assert.deepEqual(r, { statut: null, regle: null, code: null, erreur: 'http_401' });
  r = await demanderAuSocle(RELIE, q, { fetchImpl: async () => { throw new TypeError('réseau'); } });
  assert.equal(r.erreur, 'injoignable');
  const t0 = Date.now();
  r = await demanderAuSocle(RELIE, q, { delai: 150, fetchImpl: (u, init) => new Promise((_, ko) => init.signal.addEventListener('abort', () => ko(new Error('coupé')))) });
  assert.equal(r.erreur, 'delai'); assert.ok(Date.now() - t0 < 1500);
  r = await demanderAuSocle(ENV, q, { fetchImpl: repond(200, {}) });
  assert.equal(r.erreur, 'non_configure');
  assert.equal(vus.length, 5, 'non configuré : aucun appel');
  assert.equal(comparer('part', { statut: 'part' }), 'accord');
  assert.equal(comparer('part', { statut: 'ne_part_pas' }), 'ecart');
  assert.equal(comparer('part', { statut: null }), 'sans_reponse');
});

/* ---------- le site envoie exactement comme avant ---------- */

test('socle non relié : e-mail gardé envoyé comme avant, aucune question, rien de rangé', async () => {
  await vider();
  await courrierGarde(await dossier('avant@exemple-essai.fr'));
  const r = await appeler(ENV, 'taches', MATIN);
  assert.equal(r.corps.courriers, 1);
  assert.equal(boite.length, 1);
  assert.equal(auSocle.length, 0);
  assert.equal((await lignesOmbre()).length, 0);
});

test('socle d\'accord, en désaccord, lent, en panne : l\'e-mail part toujours, à l\'identique, et les deux décisions sont rangées', async () => {
  const reference = [];
  // la référence : le même e-mail, socle non relié
  await vider();
  await courrierGarde(await dossier('meme@exemple-essai.fr'));
  await appeler(ENV, 'taches', MATIN);
  reference.push(...boite.map(sansLien));
  const id = (await DB.prepare("SELECT d.id FROM demandes d JOIN comptes c ON c.id = d.compte_id WHERE c.email = 'meme@exemple-essai.fr'").first()).id;

  const cas = [
    ['accord', async () => new Response(JSON.stringify({ ok: true, mode: 'essai', sent: false, data: { status: 'would_send', rule: null, code: null } }), { status: 200 }), { resultat: 'accord', socle: 'part', regle: null, erreur: null }],
    ['désaccord', async () => new Response(JSON.stringify({ ok: true, mode: 'essai', sent: false, data: { status: 'refused', rule: 'R05', code: null } }), { status: 200 }), { resultat: 'ecart', socle: 'ne_part_pas', regle: 'R05', erreur: null }],
    ['panne', async () => new Response('{"ok":false}', { status: 503 }), { resultat: 'sans_reponse', socle: null, regle: null, erreur: 'http_503' }],
    ['injoignable', async () => { throw new TypeError('réseau coupé'); }, { resultat: 'sans_reponse', socle: null, regle: null, erreur: 'injoignable' }],
    ['lent', (init) => new Promise((_, ko) => init.signal.addEventListener('abort', () => ko(new Error('coupé')))), { resultat: 'sans_reponse', socle: null, regle: null, erreur: 'delai' }],
  ];
  for (const [nom, reponse, attendu] of cas) {
    await vider();
    socle = reponse;
    await courrierGarde(id);
    const r = await appeler(RELIE, 'taches', MATIN);
    assert.equal(r.status, 200, nom);
    assert.equal(r.corps.courriers, 1, `${nom} : l'e-mail part`);
    assert.ok(r.duree < 3000, `${nom} : la réponse du site n'attend pas le socle (${r.duree} ms)`);
    assert.deepEqual(boite.map(sansLien), reference, `${nom} : e-mail identique à celui d'avant`);
    assert.equal(auSocle.length, 1, `${nom} : une seule question`);
    assert.equal(auSocle[0].corps.automation, 'courrier_vendeur');
    assert.match(auSocle[0].corps.ref, /^courrier-\d+$/);
    assert.equal(auSocle[0].corps.email, 'meme@exemple-essai.fr');
    assert.ok(!auSocle[0].corps.text.includes('lien='), `${nom} : jamais le lien personnel au socle`);
    const l = await lignesOmbre();
    assert.equal(l.length, 1, nom);
    assert.equal(l[0].site, 'part');
    for (const [k, v] of Object.entries(attendu)) assert.equal(l[0][k], v, `${nom} : ${k}`);
  }
  socle = async () => new Response(JSON.stringify({ ok: true, mode: 'essai', sent: false, data: { status: 'would_send', rule: null, code: null } }), { status: 200 });
});

test('e-mail gardé périmé (visite déplacée) : le site ne l\'envoie pas, le socle est quand même interrogé et l\'écart compté', async () => {
  await vider();
  const id = await dossier('perime@exemple-essai.fr');
  await courrierGarde(id, { ...COURRIER, controle: { visite: '2026-11-17T13:30:00.000Z' } });
  const r = await appeler(RELIE, 'taches', MATIN);
  assert.equal(r.corps.courriers, 0);
  assert.equal(boite.length, 0);
  const l = await lignesOmbre();
  assert.equal(l.length, 1);
  assert.deepEqual([l[0].site, l[0].site_raison, l[0].socle, l[0].resultat], ['ne_part_pas', 'perime', 'part', 'ecart']);
});

test('rappel de visite la veille à 18 h : envoyé comme avant, la question au socle porte « rappel_visite »', async () => {
  await vider();
  const id = await dossier('rappel@exemple-essai.fr');
  await DB.prepare("INSERT INTO visites (demande_id, etat, debut, fixee_le, cree_le) VALUES (?1, 'fixee', '2026-11-17T13:30:00.000Z', '2026-11-10T09:00:00.000Z', ?2)").bind(id, MATIN).run();
  const r = await appeler(RELIE, 'taches', SOIR);
  assert.equal(r.corps.rappels, 1);
  assert.equal(boite.length, 1);
  assert.equal(auSocle.length, 1);
  assert.equal(auSocle[0].corps.automation, 'rappel_visite');
  assert.match(auSocle[0].corps.ref, /^visite-\d+$/);
  assert.equal(boite[0].subject.length > 0, true);
  const l = await lignesOmbre();
  assert.deepEqual([l[0].automation, l[0].site, l[0].resultat], ['rappel_visite', 'part', 'accord']);
  // deuxième passage dans le même créneau : ni rappel, ni question
  await appeler(RELIE, 'taches', SOIR);
  assert.equal(boite.length, 1); assert.equal(auSocle.length, 1);
});

/* ---------- le rapport ---------- */

test('rapport : écarts comptés par règle, aucune donnée personnelle, réservé à l\'agence', async () => {
  await vider();
  const id = await dossier('rapport@exemple-essai.fr');
  socle = async () => new Response(JSON.stringify({ ok: true, mode: 'essai', sent: false, data: { status: 'refused', rule: 'R02', code: null } }), { status: 200 });
  await courrierGarde(id); await courrierGarde(id);
  await appeler(RELIE, 'taches', MATIN);
  socle = async () => new Response(JSON.stringify({ ok: true, mode: 'essai', sent: false, data: { status: 'would_send', rule: null, code: null } }), { status: 200 });
  await courrierGarde(id);
  await appeler(RELIE, 'taches', MATIN);
  const rap = await rapportOmbre(RELIE, DB, { jours: 7 });
  assert.equal(rap.actif, true);
  assert.equal(rap.total, 3); assert.equal(rap.ecarts, 2); assert.equal(rap.accords, 1); assert.equal(rap.sans_reponse, 0);
  assert.deepEqual(rap.ecarts_par_regle, { R02: 2 });
  const texte = JSON.stringify(rap);
  for (const interdit of ['rapport@exemple-essai.fr', 'Lina', 'Essai', "rue de l'Essai", 'visite est confirmée', 'courrier-', 'ESSAI-']) assert.ok(!texte.includes(interdit), interdit);
  assert.equal((await rapportOmbre(ENV, DB)).actif, false);
  // la route du rapport : jamais sans session de l'agence
  const r = await appeler(RELIE, 'admin/ombre');
  assert.ok([401, 403].includes(r.status), String(r.status));
  // aucune colonne pour une adresse, un texte, un nom ou une référence de dossier
  const colonnes = (await DB.prepare('PRAGMA table_info(socle_ombre)').all()).results.map((c) => c.name);
  assert.deepEqual(colonnes, ['id', 'automation', 'site', 'site_raison', 'socle', 'regle', 'code', 'erreur', 'resultat', 'cree_le']);
});
