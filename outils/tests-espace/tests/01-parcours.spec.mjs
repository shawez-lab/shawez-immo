/* Le parcours /estimer/ : chaque étape, Retour, erreurs de saisie, rechargement, double clic, réseau lent,
   adresses avec accents et bis/ter, appartement, maison, commerce, résultat immédiat sans mot de passe. */
import { test, expect } from '@playwright/test';
import { fausseBan, moi, retour, PAUSE, parcours, coordonnees, afficherResultat, estimationComplete, etape, attendreEtape, suivant, choisirAdresse, emailTest, assezLent, compteurs } from './aides.mjs';

test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('appartement : six étapes, un écran de coordonnées, fourchette affichée tout de suite, sans mot de passe', async ({ page }) => {
  await page.goto('/estimer/');
  await expect(page.locator('h1')).toContainText('Combien vaut votre bien');
  await expect(etape(page, 'adresse').locator('.ee-count')).toHaveText('Étape 1 sur 6');
  await choisirAdresse(page, '30 rue bannelier dijon');
  await expect(page.locator('#ee-picked')).toContainText('30 Rue Bannelier 21000 Dijon');
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  await expect(etape(page, 'type').locator('.ee-count')).toHaveText('Étape 2 sur 6');
  await page.locator('.ee-tile[data-type="appartement"]').click();
  await attendreEtape(page, 'bien');
  await page.locator('#ee-surface').fill('72');
  await compteurs(page, { etage: 2 });   // 2e étage (les compteurs partent vides)
  await page.locator('[data-choix="epoque"] [data-v="1948-1974"]').click();
  await page.locator('[data-choix="etat"] [data-v="bon"]').click();
  await suivant(page, 'bien');
  await attendreEtape(page, 'atouts');
  await page.locator('.ee-check:has(input[name="balcon"])').click();
  await page.locator('.ee-check:has(input[name="cave"])').click();
  await suivant(page, 'atouts');
  await attendreEtape(page, 'prix');
  await page.locator('#ee-prix').fill('250000');
  await expect(page.locator('#ee-prix')).toHaveValue('250 000');
  await suivant(page, 'prix');
  await attendreEtape(page, 'projet');
  await page.locator('[data-choix="delai"] [data-v="6mois"]').click();
  await attendreEtape(page, 'contact');

  // un seul écran de coordonnées : civilité, prénom, nom, e-mail, téléphone, consentement — et aucun mot de passe
  const contact = etape(page, 'contact');
  await expect(contact.locator('input[type="password"]')).toHaveCount(0);
  await expect(contact.locator('input:visible')).toHaveCount(5);
  const c = await coordonnees(page);
  const { statut, corps } = await afficherResultat(page);
  expect(statut).toBe(201);
  expect(corps.resultat.fourchette).toBe(true);
  expect(corps.espace).toMatchObject({ connecte: true, nouveau: true });

  // le résultat : fourchette, nombre de ventes, rayon, date des données, mention indicative
  const res = page.locator('#ee-res-box');
  await expect(res.locator('[data-test="fourchette"]')).toContainText('€');
  await expect(res.locator('[data-test="ventes"]')).toContainText(/\d+ ventes réelles/);
  await expect(res.locator('[data-test="rayon"]')).toContainText(/à moins de \d/);
  await expect(res.locator('[data-test="donnees"]')).toContainText(/Ventes DVF 2023–2025, à jour de décembre 2025/);
  await expect(res).toContainText('Indicatif, à confirmer par une visite');
  await expect(res.locator('[data-test="reference"]')).toHaveText(corps.reference);
  // la fourchette affichée est celle du calcul, pas un prix inventé
  const euros = (n) => n.toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €';
  await expect(res.locator('[data-test="fourchette"]')).toContainText(euros(corps.resultat.bas));
  await expect(res.locator('[data-test="fourchette"]')).toContainText(euros(corps.resultat.haut));
  expect(corps.resultat.comparables).toBeGreaterThanOrEqual(5);
  expect(corps.resultat.haut).toBeGreaterThan(corps.resultat.bas);

  // après le résultat seulement : l'espace est créé, mot de passe proposé en option
  await expect(page.locator('#ee-apres')).toContainText(c.email);
  await expect(page.locator('#ee-mdp-form')).toBeVisible();
  // le compte existe et la session est ouverte, sans mot de passe
  const m = await moi(page);
  expect(m.compte).toMatchObject({ email: c.email, prenom: 'Claire', nom: 'Martin', civilite: 'Mme', mot_de_passe: false });
  expect(m.demandes).toHaveLength(1);
  expect(m.demandes[0].prix_bas).toBe(corps.resultat.bas);
});

test('maison : terrain et niveaux demandés, fourchette affichée', async ({ page }) => {
  const { reponse } = await estimationComplete(page, { type: 'maison', adresse: '10 rue des vergers quetigny', surface: '100', terrain: '400', epoque: '1975-2000', atouts: ['garage'] });
  expect(reponse.corps.resultat.fourchette).toBe(true);
  expect(reponse.corps.resultat.ajustements.map((a) => a.libelle)).toContain('Garage');
  await expect(page.locator('[data-test="fourchette"]')).toBeVisible();
});

test('commerce / murs : pas de fourchette automatique, « je vous rappelle au plus vite »', async ({ page }) => {
  await parcours(page, { type: 'autre', autre: 'commerce', surface: '' });
  await expect(etape(page, 'contact')).toBeVisible();
  await coordonnees(page);
  const { corps } = await afficherResultat(page);
  expect(corps.resultat).toMatchObject({ fourchette: false, raison: 'type' });
  await expect(page.locator('[data-test="rappel"]')).toContainText('Je vous rappelle au plus vite');
  await expect(page.locator('[data-test="fourchette"]')).toHaveCount(0);
  // même sans fourchette, l'espace est créé
  expect((await moi(page)).demandes).toHaveLength(1);
});

test('murs commerciaux : 4 étapes annoncées', async ({ page }) => {
  await page.goto('/estimer/');
  await choisirAdresse(page, '30 rue bannelier dijon');
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  await page.locator('#ee-autre-btn').click();
  await page.locator('[data-autre="murs"]').click();
  await suivant(page, 'type');
  await expect(etape(page, 'bien').locator('.ee-count')).toHaveText('Étape 3 sur 4');
  await expect(page.locator('#ee-message')).toBeVisible();
});

test('moins de 5 ventes comparables : pas de fourchette, rappel au plus vite', async ({ page }) => {
  const { reponse } = await estimationComplete(page, { adresse: '8 rue du marché saulieu', surface: '68' });
  expect(reponse.corps.resultat.fourchette).toBe(false);
  expect(reponse.corps.resultat.raison).toBe('peu_de_ventes');
  expect(reponse.corps.resultat.comparables).toBeLessThan(5);
  await expect(page.locator('[data-test="rappel"]')).toContainText('au plus vite');
  await expect(page.locator('#ee-res-box')).toContainText('trop peu de ventes comparables');
});

test('hors de la Côte-d\'Or : pas de fourchette', async ({ page }) => {
  const { reponse } = await estimationComplete(page, { adresse: '10 rue de la république lyon' });
  expect(reponse.corps.resultat).toMatchObject({ fourchette: false, raison: 'hors_zone' });
});

test('adresses avec accents, bis et ter', async ({ page }) => {
  await page.goto('/estimer/');
  await choisirAdresse(page, '12 bis rue de la préfecture');
  await expect(page.locator('#ee-adresse')).toHaveValue('12 bis Rue de la Préfecture 21000 Dijon');
  await page.locator('#ee-adresse').fill('5 ter rue du general de gaulle fontaine');
  await page.locator('#ee-sugg li').first().click();
  await expect(page.locator('#ee-picked')).toContainText('5 ter Rue du Général de Gaulle 21121 Fontaine-lès-Dijon');
  await page.locator('#ee-adresse').fill('15 rue maxime guillot chenôve');
  await page.locator('#ee-sugg li').first().click();
  await expect(page.locator('#ee-picked')).toContainText('Chenôve');
});

test('adresse avec accents et « ter » : estimation complète, adresse gardée telle quelle', async ({ page }) => {
  const { reponse } = await estimationComplete(page, { type: 'maison', adresse: '5 ter rue du général de gaulle', surface: '130', terrain: '600', epoque: '1975-2000' });
  expect(reponse.corps.resultat.fourchette).toBe(true);
  await expect(page.locator('#ee-res-box')).toContainText('5 ter Rue du Général de Gaulle 21121 Fontaine-lès-Dijon');
  const m = await moi(page);
  expect(m.demandes[0].adresse).toBe('5 ter Rue du Général de Gaulle 21121 Fontaine-lès-Dijon');
});

test('erreurs de saisie claires à chaque étape', async ({ page }) => {
  await page.goto('/estimer/');
  // adresse vide, puis adresse tapée sans choisir dans la liste
  await suivant(page, 'adresse');
  await expect(page.locator('#ee-adresse-msg')).toBeVisible();
  await expect(page.locator('#ee-adresse-msg')).toContainText('Écrivez le numéro et la rue');
  await page.locator('#ee-adresse').fill('rue');
  await page.waitForTimeout(500);
  await suivant(page, 'adresse');
  await expect(page.locator('#ee-adresse-msg')).toContainText('Choisissez votre adresse dans la liste');
  await expect(etape(page, 'adresse')).toBeVisible();
  await choisirAdresse(page, '30 rue bannelier dijon');
  await suivant(page, 'adresse');
  // type non choisi
  await suivant(page, 'type');
  await expect(page.locator('#ee-type-msg')).toBeVisible();
  await page.locator('.ee-tile[data-type="appartement"]').click();
  await attendreEtape(page, 'bien');
  // surface absente, époque et état non choisis
  await suivant(page, 'bien');
  await expect(etape(page, 'bien').locator('.field.err')).toHaveCount(3);
  await expect(etape(page, 'bien').locator('.field.err .msg').first()).toContainText('Indiquez une surface entre 5 et 2 000 m²');
  // compteurs vides : un choix est obligatoire (étage, étages de l'immeuble, pièces, chambres)
  await expect(etape(page, 'bien').locator('.ee-stp.err')).toHaveCount(4);
  await expect(etape(page, 'bien').locator('.ee-stp[data-k="pieces"] output')).toHaveText('–');
  await compteurs(page);
  await expect(etape(page, 'bien').locator('.ee-stp.err')).toHaveCount(0);
  for (const v of ['-1', '0']) {   // surface négative ou nulle : refusée avant le changement d'étape
    await page.locator('#ee-surface').fill(v);
    await suivant(page, 'bien');
    await expect(page.locator('#ee-surface')).toHaveAttribute('aria-invalid', 'true');
    await expect(etape(page, 'bien')).toBeVisible();
  }
  await page.locator('#ee-surface').fill('4');
  await suivant(page, 'bien');
  await expect(page.locator('#ee-surface')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#ee-surface').fill('72');
  await page.locator('[data-choix="epoque"] [data-v="nsp"]').click();
  await page.locator('[data-choix="etat"] [data-v="rafraichir"]').click();
  await suivant(page, 'bien');
  await attendreEtape(page, 'atouts');
  await suivant(page, 'atouts');
  await attendreEtape(page, 'prix');
  await suivant(page, 'prix');
  // délai non choisi
  await attendreEtape(page, 'projet');
  await suivant(page, 'projet');
  await expect(etape(page, 'projet').locator('.field.err .msg')).toContainText('Choisissez une réponse');
  await page.locator('[data-choix="delai"] [data-v="nsp"]').click();
  await attendreEtape(page, 'contact');
  // coordonnées : tout vide, puis e-mail et téléphone faux
  await page.locator('#ee-submit').click();
  await expect(etape(page, 'contact').locator('.field.err')).toHaveCount(5);
  await page.locator('#ee-prenom').fill('Claire'); await page.locator('#ee-nom').fill('Martin');
  await page.locator('#ee-email').fill('claire@'); await page.locator('#ee-tel').fill('0612');
  await page.locator('#ee-consent').check({ force: true });
  await page.locator('#ee-submit').click();
  await expect(etape(page, 'contact').locator('.field.err')).toHaveCount(2);
  await expect(page.locator('#ee-email')).toHaveAttribute('aria-invalid', 'true');
  await expect(etape(page, 'contact').locator('.field.err .msg').first()).toContainText('adresse e-mail valide');
  await expect(page.locator('#ee-result')).toBeHidden();
  // corrigé : le résultat s'affiche
  await page.locator('#ee-email').fill(emailTest()); await page.locator('#ee-tel').fill('+33 6 12 34 56 78');
  const { corps } = await afficherResultat(page);
  expect(corps.resultat.fourchette).toBe(true);
});

test('bouton Retour : on revient en arrière sans rien perdre', async ({ page }) => {
  await parcours(page, { prix: '199000', atouts: ['balcon'] });
  for (const [de, vers] of [['contact', 'projet'], ['projet', 'prix'], ['prix', 'atouts'], ['atouts', 'bien'], ['bien', 'type'], ['type', 'adresse']]) {
    await retour(page, de);
    await attendreEtape(page, vers);
  }
  await expect(page.locator('#ee-adresse')).toHaveValue('30 Rue Bannelier 21000 Dijon');
  await suivant(page, 'adresse');
  await expect(page.locator('.ee-tile[data-type="appartement"]')).toHaveAttribute('aria-pressed', 'true');
  await suivant(page, 'type');
  await expect(page.locator('#ee-surface')).toHaveValue('72');
  await expect(page.locator('[data-choix="etat"] [data-v="bon"]')).toHaveAttribute('aria-pressed', 'true');
  await suivant(page, 'bien');
  await expect(page.locator('input[name="balcon"]')).toBeChecked();
  await suivant(page, 'atouts');
  await expect(page.locator('#ee-prix')).toHaveValue('199 000');
});

test('rechargement en cours de parcours : état conservé, même étape', async ({ page }) => {
  await page.goto('/estimer/');
  await choisirAdresse(page, '12 bis rue de la préfecture');
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  await page.locator('.ee-tile[data-type="maison"]').click();
  await attendreEtape(page, 'bien');
  await page.locator('#ee-surface').fill('118');
  await page.locator('#ee-terrain').fill('320');
  await compteurs(page, { pieces: 4 });
  await page.locator('[data-choix="epoque"] [data-v="avant1948"]').click();
  await page.locator('[data-choix="etat"] [data-v="neuf"]').click();
  await suivant(page, 'bien');
  await attendreEtape(page, 'atouts');
  await page.locator('.ee-check:has(input[name="piscine"])').click();
  await page.waitForTimeout(400);
  await page.reload();
  await fausseBan(page);
  // on est toujours à l'étape 4, tout est là
  await attendreEtape(page, 'atouts');
  await expect(page.locator('input[name="piscine"]')).toBeChecked();
  await retour(page, 'atouts');
  await attendreEtape(page, 'bien');
  await expect(page.locator('#ee-surface')).toHaveValue('118');
  await expect(page.locator('#ee-terrain')).toHaveValue('320');
  await expect(page.locator('.ee-stp[data-k="pieces"] output')).toHaveText('4');
  await expect(page.locator('[data-choix="etat"] [data-v="neuf"]')).toHaveAttribute('aria-pressed', 'true');
  await retour(page, 'bien');
  await expect(page.locator('.ee-tile[data-type="maison"]')).toHaveAttribute('aria-pressed', 'true');
  await retour(page, 'type');
  await expect(page.locator('#ee-adresse')).toHaveValue('12 bis Rue de la Préfecture 21000 Dijon');
  await expect(page.locator('#ee-picked')).toBeVisible();
});

test('rechargement sur l\'écran des coordonnées puis sur le résultat', async ({ page }) => {
  await parcours(page);
  const email = emailTest();
  await page.locator('#ee-prenom').fill('Jean-Noël'); await page.locator('#ee-nom').fill("D'Hérouville"); await page.locator('#ee-email').fill(email); await page.locator('#ee-tel').fill('07 67 00 00 00');
  await page.waitForTimeout(400);
  await page.reload();
  await fausseBan(page);
  await attendreEtape(page, 'contact');
  await expect(page.locator('#ee-prenom')).toHaveValue('Jean-Noël');
  await expect(page.locator('#ee-nom')).toHaveValue("D'Hérouville");
  await expect(page.locator('#ee-email')).toHaveValue(email);
  await page.locator('#ee-consent').check({ force: true });
  const { corps } = await afficherResultat(page);
  // rechargé sur le résultat : il est toujours là, et aucune deuxième demande n'est créée
  await page.reload();
  await expect(page.locator('#ee-result')).toBeVisible();
  await expect(page.locator('[data-test="reference"]')).toHaveText(corps.reference);
  await expect(page.locator('#ee-form')).toBeHidden();
  expect((await moi(page)).demandes).toHaveLength(1);
  // « Estimer un autre bien » repart de zéro
  await page.locator('#ee-refaire').click();
  await attendreEtape(page, 'adresse');
  await expect(page.locator('#ee-adresse')).toHaveValue('');
});

test('double clic sur « Étape suivante » : aucune étape sautée', async ({ page }) => {
  await page.goto('/estimer/');
  await choisirAdresse(page, '30 rue bannelier dijon');
  await etape(page, 'adresse').locator('[data-next]').dblclick();
  await attendreEtape(page, 'type');
  // double clic sur la tuile (avance automatique) : on arrive à l'étape 3, pas à la 4
  await page.locator('.ee-tile[data-type="appartement"]').dblclick();
  await attendreEtape(page, 'bien');
  await page.locator('#ee-surface').fill('72');
  await compteurs(page);
  await page.locator('[data-choix="epoque"] [data-v="nsp"]').click();
  await page.locator('[data-choix="etat"] [data-v="bon"]').click();
  await etape(page, 'bien').locator('[data-next]').dblclick();
  // l'étape 4 (atouts) n'a pas été sautée, alors que l'étape 5 n'a rien d'obligatoire
  await attendreEtape(page, 'atouts');
  await etape(page, 'atouts').locator('[data-next]').dblclick();
  await attendreEtape(page, 'prix');
  await etape(page, 'prix').locator('[data-next]').dblclick();
  await attendreEtape(page, 'projet');
});

test('double clic sur « Connaître le prix de mon bien » : une seule demande', async ({ page }) => {
  await parcours(page);
  await coordonnees(page);
  await assezLent(page);
  let envois = 0;
  page.on('request', (r) => { if (r.url().includes('/api/espace/estimation') && r.method() === 'POST') envois++; });
  await page.locator('#ee-submit').dblclick();
  await expect(page.locator('#ee-result')).toBeVisible();
  expect(envois).toBe(1);
  expect((await moi(page)).demandes).toHaveLength(1);
});

test('réseau lent : bouton en attente, résultat à l\'arrivée', async ({ page }) => {
  await parcours(page);
  await coordonnees(page);
  await assezLent(page);
  await page.route('**/api/espace/estimation', async (route) => { await new Promise((r) => setTimeout(r, 3000)); await route.continue(); });
  await page.locator('#ee-submit').click();
  await expect(page.locator('#ee-submit')).toBeDisabled();
  await expect(page.locator('#ee-submit-txt')).toHaveText('Calcul en cours…');
  await expect(page.locator('#ee-result')).toBeVisible({ timeout: 15000 });
});

test('réseau coupé puis nouvel essai : message clair, rien de perdu, pas de doublon', async ({ page }) => {
  await parcours(page);
  await coordonnees(page);
  await assezLent(page);
  // 1er essai : la demande part, mais la réponse se perd en route
  let premier = true;
  await page.route('**/api/espace/estimation', async (route) => {
    if (premier) { premier = false; await route.fetch().catch(() => {}); return route.abort(); }
    return route.continue();
  });
  await page.locator('#ee-submit').click();
  await expect(page.locator('#ee-err')).toContainText('La connexion a échoué');
  await expect(page.locator('#ee-prenom')).toHaveValue('Claire');
  // 2e essai : même demande rendue (pas de doublon), session ouverte
  const [rep] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/espace/estimation')), page.locator('#ee-submit').click()]);
  expect(rep.status()).toBe(200);
  const corps = await rep.json();
  expect(corps.rejoue).toBe(true);
  await expect(page.locator('#ee-result')).toBeVisible();
  const m = await moi(page);
  expect(m.compte).toBeTruthy();
  expect(m.demandes).toHaveLength(1);
});

test('recherche d\'adresses lente : la liste arrive, on peut choisir', async ({ page }) => {
  await page.unroute(/api-adresse\.data\.gouv\.fr|data\.geopf\.fr/);
  await fausseBan(page, 'lent');
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').fill('30 rue bannelier');
  await expect(page.locator('#ee-sugg li')).toHaveCount(1, { timeout: 8000 });
  await page.locator('#ee-sugg li').first().click();
  await expect(page.locator('#ee-picked')).toBeVisible();
});

test('recherche d\'adresses en panne : on garde l\'adresse écrite, la demande est prise, rappel annoncé', async ({ page }) => {
  await page.unroute(/api-adresse\.data\.gouv\.fr|data\.geopf\.fr/);
  await fausseBan(page, 'panne');
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').fill('3 impasse des Lilas, Dijon');
  await page.waitForTimeout(700);
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  await page.locator('.ee-tile[data-type="appartement"]').click();
  await attendreEtape(page, 'bien');
  await page.locator('#ee-surface').fill('60');
  await compteurs(page);
  await page.locator('[data-choix="epoque"] [data-v="nsp"]').click();
  await page.locator('[data-choix="etat"] [data-v="bon"]').click();
  await suivant(page, 'bien');
  await attendreEtape(page, 'atouts'); await suivant(page, 'atouts');
  await attendreEtape(page, 'prix'); await suivant(page, 'prix');
  await attendreEtape(page, 'projet');
  await page.locator('[data-choix="delai"] [data-v="asap"]').click();
  await attendreEtape(page, 'contact');
  await coordonnees(page);
  const { corps } = await afficherResultat(page);
  expect(corps.resultat.fourchette).toBe(false);
  await expect(page.locator('[data-test="rappel"]')).toBeVisible();
});

test('une commune seule (sans numéro ni rue) : acceptée, avec une invitation à préciser', async ({ page }) => {
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').fill('dijon');
  await page.locator('#ee-sugg li').first().click();   // la commune « Dijon »
  await expect(page.locator('#ee-picked')).toContainText('Ajoutez le numéro et la rue');
});

test('déjà connecté : pas de coordonnées à ressaisir, estimation ajoutée à l\'espace', async ({ page }) => {
  const { contact } = await estimationComplete(page);
  await page.waitForTimeout(400);      // le site avale les clics pendant 300 ms après l'affichage du résultat (second clic d'un double clic)
  await page.locator('#ee-refaire').click();
  await parcours(page, { surPlace: true, type: 'maison', adresse: '10 rue des vergers quetigny', surface: '95', epoque: '1975-2000' });
  await expect(page.locator('#ee-logged')).toContainText('Claire Martin');
  await expect(page.locator('#ee-new')).toBeHidden();
  await expect(page.locator('#ee-tel')).toHaveValue(contact.tel);
  await page.locator('#ee-consent').check({ force: true });
  const { corps } = await afficherResultat(page);
  expect(corps.espace).toMatchObject({ connecte: true, nouveau: false });
  await expect(page.locator('#ee-apres')).toContainText('ajoutée à votre espace');
  expect((await moi(page)).demandes).toHaveLength(2);
});
