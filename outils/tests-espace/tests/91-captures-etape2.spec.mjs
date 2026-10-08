/* Captures de l'étape 2, à montrer : les créneaux après le résultat, l'espace du vendeur (frise, visite), le dossier
   de l'agence (prochaine action, visite, statut), l'avis de valeur en saisie. → captures/etape2-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fausseBan, estimationComplete, api, sessionAdmin, SITE } from './aides.mjs';

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

/* Capture d'un élément, limitée en hauteur (les très longs blocs sont coupés proprement). */
async function bloc(page, cible, nom, info, max = 1500) {
  const el = typeof cible === 'string' ? page.locator(cible).first() : cible;
  await el.scrollIntoViewIfNeeded();
  // l'en-tête fixe et les boutons flottants du site ne doivent pas couvrir le bloc
  await page.addStyleTag({ content: '#nav,#stickybar,.sim-peek{display:none!important}' });
  const b = await el.boundingBox();
  const defile = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await page.screenshot({ path: `captures/etape2-${info.project.name}-${nom}.png`, fullPage: true, clip: { x: Math.max(0, b.x + defile.x - 8), y: Math.max(0, b.y + defile.y - 8), width: b.width + 16, height: Math.min(max, b.height + 16) } });
}

test('captures de l\'étape 2', async ({ page, request, browser }, info) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pc = await ctx.newPage();
  await fausseBan(pc);
  const { reponse } = await estimationComplete(pc, { atouts: ['balcon', 'cave'] }, { prenom: 'Claire', nom: 'Martin' });
  const id = reponse.corps.demande_id, ref = reponse.corps.reference;

  // 1. les créneaux, juste après le résultat
  const rdv = pc.locator('#ee-rdv');
  await rdv.locator('[data-rdv-ouvrir]').click();
  await rdv.locator('.ee-days .pill').nth(1).click();
  await rdv.locator('.ee-hour').nth(1).click();
  await rdv.locator('.ee-hour').nth(5).click();
  await rdv.locator('.ee-days .pill').nth(2).click();
  await rdv.locator('.ee-hour').nth(0).click();
  await bloc(pc, '#ee-rdv', '1-creneaux', info);
  await pc.reload();
  await pc.locator('#ee-rdv [data-rdv-ouvrir]').click();
  await pc.locator('#ee-rdv .ee-days .pill').nth(1).click();
  await pc.locator('#ee-rdv .ee-hour').nth(1).click();
  await pc.locator('#ee-rdv .ee-hour').nth(5).click();
  await pc.locator('#ee-rdv [data-rdv-envoyer]').click();
  await expect(pc.locator('#ee-rdv [data-test="visite-demandee"]')).toBeVisible();

  // 2. l'agence : le dossier, la visite à confirmer, puis fixée
  await sessionAdmin(page, request);
  await page.goto('/admin/?q=' + ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne.locator('[data-vfix]').first()).toBeVisible();
  await bloc(page, ligne, '2-admin-visite-a-confirmer', info, 1250);
  await ligne.locator('[data-vfix]').first().click();
  await expect(ligne.locator('[data-test="visite-fixee"]')).toBeVisible();
  await page.goto('/admin/?q=' + ref);
  await expect(ligne.locator('[data-test="visite-fixee"]')).toBeVisible();
  await bloc(page, ligne, '3-admin-visite-fixee', info, 1250);

  // 3. le vendeur : son espace, étape 3 sur 10
  await pc.goto('/mon-espace/');
  const carte = pc.locator('#me-cards .ee-card').first();
  await expect(carte.locator('[data-test="visite-fixee"]')).toBeVisible();
  await carte.locator('.ee-frise summary').click();
  await bloc(pc, carte, '4-espace-vendeur', info, 1900);

  // 4. l'avis de valeur en saisie
  await ligne.locator('[data-avis-ouvrir]').click();
  const ed = ligne.locator('[data-avis-ed]');
  await expect(ed.locator('[data-av="notes"]')).toBeVisible();
  await ed.locator('[data-av="date_visite"]').fill(new Date().toISOString().slice(0, 10));
  await ed.locator('[data-av="notes"]').fill('Appartement traversant au 2e étage, bien tenu. Séjour lumineux au sud-ouest, vue dégagée sur la cour. Cuisine séparée à moderniser. Deux chambres au calme.');
  await ed.locator('[data-av="atouts"]').fill('Traversant et lumineux\nBalcon et cave\nÀ cinq minutes à pied du tram');
  await ed.locator('[data-av="vigilance"]').fill('Cuisine et électricité à moderniser\nPas de stationnement privatif');
  await bloc(page, ligne.locator('[data-bloc="avis"]'), '5-admin-avis-de-valeur', info, 1700);
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-ok')).toContainText('PDF créé', { timeout: 60000 });

  // ménage : le compte d'essai et tout son suivi
  expect((await api(pc, '/compte/supprimer', { confirmation: 'SUPPRIMER' }))._status).toBe(200);
  expect((await api(page, '/admin/journal?demande=' + id))._status).toBe(404);
  await ctx.close();
});
