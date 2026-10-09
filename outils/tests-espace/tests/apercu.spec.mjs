/* Sur l'aperçu en ligne : le parcours qui échouait, le pictogramme partout, le mot de passe en option,
   et la fourchette sur 10 adresses réelles (tableau écrit dans le journal). Chaque essai supprime son compte. */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fausseBan, parcours, coordonnees, afficherResultat, estimationComplete, pictogramme, moi, api, emailTest } from './aides.mjs';

const BASE = process.env.EE_BASE || 'https://espace-estimation.shawez-immo.pages.dev';
const hote = new RegExp(BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/$');
const supprimer = async (page) => { const r = await api(page, '/compte/supprimer', { confirmation: 'SUPPRIMER' }); expect(r._status, 'suppression du compte d\'essai').toBe(200); };

test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('santé de l\'aperçu : base, données DVF, version', async ({ request }) => {
  const s = await (await request.get('/api/espace/sante')).json();
  console.log('santé :', JSON.stringify(s));
  expect(s.base).toBe(true);
  expect(s.dvf.ventes).toBeGreaterThan(10000);
});

test('LE BUG : estimation → accueil → pictogramme → connecté ; puis mot de passe, déconnexion, reconnexion par le pictogramme', async ({ page }) => {
  const { contact, reponse } = await estimationComplete(page, { adresse: '30 rue Bannelier Dijon' }, { prenom: 'Essai', nom: 'Automatique' });
  expect(reponse.statut).toBe(201);
  expect(reponse.corps.resultat.fourchette).toBe(true);
  await expect(page.locator('[data-test="fourchette"]')).toBeVisible();
  await expect(page.locator('[data-test="ventes"]')).toContainText('ventes réelles');
  await expect(page.locator('#ee-res-box')).toContainText('Indicatif, à confirmer par une visite');
  await page.screenshot({ path: `captures/apercu-${test.info().project.name}-resultat.png`, fullPage: true });
  // accueil par le logo, pictogramme « connecté », espace
  await page.locator('header#nav a.brand').click();
  await expect(page).toHaveURL(hote);
  await expect(pictogramme(page)).toHaveClass(/is-in/);
  await page.screenshot({ path: `captures/apercu-${test.info().project.name}-accueil-connecte.png` });
  await pictogramme(page).click();
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
  // mot de passe facultatif, déconnexion, retour par l'accueil et le pictogramme avec les mêmes identifiants
  await page.locator('#me-mdp-btn').click();
  await page.locator('#mp-mdp').fill('Essai-automatique-2026');
  await page.locator('#me-mdp-form [type=submit]').click();
  await expect(page.locator('#me-mdp-ok')).toBeVisible();
  await page.locator('#me-logout').click();
  await expect(page.locator('#me-out')).toBeVisible();
  await page.goto('/');
  await expect(pictogramme(page)).not.toHaveClass(/is-in/);
  await pictogramme(page).click();
  await page.locator('#me-email').fill(contact.email.toUpperCase());
  await page.locator('#me-cnx-btn').click();                       // « Continuer » → mot de passe demandé
  await page.locator('#me-mdp').fill('Essai-automatique-2026 ');
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
  // ménage : avec un mot de passe, la suppression le demande
  const r = await api(page, '/compte/supprimer', { mot_de_passe: 'Essai-automatique-2026' });
  expect(r._status).toBe(200);
});

test('le pictogramme est sur toutes les pages', async ({ page }) => {
  for (const p of ['/', '/estimer/', '/mon-espace/', '/vendre-bien-immobilier-dijon/', '/conseils-vendeurs/', '/contact/', '/honoraires/', '/avis/', '/biens-a-vendre-dijon/', '/simulateur-pret-immobilier-dijon/', '/mentions-legales/']) {
    await page.goto(p, { waitUntil: 'domcontentloaded' });
    await expect(pictogramme(page), `pictogramme sur ${p}`).toBeVisible();
    await expect(pictogramme(page)).toHaveAttribute('href', '/mon-espace/');
  }
});

test('commerce : pas de fourchette, rappel sous 24 h', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13', 'une seule fois');
  await parcours(page, { type: 'autre', autre: 'commerce', surface: '', adresse: '30 rue Bannelier Dijon' });
  await coordonnees(page, { prenom: 'Essai', nom: 'Commerce' });
  const { corps } = await afficherResultat(page);
  expect(corps.resultat.fourchette).toBe(false);
  await expect(page.locator('[data-test="rappel"]')).toContainText('sous 24 h');
  await supprimer(page);
});

test('adresse avec « bis » et accents', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13', 'une seule fois');
  await page.goto('/estimer/');
  await page.locator('#ee-adresse').fill('2 bis rue de la Préfecture Dijon');
  await expect(page.locator('#ee-sugg li').first()).toBeVisible();
  const propositions = await page.locator('#ee-sugg li').allTextContents();
  console.log('propositions pour « 2 bis rue de la Préfecture Dijon » :', propositions.slice(0, 3).join(' | '));
  await page.locator('#ee-sugg li').first().click();
  await expect(page.locator('#ee-picked')).toContainText(/Préfecture/);
});

/* L'alerte « nouvelle estimation » part-elle pour de vrai ? Une seule demande d'essai, dont l'e-mail de contact est une
   variante de l'adresse de Shawez (shawez+essai…@) : la seule boîte qui peut recevoir quoi que ce soit est la sienne.
   Le compte d'essai est supprimé aussitôt (la demande disparaît de l'admin et du Google Sheet). */
test('alerte à l\'agence : une demande d\'essai, puis le bilan d\'envoi', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'iphone13' || !process.env.EE_ESSAI_ALERTE, 'une seule fois, et seulement sur demande (EE_ESSAI_ALERTE=1)');
  const avant = await (await request.get('/api/espace/sante')).json();
  test.skip(avant.email_clients === true, 'l\'envoi aux clients est ouvert : pas d\'essai avec une adresse inventée');
  const email = `shawez+essai-alerte-${Date.now().toString(36)}@gravelin-immo.com`;
  const { reponse } = await estimationComplete(page, { adresse: '30 rue Bannelier Dijon' }, { civ: 'M.', prenom: 'Essai', nom: 'AUTOMATIQUE (à ignorer)', email, tel: '07 67 57 92 28' });
  expect(reponse.statut).toBe(201);
  console.log('demande d\'essai :', reponse.corps.reference);
  let apres = avant;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    apres = await (await request.get('/api/espace/sante')).json();
    if (apres.derniere_alerte && (!avant.derniere_alerte || apres.derniere_alerte.quand !== avant.derniere_alerte.quand)) break;
  }
  console.log('BILAN ALERTE :', JSON.stringify(apres.derniere_alerte || null), '· service e-mail relié :', apres.email);
  await supprimer(page);
});

/* ---------- La fourchette sur 10 adresses réelles ---------- */
const ADRESSES = [
  ['Dijon centre', '12 rue Musette Dijon', { type: 'appartement', surface: '55', epoque: 'avant1948', etat: 'bon' }],
  ['Dijon centre', '25 rue Berbisey Dijon', { type: 'appartement', surface: '95', epoque: 'avant1948', etat: 'rafraichir' }],
  ['Montchapet', '40 rue de Montchapet Dijon', { type: 'appartement', surface: '70', epoque: '1948-1974', etat: 'bon', atouts: ['ascenseur', 'balcon'] }],
  ['Montchapet', '30 rue de Jouvence Dijon', { type: 'maison', surface: '120', terrain: '350', epoque: 'avant1948', etat: 'bon', atouts: ['garage'] }],
  ['Drapeau-Maladière', '50 avenue du Drapeau Dijon', { type: 'appartement', surface: '65', epoque: '1948-1974', etat: 'rafraichir', atouts: ['ascenseur'] }],
  ['Talant', '10 rue de Bellevue Talant', { type: 'maison', surface: '110', terrain: '500', epoque: '1975-2000', etat: 'bon', atouts: ['garage'] }],
  ['Fontaine-lès-Dijon', '20 rue du Général de Gaulle Fontaine-lès-Dijon', { type: 'maison', surface: '130', terrain: '600', epoque: '1975-2000', etat: 'bon', atouts: ['garage'] }],
  ['Chenôve', '15 rue Maxime Guillot Chenôve', { type: 'appartement', surface: '68', epoque: '1948-1974', etat: 'bon', atouts: ['ascenseur'] }],
  ['Quetigny', '10 rue des Vergers Quetigny', { type: 'maison', surface: '100', terrain: '400', epoque: '1975-2000', etat: 'bon', atouts: ['garage'] }],
  ['Longvic', '12 rue Armand Thibaut Longvic', { type: 'appartement', surface: '62', epoque: '1975-2000', etat: 'bon' }],
];
const euros = (n) => (n == null ? '' : n.toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €');

test('la fourchette sur 10 adresses réelles', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13', 'une seule fois');
  test.setTimeout(600000);
  const lignes = [];
  for (const [secteur, saisie, bien] of ADRESSES) {
    await page.goto('/estimer/');
    await page.evaluate(() => sessionStorage.clear());
    await page.goto('/estimer/');
    await parcours(page, { ...bien, adresse: saisie, surPlace: true });
    const adresse = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ee-parcours-v2')).R.adresse);
    const deja = (await moi(page)).compte;
    if (!deja) await coordonnees(page, { prenom: 'Essai', nom: 'Dix adresses' });
    else await page.locator('#ee-consent').check({ force: true });
    const { statut, corps } = await afficherResultat(page);
    expect([200, 201]).toContain(statut);
    const r = corps.resultat;
    const ecran = r.fourchette ? await page.locator('[data-test="fourchette"]').innerText() : await page.locator('[data-test="rappel"]').innerText();
    lignes.push({ secteur, adresse, type: bien.type, surface: +bien.surface, fourchette: r.fourchette ? `${euros(r.bas)} – ${euros(r.haut)}` : `pas de fourchette (${r.raison})`, bas: r.bas ?? null, haut: r.haut ?? null,
      m2: r.prix_m2 ?? null, mediane: r.m2_quartier ?? null, ventes: r.comparables ?? null, rayon: r.rayon ?? null, ajustements: (r.ajustements || []).map((a) => `${a.libelle} ${a.pct > 0 ? '+' : ''}${a.pct} %`).join(', '), donnees_du: r.donnees_du, ecran: ecran.replace(/\s+/g, ' ') });
    if (r.fourchette) {
      // ce que l'écran montre est ce que le calcul a rendu, avec les mentions demandées
      await expect(page.locator('[data-test="fourchette"]')).toContainText(euros(r.bas));
      await expect(page.locator('[data-test="ventes"]')).toContainText(String(r.comparables));
      await expect(page.locator('[data-test="rayon"]')).toBeVisible();
      await expect(page.locator('[data-test="donnees"]')).toContainText('DVF');
      expect(r.comparables).toBeGreaterThanOrEqual(5);
    }
  }
  console.log('\n=== TABLEAU DES 10 ADRESSES ===');
  for (const l of lignes) console.log([l.secteur, l.adresse, l.type, l.surface + ' m²', l.fourchette, (l.m2 ?? '—') + ' €/m² ajusté', 'médiane ' + (l.mediane ?? '—') + ' €/m²', (l.ventes ?? '—') + ' ventes', 'rayon ' + (l.rayon ?? '—') + ' m', l.ajustements || 'aucun ajustement'].join(' | '));
  console.log('=== FIN DU TABLEAU ===\n');
  mkdirSync('captures', { recursive: true });
  writeFileSync('captures/dix-adresses.json', JSON.stringify(lignes, null, 1));
  await supprimer(page);
});

/* ---------- Corrections du test Estimation du 8/10 ---------- */
async function formulaireRappel(page, { prenom, nom, email, tel = '' }) {
  await page.goto('/estimation-immobiliere-dijon/', { waitUntil: 'domcontentloaded' });
  const f = page.locator('#est-form');
  await f.scrollIntoViewIfNeeded();
  await f.locator('#f-type .pill[data-v="Appartement"]').click();
  await f.locator('#f-commune').fill('Dijon');
  await f.locator('#f-surface').fill('65');
  await f.locator('#f-pieces').selectOption('3 pièces');
  await f.locator('.step[data-step="1"] [data-next]').click();
  await f.locator('#f-delai .pill[data-v="Je me renseigne"]').click();
  await f.locator('#f-agence .pill[data-v="Non"]').click();
  await f.locator('#f-msg').fill('Essai automatique : à ignorer.');
  await f.locator('.step[data-step="2"] [data-next]').click();
  await f.locator('#f-prenom').fill(prenom);
  await f.locator('#f-nom').fill(nom);
  await f.locator('#f-email').fill(email);
  if (tel) await f.locator('#f-tel').fill(tel);
  await f.locator('#f-consent').check();
  const [rep] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/lead') && r.request().method() === 'POST', { timeout: 20000 }),
    f.locator('.step[data-step="3"] [type=submit]').click(),
  ]);
  return { statut: rep.status(), corps: await rep.json() };
}

test('corrections 8/10 : /api/lead prêt, /estimation-en-ligne/ → /estimer/', async ({ request }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'une fois suffit');
  const s = await (await request.get('/api/lead')).json();
  expect(s.ready).toBe(true);
  for (const p of ['/estimation-en-ligne/', '/estimation-en-ligne']) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect(r.status(), p).toBe(301);
    expect(r.headers()['location'], p).toMatch(/\/estimer\/$/);
  }
});

test('corrections 8/10 : le formulaire « être rappelé » enregistre la demande (référence affichée)', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13', 'une fois suffit');
  const { statut, corps } = await formulaireRappel(page, { prenom: 'Essai', nom: 'Formulaire rappel', email: emailTest('rappel') });
  expect(statut).toBe(201);
  expect(corps.reference).toMatch(/^E-\d{8}-[A-Z0-9]{6}$/);
  await expect(page.locator('#est-state')).toContainText('Demande reçue');
  await expect(page.locator('#est-state')).toContainText(corps.reference);
  console.log('demande « être rappelé » (essai, sans alerte) :', corps.reference);
});

test('corrections 8/10 : « Prendre rendez-vous » = WhatsApp sur ordinateur, appel sur téléphone', async ({ page }, info) => {
  const { reponse } = await estimationComplete(page, { adresse: '30 rue Bannelier Dijon' }, { prenom: 'Essai', nom: 'Rendez-vous' });
  expect(reponse.statut).toBe(201);
  const href = await page.locator('[data-test="rdv"]').getAttribute('href');
  if (info.project.name === 'ordinateur') {
    expect(href).toMatch(/^https:\/\/wa\.me\/33767579228\?text=/);
    expect(decodeURIComponent(href)).toContain('je voudrais un rendez-vous');
    expect(decodeURIComponent(href)).toContain(reponse.corps.reference);
  } else {
    expect(href).toBe('tel:+33767579228');
  }
  await supprimer(page);
});

test('corrections 8/10 : le numéro de l\'en-tête tient sur une ligne', async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'largeurs testées une par une');
  for (const w of [481, 520, 600, 768, 1024]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const p of ['/', '/estimer/', '/estimation-immobiliere-dijon/']) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      const lignes = await page.locator('.nav-tel').evaluate((a) => { const r = document.createRange(); r.selectNodeContents(a); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; });
      expect(lignes, `${p} à ${w} px`).toBe(1);
    }
  }
});

/* Alerte du formulaire « être rappelé » : seulement sur demande (EE_ESSAI_ALERTE=1), adresse de contact = variante de celle de Shawez. */
test('alerte à l\'agence : formulaire « être rappelé » (TEST Parcours 3)', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone13' || !process.env.EE_ESSAI_ALERTE, 'une seule fois, et seulement sur demande (EE_ESSAI_ALERTE=1)');
  const { statut, corps } = await formulaireRappel(page, { prenom: 'TEST', nom: 'Parcours 3', email: `shawez+essai-rappel-${Date.now().toString(36)}@gravelin-immo.com`, tel: '07 67 57 92 28' });
  expect(statut).toBe(201);
  console.log('demande « être rappelé » TEST Parcours 3 :', corps.reference);
});
