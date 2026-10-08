/* Suivi après la demande : espace agence (accès, statut, rappel, notes, filtres, export CSV, avis de valeur PDF),
   espace client (avancement, téléchargement de l'avis, photos et documents), flux Google Sheet. */
import { test, expect } from '@playwright/test';
import { fausseBan, estimationComplete, moi, api, emailTest, viderBoite, connexionParLien, ADMIN, SITE } from './aides.mjs';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
// PNG 1×1
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* Ouvre une session admin : l'agence demande son lien de connexion (son compte est créé à la première demande). */
async function sessionAdmin(page, request) {
  await page.goto('/mon-espace/');
  await api(page, '/deconnexion', {});
  await connexionParLien(page, request, ADMIN);
  expect((await moi(page)).compte.admin).toBe(true);
}

test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('/admin/ : refusé sans connexion, refusé à un client', async ({ page }) => {
  await page.goto('/admin/');
  await expect(page.locator('#ad-no')).toBeVisible();
  await expect(page.locator('#ad-in')).toBeHidden();
  for (const chemin of ['/admin/demandes', '/admin/comptes', '/admin/export.csv?quoi=demandes']) {
    expect((await api(page, chemin))._status).toBe(401);
  }
  await estimationComplete(page);
  await page.goto('/admin/');
  await expect(page.locator('#ad-no-txt')).toContainText('n\'a pas accès');
  expect((await api(page, '/admin/demandes'))).toMatchObject({ _status: 403, error: 'interdit' });
  expect((await api(page, '/admin/demande', { id: 1, statut: 'visite' }))._status).toBe(403);
  expect((await api(page, '/admin/compte/lien', { id: 1 }))._status).toBe(403);
  expect((await api(page, '/admin/flux', {}))._status).toBe(403);
  await expect(page.locator('#me-admin')).toHaveCount(0);
});

test('/admin/ : quelqu\'un ouvre un compte avec l\'adresse de l\'agence → il reste dehors, et perd la main dès que l\'agence se connecte', async ({ page, request, browser }, info) => {
  // (dans une base neuve ; si le compte de l'agence existe déjà, l'inscription est simplement refusée)
  const intrus = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pi = await intrus.newPage();
  await pi.goto('/mon-espace/');
  const r = await api(pi, '/inscription', { prenom: 'Faux', nom: 'Admin', email: ADMIN, telephone: '0600000000', mot_de_passe: 'Tentative-2026', consentement: true });
  if (r._status === 201) {
    expect(r.compte.admin).toBe(false);
    expect(await api(pi, '/admin/demandes')).toMatchObject({ _status: 403, error: 'admin_non_verifie' });
    // l'agence, depuis son propre navigateur, demande son lien et l'ouvre
    await sessionAdmin(page, request);
    await expect(page.locator('#me-mdp-ok')).toContainText('le mot de passe choisi avant cette confirmation a été retiré');
    // l'intrus : session fermée, mot de passe retiré
    expect((await moi(pi)).compte).toBeNull();
    expect((await api(pi, '/connexion', { email: ADMIN, mot_de_passe: 'Tentative-2026' }))._status).toBe(401);
    expect((await api(pi, '/admin/demandes'))._status).toBe(401);
  } else {
    expect(r._status).toBe(409);   // le compte de l'agence existe déjà (tests précédents)
  }
  await intrus.close();
});

test('suivi complet : statut, rappel, notes, avis de valeur PDF, photos du client', async ({ page, request, browser }, info) => {
  test.setTimeout(150000);
  // 1. un client fait une estimation
  const client = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pc = await client.newPage();
  await fausseBan(pc);
  const { contact, reponse } = await estimationComplete(pc, { prix: '245000', delai: '6mois' }, { prenom: 'Élodie', nom: 'Besançon' });
  const ref = reponse.corps.reference;

  // 2. l'agence ouvre la demande depuis le lien de l'e-mail d'alerte (/admin/?q=référence)
  await sessionAdmin(page, request);
  await page.goto('/admin/?q=' + ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne).toHaveCount(1);
  await expect(ligne.locator('summary')).toContainText('Mme Élodie Besançon');
  await expect(ligne.locator('summary .st')).toHaveText('Nouvelle');
  await expect(ligne).toHaveAttribute('open', '');
  await expect(ligne).toContainText('245 000 €');
  await expect(ligne).toContainText('shawez-immo.com');
  await expect(ligne.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:0612345678');

  // 3. statut « Appelé », rappel avant une date, notes
  await ligne.locator('[data-f="statut"]').selectOption('appele');
  await ligne.locator('[data-f="rappel_le"]').fill('2026-10-12');
  await ligne.locator('[data-f="notes"]').fill('Souhaite vendre au printemps. Rappeler lundi matin.');
  await ligne.locator('[data-save]').click();
  await expect(ligne.locator('.saved')).toHaveText('Enregistré');
  await expect(ligne.locator('summary .st')).toHaveText('Appelé');
  await page.reload();
  await expect(ligne.locator('[data-f="statut"]')).toHaveValue('appele');
  await expect(ligne.locator('[data-f="rappel_le"]')).toHaveValue('2026-10-12');
  await expect(ligne.locator('[data-f="notes"]')).toHaveValue('Souhaite vendre au printemps. Rappeler lundi matin.');
  await expect(ligne.locator('summary')).toContainText('rappeler avant le 12/10/2026');
  // date de rappel invalide : refusée par le serveur
  expect((await api(page, '/admin/demande', { id: 1, rappel_le: '12/10/2026' }))._status).toBe(400);

  // 4. le client voit l'avancement : « Demande reçue » (le détail interne « Appelé » ne lui est pas montré)
  await pc.goto('/mon-espace/');
  const carte = pc.locator('#me-cards .ee-card').first();
  await expect(carte.locator('.ee-tl li[aria-current="step"]')).toHaveText('Demande reçue');
  await expect(carte).not.toContainText('Rappeler lundi');

  // 5. visite prévue
  await ligne.locator('[data-f="statut"]').selectOption('visite');
  await ligne.locator('[data-save]').click();
  await expect(ligne.locator('.saved')).toHaveText('Enregistré');
  await pc.reload();
  await expect(carte.locator('.ee-tl li[aria-current="step"]')).toHaveText('Visite prévue');

  // 6. l'agence dépose l'avis de valeur : PDF seulement
  await ligne.locator('input[data-depot="avis"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG });
  await expect(ligne.locator('.ee-files .ee-err')).toContainText('doit être un fichier PDF');
  await ligne.locator('input[data-depot="avis"]').setInputFiles({ name: 'Avis-de-valeur-Besancon.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(ligne.locator('.ee-files .ee-ok')).toContainText('Avis de valeur déposé');
  await expect(ligne.locator('.ee-flist li')).toHaveCount(1);
  await expect(ligne.locator('summary .st')).toHaveText('Avis de valeur envoyé');   // le statut suit

  // 7. le client le télécharge
  await pc.reload();
  await expect(carte.locator('.ee-tl li[aria-current="step"]')).toHaveText('Avis de valeur envoyé');
  const bouton = carte.locator('.ee-avis a');
  await expect(bouton).toContainText('Télécharger mon avis de valeur (PDF)');
  const [dl] = await Promise.all([pc.waitForEvent('download'), bouton.click()]);
  expect(dl.suggestedFilename()).toBe('Avis-de-valeur-Besancon.pdf');
  const chemin = await dl.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(chemin).equals(PDF)).toBe(true);

  // 8. le client ajoute une photo et un document ; un fichier refusé donne un message clair
  await carte.locator('input[data-ajout]').setInputFiles([{ name: 'séjour.png', mimeType: 'image/png', buffer: PNG }, { name: 'taxe-fonciere.pdf', mimeType: 'application/pdf', buffer: PDF }]);
  await expect(carte.locator('.ee-files .ee-ok')).toContainText('2 fichiers ajoutés');
  await expect(carte.locator('.ee-flist li')).toHaveCount(2);
  await expect(carte.locator('.ee-flist li').first()).toContainText('séjour.png');
  // nom avec accents : gardé tel quel, et annoncé au navigateur dans les règles (RFC 5987)
  const sejour = (await moi(pc)).demandes[0].fichiers.find((f) => f.nom === 'séjour.png');
  const entete = await pc.evaluate(async (id) => (await fetch('/api/espace/fichier?id=' + id)).headers.get('content-disposition'), sejour.id);
  expect(entete).toBe(`inline; filename="s_jour.png"; filename*=UTF-8''s%C3%A9jour.png`);
  await carte.locator('input[data-ajout]').setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ' + 'x'.repeat(200)) });
  await expect(carte.locator('.ee-files .ee-err')).toContainText('Format non accepté');
  // un faux PDF (extension .pdf, contenu texte) est refusé aussi : on regarde le contenu, pas le nom
  await carte.locator('input[data-ajout]').setInputFiles({ name: 'faux.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<script>alert(1)</script>') });
  await expect(carte.locator('.ee-files .ee-err')).toContainText('Format non accepté');
  // plus de 10 Mo : refusé
  const gros = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024 + 10, 32)]);
  await carte.locator('input[data-ajout]').setInputFiles({ name: 'trop-gros.pdf', mimeType: 'application/pdf', buffer: gros });
  await expect(carte.locator('.ee-files .ee-err')).toContainText('10 Mo');
  await expect(carte.locator('.ee-flist li')).toHaveCount(2);

  // 9. l'agence voit les fichiers du client ; un autre client n'y a pas accès
  await page.reload();
  await expect(ligne.locator('.ee-flist li')).toHaveCount(3);
  const fichiers = (await moi(pc)).demandes[0].fichiers;
  expect(fichiers.map((f) => f.role).sort()).toEqual(['avis', 'document', 'photo']);
  const intrus = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pi = await intrus.newPage();
  await fausseBan(pi);
  await pi.goto('/mon-espace/');
  expect((await api(pi, '/fichier?id=' + fichiers[0].id))._status).toBe(401);
  await estimationComplete(pi);
  expect((await api(pi, '/fichier?id=' + fichiers[0].id))._status).toBe(404);
  expect((await api(pi, '/fichier/supprimer', { id: fichiers[0].id }))._status).toBe(404);
  await intrus.close();

  // 10. le client retire sa photo ; il ne peut pas retirer l'avis de valeur de l'agence
  await pc.reload();
  const photo = carte.locator('.ee-flist li', { hasText: 'séjour.png' });
  await photo.locator('button').click(); await photo.locator('button').click();
  await expect(carte.locator('.ee-flist li')).toHaveCount(1);
  const avis = fichiers.find((f) => f.role === 'avis');
  expect((await api(pc, '/fichier/supprimer', { id: avis.id }))._status).toBe(404);

  // 11. filtres et export CSV
  await page.locator('#ad-site').selectOption('gravelin');
  await expect(page.locator('#ad-rows')).toContainText('Aucune demande');
  await page.locator('#ad-site').selectOption('shawez');
  await page.locator('#ad-statut').selectOption('avis');
  await expect(ligne).toHaveCount(1);
  await expect(page.locator('#ad-export')).toHaveAttribute('href', /site=shawez&statut=avis/);
  const [csv] = await Promise.all([page.waitForEvent('download'), page.locator('#ad-export').click()]);
  expect(csv.suggestedFilename()).toMatch(/^demandes-\d{4}-\d{2}-\d{2}\.csv$/);
  const texte = readFileSync(await csv.path(), 'utf8');
  expect(texte.charCodeAt(0)).toBe(0xFEFF);
  const lignes = texte.slice(1).split('\r\n');
  expect(lignes[0].split(';').slice(0, 5)).toEqual(['référence', 'reçue le', 'site', 'statut', 'rappeler avant']);
  const la = lignes.find((l) => l.startsWith(ref));
  expect(la).toContain(';shawez;Avis de valeur envoyé;2026-10-12;Mme;Élodie;Besançon;' + contact.email);
  expect(lignes.filter((l) => l && !l.startsWith('référence')).every((l) => l.includes(';shawez;Avis de valeur envoyé;'))).toBe(true);

  // 12. flux Google Sheet : les colonnes demandées, la ligne de la demande, statut et prochaine action
  const sansCle = await request.get(SITE + '/api/espace/flux/site.csv?cle=' + 'x'.repeat(43));
  expect(sansCle.status()).toBe(403);
  const formule = await api(page, '/admin/flux', {});
  expect(formule.formule).toMatch(/^=IMPORTDATA\("http:\/\/127\.0\.0\.1:8788\/api\/espace\/flux\/site\.csv\?cle=[A-Za-z0-9_-]{40,}"\)$/);
  const flux = await request.get(formule.adresse);
  expect(flux.status()).toBe(200);
  const tableau = (await flux.text()).split('\r\n').map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  expect(tableau[0].slice(0, 17)).toEqual(['date', 'site', 'civilité', 'prénom', 'nom', 'téléphone', 'e-mail', 'adresse du bien', 'type', 'surface', 'fourchette', 'délai de vente', 'prix idéal', 'statut', 'prochaine action', 'notes', 'référence']);
  const l = tableau.find((x) => x[16] === ref);
  expect(l.slice(1, 10)).toEqual(['shawez', 'Mme', 'Élodie', 'Besançon', '06 12 34 56 78', contact.email, '30 Rue Bannelier 21000 Dijon', 'Appartement', '72 m²']);
  expect(l[10]).toMatch(/^\d{3} \d{3} € – \d{3} \d{3} €$/);
  expect(l.slice(11, 16)).toEqual(['Dans les 6 mois', '245 000 €', 'avis envoyé', 'Relancer avant le 12/10/2026', 'Souhaite vendre au printemps. Rappeler lundi matin.']);
  expect(l[0]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  // l'ancienne clé ne marche plus dès qu'une nouvelle est créée
  const nouvelle = await api(page, '/admin/flux', {});
  expect((await request.get(formule.adresse)).status()).toBe(403);
  expect((await request.get(nouvelle.adresse)).status()).toBe(200);

  // 13. liens à transmettre au client : connexion directe (24 h) et nouveau mot de passe
  await page.locator('[data-vue="comptes"]').click();
  await page.locator('#ad-qc').fill(contact.email);
  const compte = page.locator('#ad-crows .ee-row');
  await expect(compte).toHaveCount(1);
  await compte.locator('summary').click();
  await compte.locator('[data-lien="acces"]').click();
  const lien = await compte.locator('[data-test="lien"]').textContent();
  expect(lien).toMatch(/\/mon-espace\/\?lien=/);
  await expect(compte.locator('[data-lien-out] a', { hasText: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/33612345678/);
  const neuf = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pn = await neuf.newPage();
  await pn.goto(lien);
  await expect(pn.locator('#me-in')).toBeVisible();
  await expect(pn.locator('#me-titre')).toContainText('Bonjour Élodie');
  // c'était la première preuve de l'adresse, faite depuis un autre appareil : l'ancienne session est fermée
  expect((await moi(pc)).compte).toBeNull();
  expect((await moi(pn)).demandes).toHaveLength(1);

  // 14. suppression de la demande (avec ses fichiers)
  await page.locator('[data-vue="demandes"]').click();
  await page.locator('#ad-statut').selectOption('');
  await page.locator('#ad-q').fill(ref);
  await ligne.locator('[data-dsuppr]').click(); await ligne.locator('[data-dsuppr]').click();
  await expect(page.locator('#ad-rows')).toContainText('Aucune demande');
  expect((await moi(pn)).demandes).toHaveLength(0);
  expect((await api(pn, '/fichier?id=' + avis.id))._status).toBe(404);
  await neuf.close();
  await client.close();
});

test('demande venue du site de l\'agence : notée « gravelin », visible avec le filtre', async ({ page, request }) => {
  await page.goto('/estimer/');
  const email = emailTest('gravelin');
  const r = await api(page, '/estimation', {
    reponses: { type: 'appartement', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', lat: 47.32396, lon: 5.03633, delai: 'asap', surface: 60, pieces: 3, chambres: 2, epoque: 'nsp', etat: 'bon', etage: 1, etages_immeuble: 4 },
    consentement: true, duree: 60000, site: 'gravelin', contact: { civilite: 'M.', prenom: 'Paul', nom: 'Agence', email, telephone: '0380000000' },
  });
  expect(r._status).toBe(201);
  await api(page, '/deconnexion', {});
  await sessionAdmin(page, request);
  await page.goto('/admin/');
  await page.locator('#ad-site').selectOption('gravelin');
  await page.locator('#ad-q').fill(r.reference);
  await expect(page.locator('#ad-rows .ee-row')).toHaveCount(1);
  await expect(page.locator('#ad-rows .ee-row summary')).toContainText('gravelin-immo.com');
  const f = await api(page, '/admin/flux', {});
  const flux = await (await request.get(f.adresse)).text();
  expect(flux.split('\r\n').find((l) => l.endsWith(r.reference))).toContain(',gravelin,M.,Paul,Agence,03 80 00 00 00,');
});
