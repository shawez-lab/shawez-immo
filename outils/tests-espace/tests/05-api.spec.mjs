/* L'API : origine des requêtes, validation stricte, texte jamais exécuté. */
import { test, expect } from '@playwright/test';
import { fausseBan, moi, api, emailTest, SITE } from './aides.mjs';

const REPONSES = { type: 'appartement', adresse: '30 Rue Bannelier 21000 Dijon', code_postal: '21000', commune: 'Dijon', lat: 47.32396, lon: 5.03633, delai: 'asap', surface: 72, pieces: 3, chambres: 2, epoque: 'nsp', etat: 'bon', etage: 1, etages_immeuble: 4 };
const contact = (email) => ({ civilite: 'Mme', prenom: 'Lina', nom: 'Robert', email, telephone: '06 11 22 33 44' });
test.beforeEach(async ({ page }) => { await fausseBan(page); });

test('l\'API refuse ce qui ne vient pas du site, et les données mal formées', async ({ page, request }) => {
  const corps = { reponses: REPONSES, consentement: true, duree: 60000, contact: contact(emailTest('api')) };
  // pas d'origine, ou une autre origine : refusé
  expect((await request.post(SITE + '/api/espace/estimation', { data: corps })).status()).toBe(403);
  expect((await request.post(SITE + '/api/espace/estimation', { data: corps, headers: { Origin: 'https://ailleurs.example' } })).status()).toBe(403);
  await page.goto('/estimer/');
  // sans consentement, e-mail faux, téléphone faux, surface absurde, type inconnu
  expect(await api(page, '/estimation', { ...corps, consentement: false })).toMatchObject({ _status: 400, champ: 'consentement' });
  expect(await api(page, '/estimation', { ...corps, contact: { ...corps.contact, email: 'pas-un-email' } })).toMatchObject({ _status: 400, champ: 'email' });
  expect(await api(page, '/estimation', { ...corps, contact: { ...corps.contact, telephone: 'abc' } })).toMatchObject({ _status: 400, champ: 'telephone' });
  expect(await api(page, '/estimation', { ...corps, reponses: { ...REPONSES, surface: 3 } })).toMatchObject({ _status: 400, champ: 'surface' });
  expect(await api(page, '/estimation', { ...corps, reponses: { ...REPONSES, type: 'chateau' } })).toMatchObject({ _status: 400, champ: 'type' });
  expect(await api(page, '/estimation', { ...corps, reponses: { ...REPONSES, lat: 10 } })).toMatchObject({ _status: 400, champ: 'lat' });
  // injection : gardée comme du texte, jamais exécutée
  const mechant = emailTest('xss');
  const r = await api(page, '/estimation', { ...corps, contact: { ...contact(mechant), prenom: '<img src=x onerror=alert(1)>', nom: "O'Brien\"; DROP TABLE comptes;--" } });
  expect(r._status).toBe(201);
  let alerte = false; page.on('dialog', () => { alerte = true; });
  await page.goto('/mon-espace/');
  await expect(page.locator('#me-in')).toBeVisible();
  await expect(page.locator('#me-infos')).toContainText('<img src=x onerror=alert(1)>');
  expect(alerte).toBe(false);
  expect((await moi(page)).compte.nom).toBe("O'Brien\"; DROP TABLE comptes;--");
});


test('routes inconnues et méthodes non prévues : 404, sans détail', async ({ page }) => {
  await page.goto('/mon-espace/');
  expect((await api(page, '/nimporte'))._status).toBe(404);
  expect((await api(page, '/moi', {}))._status).toBe(404);              // POST sur une route GET
  expect((await api(page, '/admin/demandes'))._status).toBe(401);
});

test('fichier : il faut être connecté et propriétaire de l\'estimation', async ({ page }) => {
  await page.goto('/mon-espace/');
  const envoi = (id) => page.evaluate(async (i) => (await fetch('/api/espace/fichier?demande=' + i, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: '%PDF-1.4 x' })).status, id);
  expect(await envoi(1)).toBe(401);
  const r = await api(page, '/estimation', { reponses: REPONSES, consentement: true, duree: 60000, contact: contact(emailTest('fichier')) });
  expect(r._status).toBe(201);
  const mien = (await moi(page)).demandes[0].id;
  expect(await envoi(mien)).toBe(201);
  expect(await envoi(mien + 100000)).toBe(404);
  expect(await envoi('abc')).toBe(400);
});
