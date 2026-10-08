/* Captures de chaque étape et du résultat, iPhone 13 et ordinateur → captures/<appareil>/ */
import { test, expect } from '@playwright/test';
import { fausseBan, coordonnees, afficherResultat, etape, attendreEtape, suivant, choisirAdresse, pictogramme, emailTest } from './aides.mjs';

test('captures du parcours, du résultat et de l\'espace', async ({ page }, info) => {
  test.setTimeout(180000);
  const dossier = `captures/${info.project.name}`;
  let n = 0;
  const photo = async (nom, plein = false) => {
    await page.waitForTimeout(450);
    // rien ne dépasse de l'écran en largeur
    const d = await page.evaluate((l) => {
      const hors = [];
      document.querySelectorAll('.ee *').forEach((e) => { if (e.closest('.hp')) return; const r = e.getBoundingClientRect(); if (r.width && r.height && (r.right > l + 1 || r.left < -1) && getComputedStyle(e).visibility !== 'hidden') hors.push((e.id ? '#' + e.id : e.className || e.tagName) + ' ' + Math.round(r.left) + '→' + Math.round(r.right)); });
      return { page: document.documentElement.scrollWidth, ecran: l, hors: hors.slice(0, 5) };
    }, page.viewportSize().width);
    expect.soft(d.page, `largeur de page à l'écran « ${nom} »`).toBeLessThanOrEqual(d.ecran);
    expect.soft(d.hors, `éléments qui dépassent à l'écran « ${nom} »`).toEqual([]);
    await page.screenshot({ path: `${dossier}/${String(++n).padStart(2, '0')}-${nom}.png`, fullPage: plein, animations: 'disabled' });
    // et le bloc seul (formulaire, résultat ou espace), pour le compte rendu
    for (const bloc of ['#ee-form', '#ee-result', '#me-in']) {
      const el = page.locator(bloc);
      if (await el.count() && await el.isVisible()) { await el.screenshot({ path: `${dossier}/bloc-${String(n).padStart(2, '0')}-${nom}.png`, animations: 'disabled' }); break; }
    }
  };
  await fausseBan(page);
  await page.goto('/');
  await expect(pictogramme(page)).toBeVisible();
  await photo('accueil-pictogramme');
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').fill('30 rue bannelier');
  await expect(page.locator('#ee-sugg li')).toHaveCount(1);
  await photo('etape-1-adresse');
  await page.locator('#ee-sugg li').first().click();
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  await photo('etape-2-type');
  await page.locator('.ee-tile[data-type="appartement"]').click();
  await attendreEtape(page, 'bien');
  await page.locator('#ee-surface').fill('72');
  await page.locator('[data-choix="epoque"] [data-v="1948-1974"]').click();
  await page.locator('[data-choix="etat"] [data-v="bon"]').click();
  await photo('etape-3-le-bien', true);
  await suivant(page, 'bien');
  await attendreEtape(page, 'atouts');
  await page.locator('.ee-check:has(input[name="balcon"])').click();
  await page.locator('.ee-check:has(input[name="cave"])').click();
  await photo('etape-4-atouts');
  await suivant(page, 'atouts');
  await attendreEtape(page, 'prix');
  await page.locator('#ee-prix').fill('250000');
  await photo('etape-5-prix');
  await suivant(page, 'prix');
  await attendreEtape(page, 'projet');
  await photo('etape-6-projet');
  await page.locator('[data-choix="delai"] [data-v="6mois"]').click();
  await attendreEtape(page, 'contact');
  await coordonnees(page, { email: emailTest('captures') });
  await etape(page, 'contact').scrollIntoViewIfNeeded();
  await photo('coordonnees', true);
  await afficherResultat(page);
  await page.locator('#ee-res-box').scrollIntoViewIfNeeded();
  await photo('resultat', true);
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-in')).toBeVisible();
  await photo('mon-espace', true);
  await page.goto('/');
  await expect(pictogramme(page)).toHaveClass(/is-in/);
  await photo('accueil-connecte');
});
