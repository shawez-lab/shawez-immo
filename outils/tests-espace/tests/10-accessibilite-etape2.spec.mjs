/* Accessibilité des écrans de l'étape 2 (règles WCAG A et AA, axe-core) : choix des créneaux après le résultat,
   frise et visite dans l'espace du vendeur, dossier de l'agence (visite, statuts, avis de valeur, journal).
   Et le choix d'un créneau entièrement au clavier. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fausseBan, estimationComplete, api, sessionAdmin, SITE, jourLibre } from './aides.mjs';

async function axe(page, nom) {
  await page.waitForTimeout(400);       // les couleurs changent en fondu
  const r = await new AxeBuilder({ page }).include('.ee').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const lisible = r.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect.soft(lisible, `accessibilité de l'écran « ${nom} »`).toEqual([]);
}

test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('créneaux de visite, frise du vendeur et dossier de l\'agence : règles WCAG A et AA', async ({ page, request, browser }, info) => {
  test.setTimeout(240000);
  const ctx = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pc = await ctx.newPage();
  await fausseBan(pc);
  const { reponse } = await estimationComplete(pc, {}, { prenom: 'Axelle', nom: 'Lecteur' });
  const id = reponse.corps.demande_id, ref = reponse.corps.reference;

  // après le résultat : invitation, sélecteur ouvert, créneaux choisis, demande envoyée
  const rdv = pc.locator('#ee-rdv');
  await axe(pc, 'résultat, visite proposée');
  await rdv.locator('[data-rdv-ouvrir]').click();
  await expect(rdv.locator('.ee-hour').first()).toBeVisible();
  await axe(pc, 'créneaux, rien de choisi');
  await jourLibre(rdv, 5);
  for (const n of [0, 2, 4]) await rdv.locator('.ee-hour').nth(n).click();
  await axe(pc, 'créneaux, trois choisis');
  await rdv.locator('[data-rdv-envoyer]').click();
  await expect(rdv.locator('[data-test="visite-demandee"]')).toBeVisible();
  await axe(pc, 'créneaux envoyés');

  // l'agence : dossier ouvert (visite à confirmer), puis visite fixée, avis de valeur en saisie, journal, réglages
  await sessionAdmin(page, request);
  await page.goto('/admin/?q=' + ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne.locator('[data-vfix]').first()).toBeVisible();
  await axe(page, 'admin, visite à confirmer');
  await ligne.locator('[data-vfix]').first().click();
  await expect(ligne.locator('[data-test="visite-fixee"]')).toBeVisible();
  await ligne.locator('[data-f="statut"]').selectOption('pause');
  await axe(page, 'admin, visite fixée, raison affichée');
  await ligne.locator('[data-f="statut"]').selectOption('visite');
  await ligne.locator('[data-avis-ouvrir]').click();
  await expect(ligne.locator('[data-av="notes"]')).toBeVisible();
  await ligne.locator('[data-av-ventes] summary').click();
  await ligne.locator('[data-journal] summary').click();
  await expect(ligne.locator('[data-journal] li').first()).toBeVisible();
  await axe(page, 'admin, avis de valeur en saisie, ventes et journal ouverts');
  await page.locator('[data-vue="reglages"]').click();
  await axe(page, 'admin, réglages');

  // le vendeur : frise dépliée, visite fixée
  await pc.goto('/mon-espace/');
  const carte = pc.locator('#me-cards .ee-card').first();
  await expect(carte.locator('[data-test="visite-fixee"]')).toBeVisible();
  await carte.locator('.ee-frise summary').click();
  await axe(pc, 'espace, étape 3 sur 10, frise dépliée');
  // dossier avancé puis en pause
  await api(page, '/admin/demande', { id, statut: 'offre', prevenir: false });
  await pc.reload();
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Offre reçue');
  await axe(pc, 'espace, offre reçue');
  await api(page, '/admin/demande', { id, statut: 'pause', rappel_le: '2027-02-01', prevenir: false });
  await pc.reload();
  await expect(carte.locator('.ee-etape span')).toHaveText('En pause');
  await axe(pc, 'espace, en pause');
  await ctx.close();
});

test('choisir son créneau au clavier seulement', async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'clavier physique : ordinateur');
  test.setTimeout(120000);
  await estimationComplete(page, {}, { prenom: 'Clavier', nom: 'Seul' });
  const rdv = page.locator('#ee-rdv');
  await rdv.locator('[data-rdv-ouvrir]').focus();
  await page.keyboard.press('Enter');
  await expect(rdv.locator('.ee-hour').first()).toBeVisible();
  // un autre jour, puis deux heures : tout à la tabulation et à la barre d'espace
  const k = await jourLibre(rdv, 4);
  await rdv.locator('.ee-days .pill').nth(0).click();
  await rdv.locator('.ee-days .pill').nth(k).focus();
  await page.keyboard.press('Enter');
  await expect(rdv.locator('.ee-days .pill').nth(k)).toHaveAttribute('aria-pressed', 'true');
  await expect(rdv.locator('.ee-days .pill').nth(k)).toBeFocused();       // le focus reste où il était
  await rdv.locator('.ee-hour').nth(1).focus();
  await page.keyboard.press('Space');
  await expect(rdv.locator('.ee-hour').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(rdv.locator('.ee-hour').nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await expect(rdv.locator('.ee-sel li')).toHaveCount(2);
  // le focus se voit
  const contour = await rdv.locator('.ee-hour').nth(2).evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(contour).not.toBe('none');
  await rdv.locator('[data-rdv-envoyer]').focus();
  await page.keyboard.press('Enter');
  await expect(rdv.locator('[data-test="visite-demandee"]')).toBeVisible();
  expect((await api(page, '/moi')).demandes[0].visite.creneaux.length).toBe(2);
});
