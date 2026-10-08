/* Système parfait, étape 2 : l'avis de valeur. Dans /admin/, « Préparer l'avis de valeur » → notes de visite, atouts,
   vigilance, fourchette, stratégie → PDF fabriqué dans le navigateur (charte du site, ventes DVF réelles) → brouillon
   invisible pour le vendeur → validation en un clic : dépôt dans l'espace du vendeur, statut, e-mail, journal.
   Moins de 5 ventes comparables : pas de fourchette proposée, l'agent saisit la sienne. */
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fausseBan, estimationComplete, moi, api, viderBoite, courrier, pour, sessionAdmin, SITE } from './aides.mjs';

const require = createRequire(import.meta.url);
const { PDFDocument } = require('../../../assets/avis/pdf-lib.min.js');

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

async function client(browser, info, o = {}, c = {}) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const page = await ctx.newPage();
  await fausseBan(page);
  const r = await estimationComplete(page, o, c);
  return { ctx, page, ...r, ref: r.reponse.corps.reference, id: r.reponse.corps.demande_id };
}
/* Télécharge un fichier avec la session de la page ; rend { statut, type, octets }. */
const telecharger = (page, id) => page.evaluate(async (i) => {
  const r = await fetch('/api/espace/fichier?id=' + i);
  const b = new Uint8Array(await r.arrayBuffer());
  return { statut: r.status, type: r.headers.get('Content-Type'), octets: Array.from(b) };
}, id);

test('avis de valeur : préparé dans /admin/, PDF à la charte avec les ventes réelles, validé en un clic', async ({ page, request, browser }, info) => {
  test.setTimeout(240000);
  const c = await client(browser, info, { atouts: ['balcon', 'cave'] }, { prenom: 'Claire', nom: 'Martin' });
  const estimation = c.reponse.corps.resultat;
  expect(estimation.fourchette).toBe(true);
  await sessionAdmin(page, request);
  const erreurs = [];
  // (les réponses 4xx voulues par le test et le traceur d'audience coupé ne comptent pas ; un refus de la politique de sécurité, si)
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto('/admin/?q=' + c.ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await ligne.locator('[data-avis-ouvrir]').click();
  const ed = ligne.locator('[data-avis-ed]');

  // 1. les données du dossier : de vraies ventes DVF, la fourchette de l'estimation proposée (au moins 5 ventes)
  await expect(ed.locator('[data-test="avis-ventes"]')).toContainText('ventes réelles');
  const dossier = await api(page, '/admin/avis?demande=' + c.id);
  expect(dossier.donnees.assez_de_ventes).toBe(true);
  expect(dossier.donnees.ventes.length).toBeGreaterThanOrEqual(8);
  expect(dossier.donnees.ventes.length).toBeLessThanOrEqual(12);
  for (const v of dossier.donnees.ventes) {
    expect(v.mois).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
    expect(v.surface).toBeGreaterThan(8);
    expect(v.prix, 'le prix signé, tel que publié').toBeGreaterThan(10000);
    expect(Math.abs(v.prix / v.surface - v.prix_m2), 'prix, surface et prix au m² se tiennent').toBeLessThan(2);
    expect(v.voie.length).toBeGreaterThan(2);
    expect(v.voie).not.toMatch(/^\d/);            // pas de numéro de rue
    expect(v.commune.length).toBeGreaterThan(1);
  }
  // les ventes proposées : jusqu'à 20, dont celles citées d'office (jamais une vente au prix atypique)
  expect(dossier.donnees.candidats.length).toBeGreaterThanOrEqual(dossier.donnees.ventes.length);
  expect(dossier.donnees.candidats.filter((v) => v.retenue).length).toBe(dossier.donnees.ventes.length);
  expect(dossier.donnees.candidats.some((v) => v.retenue && v.atypique)).toBe(false);
  expect(dossier.contenu).toMatchObject({ prix_bas: estimation.bas, prix_haut: estimation.haut });
  expect(dossier.contenu.strategie.length).toBe(3);
  await expect(ed.locator('[data-av="prix_bas"]')).toHaveValue(String(estimation.bas));
  // rien n'est encore visible ni validable
  await expect(ed.locator('[data-avis-valider]')).toBeHidden();
  expect(await api(page, '/admin/avis/valider', { demande: c.id })).toMatchObject({ _status: 409, error: 'avis_absent' });

  // 2. Shawez complète : notes dictées, atouts, vigilance, sa fourchette
  await ed.locator('[data-av="date_visite"]').fill('2026-10-09');
  await ed.locator('[data-av="notes"]').fill('Appartement traversant, séjour lumineux au sud-ouest.\nCuisine à moderniser. Copropriété bien tenue : ravalement voté pour 2027.');
  await ed.locator('[data-av="atouts"]').fill('Traversant et lumineux\n- Balcon et cave\n\nÀ cinq minutes du tram');
  await ed.locator('[data-av="vigilance"]').fill('Cuisine à moderniser\nPas de stationnement');
  await ed.locator('[data-av="prix_bas"]').fill('212000');
  await ed.locator('[data-av="prix_haut"]').fill('199000');
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-err')).toContainText('valeur haute doit dépasser');
  await ed.locator('[data-av="prix_bas"]').fill('198000');
  await ed.locator('[data-av="prix_haut"]').fill('215000');
  // il choisit les ventes citées : il en retire une
  await ed.locator('[data-av-ventes] summary').click();
  const cochees = ed.locator('[data-av-vente]:checked');
  const avant = await cochees.count();
  const retiree = await cochees.first().getAttribute('data-av-vente');
  await cochees.first().uncheck();
  await expect(ed.locator('[data-av-compte]')).toContainText(`${avant - 1} ventes citées`);
  await page.screenshot({ path: `captures/${info.project.name}-admin-4-avis-saisie.png`, fullPage: true });
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-ok')).toContainText('PDF créé', { timeout: 60000 });
  expect(erreurs, 'aucune erreur dans la page (bibliothèques PDF acceptées par la politique de sécurité)').toEqual([]);
  await expect(ed.locator('[data-avis-lien]')).toBeVisible();
  await expect(ed.locator('[data-avis-valider]')).toBeVisible();
  await expect(ligne.locator('.ee-flist')).toContainText('brouillon, invisible pour le vendeur');

  // 3. le brouillon : un vrai PDF de 6 à 10 pages ; le vendeur ne le voit pas
  const enregistre = await api(page, '/admin/avis?demande=' + c.id);
  expect(enregistre.donnees.ventes.length).toBe(avant - 1);
  expect(enregistre.donnees.ventes.map((v) => v.cle)).not.toContain(retiree);
  expect(enregistre.contenu).toMatchObject({ prix_bas: 198000, prix_haut: 215000, date_visite: '2026-10-09', atouts: ['Traversant et lumineux', 'Balcon et cave', 'À cinq minutes du tram'], vigilance: ['Cuisine à moderniser', 'Pas de stationnement'] });
  const brouillon = enregistre.avis.fichier;
  expect(brouillon).toMatchObject({ role: 'brouillon', type: 'application/pdf' });
  expect(brouillon.nom).toBe('Avis de valeur - 30 Rue Bannelier 21000 Dijon.pdf');
  const t = await telecharger(page, brouillon.id);
  expect(t.statut).toBe(200);
  const pdf = await PDFDocument.load(Uint8Array.from(t.octets));
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(6);
  expect(pdf.getPageCount()).toBeLessThanOrEqual(10);
  expect(pdf.getTitle()).toContain('30 Rue Bannelier');
  expect(pdf.getAuthor()).toContain('Shawez Ali');
  expect(t.octets.length).toBeGreaterThan(40000);
  expect(t.octets.length).toBeLessThan(600000);
  let d = (await moi(c.page)).demandes[0];
  expect(d.fichiers.length).toBe(0);
  expect(d.statut).toBe('recue');
  expect((await telecharger(c.page, brouillon.id)).statut).toBe(404);
  // refaire le PDF remplace le brouillon (un seul à la fois)
  await ed.locator('[data-av="notes"]').fill('Appartement traversant, très lumineux.');
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-ok')).toContainText('PDF créé', { timeout: 60000 });
  await expect(ligne.locator('.ee-flist li')).toHaveCount(1);
  expect((await telecharger(page, brouillon.id)).statut).toBe(404);

  // 4. validation en un clic (avec confirmation) : statut, espace du vendeur, e-mail, journal
  await viderBoite(request);
  await ed.locator('[data-avis-valider]').click();
  await expect(ed.locator('[data-avis-valider]')).toContainText('Confirmer');
  await ed.locator('[data-avis-valider]').click();
  await expect(ed.locator('.ee-ok')).toContainText('déposé dans l\'espace du vendeur · e-mail envoyé');
  await expect(ligne.locator('summary .st')).toHaveText('Avis de valeur envoyé');
  await expect(ligne.locator('.ee-flist')).toContainText('avis de valeur, visible par le vendeur');
  await expect(ligne.locator('[data-avis-etat]')).toContainText('Envoyé au vendeur le');
  const [m] = await courrier(request, pour(c.contact.email, /Votre avis de valeur est prêt/));
  expect(m, 'e-mail « avis de valeur prêt »').toBeTruthy();
  expect(m.text).toContain('ventes réelles du quartier');
  expect(m.text).toContain('Shawez Ali');
  await page.screenshot({ path: `captures/${info.project.name}-admin-5-avis-valide.png`, fullPage: true });

  // 5. le vendeur : étape 4 sur 10, le PDF à télécharger
  await c.page.goto('/mon-espace/');
  const carte = c.page.locator('#me-cards .ee-card').first();
  await expect(carte.locator('.ee-etape span')).toHaveText('Étape 4 sur 10');
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Avis de valeur');
  await expect(carte.locator('.ee-avis a')).toContainText('Télécharger mon avis de valeur');
  d = (await moi(c.page)).demandes[0];
  expect(d.fichiers.map((f) => f.role)).toEqual(['avis']);
  const tc = await telecharger(c.page, d.fichiers[0].id);
  expect(tc).toMatchObject({ statut: 200, type: 'application/pdf' });
  expect((await PDFDocument.load(Uint8Array.from(tc.octets))).getPageCount()).toBeGreaterThanOrEqual(6);
  writeFileSync(`captures/${info.project.name}-avis-de-valeur.pdf`, Buffer.from(tc.octets));
  await c.page.screenshot({ path: `captures/${info.project.name}-espace-3-avis-de-valeur.png`, fullPage: true });
  // la fourchette de l'estimation en ligne n'est pas réécrite
  expect(d.prix_bas).toBe(estimation.bas);

  await ligne.locator('[data-journal] summary').click();
  await expect(ligne.locator('[data-journal] li').first()).toBeVisible();
  const j = (await ligne.locator('[data-journal] li').allTextContents()).join(' | ');
  for (const mot of ['Avis de valeur envoyé', 'Avis de valeur : brouillon commencé', 'Statut : Avis de valeur envoyé', 'E-mail envoyé : Votre avis de valeur est prêt']) expect(j).toContain(mot);

  // 6. Google Sheet : « avis envoyé », prochaine action
  const cle = (await api(page, '/admin/flux', {})).adresse.split('cle=')[1];
  const flux = await (await request.get(`${SITE}/api/espace/flux/site.csv?cle=${cle}&format=tsv`)).text();
  const l = flux.split('\n').find((x) => x.includes(c.ref));
  expect(l).toContain('\tavis envoyé\t');
  expect(l).toContain('proposer le mandat');
  await c.ctx.close();
});

test('avis de valeur : moins de 5 ventes comparables → pas de fourchette proposée, Shawez saisit la sienne', async ({ page, request, browser }, info) => {
  test.setTimeout(180000);
  const c = await client(browser, info, { adresse: '8 rue du marché saulieu', surface: '68' }, { prenom: 'Luc', nom: 'Peuventes', civ: 'M.' });
  expect(c.reponse.corps.resultat.fourchette).toBe(false);
  await sessionAdmin(page, request);
  const dossier = await api(page, '/admin/avis?demande=' + c.id);
  expect(dossier.donnees.assez_de_ventes).toBe(false);
  expect(dossier.donnees.ventes.length).toBeLessThan(5);
  expect(dossier.contenu.prix_bas).toBeNull();
  expect(dossier.contenu.prix_haut).toBeNull();
  await page.goto('/admin/?q=' + c.ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await ligne.locator('[data-avis-ouvrir]').click();
  const ed = ligne.locator('[data-avis-ed]');
  await expect(ed.locator('[data-test="avis-ventes"]')).toContainText('Moins de 5 ventes comparables');
  await expect(ed.locator('[data-av="prix_bas"]')).toHaveValue('');
  // sans fourchette : pas de PDF
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-err')).toContainText('Indiquez la fourchette de prix');
  // et l'API refuse de valider un avis sans fourchette, même avec un brouillon déposé à la main
  expect((await api(page, '/admin/avis', { demande: c.id, contenu: { notes: 'Visite faite.' } }))._status).toBe(200);
  const depot = await page.evaluate(async (id) => {
    const r = await fetch('/api/espace/admin/avis/brouillon?demande=' + id, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-Fichier-Nom': 'essai.pdf' }, body: new Blob(['%PDF-1.4\n%%EOF\n']) });
    return r.status;
  }, c.id);
  expect(depot).toBe(201);
  expect(await api(page, '/admin/avis/valider', { demande: c.id })).toMatchObject({ _status: 400, error: 'champs', champ: 'prix_bas' });
  // un fichier qui n'est pas un PDF n'est pas un brouillon
  expect(await page.evaluate(async (id) => (await fetch('/api/espace/admin/avis/brouillon?demande=' + id, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: new Blob(['pas un pdf']) })).status, c.id)).toBe(415);

  // Shawez saisit sa fourchette : le PDF se fait, et dit qu'il y a trop peu de ventes
  await page.reload();
  await ligne.locator('[data-avis-ouvrir]').click();
  await ed.locator('[data-av="prix_bas"]').fill('180000');
  await ed.locator('[data-av="prix_haut"]').fill('200000');
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-ok')).toContainText('PDF créé', { timeout: 60000 });
  await ed.locator('[data-avis-prevenir]').uncheck();
  await ed.locator('[data-avis-valider]').click();
  await ed.locator('[data-avis-valider]').click();
  await expect(ligne.locator('summary .st')).toHaveText('Avis de valeur envoyé');
  expect((await courrier(request, pour(c.contact.email, /avis de valeur/i), { attente: 1500 })).length).toBe(0);
  const d = (await moi(c.page)).demandes[0];
  expect(d.statut).toBe('avis');
  expect(d.prix_bas).toBeNull();           // l'estimation en ligne reste « sans fourchette » : rien n'est inventé après coup
  await c.ctx.close();
});

test('avis de valeur déposé à la main (PDF fait ailleurs) : même suite, statut et e-mail', async ({ page, request, browser }, info) => {
  test.setTimeout(120000);
  const c = await client(browser, info, {}, { prenom: 'Nora', nom: 'Manuel' });
  await sessionAdmin(page, request);
  await viderBoite(request);
  const statut = await page.evaluate(async (id) => {
    const r = await fetch('/api/espace/admin/fichier?demande=' + id + '&role=avis', { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-Fichier-Nom': 'avis.pdf' }, body: new Blob(['%PDF-1.4\n%%EOF\n']) });
    return (await r.json()).statut;
  }, c.id);
  expect(statut).toBe('avis');
  expect((await courrier(request, pour(c.contact.email, /Votre avis de valeur est prêt/))).length).toBe(1);
  const d = (await moi(c.page)).demandes[0];
  expect(d.parcours.filter((e) => e.etat !== 'avenir').length).toBe(4);
  await c.ctx.close();
});
