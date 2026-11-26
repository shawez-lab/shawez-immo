/* La provenance se transmet dans le document seulement : aucune donnée ni requête réelle. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../../../assets/estimation-provenance.js', import.meta.url), 'utf8');
const base = 'https://shawez-immo.com';

class Element {
  constructor(tag, attrs = {}, value = '') { this.tagName = tag.toUpperCase(); this.attrs = { ...attrs }; this.value = value; this.children = []; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  appendChild(el) { this.children.push(el); }
  querySelectorAll(selector) { const nom = selector.match(/^\[name="([^"]+)"\]$/)?.[1]; return this.children.filter(c => c.getAttribute('name') === nom); }
}
function fixture({ url = base + '/agent-immobilier-dijon/?utm_source=google&utm_medium=fiche', links = [], forms = [] } = {}) {
  const doc = {
    querySelectorAll(selector) { if (selector === 'a[href]') return links; if (selector === 'form') return forms; throw new Error('Sélecteur imprévu'); },
    createElement(tag) { assert.equal(tag, 'input'); return new Element(tag); },
  };
  const window = { location: new URL(url) };
  for (const objet of [window, doc]) {
    for (const interdit of ['fetch', 'localStorage', 'sessionStorage', 'cookie', 'referrer']) {
      Object.defineProperty(objet, interdit, { get() { throw new Error('Lecture interdite : ' + interdit); }, set() { throw new Error('Écriture interdite : ' + interdit); } });
    }
  }
  const ctx = vm.createContext({ document: doc, window, URL, URLSearchParams });
  return { run() { vm.runInContext(code, ctx); }, links, forms };
}
const lien = href => new Element('a', { href, target: '_blank', 'aria-label': 'Demander mon estimation' });
const form = (action, method = 'get', fields = []) => { const f = new Element('form', { action, method }); f.children = fields; return f; };
const input = (name, value, type = 'hidden') => new Element('input', { name, type }, value);
const cible = '/estimation-immobiliere-dijon/';
const queryLien = l => new URL(l.getAttribute('href'), base).searchParams;

test('Google vers estimation : commune, origine, fragment et attributs du lien conservés', () => {
  const l = lien(cible + '?commune=Dijon&origine=%2Fagent-immobilier-dijon%2F#formulaire');
  const f = fixture({ links: [l] }); f.run();
  const u = new URL(l.getAttribute('href'), base);
  assert.equal(u.searchParams.get('commune'), 'Dijon'); assert.equal(u.searchParams.get('origine'), '/agent-immobilier-dijon/');
  assert.equal(u.searchParams.get('utm_source'), 'google'); assert.equal(u.searchParams.get('utm_medium'), 'fiche');
  assert.equal(u.hash, '#formulaire'); assert.equal(l.getAttribute('target'), '_blank'); assert.equal(l.getAttribute('aria-label'), 'Demander mon estimation');
  const avant = l.getAttribute('href'); f.run(); assert.equal(l.getAttribute('href'), avant);
});

test('une campagne explicite valide sur la cible reste prioritaire', () => {
  const l = lien(cible + '?utm_source=partenaire&utm_campaign=fiche_locale#formulaire'); fixture({ links: [l] }).run();
  assert.equal(queryLien(l).get('utm_source'), 'partenaire'); assert.equal(queryLien(l).get('utm_campaign'), 'fiche_locale');
  assert.equal(queryLien(l).get('utm_medium'), 'fiche');
});

test('aucun lien externe, privé, vers le tunnel en ligne ou contenant des données personnelles ne change', () => {
  const hrefs = ['https://external.invalid' + cible, '//external.invalid' + cible, '/admin/', '/mon-espace/', '/api/lead', '/merci/', '/estimer/',
    'javascript:alert(1)', 'https://contact@example.invalid' + cible, cible + '?email=lina@example.invalid', cible + '?adresse=30+rue+exemple'];
  const links = hrefs.map(lien); fixture({ links }).run();
  assert.deepEqual(links.map(l => l.getAttribute('href')), hrefs);
});

test('source privée ou contenant un paramètre personnel : aucune propagation', () => {
  for (const path of ['/admin/?utm_source=google', '/%61dmin/?utm_source=google', '/mon-espace/?utm_source=google',
    '/api/lead?utm_source=google', '/merci/?utm_source=google', '/?utm_source=google&adresse=Dijon',
    '/?utm_source=google&lien=secret', '/?utm_source=google&TOKEN=secret', '/?utm_source=google&email=lina@example.invalid']) {
    const l = lien(cible); fixture({ url: base + path, links: [l] }).run(); assert.equal(l.getAttribute('href'), cible, path);
  }
});

test('seuls les libellés UTM bornés sont propagés, sans copier la requête source', () => {
  const l = lien(cible + '#formulaire');
  fixture({ url: base + '/?utm_source=google&utm_medium=lina%40example.invalid&utm_campaign=0612345678&gclid=identifiant-unique&commune=Dijon', links: [l] }).run();
  assert.equal(queryLien(l).get('utm_source'), 'google');
  assert.equal(queryLien(l).has('utm_medium'), false); assert.equal(queryLien(l).has('utm_campaign'), false);
  assert.equal(queryLien(l).has('gclid'), false); assert.equal(queryLien(l).has('commune'), false);
  for (const valeur of ['', 'x'.repeat(81), '123456789', 'contact@example.invalid', 'google.fr']) {
    const a = lien(cible); fixture({ url: base + '/?utm_source=' + encodeURIComponent(valeur), links: [a] }).run(); assert.equal(a.getAttribute('href'), cible);
  }
});

test('formulaire GET : libellés en champs masqués, valeurs saisies et action préservées, sans doublon', () => {
  const commune = input('commune', 'Is-sur-Tille', 'text'), origine = input('origine', '/');
  const g = form(cible + '#formulaire', 'GET', [commune, origine]); const f = fixture({ forms: [g] });
  f.run(); f.run();
  assert.equal(g.children.length, 4); assert.equal(commune.value, 'Is-sur-Tille'); assert.equal(origine.value, '/');
  assert.equal(g.getAttribute('action'), cible + '#formulaire');
  assert.equal(g.querySelectorAll('[name="utm_source"]')[0].value, 'google'); assert.equal(g.querySelectorAll('[name="utm_medium"]')[0].value, 'fiche');
});

test('formulaire GET : paramètres explicites valides prioritaires et champs texte jamais modifiés', () => {
  const explicite = input('utm_source', 'newsletter'), texte = input('utm_medium', 'valeur-client', 'text');
  const g = form(cible + '?utm_source=partenaire&utm_campaign=automne', 'get', [explicite, texte]); fixture({ forms: [g] }).run();
  assert.equal(explicite.value, 'newsletter'); assert.equal(texte.value, 'valeur-client');
  assert.equal(g.querySelectorAll('[name="utm_campaign"]')[0].value, 'automne');
  assert.equal(g.querySelectorAll('[name="utm_source"]').length, 1); assert.equal(g.querySelectorAll('[name="utm_medium"]').length, 1);
});

test('formulaire GET : les UTM explicites de l’action survivent au remplacement de sa requête', () => {
  const g = form(cible + '?utm_source=partenaire&utm_campaign=automne#formulaire', 'get', [input('commune', 'Dijon', 'text'), input('origine', '/')]);
  const f = fixture({ forms: [g] }); f.run(); f.run();
  // Comme une soumission native GET, la requête résulte des champs, pas de l'action.
  const soumission = new URLSearchParams(g.children.map(champ => [champ.getAttribute('name'), champ.value]));
  assert.equal(soumission.get('utm_source'), 'partenaire'); assert.equal(soumission.get('utm_campaign'), 'automne');
  assert.equal(soumission.get('utm_medium'), 'fiche'); assert.equal(soumission.get('commune'), 'Dijon'); assert.equal(soumission.get('origine'), '/');
  assert.equal(g.children.length, 5); assert.equal(new URL(g.getAttribute('action'), base).hash, '#formulaire');
});

test('formulaires POST, externe ou avec paramètre personnel : aucune mutation', () => {
  const forms = [form(cible, 'post'), form('https://external.invalid' + cible), form('/estimer/'), form(cible + '?token=secret')];
  fixture({ forms }).run(); forms.forEach(f => assert.equal(f.children.length, 0));
});
