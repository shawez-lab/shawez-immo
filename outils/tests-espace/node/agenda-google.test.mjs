import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaGoogleConfigure, evenementSouhaite, appliquerGoogle } from '../../../functions/_lib/agenda-google.js';

const now = Date.parse('2026-11-26T12:00:00Z');
const slot = '2026-11-27T09:00:00.000Z';
const env = {
  GOOGLE_CALENDAR_SYNC_ENABLED: '1',
  GOOGLE_CALENDAR_ID: 'primary',
  GOOGLE_CALENDAR_CLIENT_ID: 'test-client',
  GOOGLE_CALENDAR_CLIENT_SECRET: 'test-secret',
  GOOGLE_CALENDAR_REFRESH_TOKEN: 'test-refresh',
  GOOGLE_CALENDAR_SYNC_FROM: '2026-11-26T00:00:00Z',
};
const depuis = Date.parse(env.GOOGLE_CALENDAR_SYNC_FROM);
const demande = {
  demande_id: 42, reference: 'R-TEST-42', contact: '{"prenom":"Camille","nom":"Exemple"}',
  adresse: 'Visite du bien réf. 529', reponses: '{"autre_type":"visite_bien"}',
  etat: 'demandee', creneaux: JSON.stringify([slot]), duree: 45, statut: 'recue',
  cree_le: '2026-11-26T11:00:00Z', suspect: 0, en_attente: 0,
};
const evt = evenementSouhaite(demande, now, depuis);

test('activation explicite en production seulement, secrets tous nécessaires', () => {
  assert.equal(agendaGoogleConfigure(env,'https://shawez-immo.com/api/espace/rdv'),true);
  assert.equal(agendaGoogleConfigure(env,'https://apercu.shawez-immo.pages.dev/api/espace/rdv'),false);
  assert.equal(agendaGoogleConfigure({...env, GOOGLE_CALENDAR_REFRESH_TOKEN:''},'https://shawez-immo.com/'),false);
  assert.equal(agendaGoogleConfigure({...env, GOOGLE_CALENDAR_SYNC_ENABLED:'0'},'https://shawez-immo.com/'),false);
});

test('demande directe : événement provisoire, privé, sans invitation', () => {
  assert.equal(evt.status,'tentative');
  assert.match(evt.summary,/À confirmer/);
  assert.equal(evt.start.dateTime,slot);
  assert.equal(evt.end.dateTime,'2026-11-27T09:45:00.000Z');
  assert.equal(evt.start.timeZone,'Europe/Paris');
  assert.equal(evt.visibility,'private');
  assert.equal(evt.transparency,'opaque');
  assert.equal(evt.attendees,undefined);
  assert.equal(evt.extendedProperties.private.demande,'42');
});

test('confirmation et déplacement remplacent le provisoire', () => {
  const e = evenementSouhaite({...demande,etat:'fixee',debut:'2026-11-27T14:00:00Z'},now,depuis);
  assert.equal(e.status,'confirmed');
  assert.equal(e.start.dateTime,'2026-11-27T14:00:00.000Z');
  assert.equal(e.summary.includes('À confirmer'),false);
});

test('aucune création pour plusieurs choix, essais, robots, anciennes demandes et annulations', () => {
  for (const patch of [
    {creneaux:JSON.stringify([slot,'2026-11-27T11:00:00Z'])},
    {reponses:'{}'}, {suspect:1}, {en_attente:1}, {statut:'close'},
    {contact:'{"prenom":"Test visite"}'}, {contact:'{"email":"a@test.invalid"}'},
    {etat:'annulee'}, {cree_le:'2026-11-25T11:00:00Z'}, {creneaux:'["2026-11-25T10:00:00Z"]'},
  ]) assert.equal(evenementSouhaite({...demande,...patch},now,depuis),null);
});

const id='ag0123456789abcdef0123456789abcdef';
function scenario(statuses) {
  const calls=[];
  const fetcher=async(url,options) => {
    calls.push({url,method:options.method,body:options.body ? JSON.parse(options.body) : undefined,headers:options.headers});
    const next=statuses.shift();
    assert.ok(next,'appel imprévu');
    const [status,body]=next;
    return new Response(status===204 ? null : JSON.stringify(body||{}),{status});
  };
  return {calls,fetcher};
}

test('création Google après absence, identifiant fixé et aucune notification externe', async () => {
  const s=scenario([[404],[200,{status:'tentative'}]]);
  await appliquerGoogle(env,'jeton',id,evt,s.fetcher);
  assert.deepEqual(s.calls.map(c=>c.method),['PATCH','POST']);
  assert.equal(s.calls[1].body.id,id);
  assert.match(s.calls[1].url,/sendUpdates=none/);
  assert.equal(s.calls[1].headers.Authorization,'Bearer jeton');
});

test('modification du même événement, suppression idempotente', async () => {
  const s=scenario([[200,{status:'confirmed'}],[204],[410]]);
  await appliquerGoogle(env,'jeton',id,{...evt,status:'confirmed'},s.fetcher);
  await appliquerGoogle(env,'jeton',id,null,s.fetcher);
  await appliquerGoogle(env,'jeton',id,null,s.fetcher);
  assert.deepEqual(s.calls.map(c=>c.method),['PATCH','DELETE','DELETE']);
});

test('conflit de création : vérifier le propriétaire du rendez-vous avant de réessayer', async () => {
  const s=scenario([[404],[409],[200,{status:'confirmed',extendedProperties:evt.extendedProperties}],[200,{status:'confirmed'}]]);
  await appliquerGoogle(env,'jeton',id,evt,s.fetcher);
  assert.deepEqual(s.calls.map(c=>c.method),['PATCH','POST','GET','PATCH']);
  const mauvais=scenario([[404],[409],[200,{status:'confirmed',extendedProperties:{private:{origine:'autre'}}}]]);
  await assert.rejects(appliquerGoogle(env,'jeton',id,evt,mauvais.fetcher),/conflit_identite/);
});

test('une erreur réseau ou API est remontée sans fausse confirmation', async () => {
  const s=scenario([[503]]);
  await assert.rejects(appliquerGoogle(env,'jeton',id,evt,s.fetcher),/ecriture_503/);
});
