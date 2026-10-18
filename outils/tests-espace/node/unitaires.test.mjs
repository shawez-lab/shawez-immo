/* Tests node, sans serveur : les règles de base de l'authentification (functions/_lib/base.js) et la politique de
   sécurité des pages privées (functions/_lib/pages-privees.js).
   Lancer depuis outils/tests-espace/ :  node --test node/   (ou npm run test:node) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  email, motDePasse, telephone, texte, hacher, verifierMdp, verifierLeurre, verifierOrigine, estAdmin, admins, jeton, sha256, reglerHachage, Erreur,
} from '../../../functions/_lib/base.js';
import { politique, ENTETES } from '../../../functions/_lib/pages-privees.js';

reglerHachage({ PBKDF2_ITER: '10000' });

const rejette = (f, champ) => assert.throws(f, (e) => e instanceof Erreur && e.status === 400 && (!champ || (e.extra && e.extra.champ === champ)));

test('e-mail : nettoyé (espaces, majuscules, espaces invisibles) et vérifié', () => {
  assert.equal(email('  Shawez@Gravelin-Immo.com '), 'shawez@gravelin-immo.com');
  assert.equal(email('a​.b@exemple.fr'), 'a.b@exemple.fr');
  rejette(() => email('pas-un-email'), 'email');
  rejette(() => email('a@b'), 'email');
  rejette(() => email('<script>@x.fr'), 'email');
  rejette(() => email(''), 'email');
  rejette(() => email({ a: 1 }), 'email');
});

test('mot de passe : 8 caractères au moins, 200 au plus, espaces de bord retirés', () => {
  assert.equal(motDePasse('  abcdefgh  '), 'abcdefgh');
  rejette(() => motDePasse('court'), 'mot_de_passe');
  rejette(() => motDePasse('x'.repeat(201)), 'mot_de_passe');
  rejette(() => motDePasse(12345678), 'mot_de_passe');
});

test('téléphone et texte : formats tenus, caractères de contrôle retirés', () => {
  assert.equal(telephone('06 12 34 56 78'), '06 12 34 56 78');
  assert.equal(telephone('+33 6 12 34 56 78'), '+33 6 12 34 56 78');
  rejette(() => telephone('abc'), 'telephone');
  rejette(() => telephone('12'), 'telephone');
  assert.equal(texte('a\u0000b\u0007c', 10), 'abc');
  rejette(() => texte('x'.repeat(11), 10));
});

test('empreinte du mot de passe : PBKDF2 salé, jamais le mot de passe en clair', async () => {
  const h = await hacher('Essai-local-2026');
  assert.match(h, /^pbkdf2-sha256\$10000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.ok(!h.includes('Essai-local-2026'));
  assert.notEqual(h, await hacher('Essai-local-2026'), 'deux empreintes du même mot de passe diffèrent (sel)');
  assert.equal(await verifierMdp('Essai-local-2026', h), true);
  assert.equal(await verifierMdp('Essai-local-2026 ', h), true, 'espace ajouté par le clavier du téléphone');
  assert.equal(await verifierMdp('essai-local-2026', h), false);
  assert.equal(await verifierMdp('', h), false);
  assert.equal(await verifierMdp('Essai-local-2026', ''), false, 'compte sans mot de passe : jamais de connexion par mot de passe');
  assert.equal(await verifierLeurre('nimporte'), false);
});

test('jetons : 256 bits, imprévisibles ; seule leur empreinte est gardée', async () => {
  const a = jeton(), b = jeton();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.match(await sha256(a), /^[0-9a-f]{64}$/);
});

test('origine : toute requête qui modifie doit venir du site lui-même', () => {
  const req = (method, origin) => new Request('https://shawez-immo.com/api/espace/connexion', { method, headers: origin ? { Origin: origin } : {} });
  assert.doesNotThrow(() => verifierOrigine(req('GET')));
  assert.doesNotThrow(() => verifierOrigine(req('POST', 'https://shawez-immo.com')));
  for (const o of [null, 'https://ailleurs.example', 'https://shawez-immo.com.ailleurs.example', 'null']) {
    assert.throws(() => verifierOrigine(req('POST', o)), (e) => e.status === 403 && e.code === 'origine');
  }
});

test('agence : il faut l\'e-mail de l\'agence ET une adresse prouvée', () => {
  const env = { ADMIN_EMAILS: 'shawez@gravelin-immo.com, marion@gravelin-immo.com' };
  assert.deepEqual(admins(env), ['shawez@gravelin-immo.com', 'marion@gravelin-immo.com']);
  assert.equal(estAdmin({ email: 'shawez@gravelin-immo.com', verifie: 1 }, env), true);
  assert.equal(estAdmin({ email: 'SHAWEZ@gravelin-immo.com', verifie: 1 }, env), true);
  assert.equal(estAdmin({ email: 'shawez@gravelin-immo.com', verifie: 0 }, env), false, 'compte ouvert par quelqu\'un d\'autre avec l\'adresse de l\'agence');
  assert.equal(estAdmin({ email: 'client@exemple-test.fr', verifie: 1 }, env), false);
  assert.equal(estAdmin(null, env), false);
});

test('pages privées : politique stricte à nonce, aucun service tiers, jamais dans un cadre', () => {
  const p = politique('abc123', new URL('https://shawez-immo.com/admin/'));
  assert.match(p, /script-src 'nonce-abc123' 'strict-dynamic' 'self'/);
  assert.ok(!/unsafe-inline[^;]*;/.test(p.split('style-src')[0]), 'pas de script en ligne sans nonce');
  assert.ok(!p.includes('metricool'));
  assert.match(p, /frame-ancestors 'none'/);
  assert.match(p, /object-src 'none'/);
  assert.match(p, /base-uri 'none'/);
  assert.match(p, /upgrade-insecure-requests/);
  assert.ok(!politique('n', new URL('http://127.0.0.1:8788/admin/')).includes('upgrade-insecure-requests'), 'en local, pas de passage forcé en https');
  assert.equal(ENTETES['Cache-Control'], 'no-store');
  assert.equal(ENTETES['Referrer-Policy'], 'no-referrer');
  assert.equal(ENTETES['X-Frame-Options'], 'DENY');
});
