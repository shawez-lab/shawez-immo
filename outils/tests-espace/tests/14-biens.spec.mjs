/* Biens à vendre (chantier « Mes biens », lignes 58-64) : /biens/, fiches, /admin/biens/, visite en 2 clics, mesures.
   Toutes les valeurs saisies ici (DPE, honoraires…) sont des valeurs d'ESSAI dans la base locale des tests :
   elles ne vont jamais en production. Captures → captures/biens-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { sessionAdmin, viderBoite, courrier, pour, ADMIN } from './aides.mjs';

const apiB = (page, chemin, corps) => page.evaluate(async ([c, b]) => {
  const r = await fetch('/api/biens' + c, b === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  let d = {}; try { d = await r.json(); } catch (e) { /* */ }
  d._status = r.status; return d;
}, [chemin, corps]);

const VIDE = { dpe: '', ges: '', dpe_kwh: '', ges_kg: '', energie_annee: '', honoraires_charge: '', honoraires_pct: '', prix_hors_hon: '', video: '', video_affiche: '', masque: false };
const ESSAI_510 = { id: '510', dpe: 'D', ges: 'B', dpe_kwh: '210', ges_kg: '7', energie_min: '770', energie_max: '1060', energie_annee: '2023', honoraires_charge: 'acquereur', honoraires_pct: '5', prix_hors_hon: '141905', copro: '1', copro_lots: '15', copro_charges: '1820', copro_procedure: 'pas de procédure en cours', video: '/v1.mp4', video_affiche: '/v1-poster.webp', masque: false };
const ESSAI_394 = { id: '394', dpe: 'F', ges: 'C', energie_min: '2500', energie_max: '3440', energie_annee: '2023', honoraires_charge: 'vendeur', copro: '0', masque: false };

test.beforeEach(() => { mkdirSync('captures', { recursive: true }); });

test.describe.configure({ mode: 'serial' });

test('1. Rien n\'est publié sans les mentions obligatoires', async ({ page, request }) => {
  await sessionAdmin(page, request);
  await apiB(page, '/admin/bien', { ...ESSAI_510, ...VIDE, id: '510' });
  await apiB(page, '/admin/bien', { ...VIDE, id: '394' });
  await page.context().clearCookies();
  const fiche = await request.get('/biens/dijon-appartement-510/');
  expect(fiche.status()).toBe(404);
  expect((await request.get('/biens/dijon-appartement-510/?apercu=1')).status()).toBe(404);   // aperçu : admin seulement
  await page.goto('/biens/');
  await expect(page.locator('h1')).toContainText('Les biens à vendre');
  await expect(page.locator('.bv-carte a[href="/biens/dijon-appartement-510/"]')).toHaveCount(0);
  expect(await page.locator('main a[href*="gravelin-immo.com"]').count(), 'aucun lien vers le site de l\'agence dans le contenu').toBe(0);
  const sm = await (await request.get('/biens/sitemap.xml')).text();
  expect(sm).not.toContain('dijon-appartement-510');
});

test('2. L\'agence complète un bien dans /admin/biens/ : la fiche est publiée, avec toutes les mentions', async ({ page, request }, info) => {
  await sessionAdmin(page, request);
  await page.goto('/admin/biens/');
  const bloc = page.locator('details.ba-bien[data-id="510"]');
  await expect(bloc).toContainText('Manque');
  await page.screenshot({ path: `captures/biens-${info.project.name}-admin-avant.png`, fullPage: false });
  // refus : honoraires à la charge de l'acquéreur sans % ni prix hors honoraires
  let r = await apiB(page, '/admin/bien', { ...ESSAI_510, honoraires_pct: '', prix_hors_hon: '' });
  expect(r.visible).toBe(false);
  expect(r.manque).toEqual(expect.arrayContaining(['% des honoraires', 'prix hors honoraires']));
  // l'aperçu agence montre ce qui manque, sans être indexable
  await page.goto('/biens/dijon-appartement-510/?apercu=1');
  await expect(page.locator('.bv-apercu')).toContainText('% des honoraires');
  // saisie complète par le formulaire de la page
  await page.goto('/admin/biens/');
  await bloc.locator('summary').click();
  const f = bloc.locator('form');
  for (const [k, v] of Object.entries(ESSAI_510)) {
    if (k === 'id' || k === 'masque') continue;
    const champ = f.locator(`[name="${k}"]`);
    if ((await champ.evaluate((e) => e.tagName)) === 'SELECT') await champ.selectOption(v); else await champ.fill(v);
  }
  await f.locator('button[type=submit]').click();
  await expect(f.locator('[data-res]')).toContainText('fiche publiée');
  r = await apiB(page, '/admin/bien', ESSAI_394);
  expect(r.manque).toEqual([]);
  await page.context().clearCookies();
  await page.goto('/biens/dijon-appartement-510/');
  await expect(page.locator('h1')).toHaveText('Appartement à Dijon');
  await expect(page.locator('.bv-prix-g')).toHaveText('149 000 €');
  const corpsTxt = await page.locator('main').innerText();
  for (const t of ['Énergie (DPE)', 'Climat (GES)', 'entre 770 € et 1 060 €', '1er janvier 2023', '15 lots', '1 820 €', 'Pas de procédure en cours',
    '5 % TTC du prix hors honoraires, à la charge de l\'acquéreur', 'Prix hors honoraires : 141 905 €', 'georisques.gouv.fr', 'Barème des honoraires']) {
    expect(corpsTxt, t).toContain(t);
  }
  expect(await page.locator('.bv-galerie img').count()).toBe(14);
  // données structurées
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').last().textContent());
  expect(ld['@type']).toBe('RealEstateListing');
  expect(ld.offers.price).toBe(149000);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://shawez-immo.com/biens/dijon-appartement-510/');
  // classe F : mention « consommation excessive » ; coordonnées d'un autre conseiller retirées du texte
  await page.goto('/biens/dijon-maison-394/');
  const t394 = await page.locator('main').innerText();
  expect(t394).toContain('Logement à consommation énergétique excessive');
  expect(t394).toContain('Honoraires à la charge du vendeur');
  expect(t394).not.toMatch(/PATOUILLET|O 6 \/ 23/);
  // liste et plan du site
  await page.goto('/biens/');
  await expect(page.locator('.bv-carte a[href="/biens/dijon-appartement-510/"]')).toBeVisible();
  const sm = await (await request.get('/biens/sitemap.xml')).text();
  expect(sm).toContain('https://shawez-immo.com/biens/dijon-appartement-510/');
  expect((await request.get('/biens/dijon-appartement-510')).url()).toMatch(/\/biens\/dijon-appartement-510\/$/);
});

test('3. Un visiteur demande une visite en 2 clics ; l\'agence la voit ; un vrai prénom déclenche l\'alerte', async ({ page, request }, info) => {
  await page.context().clearCookies();
  await page.goto('/biens/dijon-appartement-510/');
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.screenshot({ path: `captures/biens-${info.project.name}-fiche-haut.png` });
  // vidéo : rien de chargé avant le clic
  expect(await page.locator('video').count()).toBe(0);
  await page.locator('.bv-lire').click();
  await expect(page.locator('video.bv-v')).toHaveCount(1);
  // clic 1 : « Visiter ce bien » puis un créneau
  await page.locator('a[data-mesure="visite_clic"]:visible').first().click();
  const h = page.locator('.bv-h').first();
  await expect(h).toBeVisible();
  const debut = await h.getAttribute('data-debut');
  await h.click();
  await page.locator('[data-visite] [name=prenom]').fill('TEST Vagues');
  await page.locator('[data-visite] [name=telephone]').fill('06 00 00 00 00');
  await page.locator('[data-visite] [name=consentement]').check();
  await page.screenshot({ path: `captures/biens-${info.project.name}-visite-form.png` });
  // clic 2 : confirmer
  await page.locator('[data-visite] button[type=submit]').click();
  await expect(page.locator('[data-ok]')).toContainText('C\'est noté');
  await page.screenshot({ path: `captures/biens-${info.project.name}-visite-ok.png` });
  expect(erreurs, 'aucune erreur dans la console').toEqual([]);
  // le créneau pris n'est plus proposé
  const cr = await (await request.get('/api/biens/creneaux')).json();
  expect(cr.jours.flatMap((j) => j.heures.map((x) => x.debut))).not.toContain(debut);
  // vrai prénom (adresse d'essai locale) : alerte e-mail à l'agence
  await viderBoite(request);
  const r = await apiB(page, '/visite', { bien: '510', prenom: 'Camille', telephone: '0611223344', email: 'camille@exemple-test.fr', consentement: true });
  expect(r.ok).toBe(true);
  const [m] = await courrier(request, pour(ADMIN, /Visite demandée/));
  expect(m.subject).toContain('réf. 510');
  expect(m.text).toContain('0611223344');
  // consentement obligatoire ; bien non publié refusé
  expect((await apiB(page, '/visite', { bien: '510', prenom: 'X', telephone: '0611223344' }))._status).toBe(400);
  expect((await apiB(page, '/visite', { bien: '412', prenom: 'X', telephone: '0611223344', consentement: true }))._status).toBe(404);
  // l'agence voit les demandes et les mesures
  await sessionAdmin(page, request);
  const l = await apiB(page, '/admin/liste');
  const vs = l.visites.filter((v) => v.bien_id === '510');
  expect(vs.find((v) => v.prenom === 'TEST Vagues').test).toBe(1);
  expect(vs.find((v) => v.prenom === 'TEST Vagues').alerte).toContain('essai');
  const b = l.biens.find((x) => x.id === '510');
  expect(b.mesures.visite_clic).toBeGreaterThanOrEqual(1);
  expect(b.mesures.video).toBeGreaterThanOrEqual(1);
  expect(b.mesures.visite_demande).toBeGreaterThanOrEqual(2);
  await page.goto('/admin/biens/');
  await expect(page.locator('[data-visites]')).toContainText('TEST Vagues');
  await page.screenshot({ path: `captures/biens-${info.project.name}-admin-visites.png`, fullPage: false });
  // ménage
  for (const v of vs) await apiB(page, '/admin/visite/supprimer', { id: v.id });
});

test('4. Mobile 390 px et accessibilité : pas de défilement horizontal, barre d\'actions, WCAG A et AA', async ({ page }, info) => {
  await page.context().clearCookies();
  for (const chemin of ['/biens/', '/biens/dijon-appartement-510/']) {
    await page.goto(chemin);
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(deborde, `${chemin} : défilement horizontal`).toBeLessThanOrEqual(0);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('header#nav').exclude('footer').analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`), chemin).toEqual([]);
  }
  if (info.project.name === 'iphone13') await expect(page.locator('.bv-barre')).toBeVisible();
  else await expect(page.locator('.bv-barre')).toBeHidden();
  await page.screenshot({ path: `captures/biens-${info.project.name}-fiche-page.png`, fullPage: true });
  await page.goto('/biens/');
  await page.screenshot({ path: `captures/biens-${info.project.name}-liste.png`, fullPage: true });
});

test('5. Ménage : les valeurs d\'essai sont effacées', async ({ page, request }) => {
  await sessionAdmin(page, request);
  for (const id of ['510', '394']) {
    const r = await apiB(page, '/admin/bien', { ...VIDE, id, copro: id === '510' ? '1' : '0', copro_lots: id === '510' ? '15' : '', copro_charges: id === '510' ? '1820' : '', copro_procedure: id === '510' ? 'pas de procédure en cours' : '' });
    expect(r.visible).toBe(false);
  }
});
