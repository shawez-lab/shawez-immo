/* Dossier ouvert à la main par l'agence : un vendeur venu par téléphone, une recommandation, un mandat déjà signé.
   /admin/ → « Ouvrir un dossier » ; avec un e-mail, le vendeur a son espace tout de suite : un lien à lui envoyer par
   WhatsApp, SMS ou e-mail (message déjà écrit), ou l'e-mail « Votre espace est ouvert » quand l'envoi aux vendeurs
   est ouvert. Un dossier sans espace (ouvert sans e-mail, demande de rappel) en reçoit un dès qu'on a son e-mail.
   Jamais de fourchette ici : elle se décide à la visite. Captures → captures/dossier-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fausseBan, estimationComplete, moi, api, viderBoite, courrier, pour, lienDans, sessionAdmin, emailTest, SITE } from './aides.mjs';

const require = createRequire(import.meta.url);
const { PDFDocument } = require('../../../assets/avis/pdf-lib.min.js');

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const fr = (jour) => jour.split('-').reverse().join('/');
const cle = () => 'essai-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
const sansDebordement = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'rien ne dépasse de l\'écran').toBeLessThanOrEqual(1);
async function axe(page, nom) {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).include('.ee').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect.soft(r.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`), `accessibilité de l'écran « ${nom} »`).toEqual([]);
}
async function capture(page, cible, nom, info, max = 2600) {
  const el = typeof cible === 'string' ? page.locator(cible).first() : cible;
  await el.scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: '#nav,#stickybar,.sim-peek{display:none!important}' });
  const b = await el.boundingBox();
  const defile = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await page.screenshot({ path: `captures/dossier-${info.project.name}-${nom}.png`, fullPage: true, clip: { x: Math.max(0, b.x + defile.x - 8), y: Math.max(0, b.y + defile.y - 8), width: b.width + 16, height: Math.min(max, b.height + 16) } });
}
/* Appel à l'API avec une heure donnée (serveur de test) : pour les heures calmes. */
const apiA = (page, chemin, corps, heure) => page.evaluate(async ([c, b, h]) => {
  const r = await fetch('/api/espace' + c, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(h ? { 'X-Horloge-Test': h } : {}) }, body: JSON.stringify(b) });
  let d = {}; try { d = await r.json(); } catch (e) { /* pas de JSON */ }
  d._status = r.status; return d;
}, [chemin, corps, heure]);
const BIEN = { type: 'maison', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', citycode: '21231', lat: 47.32396, lon: 5.03633, surface: 120 };
const dossier = (o = {}) => { const { contact, bien, ...reste } = o; return { contact: { prenom: 'Luigia', nom: 'Rossi', telephone: '06 11 22 33 44', ...(contact || {}) }, bien: { ...BIEN, ...(bien || {}) }, prevenir: false, ...reste }; };
async function navigateur(browser, info) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const page = await ctx.newPage();
  await fausseBan(page);
  return { ctx, page };
}
const chemin = (lien) => lien.replace(/^https?:\/\/[^/]+/, '');
async function lienEspace(page, d) {
  const r = await api(page, '/admin/compte/lien', { id: d.compte_id, type: 'acces', jours: 7, demande: d.id });
  expect(r).toMatchObject({ _status: 200, type: 'acces', jours: 7 });
  expect(r.lien).toMatch(/\/mon-espace\/\?lien=[A-Za-z0-9_-]{20,}$/);
  return r.lien;
}

test('droits et validation : seule l\'agence ouvre un dossier ; ce qui manque est dit ; un double envoi ne fait qu\'un dossier', async ({ page, request, browser }, info) => {
  // sans connexion
  await page.goto('/admin/');
  expect((await api(page, '/admin/dossier', dossier()))._status).toBe(401);
  expect((await api(page, '/admin/dossier/espace', { demande: 1, email: 'x@exemple-test.fr' }))._status).toBe(401);
  // un vendeur connecté n'ouvre rien
  const v = await navigateur(browser, info);
  await estimationComplete(v.page);
  expect(await api(v.page, '/admin/dossier', dossier())).toMatchObject({ _status: 403, error: 'interdit' });
  expect(await api(v.page, '/admin/dossier/espace', { demande: 1, email: 'x@exemple-test.fr' })).toMatchObject({ _status: 403 });
  await v.ctx.close();

  await sessionAdmin(page, request);
  const refus = async (corps, champ) => expect(await api(page, '/admin/dossier', corps), `refus attendu : ${champ}`).toMatchObject({ _status: 400, error: 'champs', champ });
  await refus(dossier({ contact: { prenom: '', nom: '' } }), 'nom_vendeur');
  await refus(dossier({ contact: { telephone: '', email: '' } }), 'telephone');
  await refus(dossier({ contact: { email: 'pas-une-adresse' } }), 'email');
  await refus(dossier({ contact: { telephone: '12' } }), 'telephone');
  // l'e-mail du vendeur n'est jamais celui de l'agence (son « lien » ouvrirait l'espace agence) ; aucun lien vers un compte de l'agence
  await refus(dossier({ contact: { email: 'Shawez@Gravelin-Immo.com' } }), 'email_agence');
  const agence = (await api(page, '/admin/comptes')).comptes.find((x) => x.admin);
  expect(await api(page, '/admin/compte/lien', { id: agence.id, type: 'acces' })).toMatchObject({ _status: 400, error: 'compte_agence' });
  expect(await api(page, '/admin/compte/lien', { id: agence.id, type: 'acces', jours: 7 })).toMatchObject({ _status: 400, error: 'compte_agence' });
  await refus(dossier({ bien: { type: 'chateau' } }), 'type');
  await refus(dossier({ bien: { adresse: '' } }), 'adresse');
  await refus(dossier({ bien: { lat: 12 } }), 'adresse');
  await refus(dossier({ bien: { surface: -4 } }), 'surface');
  await refus(dossier({ statut: 'pause' }), 'statut');       // on n'ouvre pas un dossier « perdu » ou « en pause »
  await refus(dossier({ statut: 'inconnu' }), 'statut');

  // sans statut : « Appelé » ; pas de fourchette, jamais ; même clé → même dossier
  const k = cle();
  const a = await api(page, '/admin/dossier', dossier({ cle: k }));
  expect(a).toMatchObject({ _status: 201, mail: 'non' });
  expect(a.demande).toMatchObject({ statut: 'appele', statut_libelle: 'Appelé', prix_bas: null, prix_haut: null, origine: 'agence', compte_id: null, site: 'shawez', commune: 'Dijon', surface: 120 });
  expect(a.demande.reference).toMatch(/^E-\d{8}-[0-9A-F]{6}$/);
  expect(a.demande.trace).toMatchObject({ type: 'ouverture', par: 'agence' });
  const b = await api(page, '/admin/dossier', dossier({ cle: k, contact: { prenom: 'Autre' } }));
  expect(b).toMatchObject({ _status: 200, rejoue: true });
  expect(b.demande.id).toBe(a.demande.id);
  // un dossier sans espace n'a pas de lien à envoyer ; un compte qui n'existe pas non plus
  expect((await api(page, '/admin/compte/lien', { id: 999999, type: 'acces', jours: 7 }))._status).toBe(404);
});

test('ouvrir un dossier dans /admin/ : le formulaire, le lien par WhatsApp, ce que voit le vendeur', async ({ page, request, browser }, info) => {
  test.setTimeout(180000);
  const email = emailTest('vendeur');
  await sessionAdmin(page, request);
  await viderBoite(request);
  await page.goto('/admin/');
  await expect(page.locator('#ad-in')).toBeVisible();

  // 1. le bouton ouvre le formulaire ; envoyé vide, il dit ce qui manque
  const bouton = page.locator('#ad-nv-btn');
  await expect(bouton).toHaveText('Ouvrir un dossier');
  await bouton.click();
  const f = page.locator('#ad-nv');
  await expect(f).toBeVisible();
  await expect(bouton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#nv-statut')).toHaveValue('appele');
  await expect(page.locator('#nv-statut option')).toHaveCount(10);          // les 10 statuts, sans les deux sorties
  await axe(page, 'ouvrir un dossier (vide)');
  await page.locator('#nv-ok').click();
  await expect(f.locator('.field.err')).toHaveCount(3);                     // nom, téléphone, adresse
  await expect(f.locator('.field.err .msg').first()).toContainText('prénom ou son nom');

  // 2. on le remplit : l'adresse se choisit dans la liste
  await page.locator('#nv-prenom').fill('Luigia');
  await page.locator('#nv-nom').fill('Rossi');
  await page.locator('#nv-tel').fill('06 11 22 33 44');
  await page.locator('#nv-email').fill('  ' + email.toUpperCase() + ' ');
  await page.locator('#nv-adresse').fill('30 rue bannelier dijon');
  await page.locator('#nv-sugg li').first().click();
  await expect(page.locator('#nv-picked')).toHaveText('Adresse retenue : 30 Rue Bannelier 21000 Dijon');
  await page.locator('#nv-type').selectOption('maison');
  await page.locator('#nv-surface').fill('120');
  await page.locator('#nv-statut').selectOption('mandat');
  await page.locator('#nv-notes').fill('Recommandée par M. Perez. Mandat exclusif signé le 6 octobre.');
  await expect(f.locator('.field.err')).toHaveCount(0);
  // l'envoi aux vendeurs est ouvert sur ce serveur : on décoche, pour envoyer le lien soi-même (comme en ligne aujourd'hui)
  await page.locator('#nv-prevenir').uncheck();
  await sansDebordement(page);
  await axe(page, 'ouvrir un dossier (rempli)');
  await capture(page, f, 'ouvrir', info);
  await page.locator('#nv-ok').click();

  // 3. le dossier est là, seul à l'écran et ouvert
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne).toHaveCount(1);
  await expect(f).toHaveCount(0);
  await expect(ligne).toHaveAttribute('open', '');
  await expect(ligne.locator(':scope > summary')).toContainText('Luigia Rossi · Dijon');
  await expect(ligne.locator('summary .st')).toHaveText('Mandat signé');
  await expect(ligne.locator(':scope > summary small')).toContainText('ouvert par l\'agence');
  await expect(ligne.locator(':scope > summary small')).not.toContainText('rappel');
  await expect(ligne.locator('.ee-fiche')).toContainText('À établir à la visite');
  await expect(ligne.locator('.ee-fiche')).not.toContainText('rappel promis');
  await expect(ligne.locator('[data-f="notes"]')).toHaveValue('Recommandée par M. Perez. Mandat exclusif signé le 6 octobre.');
  await expect(ligne.locator('a[href^="tel:"]').first()).toHaveAttribute('href', 'tel:0611223344');
  const espace = ligne.locator('[data-bloc="espace"]');
  await expect(espace.locator('[data-test="espace-etat"]')).toHaveText(email + ' · pas encore ouvert');
  await expect(espace.locator('.ee-ok')).toHaveText('Dossier ouvert. Envoyez-lui le lien de son espace.');
  const d = (await api(page, '/admin/demandes')).demandes.find((x) => x.contact.email === email);
  expect(d).toMatchObject({ statut: 'mandat', origine: 'agence', prix_bas: null, en_attente: false, compte_email: email, type: 'maison', surface: 120 });
  expect(d.contact).toMatchObject({ prenom: 'Luigia', nom: 'Rossi', telephone: '06 11 22 33 44', email });
  expect(d.reponses).toMatchObject({ origine: 'agence', lat: 47.32396, lon: 5.03633, code_postal: '21000' });
  // rien n'est parti au vendeur (case décochée)
  expect(await courrier(request, pour(email), { attente: 1500 })).toHaveLength(0);

  // 4. le lien de son espace : le message est déjà écrit, il ne reste qu'à l'envoyer
  await espace.locator('[data-esp-lien]').click();
  const wa = espace.locator('[data-test="esp-wa"]');
  await expect(wa).toBeVisible();
  const href = await wa.getAttribute('href');
  expect(href.startsWith('https://wa.me/33611223344?text=')).toBe(true);
  const message = decodeURIComponent(href.split('?text=')[1]);
  expect(message).toMatch(/^Bonjour Luigia, c'est Shawez Ali\. Voici le lien de votre espace/);
  expect(message).toContain('valable 7 jours');
  expect(message).not.toMatch(/claude|\bintelligence artificielle\b|automatique|mandataire/i);
  const lien = (message.match(/https?:\/\/\S+\/mon-espace\/\?lien=[A-Za-z0-9_-]+/) || [])[0];
  expect(lien, 'le lien est dans le message').toBeTruthy();
  await expect(espace.locator('[data-test="esp-lien"]')).toHaveText(lien);
  expect(await espace.locator('[data-test="esp-sms"]').getAttribute('href')).toMatch(/^sms:0611223344\?&body=Bonjour/);
  expect(await espace.locator('[data-test="esp-mail"]').getAttribute('href')).toContain('mailto:' + email + '?subject=');
  await expect(espace.locator('[data-esp-copier]')).toHaveAttribute('data-esp-copier', lien);
  await sansDebordement(page);
  await axe(page, 'dossier ouvert par l\'agence');
  await capture(page, ligne.locator('.ee-col'), 'admin', info, 1500);

  // 5. le vendeur ouvre son lien : son dossier, à la bonne étape, sans prix
  const v = await navigateur(browser, info);
  await v.page.goto(chemin(lien));
  await expect(v.page.locator('#me-in')).toBeVisible();
  await expect(v.page.locator('#me-titre')).toContainText('Bonjour Luigia');
  await expect(v.page.locator('#me-bonjour')).toHaveText('1 dossier');
  await expect(v.page.locator('#me-lede')).toHaveText('Votre dossier, étape par étape.');
  const carte = v.page.locator('#me-cards .ee-card');
  await expect(carte).toHaveCount(1);
  await expect(carte.locator('h3').first()).toHaveText('Maison · 120 m²');
  await expect(carte.locator('[data-test="dossier-agence"]')).toContainText('Votre dossier');
  await expect(carte.locator('[data-test="dossier-agence"]')).toContainText('Shawez le suit avec vous');
  await expect(carte).not.toContainText('Étude personnalisée');
  await expect(carte).not.toContainText('ventes comparables');
  await expect(carte.locator('.fp')).not.toContainText('€');
  await expect(carte.locator('.ee-etape span')).toHaveText('Étape 5 sur 10');
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Mandat signé');
  await expect(carte.locator('[data-test="suite"]')).toContainText('Les photos, puis la mise en ligne de l\'annonce.');
  await expect(carte.locator('.ee-rdv')).toBeHidden();                      // mandat signé : plus de visite d'estimation à réserver
  await expect(carte).not.toContainText('Recommandée par');                 // les notes restent à l'agence
  const m = await moi(v.page);
  expect(m.compte).toMatchObject({ email, prenom: 'Luigia', nom: 'Rossi', verifie: true, mot_de_passe: false });
  expect(m.demandes[0]).toMatchObject({ origine: 'agence', statut: 'mandat', prix_bas: null });
  await sansDebordement(v.page);
  await axe(v.page, 'espace du vendeur, dossier ouvert par l\'agence');

  // 6. le lien ne sert qu'une fois
  const autre = await navigateur(browser, info);
  await autre.page.goto(chemin(lien));
  await expect(autre.page.locator('#me-out')).toBeVisible();
  await expect(autre.page.locator('#me-flash')).toContainText('n\'est plus valable');
  await autre.ctx.close();

  // 7. la suite arrive dans son espace : un compte rendu publié par l'agence
  expect(await api(page, '/admin/demande', { id: d.id, statut: 'annonce', prevenir: false })).toMatchObject({ _status: 200 });
  expect(await api(page, '/admin/compte-rendu', { demande: d.id, visite_le: aujourdhui(), texte: 'Un couple de Fontaine, très intéressé par le jardin.', publie: true, prevenir: false })).toMatchObject({ _status: 201 });
  await v.page.reload();
  await expect(carte.locator('[data-test="comptes-rendus"]')).toContainText('très intéressé par le jardin');
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Visites');
  await capture(v.page, carte, 'vendeur', info);
  await v.ctx.close();

  // 8. dans /admin/ : le journal commence par l'ouverture, l'espace dit que le vendeur est venu
  await page.goto('/admin/?q=' + d.reference);
  await expect(ligne).toHaveCount(1);
  await expect(ligne.locator('[data-test="espace-etat"]')).toHaveText(email + ' · ouvert pour la dernière fois le ' + fr(aujourdhui()));
  const j = (await api(page, '/admin/journal?demande=' + d.id)).journal;
  expect(j[j.length - 1]).toMatchObject({ type: 'ouverture', par: 'agence', detail: { statut: 'mandat', espace: true } });
  expect(j.some((e) => e.type === 'statut' && e.vers === 'recue')).toBe(false);
  expect(j.some((e) => e.type === 'lien_espace' && e.detail.jours === 7)).toBe(true);
  await ligne.locator('[data-journal] > summary').click();
  await expect(ligne.locator('[data-journal] li').last()).toContainText('Dossier ouvert par l\'agence');
  await expect(ligne.locator('[data-journal]')).toContainText('Lien de son espace préparé pour le vendeur');
});

test('dossier ouvert sans e-mail : pas d\'espace ; son e-mail suffit ensuite, et l\'e-mail « Votre espace est ouvert » part', async ({ page, request, browser }, info) => {
  test.setTimeout(120000);
  const email = emailTest('sans-mail');
  await sessionAdmin(page, request);
  // adresse écrite à la main (pas choisie dans la liste), un prénom seulement, un commerce
  const r = await api(page, '/admin/dossier', { contact: { prenom: 'Justine', telephone: '+33 6 55 44 33 22' }, bien: { type: 'autre', autre_type: 'commerce', adresse: 'rue Musette, Dijon' }, statut: 'recue', notes: 'Fonds de commerce, centre-ville.' });
  expect(r).toMatchObject({ _status: 201, mail: 'non' });
  expect(r.demande).toMatchObject({ statut: 'recue', compte_id: null, compte_email: null, type: 'autre', adresse: 'rue Musette, Dijon' });
  // à « Estimation reçue », la prochaine action est l'appel
  expect(r.demande.action.texte).toContain('Appeler');

  await page.goto('/admin/?q=' + r.demande.reference);
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne).toHaveCount(1);
  await expect(ligne.locator(':scope > summary')).toContainText('Justine');
  const espace = ligne.locator('[data-bloc="espace"]');
  await expect(espace).toContainText('n\'a pas encore d\'espace');
  await expect(espace.locator('[data-esp-lien]')).toHaveCount(0);
  await expect(ligne.locator('.ee-top a[href^="mailto:"]')).toHaveCount(0);   // pas d'e-mail : pas de bouton « E-mail »
  await expect(ligne.locator('.ee-top a[href^="https://wa.me/33655443322"]')).toHaveCount(1);
  await espace.locator('[data-esp-ouvrir]').click();
  await expect(espace.locator('.ee-err')).toContainText('Indiquez l\'e-mail du vendeur');
  await axe(page, 'dossier sans espace');

  await espace.locator('[data-esp-email]').fill('shawez@gravelin-immo.com');
  await espace.locator('[data-esp-ouvrir]').click();
  await expect(espace.locator('.ee-err')).toContainText('adresse de l\'agence');
  await viderBoite(request);
  await espace.locator('[data-esp-email]').fill(email);
  await espace.locator('[data-esp-ouvrir]').click();
  await expect(ligne.locator('[data-bloc="espace"] .ee-ok')).toHaveText('Espace ouvert · le lien part par e-mail.');
  await expect(ligne.locator('[data-test="espace-etat"]')).toHaveText(email + ' · pas encore ouvert');
  await expect(ligne.locator('[data-esp-lien]')).toBeVisible();
  // (refusé avec une adresse de l'agence ; une seconde fois : refusé, le dossier a son espace)
  expect(await api(page, '/admin/dossier/espace', { demande: r.demande.id, email: emailTest('autre') })).toMatchObject({ _status: 409, error: 'espace_existe' });

  // l'e-mail au vendeur : court, signé, avec le lien de son espace
  const [m] = await courrier(request, pour(email, /Votre espace est ouvert/));
  expect(m, 'e-mail « Votre espace est ouvert »').toBeTruthy();
  expect(m.text).toContain('Bonjour Justine,');
  expect(m.text).toContain('je vous ai ouvert votre espace');
  expect(m.text).toContain('Shawez Ali – Gravelin Immo');
  expect(m.text).not.toMatch(/claude|mandataire|€/i);
  const lien = lienDans(m);
  expect(lien).toBeTruthy();
  const v = await navigateur(browser, info);
  await v.page.goto(chemin(lien));
  await expect(v.page.locator('#me-in')).toBeVisible();
  const carte = v.page.locator('#me-cards .ee-card');
  await expect(carte.locator('h3').first()).toHaveText('Bien');
  await expect(carte.locator('[data-test="dossier-agence"]')).toBeVisible();
  await expect(carte.locator('.ee-etape span')).toHaveText('Étape 1 sur 10');
  // à ce stade, il peut choisir son créneau de visite lui-même
  await expect(carte.locator('.ee-rdv [data-rdv-ouvrir]')).toBeVisible();
  expect((await moi(v.page)).demandes[0].contact).toBeUndefined();          // rien de plus que ce qu'un vendeur voit d'habitude
  await v.ctx.close();
  const j = (await api(page, '/admin/journal?demande=' + r.demande.id)).journal;
  expect(j.map((e) => e.type)).toEqual(expect.arrayContaining(['ouverture', 'espace_ouvert', 'mail']));
  expect(j.find((e) => e.type === 'mail').detail).toMatchObject({ motif: 'ouverture', envoye: true });
});

test('une demande de rappel (sans espace) : l\'agence ouvre l\'espace du vendeur avec l\'e-mail déjà donné', async ({ page, request, browser }, info) => {
  const email = emailTest('rappel');
  const v = await navigateur(browser, info);
  await v.page.goto('/estimation-immobiliere-dijon/');
  const lead = await v.page.evaluate(async (e) => {
    const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'Maison', commune: 'Talant', surface: 110, pieces: '5 pièces', delai: 'Je vends dans les 3 mois', prenom: 'Nicolas', nom: 'Perez', email: e, telephone: '06 77 88 99 00', consent_notice: true }) });
    return { statut: r.status, ...(await r.json()) };
  }, email);
  expect(lead.statut).toBe(201);
  await sessionAdmin(page, request);
  const d = (await api(page, '/admin/demandes')).demandes.find((x) => x.reference === lead.reference);
  expect(d).toMatchObject({ compte_id: null, origine: '' });
  // l'e-mail du formulaire est déjà dans le champ : un clic suffit
  await page.goto('/admin/?q=' + lead.reference);
  const espace = page.locator('#ad-rows .ee-row [data-bloc="espace"]');
  await expect(espace.locator('[data-esp-email]')).toHaveValue(email);
  expect(await api(page, '/admin/dossier/espace', { demande: d.id, prevenir: false })).toMatchObject({ _status: 200, mail: 'non', demande: { compte_email: email, en_attente: false } });
  const lien = await lienEspace(page, { ...d, compte_id: (await api(page, '/admin/demandes')).demandes.find((x) => x.id === d.id).compte_id });
  await v.page.goto(chemin(lien));
  await expect(v.page.locator('#me-in')).toBeVisible();
  await expect(v.page.locator('#me-titre')).toContainText('Bonjour Nicolas');
  // une demande faite en ligne reste « une estimation », avec sa promesse de rappel
  await expect(v.page.locator('#me-bonjour')).toHaveText('1 estimation');
  await expect(v.page.locator('#me-cards .ee-card')).toContainText('Étude personnalisée');
  await v.ctx.close();
});

test('un espace existe déjà avec cet e-mail : le dossier s\'y range ; adresse jamais prouvée → seulement après le lien', async ({ page, request, browser }, info) => {
  test.setTimeout(150000);
  await sessionAdmin(page, request);

  // a) le vendeur a déjà fait une estimation en ligne (espace sans mot de passe, adresse pas encore prouvée)
  const v = await navigateur(browser, info);
  const { contact } = await estimationComplete(v.page, {}, { prenom: 'Élodie', nom: 'Besançon' });
  const a = await api(page, '/admin/dossier', dossier({ contact: { prenom: 'Élodie', nom: 'Besançon', email: contact.email }, statut: 'visite' }));
  expect(a).toMatchObject({ _status: 201, demande: { en_attente: true, compte_email: contact.email } });
  let m = await moi(v.page);
  expect(m.demandes).toHaveLength(1);                                       // son estimation ; le dossier attend le lien
  expect(m.en_attente).toBe(1);
  await page.goto('/admin/?q=' + a.demande.reference);
  await expect(page.locator('#ad-rows [data-test="espace-etat"]')).toContainText('le dossier y apparaîtra dès qu\'il aura ouvert son lien');
  await v.page.goto(chemin(await lienEspace(page, a.demande)));
  await expect(v.page.locator('#me-cards .ee-card')).toHaveCount(2);
  await expect(v.page.locator('#me-bonjour')).toHaveText('2 dossiers');
  m = await moi(v.page);
  expect(m.en_attente).toBe(0);
  expect(m.demandes.map((x) => x.origine).sort()).toEqual(['', 'agence']);
  // adresse prouvée : le dossier suivant y est tout de suite
  const a2 = await api(page, '/admin/dossier', dossier({ contact: { prenom: 'Élodie', nom: 'Besançon', email: contact.email }, bien: { type: 'appartement', surface: 45 } }));
  expect(a2.demande.en_attente).toBe(false);
  expect((await moi(v.page)).demandes).toHaveLength(3);
  await v.ctx.close();

  // b) quelqu'un a ouvert un compte avec l'e-mail du vendeur (et un mot de passe) : il ne voit jamais le dossier
  const email = emailTest('victime');
  const intrus = await navigateur(browser, info);
  await intrus.page.goto('/mon-espace/');
  expect((await api(intrus.page, '/inscription', { prenom: 'Faux', nom: 'Vendeur', email, telephone: '0600000000', mot_de_passe: 'Tentative-2026', consentement: true }))._status).toBe(201);
  const b = await api(page, '/admin/dossier', dossier({ contact: { email }, statut: 'mandat' }));
  expect(b).toMatchObject({ _status: 201, demande: { en_attente: true } });
  expect((await moi(intrus.page)).demandes).toHaveLength(0);
  const vrai = await navigateur(browser, info);
  await vrai.page.goto(chemin(await lienEspace(page, b.demande)));
  await expect(vrai.page.locator('#me-cards .ee-card')).toHaveCount(1);
  // le vrai vendeur a ouvert son lien : l'intrus est dehors, son mot de passe ne marche plus
  expect((await moi(intrus.page)).compte).toBeNull();
  expect((await api(intrus.page, '/connexion', { email, mot_de_passe: 'Tentative-2026' }))._status).toBe(401);
  await intrus.ctx.close();
  await vrai.ctx.close();
});

test('heures calmes : un dossier ouvert à 22 h, l\'e-mail « Votre espace est ouvert » part à 8 h', async ({ page, request }) => {
  const email = emailTest('soir');
  await sessionAdmin(page, request);
  await viderBoite(request);
  const j = aujourdhui();
  const soir = new Date(j + 'T20:10:00Z').toISOString();                    // 22 h 10 à Paris en été, 21 h 10 en hiver
  const r = await apiA(page, '/admin/dossier', { ...dossier({ contact: { email } }), prevenir: true }, soir);
  expect(r).toMatchObject({ _status: 201, mail: 'differe' });
  expect(await courrier(request, pour(email), { attente: 1500 })).toHaveLength(0);
  const matin = new Date(new Date(j + 'T07:05:00Z').getTime() + 86400000).toISOString();   // le lendemain, après 8 h à Paris
  const t = await page.evaluate(async (h) => (await fetch('/api/espace/taches?maintenant=' + encodeURIComponent(h))).json(), matin);
  expect(t.courriers).toBeGreaterThanOrEqual(1);
  const recus = await courrier(request, pour(email, /Votre espace est ouvert/));
  expect(recus).toHaveLength(1);
});

test('mesure et tableau : un dossier ouvert par l\'agence ne fausse pas les promesses 1 et 2 ; il est dans le Google Sheet', async ({ page, request }) => {
  await sessionAdmin(page, request);
  const csv = async () => page.evaluate(async () => (await (await fetch('/api/espace/admin/promesses.csv?jours=7')).text()));
  const lignes = (txt, ref) => txt.split(/\r?\n/).filter((l) => l.includes(ref)).map((l) => l.split(';'));
  // ouvert après le premier contact : promesses 1 et 2 hors mesure, avec la raison
  const a = await api(page, '/admin/dossier', dossier({ contact: { email: emailTest('mesure') } }));
  let l = lignes(await csv(), a.demande.reference);
  expect(l.find((x) => x[0] === '1')).toEqual(expect.arrayContaining(['hors mesure']));
  expect(l.find((x) => x[0] === '1').join(';')).toContain('Dossier ouvert par l\'agence (pas d\'estimation en ligne)');
  expect(l.find((x) => x[0] === '2').join(';')).toContain('hors mesure');
  expect(l.find((x) => x[0] === '2').join(';')).toContain('après le premier contact');
  // ouvert avant d'avoir appelé (« Estimation reçue ») : le quart d'heure court, puis il est tenu
  const b = await api(page, '/admin/dossier', dossier({ contact: { email: emailTest('mesure') }, statut: 'recue' }));
  l = lignes(await csv(), b.demande.reference);
  expect(l.find((x) => x[0] === '2').join(';')).toContain('en cours');
  expect(await api(page, '/admin/demande', { id: b.demande.id, statut: 'appele', prevenir: false })).toMatchObject({ _status: 200 });
  l = lignes(await csv(), b.demande.reference);
  expect(l.find((x) => x[0] === '2')[2]).toBe('tenue');
  expect(l.find((x) => x[0] === '1')[2]).toBe('hors mesure');

  // Google Sheet : la ligne du dossier, sans promesse de rappel
  const f = await api(page, '/admin/flux', {});
  const flux = await (await request.get(f.adresse)).text();
  const ligne = flux.split(/\r?\n/).find((x) => x.includes(a.demande.reference));
  expect(ligne, 'le dossier est dans le flux').toBeTruthy();
  expect(ligne).toContain('dossier ouvert par l\'agence');
  expect(ligne).toContain('appelé');
  expect(ligne).not.toContain('rappel)');
});

test('avis de valeur d\'un dossier ouvert par l\'agence : ventes réelles du quartier, aucune fourchette proposée, le PDF se fabrique', async ({ page, request, browser }, info) => {
  test.setTimeout(180000);
  const email = emailTest('avis');
  await sessionAdmin(page, request);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const r = await api(page, '/admin/dossier', dossier({ contact: { civilite: 'Mme', email }, bien: { type: 'appartement', surface: 72 }, statut: 'visite' }));
  expect(r._status).toBe(201);
  // les ventes comparables viennent de DVF (adresse et surface connues) ; le prix, lui, n'est jamais proposé
  const a = await api(page, '/admin/avis?demande=' + r.demande.id);
  expect(a._status).toBe(200);
  expect(a.donnees.assez_de_ventes).toBe(true);
  expect(a.donnees.ventes.length).toBeGreaterThanOrEqual(5);
  expect(a.donnees.estimation).toBeNull();
  expect(a.contenu).toMatchObject({ prix_bas: null, prix_haut: null });
  // sans surface (ou sans adresse reconnue) : pas de ventes comparables automatiques, et toujours pas de prix
  const s = await api(page, '/admin/dossier', dossier({ bien: { surface: null } }));
  const b = await api(page, '/admin/avis?demande=' + s.demande.id);
  expect(b.donnees).toMatchObject({ assez_de_ventes: false, raison: 'adresse', ventes: [] });
  expect(b.contenu).toMatchObject({ prix_bas: null, prix_haut: null });

  await page.goto('/admin/?q=' + r.demande.reference);
  const ligne = page.locator('#ad-rows .ee-row');
  await ligne.locator('[data-avis-ouvrir]').click();
  const ed = ligne.locator('[data-avis-ed]');
  await expect(ed.locator('[data-test="avis-ventes"]')).toContainText('ventes réelles');
  await expect(ed.locator('[data-av="prix_bas"]')).toHaveValue('');
  await expect(ed).not.toContainText('Estimation en ligne');
  // sans la fourchette de l'agent, pas de PDF
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-err')).toContainText('Indiquez la fourchette de prix');
  await ed.locator('[data-av="notes"]').fill('Appartement traversant, au calme. Cuisine refaite en 2022.');
  await ed.locator('[data-av="prix_bas"]').fill('205000');
  await ed.locator('[data-av="prix_haut"]').fill('219000');
  await ed.locator('[data-avis-pdf]').click();
  await expect(ed.locator('.ee-ok')).toContainText('PDF créé', { timeout: 60000 });
  expect(erreurs, 'aucune erreur dans la page').toEqual([]);
  const f = (await api(page, '/admin/avis?demande=' + r.demande.id)).avis.fichier;
  const octets = await page.evaluate(async (id) => Array.from(new Uint8Array(await (await fetch('/api/espace/fichier?id=' + id)).arrayBuffer())), f.id);
  const pdf = await PDFDocument.load(Uint8Array.from(octets));
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(6);
  expect(pdf.getPageCount()).toBeLessThanOrEqual(10);
  // validé : dans l'espace du vendeur, dossier à « Avis de valeur envoyé »
  expect(await api(page, '/admin/avis/valider', { demande: r.demande.id, prevenir: false })).toMatchObject({ _status: 200, demande: { statut: 'avis' } });
  const v = await navigateur(browser, info);
  await v.page.goto(chemin(await lienEspace(page, r.demande)));
  await expect(v.page.locator('#me-cards .ee-avis a')).toContainText('Télécharger mon avis de valeur (PDF)');
  await v.ctx.close();
});
