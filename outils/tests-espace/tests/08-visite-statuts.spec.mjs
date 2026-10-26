/* Système parfait, étape 2 : la visite d'estimation réservable (créneaux proposés par le vendeur, confirmation par
   l'agence, e-mails, rappel de la veille), les 10 statuts (frise du vendeur, prochaine action de l'agence, journal,
   e-mail à chaque changement), et les droits sur ces nouvelles routes. */
import { test, expect } from '@playwright/test';
import { fausseBan, estimationComplete, moi, api, viderBoite, courrier, pour, lienDans, sessionAdmin, SITE, jourLibre } from './aides.mjs';

test.beforeEach(async ({ page }) => { await fausseBan(page); });

/* « 2026-10-27 » + « 18:05 » (heure de Paris) → l'instant UTC correspondant, quel que soit le décalage ce jour-là */
const utcDeParis = (jour, hm) => {
  const essai = new Date(`${jour}T${hm}:00Z`);
  const vu = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(essai);
  const [hv, mv] = vu.split(':').map(Number), [h, m] = hm.split(':').map(Number);
  return new Date(essai.getTime() - ((hv * 60 + mv) - (h * 60 + m)) * 60000).toISOString();
};
const capture = (page, info, nom) => page.screenshot({ path: `captures/${info.project.name}-${nom}.png`, fullPage: true });

/* Un client fait son estimation dans son propre navigateur. */
async function client(browser, info, o = {}, c = {}, base = SITE) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL: base });
  const page = await ctx.newPage();
  await fausseBan(page);
  const r = await estimationComplete(page, o, c);
  return { ctx, page, ...r, ref: r.reponse.corps.reference, id: r.reponse.corps.demande_id };
}

test('visite : le vendeur choisit 3 créneaux après le résultat, l\'agence confirme d\'un clic, tout le monde est prévenu', async ({ page, request, browser }, info) => {
  test.setTimeout(180000);
  await viderBoite(request);
  const c = await client(browser, info, {}, { prenom: 'Hélène', nom: 'Roux' });
  const pc = c.page;
  expect(c.id, 'la réponse donne l\'identifiant de la demande').toBeGreaterThan(0);

  // 1. juste après le résultat : le bloc « Visite d'estimation »
  const rdv = pc.locator('#ee-rdv');
  await expect(rdv).toBeVisible();
  await expect(rdv).toContainText('dès que vous le souhaitez');
  await expect(rdv, 'règle n° 10 : aucun délai chiffré dans un texte lu par le vendeur').not.toContainText(/\b(24|48) h\b/);
  await rdv.locator('[data-rdv-ouvrir]').click();
  await expect(rdv.locator('.ee-days .pill').first()).toBeVisible();
  await expect(rdv.locator('.ee-days .pill small'), 'un seul jour marqué « au plus tôt »').toHaveText(['au plus tôt']);
  expect(await rdv.locator('.ee-days .pill').count()).toBe(6);
  // du lundi au vendredi seulement (Règles du Boss du 10/10/2026 : jamais le samedi)
  for (const t of await rdv.locator('.ee-days .pill b').allTextContents()) expect(t).not.toMatch(/^(sam|dim)/);
  // le bouton d'envoi attend un choix
  await expect(rdv.locator('[data-rdv-envoyer]')).toBeDisabled();
  // trois créneaux sur deux jours ; le quatrième est refusé
  const k = await jourLibre(rdv);
  await rdv.locator('.ee-hour').nth(1).click();
  await rdv.locator('.ee-hour').nth(5).click();
  await jourLibre(rdv, 1, k + 1);
  await rdv.locator('.ee-hour').nth(0).click();
  await expect(rdv.locator('.ee-sel li')).toHaveCount(3);
  await expect(rdv.locator('.ee-hour:not([aria-pressed="true"])').first()).toBeDisabled();
  await capture(pc, info, 'visite-1-choix');
  // rien ne dépasse de l'écran
  expect(await pc.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await rdv.locator('[data-rdv-envoyer]').click();
  await expect(rdv.locator('[data-test="visite-demandee"]')).toBeVisible();
  await expect(rdv).toContainText('confirme l\'un d\'eux au plus vite');
  await capture(pc, info, 'visite-2-envoyee');
  // un rechargement ne perd rien
  await pc.reload();
  await expect(pc.locator('#ee-rdv [data-test="visite-demandee"]')).toBeVisible();

  // 2. l'agence est prévenue par e-mail, avec les trois créneaux
  const [alerte] = await courrier(request, pour('shawez@gravelin-immo.com', /Visite demandée/));
  expect(alerte, 'alerte « visite demandée »').toBeTruthy();
  expect(alerte.subject).toContain('Hélène Roux');
  expect((alerte.text.match(/^- /gm) || []).length).toBe(3);
  expect(alerte.text).toContain('/admin/?q=' + c.ref);

  // 3. dans /admin/ : la prochaine action dit de confirmer ; un clic fixe la visite
  await sessionAdmin(page, request);
  await page.goto('/admin/?q=' + c.ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne).toHaveCount(1);
  await expect(ligne.locator('[data-test="action"]')).toContainText('Confirmer la visite');
  await expect(page.locator('#ad-stats')).toContainText('Visites à confirmer');
  await expect(ligne.locator('[data-vfix]')).toHaveCount(3);
  await capture(page, info, 'admin-1-visite-a-confirmer');
  await viderBoite(request);
  await ligne.locator('[data-vfix]').first().click();
  await expect(ligne.locator('[data-test="visite-fixee"]')).toBeVisible();
  await expect(ligne.locator('summary .st')).toHaveText('Visite prévue');
  await expect(ligne.locator('[data-bloc="visite"] .ee-ok')).toContainText('confirmation envoyée');
  await expect(ligne.locator('[data-test="agenda"]')).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE.*Visite\+d%27estimation\+avec\+Mme\+H/);
  await expect(ligne.locator('[data-test="action"]')).toContainText('Visite d\'estimation');
  await capture(page, info, 'admin-2-visite-fixee');

  // 4. le vendeur reçoit la confirmation : date, adresse, quoi préparer, l'agence et son plan d'accès
  const [conf] = await courrier(request, pour(c.contact.email, /Visite d'estimation confirmée/));
  expect(conf, 'e-mail de confirmation au vendeur').toBeTruthy();
  for (const mot of ['titre de propriété', 'taxe foncière', 'diagnostics', 'charges', 'travaux', '30 rue Bannelier', 'google.com/maps', 'Shawez Ali', '30 Rue Bannelier 21000 Dijon']) expect(conf.text).toContain(mot);
  expect(conf.subject).toMatch(/confirmée : \w+ \d+ \S+ à \d+ h/);
  // le lien de l'e-mail ouvre son espace (7 jours, une fois)
  const lien = lienDans(conf);
  expect(lien).toBeTruthy();

  // 5. dans son espace : étape 3 sur 10, la date, la prochaine étape
  await pc.goto('/mon-espace/');
  const carte = pc.locator('#me-cards .ee-card').first();
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Visite d\'estimation');
  await expect(carte.locator('.ee-etape span')).toHaveText('Étape 3 sur 10');
  await expect(carte.locator('.ee-bar i')).toHaveCount(10);
  await expect(carte.locator('[data-test="visite-fixee"]')).toBeVisible();
  await expect(carte.locator('[data-test="suite"]')).toContainText('avis de valeur, ici, dans la foulée');
  await carte.locator('.ee-frise summary').click();
  await expect(carte.locator('.ee-frise li')).toHaveCount(10);
  await expect(carte.locator('.ee-frise li[aria-current="step"]')).toContainText('Visite d\'estimation');
  await capture(pc, info, 'espace-1-visite-prevue');
  expect(await pc.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  // 6. le vendeur demande un autre créneau : l'agence est prévenue, le dossier reste « Visite prévue »
  await viderBoite(request);
  await carte.locator('[data-rdv-ouvrir]').click();
  await jourLibre(carte, 3, 3);
  await carte.locator('.ee-hour').nth(2).click();
  await carte.locator('[data-rdv-envoyer]').click();
  await expect(carte.locator('[data-test="visite-demandee"]')).toBeVisible();
  const [deplace] = await courrier(request, pour('shawez@gravelin-immo.com', /Visite à déplacer/));
  expect(deplace).toBeTruthy();
  expect((await moi(pc)).demandes[0].statut).toBe('visite');

  // 7. l'agence fixe une autre date, convenue au téléphone (heure de Paris)
  await page.reload();
  await expect(ligne.locator('[data-vfix]')).toHaveCount(1);
  const demain = new Date(Date.now() + 26 * 3600000);
  const local = `${demain.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })}T15:30`;
  await viderBoite(request);
  await ligne.locator('[data-vdate]').fill(local);
  await ligne.locator('[data-vfixdate]').click();
  await expect(ligne.locator('[data-test="visite-fixee"]')).toContainText('15 h 30');
  const [conf2] = await courrier(request, pour(c.contact.email, /Visite d'estimation confirmée|Nouvelle date de visite/));
  expect(conf2.subject).toContain('15 h 30');

  // 8. le journal du dossier garde tout
  await ligne.locator('[data-journal] summary').click();
  const journal = ligne.locator('[data-journal] li');
  await expect(journal.first()).toBeVisible();
  const lignes = (await journal.allTextContents()).join(' | ');
  for (const mot of ['Créneaux proposés', 'Visite fixée', 'Statut : Visite prévue', 'E-mail envoyé', 'Statut : Estimation reçue']) expect(lignes).toContain(mot);

  await c.ctx.close();
});

test('rappel de visite : envoyé la veille à 18 h, une seule fois', async ({ page, request, browser }, info) => {
  test.setTimeout(120000);
  const c = await client(browser, info, {}, { prenom: 'Bruno', nom: 'Petit' });
  await sessionAdmin(page, request);
  // visite fixée dans 5 jours à 10 h (heure de Paris) ; la confirmation est donc ancienne quand vient la veille
  const j = new Date(Date.now() + 5 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const r = await api(page, '/admin/visite', { demande: c.id, debut_local: `${j}T10:00` });
  expect(r).toMatchObject({ _status: 200, mail: 'envoye' });
  expect(r.demande.statut).toBe('visite');
  await viderBoite(request);
  const veille = new Date(new Date(j + 'T12:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
  // l'heure de Paris du jour de la veille, en UTC (été ou hiver : le changement d'heure ne doit pas casser le test)
  const taches = async (h) => (await request.get(`${SITE}/api/espace/taches?maintenant=${utcDeParis(veille, h)}`)).json();
  expect((await taches('17:30')).rappels).toBe(0);                 // 17 h 30 à Paris
  expect((await taches('18:05')).rappels).toBeGreaterThanOrEqual(1);   // 18 h 05
  const rappel = await courrier(request, pour(c.contact.email, /Rappel : visite d'estimation demain à 10 h/));
  expect(rappel.length).toBe(1);
  expect(rappel[0].text).toContain('titre de propriété');
  expect((await taches('19:05')).rappels).toBe(0);                 // déjà parti
  expect((await courrier(request, pour(c.contact.email, /Rappel/), { attente: 1500 })).length).toBe(1);
  await c.ctx.close();
});

test('les 10 statuts : frise du vendeur, prochaine action, e-mail court à chaque changement, sorties sans e-mail', async ({ page, request, browser }, info) => {
  test.setTimeout(240000);
  const c = await client(browser, info, { type: 'maison', adresse: '10 rue des vergers quetigny', surface: '100' }, { prenom: 'Paul', nom: 'Girard', civ: 'M.' });
  const pc = c.page;
  await sessionAdmin(page, request);
  await page.goto('/admin/?q=' + c.ref);
  const ligne = page.locator('#ad-rows .ee-row');
  await expect(ligne.locator('summary .st')).toHaveText('Estimation reçue');
  await expect(ligne.locator('[data-test="action"]')).toContainText('Appeler');
  // les 12 choix : 10 statuts et 2 sorties
  expect(await ligne.locator('[data-f="statut"] option').allTextContents()).toEqual(['Estimation reçue', 'Appelé', 'Visite prévue', 'Avis de valeur envoyé', 'Mandat signé', 'Annonce en ligne', 'Visites en cours', 'Offre reçue', 'Compromis signé', 'Acte signé', 'Pas maintenant', 'Perdu']);

  const etapes = [
    ['appele', 'Appelé', /Suite à notre échange/, 'Premier appel', 2],
    ['mandat', 'Mandat signé', /Le mandat est signé/, 'Mandat signé', 5],
    ['annonce', 'Annonce en ligne', /Votre annonce est en ligne/, 'Annonce en ligne', 6],
    ['visites', 'Visites en cours', /Les visites commencent/, 'Visites', 7],
    ['offre', 'Offre reçue', /Une offre est arrivée/, 'Offre reçue', 8],
    ['compromis', 'Compromis signé', /Le compromis est signé/, 'Compromis signé', 9],
    ['acte', 'Acte signé', /L'acte est signé/, 'Acte signé', 10],
  ];
  for (const [cle, libelle, sujet, vendeur, rang] of etapes) {
    await viderBoite(request);
    await ligne.locator('[data-f="statut"]').selectOption(cle);
    await ligne.locator('[data-save]').click();
    await expect(ligne.locator('.saved')).toContainText('e-mail envoyé');
    await expect(ligne.locator('summary .st')).toHaveText(libelle);
    const [m] = await courrier(request, pour(c.contact.email, sujet));
    expect(m, `e-mail « ${libelle} »`).toBeTruthy();
    expect(m.text).toContain('Bonjour Paul,');
    expect(m.text).toContain('Shawez Ali');
    expect(m.text.length, 'un e-mail court').toBeLessThan(900);
    expect(lienDans(m)).toBeTruthy();
    const d = (await moi(pc)).demandes[0];
    expect(d.statut).toBe(cle);
    expect(d.parcours.filter((e) => e.etat !== 'avenir').length).toBe(rang);
    expect(d.parcours.find((e) => e.etat === 'encours').libelle).toBe(vendeur);
    expect(d.suite.length).toBeGreaterThan(10);
  }
  // le vendeur : « Acte signé », 10 sur 10
  await pc.goto('/mon-espace/');
  const carte = pc.locator('#me-cards .ee-card').first();
  await expect(carte.locator('.ee-etape span')).toHaveText('Étape 10 sur 10');
  await expect(carte.locator('[data-test="etape"]')).toHaveText('Acte signé');
  await expect(carte.locator('.ee-bar i.fait')).toHaveCount(9);
  await capture(pc, info, 'espace-2-acte-signe');
  // le créneau de visite ne se propose plus une fois le dossier avancé
  await expect(carte.locator('[data-rdv]')).toBeHidden();
  expect(await api(pc, '/visite', { demande: c.id, creneaux: [(await api(pc, '/creneaux')).jours[1].heures[0].debut] })).toMatchObject({ _status: 409, error: 'visite_close' });

  const [dernier] = await courrier(request, pour(c.contact.email, /L'acte est signé/));

  // sans la case « annoncer » : rien ne part
  await viderBoite(request);
  await ligne.locator('[data-f="statut"]').selectOption('compromis');
  await ligne.locator('[data-f="prevenir"]').uncheck();
  await ligne.locator('[data-save]').click();
  await expect(ligne.locator('.saved')).toHaveText('Enregistré');
  expect((await courrier(request, pour(c.contact.email), { attente: 1500 })).length).toBe(0);

  // « Pas maintenant » : raison et date de relance, pas d'e-mail ; le vendeur voit « en pause »
  await ligne.locator('[data-f="prevenir"]').check();
  await ligne.locator('[data-f="statut"]').selectOption('pause');
  await expect(ligne.locator('[data-raison-f]')).toBeVisible();
  await ligne.locator('[data-f="raison"]').fill('Vend au printemps');
  await ligne.locator('[data-f="rappel_le"]').fill('2027-03-01');
  await ligne.locator('[data-save]').click();
  await expect(ligne.locator('summary .st')).toHaveText('Pas maintenant');
  await expect(ligne.locator('[data-test="action"]')).toContainText('Relancer');
  expect((await courrier(request, pour(c.contact.email), { attente: 1500 })).length).toBe(0);
  let d = (await moi(pc)).demandes[0];
  expect(d.statut_libelle).toBe('En pause');
  expect(d.suite).toContain('01/03');
  // « Perdu »
  await ligne.locator('[data-f="statut"]').selectOption('close');
  await ligne.locator('[data-f="raison"]').fill('A signé avec une autre agence');
  await ligne.locator('[data-save]').click();
  await expect(ligne.locator('summary .st')).toHaveText('Perdu');
  d = (await moi(pc)).demandes[0];
  expect(d.statut_libelle).toBe('Dossier clos');

  // journal : chaque changement, avec sa raison
  await ligne.locator('[data-journal] summary').click();
  await expect(ligne.locator('[data-journal] li').first()).toBeVisible();
  const j = (await ligne.locator('[data-journal] li').allTextContents()).join(' | ');
  expect(j).toContain('Statut : Perdu (A signé avec une autre agence)');
  expect(j).toContain('Statut : Pas maintenant (Vend au printemps)');
  expect(j).toContain('Statut : Acte signé');

  // Google Sheet : le statut et la raison suivent
  const cle = (await api(page, '/admin/flux', {})).adresse.split('cle=')[1];
  const flux = await (await request.get(`${SITE}/api/espace/flux/site.csv?cle=${cle}&format=tsv`)).text();
  const l = flux.split('\n').find((x) => x.includes(c.ref));
  expect(l).toContain('\tperdu\t');
  expect(l).toContain('Raison : A signé avec une autre agence.');
  // un lien d'e-mail de statut ouvre l'espace depuis un autre appareil (7 jours, une fois) ; comme c'est la première
  // preuve de l'adresse, la session ouverte sans preuve le jour de l'estimation est fermée
  const autre = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const pa = await autre.newPage();
  await pa.goto(lienDans(dernier).replace(/^https?:\/\/[^/]+/, ''));
  await expect(pa.locator('#me-in')).toBeVisible();
  await expect(pa.locator('#me-cards .ee-card').first().locator('.ee-etape span')).toHaveText('Dossier clos');
  expect((await moi(pa)).compte.verifie).toBe(true);
  await pa.goto(lienDans(dernier).replace(/^https?:\/\/[^/]+/, ''));
  await autre.close();
  await c.ctx.close();
});

test('prochaine action : en retard en haut de la liste, statistiques', async ({ page, request, browser }, info) => {
  test.setTimeout(120000);
  const c = await client(browser, info, {}, { prenom: 'Lina', nom: 'Morel' });
  await sessionAdmin(page, request);
  // une demande toute fraîche : appel dû dans le quart d'heure (ou demain 9 h 15), pas en retard
  let d = (await api(page, '/admin/demandes')).demandes.find((x) => x.reference === c.ref);
  expect(d.action.texte).toContain('Appeler');
  expect(d.action.echeance).toBeTruthy();
  expect(d.action.retard).toBe(false);
  // « rappeler avant le » hier → en retard, et remonte en tête
  const hier = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  expect((await api(page, '/admin/demande', { id: c.id, statut: 'appele', rappel_le: hier, prevenir: false })).demande.action.retard).toBe(true);
  await page.goto('/admin/');
  const premiere = page.locator('#ad-rows .ee-row').first();
  await expect(premiere.locator('[data-test="action"]')).toHaveClass(/ee-late/);
  await expect(premiere.locator('[data-test="action"]')).toContainText('en retard');
  expect(Number(await page.locator('#ad-stats .ee-stat').nth(1).locator('b').textContent())).toBeGreaterThanOrEqual(1);
  await capture(page, info, 'admin-3-liste');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await api(page, '/admin/demande', { id: c.id, rappel_le: '' });
  await c.ctx.close();
});

test('droits et validation : visites, statuts, réglages', async ({ page, request, browser }, info) => {
  test.setTimeout(120000);
  // sans connexion
  await page.goto('/mon-espace/');
  await api(page, '/deconnexion', {});
  expect((await api(page, '/visite', { demande: 1, creneaux: [] }))._status).toBe(401);
  for (const [chemin, corps] of [['/admin/visite', { demande: 1 }], ['/admin/avis', { demande: 1, contenu: {} }], ['/admin/avis/valider', { demande: 1 }], ['/admin/reglages', { rdv_url: '' }]]) {
    expect((await api(page, chemin, corps))._status, chemin).toBe(401);
  }
  expect((await api(page, '/admin/avis?demande=1'))._status).toBe(401);
  expect((await api(page, '/admin/journal?demande=1'))._status).toBe(401);
  // les créneaux sont publics (aucune donnée de personne) ; les tâches aussi, sans effet
  const cr = await api(page, '/creneaux');
  expect(cr).toMatchObject({ _status: 200, duree: 45 });
  expect(cr.jours.length).toBe(6);
  for (const j of cr.jours) for (const h of j.heures) expect(new Date(h.debut).getTime()).toBeGreaterThan(Date.now() + 3600000);
  expect(await api(page, '/taches')).toMatchObject({ _status: 200, ok: true });

  // deux clients : l'un ne touche pas au dossier de l'autre
  const a = await client(browser, info, {}, { prenom: 'Anne', nom: 'Un' });
  const b = await client(browser, info, {}, { prenom: 'Bob', nom: 'Deux' });
  const bon = cr.jours[1].heures[0].debut;
  expect((await api(b.page, '/visite', { demande: a.id, creneaux: [bon] }))._status).toBe(404);
  // créneaux refusés : dimanche, heure hors plage, passé, plus de trois, doublons comptés une fois, texte libre
  const dimanche = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7)); d.setUTCHours(9, 0, 0, 0); return d.toISOString(); })();
  for (const mauvais of [[dimanche], [bon.replace(/T\d{2}/, 'T03')], ['2020-01-06T09:00:00.000Z'], [], ['demain matin'], cr.jours[2].heures.slice(0, 4).map((h) => h.debut), 'x']) {
    expect(await api(a.page, '/visite', { demande: a.id, creneaux: mauvais }), JSON.stringify(mauvais)).toMatchObject({ _status: 400, error: 'champs', champ: 'creneaux' });
  }
  expect((await api(a.page, '/visite', { demande: a.id, creneaux: [bon, bon] }))._status).toBe(201);
  expect((await moi(a.page)).demandes[0].visite).toMatchObject({ etat: 'demandee', creneaux: [bon] });
  // un client n'entre pas dans l'admin
  expect((await api(a.page, '/admin/visite', { demande: a.id, debut: bon }))._status).toBe(403);
  expect((await api(a.page, '/admin/demande', { id: a.id, statut: 'acte' }))._status).toBe(403);
  expect((await api(a.page, '/admin/journal?demande=' + a.id))._status).toBe(403);
  expect((await api(a.page, '/admin/reglages', { rdv_url: 'https://calendar.app.google/abc' }))._status).toBe(403);

  // admin : dates et statuts invalides refusés
  await sessionAdmin(page, request);
  expect(await api(page, '/admin/visite', { demande: a.id, debut_local: '2026-13-45T99:00' })).toMatchObject({ _status: 400, champ: 'debut' });
  expect(await api(page, '/admin/visite', { demande: a.id, debut: 'bientôt' })).toMatchObject({ _status: 400, champ: 'debut' });
  expect((await api(page, '/admin/visite', { demande: 99999999, debut: bon }))._status).toBe(404);
  expect(await api(page, '/admin/demande', { id: a.id, statut: 'vendu' })).toMatchObject({ _status: 400, champ: 'statut' });
  // visite fixée puis annulée : le vendeur ne la voit plus
  expect((await api(page, '/admin/visite', { demande: a.id, debut: bon })).demande.visite).toMatchObject({ etat: 'fixee', debut: bon });
  // une fois fixée, le vendeur ne peut pas l'écraser sans le dire
  expect(await api(a.page, '/visite', { demande: a.id, creneaux: [cr.jours[2].heures[0].debut] })).toMatchObject({ _status: 409, error: 'visite_fixee' });
  expect((await api(page, '/admin/visite', { demande: a.id, annuler: true }))._status).toBe(200);
  expect((await moi(a.page)).demandes[0].visite).toBeNull();

  // réglages : seul un lien Google Agenda est accepté ; il remplace alors les trois créneaux dans l'espace du vendeur
  for (const u of ['http://calendar.app.google/abc', 'https://exemple.fr/rdv', 'javascript:alert(1)', 'calendar']) {
    expect(await api(page, '/admin/reglages', { rdv_url: u }), u).toMatchObject({ _status: 400, champ: 'rdv_url' });
  }
  expect((await api(page, '/admin/reglages', { rdv_url: 'https://calendar.app.google/AbCdEf123' })).rdv_url).toBe('https://calendar.app.google/AbCdEf123');
  await b.page.goto('/mon-espace/');
  const lien = b.page.locator('#me-cards .ee-card').first().locator('[data-rdv-agenda]');
  await expect(lien).toHaveAttribute('href', 'https://calendar.app.google/AbCdEf123');
  await expect(lien).toHaveAttribute('target', '_blank');
  expect((await api(page, '/admin/reglages', { rdv_url: '' })).rdv_url).toBeNull();
  await b.page.reload();
  await expect(b.page.locator('#me-cards .ee-card').first().locator('[data-rdv-ouvrir]')).toBeVisible();

  // suppression du compte : son suivi part avec lui (journal, visite)
  const id = a.id;
  expect((await api(a.page, '/compte/supprimer', { confirmation: 'SUPPRIMER' }))._status).toBe(200);
  expect((await api(page, '/admin/journal?demande=' + id))._status).toBe(404);
  await a.ctx.close(); await b.ctx.close();
});
