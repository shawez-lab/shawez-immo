/* Contrats réels de base.js : succès sans valeur, erreurs typées.
   SQLite en mémoire imite uniquement D1 ; modèle et transport mail sont simulés.
   Aucun appel réseau ni identifiant réel, aucune production. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost, onRequestGet } from '../../../functions/api/chat.js';
import { SCHEMA, SCHEMA_SP, Erreur, verifierOrigine, limiter } from '../../../functions/_lib/base.js';

const ORIGIN = 'https://site.example.invalid';
const SESSION = 'a'.repeat(32);
const TEXT = 'Je souhaite comprendre les étapes pour vendre mon logement.';
const MODEL_ANSWER = { reponse: 'Dans quel secteur se trouve votre logement ?', intention: 'vendre', secteur: '', budget: '', echeance: '', serieux: false, raison: 'Projet à préciser' };

function fixture(t, answer = MODEL_ANSWER) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA); sqlite.exec(SCHEMA_SP);
  const values = list => list.map(value => value === undefined ? null : typeof value === 'boolean' ? Number(value) : value);
  const statement = (sql, args = []) => ({
    bind: (...bound) => statement(sql, bound),
    async first(column) { const row = sqlite.prepare(sql).get(...values(args)); return row ? column ? row[column] : { ...row } : null; },
    async all() { return { results: sqlite.prepare(sql).all(...values(args)).map(row => ({ ...row })) }; },
    async run() { sqlite.prepare(sql).run(...values(args)); return { success: true }; },
  });
  const model = [], mails = [], logs = [];
  const env = {
    DB: { prepare: statement, async batch(statements) { for (const item of statements) await item.run(); return []; } },
    REGLE9_CHAT_NOMS: JSON.stringify(['visiteurexclufictif']),
    ANTHROPIC_API_KEY: 'local-synthetic-key', NOTIFY_EMAILS: 'agency@example.invalid',
    MAILER: { async fetch(url, options) { mails.push(JSON.parse(options.body)); return new Response('{"id":"local-only"}', { status: 200 }); } },
  };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), 'https://api.anthropic.com/v1/messages', 'aucun autre service ne doit être appelé');
    model.push(JSON.parse(options.body));
    return Response.json({ content: [{ text: JSON.stringify(answer) }], usage: { input_tokens: 10, output_tokens: 10 } });
  });
  t.mock.method(console, 'log', (...args) => { logs.push(args.join(' ')); });
  t.mock.method(console, 'error', (...args) => { logs.push(args.join(' ')); });
  t.after(() => sqlite.close());
  return { env, sqlite, model, mails, logs };
}

function request({ body = { session: SESSION, message: TEXT, page: '/' }, origin = ORIGIN, contentType = 'application/json', raw, ip = '192.0.2.1' } = {}) {
  const headers = { 'Content-Type': contentType, 'CF-Connecting-IP': ip };
  if (origin !== null) headers.Origin = origin;
  return new Request(`${ORIGIN}/api/chat`, { method: 'POST', headers, body: raw === undefined ? JSON.stringify(body) : raw });
}
async function call(f, options) {
  const response = await onRequestPost({ env: f.env, request: request(options) });
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return { status: response.status, data: await response.json() };
}
const count = (f, table) => f.sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

// Pas de mocks pour verifierOrigine, limiter, corps, texte, json, envoyer ou gabarit.
test('les gardes réelles réussissent sans valeur, puis limiter lève Erreur 429', async t => {
  const f = fixture(t);
  assert.equal(verifierOrigine(request()), undefined);
  assert.equal(await limiter(f.env, 'contrat-direct', 1, 3600), undefined);
  await assert.rejects(limiter(f.env, 'contrat-direct', 1, 3600), error => error instanceof Erreur && error.status === 429);
  assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
});

test('POST de même origine atteint le modèle simulé, persiste le fil et comptabilise le coût', async t => {
  const f = fixture(t);
  const r = await call(f);
  assert.equal(r.status, 200); assert.equal(r.data.fin, false);
  assert.match(r.data.reponse, /Dans quel secteur/);
  assert.equal(f.model.length, 1); assert.equal(f.mails.length, 0);
  assert.equal(count(f, 'chat_fil'), 2); assert.equal(count(f, 'chat_sessions'), 1);
  assert.equal(count(f, 'leads_couts'), 1);
  assert.ok(f.sqlite.prepare('SELECT cout FROM leads_couts').get().cout > 0);
  assert.deepEqual(f.sqlite.prepare('SELECT n FROM limites ORDER BY cle').all().map(row => row.n), [1, 1]);
});

for (const origin of [null, 'https://foreign.example.invalid']) {
  test(`origine ${origin === null ? 'absente' : 'étrangère'} : JSON403 sans effet`, async t => {
    const f = fixture(t); const r = await call(f, { origin });
    assert.equal(r.status, 403); assert.equal(r.data.erreur, 'origine');
    assert.equal(count(f, 'limites'), 0); assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
  });
}

for (const [label, options, status, code, field] of [
  ['type', { contentType: 'text/plain' }, 415, 'format'],
  ['JSON', { raw: '{' }, 400, 'json'],
  ['tableau', { raw: '[]' }, 400, 'json'],
  ['taille', { raw: 'x'.repeat(8001) }, 413, 'taille'],
  ['session absente', { body: { message: TEXT } }, 400, 'champs', 'session'],
  ['session courte', { body: { session: 'short', message: TEXT } }, 400, 'session'],
  ['message objet', { body: { session: SESSION, message: {} } }, 400, 'champs', 'message'],
  ['message long', { body: { session: SESSION, message: 'x'.repeat(2001) } }, 400, 'champs', 'message'],
]) {
  test(`validation ${label} : statut et JSON explicites, sans effet`, async t => {
    const f = fixture(t); const r = await call(f, options);
    assert.equal(r.status, status); assert.equal(r.data.erreur, code);
    if (field) assert.equal(r.data.champ, field);
    assert.equal(count(f, 'limites'), 0); assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
  });
}

test('configuration manquante : fermé sans modèle ni mail', async t => {
  const f = fixture(t); delete f.env.REGLE9_CHAT_NOMS;
  const r = await call(f);
  assert.deepEqual(r, { status: 503, data: { erreur: 'configuration_exclusions', reponse: '', fin: true } });
  assert.equal(count(f, 'limites'), 0); assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
});

test('D1 absente : Erreur 503 sérialisée', async t => {
  const f = fixture(t); delete f.env.DB;
  const r = await call(f);
  assert.equal(r.status, 503); assert.equal(r.data.erreur, 'base_absente');
  assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
});

test('le 40e message par session est accepté, le 41e est un JSON429 sans modèle/mail', async t => {
  const f = fixture(t);
  f.sqlite.prepare('INSERT INTO limites (cle,n,fin) VALUES (?,?,?)').run(`chat:s:${SESSION}`, 39, Math.floor(Date.now()/1000) + 3600);
  assert.equal((await call(f)).status, 200, 'message 40');
  const r = await call(f);
  assert.deepEqual(r, { status: 429, data: { erreur: 'trop_de_demandes', reponse: '', fin: true } });
  assert.equal(f.model.length, 1); assert.equal(f.mails.length, 0); assert.equal(count(f, 'chat_fil'), 2);
});

test('80 messages par IP acceptés, même avec des sessions différentes ; 81e refusé', async t => {
  const f = fixture(t);
  for (let i = 0; i < 80; i++) {
    const r = await call(f, { body: { session: i.toString(16).padStart(32, '0'), message: TEXT } });
    assert.equal(r.status, 200, `message IP ${i + 1}`);
  }
  const r = await call(f, { body: { session: 'f'.repeat(32), message: TEXT } });
  assert.equal(r.status, 429); assert.equal(r.data.erreur, 'trop_de_demandes');
  assert.equal(r.data.reponse, ''); assert.equal(r.data.fin, true);
  assert.equal(f.model.length, 80); assert.equal(f.mails.length, 0);
});

test('plafond journalier 0,50 USD : aucun nouvel appel modèle', async t => {
  const f = fixture(t); await call(f);
  const day = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  f.sqlite.prepare('INSERT INTO leads_couts VALUES (?, ?, ?, ?, ?)').run(day, 'local-cap', 0.5, 0, new Date().toISOString());
  const r = await call(f);
  assert.equal(r.status, 200); assert.equal(r.data.whatsapp, null);
  assert.equal(f.model.length, 1); assert.equal(f.mails.length, 0);
});

test('règle 9 : aucune réponse, aucun appel modèle ni mail', async t => {
  const f = fixture(t); const r = await call(f, { body: { session: SESSION, message: 'VisiteurExcluFictif souhaite vendre.' } });
  assert.deepEqual(r, { status: 200, data: { reponse: '', fin: true } });
  assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM chat_fil WHERE sens='out'").get().n, 0);
});

test('une limite déjà atteinte reste sans réponse automatique pour une personne exclue', async t => {
  const f = fixture(t);
  f.sqlite.prepare('INSERT INTO limites (cle,n,fin) VALUES (?,?,?)').run(`chat:s:${SESSION}`, 40, Math.floor(Date.now()/1000) + 3600);
  const r = await call(f, { body: { session: SESSION, message: 'VisiteurExcluFictif souhaite vendre.' } });
  assert.equal(r.status, 429); assert.equal(r.data.reponse, ''); assert.equal(r.data.fin, true);
  assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
});

test('qualification sérieuse : le module mail réel appelle une seule fois le transport simulé', async t => {
  const f = fixture(t, { ...MODEL_ANSWER, secteur: 'Ville fictive', echeance: 'Au printemps', serieux: true });
  await call(f); await call(f);
  assert.equal(f.mails.length, 1); assert.match(f.mails[0].subject, /Contact sérieux/);
  assert.equal(f.mails[0].to, 'agency@example.invalid');
  assert.equal(f.sqlite.prepare('SELECT notifie FROM chat_sessions').get().notifie, 1);
});

test('exception interne : JSON500 générique, aucun détail sensible dans réponse ni logs', async t => {
  const f = fixture(t); const privateDetail = 'PRIVATE-DATABASE-DIAGNOSTIC';
  f.env.DB.prepare = () => { throw new Error(privateDetail); };
  const r = await call(f);
  assert.deepEqual(r, { status: 500, data: { erreur: 'serveur', reponse: '', fin: true } });
  assert.ok(!JSON.stringify(r).includes(privateDetail)); assert.ok(!f.logs.join('\n').includes(privateDetail));
  assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
});

test('exception modèle : secours existant conservé, diagnostic sensible non journalisé', async t => {
  const f = fixture(t); const privateDetail = 'PRIVATE-PROVIDER-DIAGNOSTIC';
  t.mock.method(globalThis, 'fetch', async () => { throw new Error(privateDetail); });
  const r = await call(f);
  assert.equal(r.status, 200); assert.match(r.data.reponse, /préfère laisser Shawez/);
  assert.ok(!JSON.stringify(r).includes(privateDetail)); assert.ok(!f.logs.join('\n').includes(privateDetail));
});

for (const suffix of ['', '?test=1']) {
  test(`GET${suffix} : 405 sans appel modèle, base ou mail`, async t => {
    const f = fixture(t);
    const env = new Proxy({}, { get() { throw new Error('GET must not access bindings'); } });
    const response = await onRequestGet({ request: new Request(`${ORIGIN}/api/chat${suffix}`), env });
    assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'POST');
    assert.deepEqual(await response.json(), { erreur: 'methode' });
    assert.equal(f.model.length, 0); assert.equal(f.mails.length, 0);
  });
}

// Le caller transmet une adresse scalaire : mail.js produit alors la liste plate attendue par Resend.
for (const partialFailure of [false, true]) {
  test(`plusieurs destinataires Resend : payload plat, sans répétition${partialFailure ? ' même après échec partiel' : ''}`, async t => {
    const f = fixture(t, { ...MODEL_ANSWER, secteur: 'Ville fictive', echeance: 'Au printemps', serieux: true });
    const destinations = ['agency-one@example.invalid', 'agency-two@example.invalid'];
    f.env.NOTIFY_EMAILS = destinations.join(',');
    f.env.RESEND_API_KEY = 'local-synthetic-mail-key';
    f.env.RESEND_API_URL = 'https://mail.example.invalid/emails';
    delete f.env.MAILER;
    const payloads = [];
    const modelFetch = globalThis.fetch;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (String(url) !== f.env.RESEND_API_URL) return modelFetch(url, options);
      payloads.push(JSON.parse(options.body));
      if (partialFailure && payloads.length === 2) return new Response('synthetic refusal', { status: 500 });
      return Response.json({ id: 'local-accepted' });
    });
    assert.equal((await call(f)).status, 200);
    assert.deepEqual(payloads.map(payload => payload.to), destinations.map(address => [address]));
    assert.ok(payloads.every(payload => payload.to.every(address => typeof address === 'string')));
    assert.equal((await call(f)).status, 200);
    assert.equal(payloads.length, 2, 'aucun destinataire déjà contacté ne reçoit une nouvelle alerte');
  });
}

for(const agency of [false,true])test(`401 Anthropic : chat${agency?'-agence':''} conserve le secours et journalise la cause`,async t=>{
 const f=fixture(t);let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({error:{type:'authentication_error',message:'invalid x-api-key'}},{status:401});});
 const handler=agency?(await import('../../../functions/api/chat-agence.js')).onRequestPost:onRequestPost;
 const response=await handler({env:f.env,request:request()});const data=await response.json();
 assert.equal(response.status,200);assert.match(data.reponse,/préfère laisser/);assert.equal(calls,1);assert.equal(f.mails.length,0);
 assert.match(f.logs.join('\n'),/401.*authentication error.*invalid x api key/);
 assert.match(f.sqlite.prepare('SELECT id FROM leads_couts').get().id,/panne claude 401/);
});
