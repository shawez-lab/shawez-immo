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
  await page.locator('#me-mdp').fill('Essai-automatique-2026 ');
  await page.locator('#me-cnx-btn').click();
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-cards .ee-card')).toHaveCount(1);
  // ménage : avec un mot de passe, la suppression le demande
  const r = await api(page, '/compte/supprimer', { mot_de_passe: 'Essai-automatique-2026' });
  expect(r._status).toBe(200);
});

/* Étape 2 du système parfait, côté vendeur, sur la vraie base : créneaux de visite proposés après le résultat, frise des
   10 étapes dans l'espace. L'adresse d'essai (@test.invalid) ne déclenche aucune alerte ; le compte est supprimé à la fin
   (son journal et sa demande de visite partent avec lui). L'admin et le PDF sont vérifiés par la série locale. */
test('étape 2 : créneaux de visite après le résultat, frise des 10 étapes dans l\'espace', async ({ page, request }) => {
  const cr = await (await request.get('/api/espace/creneaux')).json();
  expect(cr.duree).toBe(45);
  expect(cr.jours.length).toBe(6);
  expect(await (await request.get('/api/espace/taches')).json()).toMatchObject({ ok: true });
  const { reponse } = await estimationComplete(page, { adresse: '30 rue Bannelier Dijon' }, { prenom: 'Essai', nom: 'Automatique' });
  expect(reponse.corps.demande_id).toBeGreaterThan(0);
  const rdv = page.locator('#ee-rdv');
  await expect(rdv).toBeVisible();
  await rdv.locator('[data-rdv-ouvrir]').click();
  await expect(rdv.locator('.ee-days .pill')).toHaveCount(6);
  await rdv.locator('.ee-days .pill').nth(1).click();
  await rdv.locator('.ee-hour').nth(1).click();
  await rdv.locator('.ee-hour').nth(4).click();
  await page.screenshot({ path: `captures/apercu-${test.info().project.name}-visite-choix.png`, fullPage: true });
  await rdv.locator('[data-rdv-envoyer]').click();
  await expect(rdv.locator('[data-test="visite-demandee"]')).toBeVisible();
  await page.goto('/mon-espace/');
  const carte = page.locator('#me-cards .ee-card').first();
  await expect(carte.locator('.ee-etape span')).toHaveText('Étape 1 sur 10');
  await expect(carte.locator('.ee-bar i')).toHaveCount(10);
  await expect(carte.locator('[data-test="visite-demandee"]')).toBeVisible();
  await expect(carte.locator('[data-test="suite"]')).toContainText('confirme votre créneau');
  await page.screenshot({ path: `captures/apercu-${test.info().project.name}-espace-frise.png`, fullPage: true });
  const d = (await moi(page)).demandes[0];
  expect(d.visite).toMatchObject({ etat: 'demandee', duree: 45 });
  expect(d.visite.creneaux.length).toBe(2);
  expect(d.parcours.map((e) => e.libelle)).toEqual(['Estimation reçue', 'Premier appel', 'Visite d\'estimation', 'Avis de valeur', 'Mandat signé', 'Annonce en ligne', 'Visites', 'Offre reçue', 'Compromis signé', 'Acte signé']);
  // l'admin reste fermé à un vendeur
  for (const [chemin, corps] of [['/admin/visite', { demande: d.id, debut: d.visite.creneaux[0] }], ['/admin/demande', { id: d.id, statut: 'acte' }], ['/admin/avis/valider', { demande: d.id }]]) {
    expect((await api(page, chemin, corps))._status, chemin).toBe(403);
  }
  expect((await api(page, '/admin/avis?demande=' + d.id))._status).toBe(403);
  // le fabricant de PDF et ses fichiers sont bien servis par le site
  for (const f of ['avis-pdf.js', 'pdf-lib.min.js', 'fontkit.umd.min.js', 'familjen-400.woff', 'schibsted-600.woff', 'logo-gravelin-ink.png']) {
    expect((await request.get('/assets/avis/' + f)).status(), f).toBe(200);
  }
  const detail = await request.get('/donnees-dvf/d/100_946.txt');
  expect(detail.status()).toBe(200);
  expect(JSON.parse((await detail.text()).split('\n')[0]).length).toBe(4);
  await supprimer(page);
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
