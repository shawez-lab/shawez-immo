/* Parcours de demande personnelle : aucune requête réseau ni donnée de production.
   SQLite imite D1 ; le faux transport recueille les alertes en mémoire. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { onRequest } from '../../../functions/api/lead.js';
import { SCHEMA, SCHEMA_SP } from '../../../functions/_lib/base.js';

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA); sqlite.exec(SCHEMA_SP);
  sqlite.exec('ALTER TABLE demandes ADD COLUMN suspect INTEGER NOT NULL DEFAULT 0');
  const values = list => list.map(v => v === undefined ? null : typeof v === 'boolean' ? Number(v) : v);
  const statement = (sql, args = []) => ({
    bind: (...bound) => statement(sql, bound),
    async first(column) { const row = sqlite.prepare(sql).get(...values(args)); return row ? column ? row[column] : { ...row } : null; },
    async all() { return { results: sqlite.prepare(sql).all(...values(args)).map(row => ({ ...row })) }; },
    async run() { sqlite.prepare(sql).run(...values(args)); return { success: true }; },
  });
  const mails = [];
  const env = { DB: { prepare: statement, async batch(statements) { for (const item of statements) await item.run(); return []; } },
    NOTIFY_EMAILS: 'agency@example.invalid',
    MAILER: { async fetch(url, options) { assert.equal(url, 'https://mailer/envoyer'); mails.push(JSON.parse(options.body)); return Response.json({ id: 'memory-only' }); } },
  };
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Aucun réseau réel autorisé dans ces tests'); });
  t.after(() => sqlite.close());
  return { env, sqlite, mails };
}
const body = {
  type: 'Maison', commune: 'Is-sur-Tille', prenom: 'Lina', nom: 'Essai', email: 'lina@example.invalid', consent_notice: true,
  attribution: { origine: '/prix-immobilier-is-sur-tille/', utm_source: 'google', utm_medium: 'organic', utm_campaign: 'estimation_locale' },
};
async function call(f, value = body, origin = 'https://shawez-immo.com') {
  const pending = [];
  const request = new Request('https://shawez-immo.com/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(value) });
  const response = await onRequest({ request, env: f.env, waitUntil: promise => pending.push(promise) });
  await Promise.all(pending);
  return { status: response.status, data: await response.json() };
}

test('demande minimale : bien facultatif omis, provenance enregistrée et présente dans l’alerte simulée', async t => {
  const f = fixture(t), r = await call(f);
  assert.equal(r.status, 201); assert.match(r.data.reference, /^E-\d{8}-[A-F0-9]{6}$/);
  const row = f.sqlite.prepare('SELECT * FROM demandes').get(), rep = JSON.parse(row.reponses);
  assert.equal(rep.pieces, null); assert.equal(rep.surface, null); assert.equal(rep.deja_en_agence, null);
  assert.deepEqual(rep.attribution, body.attribution);
  assert.match(row.notes, /prix-immobilier-is-sur-tille/); assert.match(row.notes, /utm_source=google/);
  assert.equal(f.mails.length, 1); assert.match(f.mails[0].text, /Page d’origine : \/prix-immobilier-is-sur-tille\//);
  assert.match(f.mails[0].text, /Déjà en agence : non renseigné/);
});

test('attribution invalide ignorée : pas de referrer externe, contact ni requête privée stockés', async t => {
  const f = fixture(t), r = await call(f, { ...body, attribution: { origine: 'https://external.invalid/?email=lina@example.invalid', utm_source: 'lina@example.invalid', utm_medium: '0612345678', utm_campaign: 'x'.repeat(81), referrer: 'https://external.invalid' } });
  assert.equal(r.status, 201);
  assert.deepEqual(JSON.parse(f.sqlite.prepare('SELECT reponses FROM demandes').get().reponses).attribution, {});
  assert.doesNotMatch(f.sqlite.prepare('SELECT notes FROM demandes').get().notes, /external|lina@example/);
  assert.doesNotMatch(f.mails[0].text, /Provenance :|Page d’origine :/);
});

for (const origine of ['/admin/', '/mon-espace/', '/api/lead/', '//evil.invalid/', '/contact/?email=lina', '/contact/#lina', '/%61dmin/', '/contact/../admin/']) {
  test(`origine rejetée sans perdre la demande : ${origine}`, async t => {
    const f = fixture(t), r = await call(f, { ...body, attribution: { origine } });
    assert.equal(r.status, 201); assert.deepEqual(JSON.parse(f.sqlite.prepare('SELECT reponses FROM demandes').get().reponses).attribution, {});
  });
}

test('visite-bien conserve son circuit et ses libellés', async t => {
  const f = fixture(t), r = await call(f, { ...body, formulaire: 'visite-bien', bien_ref: 'ESSAI-1', bien_titre: 'Maison à Is-sur-Tille', bien_url: 'https://shawez-immo.com/biens/essai-1/', creneau: 'Matin' });
  assert.equal(r.status, 201);
  const rep = JSON.parse(f.sqlite.prepare('SELECT reponses FROM demandes').get().reponses);
  assert.equal(rep.formulaire, 'visite-bien'); assert.equal(rep.bien.ref, 'ESSAI-1');
  assert.match(f.mails[0].subject, /^Visite réf\. ESSAI-1/); assert.match(f.mails[0].text, /Disponibilités : Matin/);
  assert.doesNotMatch(f.mails[0].text, /Fourchette :|Déjà en agence :/);
});

test('notice et origine de requête restent obligatoires', async t => {
  const f = fixture(t);
  assert.equal((await call(f, { ...body, consent_notice: false })).status, 400);
  assert.equal((await call(f, body, 'https://external.invalid')).status, 403);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM demandes').get().n, 0); assert.equal(f.mails.length, 0);
});

const html = readFileSync(new URL('../../../estimation-immobiliere-dijon/index.html', import.meta.url), 'utf8');
const source = html.split('/* ---------- FORMULAIRE D\'ESTIMATION ---------- */')[1].split('/* ---------- DÉMARRAGE ---------- */')[0];
function browser(search = '') {
  const nodes = new Map();
  const noop = () => {};
  function node(key) {
    if (!nodes.has(key)) nodes.set(key, { value: '', checked: false, hidden: false, innerHTML: '', style: {}, validity: {},
      classList: { add: noop, remove: noop, toggle: noop }, closest() { return this; },
      addEventListener: noop, setAttribute: noop, getAttribute: () => '', scrollIntoView: noop, querySelector: () => null,
    });
    return nodes.get(key);
  }
  const ctx = { location: { search, pathname: '/estimation-immobiliere-dijon/' }, URLSearchParams,
    document: { createElement: () => ({ set textContent(v) { this.innerHTML = v.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); } }) },
    store: { del: noop }, sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    $: selector => node(selector), $$: () => [], window: {}, setTimeout: noop,
  };
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.result = {payload, validate, buildRecap, state, attribution};})();'), ctx);
  return { ...ctx.result, nodes };
}

test('formulaire réel : commune préremplie sans coordonnées, projet facultatif, récapitulatif échappé', () => {
  const f = browser('?commune=Is-sur-Tille&origine=%2Fprix-immobilier-is-sur-tille%2F&utm_source=google&email=private%40example.invalid');
  assert.equal(f.state.commune, 'Is-sur-Tille'); assert.equal(f.nodes.get('#f-commune').value, 'Is-sur-Tille');
  assert.equal(f.state.email, undefined); assert.equal(f.validate(2), true);
  f.state.type = 'Maison'; assert.equal(f.validate(1), true); // aucune surface ni pièce nécessaire
  f.state.message = '<img src=x onerror=alert(1)>';
  f.buildRecap(); assert.doesNotMatch(f.nodes.get('#recap').innerHTML, /<img/); assert.match(f.nodes.get('#recap').innerHTML, /&lt;img/);
  const p = f.payload(); assert.equal(p.attribution.origine, '/prix-immobilier-is-sur-tille/'); assert.equal(p.deja_en_agence, null);
  assert.equal(p.page, '/estimation-immobiliere-dijon/'); assert.equal(p.email, '');
});

test('formulaire réel : adresse précise ou injection dans la commune ignorées', () => {
  for (const commune of ['30 rue de la Liberté', '<img src=x>', 'x'.repeat(101)]) {
    const f = browser('?commune=' + encodeURIComponent(commune) + '&origine=%2Fadmin%2F&utm_source=private%40example.invalid');
    assert.equal(f.state.commune, undefined); assert.deepEqual(JSON.parse(JSON.stringify(f.attribution)), {});
  }
});
