/* « Aujourd'hui » dans /admin/, « Pas maintenant » avec relance, créneaux du lundi au vendredi.

   1. Créneaux de visite (Règles du Boss du 10/10/2026) : du lundi au vendredi, de 9 h à 12 h et de 14 h à 19 h, jamais
      le samedi ; un créneau proposé un samedi ou à 12 h, 13 h est refusé.
   2. « Pas maintenant » sans date : la relance douce est posée d'office trois mois plus tard (jour ouvré), dans la page
      comme par l'API ; une date choisie est gardée ; le jour venu, « Relancer » est en retard, donc en tête, et dans
      « Aujourd'hui ».
   3. « Aujourd'hui » : qui appeler, qui prévenir, ce qui est en retard, ce qui a été fait depuis hier — la carte en haut
      de /admin/ (un nom ouvre le dossier), la même liste servie à l'agent du matin par le flux à clé (texte en quatre
      lignes, ou CSV), fermée sans clé. Règles WCAG A et AA. Captures → captures/aujourdhui-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { fausseBan, api, sessionAdmin, SITE } from './aides.mjs';
import { moduleServeur } from './module-serveur.mjs';

const { creneaux, creneauValide, dateRelance, aFaireAujourdhui, aFaireTexte, paris, deParis } = await moduleServeur('suivi');

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

const cle = () => 'essai-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
const BIEN = { type: 'maison', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', citycode: '21231', lat: 47.32396, lon: 5.03633, surface: 120 };
const dossier = (o = {}) => { const { contact, bien, ...reste } = o; return { contact: { prenom: 'Luigia', nom: 'Rossi', telephone: '06 11 22 33 44', ...(contact || {}) }, bien: { ...BIEN, ...(bien || {}) }, prevenir: false, cle: cle(), ...reste }; };
async function ouvrir(page, o) {
  const r = await api(page, '/admin/dossier', dossier(o));
  expect(r, 'dossier ouvert').toMatchObject({ _status: 201 });
  return r.demande;
}
/* /admin/demandes et le flux, à l'heure donnée au serveur de test (en-tête X-Horloge-Test) */
const demandesA = (page, heure) => page.evaluate(async (h) => (await fetch('/api/espace/admin/demandes', { headers: h ? { 'X-Horloge-Test': h } : {} })).json(), heure);
const sansDebordement = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'rien ne dépasse de l\'écran').toBeLessThanOrEqual(1);
async function capture(page, cible, nom, info, max = 2600) {
  const el = page.locator(cible).first();
  await el.scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: '#nav,#stickybar,.sim-peek{display:none!important}' });
  const b = await el.boundingBox();
  const defile = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await page.screenshot({ path: `captures/aujourdhui-${info.project.name}-${nom}.png`, fullPage: true, clip: { x: Math.max(0, b.x + defile.x - 8), y: Math.max(0, b.y + defile.y - 8), width: b.width + 16, height: Math.min(max, b.height + 16) } });
}
/* un instant de Paris, n jours après aujourd'hui, à l'heure donnée (ISO) */
function dans(jours, h = 10) { const p = paris(new Date()); return deParis(p.a, p.m, p.j + jours, h).toISOString(); }

/* ------------------------------------------------------------------------------------------------------------- */

test('créneaux de visite : du lundi au vendredi, 9 h – 12 h et 14 h – 19 h, jamais le samedi', async ({ page }) => {
  const now = new Date('2026-10-15T07:00:00Z');                 // jeudi 15 octobre, 9 h à Paris
  const jours = creneaux(now, 6);
  expect(jours.map((j) => j.date)).toEqual(['2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22']);   // ni samedi 17 ni dimanche 18
  for (const j of jours.slice(1)) expect(j.heures.map((h) => h.h)).toEqual(['9 h', '10 h', '11 h', '14 h', '15 h', '16 h', '17 h', '18 h']);
  expect(jours[0].heures.map((h) => h.h)).toEqual(['11 h', '14 h', '15 h', '16 h', '17 h', '18 h']);   // au plus tôt deux heures après la demande
  expect(creneauValide(deParis(2026, 10, 17, 10).toISOString(), now), 'samedi refusé').toBe(false);
  expect(creneauValide(deParis(2026, 10, 18, 10).toISOString(), now), 'dimanche refusé').toBe(false);
  expect(creneauValide(deParis(2026, 10, 21, 12).toISOString(), now), '12 h refusé').toBe(false);
  expect(creneauValide(deParis(2026, 10, 21, 13).toISOString(), now), '13 h refusé').toBe(false);
  expect(creneauValide(deParis(2026, 10, 21, 14).toISOString(), now), '14 h accepté').toBe(true);
  expect(creneauValide(deParis(2026, 10, 21, 11).toISOString(), now), '11 h accepté').toBe(true);
  // le site aussi
  const r = await (await page.request.get(SITE + '/api/espace/creneaux')).json();
  for (const j of r.jours) {
    expect(j.court, 'ni samedi ni dimanche').not.toMatch(/^(sam|dim)/);
    for (const h of j.heures) expect(['9 h', '10 h', '11 h', '14 h', '15 h', '16 h', '17 h', '18 h']).toContain(h.h);
  }
});

test('la date de relance : trois mois plus tard, un jour ouvré, fin de mois comprise', async () => {
  expect(dateRelance(new Date('2026-10-16T08:00:00Z'))).toBe('2027-01-18');   // 16 janvier = samedi → lundi 18
  expect(dateRelance(new Date('2026-07-17T08:00:00Z'))).toBe('2026-10-19');   // 17 octobre = samedi → lundi 19
  expect(dateRelance(new Date('2026-01-31T08:00:00Z'))).toBe('2026-04-30');   // 31 avril n'existe pas → 30 avril
  expect(dateRelance(new Date('2026-11-30T08:00:00Z'))).toBe('2027-03-01');   // 30 février → 28 février = dimanche → lundi 1er mars
  expect(dateRelance(new Date('2026-10-14T08:00:00Z'))).toBe('2027-01-14');   // jeudi : tel quel
});

test('« Pas maintenant » : la relance posée d\'office dans 3 mois, et qui remonte le jour venu', async ({ page, request }, info) => {
  test.setTimeout(120000);
  await sessionAdmin(page, request);
  const auj = (await api(page, '/admin/demandes')).aujourdhui;
  const attendue = dateRelance(new Date());
  expect(attendue > auj).toBe(true);

  // 1. par l'API : sans date → trois mois ; avec une date → gardée ; déjà en pause → la date ne bouge pas
  const a = await ouvrir(page, { contact: { prenom: 'Pascal', nom: 'Morel' } });
  let r = await api(page, '/admin/demande', { id: a.id, statut: 'pause', raison: 'vend en 2027', rappel_le: '' });
  expect(r).toMatchObject({ _status: 200 });
  expect(r.demande).toMatchObject({ statut: 'pause', rappel_le: attendue, raison: 'vend en 2027' });
  expect(r.demande.action.texte).toBe('Relancer (pas maintenant : vend en 2027)');
  expect(r.demande.action.retard).toBe(false);
  r = await api(page, '/admin/demande', { id: a.id, notes: 'rien', rappel_le: '' });        // déjà en pause, la date effacée exprès : pas remise
  expect(r.demande.rappel_le).toBe('');
  expect(r.demande.action.texte).toBe('Choisir une date de relance');
  const b = await ouvrir(page, { contact: { prenom: 'Nadia', nom: 'Benali' } });
  r = await api(page, '/admin/demande', { id: b.id, statut: 'pause', rappel_le: '2027-06-01' });
  expect(r.demande.rappel_le).toBe('2027-06-01');
  const c = await ouvrir(page, { contact: { prenom: 'Hugo', nom: 'Petit' } });
  r = await api(page, '/admin/demande', { id: c.id, rappel_le: '2027-05-03' });             // une date déjà posée, puis la pause : gardée
  r = await api(page, '/admin/demande', { id: c.id, statut: 'pause' });
  expect(r.demande.rappel_le).toBe('2027-05-03');

  // 2. dans la page : choisir « Pas maintenant » remplit la date, avec un mot d'explication ; Enregistrer la garde
  const d = await ouvrir(page, { contact: { prenom: 'Inès', nom: 'Garnier' } });
  await page.goto('/admin/?q=' + d.reference);
  const row = page.locator('#ad-rows .ee-row');
  await expect(row).toHaveCount(1);
  await expect(row.locator('[data-f=rappel_le]')).toHaveValue('');
  await row.locator('[data-f=statut]').selectOption('pause');
  await expect(row.locator('[data-f=rappel_le]')).toHaveValue(attendue);
  await expect(row.locator('[data-relance-aide]')).toBeVisible();
  await expect(row.locator('[data-relance-aide]')).toContainText('Relance posée dans 3 mois');
  await row.locator('[data-f=raison]').fill('Attend la fin des travaux');
  await capture(page, '#ad-rows .ee-row', 'pas-maintenant', info);
  await row.locator('[data-save]').click();
  await expect(row.locator('.saved')).toBeVisible();
  await expect(row.locator('[data-test="action"]')).toContainText('Relancer (pas maintenant : Attend la fin des travaux) · avant');
  expect((await api(page, '/admin/demandes')).demandes.find((x) => x.id === d.id).rappel_le).toBe(attendue);
  // changer de statut sans toucher la date : le mot d'explication s'efface
  await row.locator('[data-f=statut]').selectOption('appele');
  await expect(row.locator('[data-relance-aide]')).toBeHidden();

  // 3. le jour venu (le serveur de test à la date de relance, 19 h 30) : « Relancer » est en retard, et dans « Aujourd'hui »
  await api(page, '/admin/demande', { id: a.id, rappel_le: attendue });
  const [y, m, j] = attendue.split('-').map(Number);
  const leJour = deParis(y, m, j, 19, 30).toISOString();
  const v = await demandesA(page, leJour);
  const x = v.demandes.find((k) => k.id === a.id);
  expect(x.action).toMatchObject({ texte: 'Relancer (pas maintenant : vend en 2027)', retard: true });
  expect(v.a_faire.relancer.map((k) => k.reference)).toContain(a.reference);
  expect(v.a_faire.relancer.find((k) => k.reference === a.reference).pourquoi).toBe(`Pas maintenant : vend en 2027 · relance prévue le ${attendue.slice(8, 10)}/${attendue.slice(5, 7)}`);
  expect(v.a_faire.appeler.map((k) => k.reference)).not.toContain(a.reference);
  // la veille : rien
  const laVeille = await demandesA(page, deParis(y, m, j - 1, 19, 30).toISOString());
  expect(laVeille.a_faire.relancer.map((k) => k.reference)).not.toContain(a.reference);
});

test('« Aujourd\'hui » : qui appeler, qui prévenir, ce qui est en retard, ce qui a été fait ; la carte et le flux', async ({ page, request }, info) => {
  test.setTimeout(180000);
  await sessionAdmin(page, request);
  const U = Date.now().toString(36).slice(-4).toUpperCase();        // des noms uniques : la base locale garde les essais précédents
  // X : nouveau vendeur, pas encore appelé → à appeler (promesse 2). Y : mandat signé sans espace → à prévenir.
  // Z : appelé, visite jamais fixée → en retard trois jours plus tard. W : avis de valeur envoyé → à appeler (sans échéance).
  const X = await ouvrir(page, { contact: { prenom: 'Xavier', nom: 'Lambert ' + U }, statut: 'recue', bien: { commune: 'Talant', adresse: '10 Rue de Bellevue 21240 Talant', code_postal: '21240', citycode: '21617', lat: 47.337, lon: 5.008 } });
  const Y = await ouvrir(page, { contact: { prenom: 'Yasmine', nom: 'Faure ' + U }, statut: 'avis' });
  const yMandat = await api(page, '/admin/demande', { id: Y.id, statut: 'mandat', prevenir: true });
  expect(yMandat.demande.a_dire, 'sans espace : la nouvelle reste à dire').toMatchObject({ quoi: ['Mandat signé'] });
  const Z = await ouvrir(page, { contact: { prenom: 'Zoé', nom: 'Marchand ' + U }, statut: 'appele' });
  const W = await ouvrir(page, { contact: { prenom: 'Walid', nom: 'Costa ' + U }, statut: 'avis' });
  const T = await ouvrir(page, { contact: { prenom: 'Test', nom: 'Essai', email: 'essai.aujourdhui@test.invalid' }, statut: 'recue' });   // un essai : jamais dans la liste

  // 1. la règle, sur les dossiers tels que le serveur les rend, trois jours plus tard à 10 h
  const H = dans(3);
  const v = await demandesA(page, H);
  const refs = (g) => v.a_faire[g].map((k) => k.reference);
  expect(refs('appeler')).toEqual(expect.arrayContaining([X.reference, W.reference]));
  expect(refs('prevenir')).toContain(Y.reference);
  expect(refs('retard')).toContain(Z.reference);
  for (const g of ['appeler', 'prevenir', 'retard', 'relancer', 'fait']) expect(refs(g), 'un essai n\'y est jamais').not.toContain(T.reference);
  // un dossier n'est que dans un seul groupe
  const tous = ['appeler', 'prevenir', 'retard', 'relancer'].flatMap(refs);
  expect(new Set(tous).size).toBe(tous.length);
  const x = v.a_faire.appeler.find((k) => k.reference === X.reference);
  expect(x).toMatchObject({ vendeur: 'Xavier Lambert ' + U, commune: 'Talant', telephone: '06 11 22 33 44', statut: 'recue', pourquoi: 'Appeler (pas de fourchette automatique)', retard: true });
  expect(v.a_faire.retard.find((k) => k.reference === Z.reference).pourquoi).toBe('Fixer la visite d\'estimation (promesse : sous 48 h)');
  expect(v.a_faire.prevenir.find((k) => k.reference === Y.reference).pourquoi).toBe('À prévenir : Mandat signé');
  // le même calcul, dans le test, à partir des mêmes lignes
  const local = aFaireAujourdhui(v.demandes, new Date(H));
  expect(local.appeler.map((k) => k.reference)).toEqual(refs('appeler'));
  expect(local.retard.map((k) => k.reference)).toEqual(refs('retard'));
  // « fait depuis hier » : à l'heure réelle, les dossiers touchés à l'instant y sont ; trois jours plus tard, plus
  const now = await demandesA(page, new Date(Date.now() + 60000).toISOString());
  expect(now.a_faire.fait.map((k) => k.reference)).toEqual(expect.arrayContaining([X.reference, Y.reference, Z.reference]));
  expect(now.a_faire.fait.find((k) => k.reference === Y.reference).quoi).toMatch(/^(statut « Mandat signé »|e-mail au vendeur)$/);   // la dernière trace : le statut, ou l'e-mail qui n'a pas pu partir
  expect(v.a_faire.fait.map((k) => k.reference)).not.toContain(X.reference);
  const texte = aFaireTexte(v.a_faire);
  expect(texte).toHaveLength(4);
  expect(texte[0]).toMatch(/^Qui appeler \(\d+\) : /);
  expect(texte[0]).toContain(`Xavier Lambert ${U} (Talant, 06 11 22 33 44) · Appeler (pas de fourchette automatique)`);
  expect(texte[1]).toMatch(/^Qui prévenir \(\d+\) : /);
  expect(texte[1]).toContain(`Yasmine Faure ${U} (Dijon, 06 11 22 33 44) · À prévenir : Mandat signé`);
  expect(texte[2]).toMatch(/^En retard \(\d+\) : /);
  expect(texte[2]).toContain(`Zoé Marchand ${U} (Dijon, 06 11 22 33 44) · Fixer la visite d'estimation`);
  expect(texte[3]).toMatch(/^Fait depuis hier \(\d+\) : /);

  // 2. le flux à clé, pour l'agent du matin : texte en quatre lignes, ou CSV ; fermé sans clé
  const formule = await api(page, '/admin/flux', {});
  const adresse = formule.adresse.replace('site.csv', 'aujourdhui.csv');
  expect((await request.get(adresse.replace(/cle=.*$/, 'cle=' + 'x'.repeat(43)))).status()).toBe(403);
  expect((await request.get(SITE + '/api/espace/flux/aujourdhui.csv')).status()).toBe(403);
  const txt = await request.get(adresse + '&format=texte', { headers: { 'X-Horloge-Test': H } });
  expect(txt.status()).toBe(200);
  expect(txt.headers()['content-type']).toContain('text/plain');
  const lignes = (await txt.text()).trim().split('\n');
  expect(lignes).toHaveLength(5);
  expect(lignes[0]).toMatch(/^Aujourd'hui, (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d{1,2} /);
  expect(lignes[1]).toContain('Xavier Lambert ' + U + ' (Talant, 06 11 22 33 44) · Appeler (pas de fourchette automatique)');
  expect(lignes[2]).toContain('Yasmine Faure ' + U + ' (Dijon, 06 11 22 33 44) · À prévenir : Mandat signé');
  expect(lignes[3]).toContain('Zoé Marchand ' + U);
  expect(lignes.join('\n')).not.toContain('Essai');
  const csv = await request.get(adresse, { headers: { 'X-Horloge-Test': H } });
  expect(csv.status()).toBe(200);
  const tableau = (await csv.text()).split('\r\n').map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  expect(tableau[0].slice(0, 8)).toEqual(['groupe', 'référence', 'vendeur', 'commune', 'téléphone', 'statut', 'pourquoi', 'échéance']);
  expect(tableau.find((l) => l[1] === X.reference).slice(0, 7)).toEqual(['appeler', X.reference, 'Xavier Lambert ' + U, 'Talant', '06 11 22 33 44', 'Estimation reçue', 'Appeler (pas de fourchette automatique)']);
  expect(tableau.find((l) => l[1] === Y.reference)[0]).toBe('prevenir');
  expect(tableau.find((l) => l[1] === Z.reference)[0]).toBe('retard');
  expect(tableau.find((l) => l[1] === T.reference)).toBeUndefined();

  // 3. la carte en haut de /admin/ (heure réelle) : W à appeler, Y à prévenir ; un nom ouvre le dossier.
  //    Au plus 12 noms par ligne (« et N autres ») : la base locale garde les essais de toute la série, on regarde alors les nombres.
  await page.goto('/admin/');
  const carte = page.locator('[data-test="aujourdhui"]');
  await expect(carte).toBeVisible();
  await expect(carte.locator('h2')).toHaveText('Aujourd\'hui');
  await expect(carte.locator('li')).toHaveCount(3);
  const appeler = carte.locator('li[data-jour="appeler"]'), prevenir = carte.locator('li[data-jour="prevenir"]');
  const nombre = async (li) => +(await li.locator('.ee-jour-k b').textContent());
  await expect(appeler).toContainText('Qui appeler');
  const ici = aFaireAujourdhui((await demandesA(page, '')).demandes, new Date());
  expect(await nombre(appeler)).toBe(ici.appeler.length + ici.relancer.length);
  expect(await nombre(prevenir)).toBe(ici.prevenir.length);
  expect(await nombre(carte.locator('li[data-jour="retard"]'))).toBe(ici.retard.length);
  if (ici.appeler.length + ici.relancer.length <= 12) {
    await expect(appeler).toContainText('Walid Costa ' + U);
    await expect(appeler).toContainText('Appeler pour présenter l\'avis de valeur');
  } else await expect(appeler).toContainText('autres (dans la liste ci-dessous)');
  if (ici.prevenir.length <= 12) {
    await expect(prevenir).toContainText('Yasmine Faure ' + U);
    await expect(prevenir).toContainText('À prévenir : Mandat signé');
  }
  await expect(carte.locator('#ad-jour-fait')).toContainText('Fait depuis hier');
  await expect(carte).not.toContainText('Essai');
  await sansDebordement(page);
  await capture(page, '[data-test="aujourdhui"]', 'carte', info);
  const r = await new AxeBuilder({ page }).include('[data-test="aujourdhui"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(r.violations.map((k) => `${k.id} : ${k.help} → ${k.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  // un nom ouvre le dossier (le premier de la ligne « à prévenir »)
  const lien = prevenir.locator('[data-jour-ref]').first();
  const ref = await lien.getAttribute('data-jour-ref');
  await lien.click();
  await expect(page.locator('#ad-q')).toHaveValue(ref);
  const row = page.locator('#ad-rows .ee-row');
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('open', '');
  await expect(row.locator('.ee-fiche')).toContainText(ref);
  // la carte se met à jour après une action : W (avis de valeur envoyé) passe à « Mandat signé » → un de moins à appeler, un de plus à prévenir
  await page.goto('/admin/?q=' + W.reference);
  const nA = await nombre(appeler), nP = await nombre(prevenir);
  const rowW = page.locator('#ad-rows .ee-row');
  await expect(rowW).toHaveCount(1);
  await rowW.locator('[data-f=statut]').selectOption('mandat');
  await rowW.locator('[data-save]').click();
  await expect(rowW.locator('.saved')).toBeVisible();
  await expect(appeler.locator('.ee-jour-k b')).toHaveText(String(nA - 1));
  await expect(prevenir.locator('.ee-jour-k b')).toHaveText(String(nP + 1));

  // 4. réservé à l'agence
  await api(page, '/deconnexion', {});
  expect((await api(page, '/admin/demandes'))._status).toBe(401);
});
