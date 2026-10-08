/* Le même module à la charte de l'agence (outils/espace-estimation-gravelin/) : même parcours, même API, même base,
   demandes notées « gravelin ». */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fausseBan, coordonnees, afficherResultat, etape, attendreEtape, suivant, choisirAdresse, moi, emailTest, connexionParLien, ADMIN, api } from './aides.mjs';

const DEMO = '/outils/espace-estimation-gravelin/';
test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('module à la charte de l\'agence : parcours complet, résultat, espace, source « gravelin »', async ({ page, request }, info) => {
  test.setTimeout(150000);
  const dossier = `captures/gravelin-${info.project.name}`;
  let n = 0;
  const largeur = page.viewportSize().width;
  const photo = async (nom, plein = false) => {
    await page.waitForTimeout(500);
    const hors = await page.evaluate((l) => [...document.querySelectorAll('.ee-module *')].filter((e) => { if (e.closest('.hp')) return false; const r = e.getBoundingClientRect(); return r.width && r.height && (r.right > l + 1 || r.left < -1); }).map((e) => (e.id || e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().right)).slice(0, 4), largeur);
    expect.soft(hors, `rien ne dépasse à l'écran « ${nom} »`).toEqual([]);
    const a = await new AxeBuilder({ page }).include('.ee-module').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect.soft(a.violations.map((v) => `${v.id} : ${v.nodes.slice(0, 2).map((x) => x.target.join(' ')).join(' | ')}`), `accessibilité de l'écran « ${nom} »`).toEqual([]);
    await page.screenshot({ path: `${dossier}/${String(++n).padStart(2, '0')}-${nom}.png`, fullPage: plein, animations: 'disabled' });
  };
  await page.goto(DEMO + 'demo-estimer.html');
  // l'habillage est bien celui de l'agence (papier, encre, cuivre), pas celui de shawez-immo.com
  await expect(page.locator('.ee-module')).toHaveCSS('background-color', 'rgb(246, 243, 236)');
  await expect(page.locator('.ee-module h1')).toHaveCSS('color', 'rgb(20, 22, 28)');
  await expect(etape(page, 'adresse').locator('[data-next]')).toHaveCSS('background-color', 'rgb(149, 92, 40)');
  await expect(page.locator('.ee-module h1')).toContainText('Combien vaut votre bien');
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
  await photo('etape-4-atouts');
  await suivant(page, 'atouts');
  await attendreEtape(page, 'prix');
  await photo('etape-5-prix');
  await suivant(page, 'prix');
  await attendreEtape(page, 'projet');
  await photo('etape-6-projet');
  await page.locator('[data-choix="delai"] [data-v="asap"]').click();
  await attendreEtape(page, 'contact');
  const c = await coordonnees(page, { email: emailTest('gravelin'), prenom: 'Marion', nom: 'Test' });
  await photo('coordonnees', true);
  const { statut, corps } = await afficherResultat(page);
  expect(statut).toBe(201);
  expect(corps.resultat.fourchette).toBe(true);
  await expect(page.locator('[data-test="fourchette"]')).toBeVisible();
  await expect(page.locator('#ee-res-box')).toHaveCSS('background-color', 'rgb(15, 19, 32)');
  await photo('resultat', true);
  // le pictogramme de l'agence passe à « connecté », et l'espace s'ouvre à la charte de l'agence
  await expect(page.locator('.g-compte')).toHaveClass(/is-in/);
  await page.locator('#ee-apres-espace').click();
  await expect(page).toHaveURL(/demo-mon-espace(\.html)?$/);
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-titre')).toContainText('Bonjour Marion');
  await photo('mon-espace', true);
  expect((await moi(page)).compte.email).toBe(c.email);
  // côté agence : la demande est notée « gravelin »
  await api(page, '/deconnexion', {});
  await connexionParLien(page, request, ADMIN);
  await page.goto(DEMO + 'demo-admin.html?q=' + corps.reference);
  await expect(page.locator('#ad-rows .ee-row')).toHaveCount(1);
  await expect(page.locator('#ad-rows .ee-row summary')).toContainText('gravelin-immo.com');
  await photo('admin', true);
});

test('module : rechargement en cours de parcours, état conservé', async ({ page }) => {
  await page.goto(DEMO + 'demo-estimer.html');
  await choisirAdresse(page, '12 bis rue de la préfecture');
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  await page.locator('.ee-tile[data-type="maison"]').click();
  await attendreEtape(page, 'bien');
  await page.locator('#ee-surface').fill('140');
  await page.waitForTimeout(400);
  await page.reload();
  await attendreEtape(page, 'bien');
  await expect(page.locator('#ee-surface')).toHaveValue('140');
});
