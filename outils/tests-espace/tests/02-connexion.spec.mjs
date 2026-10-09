/* Connexion : le parcours qui échouait (compte créé pendant l'estimation → accueil → pictogramme → connexion),
   le pictogramme sur toutes les pages, le lien de connexion (30 min, usage unique), le mot de passe facultatif,
   la déconnexion, le mot de passe oublié. */
import { test, expect } from '@playwright/test';
import { fausseBan, estimationComplete, pictogramme, moi, api, emailTest, viderBoite, courrier, pour, lienDans, connexionParLien, connexionParMdp } from './aides.mjs';

const PAGES = ['/', '/estimer/', '/mon-espace/', '/vendre-bien-immobilier-dijon/', '/vendre-commerce-dijon/', '/conseils-vendeurs/', '/videos-immobilier-dijon/',
  '/simulateur-pret-immobilier-dijon/', '/shawez-ali-agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/contact/', '/honoraires/', '/avis/',
  '/biens-a-vendre-dijon/', '/secteurs-dijon-nuits-saint-georges-beaune/', '/podcast/', '/mentions-legales/', '/politique-de-confidentialite/', '/cookies/', '/merci/', '/404.html'];

test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('LE BUG : créer un compte en estimant → accueil → pictogramme → connecté, sans rien ressaisir', async ({ page }) => {
  const { contact } = await estimationComplete(page);
  // retour à l'accueil par le logo
  await page.locator('header#nav a.brand').click();
  await expect(page).toHaveURL(/127\.0\.0\.1:8788\/$/);
  // le pictogramme « personne » existe, dit « connecté » et mène à /mon-espace/
  const picto = pictogramme(page);
  await expect(picto).toBeVisible();
  await expect(picto).toHaveAttribute('href', '/mon-espace/');
  await expect(picto).toHaveClass(/is-in/);
  await expect(picto).toHaveAttribute('aria-label', 'Mon espace : connecté');
  await picto.click();
  await expect(page).toHaveURL(/\/mon-espace\/$/);
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-titre')).toContainText('Bonjour Claire');
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
  await expect(page.locator('#me-infos')).toContainText(contact.email);
});

test('LE BUG, suite : déconnecté, puis accueil → pictogramme → connexion par lien reçu par e-mail', async ({ page, request }) => {
  const { contact } = await estimationComplete(page);
  await page.goto('/mon-espace/');
  await page.locator('#me-logout').click();
  await expect(page.locator('#me-out')).toBeVisible();
  // accueil : le pictogramme n'affiche plus « connecté »
  await page.goto('/');
  const picto = pictogramme(page);
  await expect(picto).not.toHaveClass(/is-in/);
  await expect(picto).toHaveAttribute('aria-label', 'Mon espace : se connecter');
  await picto.click();
  await expect(page.locator('#me-cnx')).toBeVisible();
  // mêmes identifiants (l'e-mail de l'estimation, tapé avec des majuscules et un espace) → lien reçu → connecté
  await viderBoite(request);
  await page.locator('#me-email').fill('  ' + contact.email.toUpperCase() + ' ');
  await page.locator('#me-cnx-btn').click();                       // « Continuer » : pas de mot de passe → le lien part
  await expect(page.locator('#me-envoye')).toContainText('C\'est envoyé');
  await expect(page.locator('#me-envoye')).toContainText(contact.email);
  await expect(page.locator('#me-mdp')).toBeHidden();
  const [m] = await courrier(request, pour(contact.email, /lien de connexion/i));
  expect(m).toBeTruthy();
  expect(m.text).toContain('30 minutes');
  await page.goto(lienDans(m).replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page).toHaveURL(/\/mon-espace\/$/);                 // le jeton ne reste pas dans l'adresse
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
  await expect(page.locator('#me-infos')).toContainText('(confirmé)');
  await page.goto('/');
  await expect(pictogramme(page)).toHaveClass(/is-in/);
});

test('le pictogramme est sur toutes les pages et mène à /mon-espace/', async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: 'domcontentloaded' });
    const picto = pictogramme(page);
    await expect(picto, `pictogramme sur ${p}`).toHaveCount(1);
    await expect(picto, `pictogramme visible sur ${p}`).toBeVisible();
    await expect(picto).toHaveAttribute('href', '/mon-espace/');
    await expect(picto).not.toHaveClass(/is-in/);
    const boite = await picto.boundingBox();
    expect(boite.width, `zone tactile sur ${p}`).toBeGreaterThanOrEqual(38);
    expect(boite.x + boite.width, `pictogramme dans l'écran sur ${p}`).toBeLessThanOrEqual(page.viewportSize().width);
    // le menu et le pied de page y mènent aussi
    await expect(page.locator('#menu a[href="/mon-espace/"]')).toHaveCount(1);
    await expect(page.locator('footer a[href="/mon-espace/"]')).toHaveCount(1);
  }
});

test('connecté : le pictogramme le dit sur chaque page, et ouvre l\'espace depuis chacune', async ({ page }) => {
  await estimationComplete(page);
  for (const p of PAGES) {
    await page.goto(p, { waitUntil: 'domcontentloaded' });
    await expect(pictogramme(page), `connecté sur ${p}`).toHaveClass(/is-in/);
    await expect(pictogramme(page)).toHaveAttribute('aria-label', 'Mon espace : connecté');
  }
  for (const p of ['/contact/', '/vendre-bien-immobilier-dijon/', '/estimer/', '/404.html']) {
    await page.goto(p, { waitUntil: 'domcontentloaded' });
    await pictogramme(page).click();
    await expect(page.locator('#me-in'), `espace ouvert depuis ${p}`).toBeVisible();
  }
});

test('menu mobile : « Mon espace » y figure et dit « connecté »', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13', 'menu mobile');
  await estimationComplete(page);
  await page.goto('/');
  await page.locator('#burger').click();
  const lien = page.locator('#menu a[href="/mon-espace/"]');
  await expect(lien).toBeVisible();
  await expect(lien).toHaveText('Mon espace · connecté');
  await lien.click();
  await expect(page.locator('#me-in')).toBeVisible();
});

test('lien de connexion : usage unique', async ({ page, request, browser }) => {
  const { contact } = await estimationComplete(page);
  await api(page, '/deconnexion', {});
  const lien = await connexionParLien(page, request, contact.email);
  // le même lien, rouvert ailleurs : refusé, avec un message clair
  const autre = await browser.newContext({ baseURL: 'http://127.0.0.1:8788', locale: 'fr-FR' });
  const p2 = await autre.newPage();
  await p2.goto(lien);
  await expect(p2.locator('#me-out')).toBeVisible();
  await expect(p2.locator('#me-flash')).toContainText('n\'est plus valable');
  await expect(p2.locator('#me-flash')).toContainText('30 minutes');
  await autre.close();
});

test('lien de connexion : un nouveau lien annule le précédent ; un lien inventé est refusé', async ({ page, request }) => {
  const { contact } = await estimationComplete(page);
  await api(page, '/deconnexion', {});
  await viderBoite(request);
  await page.goto('/mon-espace/');
  expect((await api(page, '/lien', { email: contact.email })).envoye).toBe(true);
  const [m1] = await courrier(request, pour(contact.email, /lien de connexion/i));
  await viderBoite(request);
  expect((await api(page, '/lien', { email: contact.email })).envoye).toBe(true);
  const [m2] = await courrier(request, pour(contact.email, /lien de connexion/i));
  const jeton = (m) => lienDans(m).split('lien=')[1];
  expect(jeton(m1)).not.toBe(jeton(m2));
  expect((await api(page, '/lien/ouvrir', { jeton: jeton(m1) }))._status).toBe(400);
  expect((await api(page, '/lien/ouvrir', { jeton: 'x'.repeat(43) })).error).toBe('jeton');
  expect((await api(page, '/lien/ouvrir', { jeton: jeton(m2) }))._status).toBe(200);
  expect((await api(page, '/lien/ouvrir', { jeton: jeton(m2) }))._status).toBe(400);
});

test('lien demandé pour une adresse inconnue : même réponse, aucun e-mail', async ({ page, request }) => {
  await viderBoite(request);
  await page.goto('/mon-espace/');
  const inconnu = emailTest('inconnu');
  await page.locator('#me-email').fill(inconnu);
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-envoye')).toContainText('C\'est envoyé');   // même message qu'avec un espace
  expect(await courrier(request, pour(inconnu), { attente: 1500 })).toHaveLength(0);
});

test('e-mail du client : fourchette, ventes utilisées, la suite, lien vers l\'espace, signature', async ({ page, request }) => {
  await viderBoite(request);
  const { contact, reponse } = await estimationComplete(page);
  const r = reponse.corps.resultat;
  const [m] = await courrier(request, pour(contact.email, /Votre estimation/));
  expect(m, 'e-mail au client').toBeTruthy();
  const euros = (n) => n.toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €';
  expect(m.subject).toBe(`Votre estimation : ${euros(r.bas)} – ${euros(r.haut)}`);
  expect(m.from).toContain('Shawez Ali – Gravelin Immo');
  expect(m.text).toContain(`${r.comparables} ventes réelles`);
  expect(m.text).toContain('indicative, à confirmer par une visite');
  expect(m.text).toContain('avis de valeur détaillé');
  expect(m.text).toContain('Shawez Ali – Gravelin Immo\n07 67 57 92 28');
  expect(m.text).toContain(reponse.corps.reference);
  expect(m.html).toContain('Ouvrir mon espace');
  // le lien de l'e-mail ouvre bien l'espace (dans un navigateur qui n'est pas connecté)
  await api(page, '/deconnexion', {});
  await page.goto(lienDans(m).replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
});

test('e-mail d\'alerte à l\'agence : fiche complète, fourchette, bouton appeler, lien vers la demande', async ({ page, request }) => {
  await viderBoite(request);
  const { contact, reponse } = await estimationComplete(page, { atouts: ['balcon'], prix: '240000', delai: '6mois' });
  const [m] = await courrier(request, pour('shawez@gravelin-immo.com', /^Estimation Dijon/));
  expect(m, 'alerte à Shawez').toBeTruthy();
  expect(m.subject).toContain('Mme Claire Martin');
  expect(m.subject).toContain(contact.tel);
  expect(m.reply_to).toBe(contact.email);
  for (const t of ['30 Rue Bannelier 21000 Dijon', '72 m²', 'Bon état', 'balcon', '240 000 €', 'Dans les 6 mois', contact.email, `${reponse.corps.resultat.comparables} ventes`, 'shawez-immo.com']) expect(m.text, t).toContain(t);
  expect(m.html).toContain('href="tel:0612345678"');
  expect(m.html).toContain('Appeler Claire');
  expect(m.html).toContain(`/admin/?q=${reponse.corps.reference}`);
});

test('mot de passe facultatif, choisi après le résultat ; connexion par le pictogramme avec e-mail + mot de passe', async ({ page }) => {
  const { contact } = await estimationComplete(page);
  // erreur claire si trop court
  await page.locator('#ee-mdp').fill('court');
  await page.locator('#ee-mdp-form [type=submit]').click();
  await expect(page.locator('#ee-mdp-form .field.err .msg')).toContainText('8 caractères');
  await page.locator('#ee-mdp').fill('Bannelier-2026');
  await page.locator('#ee-mdp-form [type=submit]').click();
  await expect(page.locator('#ee-mdp-form .ee-ok')).toContainText('Mot de passe enregistré');
  expect((await moi(page)).compte.mot_de_passe).toBe(true);
  // déconnexion, accueil, pictogramme, mêmes identifiants
  await api(page, '/deconnexion', {});
  await page.goto('/');
  await pictogramme(page).click();
  await connexionParMdp(page, contact.email, 'Bannelier-2026');
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
});

test('mot de passe : majuscules dans l\'e-mail et espace en fin de mot de passe acceptés ; mauvais mot de passe refusé', async ({ page }) => {
  const { contact } = await estimationComplete(page);
  expect((await api(page, '/mot-de-passe/definir', { mot_de_passe: 'Bannelier-2026 ' }))._status).toBe(200);
  await api(page, '/deconnexion', {});
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: 'mauvais-mot' })).error).toBe('identifiants');
  expect((await api(page, '/connexion', { email: ' ' + contact.email.toUpperCase(), mot_de_passe: 'Bannelier-2026' }))._status).toBe(200);
  await api(page, '/deconnexion', {});
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: ' Bannelier-2026  ' }))._status).toBe(200);
});

test('compte sans mot de passe : « Continuer » envoie le lien sans demander de mot de passe ; « Renvoyer » en renvoie un', async ({ page, request }) => {
  const { contact } = await estimationComplete(page);
  await api(page, '/deconnexion', {});
  await viderBoite(request);
  await page.goto('/mon-espace/');
  await page.locator('#me-email').fill(contact.email);
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-envoye')).toBeVisible();
  await expect(page.locator('#me-mdp')).toBeHidden();
  await page.locator('#me-renvoi').click();
  await expect(page.locator('#me-cnx .ee-ok')).toContainText('Nouveau lien envoyé');
  expect(await courrier(request, pour(contact.email, /lien de connexion/i), { nombre: 2 })).toHaveLength(2);
  // l'API dit toujours pourquoi un mot de passe ne marche pas
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: 'nimportequoi' })).error).toBe('sans_mot_de_passe');
});

test('compte avec mot de passe : « Continuer » demande le mot de passe, rien n\'est envoyé ; « Recevoir plutôt un lien » marche', async ({ page, request }) => {
  const { contact } = await estimationComplete(page);
  expect((await api(page, '/mot-de-passe/definir', { mot_de_passe: 'Bannelier-2026' }))._status).toBe(200);
  await api(page, '/deconnexion', {});
  await viderBoite(request);
  await page.goto('/mon-espace/');
  await page.locator('#me-email').fill(contact.email);
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-mdp')).toBeVisible();
  await expect(page.locator('#me-cnx-btn')).toContainText('Me connecter');
  expect(await courrier(request, pour(contact.email), { attente: 1500 })).toHaveLength(0);
  await page.locator('#me-mdp').fill('mauvais-mot');
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-cnx .ee-err')).toContainText('Mot de passe incorrect');
  await page.locator('#me-lien-btn').click();
  await expect(page.locator('#me-envoye')).toBeVisible();
  const [m] = await courrier(request, pour(contact.email, /lien de connexion/i));
  expect(m).toBeTruthy();
});

test('déconnexion : session fermée, pictogramme éteint, espace refermé', async ({ page }) => {
  await estimationComplete(page);
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-in')).toBeVisible();
  await page.locator('#me-logout').click();
  await expect(page.locator('#me-out')).toBeVisible();
  await expect(pictogramme(page)).not.toHaveClass(/is-in/);
  expect((await moi(page)).compte).toBeNull();
  const cookies = await page.context().cookies();
  expect(cookies.filter((c) => c.name === 'se_session' || c.name === 'se_ok')).toHaveLength(0);
});

test('session expirée côté serveur : le témoin « connecté » est retiré', async ({ page }) => {
  await estimationComplete(page);
  // la session disparaît (cookie de session perdu), le témoin reste
  const tous = await page.context().cookies();
  await page.context().clearCookies();
  await page.context().addCookies(tous.filter((c) => c.name === 'se_ok'));
  await page.goto('/');
  await expect(pictogramme(page)).toHaveClass(/is-in/);
  await pictogramme(page).click();
  await expect(page.locator('#me-out')).toBeVisible();
  await expect(pictogramme(page)).not.toHaveClass(/is-in/);
});

test('mot de passe oublié : lien par e-mail, nouveau mot de passe, connecté', async ({ page, request }) => {
  const { contact } = await estimationComplete(page);
  await api(page, '/mot-de-passe/definir', { mot_de_passe: 'Ancien-mot-2026' });
  await api(page, '/deconnexion', {});
  await viderBoite(request);
  await page.goto('/mon-espace/');
  await page.locator('#me-email').fill(contact.email);
  await page.locator('#me-oubli-btn').click();
  await expect(page.locator('#mo-email')).toHaveValue(contact.email);
  await page.locator('#me-oubli [type=submit]').click();
  await expect(page.locator('#me-oubli .ee-ok')).toContainText('un lien vient d\'y être envoyé');
  const [m] = await courrier(request, pour(contact.email, /Nouveau mot de passe/));
  expect(m).toBeTruthy();
  const lien = lienDans(m, /https?:\/\/[^\s"<]+\/mon-espace\/\?reinit=[A-Za-z0-9_-]+/);
  await page.goto(lien.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('#me-reinit')).toBeVisible();
  await page.locator('#mr-mdp').fill('court');
  await page.locator('#me-reinit [type=submit]').click();
  await expect(page.locator('#me-reinit .field.err')).toHaveCount(1);
  await page.locator('#mr-mdp').fill('Nouveau-mot-2026');
  await page.locator('#me-reinit [type=submit]').click();
  await expect(page.locator('#me-in')).toBeVisible();
  // l'ancien ne marche plus, le nouveau oui ; le lien ne sert qu'une fois
  await api(page, '/deconnexion', {});
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: 'Ancien-mot-2026' })).error).toBe('identifiants');
  expect((await api(page, '/mot-de-passe/reinit', { jeton: lien.split('reinit=')[1], mot_de_passe: 'Encore-un-2026' })).error).toBe('jeton');
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: 'Nouveau-mot-2026' }))._status).toBe(200);
});

test('choisir puis changer son mot de passe depuis l\'espace', async ({ page }) => {
  const { contact } = await estimationComplete(page);
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-infos')).toContainText('aucun (connexion par lien)');
  await page.locator('#me-mdp-btn').click();
  await expect(page.locator('#mp-actuel-f')).toBeHidden();
  await page.locator('#mp-mdp').fill('Premier-mot-2026');
  await page.locator('#me-mdp-form [type=submit]').click();
  await expect(page.locator('#me-mdp-ok')).toBeVisible();
  await expect(page.locator('#me-infos')).toContainText('défini');
  // changer : l'actuel est demandé
  await page.locator('#me-mdp-btn').click();
  await expect(page.locator('#mp-actuel-f')).toBeVisible();
  await page.locator('#mp-actuel').fill('pas-le-bon');
  await page.locator('#mp-mdp').fill('Second-mot-2026');
  await page.locator('#me-mdp-form [type=submit]').click();
  await expect(page.locator('#me-mdp-form .ee-err')).toContainText('actuel est incorrect');
  await page.locator('#mp-actuel').fill('Premier-mot-2026');
  await page.locator('#me-mdp-form [type=submit]').click();
  await expect(page.locator('#me-mdp-ok')).toBeVisible();
  await api(page, '/deconnexion', {});
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: 'Second-mot-2026' }))._status).toBe(200);
});

test('deuxième estimation avec le même e-mail sans être connecté : résultat affiché, pas de session ouverte à la place du titulaire', async ({ page, request, browser }) => {
  const { contact } = await estimationComplete(page);
  // un autre navigateur (pas connecté) utilise le même e-mail
  const autre = await browser.newContext({ baseURL: 'http://127.0.0.1:8788', locale: 'fr-FR' });
  const p2 = await autre.newPage();
  await fausseBan(p2);
  await viderBoite(request);
  const { reponse } = await estimationComplete(p2, { type: 'maison', adresse: '10 rue des vergers quetigny', surface: '100', epoque: '1975-2000' }, { email: contact.email, prenom: 'Autre', nom: 'Personne' });
  expect(reponse.statut).toBe(201);
  expect(reponse.corps.resultat.fourchette).toBe(true);                         // le résultat s'affiche quand même
  expect(reponse.corps.compte).toBeNull();
  expect(reponse.corps.espace).toMatchObject({ connecte: false, existant: true, en_attente: true, lien: 'envoye' });
  await expect(p2.locator('#ee-apres')).toContainText('Vous avez déjà un espace');
  expect((await moi(p2)).compte).toBeNull();                                    // aucune session ouverte
  // le titulaire ne voit pas cette demande tant que l'adresse n'est pas prouvée…
  let m = await moi(page);
  expect(m.demandes).toHaveLength(1);
  expect(m.en_attente).toBe(1);
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-attente')).toContainText('1 estimation attend la confirmation de votre e-mail');
  // …puis le lien reçu par e-mail prouve l'adresse : celui qui lit la boîte e-mail a les deux estimations,
  // et la session ouverte avant la preuve sur l'autre appareil est fermée (elle se rouvre par lien)
  const [mail] = await courrier(request, pour(contact.email, /Votre estimation/));
  await p2.goto(lienDans(mail).replace(/^https?:\/\/[^/]+/, ''));
  await expect(p2.locator('#me-cards .ee-card')).toHaveCount(2);
  expect((await moi(p2)).en_attente).toBe(0);
  expect((await moi(page)).compte).toBeNull();
  await connexionParLien(page, request, contact.email);
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(2);
  await autre.close();
});

test('mot de passe choisi puis lien ouvert dans le même navigateur : le mot de passe est gardé', async ({ page, request }) => {
  await viderBoite(request);
  const { contact } = await estimationComplete(page);
  expect((await api(page, '/mot-de-passe/definir', { mot_de_passe: 'Bannelier-2026' }))._status).toBe(200);
  const [mail] = await courrier(request, pour(contact.email, /Votre estimation/));
  await page.goto(lienDans(mail).replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-infos')).toContainText('défini');
  await api(page, '/deconnexion', {});
  expect((await api(page, '/connexion', { email: contact.email, mot_de_passe: 'Bannelier-2026' }))._status).toBe(200);
});

test('compte ouvert par un autre avec votre e-mail : le lien reçu par e-mail vous rend la main (mot de passe et sessions d\'avant retirés)', async ({ page, request, browser }) => {
  // quelqu'un fait une estimation avec l'e-mail d'une autre personne et pose un mot de passe
  const victime = emailTest('victime');
  await estimationComplete(page, {}, { email: victime });
  expect((await api(page, '/mot-de-passe/definir', { mot_de_passe: 'Pose-par-un-autre' }))._status).toBe(200);
  // la vraie titulaire demande un lien depuis son navigateur et l'ouvre
  const elle = await browser.newContext({ baseURL: 'http://127.0.0.1:8788', locale: 'fr-FR' });
  const p2 = await elle.newPage();
  await connexionParLien(p2, request, victime);
  await expect(p2.locator('#me-mdp-ok')).toContainText('a été retiré');
  expect((await moi(p2)).compte).toMatchObject({ verifie: true, mot_de_passe: false });
  // l'autre n'a plus rien : ni session, ni mot de passe
  expect((await moi(page)).compte).toBeNull();
  expect((await api(page, '/connexion', { email: victime, mot_de_passe: 'Pose-par-un-autre' }))._status).toBe(401);
  await elle.close();
});

test('supprimer son espace sans mot de passe : confirmation écrite', async ({ page }) => {
  const { contact } = await estimationComplete(page);
  await page.goto('/mon-espace/');
  await page.locator('#me-del-btn').click();
  await expect(page.locator('#md-conf-f')).toBeVisible();
  await page.locator('#md-conf').fill('oui');
  await page.locator('#me-del [type=submit]').click();
  await expect(page.locator('#md-conf-f')).toHaveClass(/err/);
  await page.locator('#md-conf').fill('SUPPRIMER');
  await page.locator('#me-del [type=submit]').click();
  await expect(page).toHaveURL(/127\.0\.0\.1:8788\/$/);
  await expect(pictogramme(page)).not.toHaveClass(/is-in/);
  await page.goto('/mon-espace/');
  expect((await api(page, '/lien', { email: contact.email })).envoye).toBe(true);   // même réponse qu'un compte existant
  expect((await moi(page)).compte).toBeNull();
});
