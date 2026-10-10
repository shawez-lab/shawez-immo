/* Aides communes aux tests : fausses réponses de la Base Adresse Nationale, parcours, boîte d'envoi locale. */
import { expect } from '@playwright/test';

export const SITE = 'http://127.0.0.1:8788';        // e-mails aux clients ouverts (fausse boîte d'envoi)
export const SITE_SANS_EMAIL = 'http://127.0.0.1:8789'; // comme en production aujourd'hui
export const BOITE = 'http://127.0.0.1:8790/boite';
export const ADMIN = 'shawez@gravelin-immo.com';

/* Adresses de test : coordonnées approchées, réponses au format de api-adresse.data.gouv.fr */
const A = (label, name, postcode, city, citycode, lat, lon, type = 'housenumber') => ({
  type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: { label, name, postcode, city, citycode, context: "21, Côte-d'Or, Bourgogne-Franche-Comté", type, score: 0.9 },
});
export const ADRESSES = [
  A('30 Rue Bannelier 21000 Dijon', '30 Rue Bannelier', '21000', 'Dijon', '21231', 47.32396, 5.03633),
  A('12 bis Rue de la Préfecture 21000 Dijon', '12 bis Rue de la Préfecture', '21000', 'Dijon', '21231', 47.3257, 5.0415),
  A('5 ter Rue du Général de Gaulle 21121 Fontaine-lès-Dijon', '5 ter Rue du Général de Gaulle', '21121', 'Fontaine-lès-Dijon', '21278', 47.3430, 5.0200),
  A('15 Rue Maxime Guillot 21300 Chenôve', '15 Rue Maxime Guillot', '21300', 'Chenôve', '21166', 47.2900, 5.0080),
  A('10 Rue des Vergers 21800 Quetigny', '10 Rue des Vergers', '21800', 'Quetigny', '21515', 47.3140, 5.1050),
  A('8 Rue du Marché 21210 Saulieu', '8 Rue du Marché', '21210', 'Saulieu', '21584', 47.27676, 4.22804),
  A('10 Rue de la République 69001 Lyon', '10 Rue de la République', '69001', 'Lyon', '69381', 45.7640, 4.8357),
  A('Dijon', 'Dijon', '21000', 'Dijon', '21231', 47.3220, 5.0415, 'municipality'),
  // les dix adresses du contrôle de la fourchette (coordonnées approchées, pour répéter le test hors ligne)
  A('12 Rue Musette 21000 Dijon', '12 Rue Musette', '21000', 'Dijon', '21231', 47.3232, 5.0398),
  A('25 Rue Berbisey 21000 Dijon', '25 Rue Berbisey', '21000', 'Dijon', '21231', 47.3180, 5.0385),
  A('40 Rue de Montchapet 21000 Dijon', '40 Rue de Montchapet', '21000', 'Dijon', '21231', 47.3335, 5.0270),
  A('30 Rue de Jouvence 21000 Dijon', '30 Rue de Jouvence', '21000', 'Dijon', '21231', 47.3345, 5.0300),
  A('50 Avenue du Drapeau 21000 Dijon', '50 Avenue du Drapeau', '21000', 'Dijon', '21231', 47.3390, 5.0480),
  A('10 Rue de Bellevue 21240 Talant', '10 Rue de Bellevue', '21240', 'Talant', '21617', 47.3370, 5.0080),
  A('20 Rue du Général de Gaulle 21121 Fontaine-lès-Dijon', '20 Rue du Général de Gaulle', '21121', 'Fontaine-lès-Dijon', '21278', 47.3430, 5.0200),
  A('12 Rue Armand Thibaut 21600 Longvic', '12 Rue Armand Thibaut', '21600', 'Longvic', '21355', 47.2880, 5.0630),
];
const net = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* Remplace la Base Adresse Nationale par les adresses de test. mode : 'ok', 'panne' (aucune réponse), 'lent'. */
export async function fausseBan(page, mode = 'ok') {
  await page.route(/tracker\.metricool\.com/, (r) => r.abort());
  if (APERCU && !process.env.EE_BAN_FACTICE) return;    // sur l'aperçu : la vraie Base Adresse Nationale
  await page.route(/api-adresse\.data\.gouv\.fr|data\.geopf\.fr/, async (route) => {
    if (mode === 'panne') return route.abort();
    const q = net(new URL(route.request().url()).searchParams.get('q') || '');
    const mots = q.split(' ').filter(Boolean);
    const features = ADRESSES.filter((f) => { const l = net(f.properties.label); return mots.every((m) => l.includes(m)); })
      .sort((x, y) => (y.properties.type === 'municipality') - (x.properties.type === 'municipality')).slice(0, 6);
    if (mode === 'lent') await new Promise((r) => setTimeout(r, 1200));
    return route.fulfill({ json: { type: 'FeatureCollection', features } });
  });
}

/* Sur l'aperçu (vraie base), les essais utilisent des adresses en @test.invalid : le site ne leur écrit jamais,
   n'alerte pas l'agence et ne les met pas dans le Google Sheet. */
export const APERCU = !!process.env.EE_APERCU;
let n = 0;
export const emailTest = (prefixe = 'client') => `${prefixe}.${Date.now().toString(36)}${(n++).toString(36)}@${APERCU ? 'test.invalid' : 'exemple-test.fr'}`;

export const etape = (page, nom) => page.locator(`.ee-step[data-s="${nom}"]`);
/* Un humain met plus d'un quart de seconde à lire une étape : après un changement d'étape, le site avale les clics
   pendant 300 ms (second clic d'un double clic). Les tests attendent donc un instant avant d'agir. */
export const PAUSE = 350;
export async function attendreEtape(page, nom) { await expect(etape(page, nom)).toBeVisible(); await page.waitForTimeout(PAUSE); }
export async function suivant(page, nom) { await page.waitForTimeout(PAUSE); await etape(page, nom).locator('[data-next]').click(); }
export async function retour(page, nom) { await page.waitForTimeout(PAUSE); await etape(page, nom).locator('[data-prev]').click(); }

export async function choisirAdresse(page, saisie, libelle) {
  await page.locator('#ee-adresse').fill(saisie);
  const option = libelle ? page.locator('#ee-sugg li', { hasText: libelle }).first() : page.locator('#ee-sugg li').first();
  await option.click();
  await expect(page.locator('#ee-picked')).toBeVisible();
}

/* Va de l'adresse jusqu'à l'écran des coordonnées. */
export async function parcours(page, o = {}) {
  const b = { type: 'appartement', adresse: '30 rue bannelier dijon', surface: '72', epoque: '1948-1974', etat: 'bon', delai: 'asap', ...o };
  if (!o.surPlace) { await page.goto('/estimer/'); }
  await attendreEtape(page, 'adresse');
  await choisirAdresse(page, b.adresse, b.libelle);
  await suivant(page, 'adresse');
  await attendreEtape(page, 'type');
  if (b.type === 'autre') {
    await page.locator('#ee-autre-btn').click();
    await page.locator(`[data-autre="${b.autre || 'commerce'}"]`).click();
    await suivant(page, 'type');
    await attendreEtape(page, 'bien');
    if (b.surface) await page.locator('#ee-surface').fill(b.surface);
    await page.locator('#ee-message').fill(b.message || 'Boulangerie, bail 3-6-9, loyer 1 200 € par mois.');
    await suivant(page, 'bien');
  } else {
    await page.locator(`.ee-tile[data-type="${b.type}"]`).click();
    await attendreEtape(page, 'bien');
    await page.locator('#ee-surface').fill(b.surface);
    if (b.type === 'maison') await page.locator('#ee-terrain').fill(b.terrain || '450');
    await page.locator(`[data-choix="epoque"] [data-v="${b.epoque}"]`).click();
    await page.locator(`[data-choix="etat"] [data-v="${b.etat}"]`).click();
    await suivant(page, 'bien');
    await attendreEtape(page, 'atouts');
    for (const a of b.atouts || []) await page.locator(`.ee-check:has(input[name="${a}"])`).click();
    await suivant(page, 'atouts');
    await attendreEtape(page, 'prix');
    if (b.prix) await page.locator('#ee-prix').fill(b.prix);
    await suivant(page, 'prix');
  }
  await attendreEtape(page, 'projet');
  await page.locator(`[data-choix="delai"] [data-v="${b.delai}"]`).click();
  await attendreEtape(page, 'contact');
}

export async function coordonnees(page, c = {}) {
  const d = { civ: 'Mme', prenom: 'Claire', nom: 'Martin', email: emailTest(), tel: '06 12 34 56 78', ...c };
  if (d.civ) await page.locator(`#ee-new [data-civ="${d.civ}"]`).click();
  await page.locator('#ee-prenom').fill(d.prenom);
  await page.locator('#ee-nom').fill(d.nom);
  await page.locator('#ee-email').fill(d.email);
  await page.locator('#ee-tel').fill(d.tel);
  await page.locator('#ee-consent').check({ force: true });
  return d;
}

/* Le serveur écarte les envois faits en moins de 4 s (robots) : on attend ce qu'il faut. */
export async function assezLent(page) {
  const reste = await page.evaluate(() => { try { const m = JSON.parse(sessionStorage.getItem('ee-parcours-v2')); return 4300 - (Date.now() - m.t0); } catch (e) { return 4300; } });
  if (reste > 0) await page.waitForTimeout(reste);
}

/* Envoie les coordonnées et attend l'écran de résultat. Rend la réponse de l'API. */
export async function afficherResultat(page) {
  await assezLent(page);
  const [rep] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/espace/estimation') && r.request().method() === 'POST'),
    page.locator('#ee-submit').click(),
  ]);
  await expect(page.locator('#ee-result')).toBeVisible();
  return { statut: rep.status(), corps: await rep.json() };
}

/* Parcours complet : rend { contact, reponse }. */
export async function estimationComplete(page, o = {}, c = {}) {
  await parcours(page, o);
  const contact = await coordonnees(page, c);
  const reponse = await afficherResultat(page);
  return { contact, reponse };
}

/* ---------- boîte d'envoi locale ---------- */
export async function viderBoite(request) { await request.delete(BOITE); }
export async function courrier(request, filtre, { attente = 8000, nombre = 1 } = {}) {
  const fin = Date.now() + attente;
  for (;;) {
    const tous = await (await request.get(BOITE)).json();
    const ok = tous.filter(filtre);
    if (ok.length >= nombre || Date.now() > fin) return ok;
    await new Promise((r) => setTimeout(r, 250));
  }
}
export const pour = (adresse, sujet) => (m) => m.to.includes(adresse) && (!sujet || sujet.test(m.subject));
export const lienDans = (m, motif = /https?:\/\/[^\s"<]+\/mon-espace\/\?lien=[A-Za-z0-9_-]+/) => { const r = (m.text || '').match(motif); return r ? r[0] : null; };

/* Connexion par lien reçu par e-mail (serveur avec e-mails). */
export async function connexionParLien(page, request, email) {
  await viderBoite(request);
  await page.goto('/mon-espace/');
  await page.locator('#me-email').fill(email);
  await page.locator('#me-cnx-btn').click();                       // « Continuer » : sans mot de passe, le lien part
  // avec un mot de passe, il est demandé : on choisit « Recevoir plutôt un lien par e-mail »
  await expect(page.locator('#me-envoye, #me-mdp-f:not([hidden])').first()).toBeVisible();
  if (await page.locator('#me-mdp').isVisible()) await page.locator('#me-lien-btn').click();
  await expect(page.locator('#me-envoye')).toBeVisible();
  const [m] = await courrier(request, pour(email, /lien de connexion/i));
  expect(m, 'e-mail du lien de connexion').toBeTruthy();
  const lien = lienDans(m);
  await page.goto(lien.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('#me-in')).toBeVisible();
  return lien;
}

/* Connexion par mot de passe, en deux temps : l'e-mail, « Continuer », puis le mot de passe. */
export async function connexionParMdp(page, email, mdp) {
  await page.locator('#me-email').fill(email);
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-mdp')).toBeVisible();
  await page.locator('#me-mdp').fill(mdp);
  await page.locator('#me-cnx-btn').click();
}

/* Appels à l'API depuis la page elle-même (avec ses cookies, comme le fait le site). */
export const api = (page, chemin, corps) => page.evaluate(async ([c, b]) => {
  const r = await fetch('/api/espace' + c, b === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  let d = {}; try { d = await r.json(); } catch (e) { /* pas de JSON */ }
  d._status = r.status; return d;
}, [chemin, corps]);
export const moi = (page) => api(page, '/moi');

export const pictogramme = (page) => page.locator('header#nav a.nav-compte');

/* Ouvre une session admin : l'agence demande son lien de connexion (son compte est créé à la première demande). */
export async function sessionAdmin(page, request) {
  await page.goto('/mon-espace/');
  await api(page, '/deconnexion', {});
  await connexionParLien(page, request, ADMIN);
  expect((await moi(page)).compte.admin).toBe(true);
}

/* Créneaux de visite : le premier jour (à partir de « depuis ») qui a encore au moins « min » heures libres.
   Les visites fixées et les rendez-vous en 2 clics retirent leurs créneaux (marge de trajet comprise) : au fil de la
   série, les premiers jours se remplissent dans la base locale. Le jour trouvé reste sélectionné. */
export async function jourLibre(rdv, min = 6, depuis = 1) {
  const pills = rdv.locator('.ee-days .pill');
  await expect(pills.first()).toBeVisible();
  const n = await pills.count();
  for (let k = depuis; k < n; k++) {
    await pills.nth(k).click();
    await expect(pills.nth(k)).toHaveAttribute('aria-pressed', 'true');
    if ((await rdv.locator('.ee-hour').count()) >= min) return k;
  }
  throw new Error(`aucun jour avec ${min} créneaux libres`);
}
