/* Système parfait, étape 3 : après le mandat. Dans /admin/, par dossier : comptes rendus de visite (brouillon ou
   publié), offres (montant, date, conditions, où elles en sont), notaire (nom, étapes), documents (nature). Le vendeur
   retrouve tout dans /mon-espace/. E-mails courts au vendeur, jamais entre 21 h et 8 h (ils partent à 8 h).
   /admin/ s'ouvre par un lien reçu par e-mail, sans mot de passe. Captures → captures/etape3-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { fausseBan, estimationComplete, moi, api, viderBoite, courrier, pour, sessionAdmin, emailTest, ADMIN, SITE } from './aides.mjs';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

async function client(browser, info, o = {}, c = {}) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const page = await ctx.newPage();
  await fausseBan(page);
  const r = await estimationComplete(page, o, c);
  return { ctx, page, ...r, ref: r.reponse.corps.reference, id: r.reponse.corps.demande_id };
}
/* Appel à l'API avec une heure donnée (serveur de test) : pour vérifier les heures calmes. */
const apiA = (page, chemin, corps, heure) => page.evaluate(async ([c, b, h]) => {
  const r = await fetch('/api/espace' + c, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(h ? { 'X-Horloge-Test': h } : {}) }, body: JSON.stringify(b) });
  let d = {}; try { d = await r.json(); } catch (e) { /* pas de JSON */ }
  d._status = r.status; return d;
}, [chemin, corps, heure]);
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const plus = (jour, n) => new Date(new Date(jour + 'T12:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const fr = (jour) => jour.split('-').reverse().join('/');
const sansDebordement = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'rien ne dépasse de l\'écran').toBeLessThanOrEqual(1);
async function axe(page, nom) {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).include('.ee').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect.soft(r.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`), `accessibilité de l'écran « ${nom} »`).toEqual([]);
}
/* Capture d'un élément, sans l'en-tête fixe du site. */
async function capture(page, cible, nom, info, max = 2600) {
  const el = typeof cible === 'string' ? page.locator(cible).first() : cible;
  await el.scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: '#nav,#stickybar,.sim-peek{display:none!important}' });
  const b = await el.boundingBox();
  const defile = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await page.screenshot({ path: `captures/etape3-${info.project.name}-${nom}.png`, fullPage: true, clip: { x: Math.max(0, b.x + defile.x - 8), y: Math.max(0, b.y + defile.y - 8), width: b.width + 16, height: Math.min(max, b.height + 16) } });
}

test('après le mandat : comptes rendus, offres, notaire et documents saisis dans /admin/, vus par le vendeur', async ({ page, request, browser }, info) => {
  test.setTimeout(300000);
  const c = await client(browser, info, { atouts: ['balcon', 'cave'] }, { prenom: 'Claire', nom: 'Martin' });
  const pc = c.page;
  await sessionAdmin(page, request);
  expect(await api(page, '/admin/demande', { id: c.id, statut: 'annonce', prevenir: false })).toMatchObject({ _status: 200 });
  // avant toute saisie : le vendeur ne voit aucune de ces parties
  let d = (await moi(pc)).demandes[0];
  expect(d).toMatchObject({ comptes_rendus: [], offres: [], notaire: null });

  await page.goto('/admin/?q=' + c.ref);
  const ligne = page.locator('#ad-rows .ee-row');
  const cr = ligne.locator('[data-bloc="cr"]'), of = ligne.locator('[data-bloc="offres"]'), nt = ligne.locator('[data-bloc="notaire"]');
  // annonce en ligne : le bloc des comptes rendus est ouvert, les deux autres repliés
  await expect(cr.locator('[data-cr-f="texte"]')).toBeVisible();
  await expect(cr.locator('summary')).toContainText('aucun');
  await expect(of.locator('[data-of-f="montant"]')).toBeHidden();
  await expect(nt.locator('[data-nt-f="nom"]')).toBeHidden();

  /* ---------- 1. comptes rendus de visite ---------- */
  await viderBoite(request);
  await cr.locator('[data-cr-save]').click();
  await expect(cr.locator('.ee-err')).toContainText('Écrivez ou dictez');
  await expect(cr.locator('[data-cr-f="visite_le"]')).toHaveValue(aujourdhui());
  await cr.locator('[data-cr-f="texte"]').fill('Couple avec deux enfants, déjà propriétaire à Talant.\nIls ont aimé le séjour traversant et le balcon. Question sur les charges.\nIls reviennent samedi avec leurs parents.');
  await cr.locator('[data-cr-save]').click();
  await expect(cr.locator('.ee-ok')).toContainText('Compte rendu publié dans l\'espace du vendeur · e-mail envoyé au vendeur.');
  await expect(cr.locator('.ee-items li')).toHaveCount(1);
  await expect(cr.locator('.ee-items .tag')).toHaveText('Publié');
  await expect(cr.locator('summary')).toContainText('1 publié');
  // les visites ont commencé : le dossier passe à « Visites en cours », sans second e-mail
  await expect(ligne.locator('summary .st')).toHaveText('Visites en cours');
  const mailsCr = await courrier(request, pour(c.contact.email));
  expect(mailsCr.map((m) => m.subject)).toEqual(['Compte rendu de la visite d\'aujourd\'hui']);
  expect(mailsCr[0].text).toContain('Bonjour Claire,');
  expect(mailsCr[0].text).toContain('est dans votre espace');
  expect(mailsCr[0].text).toContain('Shawez Ali');
  expect(mailsCr[0].text + mailsCr[0].html, 'rien ne dit qui a écrit le message').not.toMatch(/claude|anthropic|\bIA\b|intelligence artificielle/i);
  // le formulaire est prêt pour la visite suivante
  await expect(cr.locator('[data-cr-f="texte"]')).toHaveValue('');

  // un brouillon : le vendeur ne le voit pas ; publié ensuite d'un clic
  await viderBoite(request);
  await cr.locator('[data-cr-f="visite_le"]').fill(plus(aujourdhui(), -1));
  await cr.locator('[data-cr-f="texte"]').fill('Investisseur. Visite rapide, il compare avec deux autres biens.');
  await cr.locator('[data-cr-f="publie"]').uncheck();
  await cr.locator('[data-cr-save]').click();
  await expect(cr.locator('.ee-ok')).toContainText('Brouillon enregistré');
  await expect(cr.locator('summary')).toContainText('1 publié · 1 brouillon');
  d = (await moi(pc)).demandes[0];
  expect(d.comptes_rendus.length).toBe(1);
  expect(d.comptes_rendus[0]).toMatchObject({ visite_le: aujourdhui() });
  expect(d.comptes_rendus[0].texte).toContain('séjour traversant');
  expect(d.statut).toBe('visites');
  expect((await courrier(request, pour(c.contact.email), { attente: 1200 })).length).toBe(0);
  // corriger le brouillon
  const brouillon = cr.locator('.ee-items li', { hasText: 'Investisseur' });
  await brouillon.locator('[data-cr-modifier]').click();
  await expect(cr.locator('[data-cr-f="texte"]')).toHaveValue(/Investisseur/);
  await expect(cr.locator('[data-cr-save]')).toHaveText('Enregistrer les changements');
  await cr.locator('[data-cr-f="texte"]').fill('Investisseur. Visite rapide : il compare avec deux autres biens et répond lundi.');
  await cr.locator('[data-cr-save]').click();
  await expect(cr.locator('.ee-ok')).toContainText('Brouillon enregistré');
  await expect(cr.locator('.ee-items li')).toHaveCount(2);
  await cr.locator('.ee-items li', { hasText: 'répond lundi' }).locator('[data-cr-publier]').click();
  await expect(cr.locator('.ee-ok')).toContainText('Compte rendu publié');
  await expect(cr.locator('summary')).toContainText('2 publiés');
  const [mailHier] = await courrier(request, pour(c.contact.email, /Compte rendu de la visite du /));
  expect(mailHier, 'e-mail du compte rendu de la veille : la date en toutes lettres').toBeTruthy();
  expect(mailHier.subject).not.toContain('aujourd');
  // un compte rendu ne se date pas dans le futur ; un texte vide est refusé
  expect(await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: plus(aujourdhui(), 2), texte: 'Demain.', publie: true })).toMatchObject({ _status: 400, champ: 'visite_le' });
  expect(await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: aujourdhui(), texte: '   ', publie: true })).toMatchObject({ _status: 400, champ: 'texte' });
  expect(await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: '2026-02-31', texte: 'x' })).toMatchObject({ _status: 400, champ: 'visite_le' });
  // un troisième, puis supprimé (avec confirmation)
  const r3 = await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: aujourdhui(), texte: 'Saisi par erreur.', publie: true, prevenir: false });
  expect(r3).toMatchObject({ _status: 201, mail: 'non' });
  await page.reload();
  await expect(cr.locator('.ee-items li')).toHaveCount(3);
  const erreur = cr.locator('.ee-items li', { hasText: 'Saisi par erreur' });
  await erreur.locator('[data-cr-suppr]').click();
  await expect(erreur.locator('[data-cr-suppr]')).toHaveText('Confirmer la suppression');
  await erreur.locator('[data-cr-suppr]').click();
  await expect(cr.locator('.ee-ok')).toContainText('Compte rendu supprimé');
  await expect(cr.locator('.ee-items li')).toHaveCount(2);

  /* ---------- 2. offres ---------- */
  await viderBoite(request);
  // visites en cours : le bloc des offres est ouvert lui aussi
  await expect(of.locator('[data-of-f="montant"]')).toBeVisible();
  await of.locator('[data-of-save]').click();
  await expect(of.locator('.ee-err')).toContainText('montant de l\'offre');
  await of.locator('[data-of-f="montant"]').fill('205000');
  await of.locator('[data-of-f="conditions"]').fill('Prêt de 150 000 € sur 20 ans, accord de principe de la banque.\nSignature de l\'acte souhaitée avant fin janvier.');
  await of.locator('[data-of-save]').click();
  await expect(of.locator('.ee-ok')).toContainText('Offre enregistrée : le vendeur la voit dans son espace · e-mail envoyé au vendeur.');
  await expect(of.locator('.ee-items li')).toHaveCount(1);
  await expect(of.locator('.ee-items .prix, .ee-items .t b').first()).toHaveText('205 000 €');
  await expect(of.locator('.ee-items .tag')).toHaveText('À l\'étude');
  // le dossier passe à « Offre reçue » ; la prochaine action porte le montant et une échéance
  await expect(ligne.locator('summary .st')).toHaveText('Offre reçue');
  await expect(ligne.locator('[data-test="action"]')).toContainText('Présenter l\'offre de 205 000 € au vendeur · avant');
  const [mailOffre] = await courrier(request, pour(c.contact.email, /^Une offre est arrivée$/));
  expect(mailOffre, 'e-mail « une offre est arrivée »').toBeTruthy();
  expect(mailOffre.text, 'pas de montant dans l\'e-mail').not.toContain('205');
  // une seconde offre : même statut, un e-mail « nouvelle offre »
  await viderBoite(request);
  await of.locator('[data-of-f="montant"]').fill('198500');
  await of.locator('[data-of-f="recue_le"]').fill(plus(aujourdhui(), -1));
  await of.locator('[data-of-f="conditions"]').fill('Sans prêt.');
  await of.locator('[data-of-save]').click();
  await expect(of.locator('.ee-items li')).toHaveCount(2);
  await expect(of.locator('summary')).toContainText('2 offres · 2 à l\'étude');
  expect((await courrier(request, pour(c.contact.email, /^Une nouvelle offre est arrivée$/))).length).toBe(1);
  // la plus récente d'abord
  await expect(of.locator('.ee-items li').first()).toContainText('205 000 €');
  // corriger un montant
  const seconde = of.locator('.ee-items li', { hasText: 'Sans prêt' });
  await seconde.locator('[data-of-modifier]').click();
  await expect(of.locator('[data-of-f="montant"]')).toHaveValue('198500');
  await of.locator('[data-of-f="montant"]').fill('199000');
  await of.locator('[data-of-save]').click();
  await expect(of.locator('.ee-ok')).toContainText('Offre modifiée');
  await expect(seconde).toContainText('199 000 €');
  // où en est chaque offre : enregistré dès le choix
  await of.locator('.ee-items li', { hasText: '205 000' }).locator('[data-of-statut]').selectOption('acceptee');
  await expect(of.locator('.ee-ok')).toContainText('Offre de 205 000 € : acceptée');
  await expect(of.locator('.ee-items li', { hasText: '205 000' }).locator('.tag')).toHaveText('Acceptée');
  await expect(ligne.locator('[data-test="action"]')).toContainText('Présenter l\'offre de 199 000 € au vendeur');
  await seconde.locator('[data-of-statut]').selectOption('refusee');
  await expect(of.locator('.ee-ok')).toContainText('refusée');
  await expect(ligne.locator('[data-test="action"]')).toContainText('Offre acceptée : préparer le compromis avec le notaire');
  // montants et dates absurdes refusés
  expect(await api(page, '/admin/offre', { demande: c.id, montant: 12 })).toMatchObject({ _status: 400, champ: 'montant' });
  expect(await api(page, '/admin/offre', { demande: c.id, montant: 200000, recue_le: plus(aujourdhui(), 3) })).toMatchObject({ _status: 400, champ: 'recue_le' });
  expect(await api(page, '/admin/offre', { demande: c.id, montant: 200000, statut: 'gagnee' })).toMatchObject({ _status: 400, champ: 'statut' });

  /* ---------- 3. notaire ---------- */
  await viderBoite(request);
  await nt.locator('summary').click();
  await nt.locator('[data-nt-f="nom"]').fill('Maître Lefèvre');
  await nt.locator('[data-nt-f="coordonnees"]').fill('12 place Darcy, 21000 Dijon · 03 80 00 00 00');
  const acte = plus(aujourdhui(), 75);
  await nt.locator('[data-nt-etape="dossier"] [data-nt-fait]').check();
  await nt.locator('[data-nt-etape="dossier"] [data-nt-le]').fill(aujourdhui());
  await nt.locator('[data-nt-etape="rdv"] [data-nt-le]').fill(acte);
  await nt.locator('[data-nt-save]').click();
  await expect(nt.locator('.ee-ok')).toContainText('Enregistré : le vendeur le voit dans son espace · e-mail envoyé au vendeur.');
  await expect(nt.locator('summary')).toContainText('Maître Lefèvre · 1 étape passée');
  const [mailNotaire] = await courrier(request, pour(c.contact.email, /Signature de l'acte prévue le /));
  expect(mailNotaire, 'e-mail « du nouveau chez le notaire »').toBeTruthy();
  expect(mailNotaire.text).toContain('dossier transmis au notaire');
  expect(mailNotaire.text).toContain('La signature de l\'acte est prévue le ');
  // enregistrer sans rien changer : pas de nouvel e-mail
  await viderBoite(request);
  await nt.locator('[data-nt-save]').click();
  await expect(nt.locator('.ee-ok')).toContainText('Enregistré : le vendeur le voit dans son espace.');
  expect((await courrier(request, pour(c.contact.email), { attente: 1200 })).length).toBe(0);
  expect(await api(page, '/admin/notaire', { demande: c.id, nom: 'x', etapes: { pret: { fait: true, le: '31/12/2026' } } })).toMatchObject({ _status: 400, champ: 'etapes' });

  /* ---------- 4. documents ---------- */
  await ligne.locator('[data-doc-nature]').selectOption('mandat');
  await ligne.locator('input[data-depot="document"]').setInputFiles({ name: 'mandat-signe.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(ligne.locator('.ee-files .ee-ok')).toContainText('Fichier ajouté');
  await expect(ligne.locator('.ee-files .ee-flist li')).toContainText('Mandat · déposé par l\'agence, visible par le vendeur');
  await ligne.locator('[data-doc-nature]').selectOption('');
  await ligne.locator('input[data-depot="document"]').setInputFiles({ name: 'plan-du-lot.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(ligne.locator('.ee-files .ee-flist li')).toHaveCount(2);
  expect(await page.evaluate(async (id) => (await fetch('/api/espace/admin/fichier?demande=' + id + '&role=document&libelle=secret', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: '%PDF-1.4 x' })).status, c.id)).toBe(400);

  // le journal du dossier garde tout
  await ligne.locator('[data-journal] summary').click();
  const journal = ligne.locator('[data-journal] ul');
  await expect(journal).toContainText('Compte rendu publié (visite du ' + fr(aujourdhui()) + ', le jour même)');
  await expect(journal).toContainText('Offre reçue : 205 000 €');
  await expect(journal).toContainText('Offre de 205 000 € : acceptée');
  await expect(journal).toContainText('Notaire : Maître Lefèvre · Dossier transmis au notaire · acte prévu le ' + fr(acte));
  await expect(journal).toContainText('Document déposé : Mandat · mandat-signe.pdf');
  await sansDebordement(page);
  await axe(page, 'admin, comptes rendus, offres et notaire ouverts');
  await capture(page, ligne.locator('[data-suite]'), 'admin-suite', info);

  /* ---------- 5. le vendeur voit tout, proprement ---------- */
  await pc.goto('/mon-espace/');
  const carte = pc.locator('#me-cards .ee-card').first();
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Offre reçue');
  // offre acceptée, plus rien à l'étude : la prochaine étape est le compromis
  await expect(carte.locator('[data-test="suite"]')).toContainText('La signature du compromis, chez le notaire.');
  const pOffres = carte.locator('[data-test="offres"]'), pCr = carte.locator('[data-test="comptes-rendus"]'), pNt = carte.locator('[data-test="notaire"]'), pDocs = carte.locator('[data-test="documents"]');
  await expect(pOffres.locator('h4')).toHaveText('Offres reçues');
  await expect(pOffres.locator('li')).toHaveCount(2);
  await expect(pOffres.locator('li').first()).toContainText('205 000 €');
  await expect(pOffres.locator('li').first()).toContainText('Acceptée');
  await expect(pOffres.locator('li').first()).toContainText('Reçue le ' + fr(aujourdhui()));
  await expect(pOffres.locator('li').first()).toContainText('Prêt de 150 000 € sur 20 ans');
  await expect(pOffres.locator('li').nth(1)).toContainText('199 000 €');
  await expect(pOffres.locator('li').nth(1)).toContainText('Refusée');
  await expect(pCr.locator('li')).toHaveCount(2);
  await expect(pCr.locator('li').first()).toContainText('Ils reviennent samedi avec leurs parents.');
  await expect(pCr.locator('li').nth(1)).toContainText('répond lundi');
  await expect(pCr).not.toContainText('Saisi par erreur');
  // les retours à la ligne dictés sont gardés
  expect(await pCr.locator('li .txt').first().evaluate((e) => getComputedStyle(e).whiteSpace)).toBe('pre-line');
  await expect(pNt).toContainText('Maître Lefèvre');
  await expect(pNt).toContainText('12 place Darcy');
  await expect(pNt.locator('li.fait')).toHaveCount(1);
  await expect(pNt.locator('li.fait')).toContainText('Dossier transmis au notaire');
  await expect(pNt.locator('li', { hasText: 'Rendez-vous de signature' })).toContainText('prévu le ' + fr(acte));
  await expect(pDocs.locator('li')).toHaveCount(2);
  await expect(pDocs.locator('li').first()).toContainText('Mandat');
  await expect(pDocs.locator('li').first()).toContainText('mandat-signe.pdf');
  await expect(pDocs.locator('li').first()).toContainText('déposé par Shawez');
  // le vendeur télécharge le mandat, ne peut pas le retirer
  await expect(pDocs.locator('[data-suppr]')).toHaveCount(0);
  const [dl] = await Promise.all([pc.waitForEvent('download'), pDocs.locator('li a').first().click()]);
  expect(dl.suggestedFilename()).toBe('mandat-signe.pdf');
  // ses propres fichiers restent à part
  await carte.locator('input[data-ajout]').setInputFiles({ name: 'taxe-fonciere.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(carte.locator('.ee-files .ee-ok')).toContainText('Fichier ajouté');
  await expect(carte.locator('.ee-files .ee-flist li')).toHaveCount(1);
  await expect(carte.locator('.ee-files .lab')).toHaveText('Vos photos et documents');
  await sansDebordement(pc);
  await axe(pc, 'espace du vendeur, offres, comptes rendus, notaire, documents');
  await capture(pc, carte, 'espace-vendeur', info, 4200);

  /* ---------- 6. droits : tout cela est réservé à l'agence ---------- */
  expect(await api(pc, '/admin/suite?demande=' + c.id)).toMatchObject({ _status: 403 });
  expect(await api(pc, '/admin/compte-rendu', { demande: c.id, visite_le: aujourdhui(), texte: 'x', publie: true })).toMatchObject({ _status: 403 });
  expect(await api(pc, '/admin/offre', { demande: c.id, montant: 300000 })).toMatchObject({ _status: 403 });
  expect(await api(pc, '/admin/notaire', { demande: c.id, nom: 'x' })).toMatchObject({ _status: 403 });
  // un autre vendeur ne voit rien de ce dossier
  const autre = await client(browser, info, { adresse: '12 rue musette dijon', surface: '55' }, { prenom: 'Luc', nom: 'Autre' });
  const da = (await moi(autre.page)).demandes;
  expect(da.length).toBe(1);
  expect(da[0]).toMatchObject({ comptes_rendus: [], offres: [], notaire: null, fichiers: [] });
  await autre.ctx.close();
  // sans connexion
  await api(pc, '/deconnexion', {});
  expect(await api(pc, '/admin/suite?demande=' + c.id)).toMatchObject({ _status: 401 });

  /* ---------- 7. supprimer le dossier efface sa suite ---------- */
  expect(await api(page, '/admin/demande/supprimer', { id: c.id })).toMatchObject({ _status: 200 });
  expect(await api(page, '/admin/suite?demande=' + c.id)).toMatchObject({ _status: 404 });
  await c.ctx.close();
});

test('heures calmes : rien ne part au vendeur entre 21 h et 8 h, tout part à 8 h', async ({ page, request, browser }, info) => {
  test.setTimeout(240000);
  const c = await client(browser, info, {}, { prenom: 'Nadia', nom: 'Soir' });
  await sessionAdmin(page, request);
  await page.goto('/admin/?q=' + c.ref);
  await api(page, '/admin/demande', { id: c.id, statut: 'visites', prevenir: false });
  const j = aujourdhui();
  const soir = `${j}T20:30:00Z`;                       // 22 h 30 à Paris l'été, 21 h 30 l'hiver
  const tot = `${plus(j, 1)}T05:30:00Z`;               // 7 h 30 ou 6 h 30
  const matin = `${plus(j, 1)}T07:05:00Z`;             // 9 h 05 ou 8 h 05
  await viderBoite(request);

  // 22 h 30 : Shawez publie le compte rendu de la visite du jour → visible tout de suite, e-mail gardé
  const r = await apiA(page, '/admin/compte-rendu', { demande: c.id, visite_le: j, texte: 'Visite de 19 h : un couple, très intéressé.', publie: true }, soir);
  expect(r).toMatchObject({ _status: 201, mail: 'differe' });
  expect((await moi(c.page)).demandes[0].comptes_rendus.length, 'le compte rendu est dans l\'espace le soir même').toBe(1);
  // une offre saisie le soir : statut « Offre reçue » tout de suite, e-mail gardé
  const o = await apiA(page, '/admin/offre', { demande: c.id, montant: 180000 }, soir);
  expect(o).toMatchObject({ _status: 201, mail: 'differe' });
  expect(o.demande.statut).toBe('offre');
  // une visite d'estimation fixée le soir, puis déplacée le lendemain matin avant 8 h : la première confirmation ne partira pas
  const jv = plus(j, 6);
  expect(await apiA(page, '/admin/visite', { demande: c.id, debut_local: `${jv}T10:00` }, soir)).toMatchObject({ _status: 200, mail: 'differe' });
  expect(await apiA(page, '/admin/visite', { demande: c.id, debut_local: `${jv}T15:00` }, tot)).toMatchObject({ _status: 200, mail: 'differe' });
  expect((await courrier(request, pour(c.contact.email), { attente: 1500 })).length, 'aucun e-mail pendant les heures calmes').toBe(0);
  // l'agence le voit dans le journal
  await page.reload();
  const ligne = page.locator('#ad-rows .ee-row');
  await ligne.locator('[data-journal] summary').click();
  await expect(ligne.locator('[data-journal] ul')).toContainText('E-mail non envoyé : Une offre est arrivée (gardé pour 8 h)');

  // 7 h 30 : toujours rien ; 9 h 05 : tout part, une seule fois
  expect((await (await request.get(`${SITE}/api/espace/taches?maintenant=${tot}`)).json()).courriers).toBe(0);
  expect((await courrier(request, pour(c.contact.email), { attente: 1000 })).length).toBe(0);
  const envoi = await (await request.get(`${SITE}/api/espace/taches?maintenant=${matin}`)).json();
  expect(envoi.courriers).toBeGreaterThanOrEqual(3);
  const recus = await courrier(request, (m) => m.to.includes(c.contact.email) && /15 h/.test(m.subject));
  expect(recus.length, 'la confirmation de la visite à 15 h').toBe(1);
  const tous = (await courrier(request, pour(c.contact.email))).map((m) => m.subject);
  expect(tous.filter((s) => /^Compte rendu de la visite du /.test(s)).length, 'le compte rendu, daté en toutes lettres (plus « aujourd\'hui »)').toBe(1);
  expect(tous.filter((s) => s === 'Une offre est arrivée').length).toBe(1);
  expect(tous.filter((s) => /10 h/.test(s)).length, 'la visite de 10 h a été déplacée : sa confirmation ne part pas').toBe(0);
  expect(tous.length).toBe(3);
  expect((await (await request.get(`${SITE}/api/espace/taches?maintenant=${matin}`)).json()).courriers).toBe(0);
  expect((await courrier(request, pour(c.contact.email), { attente: 1000 })).length).toBe(3);
  await page.reload();
  await ligne.locator('[data-journal] summary').click();
  await expect(ligne.locator('[data-journal] ul')).toContainText('(plus d\'actualité)');
  // en journée, tout part tout de suite (comportement habituel)
  await viderBoite(request);
  expect(await apiA(page, '/admin/offre', { demande: c.id, montant: 185000 }, `${plus(j, 1)}T12:00:00Z`)).toMatchObject({ _status: 201, mail: 'envoye' });
  expect((await courrier(request, pour(c.contact.email, /^Une nouvelle offre est arrivée$/))).length).toBe(1);
  // le rappel de visite ne se garde pas pour le lendemain (il dirait « demain » le jour même)
  expect((await (await request.get(`${SITE}/api/espace/taches?maintenant=${plus(jv, -1)}T20:30:00Z`)).json()).rappels).toBe(0);
  await c.ctx.close();
});

test('/admin/ s\'ouvre par un lien reçu par e-mail, sans mot de passe', async ({ page, request }) => {
  test.setTimeout(120000);
  await page.goto('/mon-espace/');
  await api(page, '/deconnexion', {});
  await page.goto('/admin/?q=E-TEST');
  const f = page.locator('#ad-lien');
  await expect(f).toBeVisible();
  await f.locator('#ad-lien-btn').click();
  await expect(f.locator('.field.err .msg')).toBeVisible();
  // une adresse qui n'est pas celle de l'agence : même réponse, aucun lien vers /admin/
  await viderBoite(request);
  const intrus = emailTest('intrus');
  await f.locator('#ad-email').fill(intrus);
  await f.locator('#ad-lien-btn').click();
  await expect(f.locator('.ee-ok')).toContainText('Si cette adresse est celle de l\'agence');
  expect((await courrier(request, pour(intrus), { attente: 1500 })).length).toBe(0);
  // l'agence
  await f.locator('#ad-email').fill(' ' + ADMIN.toUpperCase() + ' ');
  await f.locator('#ad-lien-btn').click();
  const [m] = await courrier(request, pour(ADMIN, /lien de connexion à l'espace agence/));
  expect(m, 'e-mail du lien de connexion à l\'espace agence').toBeTruthy();
  const lien = (m.text.match(/https?:\/\/[^\s"<]+\/admin\/\?lien=[A-Za-z0-9_-]+/) || [])[0];
  expect(lien, 'le lien ouvre /admin/').toBeTruthy();
  await page.goto(lien.replace(/^https?:\/\/[^/]+/, '') + '&q=E-TEST');
  await expect(page.locator('#ad-in')).toBeVisible();
  // le jeton a quitté l'adresse, la recherche est gardée
  expect(page.url()).not.toContain('lien=');
  expect(page.url()).toContain('q=E-TEST');
  await expect(page.locator('#ad-q')).toHaveValue('E-TEST');
  // le lien ne sert qu'une fois
  await api(page, '/deconnexion', {});
  await page.goto(lien.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('#ad-lien .ee-err')).toContainText('n\'est plus valable');
  // un client qui demande « vers admin » reçoit un lien vers son espace, pas vers /admin/
  const cl = emailTest('client');
  expect(await api(page, '/inscription', { civilite: 'Mme', prenom: 'Lina', nom: 'Test', email: cl, telephone: '06 11 22 33 44', mot_de_passe: 'motdepasse-solide', consentement: true })).toMatchObject({ _status: 201 });
  await viderBoite(request);
  expect(await api(page, '/lien', { email: cl, vers: 'admin' })).toMatchObject({ _status: 200, envoye: true });
  const [mc] = await courrier(request, pour(cl, /lien de connexion/));
  expect(mc.text).toContain('/mon-espace/?lien=');
  expect(mc.text).not.toContain('/admin/');
});
