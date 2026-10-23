/* Promesse 7 quand l'e-mail ne peut pas partir, et dossier corrigé après coup.

   1. « À dire au vendeur » : tant que l'envoi d'e-mails aux vendeurs est fermé (c'est le cas en ligne aujourd'hui), ou
      pour un vendeur sans espace, chaque nouvelle qui serait partie par e-mail reste « à dire » dans le dossier : le
      message est déjà écrit (les mots de l'e-mail, le lien de son espace s'il en a un), l'agence l'envoie d'un geste par
      WhatsApp, SMS ou e-mail, le dossier note que le vendeur est prévenu et la promesse 7 est tenue (« déclaré par
      l'agence »). Le site n'envoie rien lui-même.
   2. « Corriger ce dossier » : nom, téléphone, e-mail ; adresse, type et surface tant que le site n'a pas calculé de
      fourchette à partir d'eux.
   Serveur « vendeurs fermés » (port 8791) : comme en production aujourd'hui. Captures → captures/prevenir-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { fausseBan, estimationComplete, moi, api, viderBoite, courrier, pour, sessionAdmin, emailTest, SITE, SITE_VENDEURS_FERMES } from './aides.mjs';
import { moduleServeur } from './module-serveur.mjs';

const { mesurer } = await moduleServeur('promesses');
const { mailStatut, mailVisite, mailCompteRendu, mailOffre, mailNotaire, messageVendeur, libelleNouvelle } = await moduleServeur('suivi');

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
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
  await page.screenshot({ path: `captures/prevenir-${info.project.name}-${nom}.png`, fullPage: true, clip: { x: Math.max(0, b.x + defile.x - 8), y: Math.max(0, b.y + defile.y - 8), width: b.width + 16, height: Math.min(max, b.height + 16) } });
}
const BIEN = { type: 'maison', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', citycode: '21231', lat: 47.32396, lon: 5.03633, surface: 120 };
const dossier = (o = {}) => { const { contact, bien, ...reste } = o; return { contact: { prenom: 'Luigia', nom: 'Rossi', telephone: '06 11 22 33 44', ...(contact || {}) }, bien: { ...BIEN, ...(bien || {}) }, prevenir: false, cle: cle(), ...reste }; };
async function ouvrir(page, o) {
  const r = await api(page, '/admin/dossier', dossier(o));
  expect(r, 'dossier ouvert').toMatchObject({ _status: 201 });
  return r.demande;
}
async function navigateur(browser, info, baseURL) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL });
  const page = await ctx.newPage();
  await fausseBan(page);
  return { ctx, page };
}
const chemin = (lien) => lien.replace(/^https?:\/\/[^/]+/, '');
const dire = async (page, id) => (await api(page, '/admin/dire', { demande: id })).message;
const vue = async (page, id) => (await api(page, '/admin/demandes')).demandes.find((x) => x.id === id);
const promesse7 = async (page, ref) => (await api(page, '/admin/promesses')).promesses[6].a_regarder.filter((m) => m.reference === ref);
const csv7 = async (page, ref) => (await page.evaluate(async () => (await fetch('/api/espace/admin/promesses.csv?jours=7')).text())).split('\r\n').filter((l) => l.startsWith('7;') && l.includes(ref));
/* dans deux jours (pas un dimanche) à 10 h, heure de Paris : l'instant UTC suit le décalage du jour (été ou hiver) */
const dansDeuxJours = () => {
  const d = new Date(Date.now() + 2 * 86400000); if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  const essai = new Date(d.toISOString().slice(0, 10) + 'T10:00:00Z');
  const vu = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(essai);
  const [hv, mv] = vu.split(':').map(Number);
  return new Date(essai.getTime() - ((hv * 60 + mv) - 600) * 60000).toISOString();
};

/* ------------------------------------------------------------------------------------------------------------- */

test.describe('e-mails aux vendeurs fermés (comme en ligne aujourd\'hui)', () => {
  test.use({ baseURL: SITE_VENDEURS_FERMES });

  test('un changement de statut : le message est écrit, WhatsApp le note, la promesse 7 est tenue', async ({ page, request, browser }, info) => {
    test.setTimeout(180000);
    const email = emailTest('vendeur');
    await sessionAdmin(page, request);
    const d = await ouvrir(page, { contact: { email }, statut: 'avis' });
    expect(d).toMatchObject({ statut: 'avis', compte_email: email, a_dire: null });
    await viderBoite(request);
    await page.context().route(/wa\.me|whatsapp\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp</title>' }));
    await page.goto('/admin/?q=' + d.reference);
    const ligne = page.locator('#ad-rows .ee-row');
    await expect(ligne).toHaveCount(1);
    await expect(ligne).toHaveAttribute('open', '');
    const bloc = ligne.locator('[data-bloc="dire"]');
    const pastille = ligne.locator('summary [data-test="a-dire"]');
    await expect(bloc).toBeHidden();
    await expect(pastille).toBeHidden();

    // 1. la case ne promet pas un e-mail : elle prépare le message
    const caseP = ligne.locator('[data-f="prevenir"]');
    await expect(caseP).toBeEnabled();
    await expect(caseP).toBeChecked();
    await expect(ligne.locator('[data-prevenir-l]')).toHaveText('Préparer le message pour le prévenir (WhatsApp ou SMS)');
    await expect(ligne.locator('[data-vprevenir]')).toBeChecked();

    // 2. « Mandat signé » : rien ne part, le message est prêt en haut du dossier
    await ligne.locator('[data-f="statut"]').selectOption('mandat');
    await ligne.locator('[data-save]').click();
    await expect(ligne.locator('.saved')).toHaveText('Enregistré · message pour le vendeur prêt, en haut du dossier');
    await expect(bloc).toBeVisible();
    await expect(bloc.locator('[data-test="dire-quoi"]')).toContainText('Mandat signé');
    await expect(bloc.locator('[data-test="dire-quoi"]')).toContainText('Le vendeur ne le sait pas encore.');
    await expect(pastille).toHaveText('À prévenir : Mandat signé');
    const wa = bloc.locator('[data-test="dire-wa"]');
    await expect(wa).toBeVisible();
    const href = await wa.getAttribute('href');
    expect(href.startsWith('https://wa.me/33611223344?text=')).toBe(true);
    const message = decodeURIComponent(href.split('?text=')[1]);
    expect(message.split('\n')[0]).toBe('Bonjour Luigia, c\'est Shawez Ali.');
    expect(message).toContain('Merci de votre confiance. La suite : les photos, puis la mise en ligne de l\'annonce.');
    expect(message).not.toMatch(/claude|\bintelligence artificielle\b|automatique|mandataire|€/i);
    const lien = (message.match(/Votre espace : (https?:\/\/\S+\/mon-espace\/\?lien=[A-Za-z0-9_-]+)$/) || [])[1];
    expect(lien, 'le message finit par le lien de son espace').toBeTruthy();
    await expect(bloc.locator('[data-test="dire-texte"]')).toHaveText(message);
    expect(await bloc.locator('[data-test="dire-sms"]').getAttribute('href')).toMatch(/^sms:0611223344\?&body=Bonjour%20Luigia/);
    expect(await bloc.locator('[data-test="dire-mail"]').getAttribute('href')).toContain('mailto:' + email + '?subject=' + encodeURIComponent('Le mandat est signé : la suite'));
    expect(await courrier(request, pour(email), { attente: 1500 }), 'aucun e-mail au vendeur').toHaveLength(0);
    // la promesse court : le message est à envoyer
    expect(await promesse7(page, d.reference)).toMatchObject([{ resultat: 'en_cours', detail: 'Message à envoyer au vendeur (WhatsApp ou SMS) : il est prêt dans le dossier' }]);
    await sansDebordement(page);
    await axe(page, 'à dire au vendeur, message prêt');
    await capture(page, bloc, 'message', info);

    // 3. WhatsApp s'ouvre avec le message ; le dossier note que le vendeur est prévenu
    const [fenetre] = await Promise.all([page.waitForEvent('popup'), wa.click()]);
    await expect.poll(() => fenetre.url(), { message: 'la fenêtre WhatsApp n’a pas encore son adresse' }).toContain('wa.me/33611223344');   // l'adresse arrive un instant après l'ouverture
    await fenetre.close();
    await expect(bloc.locator('[data-test="dire-fait"]')).toHaveText('Noté : vendeur prévenu par WhatsApp (Mandat signé).');
    await expect(bloc.locator('[data-test="dire-quoi"]')).toHaveCount(0);
    await expect(pastille).toBeHidden();
    expect((await vue(page, d.id)).a_dire).toBeNull();
    expect(await promesse7(page, d.reference)).toEqual([]);
    const l = await csv7(page, d.reference);
    expect(l).toHaveLength(1);
    expect(l[0]).toContain(';tenue;');
    expect(l[0]).toContain('Prévenu par WhatsApp (déclaré par l\'agence)');
    await ligne.locator('[data-journal] > summary').click();
    await expect(ligne.locator('[data-journal] li').first()).toContainText('Vendeur prévenu par WhatsApp');
    await expect(ligne.locator('summary [data-test="trace"]')).toContainText('vendeur prévenu par l\'agence');
    await axe(page, 'à dire au vendeur, noté');
    await capture(page, bloc, 'note', info);

    // 4. « Ce n'est pas parti » : la nouvelle redevient à dire, le message est toujours là
    await bloc.locator('[data-dire-annuler]').click();
    await expect(bloc.locator('[data-test="dire-quoi"]')).toContainText('Mandat signé');
    await expect(bloc.locator('[data-test="dire-fait"]')).toHaveCount(0);
    await expect(wa).toBeVisible();
    await expect(pastille).toHaveText('À prévenir : Mandat signé');
    expect(await promesse7(page, d.reference)).toMatchObject([{ resultat: 'en_cours' }]);

    // 5. dit de vive voix : noté aussi
    await bloc.locator('[data-dire-voie="telephone"]').click();
    await expect(bloc.locator('[data-test="dire-fait"]')).toHaveText('Noté : vendeur prévenu de vive voix (Mandat signé).');
    expect((await csv7(page, d.reference))[0]).toContain('Prévenu de vive voix (déclaré par l\'agence)');

    // 6. page rechargée, nouvelle étape : le dossier dit ce qui reste à dire, le message se prépare à la demande
    expect(await api(page, '/admin/demande', { id: d.id, statut: 'annonce' })).toMatchObject({ _status: 200, mail: 'indisponible', demande: { a_dire: { quoi: ['Annonce en ligne'], motifs: ['statut:annonce'] } } });
    await page.goto('/admin/?q=' + d.reference);
    await expect(pastille).toHaveText('À prévenir : Annonce en ligne');
    await expect(bloc.locator('[data-test="dire-quoi"]')).toContainText('Annonce en ligne');
    await expect(bloc.locator('[data-test="dire-wa"]')).toHaveCount(0);
    await bloc.locator('[data-dire-preparer]').click();
    await expect(bloc.locator('[data-test="dire-texte"]')).toContainText('L\'annonce de votre maison est en ligne.');
    await sansDebordement(page);

    // 7. le vendeur ouvre le lien du premier message : son espace, à la bonne étape
    const v = await navigateur(browser, info, SITE_VENDEURS_FERMES);
    await v.page.goto(chemin(lien));
    await expect(v.page.locator('#me-in')).toBeVisible();
    await expect(v.page.locator('#me-titre')).toContainText('Bonjour Luigia');
    await expect(v.page.locator('#me-cards .ee-card [data-test="etape"]')).toHaveText('Annonce en ligne');
    expect((await moi(v.page)).compte).toMatchObject({ email, verifie: true });
    await v.ctx.close();
  });

  test('ce qui reste à dire : la dernière étape seulement, la visite à jour, plusieurs nouvelles en un message', async ({ page, request }) => {
    test.setTimeout(120000);
    await sessionAdmin(page, request);

    // vendeur sans espace (pas d'e-mail) : le message ne parle pas d'un espace qu'il n'a pas, et n'a pas de lien
    const a = await ouvrir(page, { statut: 'mandat' });
    expect(a).toMatchObject({ compte_id: null, a_dire: null });
    expect(await dire(page, a.id)).toBeNull();
    let r = await api(page, '/admin/demande', { id: a.id, statut: 'annonce' });
    expect(r).toMatchObject({ _status: 200, mail: 'indisponible', demande: { a_dire: { quoi: ['Annonce en ligne'] } } });
    let m = await dire(page, a.id);
    expect(m).toMatchObject({ motifs: ['statut:annonce'], quoi: ['Annonce en ligne'], espace: false, sujet: 'Votre annonce est en ligne' });
    expect(m.texte).toBe('Bonjour Luigia, c\'est Shawez Ali.\nL\'annonce de votre maison est en ligne. Dès les premières demandes, j\'organise les visites et je vous tiens au courant.');
    // le statut change encore avant qu'on l'ait dit : seule la dernière étape reste à dire
    r = await api(page, '/admin/demande', { id: a.id, statut: 'visites' });
    expect(r.demande.a_dire).toMatchObject({ quoi: ['Visites en cours'], motifs: ['statut:visites'] });
    m = await dire(page, a.id);
    expect(m.texte).toContain('Les visites commencent. Après chacune, je vous fais mon compte rendu le soir même.');
    expect(m.texte).not.toMatch(/espace|annonce de votre maison/i);
    // case décochée : rien à dire de plus ; retour en arrière : la nouvelle périmée disparaît
    r = await api(page, '/admin/demande', { id: a.id, statut: 'annonce', prevenir: false });
    expect(r.demande.a_dire).toBeNull();
    // une offre puis une étape chez le notaire : deux nouvelles, un seul message, dans l'ordre
    r = await api(page, '/admin/offre', { demande: a.id, montant: 250000, recue_le: aujourdhui(), conditions: 'Sans condition de prêt.' });
    expect(r).toMatchObject({ _status: 201, mail: 'indisponible', demande: { statut: 'offre', a_dire: { quoi: ['Offre reçue'] } } });
    r = await api(page, '/admin/notaire', { demande: a.id, nom: 'Me Durand', coordonnees: '', etapes: { dossier: { fait: true, le: aujourdhui() } } });
    expect(r).toMatchObject({ _status: 200, mail: 'indisponible', demande: { a_dire: { quoi: ['Offre reçue', 'Du nouveau chez le notaire'], motifs: ['statut:offre', 'notaire'] } } });
    m = await dire(page, a.id);
    expect(m.texte.split('\n')).toEqual([
      'Bonjour Luigia, c\'est Shawez Ali.',
      'Une offre vient d\'arriver pour votre maison. Je vous appelle pour vous la présenter : c\'est vous qui décidez.',
      'Une étape de plus est passée chez le notaire : dossier transmis au notaire.',
      'Je reste votre interlocuteur jusqu\'à la signature.',
    ]);
    // jamais de montant dans le message : il se dit de vive voix
    expect(m.texte).not.toMatch(/250|€/);
    // déclarer : il faut une voie connue et des nouvelles vraiment en attente
    expect(await api(page, '/admin/prevenu', { demande: a.id, motifs: m.motifs, voie: 'pigeon' })).toMatchObject({ _status: 400, error: 'champs', champ: 'voie' });
    expect(await api(page, '/admin/prevenu', { demande: a.id, motifs: ['statut:acte'], voie: 'sms' })).toMatchObject({ _status: 409, error: 'rien_a_dire' });
    expect(await api(page, '/admin/prevenu', { demande: a.id, annuler: 999999999 })).toMatchObject({ _status: 404 });
    const p = await api(page, '/admin/prevenu', { demande: a.id, motifs: m.motifs, voie: 'sms' });
    expect(p).toMatchObject({ _status: 200, voie: 'sms', demande: { a_dire: null } });
    expect(await api(page, '/admin/prevenu', { demande: a.id, motifs: m.motifs, voie: 'sms' }), 'un double clic ne note pas deux fois').toMatchObject({ _status: 409 });
    const j = (await api(page, '/admin/journal?demande=' + a.id)).journal;
    expect(j[0]).toMatchObject({ type: 'prevenu', par: 'agence', detail: { motifs: ['statut:offre', 'notaire'], voie: 'sms' } });
    expect(j.filter((e) => e.type === 'prevenu')).toHaveLength(1);
    // dossier arrêté : plus rien à annoncer
    await api(page, '/admin/demande', { id: a.id, statut: 'compromis' });
    expect((await vue(page, a.id)).a_dire).toMatchObject({ quoi: ['Compromis signé'] });
    await api(page, '/admin/demande', { id: a.id, statut: 'pause', raison: 'Vente suspendue' });
    expect((await vue(page, a.id)).a_dire).toBeNull();

    // la visite : confirmée, déplacée (le message suit), annulée (plus rien à dire)
    const b = await ouvrir(page, { contact: { prenom: 'Paul', nom: 'Henry', telephone: '06 22 33 44 55' }, statut: 'appele' });
    const debut = dansDeuxJours();
    r = await api(page, '/admin/visite', { demande: b.id, debut });
    expect(r).toMatchObject({ _status: 200, mail: 'indisponible', demande: { statut: 'visite', a_dire: { quoi: ['Visite confirmée'], motifs: ['visite_fixee'] } } });
    m = await dire(page, b.id);
    expect(m.texte).toMatch(/^Bonjour Paul, c'est Shawez Ali\.\nC'est noté : je viens voir votre bien \S+ \d+ \S+ à 10 h, 30 Rue Bannelier 21000 Dijon\. Comptez 45 minutes/);
    expect(m.texte).toContain('le titre de propriété, la dernière taxe foncière, les diagnostics');
    const plusTard = new Date(Date.parse(debut) + 3600000).toISOString();
    r = await api(page, '/admin/visite', { demande: b.id, debut: plusTard });
    expect(r.demande.a_dire).toMatchObject({ motifs: ['visite_fixee'] });
    expect((await dire(page, b.id)).texte).toContain('à 11 h, 30 Rue Bannelier');
    await api(page, '/admin/visite', { demande: b.id, annuler: true });
    expect((await vue(page, b.id)).a_dire).toBeNull();
    expect(await dire(page, b.id)).toBeNull();

    // le compte rendu : dans le message quand le vendeur n'a pas d'espace ; dans son espace quand il en a un
    const c = await ouvrir(page, { contact: { prenom: 'Anne', nom: 'Petit', telephone: '06 33 44 55 66' }, statut: 'visites' });
    r = await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: aujourdhui(), texte: 'Un couple de Fontaine, très intéressé par le jardin.', publie: true });
    expect(r).toMatchObject({ _status: 201, mail: 'indisponible', demande: { a_dire: { quoi: ['Compte rendu de visite'] } } });
    expect((await dire(page, c.id)).texte).toBe('Bonjour Anne, c\'est Shawez Ali.\nCompte rendu de la visite d\'aujourd\'hui :\nUn couple de Fontaine, très intéressé par le jardin.');
    const email = emailTest('vendeur');
    const e = await ouvrir(page, { contact: { prenom: 'Marc', nom: 'Roy', email }, statut: 'visites' });
    await api(page, '/admin/compte-rendu', { demande: e.id, visite_le: aujourdhui(), texte: 'Deux visites, une seconde visite demandée.', publie: true });
    m = await dire(page, e.id);
    expect(m.espace).toBe(true);
    expect(m.texte).toMatch(/^Bonjour Marc, c'est Shawez Ali\.\nLe compte rendu de la visite d'aujourd'hui est dans votre espace\.\nUne question \? Appelez-moi au 07 67 57 92 28\.\nLe compte rendu : http:\/\/127\.0\.0\.1:8791\/mon-espace\/\?lien=[A-Za-z0-9_-]{20,}$/);
    expect(m.texte).not.toContain('Deux visites');
    // l'avis de valeur déposé (PDF fait ailleurs) : annoncé lui aussi
    expect(await courrier(request, pour(email), { attente: 1000 })).toHaveLength(0);
  });

  test('droits : seule l\'agence lit le message et déclare', async ({ page, request, browser }, info) => {
    await page.goto('/admin/');
    expect((await api(page, '/admin/dire', { demande: 1 }))._status).toBe(401);
    expect((await api(page, '/admin/prevenu', { demande: 1, motifs: ['statut:mandat'], voie: 'sms' }))._status).toBe(401);
    expect((await api(page, '/admin/dossier/modifier', { demande: 1, contact: { prenom: 'X', nom: 'Y', telephone: '06 11 22 33 44' } }))._status).toBe(401);
    const v = await navigateur(browser, info, SITE);
    await estimationComplete(v.page);
    expect(await api(v.page, '/admin/dire', { demande: 1 })).toMatchObject({ _status: 403, error: 'interdit' });
    expect(await api(v.page, '/admin/prevenu', { demande: 1, motifs: ['statut:mandat'], voie: 'sms' })).toMatchObject({ _status: 403 });
    expect(await api(v.page, '/admin/dossier/modifier', { demande: 1, contact: { prenom: 'X', nom: 'Y', telephone: '06 11 22 33 44' } })).toMatchObject({ _status: 403 });
    await v.ctx.close();
    await sessionAdmin(page, request);
    expect((await api(page, '/admin/dire', { demande: 999999999 }))._status).toBe(404);
    expect((await api(page, '/admin/prevenu', { demande: 999999999, motifs: ['statut:mandat'], voie: 'sms' }))._status).toBe(404);
  });

  test('corriger un dossier dans /admin/ : le formulaire dans la ligne, l\'adresse dans la liste, le journal', async ({ page, request }, info) => {
    test.setTimeout(120000);
    await sessionAdmin(page, request);
    const d = await ouvrir(page, { contact: { prenom: 'Luiga', nom: 'Rosi', telephone: '06 11 22 33 44' }, bien: { adresse: 'rue Bannelier Dijon', code_postal: '', commune: '', citycode: '', lat: null, lon: null, surface: null } });
    expect(d).toMatchObject({ surface: null, compte_id: null });
    await page.goto('/admin/?q=' + d.reference);
    const ligne = page.locator('#ad-rows .ee-row');
    await expect(ligne).toHaveCount(1);
    const bouton = ligne.locator('[data-dmodif]');
    await expect(bouton).toHaveText('Corriger ce dossier');
    await bouton.click();
    const f = page.locator('#ad-nv');
    await expect(f).toBeVisible();
    await expect(bouton).toHaveAttribute('aria-expanded', 'true');
    await expect(f.locator('h3')).toHaveText('Corriger ce dossier');
    // ce qui est connu est déjà rempli ; rien sur le statut ni les notes (ils se changent dans le dossier)
    await expect(page.locator('#nv-prenom')).toHaveValue('Luiga');
    await expect(page.locator('#nv-nom')).toHaveValue('Rosi');
    await expect(page.locator('#nv-tel')).toHaveValue('06 11 22 33 44');
    await expect(page.locator('#nv-email')).toHaveValue('');
    await expect(page.locator('#nv-adresse')).toHaveValue('rue Bannelier Dijon');
    await expect(page.locator('#nv-type')).toHaveValue('maison');
    await expect(page.locator('#nv-statut')).toHaveCount(0);
    await expect(page.locator('#nv-notes')).toHaveCount(0);
    await expect(page.locator('#nv-ok')).toHaveText('Enregistrer les corrections');
    await axe(page, 'corriger un dossier');
    // un téléphone faux est refusé sur place
    await page.locator('#nv-tel').fill('12');
    await page.locator('#nv-ok').click();
    await expect(f.locator('.field.err')).toHaveCount(1);
    // on corrige : le nom, le téléphone, l'adresse choisie dans la liste, la surface
    await page.locator('#nv-prenom').fill('Luigia');
    await page.locator('#nv-nom').fill('Rossi');
    await page.locator('#nv-tel').fill('06 99 88 77 66');
    await page.locator('#nv-adresse').fill('30 rue bannelier dijon');
    await page.locator('#nv-sugg li').first().click();
    await expect(page.locator('#nv-picked')).toHaveText('Adresse retenue : 30 Rue Bannelier 21000 Dijon');
    await page.locator('#nv-surface').fill('118');
    await sansDebordement(page);
    await capture(page, f, 'corriger', info);
    await page.locator('#nv-ok').click();
    await expect(f).toHaveCount(0);
    await expect(ligne).toHaveCount(1);
    await expect(ligne).toHaveAttribute('open', '');
    await expect(ligne.locator('[data-modif-ok]')).toHaveText('Dossier corrigé : nom, téléphone, adresse, surface.');
    await expect(ligne.locator(':scope > summary')).toContainText('Luigia Rossi · Dijon');
    await expect(ligne.locator(':scope > summary small')).toContainText('Maison 118 m²');
    await expect(ligne.locator('a[href^="tel:"]').first()).toHaveAttribute('href', 'tel:0699887766');
    await expect(ligne.locator('.ee-fiche')).toContainText('30 Rue Bannelier 21000 Dijon');
    const n = await vue(page, d.id);
    expect(n).toMatchObject({ commune: 'Dijon', surface: 118, type: 'maison', origine: 'agence', statut: 'appele', notes: '' });
    expect(n.contact).toMatchObject({ prenom: 'Luigia', nom: 'Rossi', telephone: '06 99 88 77 66' });
    expect(n.reponses).toMatchObject({ lat: 47.32396, lon: 5.03633, code_postal: '21000', citycode: '21231', surface: 118, origine: 'agence' });
    expect(n.trace).toMatchObject({ type: 'dossier_modifie', par: 'agence' });
    await ligne.locator('[data-journal] > summary').click();
    await expect(ligne.locator('[data-journal] li').first()).toContainText('Dossier corrigé : nom, téléphone, adresse, surface');
    // l'adresse reconnue et la surface : l'avis de valeur propose maintenant les ventes réelles
    const avis = await api(page, '/admin/avis?demande=' + d.id);
    expect(avis._status).toBe(200);
    expect(avis.donnees.bien).toMatchObject({ adresse: '30 Rue Bannelier 21000 Dijon', surface: 118 });
    expect(avis.donnees.candidats.length).toBeGreaterThan(0);
    // rouvert sans rien changer : rien n'est noté
    await ligne.locator('[data-dmodif]').click();
    await expect(page.locator('#nv-adresse')).toHaveValue('30 Rue Bannelier 21000 Dijon');
    await expect(page.locator('#nv-picked')).toHaveText('Adresse retenue : 30 Rue Bannelier 21000 Dijon');
    await page.locator('#nv-ok').click();
    await expect(ligne.locator('[data-modif-ok]')).toHaveText('Rien n\'a changé.');
    expect((await api(page, '/admin/journal?demande=' + d.id)).journal.filter((e) => e.type === 'dossier_modifie')).toHaveLength(1);
    expect((await vue(page, d.id)).reponses).toMatchObject({ lat: 47.32396, code_postal: '21000', surface: 118 });
    // « Annuler » referme sans rien toucher
    await ligne.locator('[data-dmodif]').click();
    await page.locator('#nv-annuler').click();
    await expect(page.locator('#ad-nv')).toHaveCount(0);
    await sansDebordement(page);
  });

  test('corriger : l\'e-mail et l\'espace, la fourchette en ligne, ce qui est refusé', async ({ page, request, browser }, info) => {
    test.setTimeout(180000);
    await sessionAdmin(page, request);
    const modifier = (corps) => api(page, '/admin/dossier/modifier', corps);
    const C = { prenom: 'Luigia', nom: 'Rossi', telephone: '06 11 22 33 44' };

    // 1. dossier sans espace : on ajoute son e-mail, puis son espace s'ouvre avec
    const a = await ouvrir(page);
    const email = emailTest('vendeur');
    expect(await modifier({ demande: a.id })).toMatchObject({ _status: 400, error: 'champs' });
    expect(await modifier({ demande: a.id, contact: { ...C, prenom: '', nom: '' } })).toMatchObject({ _status: 400, champ: 'nom_vendeur' });
    expect(await modifier({ demande: a.id, contact: { ...C, telephone: '12' } })).toMatchObject({ _status: 400, champ: 'telephone' });
    expect(await modifier({ demande: a.id, contact: { ...C, telephone: '', email: '' } })).toMatchObject({ _status: 400, champ: 'telephone' });
    expect(await modifier({ demande: a.id, contact: { ...C, email: 'pas-une-adresse' } })).toMatchObject({ _status: 400, champ: 'email' });
    expect(await modifier({ demande: a.id, contact: { ...C, email: 'Shawez@Gravelin-Immo.com' } })).toMatchObject({ _status: 400, champ: 'email_agence' });
    expect(await modifier({ demande: a.id, bien: { ...BIEN, type: 'chateau' } })).toMatchObject({ _status: 400, champ: 'type' });
    expect(await modifier({ demande: a.id, bien: { ...BIEN, adresse: '' } })).toMatchObject({ _status: 400, champ: 'adresse' });
    expect(await modifier({ demande: a.id, bien: { ...BIEN, lat: 12 } })).toMatchObject({ _status: 400, champ: 'adresse' });
    expect(await modifier({ demande: a.id, bien: { ...BIEN, surface: -3 } })).toMatchObject({ _status: 400, champ: 'surface' });
    expect((await vue(page, a.id)).trace.type, 'un refus ne change rien').toBe('ouverture');
    let r = await modifier({ demande: a.id, contact: { ...C, email: '  ' + email.toUpperCase() } });
    expect(r).toMatchObject({ _status: 200, champs: ['e-mail'], demande: { compte_id: null, contact: { email } } });
    r = await api(page, '/admin/dossier/espace', { demande: a.id, prevenir: false });
    expect(r).toMatchObject({ _status: 200, demande: { compte_email: email } });
    // un fonds de commerce : le type change, la nature aussi
    r = await modifier({ demande: a.id, bien: { ...BIEN, type: 'autre', autre_type: 'commerce', surface: 80 } });
    expect(r).toMatchObject({ _status: 200, champs: ['type de bien', 'surface'], demande: { type: 'autre', surface: 80, reponses: { autre_type: 'commerce', origine: 'agence' } } });
    r = await modifier({ demande: a.id, bien: { ...BIEN, type: 'appartement', surface: 80 } });
    expect(r.demande.reponses.autre_type).toBeUndefined();

    // 2. faute de frappe dans l'e-mail, espace jamais ouvert : le dossier passe à la bonne adresse, l'espace ouvert par erreur est retiré
    const faux = emailTest('fautif'), bon = emailTest('bon');
    const b = await ouvrir(page, { contact: { email: faux } });
    const ancien = b.compte_id;
    const lienFaux = (await api(page, '/admin/compte/lien', { id: ancien, type: 'acces', jours: 7, demande: b.id })).lien;
    r = await modifier({ demande: b.id, contact: { ...C, email: bon } });
    expect(r).toMatchObject({ _status: 200, champs: ['e-mail'], demande: { compte_email: bon, en_attente: false, contact: { email: bon } } });
    expect(r.demande.compte_id).not.toBe(ancien);
    const comptes = (await api(page, '/admin/comptes')).comptes;
    expect(comptes.some((c) => c.email === faux)).toBe(false);
    expect(comptes.find((c) => c.email === bon)).toMatchObject({ demandes: 1, prenom: 'Luigia' });
    // le lien préparé pour la mauvaise adresse ne marche plus ; celui de la bonne ouvre le dossier
    const v = await navigateur(browser, info, SITE_VENDEURS_FERMES);
    await v.page.goto(chemin(lienFaux));
    await expect(v.page.locator('#me-out')).toBeVisible();
    await expect(v.page.locator('#me-flash')).toContainText('n\'est plus valable');
    const lienBon = (await api(page, '/admin/compte/lien', { id: r.demande.compte_id, type: 'acces', jours: 7, demande: b.id })).lien;
    await v.page.goto(chemin(lienBon));
    await expect(v.page.locator('#me-in')).toBeVisible();
    expect((await moi(v.page)).demandes).toHaveLength(1);
    await v.ctx.close();

    // 3. le vendeur a ouvert son espace : son e-mail ne se change plus ici ; son nom dans l'espace reste le sien
    r = await modifier({ demande: b.id, contact: { ...C, email: emailTest('autre') } });
    expect(r).toMatchObject({ _status: 409, error: 'espace_utilise' });
    r = await modifier({ demande: b.id, contact: { prenom: 'Louise', nom: 'Rossi', telephone: '06 55 44 33 22' } });
    expect(r).toMatchObject({ _status: 200, champs: ['nom', 'téléphone'], demande: { compte_email: bon, contact: { prenom: 'Louise', email: bon } } });
    expect((await api(page, '/admin/comptes')).comptes.find((c) => c.email === bon)).toMatchObject({ prenom: 'Luigia', telephone: '06 11 22 33 44' });
    await page.goto('/admin/?q=' + b.reference);
    const ligne = page.locator('#ad-rows .ee-row');
    await ligne.locator('[data-dmodif]').click();
    await expect(page.locator('#nv-email')).toHaveValue(bon);
    await expect(page.locator('#nv-email')).toHaveAttribute('readonly', '');
    await expect(page.locator('#nv-email-fige')).toHaveText('Il a déjà ouvert son espace avec cet e-mail : il ne se change plus ici.');
    await axe(page, 'corriger un dossier, e-mail figé');
    await page.locator('#nv-annuler').click();

    // 4. jamais ouvert, le nom corrigé suit dans l'espace (le vendeur lira « Bonjour Luigia », pas « Luiga »)
    const e2 = emailTest('vendeur');
    const c = await ouvrir(page, { contact: { prenom: 'Luiga', email: e2 } });
    r = await modifier({ demande: c.id, contact: { ...C, email: e2 } });
    expect(r).toMatchObject({ _status: 200, champs: ['nom'], demande: { compte_id: c.compte_id } });
    expect((await api(page, '/admin/comptes')).comptes.find((x) => x.email === e2)).toMatchObject({ prenom: 'Luigia' });
  });
});

test.describe('estimation en ligne et e-mails ouverts', () => {
  test('la fourchette en ligne fige l\'adresse et la surface ; vendeur avec espace : l\'e-mail part, rien à dire ; sans espace : le message', async ({ page, request, browser }, info) => {
    test.setTimeout(180000);
    // une estimation faite en ligne, avec sa fourchette
    const v = await navigateur(browser, info, SITE);
    const { contact, reponse } = await estimationComplete(v.page);
    expect(reponse.corps.resultat.fourchette).toBe(true);
    await v.ctx.close();
    await sessionAdmin(page, request);
    const d = (await api(page, '/admin/demandes')).demandes.find((x) => x.contact.email === contact.email);
    expect(d.prix_bas).toBeGreaterThan(0);
    // le bien ne se corrige pas (la fourchette a été calculée dessus) ; le téléphone, oui
    expect(await api(page, '/admin/dossier/modifier', { demande: d.id, bien: { ...BIEN } })).toMatchObject({ _status: 409, error: 'bien_fige' });
    const r = await api(page, '/admin/dossier/modifier', { demande: d.id, contact: { civilite: 'Mme', prenom: contact.prenom, nom: contact.nom, telephone: '06 00 11 22 33' } });
    expect(r).toMatchObject({ _status: 200, champs: ['téléphone'], demande: { prix_bas: d.prix_bas, surface: d.surface, adresse: d.adresse, compte_email: contact.email } });
    await page.goto('/admin/?q=' + d.reference);
    const ligne = page.locator('#ad-rows .ee-row');
    await ligne.locator('[data-dmodif]').click();
    await expect(page.locator('#ad-nv .meta')).toContainText('L\'adresse et la surface viennent de son estimation en ligne');
    await expect(page.locator('#nv-adresse')).toHaveCount(0);
    await expect(page.locator('#nv-surface')).toHaveCount(0);
    await expect(page.locator('#nv-tel')).toHaveValue('06 00 11 22 33');
    await expect(page.locator('#nv-email')).toHaveAttribute('readonly', '');         // il a ouvert son espace en faisant son estimation
    await page.locator('#nv-tel').fill('06 00 11 22 44');
    await page.locator('#nv-ok').click();
    await expect(ligne.locator('[data-modif-ok]')).toHaveText('Dossier corrigé : téléphone.');
    await sansDebordement(page);

    // e-mails ouverts, vendeur avec espace : l'e-mail part, rien ne reste à dire
    await viderBoite(request);
    const s = await api(page, '/admin/demande', { id: d.id, statut: 'appele' });
    expect(s).toMatchObject({ _status: 200, mail: 'envoye', demande: { a_dire: null } });
    expect(await courrier(request, pour(contact.email, /Suite à notre échange/))).toHaveLength(1);
    // la case promet bien un e-mail
    await expect(ligne.locator('[data-prevenir-l]')).toHaveText('Annoncer le changement de statut au vendeur par e-mail');
    await expect(ligne.locator('[data-bloc="dire"]')).toBeHidden();

    // e-mails ouverts, vendeur sans espace : l'e-mail ne peut pas partir, le message est prêt
    const a = await ouvrir(page, { statut: 'avis' });
    const t = await api(page, '/admin/demande', { id: a.id, statut: 'mandat' });
    expect(t).toMatchObject({ _status: 200, mail: 'indisponible', demande: { a_dire: { quoi: ['Mandat signé'] } } });
    const m = await dire(page, a.id);
    expect(m).toMatchObject({ espace: false });
    expect(m.texte).toBe('Bonjour Luigia, c\'est Shawez Ali.\nMerci de votre confiance. La suite : les photos, puis la mise en ligne de l\'annonce.');
    // son espace ouvert ensuite : le message gagne le lien
    const email = emailTest('vendeur');
    await api(page, '/admin/dossier/espace', { demande: a.id, email, prevenir: false });
    const m2 = await dire(page, a.id);
    expect(m2.espace).toBe(true);
    expect(m2.texte).toMatch(/Vous suivez chaque étape dans votre espace\.\nVotre espace : http:\/\/127\.0\.0\.1:8788\/mon-espace\/\?lien=/);
  });
});

/* ------------------------------------------------------------------------------------------------------------- */

test('les messages : jamais un espace que le vendeur n\'a pas, toujours le lien quand il en a un', () => {
  const lien = 'https://shawez-immo.com/mon-espace/?lien=abcdefghijklmnopqrstuvwxyz';
  const contenus = [
    ...['appele', 'avis', 'mandat', 'annonce', 'visites', 'offre', 'compromis', 'acte'].flatMap((s) => [mailStatut(s, { bien: 'votre maison' }), mailStatut(s, { bien: 'votre maison', visiteEnCours: true })]),
    mailVisite('confirmation', { debut: '2026-10-13T08:00:00Z', adresse: '30 Rue Bannelier 21000 Dijon' }),
    mailVisite('confirmation', { debut: '2026-10-13T08:00:00Z', adresse: '', deplacee: true }),
    mailCompteRendu('2026-10-10', '2026-10-10', 'Un couple, très intéressé.'),
    mailCompteRendu('2026-10-09', '2026-10-10', 'x'.repeat(900)),
    mailCompteRendu('2026-10-09', '2026-10-10'),
    mailOffre('votre maison', true), mailOffre('votre bien', false),
    mailNotaire(['Dossier transmis au notaire'], ''), mailNotaire([], '2026-11-20'), mailNotaire(['Accord de prêt de l\'acheteur', 'Droit de préemption de la mairie levé'], '2026-11-20'),
  ];
  expect(contenus.every(Boolean)).toBe(true);
  for (const c of contenus) {
    const n = [{ dire: c.paragraphes, direct: c.direct, lien: c.lien }];
    const sans = messageVendeur(n, { prenom: 'Luigia' });
    const avec = messageVendeur(n, { prenom: 'Luigia', lien });
    expect(sans, c.sujet).not.toMatch(/espace|https?:/i);
    expect(sans.split('\n')[0]).toBe('Bonjour Luigia, c\'est Shawez Ali.');
    expect(avec.endsWith(' : ' + lien), c.sujet).toBe(true);
    for (const t of [sans, avec]) {
      expect(t, c.sujet).not.toMatch(/claude|mandataire|undefined|null|\bIA\b|€/i);
      expect(t.length, 'un message court').toBeLessThan(900);
      expect(t.split('\n').every((l) => l.trim().length > 0), 'pas de ligne vide').toBe(true);
    }
  }
  // un compte rendu trop long pour un message se fait de vive voix
  expect(messageVendeur([{ dire: contenus[19].paragraphes, direct: contenus[19].direct }], {})).toBe('Bonjour, c\'est Shawez Ali.\nJe vous appelle pour vous faire le compte rendu de la visite du vendredi 9 octobre.');
  // plusieurs nouvelles : un seul message, sans répéter deux fois la même phrase
  const deux = messageVendeur([{ dire: mailOffre('votre maison', true).paragraphes }, { dire: mailOffre('votre maison', false).paragraphes }], { prenom: 'Luigia', lien });
  expect(deux.match(/Je vous appelle pour vous la présenter/g)).toHaveLength(1);
  expect(libelleNouvelle('statut:mandat')).toBe('Mandat signé');
  expect(libelleNouvelle('statut:appele')).toBe('Suite de votre appel : la visite');
  expect(libelleNouvelle('visite_fixee')).toBe('Visite confirmée');
  expect(libelleNouvelle('autre')).toBe('Du nouveau');
});

test('promesse 7 : prévenu par l\'agence dans les temps, trop tard, ou jamais', () => {
  const now = new Date('2026-10-10T13:00:00Z');
  const demandes = [], evenements = [];
  let k = 0;
  const ev = (demande_id, cree_le, type, detail = null, de = null, vers = null) => evenements.push({ id: ++k, demande_id, type, de, vers, detail: detail ? JSON.stringify(detail) : null, cree_le });
  const D = (id, statut) => demandes.push({ id, reference: 'E-' + id, contact: JSON.stringify({ prenom: 'V' + id, email: `v${id}@exemple-test.fr` }), commune: 'Dijon', cree_le: '2026-10-01T08:00:00Z', statut, statut_le: null, suspect: 0, prix_bas: null });
  const ferme = (id, t, motif) => ev(id, t, 'mail', { motif, sujet: 's', envoye: false, raison: 'email_clients_ferme', dire: ['…'] });
  // 1 : mandat à 10 h, WhatsApp à 10 h 04 → tenue, 4 min
  D(1, 'mandat'); ev(1, '2026-10-10T08:00:00Z', 'statut', null, 'avis', 'mandat'); ferme(1, '2026-10-10T08:00:01Z', 'statut:mandat'); ev(1, '2026-10-10T08:04:00Z', 'prevenu', { motifs: ['statut:mandat'], voie: 'whatsapp' });
  // 2 : annonce hier à 9 h, SMS ce matin à 9 h (24 h après) → ratée, trop tard
  D(2, 'annonce'); ev(2, '2026-10-09T07:00:00Z', 'statut', null, 'mandat', 'annonce'); ferme(2, '2026-10-09T07:00:01Z', 'statut:annonce'); ev(2, '2026-10-10T07:00:00Z', 'prevenu', { motifs: ['statut:annonce'], voie: 'sms' });
  // 3 : compromis il y a une heure, message pas encore envoyé → en cours
  D(3, 'compromis'); ev(3, '2026-10-10T12:00:00Z', 'statut', null, 'offre', 'compromis'); ferme(3, '2026-10-10T12:00:01Z', 'statut:compromis');
  // 4 : acte avant-hier, message jamais envoyé → ratée
  D(4, 'acte'); ev(4, '2026-10-08T08:00:00Z', 'statut', null, 'compromis', 'acte'); ferme(4, '2026-10-08T08:00:01Z', 'statut:acte');
  // 5 : visite fixée (le statut change sans annonce, le message de confirmation en tient lieu), dite de vive voix
  D(5, 'visite'); ev(5, '2026-10-10T09:00:00Z', 'statut', null, 'appele', 'visite'); ferme(5, '2026-10-10T09:00:01Z', 'visite_fixee'); ev(5, '2026-10-10T09:10:00Z', 'prevenu', { motifs: ['visite_fixee'], voie: 'telephone' });
  // 6 : une déclaration pour une autre nouvelle ne vaut pas pour le statut
  D(6, 'mandat'); ev(6, '2026-10-10T08:00:00Z', 'statut', null, 'avis', 'mandat'); ferme(6, '2026-10-10T08:00:01Z', 'statut:mandat'); ev(6, '2026-10-10T08:05:00Z', 'prevenu', { motifs: ['notaire'], voie: 'whatsapp' });
  // 7 : prévenu la veille pour une autre étape : ne compte pas pour celle d'aujourd'hui
  D(7, 'annonce'); ev(7, '2026-10-09T08:00:00Z', 'statut', null, 'avis', 'mandat'); ferme(7, '2026-10-09T08:00:01Z', 'statut:mandat'); ev(7, '2026-10-09T08:02:00Z', 'prevenu', { motifs: ['statut:mandat'], voie: 'whatsapp' });
  ev(7, '2026-10-10T12:30:00Z', 'statut', null, 'mandat', 'annonce'); ferme(7, '2026-10-10T12:30:01Z', 'statut:annonce');
  const m = mesurer({ demandes, evenements, visites: [], comptes_rendus: [], fichiers: [], notaires: [] }, now).filter((x) => x.p === 7);
  const de = (id) => m.filter((x) => x.demande === id).map((x) => ({ resultat: x.resultat, delai: x.delai, detail: x.detail }));
  expect(de(1)).toEqual([{ resultat: 'tenue', delai: 4, detail: 'Prévenu par WhatsApp (déclaré par l\'agence)' }]);
  expect(de(2)).toEqual([{ resultat: 'ratee', delai: 1440, detail: 'Prévenu par SMS, trop tard (déclaré par l\'agence)' }]);
  expect(de(3)).toEqual([{ resultat: 'en_cours', delai: null, detail: 'Message à envoyer au vendeur (WhatsApp ou SMS) : il est prêt dans le dossier' }]);
  expect(de(4)).toEqual([{ resultat: 'ratee', delai: null, detail: 'Pas prévenu : e-mails aux vendeurs pas encore ouverts, message jamais envoyé' }]);
  expect(de(5)).toEqual([{ resultat: 'tenue', delai: 10, detail: 'Prévenu de vive voix (déclaré par l\'agence)' }]);
  expect(de(6)).toEqual([{ resultat: 'en_cours', delai: null, detail: 'Message à envoyer au vendeur (WhatsApp ou SMS) : il est prêt dans le dossier' }]);
  expect(de(7)).toEqual([
    { resultat: 'tenue', delai: 2, detail: 'Prévenu par WhatsApp (déclaré par l\'agence)' },
    { resultat: 'en_cours', delai: null, detail: 'Message à envoyer au vendeur (WhatsApp ou SMS) : il est prêt dans le dossier' },
  ]);
});
