/* Visite d'un bien à vendre en 2 clics, sur les créneaux libres (fiches /biens/<réf>/) — chantier « Mes biens », lignes 60 et 63.
   « Visiter ce bien » mène au bloc ; 1er clic : un créneau ; 2e clic : « Confirmer cette visite » (prénom + téléphone, pas
   d'adresse à donner). La demande arrive dans /admin/ (« Visite d'un bien à vendre », réf. du bien), l'agence est alertée.
   Mesures par bien sans cookie : vue, clic « Visiter », visite réservée, visibles dans /admin/ → onglet « Biens ». */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { api, viderBoite, courrier, sessionAdmin, ADMIN } from './aides.mjs';

const REF = '394';
const FICHE = '/biens/394-maison-dijon/';
const capture = async (page, info, nom) => { await page.waitForTimeout(700); return page.screenshot({ path: `captures/${info.project.name}-${nom}.png`, fullPage: false }); };

test('fiche bien : « Visiter ce bien » → créneau → confirmer ; alerte, dossier et mesures dans /admin/', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|youtube|instagram|cloudflareinsights/i.test(m.text())) erreurs.push(m.text()); });
  await viderBoite(request);
  await page.goto(FICHE);

  // le bouton principal mène à la visite sur ce site, jamais chez l'agence
  const cta = page.locator('.bf-card:visible a.btn-primary');
  await expect(cta).toHaveText('Visiter ce bien');
  await expect(page.locator('main a.btn-primary[href*="gravelin-immo.com"]')).toHaveCount(0);
  await capture(page, info, 'bien-0-fiche');
  await cta.click();
  const bloc = page.locator('#visite [data-rdv]');
  await expect(bloc).toBeInViewport();
  await expect(bloc.locator('h2')).toHaveText('Visitez ce bien en 2 clics.');
  await expect(bloc.locator('.rdvx-day').first()).toBeVisible();
  await capture(page, info, 'bien-1-creneaux');

  // clic 1 : un créneau ; pas d'adresse demandée
  await bloc.locator('.rdvx-day').nth(1).click();
  const heure = bloc.locator('.rdvx-h').first();
  await heure.click();
  await expect(bloc.locator('.rdvx-form')).toBeVisible();
  await expect(bloc.locator('input[name="adresse"]')).toHaveCount(0);
  await expect(bloc.locator('.rdvx-choisi')).toHaveText(/^Visite /);
  await bloc.locator('[data-test="rdv-confirmer"]').click();
  await expect(bloc.locator('.rdvx-err')).toHaveText('Indiquez votre prénom.');
  await bloc.locator('input[name="prenom"]').fill('Camille');
  await bloc.locator('input[name="telephone"]').fill('06 12 34 56 78');
  await capture(page, info, 'bien-2-formulaire');
  await expect(bloc.locator('[data-test="rdv-confirmer"]')).toHaveText(/Confirmer cette visite/);

  // clic 2 (un humain met plus de 4 s depuis l'affichage du bloc ; plus vite, c'est noté comme robot, sans alerte)
  await page.waitForTimeout(4000);
  await bloc.locator('[data-test="rdv-confirmer"]').click();
  const ok = bloc.locator('[data-test="rdv-ok"]');
  await expect(ok).toBeVisible();
  await expect(ok).toContainText('confirmer la visite de ce bien');
  await expect(bloc.locator('.rdvx-alt a[href*="wa.me"]')).toHaveAttribute('href', new RegExp('bien%20r%C3%A9f\\.%20' + REF));
  const reference = (await ok.textContent()).match(/R-\d{8}-[A-Z0-9]{6}/)[0];
  await capture(page, info, 'bien-3-confirme');

  // rien ne dépasse de l'écran, aucune erreur, accessibilité du bloc
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  expect(sw).toBeLessThanOrEqual(iw);
  const boite = await bloc.boundingBox();
  expect(boite.x + boite.width, 'le bloc tient dans l\'écran (bord droit visible)').toBeLessThanOrEqual(iw + 0.5);
  const axe = await new AxeBuilder({ page }).include('#visite').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  expect(erreurs).toEqual([]);

  // l'agence est alertée, avec la référence du bien
  const [m] = await courrier(request, (x) => x.to.includes(ADMIN) && /Visite demandée/.test(x.subject) && x.subject.includes('Camille'));
  expect(m, 'alerte à l\'agence').toBeTruthy();
  expect(m.text).toContain('Visite du bien réf. ' + REF);

  // le message reste possible, replié sous le bloc
  await expect(page.locator('#visite details.bf-ecrire #bf-form')).toBeHidden();
  await page.locator('#visite details.bf-ecrire summary').click();
  await expect(page.locator('#bf-form')).toBeVisible();

  // /admin/ : la demande (type « Visite d'un bien à vendre ») et les mesures du bien
  await sessionAdmin(page, request);
  const liste = await api(page, '/admin/demandes?q=' + reference);
  const dem = (liste.demandes || []).find((x) => x.reference === reference);
  expect(dem, 'demande dans /admin/').toBeTruthy();
  expect(JSON.stringify(dem)).toContain('visite_bien');
  const mes = await api(page, '/admin/mesures-biens');
  const b = mes.biens.find((x) => x.ref === REF);
  expect(b.vue).toBeGreaterThanOrEqual(1);
  expect(b.visiter).toBeGreaterThanOrEqual(1);
  expect(b.rdv).toBeGreaterThanOrEqual(1);
  await page.goto('/admin/');
  await page.locator('[data-vue="biens"]').click();
  await expect(page.locator('#ad-mb')).toContainText('Réf. ' + REF);
  await capture(page, info, 'bien-4-admin');
});

test('fiche bien : un essai (?test) ne compte rien ; la mesure refuse les gestes inconnus', async ({ page }) => {
  await page.goto(FICHE + '?test');
  const appels = [];
  page.on('request', (r) => { if (r.url().includes('/api/espace/mesure')) appels.push(r.url()); });
  await page.locator('.bf-card:visible a.btn-primary').click();
  await page.waitForTimeout(800);
  expect(appels).toEqual([]);
  expect((await api(page, '/mesure', { ref: REF, evt: 'clic' }))._status).toBe(400);
  expect((await api(page, '/mesure', { ref: '../x', evt: 'vue' }))._status).toBe(400);
});

test('un essai (prénom « TEST ») ne prend jamais le créneau d\'un vrai client', async ({ page }) => {
  await page.goto(FICHE + '?test');
  const d = await api(page, '/creneaux');
  const debut = d.jours[d.jours.length - 1].heures.slice(-1)[0].debut;
  const r = await api(page, '/rdv', { creneau: debut, prenom: 'TEST Essai', telephone: '0600000000', consentement: true, duree: 6000, depuis: 'bien', bien: REF });
  expect(r._status).toBe(201);
  const apres = await api(page, '/creneaux');
  expect(apres.jours.flatMap((j) => j.heures.map((h) => h.debut))).toContain(debut);
});
