/* Accessibilité de base : règles WCAG A/AA (axe-core) sur chaque écran du module, libellés, parcours au clavier. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fausseBan, coordonnees, afficherResultat, etape, attendreEtape, suivant, choisirAdresse, emailTest, api, connexionParLien, ADMIN, PAUSE } from './aides.mjs';

async function axe(page, nom) {
  // les couleurs changent en fondu (0,2 s) : on mesure une fois le fondu fini
  await page.waitForTimeout(400);
  // on contrôle le module (le reste de la page est le gabarit du site, contrôlé à part)
  const r = await new AxeBuilder({ page }).include('.ee').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const lisible = r.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect.soft(lisible, `accessibilité de l'écran « ${nom} »`).toEqual([]);
}

test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('chaque écran du parcours, le résultat, l\'espace et l\'admin passent les règles WCAG A et AA', async ({ page, request }) => {
  test.setTimeout(180000);
  await page.goto('/estimer/');
  await axe(page, 'étape 1');
  await page.locator('#ee-adresse').fill('30 rue bannelier');
  await expect(page.locator('#ee-sugg li')).toHaveCount(1);
  await axe(page, 'étape 1, liste ouverte');
  await suivant(page, 'adresse');                      // une seule proposition : elle est prise
  await attendreEtape(page, 'type');
  await axe(page, 'étape 2');
  await suivant(page, 'type');                         // erreur affichée
  await axe(page, 'étape 2 en erreur');
  await page.locator('.ee-tile[data-type="appartement"]').click();
  await attendreEtape(page, 'bien');
  await suivant(page, 'bien');
  await axe(page, 'étape 3 en erreur');
  await page.locator('#ee-surface').fill('72');
  await page.locator('[data-choix="epoque"] [data-v="nsp"]').click();
  await page.locator('[data-choix="etat"] [data-v="bon"]').click();
  await axe(page, 'étape 3');
  await suivant(page, 'bien');
  await attendreEtape(page, 'atouts');
  await page.locator('.ee-check:has(input[name="balcon"])').click();
  await axe(page, 'étape 4');
  await suivant(page, 'atouts');
  await attendreEtape(page, 'prix');
  await axe(page, 'étape 5');
  await suivant(page, 'prix');
  await attendreEtape(page, 'projet');
  await axe(page, 'étape 6');
  await page.locator('[data-choix="delai"] [data-v="nsp"]').click();
  await attendreEtape(page, 'contact');
  await page.locator('#ee-submit').click();
  await axe(page, 'coordonnées en erreur');
  await coordonnees(page);
  await afficherResultat(page);
  await axe(page, 'résultat');
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-in')).toBeVisible();
  await axe(page, 'mon espace, connecté');
  await page.locator('#me-mdp-btn').click();
  await page.locator('#me-del-btn').click();
  await axe(page, 'mon espace, formulaires ouverts');
  await api(page, '/deconnexion', {});
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-out')).toBeVisible();
  await axe(page, 'mon espace, connexion');
  await page.locator('[data-tab="ins"]').first().click();
  await axe(page, 'mon espace, création');
  await page.goto('/admin/');
  await expect(page.locator('#ad-no')).toBeVisible();
  await axe(page, 'admin, accès refusé');
  await connexionParLien(page, request, ADMIN);
  await page.goto('/admin/');
  await expect(page.locator('#ad-in')).toBeVisible();
  await page.locator('#ad-rows .ee-row summary').first().click();
  await axe(page, 'admin, demandes');
  await page.locator('[data-vue="comptes"]').click();
  await axe(page, 'admin, comptes');
  await page.locator('[data-vue="reglages"]').click();
  await axe(page, 'admin, Google Sheet');
});

test('chaque champ a un libellé ; chaque bouton a un nom', async ({ page }) => {
  for (const chemin of ['/estimer/', '/mon-espace/']) {
    await page.goto(chemin);
    await page.waitForLoadState('networkidle');
    const sans = await page.evaluate(() => {
      const nom = (e) => (e.getAttribute('aria-label') || '').trim() || (e.getAttribute('aria-labelledby') || '').split(' ').map((i) => (document.getElementById(i) || {}).textContent || '').join(' ').trim()
        || (e.labels && e.labels.length ? e.labels[0].textContent.trim() : '') || (e.closest('label') ? e.closest('label').textContent.trim() : '') || (e.tagName === 'BUTTON' || e.tagName === 'A' ? e.textContent.trim() : '') || (e.getAttribute('title') || '').trim();
      return [...document.querySelectorAll('.ee input, .ee select, .ee textarea, .ee button, .ee a')].filter((e) => !e.closest('.hp') && !nom(e)).map((e) => e.id || e.outerHTML.slice(0, 80));
    });
    expect(sans, `éléments sans nom sur ${chemin}`).toEqual([]);
  }
});

test('parcours entier au clavier seul', async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'clavier physique');
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').focus();
  await page.keyboard.type('12 bis rue de la prefecture');
  await expect(page.locator('#ee-sugg li')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#ee-adresse')).toHaveAttribute('aria-activedescendant', 'ee-o0');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ee-picked')).toBeVisible();
  await page.keyboard.press('Enter');                               // Entrée dans le champ : étape suivante
  await attendreEtape(page, 'type');
  await expect(etape(page, 'type')).toBeFocused();                  // le focus suit l'étape
  await page.keyboard.press('Tab');
  await expect(page.locator('.ee-tile[data-type="appartement"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');                               // « Une maison »
  await attendreEtape(page, 'bien');
  await page.keyboard.press('Tab');
  await expect(page.locator('#ee-surface')).toBeFocused();
  await page.keyboard.type('110');
  for (let i = 0; i < 20 && !(await page.locator('#ee-terrain').evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
  await page.keyboard.type('500');
  await page.locator('[data-choix="epoque"] [data-v="1975-2000"]').focus(); await page.keyboard.press('Space');
  await page.locator('[data-choix="etat"] [data-v="bon"]').focus(); await page.keyboard.press('Enter');
  await etape(page, 'bien').locator('[data-next]').focus(); await page.keyboard.press('Enter');
  await attendreEtape(page, 'atouts');
  await page.locator('input[name="garage"]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('input[name="garage"]')).toBeChecked();
  await etape(page, 'atouts').locator('[data-next]').focus(); await page.keyboard.press('Enter');
  await attendreEtape(page, 'prix');
  await page.locator('#ee-prix').focus(); await page.keyboard.type('320000'); await page.waitForTimeout(PAUSE); await page.keyboard.press('Enter');
  await attendreEtape(page, 'projet');
  await page.locator('[data-choix="delai"] [data-v="plus6mois"]').focus(); await page.keyboard.press('Enter');
  await attendreEtape(page, 'contact');
  await page.locator('#ee-new [data-civ="M."]').focus(); await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); await page.keyboard.type('Jean');
  await page.keyboard.press('Tab'); await page.keyboard.type('Dupont');
  await page.keyboard.press('Tab'); await page.keyboard.type(emailTest('clavier'));
  await page.keyboard.press('Tab'); await page.keyboard.type('0612345678');
  await page.keyboard.press('Tab'); await page.keyboard.press('Space');
  await expect(page.locator('#ee-consent')).toBeChecked();
  await page.waitForTimeout(4000);
  await page.keyboard.press('Enter');                               // Entrée dans le formulaire : envoi
  await expect(page.locator('#ee-result')).toBeVisible();
  await expect(page.locator('#ee-result')).toBeFocused();
  await expect(page.locator('[data-test="fourchette"]')).toBeVisible();
});

test('le focus est visible sur les éléments du module', async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'clavier physique');
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').focus();
  const champ = await page.locator('#ee-adresse').evaluate((e) => getComputedStyle(e).boxShadow);
  expect(champ).not.toBe('none');
  await page.keyboard.press('Tab');
  const bouton = await etape(page, 'adresse').locator('[data-next]').evaluate((e) => { const s = getComputedStyle(e); return s.outlineStyle + ' ' + s.outlineWidth; });
  expect(bouton).not.toMatch(/none|^\S+ 0px/);
});
