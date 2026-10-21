/* Rendez-vous en 2 clics, sans estimation (accueil, /contact/, /merci/) — vague 2, ligne 58 du plan.
   1er clic : un créneau libre ; 2e clic : « Confirmer ce rendez-vous » (après prénom, téléphone, adresse).
   La demande arrive dans /admin/ (visite demandée sur ce créneau), l'agence est alertée, le créneau n'est plus proposé,
   ni à un autre visiteur, ni une fois la visite fixée. Les moments pris de l'agenda Google (iCal) sont retirés. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { api, viderBoite, courrier, sessionAdmin, ADMIN, SITE } from './aides.mjs';
import { moduleServeur } from './module-serveur.mjs';

const capture = async (page, info, nom) => { await page.waitForTimeout(900); return page.screenshot({ path: `captures/${info.project.name}-${nom}.png`, fullPage: false }); };
const tousLesDebuts = (d) => d.jours.flatMap((j) => j.heures.map((h) => h.debut));

async function remplirEtConfirmer(bloc, { prenom, telephone = '06 12 34 56 78', adresse = '12 rue de la Liberté, 21000 Dijon' }) {
  await bloc.locator('input[name="prenom"]').fill(prenom);
  await bloc.locator('input[name="telephone"]').fill(telephone);
  await bloc.locator('input[name="adresse"]').fill(adresse);
  await bloc.locator('[data-test="rdv-confirmer"]').click();
}

test('accueil : « Prendre rendez-vous » mène au bloc, 2 clics, la demande arrive à l\'agence et le créneau disparaît', async ({ page, request }, info) => {
  test.setTimeout(120000);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/metricool|Failed to load resource/i.test(m.text())) erreurs.push(m.text()); });
  await viderBoite(request);
  await page.goto('/');

  // le 2e bouton du haut de page n'envoie plus chez l'agence : il mène au rendez-vous
  const hero = page.locator('#hero .btn-row');
  await expect(hero.locator('a')).toHaveCount(2);
  await expect(hero.locator('a').first()).toHaveText(/Connaître le prix de mon bien/);
  await expect(hero.locator('a[href*="gravelin-immo.com"]')).toHaveCount(0);
  await expect(page.locator('#hero')).not.toContainText('dans la journée');
  await hero.getByRole('link', { name: 'Prendre rendez-vous' }).click();
  const bloc = page.locator('#rdv [data-rdv]');
  await expect(bloc).toBeInViewport();
  await expect(bloc.locator('.rdvx-day').first()).toBeVisible();
  await capture(page, info, 'rdv-1-creneaux');

  // du lundi au samedi, 6 jours
  const jours = await bloc.locator('.rdvx-day').allTextContents();
  expect(jours.length).toBe(6);
  for (const j of jours) expect(j).not.toMatch(/^dim/i);

  // clic 1 : le 2e jour, la 1re heure
  await bloc.locator('.rdvx-day').nth(1).click();
  const heure = bloc.locator('.rdvx-h').first();
  const debut = await heure.getAttribute('data-h');
  await heure.click();
  await expect(heure).toHaveAttribute('aria-pressed', 'true');
  await expect(bloc.locator('.rdvx-form')).toBeVisible();
  await expect(bloc.locator('input[name="prenom"]')).toBeFocused();
  // sur téléphone, la barre du bas s'efface pour ne pas cacher « Confirmer »
  if (info.project.name === 'iphone13') await expect(page.locator('html')).toHaveClass(/rdvx-actif/);

  // erreurs de saisie : rien ne part
  await bloc.locator('[data-test="rdv-confirmer"]').click();
  await expect(bloc.locator('.rdvx-err')).toHaveText('Indiquez votre prénom.');
  await bloc.locator('input[name="prenom"]').fill('Camille');
  await bloc.locator('input[name="telephone"]').fill('12');
  await bloc.locator('[data-test="rdv-confirmer"]').click();
  await expect(bloc.locator('.rdvx-err')).toHaveText(/téléphone/);
  await capture(page, info, 'rdv-2-formulaire');

  // clic 2 : confirmer (prénom sans « TEST » : l'alerte part, ici dans la fausse boîte locale)
  await page.waitForTimeout(4200);   // un humain ne remplit pas en moins de 4 s (sinon la demande est marquée « robot possible »)
  await remplirEtConfirmer(bloc, { prenom: 'Camille' });
  await expect(bloc.locator('[data-test="rdv-ok"]')).toBeVisible();
  await expect(bloc.locator('[data-test="rdv-ok"]')).toContainText('C\'est noté');
  await expect(bloc.locator('[data-test="rdv-ok"]')).toBeInViewport();
  await expect(bloc.locator('[data-test="rdv-ok"]')).toContainText('vous appelle pour confirmer');
  await expect(bloc.locator('a[href^="tel:"]')).toBeVisible();
  await expect(bloc.locator('a[href^="https://wa.me/"]')).toBeVisible();
  const ref = ((await bloc.locator('[data-test="rdv-ok"]').textContent()).match(/R-\d{8}-[A-Z0-9]{6}/) || [])[0];
  expect(ref, 'référence affichée').toBeTruthy();
  await capture(page, info, 'rdv-3-confirme');

  // l'alerte à l'agence, avec le créneau et le téléphone
  const [m] = await courrier(request, (x) => x.to.includes(ADMIN) && /Visite demandée/.test(x.subject) && x.subject.includes('Camille'));
  expect(m, 'alerte « Visite demandée » à l\'agence').toBeTruthy();
  expect(m.subject).toContain('06 12 34 56 78');

  // le créneau n'est plus proposé à un autre visiteur
  const apres = await api(page, '/creneaux');
  expect(tousLesDebuts(apres)).not.toContain(debut);

  // l'agence voit la demande, la visite demandée sur ce créneau, et la confirme d'un clic
  await sessionAdmin(page, request);
  const ad = await api(page, '/admin/demandes');
  const d = ad.demandes.find((x) => x.reference === ref);
  expect(d, 'demande visible dans /admin/').toBeTruthy();
  expect(d.statut).toBe('recue');
  expect(d.visite.etat).toBe('demandee');
  expect(d.visite.creneaux).toEqual([debut]);
  expect(d.contact.telephone).toBe('06 12 34 56 78');
  expect(d.adresse).toContain('rue de la Liberté');
  const fixe = await api(page, '/admin/visite', { demande: d.id, debut });
  expect(fixe._status).toBe(200);
  expect(tousLesDebuts(await api(page, '/creneaux'))).not.toContain(debut);
  expect(erreurs, 'aucune erreur dans la console').toEqual([]);
});

test('le créneau pris entre-temps est refusé proprement, la liste se recharge', async ({ page, browser }, info) => {
  await page.goto('/contact/');
  const bloc = page.locator('#rdv[data-rdv]');
  await bloc.scrollIntoViewIfNeeded();
  await expect(bloc.locator('.rdvx-h').first()).toBeVisible();
  await bloc.locator('.rdvx-day').last().click();
  const heure = bloc.locator('.rdvx-h').last();
  const debut = await heure.getAttribute('data-h');
  await heure.click();
  // un autre visiteur prend ce créneau juste avant
  const autre = await (await browser.newContext({ baseURL: SITE })).newPage();
  await autre.goto('/contact/');
  const r = await api(autre, '/rdv', { creneau: debut, prenom: 'Bertrand', telephone: '0600000000', adresse: 'Dijon', consentement: true, duree: 6000 });
  expect(r._status).toBe(201);
  await remplirEtConfirmer(bloc, { prenom: 'TEST Contact' });
  await expect(bloc.locator('.rdvx-err')).toHaveText(/vient d'être pris/);
  await expect(bloc.locator('.rdvx-h').first()).toBeVisible();
  expect(await bloc.locator(`.rdvx-h[data-h="${debut}"]`).count()).toBe(0);
  await capture(page, info, 'rdv-4-pris');
});

test('/merci/ mène au rendez-vous ; l\'API refuse dimanche, consentement manquant, téléphone faux', async ({ page }) => {
  await page.goto('/merci/');
  await expect(page.locator('#r-merci a[href^="tel:"]').first()).toBeVisible();
  await expect(page.locator('#r-merci a[href^="https://wa.me/"]').first()).toBeVisible();
  const bloc = page.locator('#rdv[data-rdv]');
  await expect(bloc).toContainText('Prochaine étape');
  await expect(bloc.locator('.rdvx-h').first()).toBeVisible();
  const d = await api(page, '/creneaux');
  const ok = tousLesDebuts(d)[0];
  const base = { prenom: 'TEST Api', telephone: '0600000000', adresse: 'Dijon', consentement: true, duree: 6000 };
  const dimanche = d.jours[0].heures[0].debut.replace(/T.*/, '');
  const prochainDimanche = new Date(Date.parse(dimanche + 'T12:00:00Z') + ((7 - new Date(dimanche + 'T12:00:00Z').getUTCDay()) % 7 || 7) * 86400000).toISOString().slice(0, 10);
  expect((await api(page, '/rdv', { ...base, creneau: `${prochainDimanche}T08:00:00.000Z` }))._status).toBe(409);
  expect((await api(page, '/rdv', { ...base, creneau: ok, consentement: false })).champ).toBe('consentement');
  expect((await api(page, '/rdv', { ...base, creneau: ok, telephone: '12' })).champ).toBe('telephone');
  expect((await api(page, '/rdv', { ...base, creneau: ok, adresse: '' })).champ).toBe('adresse');
  expect((await api(page, '/rdv', { ...base, creneau: 'demain' }))._status).toBe(409);
});

test('accessibilité du bloc rendez-vous (WCAG A et AA) et choix au clavier', async ({ page }) => {
  await page.goto('/');
  const bloc = page.locator('#rdv [data-rdv]');
  await bloc.scrollIntoViewIfNeeded();
  await expect(bloc.locator('.rdvx-h').first()).toBeVisible();
  await bloc.locator('.rdvx-h').first().focus();
  await page.keyboard.press('Enter');
  await expect(bloc.locator('input[name="prenom"]')).toBeFocused();
  const r = await new AxeBuilder({ page }).include('#rdv').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${v.id} : ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

test('agenda Google (iCal) : les moments pris, la marge de trajet, les répétitions et les annulations', async () => {
  const { lireEvenements, occupations, retirerOccupes, adresseIcsValide } = await moduleServeur('agenda');
  const { creneaux } = await moduleServeur('suivi');
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Paris:20261012T110000', 'DTEND;TZID=Europe/Paris:20261012T120000', 'SUMMARY:Photos', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTSTART:20261013T120000Z', 'DTEND:20261013T130000Z', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261014', 'DTEND;VALUE=DATE:20261015', 'TRANSP:TRANSPARENT', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Paris:20261005T090000', 'DTEND;TZID=Europe/Paris:20261005T100000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE', 'EXDATE;TZID=Europe/Paris:20261014T090000', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTSTART;TZID=Europe/Paris:20261015T160000', 'DTEND;TZID=Europe/Paris:20261015T170000', 'STATUS:CANCELLED', 'END:VEVENT',
    'END:VCALENDAR'].join('\r\n');
  const now = new Date('2026-10-11T18:00:00Z');
  const occ = occupations(lireEvenements(ics), now.getTime(), now.getTime() + 10 * 86400000);
  const j = Object.fromEntries(retirerOccupes(creneaux(now, 4), occ, 45).map((x) => [x.date, x.heures.map((h) => h.h)]));
  // lundi 12 : réunion 9 h–10 h (répétée) et photos 11 h–12 h → 9 h à 12 h retirés (marge de 30 min)
  expect(j['2026-10-12']).toEqual(['13 h', '14 h', '15 h', '16 h', '17 h', '18 h']);
  // mardi 13 : 14 h–15 h (heure UTC dans le fichier) → 13 h, 14 h, 15 h retirés
  expect(j['2026-10-13']).toEqual(['9 h', '10 h', '11 h', '12 h', '16 h', '17 h', '18 h']);
  // mercredi 14 : journée « disponible » et répétition annulée ce jour-là → tout reste
  expect(j['2026-10-14'].length).toBe(10);
  // jeudi 15 : événement annulé → tout reste
  expect(j['2026-10-15'].length).toBe(10);
  expect(adresseIcsValide('https://calendar.google.com/calendar/ical/shawez%40gravelin-immo.com/private-0123abcd/basic.ics')).toBe(true);
  expect(adresseIcsValide('https://calendar.google.com/calendar/embed?src=x')).toBe(false);
  expect(adresseIcsValide('http://calendar.google.com/calendar/ical/a/b/basic.ics')).toBe(false);
  expect(adresseIcsValide('https://exemple.fr/calendar/ical/a/b/basic.ics')).toBe(false);
});

test('réglage de l\'agenda : adresse refusée si ce n\'est pas l\'iCal Google ; réservé à l\'agence', async ({ page, request }) => {
  await page.goto('/mon-espace/');
  expect((await api(page, '/admin/reglages', { agenda_ics: 'https://calendar.google.com/calendar/ical/a/b/basic.ics' }))._status).toBe(401);
  await sessionAdmin(page, request);
  const r = await api(page, '/admin/reglages', { agenda_ics: 'https://exemple.fr/agenda.ics' });
  expect(r._status).toBe(400);
  expect(r.champ).toBe('agenda_ics');
  const vide = await api(page, '/admin/reglages', { agenda_ics: '' });
  expect(vide._status).toBe(200);
  expect(vide.agenda).toBe('non');
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Réglages' }).click();
  await expect(page.locator('#ad-ics')).toBeVisible();
  await expect(page.locator('#ad-reglages')).toContainText('Adresse secrète au format iCal');
});

test('rien ne dépasse de l\'écran (accueil, contact, merci), le bloc charge ses créneaux sur chaque page', async ({ page }) => {
  for (const u of ['/', '/contact/', '/merci/']) {
    await page.goto(u);
    const bloc = page.locator('[data-rdv]');
    await bloc.scrollIntoViewIfNeeded();
    await expect(bloc.locator('.rdvx-h').first()).toBeVisible();
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(sw, `largeur de ${u}`).toBeLessThanOrEqual(iw);
  }
});
