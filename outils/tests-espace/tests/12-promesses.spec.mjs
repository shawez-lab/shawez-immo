/* Système parfait, étape 4 : la mesure des 7 promesses (/admin/promesses/).
   1. Les règles, sur un jeu de dossiers écrit à la main : chaque chiffre attendu est compté à la main dans ce fichier,
      sans passer par le code qui calcule (c'est le contrôle indépendant).
   2. La mesure d'un vrai dossier, de l'estimation au mandat, lue dans l'export CSV.
   3. La page : sept cartes, 7 jours / 30 jours, ce qu'il faut regarder, export CSV, droits, iPhone, WCAG A et AA.
   Captures → captures/etape4-<appareil>-*.png */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'node:fs';
import { fausseBan, estimationComplete, api, viderBoite, courrier, pour, sessionAdmin, SITE } from './aides.mjs';
import { moduleServeur } from './module-serveur.mjs';

const { mesurer, tableau, mediane, delaiFr, PROMESSES } = await moduleServeur('promesses');

const PDF = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';

test.beforeEach(async ({ page }) => { await fausseBan(page); mkdirSync('captures', { recursive: true }); });

/* =====================================================================================================
   1. Les règles
   ===================================================================================================== */

/* Vendredi 9 octobre 2026, midi à Paris (10 h UTC). « 7 jours » commence le 2 octobre à midi, « 30 jours » le 9 septembre. */
const MAINTENANT = new Date('2026-10-09T10:00:00Z');

function jeu() {
  const demandes = [], evenements = [], visites = [], fichiers = [], notaires = [], comptes_rendus = [];
  let n = 0;
  const D = (id, nom, cree, statut, plus = {}) => demandes.push({ id, reference: 'E-' + nom, contact: JSON.stringify({ prenom: nom, nom: 'Test', email: `${nom.toLowerCase()}@exemple.fr` }), commune: 'Dijon', cree_le: cree, statut, statut_le: null, suspect: 0, prix_bas: 100000, ...plus });
  const E = (demande_id, cree_le, type, detail = null, de = null, vers = null) => evenements.push({ id: ++n, demande_id, type, de, vers, detail: detail ? JSON.stringify(detail) : null, cree_le });
  const statut = (id, quand, de, vers) => E(id, quand, 'statut', null, de, vers);
  const mail = (id, quand, motif, envoye, raison) => E(id, quand, 'mail', { motif, envoye, ...(raison ? { raison } : {}) });
  const V = (demande_id, etat, debut = null) => visites.push({ demande_id, etat, debut });
  const F = (demande_id, role, libelle = null) => fichiers.push({ demande_id, role, libelle });

  // A : tout va bien. Estimation en 1 min 35, appelée 9 minutes après, visite le lendemain sur un créneau proposé.
  D(1, 'A', '2026-10-08T08:00:00Z', 'visite');
  E(1, '2026-10-08T08:00:01Z', 'estimation', { duree: 95000, fourchette: true });
  statut(1, '2026-10-08T08:09:00Z', 'recue', 'appele'); mail(1, '2026-10-08T08:09:05Z', 'statut:appele', true);
  E(1, '2026-10-08T08:20:00Z', 'visite_demandee', { creneaux: ['2026-10-09T07:00:00.000Z', '2026-10-10T08:00:00.000Z'] });
  E(1, '2026-10-08T08:40:00Z', 'visite_fixee', { debut: '2026-10-09T07:00:00.000Z' });
  statut(1, '2026-10-08T08:40:01Z', 'appele', 'visite'); mail(1, '2026-10-08T08:40:03Z', 'visite_fixee', true);
  V(1, 'fixee', '2026-10-09T07:00:00.000Z');

  // B : demande à 20 h 30, appelée le lendemain à 9 h 40 (limite 9 h 15) ; parcours de 3 min 20 ; e-mails fermés ;
  //     visite dans 5 jours, mais sur le créneau que le vendeur a proposé.
  D(2, 'B', '2026-10-08T18:30:00Z', 'visite');
  E(2, '2026-10-08T18:30:01Z', 'estimation', { duree: 200000, fourchette: true });
  statut(2, '2026-10-09T07:40:00Z', 'recue', 'appele'); mail(2, '2026-10-09T07:40:01Z', 'statut:appele', false, 'email_clients_ferme');
  E(2, '2026-10-09T07:45:00Z', 'visite_demandee', { creneaux: ['2026-10-14T08:00:00.000Z'] });
  E(2, '2026-10-09T07:50:00Z', 'visite_fixee', { debut: '2026-10-14T08:00:00.000Z' });
  statut(2, '2026-10-09T07:50:01Z', 'appele', 'visite'); mail(2, '2026-10-09T07:50:02Z', 'visite_fixee', false, 'email_clients_ferme');
  V(2, 'fixee', '2026-10-14T08:00:00.000Z');

  // C : arrivée il y a 5 minutes, sans fourchette automatique. D : arrivée avant-hier, jamais appelée, durée non relevée.
  D(3, 'C', '2026-10-09T09:55:00Z', 'recue', { prix_bas: null });
  E(3, '2026-10-09T09:55:01Z', 'estimation', { duree: 80000, fourchette: false });
  D(4, 'D', '2026-10-07T08:00:00Z', 'recue');

  // E : robot probable. F : adresse d'essai. Ni l'un ni l'autre ne compte.
  D(5, 'E', '2026-10-08T08:00:00Z', 'recue', { suspect: 1 });
  D(6, 'F', '2026-10-08T08:00:00Z', 'recue', { contact: JSON.stringify({ prenom: 'F', email: 'essai@test.invalid' }) });

  // G (1er octobre) : appelée en 10 minutes sans e-mail ; visite fixée 4 jours plus tard sans créneau proposé ;
  //     avis de valeur 11 heures après la visite.
  D(7, 'G', '2026-10-01T08:00:00Z', 'avis');
  statut(7, '2026-10-01T08:10:00Z', 'recue', 'appele');
  E(7, '2026-10-02T09:00:00Z', 'visite_fixee', { debut: '2026-10-06T09:00:00.000Z' });
  statut(7, '2026-10-02T09:00:01Z', 'appele', 'visite'); mail(7, '2026-10-02T09:00:04Z', 'visite_fixee', true);
  E(7, '2026-10-06T20:00:00Z', 'avis_envoye', {});
  statut(7, '2026-10-06T20:00:01Z', 'visite', 'avis'); mail(7, '2026-10-06T20:00:05Z', 'statut:avis', true);
  V(7, 'fixee', '2026-10-06T09:00:00.000Z'); F(7, 'avis');

  // H : créneaux proposés il y a 73 heures, jamais confirmés. I : créneaux proposés il y a 2 heures.
  D(8, 'H', '2026-10-06T08:50:00Z', 'appele');
  statut(8, '2026-10-06T08:55:00Z', 'recue', 'appele'); mail(8, '2026-10-06T08:55:02Z', 'statut:appele', true);
  E(8, '2026-10-06T09:00:00Z', 'visite_demandee', { creneaux: ['2026-10-07T08:00:00.000Z'] }); V(8, 'demandee');
  D(9, 'I', '2026-10-09T07:30:00Z', 'appele');
  statut(9, '2026-10-09T07:35:00Z', 'recue', 'appele'); mail(9, '2026-10-09T07:35:02Z', 'statut:appele', true);
  E(9, '2026-10-09T08:00:00Z', 'visite_demandee', { creneaux: ['2026-10-10T08:00:00.000Z'] }); V(9, 'demandee');

  // J : avis de valeur 48 heures après la visite ; mandat signé, mais le mandat n'est pas dans l'espace.
  D(10, 'J', '2026-10-04T08:00:00Z', 'mandat');
  statut(10, '2026-10-04T08:05:00Z', 'recue', 'appele'); mail(10, '2026-10-04T08:05:02Z', 'statut:appele', true);
  E(10, '2026-10-04T08:06:00Z', 'visite_fixee', { debut: '2026-10-05T09:00:00.000Z' });
  statut(10, '2026-10-04T08:06:01Z', 'appele', 'visite'); mail(10, '2026-10-04T08:06:03Z', 'visite_fixee', true);
  E(10, '2026-10-07T09:00:00Z', 'avis_envoye', {});
  statut(10, '2026-10-07T09:00:01Z', 'visite', 'avis'); mail(10, '2026-10-07T09:00:04Z', 'statut:avis', true);
  statut(10, '2026-10-08T10:00:00Z', 'avis', 'mandat'); mail(10, '2026-10-08T10:00:03Z', 'statut:mandat', true);
  V(10, 'fixee', '2026-10-05T09:00:00.000Z'); F(10, 'avis');

  // K : visite faite il y a deux jours, pas d'avis de valeur.
  D(11, 'K', '2026-10-06T08:00:00Z', 'visite');
  statut(11, '2026-10-06T08:10:00Z', 'recue', 'appele'); mail(11, '2026-10-06T08:10:02Z', 'statut:appele', true);
  E(11, '2026-10-06T08:12:00Z', 'visite_fixee', { debut: '2026-10-07T09:00:00.000Z' });
  statut(11, '2026-10-06T08:12:01Z', 'appele', 'visite'); mail(11, '2026-10-06T08:12:03Z', 'visite_fixee', true);
  V(11, 'fixee', '2026-10-07T09:00:00.000Z');

  // L (20 septembre) : sous compromis, espace complet ; cinq comptes rendus de visite.
  D(12, 'L', '2026-09-20T08:00:00Z', 'compromis');
  statut(12, '2026-09-20T08:05:00Z', 'recue', 'appele'); mail(12, '2026-09-20T08:05:02Z', 'statut:appele', true);
  F(12, 'avis'); F(12, 'document', 'mandat'); F(12, 'document', 'compromis'); F(12, 'document', null); notaires.push({ demande_id: 12, nom: 'Me Durand' });
  comptes_rendus.push(
    { demande_id: 12, visite_le: '2026-10-08', publie_le: '2026-10-08T19:00:00Z' },   // 21 h le jour même
    { demande_id: 12, visite_le: '2026-10-07', publie_le: '2026-10-08T07:00:00Z' },   // le lendemain matin
    { demande_id: 12, visite_le: '2026-10-08', publie_le: null },                      // brouillon d'hier
    { demande_id: 12, visite_le: '2026-10-09', publie_le: null },                      // brouillon d'aujourd'hui
    { demande_id: 12, visite_le: '2026-10-08', publie_le: '2026-10-08T22:30:00Z' },   // 0 h 30 à Paris : c'est le lendemain
  );

  // M : vente signée fin août, hors des 30 jours.
  D(13, 'M', '2026-08-01T08:00:00Z', 'acte', { statut_le: '2026-08-30T10:00:00Z' });

  // N : mandat signé hier à 21 h 30, e-mail gardé pour le matin, parti à 8 h 07.
  D(14, 'N', '2026-09-25T08:00:00Z', 'mandat');
  statut(14, '2026-09-25T08:05:00Z', 'recue', 'appele'); mail(14, '2026-09-25T08:05:02Z', 'statut:appele', true);
  statut(14, '2026-10-08T19:30:00Z', 'avis', 'mandat'); mail(14, '2026-10-08T19:30:01Z', 'statut:mandat', false, 'heures_calmes'); mail(14, '2026-10-09T06:07:00Z', 'statut:mandat', true);
  F(14, 'avis'); F(14, 'document', 'mandat');

  // O : annonce en ligne hier à 22 h, e-mail gardé pour le matin… et jamais parti.
  D(15, 'O', '2026-09-26T08:00:00Z', 'annonce');
  statut(15, '2026-09-26T08:05:00Z', 'recue', 'appele'); mail(15, '2026-09-26T08:05:02Z', 'statut:appele', true);
  statut(15, '2026-10-08T20:00:00Z', 'mandat', 'annonce'); mail(15, '2026-10-08T20:00:01Z', 'statut:annonce', false, 'heures_calmes');
  F(15, 'avis'); F(15, 'document', 'mandat');

  return { demandes, evenements, visites, fichiers, notaires, comptes_rendus };
}
const essai = (d) => /@test\.invalid$/.test(JSON.parse(d.contact).email || '');
const une = (mesures, p, id) => mesures.filter((m) => m.p === p && m.demande === id).map((m) => ({ resultat: m.resultat, delai: m.delai, detail: m.detail }));
const dates = (mesures, p, id) => mesures.filter((m) => m.p === p && m.demande === id).map((m) => m.date);

test.describe('les règles des 7 promesses', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'ordinateur', 'calcul pur : une seule fois'); });

  test('chaque promesse, dossier par dossier', () => {
    const m = mesurer(jeu(), MAINTENANT, essai);
    // les essais et les robots ne comptent nulle part
    expect(m.filter((x) => x.demande === 5 || x.demande === 6)).toEqual([]);

    // 1. la fourchette en 2 minutes
    expect(une(m, 1, 1)).toEqual([{ resultat: 'tenue', delai: 1.6, detail: '' }]);
    expect(une(m, 1, 2)).toEqual([{ resultat: 'ratee', delai: 3.3, detail: 'Parcours de plus de 2 minutes' }]);
    expect(une(m, 1, 3)[0]).toMatchObject({ resultat: 'hors', delai: null });
    expect(une(m, 1, 3)[0].detail).toContain('Pas de fourchette automatique');
    expect(une(m, 1, 4)[0].detail).toContain('Durée non relevée');

    // 2. l'appel dans le quart d'heure (9 h – 19 h ; sinon avant 9 h 15 le lendemain)
    expect(une(m, 2, 1)).toEqual([{ resultat: 'tenue', delai: 9, detail: '' }]);
    expect(une(m, 2, 2)).toEqual([{ resultat: 'ratee', delai: 40, detail: 'Appelé après le quart d\'heure' }]);   // 9 h 40 pour 9 h : 40 minutes
    expect(une(m, 2, 3)).toEqual([{ resultat: 'en_cours', delai: null, detail: 'À appeler' }]);
    expect(une(m, 2, 4)).toEqual([{ resultat: 'ratee', delai: null, detail: 'Pas encore appelé' }]);
    expect(une(m, 2, 13)[0]).toMatchObject({ resultat: 'hors' });

    // 3. la visite sous 48 heures, ou plus tard si c'est le vendeur qui a choisi
    expect(une(m, 3, 1)).toEqual([{ resultat: 'tenue', delai: 23, detail: '' }]);
    expect(une(m, 3, 2)).toEqual([{ resultat: 'tenue', delai: 120, detail: 'Créneau choisi par le vendeur' }]);
    expect(une(m, 3, 7)).toEqual([{ resultat: 'ratee', delai: 96, detail: 'Visite fixée à plus de 48 heures' }]);
    expect(une(m, 3, 8)).toEqual([{ resultat: 'ratee', delai: null, detail: 'Créneaux proposés, visite jamais confirmée' }]);
    expect(une(m, 3, 9)).toEqual([{ resultat: 'en_cours', delai: null, detail: 'Créneaux proposés : à confirmer' }]);
    expect(une(m, 3, 3)).toEqual([]);            // pas de visite demandée : rien à mesurer

    // 4. l'avis de valeur dans les 24 heures qui suivent la visite
    expect(une(m, 4, 1)).toEqual([{ resultat: 'en_cours', delai: null, detail: 'Avis de valeur à envoyer' }]);
    expect(une(m, 4, 2)).toEqual([]);            // visite à venir
    expect(une(m, 4, 7)).toEqual([{ resultat: 'tenue', delai: 11, detail: '' }]);
    expect(une(m, 4, 10)).toEqual([{ resultat: 'ratee', delai: 48, detail: 'Avis de valeur envoyé après 24 heures' }]);
    expect(une(m, 4, 11)).toEqual([{ resultat: 'ratee', delai: null, detail: 'Avis de valeur pas encore envoyé' }]);

    // 5. tout au même endroit
    expect(une(m, 5, 7)).toEqual([{ resultat: 'tenue', delai: null, detail: '' }]);
    expect(une(m, 5, 10)).toEqual([{ resultat: 'ratee', delai: null, detail: 'Il manque dans son espace : mandat' }]);
    expect(une(m, 5, 12)).toEqual([{ resultat: 'tenue', delai: null, detail: '' }]);
    expect(une(m, 5, 13)).toEqual([{ resultat: 'ratee', delai: null, detail: 'Il manque dans son espace : avis de valeur, mandat, compromis, nom du notaire' }]);
    expect(une(m, 5, 1)).toEqual([]);            // avant l'avis de valeur : rien à ranger

    // 6. le compte rendu le soir même
    expect(une(m, 6, 12)).toEqual([
      { resultat: 'tenue', delai: 0, detail: '' },
      { resultat: 'ratee', delai: 1, detail: 'Compte rendu publié le lendemain' },
      { resultat: 'ratee', delai: null, detail: 'Compte rendu resté en brouillon' },
      { resultat: 'en_cours', delai: null, detail: 'Brouillon à publier ce soir' },
      { resultat: 'ratee', delai: 1, detail: 'Compte rendu publié le lendemain' },
    ]);

    // un compte rendu se date du jour de la visite ; l'état d'un espace n'a pas de date ; le reste se date à la minute
    expect(dates(m, 6, 12)).toEqual(['2026-10-08', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-08']);
    expect(dates(m, 5, 10)).toEqual(['']);
    expect(dates(m, 2, 1)).toEqual([undefined]);

    // 7. prévenu à chaque étape
    expect(une(m, 7, 1)).toEqual([{ resultat: 'tenue', delai: 0, detail: '' }, { resultat: 'tenue', delai: 0, detail: '' }]);
    expect(une(m, 7, 2)).toEqual([
      { resultat: 'ratee', delai: null, detail: 'Pas d\'e-mail : e-mails aux vendeurs pas encore ouverts' },
      { resultat: 'ratee', delai: null, detail: 'Pas d\'e-mail : e-mails aux vendeurs pas encore ouverts' },
    ]);
    expect(une(m, 7, 7)[0]).toEqual({ resultat: 'ratee', delai: null, detail: 'Pas d\'e-mail (case décochée)' });
    expect(une(m, 7, 14)[1]).toEqual({ resultat: 'tenue', delai: 637, detail: '' });                 // 21 h 30 → 8 h 07
    expect(une(m, 7, 15)[1]).toEqual({ resultat: 'ratee', delai: null, detail: 'Pas d\'e-mail : e-mail gardé pour 8 h, jamais parti' });
    // le même, vu à 6 h du matin : l'e-mail est gardé pour 8 h, la promesse court encore
    expect(une(mesurer(jeu(), new Date('2026-10-09T04:00:00Z'), essai), 7, 15)[1]).toEqual({ resultat: 'en_cours', delai: null, detail: 'E-mail gardé pour 8 h' });
  });

  test('le tableau : tenue, ratée, en cours, hors mesure et délai médian, sur 7 et 30 jours', () => {
    const t = tableau(mesurer(jeu(), MAINTENANT, essai), MAINTENANT);
    expect(t.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const b = (n, jours) => { const { tenue, ratee, en_cours, hors, taux, mediane: med, etat } = t[n - 1].periodes[jours]; return { tenue, ratee, en_cours, hors, taux, mediane: med, etat }; };
    // comptés à la main sur le jeu ci-dessus (voir les commentaires de chaque dossier)
    expect(b(1, 7)).toEqual({ tenue: 1, ratee: 1, en_cours: 0, hors: 6, taux: 50, mediane: expect.closeTo(2.45, 5), etat: 'ratee' });
    expect(b(1, 30)).toEqual({ tenue: 1, ratee: 1, en_cours: 0, hors: 10, taux: 50, mediane: expect.closeTo(2.45, 5), etat: 'ratee' });
    expect(b(2, 7)).toEqual({ tenue: 5, ratee: 2, en_cours: 1, hors: 0, taux: 71, mediane: 7, etat: 'ratee' });
    expect(b(2, 30)).toEqual({ tenue: 9, ratee: 2, en_cours: 1, hors: 0, taux: 82, mediane: 5, etat: 'ratee' });
    expect(b(3, 7)).toEqual({ tenue: 4, ratee: 1, en_cours: 1, hors: 0, taux: 80, mediane: 25, etat: 'ratee' });
    expect(b(3, 30)).toEqual({ tenue: 4, ratee: 2, en_cours: 1, hors: 0, taux: 67, mediane: 25, etat: 'ratee' });
    expect(b(4, 7)).toEqual({ tenue: 1, ratee: 2, en_cours: 1, hors: 0, taux: 33, mediane: 29.5, etat: 'ratee' });
    expect(b(4, 30)).toEqual(b(4, 7));
    expect(b(5, 7)).toEqual({ tenue: 4, ratee: 1, en_cours: 0, hors: 0, taux: 80, mediane: null, etat: 'ratee' });
    expect(b(5, 30)).toEqual(b(5, 7));            // la vente signée fin août est hors des 30 jours
    expect(b(6, 7)).toEqual({ tenue: 1, ratee: 3, en_cours: 1, hors: 0, taux: 25, mediane: 1, etat: 'ratee' });
    expect(b(7, 7)).toEqual({ tenue: 12, ratee: 3, en_cours: 0, hors: 0, taux: 80, mediane: 0, etat: 'ratee' });
    expect(b(7, 30)).toEqual({ tenue: 16, ratee: 4, en_cours: 0, hors: 0, taux: 80, mediane: 0, etat: 'ratee' });
    // ce qu'il faut regarder : les ratées d'abord, puis ce qui court encore
    expect(t[1].a_regarder.map((x) => [x.demande, x.resultat])).toEqual([[2, 'ratee'], [4, 'ratee'], [3, 'en_cours']]);
    expect(t[4].a_regarder.map((x) => x.demande)).toEqual([10]);
    expect(t[1].periodes[7].mediane_txt).toBe('7 min');
    expect(t[3].periodes[7].mediane_txt).toBe('30 h');
    expect(t[5].periodes[7].mediane_txt).toBe('le lendemain');
  });

  test('sans aucun dossier : sept promesses, rien à mesurer, aucune erreur', () => {
    const t = tableau(mesurer({ demandes: [] }, MAINTENANT), MAINTENANT);
    expect(t.length).toBe(7);
    for (const p of t) for (const j of [7, 30]) expect(p.periodes[j]).toMatchObject({ tenue: 0, ratee: 0, en_cours: 0, hors: 0, taux: null, mediane: null, etat: 'vide' });
    expect(PROMESSES.every((p) => p.titre && p.regle.startsWith('Tenue : '))).toBe(true);
  });

  test('médiane et délais dits simplement', () => {
    expect(mediane([])).toBe(null);
    expect(mediane([4])).toBe(4);
    expect(mediane([9, 1, 5])).toBe(5);
    expect(mediane([1, 3, null, 10, 2])).toBe(2.5);
    expect([delaiFr(0.3, 'min'), delaiFr(9, 'min'), delaiFr(45, 'min'), delaiFr(125, 'min'), delaiFr(637, 'min')]).toEqual(['moins d\'1 min', '9 min', '45 min', '2 h 05', '11 h']);
    expect([delaiFr(1.5, 'h'), delaiFr(23, 'h'), delaiFr(96, 'h')]).toEqual(['1 h 30', '23 h', '4 jours']);
    expect([delaiFr(0, 'j'), delaiFr(1, 'j'), delaiFr(3, 'j'), delaiFr(null, 'j')]).toEqual(['le jour même', 'le lendemain', '3 jours après', '']);
  });
});

/* =====================================================================================================
   2. et 3. Sur le site : un vrai dossier, puis la page
   ===================================================================================================== */

async function client(browser, info, o = {}, c = {}) {
  const ctx = await browser.newContext({ ...info.project.use, baseURL: SITE });
  const page = await ctx.newPage();
  await fausseBan(page);
  const r = await estimationComplete(page, o, c);
  return { ctx, page, ...r, ref: r.reponse.corps.reference, id: r.reponse.corps.demande_id };
}
/* L'export CSV, lu depuis la page (avec ses cookies) ; heure : l'heure donnée au serveur de test. Rend les lignes du dossier. */
async function mesures(page, ref, { jours = 7, heure = '' } = {}) {
  const r = await page.evaluate(async ([j, h]) => {
    const x = await fetch('/api/espace/admin/promesses.csv?jours=' + j, { headers: h ? { 'X-Horloge-Test': h } : {} });
    return { statut: x.status, type: x.headers.get('Content-Type'), nom: x.headers.get('Content-Disposition'), texte: await x.text() };
  }, [jours, heure]);
  expect(r.statut).toBe(200);
  const [tete, ...lignes] = r.texte.replace(/^\uFEFF/, '').split('\r\n').map((l) => l.split(';'));
  const miennes = lignes.filter((l) => l[7] === ref).map((l) => ({ n: +l[0], resultat: l[2], delai: l[3], clair: l[5], detail: l[10] }));
  return { ...r, tete, lignes, de: (n) => miennes.filter((x) => x.n === n) };
}
const deposer = (page, id, role, libelle) => page.evaluate(async ([i, r, l, pdf]) => {
  const x = await fetch(`/api/espace/admin/fichier?demande=${i}&role=${r}${l ? '&libelle=' + l : ''}&prevenir=0`, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-Fichier-Nom': (l || r) + '.pdf' }, body: new Blob([pdf], { type: 'application/pdf' }) });
  return x.status;
}, [id, role, libelle, PDF]);
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const hier = () => new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const dans = (jours) => new Date(Date.now() + jours * 86400000).toISOString();
const sansDebordement = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'rien ne dépasse de l\'écran').toBeLessThanOrEqual(1);
async function axe(page, nom) {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).include('.ee').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect.soft(r.violations.map((v) => `${v.id} (${v.impact}) : ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`), `accessibilité de l'écran « ${nom} »`).toEqual([]);
}

test('les 7 promesses mesurées sur un vrai dossier, de l\'estimation au mandat', async ({ page, request, browser }, info) => {
  test.setTimeout(300000);
  await viderBoite(request);
  const c = await client(browser, info, {}, { prenom: 'Paul', nom: 'Mesure' });
  const pc = c.page;
  await sessionAdmin(page, request);

  /* 1 et 2 : la fourchette vient d'être lue, l'appel est attendu */
  let m = await mesures(page, c.ref);
  expect(m.type).toContain('text/csv');
  expect(m.nom).toMatch(/promesses-7-jours-\d{4}-\d{2}-\d{2}\.csv/);
  expect(m.tete).toEqual(['n°', 'promesse', 'résultat', 'délai', 'unité', 'délai en clair', 'depuis le', 'référence', 'vendeur', 'commune', 'détail']);
  expect(m.de(1).length).toBe(1);
  expect(m.de(1)[0].resultat, 'un parcours de test dure moins de 2 minutes').toBe('tenue');
  expect(Number(m.de(1)[0].delai.replace(',', '.'))).toBeGreaterThan(0.05);
  expect(m.de(2)).toEqual([{ n: 2, resultat: 'en cours', delai: '', clair: '', detail: 'À appeler' }]);
  expect(m.lignes.find((l) => l[7] === c.ref).slice(8, 10)).toEqual(['Paul Mesure', 'Dijon']);
  // trois jours plus tard, toujours pas appelé : ratée
  expect((await mesures(page, c.ref, { heure: dans(3) })).de(2)).toEqual([{ n: 2, resultat: 'ratée', delai: '', clair: '', detail: 'Pas encore appelé' }]);

  /* 2 et 7 : appelé tout de suite, le vendeur reçoit l'e-mail */
  expect(await api(page, '/admin/demande', { id: c.id, statut: 'appele' })).toMatchObject({ _status: 200, mail: 'envoye' });
  expect((await courrier(request, pour(c.contact.email, /Suite à notre échange/))).length).toBe(1);
  await expect.poll(async () => (await mesures(page, c.ref)).de(7).map((x) => x.resultat)).toEqual(['tenue']);
  m = await mesures(page, c.ref);
  expect(m.de(2)[0]).toMatchObject({ resultat: 'tenue', detail: '' });
  expect(Number(m.de(2)[0].delai)).toBeLessThanOrEqual(15);

  /* 3 : le vendeur propose le premier créneau, l'agence le confirme */
  const creneau = (await api(pc, '/creneaux')).jours[0].heures[0].debut;
  expect(await api(pc, '/visite', { demande: c.id, creneaux: [creneau] })).toMatchObject({ _status: 201 });
  expect((await mesures(page, c.ref)).de(3)).toEqual([{ n: 3, resultat: 'en cours', delai: '', clair: '', detail: 'Créneaux proposés : à confirmer' }]);
  expect((await mesures(page, c.ref, { heure: dans(3) })).de(3)[0]).toMatchObject({ resultat: 'ratée', detail: 'Créneaux proposés, visite jamais confirmée' });
  expect(await api(page, '/admin/visite', { demande: c.id, debut: creneau })).toMatchObject({ _status: 200, mail: 'envoye' });
  await expect.poll(async () => (await mesures(page, c.ref)).de(7).map((x) => x.resultat)).toEqual(['tenue', 'tenue']);
  m = await mesures(page, c.ref);
  expect(m.de(3).length).toBe(1);
  expect(m.de(3)[0].resultat).toBe('tenue');
  expect(m.de(4), 'la visite n\'a pas encore eu lieu').toEqual([]);

  /* 4 : la visite a eu lieu il y a trois heures ; l'avis de valeur part ensuite */
  const ilYA3h = new Date(Date.now() - 3 * 3600000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
  expect(await api(page, '/admin/visite', { demande: c.id, debut: ilYA3h, prevenir: false })).toMatchObject({ _status: 200 });
  m = await mesures(page, c.ref);
  expect(m.de(4)).toEqual([{ n: 4, resultat: 'en cours', delai: '', clair: '', detail: 'Avis de valeur à envoyer' }]);
  expect(m.de(3).length, 'une visite déplacée ne rejoue pas la promesse 3').toBe(1);
  expect((await mesures(page, c.ref, { heure: dans(2) })).de(4)[0]).toMatchObject({ resultat: 'ratée', detail: 'Avis de valeur pas encore envoyé' });
  expect(m.de(5), 'avant l\'avis de valeur, rien à ranger dans l\'espace').toEqual([]);
  expect(await deposer(page, c.id, 'avis')).toBe(201);
  m = await mesures(page, c.ref);
  expect(m.de(4)).toEqual([{ n: 4, resultat: 'tenue', delai: '3', clair: '3 h', detail: '' }]);
  expect(m.de(5)).toEqual([{ n: 5, resultat: 'tenue', delai: '', clair: '', detail: '' }]);

  /* 5 et 7 : mandat signé sans prévenir le vendeur, et sans le mandat dans son espace */
  expect(await api(page, '/admin/demande', { id: c.id, statut: 'mandat', prevenir: false })).toMatchObject({ _status: 200, mail: 'non' });
  // (le dépôt de l'avis sans e-mail, deux lignes plus haut, compte lui aussi comme un changement non annoncé)
  m = await mesures(page, c.ref, { heure: dans(0.01) });
  expect(m.de(5)).toEqual([{ n: 5, resultat: 'ratée', delai: '', clair: '', detail: 'Il manque dans son espace : mandat' }]);
  expect(m.de(7).filter((x) => x.resultat === 'ratée').map((x) => x.detail)).toEqual(['Pas d\'e-mail (case décochée)', 'Pas d\'e-mail (case décochée)']);
  expect(m.de(7).filter((x) => x.resultat === 'tenue').length).toBe(2);
  expect(await deposer(page, c.id, 'document', 'mandat')).toBe(201);
  expect((await mesures(page, c.ref)).de(5)[0].resultat).toBe('tenue');

  /* 6 : un compte rendu le jour même, un le lendemain, un resté en brouillon */
  expect(await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: aujourdhui(), texte: 'Visite de ce matin.', publie: true, prevenir: false })).toMatchObject({ _status: 201 });
  expect(await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: hier(), texte: 'Visite d\'hier.', publie: true, prevenir: false })).toMatchObject({ _status: 201 });
  expect(await api(page, '/admin/compte-rendu', { demande: c.id, visite_le: hier(), texte: 'Jamais publié.', publie: false })).toMatchObject({ _status: 201 });
  m = await mesures(page, c.ref);
  expect(m.de(6).map((x) => [x.resultat, x.clair, x.detail]).sort()).toEqual([
    ['ratée', '', 'Compte rendu resté en brouillon'],
    ['ratée', 'le lendemain', 'Compte rendu publié le lendemain'],
    ['tenue', 'le jour même', ''],
  ]);
  // l'export sur 30 jours contient au moins les mêmes lignes
  expect((await mesures(page, c.ref, { jours: 30 })).de(6).length).toBe(3);

  /* les mêmes chiffres pour le Google Sheet et le contrôle du soir : une clé, sept lignes, aucun nom */
  expect((await request.get(SITE + '/api/espace/flux/promesses.csv?cle=' + 'x'.repeat(43))).status()).toBe(403);
  expect((await request.get(SITE + '/api/espace/flux/promesses.csv')).status()).toBe(403);
  const f = await api(page, '/admin/flux', {});
  expect(f.formule_promesses).toMatch(/^=IMPORTDATA\("http:\/\/127\.0\.0\.1:8788\/api\/espace\/flux\/promesses\.csv\?cle=[A-Za-z0-9_-]{40,}"\)$/);
  const flux = await request.get(f.promesses);
  expect(flux.status()).toBe(200);
  const texte = await flux.text();
  const tab = texte.split('\r\n').map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, 11).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
  expect(tab[0]).toEqual(['n°', 'promesse', 'tenues (7 j)', 'ratées (7 j)', 'en cours (7 j)', 'délai médian (7 j)', 'tenues (30 j)', 'ratées (30 j)', 'en cours (30 j)', 'délai médian (30 j)', 'calculé le']);
  expect(tab.length).toBe(8);
  expect(tab.slice(1).map((l) => l[0])).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  expect(texte, 'aucun nom, aucune référence, aucune adresse dans ce flux').not.toMatch(/Mesure|Paul|E-20|@|Bannelier/);
  const t = await api(page, '/admin/promesses');
  for (const p of t.promesses) expect(tab[p.n].slice(2, 5).map(Number)).toEqual([p.periodes[7].tenue, p.periodes[7].ratee, p.periodes[7].en_cours]);
  expect(Number(tab[6][3]), 'les deux comptes rendus ratés de ce dossier sont comptés').toBeGreaterThanOrEqual(2);

  /* la page : le dossier apparaît là où une promesse est ratée, avec un lien vers lui */
  await page.goto('/admin/promesses/');
  await expect(page.locator('#pr-in')).toBeVisible();
  await expect(page.locator('#pr-cartes .ee-prom')).toHaveCount(7);
  const p6 = page.locator('.ee-prom[data-promesse="6"]');
  await expect(p6.locator('h2')).toHaveText('Compte rendu le soir même');
  await expect(p6.locator('[data-test="etat"]')).toContainText('Ratée');
  const item = p6.locator('.ee-items li', { hasText: 'Paul Mesure' }).first();
  await expect(item).toBeVisible();
  await expect(item.locator('.tag')).toHaveText('Ratée');
  await expect(item.locator('.meta')).toHaveText(/^Compte rendu (publié le lendemain|resté en brouillon) · visite du \S+ \d+ \S+$/);
  await expect(item.locator('a')).toHaveAttribute('href', '/admin/?q=' + c.ref);
  await item.locator('a').click();
  await expect(page).toHaveURL(new RegExp('/admin/\\?q=' + c.ref));
  await expect(page.locator('#ad-rows .ee-row')).toHaveCount(1);
  await expect(page.locator('#ad-rows .ee-row summary b')).toContainText('Paul Mesure');
  // la ligne du dossier dit ce qui s'y est passé en dernier ; après une action, la trace est relue
  const trace = page.locator('#ad-rows .ee-row summary [data-test="trace"]');
  await expect(trace).toHaveText(/^Dernière trace : (compte rendu de visite publié|document déposé) · \S+ \d+ \S+ \d+ h( \d\d)?$/);
  await page.locator('#ad-rows [data-f="prevenir"]').uncheck();
  await page.locator('#ad-rows [data-f="statut"]').selectOption('annonce');
  await page.locator('#ad-rows [data-save]').click();
  await expect(trace).toHaveText(/^Dernière trace : statut « Annonce en ligne » · /);
  await sansDebordement(page);
  // le journal du dossier dit en combien de temps l'estimation a été faite
  await page.locator('#ad-rows [data-journal] summary').click();
  await expect(page.locator('#ad-rows [data-journal] li', { hasText: 'Estimation faite en ligne, en ' })).toHaveCount(1);
  await c.ctx.close();
});

test('la page des 7 promesses : cartes, 7 et 30 jours, export CSV, depuis /admin/', async ({ page, request }, info) => {
  test.setTimeout(180000);
  await sessionAdmin(page, request);
  // on y arrive depuis l'espace agence
  await page.goto('/admin/');
  await expect(page.locator('#ad-in')).toBeVisible();
  const lien = page.locator('.ee-ad-barre a[data-ee-lien="promesses"]');   // barre de l'espace agence (audit du 18/10/2026)
  await expect(lien).toContainText('Les 7 promesses');
  await lien.click();
  await expect(page).toHaveURL(/\/admin\/promesses\/$/);
  await expect(page.locator('h1')).toHaveText('Les 7 promesses.');
  await expect(page).toHaveTitle(/promesses/i);
  await expect(page.locator('#pr-in')).toBeVisible();
  const cartes = page.locator('#pr-cartes .ee-prom');
  await expect(cartes).toHaveCount(7);
  await expect(cartes.locator('h2')).toHaveText(['Une fourchette en 2 minutes', 'Appelé dans le quart d\'heure', 'Visite d\'estimation sous 48 h', 'Avis de valeur 24 h après la visite', 'Tout au même endroit', 'Compte rendu le soir même', 'Prévenu à chaque étape']);
  // chaque carte dit où elle en est, en toutes lettres (jamais par la seule couleur), et rappelle sa règle
  for (let i = 0; i < 7; i++) {
    await expect(cartes.nth(i).locator('[data-test="etat"]')).toHaveText(/^(Tenue|Ratée|Ratées : \d+|En cours|Pas encore de mesure)$/);
    await expect(cartes.nth(i).locator('p.meta').last()).toContainText('Tenue : ');
  }
  // les trois compteurs du haut font sept
  const total = async () => (await page.locator('#pr-stats .ee-stat b').allTextContents()).reduce((s, x) => s + Number(x), 0);
  expect(await total()).toBe(7);
  // ce que dit la page est ce que rend le calcul
  const t = await api(page, '/admin/promesses');
  expect(t).toMatchObject({ _status: 200, periodes: [7, 30], email_clients: true });
  expect(t.promesses.length).toBe(7);
  for (const p of t.promesses) {
    const b = p.periodes[7], carte = page.locator(`.ee-prom[data-promesse="${p.n}"]`);
    await expect(carte).toHaveAttribute('data-etat', b.etat);
    if (b.etat !== 'vide') {
      const txt = await carte.locator('[data-test="chiffres"]').innerText();
      if (b.tenue) expect(txt).toContain(`${b.tenue} tenue`);
      if (b.ratee) expect(txt).toContain(`${b.ratee} ratée`);
      if (b.en_cours) expect(txt).toContain(`${b.en_cours} en cours`);
    }
    if (b.taux != null) await expect(carte.locator('[data-test="taux"]')).toHaveText(`${b.tenue} fois sur ${b.tenue + b.ratee} (${b.taux} %)`);
    if (b.mediane_txt) await expect(carte.locator('[data-test="mediane"]')).toHaveText(b.mediane_txt);
    expect(b.tenue + b.ratee + b.en_cours + b.hors, '30 jours contient 7 jours').toBeLessThanOrEqual(p.periodes[30].tenue + p.periodes[30].ratee + p.periodes[30].en_cours + p.periodes[30].hors);
  }
  await sansDebordement(page);
  // listes dépliées : tout ce qui peut s'afficher est contrôlé
  await page.evaluate(() => document.querySelectorAll('.ee-prom-liste').forEach((d) => { d.open = true; }));
  await sansDebordement(page);
  await axe(page, 'les 7 promesses, 7 jours');
  await page.addStyleTag({ content: '#nav,#stickybar,.sim-peek{display:none!important}' });
  await page.locator('#r-promesses').screenshot({ path: `captures/etape4-${info.project.name}-promesses.png` });

  // 30 jours
  await page.locator('[data-jours="30"]').click();
  await expect(page.locator('[data-jours="30"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-jours="7"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#pr-export')).toHaveAttribute('href', '/api/espace/admin/promesses.csv?jours=30');
  for (const p of t.promesses) await expect(page.locator(`.ee-prom[data-promesse="${p.n}"]`)).toHaveAttribute('data-etat', p.periodes[30].etat);
  expect(await total()).toBe(7);
  await sansDebordement(page);
  await axe(page, 'les 7 promesses, 30 jours');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#pr-export').click()]);
  expect(dl.suggestedFilename()).toMatch(/^promesses-30-jours-\d{4}-\d{2}-\d{2}\.csv$/);
  // retour aux dossiers
  await page.locator('.ee-pr-liens a', { hasText: 'Dossiers vendeurs' }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
});

/* La page nourrie par le jeu de dossiers écrit à la main : ce qu'elle affiche est ce qui a été compté à la main plus haut.
   C'est aussi la capture d'exemple (noms inventés) : captures/etape4-<appareil>-exemple.png */
test('la page affiche les chiffres comptés à la main (capture d\'exemple)', async ({ page, request }, info) => {
  await sessionAdmin(page, request);
  const NOMS = { 2: ['Bernard Petit', 'Talant'], 3: ['Céline Roux', 'Dijon'], 4: ['David Morel', 'Chenôve'], 7: ['Gilles Faure', 'Quetigny'], 8: ['Hélène Blanc', 'Dijon'], 9: ['Inès Garnier', 'Longvic'], 10: ['Julien Robin', 'Dijon'], 11: ['Karine Henry', 'Fontaine-lès-Dijon'], 12: ['Luc Perrin', 'Dijon'], 15: ['Olivier Masson', 'Marsannay-la-Côte'] };
  const t = tableau(mesurer(jeu(), MAINTENANT, essai), MAINTENANT);
  await page.route('**/api/espace/admin/promesses', (route) => route.fulfill({ json: {
    calcule_le: MAINTENANT.toISOString(), periodes: [7, 30], email_clients: true,
    promesses: t.map((p) => ({ n: p.n, cle: p.cle, titre: p.titre, regle: p.regle, periodes: p.periodes,
      a_regarder: p.a_regarder.map((m) => ({ debut: m.debut, date: m.date, resultat: m.resultat, detail: m.detail, delai_txt: p.unite === 'j' ? '' : delaiFr(m.delai, p.unite), reference: 'E-EXEMPLE-' + m.demande, vendeur: (NOMS[m.demande] || ['Exemple'])[0], commune: (NOMS[m.demande] || [])[1] || '' })) })),
  } }));
  await page.goto('/admin/promesses/');
  await expect(page.locator('#pr-cartes .ee-prom')).toHaveCount(7);
  const carte = (n) => page.locator(`.ee-prom[data-promesse="${n}"]`);
  const lignes = async (n) => (await carte(n).locator('[data-test="chiffres"]').innerText()).replace(/\s+/g, ' ').trim();
  // 7 jours : chaque promesse a au moins une ratée dans ce jeu
  expect(await page.locator('#pr-stats .ee-stat b').allTextContents()).toEqual(['0', '7', '0']);
  expect(await lignes(2)).toBe('5 tenues 2 ratées 1 en cours');
  await expect(carte(2).locator('[data-test="etat"]')).toHaveText('Ratées : 2');
  await expect(carte(2).locator('[data-test="taux"]')).toHaveText('5 fois sur 7 (71 %)');
  await expect(carte(2).locator('[data-test="mediane"]')).toHaveText('7 min');
  await expect(carte(2).locator('.ee-items li')).toHaveCount(3);
  await expect(carte(2).locator('.ee-items li').first()).toContainText('Bernard Petit · Talant');
  await expect(carte(2).locator('.ee-items li').first().locator('.meta')).toHaveText('Appelé après le quart d\'heure · 40 min · jeu 8 oct 20 h 30');
  expect(await lignes(1)).toBe('1 tenue 1 ratée');
  await expect(carte(1).locator('[data-test="hors"]')).toHaveText('6 dossiers');
  expect(await lignes(3)).toBe('4 tenues 1 ratée 1 en cours');
  await expect(carte(3).locator('[data-test="mediane"]')).toHaveText('25 h');
  expect(await lignes(4)).toBe('1 tenue 2 ratées 1 en cours');
  expect(await lignes(5)).toBe('4 tenues 1 ratée');
  await expect(carte(5).locator('.ee-items .meta')).toHaveText('Il manque dans son espace : mandat');
  await expect(carte(5).locator('[data-test="mediane"]')).toHaveCount(0);
  expect(await lignes(6)).toBe('1 tenue 3 ratées 1 en cours');
  await expect(carte(6).locator('.ee-items .meta').first()).toHaveText(/^Compte rendu (publié le lendemain|resté en brouillon) · visite du (mercredi 7|jeudi 8) octobre$/);
  expect(await lignes(7)).toBe('12 tenues 3 ratées');
  await expect(carte(7).locator('[data-test="taux"]')).toHaveText('12 fois sur 15 (80 %)');
  await sansDebordement(page);
  await page.addStyleTag({ content: '#nav,#stickybar,.sim-peek{display:none!important}' });
  await page.locator('#r-promesses').screenshot({ path: `captures/etape4-${info.project.name}-exemple.png` });
  // 30 jours
  await page.locator('[data-jours="30"]').click();
  expect(await lignes(2)).toBe('9 tenues 2 ratées 1 en cours');
  await expect(carte(2).locator('[data-test="taux"]')).toHaveText('9 fois sur 11 (82 %)');
  await expect(carte(2).locator('[data-test="mediane"]')).toHaveText('5 min');
  expect(await lignes(3)).toBe('4 tenues 2 ratées 1 en cours');
  expect(await lignes(7)).toBe('16 tenues 4 ratées');
  await expect(carte(1).locator('[data-test="hors"]')).toHaveText('10 dossiers');
});

test('e-mails aux vendeurs fermés : la page dit pourquoi la promesse 7 ne peut pas être tenue', async ({ page, request }) => {
  await sessionAdmin(page, request);
  await page.route('**/api/espace/admin/promesses', async (route) => {
    const r = await route.fetch();
    await route.fulfill({ response: r, json: { ...(await r.json()), email_clients: false } });
  });
  await page.goto('/admin/promesses/');
  await expect(page.locator('#pr-alerte')).toBeVisible();
  await expect(page.locator('#pr-alerte')).toContainText('les e-mails aux vendeurs ne sont pas encore ouverts');
  await sansDebordement(page);
  await axe(page, 'les 7 promesses, e-mails fermés');
});

test('la mesure est réservée à l\'agence', async ({ page, browser }, info) => {
  test.setTimeout(120000);
  // personne de connecté : rien ne sort, la page renvoie vers l'espace agence
  await page.goto('/admin/promesses/');
  await expect(page.locator('#pr-no')).toBeVisible();
  await expect(page.locator('#pr-no')).toContainText('réservée à l\'agence');
  await expect(page.locator('#pr-in')).toBeHidden();
  await expect(page.locator('#pr-no a')).toHaveAttribute('href', '/admin/');
  expect(await api(page, '/admin/promesses')).toMatchObject({ _status: 401, error: 'connexion' });
  expect(await page.evaluate(async () => (await fetch('/api/espace/admin/promesses.csv')).status)).toBe(401);
  await axe(page, 'les 7 promesses, sans connexion');
  // un vendeur connecté : refusé lui aussi
  const c = await client(browser, info);
  expect(await api(c.page, '/admin/promesses')).toMatchObject({ _status: 403, error: 'interdit' });
  expect(await c.page.evaluate(async () => (await fetch('/api/espace/admin/promesses.csv?jours=30')).status)).toBe(403);
  await c.page.goto('/admin/promesses/');
  await expect(c.page.locator('#pr-no')).toContainText('Ce compte n\'a pas accès');
  await expect(c.page.locator('#pr-cartes .ee-prom')).toHaveCount(0);
  await c.ctx.close();
});
