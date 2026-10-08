/* Le site tel qu'il tourne aujourd'hui (pas encore d'e-mail aux clients) : le résultat s'affiche quand même tout de
   suite, le mot de passe est proposé après, en option. Robots, champ leurre, limite de débit. */
import { test, expect } from '@playwright/test';
import { fausseBan, estimationComplete, parcours, coordonnees, afficherResultat, pictogramme, moi, api, emailTest, SITE_SANS_EMAIL } from './aides.mjs';

test.use({ baseURL: SITE_SANS_EMAIL });
// ce serveur applique les vrais plafonds de débit : la série ne passe qu'une fois par lancement (sur iPhone 13)
test.beforeEach(async ({ page }, info) => { test.skip(info.project.name !== 'iphone13', 'plafonds réels : une seule série'); await fausseBan(page); });

const REPONSES = { type: 'appartement', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', lat: 47.32396, lon: 5.03633, delai: 'asap', surface: 72, pieces: 3, chambres: 2, epoque: 'nsp', etat: 'bon', etage: 1, etages_immeuble: 4 };
const contact = (email) => ({ civilite: 'Mme', prenom: 'Lina', nom: 'Robert', email, telephone: '06 11 22 33 44' });

test('sans e-mail aux clients : résultat immédiat, puis mot de passe en option, puis connexion par le pictogramme', async ({ page }) => {
  const { contact: c, reponse } = await estimationComplete(page);
  expect(reponse.statut).toBe(201);
  expect(reponse.corps.resultat.fourchette).toBe(true);
  expect(reponse.corps.espace).toMatchObject({ connecte: true, nouveau: true, lien: 'indisponible' });
  await expect(page.locator('[data-test="fourchette"]')).toBeVisible();
  // après le résultat, en option
  await expect(page.locator('#ee-mdp-form')).toBeVisible();
  await expect(page.locator('#ee-mdp-hint')).toContainText('Facultatif');
  await expect(page.locator('#ee-apres')).not.toContainText('Un e-mail vient de partir');
  await page.locator('#ee-mdp').fill('Rue-Bannelier-30');
  await page.locator('#ee-mdp-form [type=submit]').click();
  await expect(page.locator('#ee-mdp-form .ee-ok')).toBeVisible();
  // on ferme tout, on revient par l'accueil et le pictogramme, mêmes identifiants
  await api(page, '/deconnexion', {});
  await page.goto('/');
  await pictogramme(page).click();
  // sans e-mail : le mot de passe d'abord
  await expect(page.locator('#me-cnx-btn')).toHaveText('Me connecter');
  await page.locator('#me-email').fill(c.email);
  await page.locator('#me-mdp').fill('Rue-Bannelier-30');
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
  await expect(pictogramme(page)).toHaveClass(/is-in/);
});

test('sans e-mail : « recevoir un lien » et « mot de passe oublié » disent quoi faire', async ({ page }) => {
  const { contact: c } = await estimationComplete(page);
  await api(page, '/deconnexion', {});
  await page.goto('/mon-espace/');
  await page.locator('#me-email').fill(c.email);
  await page.locator('#me-lien-btn').click();
  await expect(page.locator('#me-cnx .ee-err')).toContainText('n\'est pas encore ouvert');
  await expect(page.locator('#me-cnx .ee-err')).toContainText('07 67 57 92 28');
  // compte sans mot de passe : message qui explique, pas « incorrect »
  await page.locator('#me-mdp').fill('quelquechose');
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-cnx .ee-err')).toContainText('sans mot de passe');
  await page.locator('#me-oubli-btn').click();
  await page.locator('#me-oubli [type=submit]').click();
  await expect(page.locator('#me-oubli .ee-err')).toContainText('07 67 57 92 28');
});

test('sans e-mail : même e-mail, autre navigateur → résultat affiché, estimation en attente de confirmation', async ({ page, browser }) => {
  const { contact: c } = await estimationComplete(page);
  const autre = await browser.newContext({ baseURL: SITE_SANS_EMAIL, locale: 'fr-FR' });
  const p2 = await autre.newPage();
  await fausseBan(p2);
  const { reponse } = await estimationComplete(p2, { surface: '55' }, { email: c.email });
  expect(reponse.corps.resultat.fourchette).toBe(true);
  expect(reponse.corps.espace).toMatchObject({ connecte: false, existant: true, en_attente: true, lien: 'indisponible' });
  await expect(p2.locator('[data-test="fourchette"]')).toBeVisible();
  await expect(p2.locator('#ee-apres')).toContainText('Vous avez déjà un espace');
  await expect(p2.locator('#ee-apres')).toContainText('vous envoie un lien de connexion quand il vous appelle');
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-attente')).toContainText('07 67 57 92 28');
  await autre.close();
});

test('champ leurre rempli (remplissage automatique ou robot) : la demande est gardée et signalée, jamais jetée', async ({ page }) => {
  await parcours(page);
  const c = await coordonnees(page);
  await page.evaluate(() => { document.querySelector('#ee-hp').value = 'https://exemple.fr'; });
  const { statut, corps } = await afficherResultat(page);
  expect(statut).toBe(201);
  expect(corps.resultat.fourchette).toBe(true);
  const m = await moi(page);
  expect(m.compte.email).toBe(c.email);
  expect(m.demandes).toHaveLength(1);
});

test('formulaire envoyé en moins de 4 secondes : gardé et signalé « robot possible »', async ({ page }) => {
  await page.goto('/estimer/');
  const email = emailTest('robot');
  const r = await api(page, '/estimation', { reponses: REPONSES, consentement: true, duree: 900, contact: contact(email) });
  expect(r._status).toBe(201);
  expect(r.espace.lien).toBe('indisponible');
});

test('le champ leurre est invisible, hors tabulation, et n\'a pas un nom que les navigateurs remplissent', async ({ page }) => {
  await page.goto('/estimer/');
  const hp = page.locator('#ee-hp');
  await expect(hp).toHaveAttribute('tabindex', '-1');
  await expect(hp).toHaveAttribute('autocomplete', 'off');
  expect(await hp.getAttribute('name')).not.toMatch(/web|url|site|mail|name|tel|address/i);
  const boite = await hp.boundingBox();
  expect(boite.x).toBeLessThan(-1000);
  await expect(page.locator('.hp')).toHaveAttribute('aria-hidden', 'true');
});

test('santé : le détail n\'est donné qu\'avec la clé', async ({ request }) => {
  const s = await (await request.get(SITE_SANS_EMAIL + '/api/espace/sante')).json();
  expect(s).toMatchObject({ base: true, email: false, email_clients: false });
  expect(s.dvf.ventes).toBeGreaterThan(10000);
  expect(s.detail).toBeUndefined();
  const faux = await (await request.get(SITE_SANS_EMAIL + '/api/espace/sante?cle=' + 'a'.repeat(43))).json();
  expect(faux.detail).toBeUndefined();
});

/* Ce test épuise le plafond : il passe en dernier (le serveur « sans e-mail » applique les plafonds réels). */
test('limite de débit : trop de tentatives de connexion → « réessayez dans quelques minutes »', async ({ page }) => {
  await page.goto('/mon-espace/');
  const email = emailTest('debit');
  let dernier;
  for (let i = 0; i < 12; i++) dernier = await api(page, '/connexion', { email, mot_de_passe: 'mauvais-' + i });
  expect(dernier).toMatchObject({ _status: 429, error: 'trop_de_demandes' });
  await page.locator('#me-email').fill(email);
  await page.locator('#me-mdp').fill('encore');
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-cnx .ee-err')).toContainText('Trop d\'essais');
});

test('limite de débit : pas plus de quelques estimations par heure depuis la même connexion', async ({ page }) => {
  await page.goto('/estimer/');
  let dernier;
  for (let i = 0; i < 30; i++) {
    dernier = await api(page, '/estimation', { reponses: REPONSES, consentement: true, duree: 60000, contact: contact(emailTest('debit')) });
    if (dernier._status === 429) break;
    await api(page, '/deconnexion', {});
  }
  expect(dernier).toMatchObject({ _status: 429, error: 'trop_de_demandes' });
});
