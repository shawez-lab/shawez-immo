/* API de l'espace estimation — /api/espace/*  (Cloudflare Pages Functions + D1, liaison DB)

   Le même code sert les deux sites (shawez-immo.com et le site de l'agence) : même base, « site » noté sur chaque demande.

   Public
     GET  /api/espace/sante                 état : base, données DVF, e-mail
     POST /api/espace/estimation            parcours /estimer/ : enregistre la demande, crée le compte (sans mot de passe),
                                            renvoie la fourchette tout de suite
     POST /api/espace/acces                 { email } → 1re étape de la connexion : « mot_de_passe » si l'espace en a un,
                                            sinon lien de connexion envoyé (même réponse pour une adresse inconnue)
     POST /api/espace/lien                  { email, vers? } → lien de connexion par e-mail (30 min, usage unique) ;
                                            vers: 'admin' (adresse de l'agence seulement) : le lien ouvre /admin/
     POST /api/espace/lien/ouvrir           { jeton } → ouvre la session
     POST /api/espace/connexion             { email, mot_de_passe } (pour ceux qui ont choisi un mot de passe)
     POST /api/espace/deconnexion
     POST /api/espace/inscription           compte sans estimation (ex. accès admin)
     POST /api/espace/mot-de-passe/oubli    { email } → lien par e-mail (si l'envoi est possible)
     POST /api/espace/mot-de-passe/reinit   { jeton, mot_de_passe }
     GET  /api/espace/verifier?jeton=…      anciens liens de confirmation : renvoi vers /mon-espace/?lien=…
     GET  /api/espace/flux/site.csv?cle=…   demandes pour le Google Sheet (IMPORTDATA), protégé par une clé
     GET  /api/espace/flux/promesses.csv?cle=…   les 7 promesses en chiffres (7 et 30 jours), sans aucun nom : pour un onglet
                                            du Google Sheet et pour le contrôle du soir ; même clé
     GET  /api/espace/creneaux              créneaux de visite d'estimation proposables (lundi-samedi, 9 h-19 h, 45 min),
                                            sans les moments déjà pris (visites fixées, agenda Google si relié : _lib/agenda.js)
     POST /api/espace/rdv                   rendez-vous en 2 clics sans estimation (accueil, contact, /merci/) :
                                            { creneau, prenom, telephone, adresse, email?, consentement: true } → demande
                                            « Nouvelle » + visite demandée sur ce créneau + alerte à l'agence
     GET  /api/espace/taches                tâches à heure fixe (rappel de visite la veille à 18 h, e-mails gardés la nuit
                                            et envoyés à 8 h) ; sans effet si rien n'est dû
   Client connecté
     GET  /api/espace/moi                   compte + ses demandes (frise, prochaine étape, visite) + ses fichiers
     POST /api/espace/visite                { demande, creneaux: [1 à 3 débuts], message?, deplacer? } : demande de visite
     POST /api/espace/verification          renvoie le lien de vérification
     POST /api/espace/mot-de-passe/definir  { mot_de_passe, actuel? } : choisir ou changer son mot de passe
     POST /api/espace/compte/supprimer      { mot_de_passe } ou { confirmation: 'SUPPRIMER' }
     POST /api/espace/fichier?demande=…     dépôt d'une photo ou d'un document (corps = le fichier, 10 Mo max)
     GET  /api/espace/fichier?id=…          téléchargement (le client pour ses demandes, l'agence pour toutes)
     POST /api/espace/fichier/supprimer     { id }
   Admin (e-mail dans ADMIN_EMAILS et vérifié)
     GET  /api/espace/admin/demandes
     GET  /api/espace/admin/comptes
     POST /api/espace/admin/demande         { id, statut?, notes?, rappel_le?, raison?, prevenir? } ; un changement de statut
                                            est noté au journal et annoncé au vendeur par e-mail (sauf prevenir: false)
     POST /api/espace/admin/visite          { demande, debut | debut_local, prevenir? } fixe la visite ; { demande, annuler: true }
     GET  /api/espace/admin/avis?demande=…  avis de valeur : brouillon, ventes comparables réelles (DVF), valeurs proposées
     POST /api/espace/admin/avis            { demande, contenu } enregistre le brouillon (notes, atouts, vigilance, fourchette, stratégie)
     POST /api/espace/admin/avis/brouillon?demande=…   dépôt du PDF brouillon (corps = le PDF ; invisible pour le vendeur)
     POST /api/espace/admin/avis/valider    { demande, prevenir? } : le brouillon devient l'avis de valeur du vendeur
     GET  /api/espace/admin/journal?demande=…   tout ce qui s'est passé sur un dossier
     POST /api/espace/admin/reglages        { rdv_url } : page de réservation Google Agenda (facultatif) ;
                                            { agenda_ics } : adresse secrète iCal de l'agenda Google (lecture des moments pris)
     GET  /api/espace/admin/suite?demande=… après le mandat : comptes rendus de visite, offres, notaire d'un dossier
     POST /api/espace/admin/compte-rendu    { demande, id?, visite_le, texte, publie, prevenir? } ; { id, supprimer: true }
     POST /api/espace/admin/offre           { demande, id?, montant, recue_le, conditions, statut, prevenir? } ; { id, supprimer: true }
     POST /api/espace/admin/notaire         { demande, nom, coordonnees, etapes: { cle: { fait, le } }, prevenir? }
     POST /api/espace/admin/demande/supprimer { id }
     POST /api/espace/admin/fichier?demande=…&role=avis|document   dépôt de l'avis de valeur (PDF) ou d'un document
     POST /api/espace/admin/compte/supprimer { id }
     POST /api/espace/admin/compte/lien     { id, type: 'acces' | 'reinit' } : lien (24 h) à transmettre au client
     POST /api/espace/admin/flux            nouvelle clé pour le Google Sheet (affichée une seule fois)
     GET  /api/espace/admin/export.csv?quoi=demandes|comptes&site=…&statut=…
     GET  /api/espace/admin/promesses       les 7 promesses faites au vendeur, sur 7 et 30 jours : tenue / ratée, délai médian
     GET  /api/espace/admin/promesses.csv?jours=7|30   les mêmes mesures, une ligne par mesure
*/
import {
  db, json, Erreur, corps, texte, entier, choix, email as lireEmail, telephone, motDePasse, verifierOrigine,
  ip, limiter, hacher, verifierMdp, jeton, sha256, ouvrirSession, cookieEfface, temoinPresent, compteSession, fermerSession,
  estAdmin, admins, comptepublic, maintenant, STATUTS, STATUTS_CLIENT, PARCOURS, SORTIES, reglerHachage,
} from '../../_lib/base.js';
import { estimer, ventesComparables } from '../../_lib/estimation.js';
import {
  paris, deParis, quandFr, quandCourt, creneaux, creneauValide, prochaineAction, lireCreneaux, frise, suiteVendeur,
  mailStatut, mailVisite, lienAgenda, heureFr, AGENCE, DUREE_VISITE,
  OFFRES, ETAPES_NOTAIRE, DOCUMENTS, mailCompteRendu, mailOffre, mailNotaire, heuresCalmes, eurosFr,
} from '../../_lib/suivi.js';
import { envoyer, mailPossible, mailClients, peutEcrire, destinatairesAlerte, adresseDeTest, gabarit, paragraphe, bouton, esc } from '../../_lib/mail.js';
import { deposer, lire as lireFichier, supprimerFichier, fichiersDe, supprimerFichiersDe, TAILLE_MAX } from '../../_lib/fichiers.js';
import { mesurer, tableau, delaiFr, PROMESSES, PERIODES } from '../../_lib/promesses.js';
import { agendaOccupe, retirerOccupes, adresseIcsValide } from '../../_lib/agenda.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const chemin = '/' + [].concat(params.route || []).join('/');
  try {
    reglerHachage(env);
    verifierOrigine(request);
    const r = ROUTES[`${request.method} ${chemin}`];
    if (!r) return json(404, { error: 'introuvable' });
    const reponse = await r(context);
    tachesAuPassage(context);
    return reponse;
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code, ...(e.extra || {}) });
    console.log('erreur', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}

const ROUTES = {
  'GET /sante': sante,
  'POST /estimation': estimation,
  'POST /acces': acces,
  'POST /lien': lienDemander,
  'POST /lien/ouvrir': lienOuvrir,
  'POST /connexion': connexion,
  'POST /deconnexion': deconnexion,
  'POST /inscription': inscription,
  'POST /mot-de-passe/oubli': oubli,
  'POST /mot-de-passe/reinit': reinit,
  'POST /mot-de-passe/definir': definirMdp,
  'GET /verifier': verifier,
  'GET /flux/site.csv': flux,
  'GET /flux/promesses.csv': fluxPromesses,
  'GET /moi': moi,
  'POST /verification': renvoyerVerification,
  'POST /compte/supprimer': supprimerCompte,
  'POST /fichier': fichierDeposer,
  'GET /fichier': fichierLire,
  'POST /fichier/supprimer': fichierSupprimer,
  'GET /admin/demandes': adminDemandes,
  'GET /admin/comptes': adminComptes,
  'POST /admin/demande': adminDemande,
  'POST /admin/demande/supprimer': adminSupprimerDemande,
  'POST /admin/fichier': adminFichier,
  'POST /admin/compte/supprimer': adminSupprimerCompte,
  'POST /admin/compte/lien': adminLien,
  'POST /admin/flux': adminFlux,
  'GET /admin/export.csv': adminExport,
  'GET /creneaux': creneauxDispo,
  'POST /rdv': rdvExpress,
  'GET /taches': taches,
  'POST /visite': visiteDemander,
  'POST /admin/visite': adminVisite,
  'GET /admin/avis': adminAvisLire,
  'POST /admin/avis': adminAvisEnregistrer,
  'POST /admin/avis/brouillon': adminAvisBrouillon,
  'POST /admin/avis/valider': adminAvisValider,
  'GET /admin/journal': adminJournal,
  'POST /admin/reglages': adminReglages,
  'GET /admin/suite': adminSuite,
  'POST /admin/compte-rendu': adminCompteRendu,
  'POST /admin/offre': adminOffre,
  'POST /admin/notaire': adminNotaire,
  'GET /admin/promesses': adminPromesses,
  'GET /admin/promesses.csv': adminPromessesCsv,
};

/* ------------------------------------------------------------------ */

/* Version de l'API : les tests sur l'aperçu attendent de la voir avant de commencer (le site met une à deux minutes
   à se mettre à jour après une poussée). À changer à chaque évolution de l'API. */
const VERSION = '2026-10-09.1';

/* Clé du flux Google Sheet : on ne garde que son empreinte. Celle-ci est la clé de mise en service ; dès qu'un admin
   en génère une nouvelle (/admin/ → « Google Sheet »), c'est l'empreinte en base qui fait foi. */
const FLUX_EMPREINTE = '110715548f718204106d44b452f1921511623524842c05e24cbf6926a6ac4472';

async function cleValide(env, cle) {
  if (typeof cle !== 'string' || cle.length < 30 || cle.length > 100) return false;
  let attendu = String(env.FLUX_CLE_SHA256 || FLUX_EMPREINTE);
  try {
    const r = await (await db(env)).prepare("SELECT valeur FROM reglages WHERE cle = 'flux'").first();
    if (r && r.valeur) attendu = r.valeur;
  } catch (e) { /* base absente : clé de mise en service */ }
  const h = await sha256(cle);
  let diff = h.length ^ attendu.length;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ attendu.charCodeAt(i % attendu.length);
  return diff === 0;
}

async function sante({ env, request }) {
  const url = new URL(request.url);
  let base = false, dvf = null;
  try { await (await db(env)).prepare('SELECT 1').first(); base = true; } catch (e) { /* base absente */ }
  try {
    const r = await env.ASSETS.fetch(new URL('/donnees-dvf/index.json', request.url));
    if (r.ok) { const i = await r.json(); dvf = { ventes: i.ventes, derniere_vente: i.derniere_vente, annees: i.annees }; }
  } catch (e) { /* pas de données */ }
  const rep = { version: VERSION, base, dvf, email: mailPossible(env), email_clients: mailClients(env) };
  // dernier envoi d'alerte à l'agence : parti ou non, et pourquoi (aucune adresse, aucune donnée de client)
  if (base) {
    try { const a = await (await db(env)).prepare("SELECT valeur FROM reglages WHERE cle = 'alerte'").first(); if (a) rep.derniere_alerte = JSON.parse(a.valeur); } catch (e) { /* rien */ }
  }
  // Détail réservé au porteur de la clé (aucune donnée personnelle de client) : contrôle de mise en service.
  const cle = url.searchParams.get('cle');
  if (cle && base && (await cleValide(env, cle))) {
    const b = await db(env);
    const un = async (sql, ...a) => (await b.prepare(sql).bind(...a).first()) || {};
    rep.detail = {
      site: site(request, env),
      comptes: (await un('SELECT COUNT(*) AS n FROM comptes')).n,
      demandes: (await un('SELECT COUNT(*) AS n FROM demandes')).n,
      demandes_suspectes: (await un('SELECT COUNT(*) AS n FROM demandes WHERE suspect = 1')).n,
      derniere_demande: (await un('SELECT MAX(cree_le) AS d FROM demandes')).d || null,
      fichiers: (await un('SELECT COUNT(*) AS n, COALESCE(SUM(taille),0) AS o FROM fichiers')),
      admins: await Promise.all(admins(env).map(async (a) => {
        const c = await un('SELECT verifie, mdp, cree_le, derniere_connexion FROM comptes WHERE email = ?1', a);
        return { email: a, compte: c.cree_le ? { cree_le: c.cree_le, verifie: !!c.verifie, mot_de_passe: !!c.mdp, derniere_connexion: c.derniere_connexion || null } : null };
      })),
      alertes_vers: destinatairesAlerte(env),
      voies: { resend: !!env.RESEND_API_KEY, email: !!env.EMAIL, mailer: !!env.MAILER, client_mail: String(env.CLIENT_MAIL || '') === '1' },
    };
    if (url.searchParams.get('email') === '1') {
      // e-mail d'essai, uniquement vers les adresses d'alerte de l'agence
      await limiter(env, 'essai-mail', 4, 3600);
      rep.essai = [];
      for (const to of destinatairesAlerte(env)) {
        const detail = {};
        const ok = await envoyer(env, {
          to, subject: 'Essai : les alertes du site arrivent bien',
          text: `Bonjour,\n\nCeci est un essai d'envoi depuis l'espace estimation (${url.hostname}), le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.\nSi vous lisez ce message, les alertes « nouvelle estimation » arrivent bien dans cette boîte.\n\nRien à faire.`,
          html: gabarit('Les alertes arrivent bien', paragraphe(`Ceci est un essai d'envoi depuis l'espace estimation (${esc(url.hostname)}).<br>Si vous lisez ce message, les alertes « nouvelle estimation » arrivent bien dans cette boîte. Rien à faire.`), site(request, env)),
        }, detail);
        rep.essai.push({ to, envoye: ok, ...detail });
      }
    }
  }
  return json(200, rep);
}

/* Robot probable : champ leurre rempli, ou parcours bouclé en moins de 4 secondes.
   La demande n'est jamais jetée (un remplissage automatique peut remplir le leurre) : elle est gardée et signalée. */
function antiRobot(d) {
  if (d.website || d.ee_hp) return true;
  const ms = Number(d.duree);
  return !Number.isFinite(ms) || ms < 4000;
}

const BOOL = (v) => v === true;

function lireReponses(d) {
  const type = choix(d.type, ['appartement', 'maison', 'autre'], { requis: true, nom: 'type' });
  const r = {
    type,
    adresse: texte(d.adresse, 200, { requis: true, nom: 'adresse' }),
    code_postal: texte(d.code_postal, 5, { nom: 'code_postal' }),
    commune: texte(d.commune, 100, { nom: 'commune' }),
    citycode: texte(d.citycode, 5, { nom: 'citycode' }),
    lat: d.lat == null || d.lat === '' ? null : Number(d.lat),
    lon: d.lon == null || d.lon === '' ? null : Number(d.lon),
    prix_ideal: entier(d.prix_ideal, 0, 100000000, { nom: 'prix_ideal' }),
    delai: choix(d.delai, ['asap', '6mois', 'plus6mois', 'nsp', 'aucun'], { requis: true, nom: 'delai' }),
    message: texte(d.message, 1500, { nom: 'message' }),
  };
  if (r.code_postal && !/^\d{5}$/.test(r.code_postal)) throw new Erreur(400, 'champs', { champ: 'code_postal' });
  if (r.lat != null && !(r.lat > 41 && r.lat < 52)) throw new Erreur(400, 'champs', { champ: 'lat' });
  if (r.lon != null && !(r.lon > -6 && r.lon < 10)) throw new Erreur(400, 'champs', { champ: 'lon' });
  if (type === 'autre') {
    r.autre_type = choix(d.autre_type, ['commerce', 'murs', 'immeuble', 'terrain', 'autre'], { requis: true, nom: 'autre_type' });
    r.surface = entier(d.surface, 1, 100000, { nom: 'surface' });
    return r;
  }
  Object.assign(r, {
    surface: entier(d.surface, 9, 2000, { requis: true, nom: 'surface' }),
    pieces: entier(d.pieces, 1, 30, { requis: true, nom: 'pieces' }),
    chambres: entier(d.chambres, 0, 20, { requis: true, nom: 'chambres' }),
    epoque: choix(d.epoque, ['avant1948', '1948-1974', '1975-2000', '2001-2012', 'apres2012', 'nsp'], { requis: true, nom: 'epoque' }),
    etat: choix(d.etat, ['travaux', 'rafraichir', 'bon', 'neuf'], { requis: true, nom: 'etat' }),
    terrasse: BOOL(d.terrasse),
  });
  if (type === 'appartement') {
    Object.assign(r, {
      etage: entier(d.etage, 0, 60, { requis: true, nom: 'etage' }),
      etages_immeuble: entier(d.etages_immeuble, 0, 60, { requis: true, nom: 'etages_immeuble' }),
      ascenseur: BOOL(d.ascenseur), balcon: BOOL(d.balcon), cave: BOOL(d.cave), gardien: BOOL(d.gardien),
      parking: BOOL(d.parking), parking_box: BOOL(d.parking_box),
    });
  } else {
    Object.assign(r, {
      terrain: entier(d.terrain, 0, 1000000, { requis: true, nom: 'terrain' }),
      niveaux: entier(d.niveaux, 1, 6, { requis: true, nom: 'niveaux' }),
      plain_pied: BOOL(d.plain_pied), piscine: BOOL(d.piscine), garage: BOOL(d.garage),
    });
  }
  return r;
}

function lireContact(c) {
  if (!c || typeof c !== 'object') throw new Erreur(400, 'champs', { champ: 'contact' });
  return {
    civilite: choix(c.civilite, ['M.', 'Mme'], { nom: 'civilite' }),
    prenom: texte(c.prenom, 80, { requis: true, nom: 'prenom' }),
    nom: texte(c.nom, 80, { requis: true, nom: 'nom' }),
    email: lireEmail(c.email),
    telephone: telephone(c.telephone),
  };
}

function reference() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `E-${d}-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/* Site d'où vient la demande : « shawez » ou « gravelin ». Variable SOURCE du projet, sinon indication de la page,
   sinon nom de domaine. */
const siteDe = (s) => (/gravelin/i.test(String(s || '')) ? 'gravelin' : 'shawez');
function site(request, env, d) {
  if (env.SOURCE) return siteDe(env.SOURCE);
  if (d && (d.site === 'gravelin' || d.site === 'shawez')) return d.site;
  return siteDe(new URL(request.url).hostname);
}

const enAttenteDe = async (base, compteId) => (await base.prepare('SELECT COUNT(*) AS n FROM demandes WHERE compte_id = ?1 AND en_attente = 1').bind(compteId).first()).n;

async function estimation(ctx) {
  const { request, env } = ctx;
  const d = await corps(request);
  const suspect = antiRobot(d);
  // par adresse IP : 30 par heure et 80 par jour (une box ou un opérateur mobile partage la sienne entre plusieurs personnes)
  await limiter(env, 'est:' + ip(request), 30, 3600);
  await limiter(env, 'estj:' + ip(request), 80, 86400);

  const rep = lireReponses(d.reponses || {});
  if (d.consentement !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
  const base = await db(env);
  const lieu = site(request, env, d);
  const cle = typeof d.cle === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(d.cle) ? d.cle : null;
  const session = await compteSession(request, env);

  // Double envoi (double clic, réseau lent, nouvel essai) : même clé → même demande, pas de doublon.
  const rejouer = async () => {
    const deja = cle && (await base.prepare('SELECT * FROM demandes WHERE cle = ?1').bind(cle).first());
    if (!deja) return null;
    const c = deja.compte_id ? await base.prepare('SELECT * FROM comptes WHERE id = ?1').bind(deja.compte_id).first() : null;
    let cookie = null;
    let connecte = !!(session && c && session.id === c.id);
    // la première réponse (avec le cookie) s'est perdue en route : on rouvre la session du compte tout juste créé
    if (!connecte && c && !deja.en_attente && !c.verifie && !c.mdp && c.cree_le === deja.cree_le && Date.now() - Date.parse(deja.cree_le) < 600000) {
      cookie = await ouvrirSession(env, c.id);
      connecte = true;
    }
    // l'e-mail de la première réponse est peut-être parti, mais rien ne le garantit : on ne l'annonce pas
    let res = null;
    try { res = JSON.parse(deja.resultat || 'null'); } catch (e) { /* ancien format */ }
    return json(200, {
      reference: deja.reference, resultat: res || { fourchette: false, raison: 'rappel' }, rejoue: true,
      demande_id: connecte && !deja.en_attente ? deja.id : null,
      compte: connecte ? comptepublic(c, env) : null,
      espace: { connecte, nouveau: connecte && !c.verifie && !c.mdp, existant: !connecte && !!c, en_attente: !!deja.en_attente, lien: 'indisponible', mot_de_passe: !!(c && c.mdp) },
    }, cookie ? { 'Set-Cookie': cookie } : {});
  };
  const rejoue = await rejouer();
  if (rejoue) return rejoue;

  const t = maintenant();
  let compte = session;
  let cookie = null;
  let contact;
  let nouveau = false;
  let enAttente = 0;

  if (compte) {
    contact = { civilite: compte.civilite, prenom: compte.prenom, nom: compte.nom, email: compte.email, telephone: compte.telephone };
    if (d.contact && d.contact.telephone) contact.telephone = telephone(d.contact.telephone);
  } else {
    contact = lireContact(d.contact);
    let existant = await base.prepare('SELECT * FROM comptes WHERE email = ?1').bind(contact.email).first();
    if (!existant) {
      // Compte créé avec l'e-mail, sans mot de passe : rien ne retarde l'affichage du résultat.
      try {
        compte = await base.prepare(
          `INSERT INTO comptes (email, mdp, civilite, prenom, nom, telephone, source, consentement_le, cree_le)
           VALUES (?1, '', ?2, ?3, ?4, ?5, ?6, ?7, ?7) RETURNING *`
        ).bind(contact.email, contact.civilite, contact.prenom, contact.nom, contact.telephone, lieu, t).first();
        nouveau = true;
      } catch (e) {
        existant = await base.prepare('SELECT * FROM comptes WHERE email = ?1').bind(contact.email).first();
        if (!existant) throw e;
      }
    }
    if (existant) {
      // Un espace existe déjà avec cet e-mail : la demande y est rattachée, mais on n'ouvre pas la session à sa place.
      // Si l'adresse n'a jamais été prouvée, la demande n'apparaît dans l'espace qu'après une connexion par lien.
      compte = existant;
      enAttente = existant.verifie ? 0 : 1;
    }
  }

  const res = await estimer(env, request.url, rep);
  const ref = reference();
  let demandeId = null;
  try {
    demandeId = (await base.prepare(
      `INSERT INTO demandes (reference, compte_id, source, type, adresse, code_postal, commune, lat, lon, reponses, contact,
         prix_bas, prix_haut, prix_m2, comparables, rayon, donnees_du, cree_le, en_attente, cle, suspect, resultat)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22) RETURNING id`
    ).bind(ref, compte.id, lieu, rep.type, rep.adresse, rep.code_postal, rep.commune, rep.lat, rep.lon,
      JSON.stringify(rep), JSON.stringify(contact),
      res.fourchette ? res.bas : null, res.fourchette ? res.haut : null, res.fourchette ? res.prix_m2 : null,
      res.comparables ?? null, res.rayon ?? null, res.donnees_du || null, t, enAttente, cle, suspect ? 1 : 0, JSON.stringify(res)).first()).id;
  } catch (e) {
    // deux envois arrivés en même temps avec la même clé : le second rend la demande du premier
    const r = await rejouer();
    if (r) return r;
    throw e;
  }
  // promesse n° 1 (la fourchette en 2 minutes) : la durée du parcours, telle que le navigateur l'a comptée, notée au
  // journal avec la demande (une demande d'essai supprimée dans la seconde ne laisse ainsi rien derrière elle)
  if (!suspect) await journal(base, demandeId, 'estimation', 'client', { duree: Math.round(Math.min(Number(d.duree) || 0, 2 * 3600000)), fourchette: !!res.fourchette }).catch((e) => console.log('journal estimation', e && e.message));
  if (nouveau) cookie = await ouvrirSession(env, compte.id);

  const ecrireAuClient = !suspect && peutEcrire(env, contact.email);
  if (!adresseDeTest(contact.email)) ctx.waitUntil(notifier(env, request, ref, rep, contact, res, lieu, suspect).catch((e) => console.log('notification', e && e.message)));
  // L'e-mail au client est attendu (8 s au plus) : la page ne dit « un e-mail vient de partir » que s'il est vraiment parti.
  let mailParti = false;
  if (ecrireAuClient) {
    const envoi = mailResultat(env, request, compte, ref, rep, contact, res, lieu).catch((e) => { console.log('mail client', e && e.message); return false; });
    ctx.waitUntil(envoi);
    mailParti = await Promise.race([envoi, new Promise((r) => setTimeout(() => r(false), 8000))]);
  }

  const connecte = !!session || nouveau;
  return json(201, {
    reference: ref, resultat: res,
    demande_id: connecte && !enAttente ? demandeId : null,
    compte: connecte ? comptepublic(compte, env) : null,
    espace: { connecte, nouveau, existant: !connecte, en_attente: !!enAttente, lien: mailParti === true ? 'envoye' : 'indisponible', mot_de_passe: !!compte.mdp },
  }, cookie ? { 'Set-Cookie': cookie } : {});
}

/* ---------------------- Connexion ---------------------- */

async function connexion({ request, env }) {
  const d = await corps(request, 2000);
  const e = lireEmail(d.email);
  await limiter(env, 'cnx:' + ip(request), 20, 900);
  await limiter(env, 'cnx:' + e, 10, 900);
  const c = await (await db(env)).prepare('SELECT * FROM comptes WHERE email = ?1').bind(e).first();
  const ok = c && typeof d.mot_de_passe === 'string' && (await verifierMdp(d.mot_de_passe, c.mdp));
  if (!ok) {
    // le compte existe mais n'a pas de mot de passe : on le dit, sinon la personne croit n'avoir « jamais créé de compte »
    if (c && !c.mdp) throw new Erreur(401, 'sans_mot_de_passe', { lien: peutEcrire(env, e) });
    throw new Erreur(401, 'identifiants');
  }
  return json(200, { compte: comptepublic(c, env) }, { 'Set-Cookie': await ouvrirSession(env, c.id) });
}

async function deconnexion({ request, env }) {
  await fermerSession(request, env);
  return json(200, { ok: true }, { 'Set-Cookie': cookieEfface });
}

async function inscription(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 4000);
  if (d.website || d.ee_hp) return json(202, { ok: true });
  await limiter(env, 'ins:' + ip(request), 5, 3600);
  if (d.consentement !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
  const c = lireContact(d);
  const mdp = motDePasse(d.mot_de_passe);
  const base = await db(env);
  if (await base.prepare('SELECT id FROM comptes WHERE email = ?1').bind(c.email).first()) throw new Erreur(409, 'compte_existe');
  const compte = await base.prepare(
    `INSERT INTO comptes (email, mdp, civilite, prenom, nom, telephone, source, consentement_le, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING *`
  ).bind(c.email, await hacher(mdp), c.civilite, c.prenom, c.nom, c.telephone, site(request, env, d), maintenant()).first();
  ctx.waitUntil(lienVerification(env, request, compte).catch(() => {}));
  return json(201, { compte: comptepublic(compte, env) }, { 'Set-Cookie': await ouvrirSession(env, compte.id) });
}

async function nouveauJeton(env, compteId, usage, secondes, { garder = false } = {}) {
  const t = jeton();
  const base = await db(env);
  const maintenantS = Math.floor(Date.now() / 1000);
  await base.batch([
    garder ? base.prepare('DELETE FROM jetons WHERE expire < ?1').bind(maintenantS)
      : base.prepare('DELETE FROM jetons WHERE (compte_id = ?1 AND usage = ?2) OR expire < ?3').bind(compteId, usage, maintenantS),
    base.prepare('INSERT INTO jetons (id, compte_id, usage, expire) VALUES (?1, ?2, ?3, ?4)').bind(await sha256(t), compteId, usage, maintenantS + secondes),
  ]);
  return t;
}

// Usage unique : le jeton est effacé à la lecture.
async function consommerJeton(env, t, usages) {
  if (typeof t !== 'string' || t.length < 20 || t.length > 100) return null;
  const base = await db(env);
  const id = await sha256(t);
  const liste = [].concat(usages);
  const r = await base.prepare(`DELETE FROM jetons WHERE id = ?1 AND expire > ?2 AND usage IN (${liste.map((_, i) => `?${i + 3}`).join(',')}) RETURNING compte_id`)
    .bind(id, Math.floor(Date.now() / 1000), ...liste).first();
  return r ? r.compte_id : null;
}

// L'adresse est prouvée (lien reçu par e-mail ou transmis par l'agence) : le compte est vérifié,
// et les demandes en attente de preuve rejoignent l'espace.
// Première preuve, depuis un navigateur qui n'était pas déjà connecté à ce compte : rien ne dit que le mot de passe
// et les sessions posés avant viennent du vrai titulaire (n'importe qui peut ouvrir un compte avec l'e-mail d'un autre,
// y compris celui de l'agence). On les retire : seul celui qui lit la boîte e-mail garde la main.
// Renvoie true si un mot de passe a été retiré (l'espace le dit, pour en choisir un nouveau).
async function prouver(env, compteId, session) {
  const base = await db(env);
  const c = await base.prepare('SELECT verifie, mdp FROM comptes WHERE id = ?1').bind(compteId).first();
  if (!c) return false;
  const ops = [
    base.prepare('UPDATE comptes SET verifie = 1 WHERE id = ?1').bind(compteId),
    base.prepare('UPDATE demandes SET en_attente = 0 WHERE compte_id = ?1').bind(compteId),
  ];
  const memePersonne = !!(session && session.id === compteId);
  let retire = false;
  if (!c.verifie && !memePersonne) {
    ops.push(base.prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(compteId));
    if (c.mdp) { ops.push(base.prepare("UPDATE comptes SET mdp = '' WHERE id = ?1").bind(compteId)); retire = true; }
  }
  await base.batch(ops);
  return retire;
}

/* Lien de connexion (« lien magique ») : 30 minutes, usage unique. */
const DUREE_LIEN = 30 * 60;
async function lienConnexion(env, request, compteId, chemin = '/mon-espace/') {
  const t = await nouveauJeton(env, compteId, 'magique', DUREE_LIEN);
  return `${new URL(request.url).origin}${chemin}?lien=${t}`;
}

const SIGNATURE = 'Shawez Ali – Gravelin Immo\n07 67 57 92 28';
const SIGNATURE_HTML = '<b>Shawez Ali</b> – Gravelin Immo<br><a href="tel:+33767579228" style="color:inherit;">07 67 57 92 28</a>';

async function lienDemander({ request, env }) {
  const d = await corps(request, 1000);
  return json(200, await envoyerLien(request, env, d, lireEmail(d.email)));
}

/* Connexion en deux temps : l'e-mail d'abord. L'espace a un mot de passe → on le demande (rien n'est envoyé) ;
   sinon (pas de mot de passe, ou pas d'espace) → le lien part tout de suite, avec la même réponse dans les deux cas. */
async function acces({ request, env }) {
  const d = await corps(request, 1000);
  const e = lireEmail(d.email);
  await limiter(env, 'acces:' + ip(request), 30, 3600);
  const c = await (await db(env)).prepare('SELECT mdp FROM comptes WHERE email = ?1').bind(e).first();
  if (c && c.mdp) return json(200, { etape: 'mot_de_passe' });
  return json(200, { etape: 'lien', ...(await envoyerLien(request, env, d, e)) });
}

async function envoyerLien(request, env, d, e) {
  await limiter(env, 'lien:' + ip(request), 8, 3600);
  await limiter(env, 'lien:' + e, 4, 3600);
  if (!peutEcrire(env, e)) return { envoye: false, raison: 'email_indisponible' };
  const base = await db(env);
  let c = await base.prepare('SELECT * FROM comptes WHERE email = ?1').bind(e).first();
  // l'agence n'a pas à « créer un compte » : le premier lien demandé par une adresse d'admin crée le sien
  if (!c && admins(env).includes(e)) {
    c = await base.prepare(
      `INSERT INTO comptes (email, mdp, prenom, nom, source, consentement_le, cree_le) VALUES (?1, '', '', '', ?2, ?3, ?3)
       ON CONFLICT(email) DO UPDATE SET email = email RETURNING *`
    ).bind(e, site(request, env, d), maintenant()).first();
  }
  if (c) {
    const lieu = site(request, env, d);
    // demandé depuis /admin/ par une adresse de l'agence : le lien ouvre directement l'espace agence
    const agence = d.vers === 'admin' && admins(env).includes(e);
    const lien = await lienConnexion(env, request, c.id, agence ? '/admin/' : '/mon-espace/');
    const quoi = agence ? "l'espace agence" : 'votre espace';
    await envoyer(env, {
      to: c.email,
      subject: agence ? 'Votre lien de connexion à l\'espace agence' : 'Votre lien de connexion',
      text: `Bonjour ${c.prenom || ''},\n\nVoici votre lien pour ouvrir ${quoi} (valable 30 minutes, une seule fois) :\n${lien}\n\nSi vous n'avez rien demandé, ignorez ce message.\n\n${SIGNATURE}`,
      html: gabarit('Votre lien de connexion', paragraphe(`Bonjour ${esc(c.prenom || '')},<br>voici votre lien pour ouvrir ${quoi}. Il est valable 30 minutes et ne sert qu'une fois.`) + `<tr><td style="padding:0 24px 16px;">${bouton(lien, agence ? 'Ouvrir l\'espace agence' : 'Ouvrir mon espace', true, lieu)}</td></tr>` + paragraphe(`<span style="font-size:14px;color:#6B655C;">Si vous n'avez rien demandé, ignorez ce message.</span><br><br>${SIGNATURE_HTML}`), lieu),
    });
  }
  // même réponse que le compte existe ou non
  return { envoye: true };
}

async function lienOuvrir({ request, env }) {
  const d = await corps(request, 1000);
  await limiter(env, 'ouvrir:' + ip(request), 30, 3600);
  const id = await consommerJeton(env, d.jeton, ['magique', 'acces', 'verif', 'suivi']);
  if (!id) throw new Erreur(400, 'jeton');
  const session = await compteSession(request, env);
  const retire = await prouver(env, id, session);
  const c = await (await db(env)).prepare('SELECT * FROM comptes WHERE id = ?1').bind(id).first();
  if (!c) throw new Erreur(400, 'jeton');
  return json(200, { compte: comptepublic(c, env), mot_de_passe_retire: retire }, { 'Set-Cookie': await ouvrirSession(env, id, true) });
}

async function lienVerification(env, request, compte) {
  if (!peutEcrire(env, compte.email)) return false;
  const t = await nouveauJeton(env, compte.id, 'verif', 7 * 24 * 3600);
  const lien = `${new URL(request.url).origin}/mon-espace/?lien=${t}`;
  const lieu = site(request, env);
  return envoyer(env, {
    to: compte.email,
    subject: 'Confirmez votre adresse e-mail',
    text: `Bonjour ${compte.prenom || ''},\n\nPour confirmer votre adresse e-mail et sécuriser votre espace, ouvrez ce lien (valable 7 jours) :\n${lien}\n\n${SIGNATURE}`,
    html: gabarit('Confirmez votre adresse e-mail', paragraphe(`Bonjour ${esc(compte.prenom || '')},<br>pour confirmer votre adresse et sécuriser votre espace, cliquez ci-dessous. Le lien est valable 7 jours.`) + `<tr><td style="padding:0 24px 16px;">${bouton(lien, 'Confirmer mon adresse', true, lieu)}</td></tr>`, lieu),
  });
}

// Anciens liens de confirmation (/api/espace/verifier?jeton=…) : renvoyés vers la page, qui échange le jeton elle-même
// (un lien ouvert par l'antivirus d'une messagerie ne consomme ainsi rien).
async function verifier({ request }) {
  const t = new URL(request.url).searchParams.get('jeton') || '';
  return Response.redirect(new URL('/mon-espace/?lien=' + encodeURIComponent(t), request.url).toString(), 303);
}

async function renvoyerVerification({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  await limiter(env, 'ver:' + c.id, 3, 3600);
  const ok = await lienVerification(env, request, c);
  return json(200, { envoye: !!ok });
}

async function oubli({ request, env }) {
  const d = await corps(request, 1000);
  const e = lireEmail(d.email);
  await limiter(env, 'oubli:' + ip(request), 5, 3600);
  if (!peutEcrire(env, e)) return json(200, { envoye: false, raison: 'email_indisponible' });
  const c = await (await db(env)).prepare('SELECT * FROM comptes WHERE email = ?1').bind(e).first();
  if (c) {
    const lieu = site(request, env, d);
    const t = await nouveauJeton(env, c.id, 'reinit', 3600);
    const lien = `${new URL(request.url).origin}/mon-espace/?reinit=${t}`;
    await envoyer(env, {
      to: c.email,
      subject: 'Nouveau mot de passe pour votre espace',
      text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${lien}\n\nSi vous n'avez rien demandé, ignorez ce message.\n\n${SIGNATURE}`,
      html: gabarit('Nouveau mot de passe', paragraphe('Pour choisir un nouveau mot de passe, cliquez ci-dessous. Le lien est valable 1 heure. Si vous n\'avez rien demandé, ignorez ce message.') + `<tr><td style="padding:0 24px 16px;">${bouton(lien, 'Choisir un mot de passe', true, lieu)}</td></tr>`, lieu),
    });
  }
  // même réponse que le compte existe ou non
  return json(200, { envoye: true });
}

async function reinit({ request, env }) {
  const d = await corps(request, 1000);
  const mdp = motDePasse(d.mot_de_passe);
  await limiter(env, 'reinit:' + ip(request), 10, 3600);
  const id = await consommerJeton(env, d.jeton, 'reinit');
  if (!id) throw new Erreur(400, 'jeton');
  const base = await db(env);
  // le lien reçu prouve aussi l'adresse
  await prouver(env, id, null);
  await base.batch([
    base.prepare('UPDATE comptes SET mdp = ?1 WHERE id = ?2').bind(await hacher(mdp), id),
    base.prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(id),
  ]);
  const c = await base.prepare('SELECT * FROM comptes WHERE id = ?1').bind(id).first();
  return json(200, { compte: comptepublic(c, env) }, { 'Set-Cookie': await ouvrirSession(env, id, true) });
}

/* Choisir un mot de passe (facultatif) depuis son espace ou juste après le résultat ; ou le changer. */
async function definirMdp({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  const d = await corps(request, 1000);
  const mdp = motDePasse(d.mot_de_passe);
  await limiter(env, 'mdp:' + c.id, 10, 3600);
  // changer un mot de passe existant : l'ancien, sauf si la session vient d'un lien reçu par e-mail
  if (c.mdp && !c.session_prouvee && !(await verifierMdp(typeof d.actuel === 'string' ? d.actuel : '', c.mdp))) throw new Erreur(401, 'identifiants');
  const base = await db(env);
  await base.batch([
    base.prepare('UPDATE comptes SET mdp = ?1 WHERE id = ?2').bind(await hacher(mdp), c.id),
    base.prepare('DELETE FROM sessions WHERE compte_id = ?1 AND id != ?2').bind(c.id, c.session_id),
  ]);
  return json(200, { compte: comptepublic({ ...c, mdp: 'x' }, env) });
}

/* ---------------------- Espace client ---------------------- */

function demandePublique(d, statuts = STATUTS_CLIENT) {
  let rep = {};
  try { rep = JSON.parse(d.reponses || '{}'); } catch (e) { /* illisible */ }
  return {
    id: d.id, reference: d.reference, cree_le: d.cree_le, type: d.type, adresse: d.adresse, commune: d.commune,
    surface: rep.surface ?? null, pieces: rep.pieces ?? null,
    prix_bas: d.prix_bas, prix_haut: d.prix_haut, prix_m2: d.prix_m2, comparables: d.comparables, rayon: d.rayon, donnees_du: d.donnees_du,
    statut: d.statut, statut_libelle: statuts[d.statut] || d.statut, maj_le: d.maj_le,
  };
}

async function moi({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) {
    // le témoin « connecté » traîne alors que la session a expiré : on le retire
    return json(200, { compte: null, email: mailClients(env) }, temoinPresent(request) ? { 'Set-Cookie': cookieEfface } : {});
  }
  const base = await db(env);
  const r = await base.prepare('SELECT * FROM demandes WHERE compte_id = ?1 AND en_attente = 0 ORDER BY cree_le DESC').bind(c.id).all();
  const ids = r.results.map((d) => d.id);
  const fichiers = await fichiersDe(env, ids);
  const visites = await visitesDe(base, ids);
  const dates = await datesStatuts(base, ids);
  const suites = await suiteDe(base, ids);
  return json(200, {
    compte: comptepublic(c, env),
    demandes: r.results.map((d) => ({
      ...demandePublique(d),
      ...suiviVendeur(d, visites.get(d.id), dates.get(d.id), etatOffre(suites.get(d.id).offres)),
      ...suiteVendeurPublique(suites.get(d.id)),
      // le brouillon de l'avis de valeur reste à l'agence tant qu'il n'est pas validé
      fichiers: fichiers.filter((f) => f.demande_id === d.id && f.role !== 'brouillon').map(fichierPublic),
    })),
    en_attente: await enAttenteDe(base, c.id),
    email: peutEcrire(env, c.email),
    taille_max: TAILLE_MAX,
    rdv_url: await reglage(base, 'rdv_url'),
  });
}

async function supprimerCompte({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  const d = await corps(request, 1000);
  if (c.mdp && !c.session_prouvee) {
    if (typeof d.mot_de_passe !== 'string' || !(await verifierMdp(d.mot_de_passe, c.mdp))) throw new Erreur(401, 'identifiants');
  } else if (String(d.confirmation || '').trim().toUpperCase() !== 'SUPPRIMER') {
    throw new Erreur(400, 'champs', { champ: 'confirmation' });
  }
  await effacerCompte(env, c.id);
  return json(200, { ok: true }, { 'Set-Cookie': cookieEfface });
}

async function effacerCompte(env, id) {
  const base = await db(env);
  const dem = await base.prepare('SELECT id FROM demandes WHERE compte_id = ?1').bind(id).all();
  await supprimerFichiersDe(env, dem.results.map((d) => d.id));
  await effacerSuivi(base, dem.results.map((d) => d.id));
  await base.batch([
    base.prepare('DELETE FROM demandes WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM jetons WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM comptes WHERE id = ?1').bind(id),
  ]);
}

/* ---------------------- Fichiers (photos, documents, avis de valeur) ---------------------- */

const fichierPublic = (f) => ({ id: f.id, nom: f.nom, type: f.type, taille: f.taille, role: f.role, depose_par: f.depose_par, cree_le: f.cree_le, libelle: DOCUMENTS[f.libelle] || '' });

async function fichierDeposer({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  await limiter(env, 'fic:' + c.id, 40, 3600);
  const url = new URL(request.url);
  const demandeId = entier(url.searchParams.get('demande'), 1, 1e12, { requis: true, nom: 'demande' });
  const dem = await (await db(env)).prepare('SELECT id FROM demandes WHERE id = ?1 AND compte_id = ?2 AND en_attente = 0').bind(demandeId, c.id).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  const f = await deposer(env, request, { demandeId, compteId: c.id, role: url.searchParams.get('role') === 'document' ? 'document' : 'photo', par: 'client' });
  return json(201, { fichier: fichierPublic(f) });
}

async function fichierLire({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  const id = texte(new URL(request.url).searchParams.get('id'), 64, { requis: true, nom: 'id' });
  const base = await db(env);
  const f = await base.prepare('SELECT f.*, d.compte_id AS proprietaire, d.en_attente AS attente FROM fichiers f JOIN demandes d ON d.id = f.demande_id WHERE f.id = ?1').bind(id).first();
  if (!f || !(estAdmin(c, env) || (f.proprietaire === c.id && !f.attente && f.role !== 'brouillon'))) throw new Erreur(404, 'introuvable');
  return lireFichier(env, f);
}

async function fichierSupprimer({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  const d = await corps(request, 500);
  const id = texte(d.id, 64, { requis: true, nom: 'id' });
  const base = await db(env);
  const f = await base.prepare('SELECT f.*, d.compte_id AS proprietaire FROM fichiers f JOIN demandes d ON d.id = f.demande_id WHERE f.id = ?1').bind(id).first();
  // le client retire ce qu'il a déposé ; l'agence retire tout
  if (!f || !(estAdmin(c, env) || (f.proprietaire === c.id && f.depose_par === 'client'))) throw new Erreur(404, 'introuvable');
  await supprimerFichier(env, f);
  return json(200, { ok: true });
}

async function adminFichier(ctx) {
  const { request, env } = ctx;
  const moiAdmin = await exigerAdmin(request, env);
  const url = new URL(request.url);
  const demandeId = entier(url.searchParams.get('demande'), 1, 1e12, { requis: true, nom: 'demande' });
  const base = await db(env);
  const dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(demandeId).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  const role = url.searchParams.get('role') === 'avis' ? 'avis' : 'document';
  // nature du document (mandat, diagnostics, compromis…) : le vendeur le retrouve sous ce nom
  const libelle = role === 'document' ? choix(url.searchParams.get('libelle') || '', Object.keys(DOCUMENTS), { nom: 'libelle' }) : '';
  const f = await deposer(env, request, { demandeId, compteId: moiAdmin.id, role, par: 'agence', pdfSeul: role === 'avis', libelle });
  if (role === 'document') await journal(base, demandeId, 'document', 'agence', { fichier: f.id, nom: f.nom, libelle: DOCUMENTS[libelle] || '' });
  let statut = dem.statut;
  // l'avis de valeur est déposé : le dossier passe à « avis de valeur envoyé »
  if (role === 'avis') {
    await journal(base, demandeId, 'avis_envoye', 'agence', { fichier: f.id, depot: 'manuel' });
    if (avant(dem.statut, 'avis')) statut = (await changerStatut(ctx, dem, 'avis', { prevenir: new URL(request.url).searchParams.get('prevenir') !== '0' })).statut;
  }
  return json(201, { fichier: fichierPublic(f), statut });
}

/* ---------------------------- Admin ---------------------------- */

async function exigerAdmin(request, env) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  if (!estAdmin(c, env)) throw new Erreur(403, admins(env).includes(c.email) ? 'admin_non_verifie' : 'interdit');
  return c;
}

const lireJson = (s) => { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } };

async function adminDemandes({ request, env }) {
  await exigerAdmin(request, env);
  const base = await db(env);
  const r = await base.prepare(
    `SELECT d.*, c.email AS compte_email FROM demandes d LEFT JOIN comptes c ON c.id = d.compte_id ORDER BY d.cree_le DESC LIMIT 2000`
  ).all();
  const ids = r.results.map((d) => d.id);
  const fichiers = await fichiersDe(env, ids);
  const visites = await visitesDe(base, ids);
  const traces = await dernieresTraces(base);
  const offres = await etatOffres(base);
  const avis = new Map((await base.prepare('SELECT demande_id, fichier_id, prepare_le, valide_le FROM avis').all()).results.map((a) => [a.demande_id, a]));
  return json(200, {
    statuts: STATUTS,
    parcours: PARCOURS,
    stockage: env.FICHIERS ? 'r2' : 'd1',
    taille_max: TAILLE_MAX,
    email_clients: mailClients(env),
    rdv_url: await reglage(base, 'rdv_url'),
    agenda_relie: !!(await reglage(base, 'agenda_ics')),
    statuts_offre: OFFRES, documents: DOCUMENTS, aujourdhui: paris(new Date()).date,
    demandes: r.results.map((d) => ({
      ...vueAgence(d, visites.get(d.id), offres.get(d.id)),
      test: adresseDeTest(lireJson(d.contact).email),
      contact: lireJson(d.contact), reponses: lireJson(d.reponses), compte_email: d.compte_email,
      trace: traces.get(d.id) || null,
      avis: avis.get(d.id) ? { prepare_le: avis.get(d.id).prepare_le, valide_le: avis.get(d.id).valide_le } : null,
      fichiers: fichiers.filter((f) => f.demande_id === d.id).map(fichierPublic),
    })),
  });
}

async function adminComptes({ request, env }) {
  await exigerAdmin(request, env);
  const r = await (await db(env)).prepare(
    `SELECT c.id, c.email, c.civilite, c.prenom, c.nom, c.telephone, c.verifie, c.source, c.cree_le, c.derniere_connexion, (c.mdp != '') AS mot_de_passe,
            (SELECT COUNT(*) FROM demandes d WHERE d.compte_id = c.id) AS demandes
     FROM comptes c ORDER BY c.cree_le DESC LIMIT 5000`
  ).all();
  return json(200, { comptes: r.results.map((c) => ({ ...c, site: siteDe(c.source), mot_de_passe: !!c.mot_de_passe, admin: estAdmin(c, env) })) });
}

async function adminDemande(ctx) {
  const { request, env } = ctx;
  await exigerAdmin(request, env);
  const d = await corps(request, 8000);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  const sets = [];
  const vals = [];
  const statut = d.statut != null ? choix(d.statut, Object.keys(STATUTS), { requis: true, nom: 'statut' }) : null;
  if (d.notes != null) { sets.push('notes = ?'); vals.push(texte(d.notes, 5000, { nom: 'notes' })); }
  if (d.raison != null) { sets.push('raison = ?'); vals.push(texte(d.raison, 300, { nom: 'raison' }) || null); }
  if (d.rappel_le != null) {
    const j = texte(d.rappel_le, 10, { nom: 'rappel_le' });
    if (j && (!/^\d{4}-\d{2}-\d{2}$/.test(j) || Number.isNaN(Date.parse(j)))) throw new Erreur(400, 'champs', { champ: 'rappel_le' });
    sets.push('rappel_le = ?'); vals.push(j || null);
  }
  if (d.suspect === false) sets.push('suspect = 0');
  if (!sets.length && !statut) throw new Erreur(400, 'champs');
  const base = await db(env);
  let r = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(id).first();
  if (!r) throw new Erreur(404, 'introuvable');
  if (sets.length) {
    sets.push('maj_le = ?');
    vals.push(maintenant(), id);
    r = await base.prepare(`UPDATE demandes SET ${sets.join(', ')} WHERE id = ? RETURNING *`).bind(...vals).first();
  }
  // le changement de statut : noté au journal, annoncé au vendeur (un e-mail court), sauf demande contraire
  let mail = 'non';
  if (statut && statut !== r.statut) {
    r = await changerStatut(ctx, r, statut, { prevenir: d.prevenir !== false, raison: r.raison || undefined });
    mail = r._mail;
  }
  return json(200, { demande: vueAgence(r, (await visitesDe(base, [id])).get(id), (await etatOffres(base, id)).get(id)), mail });
}

async function adminSupprimerDemande({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  await supprimerFichiersDe(env, [id]);
  await effacerSuivi(await db(env), [id]);
  await (await db(env)).prepare('DELETE FROM demandes WHERE id = ?1').bind(id).run();
  return json(200, { ok: true });
}

async function adminSupprimerCompte({ request, env }) {
  const moiAdmin = await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  if (id === moiAdmin.id) throw new Erreur(400, 'soi_meme');
  await effacerCompte(env, id);
  return json(200, { ok: true });
}

/* Lien à transmettre au client (WhatsApp, SMS, e-mail) : connexion directe, ou choix d'un nouveau mot de passe. 24 h. */
async function adminLien({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  const type = d.type === 'reinit' ? 'reinit' : 'acces';
  const c = await (await db(env)).prepare('SELECT id FROM comptes WHERE id = ?1').bind(id).first();
  if (!c) throw new Erreur(404, 'introuvable');
  const t = await nouveauJeton(env, id, type, 24 * 3600);
  return json(200, { type, lien: `${new URL(request.url).origin}/mon-espace/?${type === 'reinit' ? 'reinit' : 'lien'}=${t}` });
}

async function adminFlux({ request, env }) {
  await exigerAdmin(request, env);
  const cle = jeton();
  await (await db(env)).prepare("INSERT INTO reglages (cle, valeur) VALUES ('flux', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(await sha256(cle)).run();
  const adresse = `${new URL(request.url).origin}/api/espace/flux/site.csv?cle=${cle}`;
  const promesses = adresse.replace('/flux/site.csv', '/flux/promesses.csv');
  return json(200, { adresse, formule: `=IMPORTDATA("${adresse}")`, promesses, formule_promesses: `=IMPORTDATA("${promesses}")` });
}

const csvCase = (v, sep) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d[\d ]+$/.test(s)) s = "'" + s;   // pas de formule dans le tableur
  return s.includes(sep) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (lignes, sep) => lignes.map((l) => l.map((v) => csvCase(v, sep)).join(sep)).join('\r\n');

const LIBELLES = {
  delai: { asap: 'Dès que possible', '6mois': 'Dans les 6 mois', plus6mois: 'Dans plus de 6 mois', nsp: 'Ne sait pas encore', aucun: 'Pas de projet de vente' },
  etat: { travaux: 'Travaux importants', rafraichir: 'Quelques travaux', bon: 'Bon état', neuf: 'Refait à neuf' },
  epoque: { avant1948: 'Avant 1948', '1948-1974': '1948 – 1974', '1975-2000': '1975 – 2000', '2001-2012': '2001 – 2012', apres2012: 'Après 2012', nsp: 'Ne sait pas' },
  autre_type: { commerce: 'Fonds de commerce', murs: 'Murs commerciaux', immeuble: 'Immeuble', terrain: 'Terrain', autre: 'Autre' },
};
const euros = (n) => (n == null ? '' : Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €');
const typeLibelle = (rep) => (rep.type === 'autre' ? LIBELLES.autre_type[rep.autre_type] || 'Autre' : rep.type === 'maison' ? 'Maison' : 'Appartement');
const rayonLibelle = (r) => (r >= 1000 ? (r / 1000).toLocaleString('fr-FR') + ' km' : r + ' m');
const jourFr = (iso) => { const [a, m, j] = String(iso || '').slice(0, 10).split('-'); return a && m && j ? `${j}/${m}/${a}` : ''; };
const moisFr = (iso) => { try { return new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return ''; } };

async function adminExport({ request, env }) {
  await exigerAdmin(request, env);
  const p = new URL(request.url).searchParams;
  const quoi = p.get('quoi') === 'comptes' ? 'comptes' : 'demandes';
  const base = await db(env);
  let lignes;
  if (quoi === 'comptes') {
    const r = await base.prepare('SELECT id, cree_le, email, civilite, prenom, nom, telephone, verifie, source, derniere_connexion FROM comptes ORDER BY cree_le DESC').all();
    lignes = [['id', 'créé le', 'e-mail', 'civilité', 'prénom', 'nom', 'téléphone', 'e-mail vérifié', 'site', 'dernière connexion'],
      ...r.results.map((c) => [c.id, c.cree_le, c.email, c.civilite, c.prenom, c.nom, c.telephone, c.verifie ? 'oui' : 'non', siteDe(c.source), c.derniere_connexion])];
  } else {
    const r = await base.prepare('SELECT * FROM demandes ORDER BY cree_le DESC').all();
    const fSite = p.get('site'), fStatut = p.get('statut');
    lignes = [['référence', 'reçue le', 'site', 'statut', 'rappeler avant', 'civilité', 'prénom', 'nom', 'e-mail', 'téléphone', 'type', 'adresse', 'code postal', 'commune',
      'surface', 'pièces', 'chambres', 'étage', 'état', 'époque', 'terrain', 'prix idéal', 'délai', 'fourchette basse', 'fourchette haute', 'prix m²', 'comparables', 'rayon (m)', 'données du', 'notes', 'réponses (JSON)']];
    for (const d of r.results) {
      if (fSite && siteDe(d.source) !== fSite) continue;
      if (fStatut && d.statut !== fStatut) continue;
      const c = lireJson(d.contact);
      const q = lireJson(d.reponses);
      lignes.push([d.reference, d.cree_le, siteDe(d.source), STATUTS[d.statut] || d.statut, d.rappel_le, c.civilite, c.prenom, c.nom, c.email, c.telephone, typeLibelle(q), d.adresse, d.code_postal, d.commune,
        q.surface, q.pieces, q.chambres, q.etage, LIBELLES.etat[q.etat], LIBELLES.epoque[q.epoque], q.terrain, q.prix_ideal, LIBELLES.delai[q.delai], d.prix_bas, d.prix_haut, d.prix_m2, d.comparables, d.rayon, d.donnees_du, d.notes, d.reponses]);
    }
  }
  return new Response('﻿' + csv(lignes, ';'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
      'Content-Disposition': `attachment; filename="${quoi}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

/* ---------------------- Flux pour le Google Sheet « Relance leads », onglet « Site » ----------------------
   =IMPORTDATA("https://…/api/espace/flux/site.csv?cle=…") en A1 : Google relit l'adresse environ toutes les heures.
   Une ligne par demande, de la plus ancienne à la plus récente (les lignes ne bougent pas quand une demande arrive). */
const STATUTS_SHEET = {
  recue: 'nouvelle', appele: 'appelé', visite: 'visite prévue', avis: 'avis envoyé', mandat: 'mandat signé', annonce: 'annonce en ligne',
  visites: 'visites en cours', offre: 'offre reçue', compromis: 'compromis signé', acte: 'acte signé', pause: 'pas maintenant', close: 'perdu',
};

function telephoneLisible(t) {
  const s = String(t || '').trim();
  const c = s.replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(c)) return c.replace(/(\d{2})(?=\d)/g, '$1 ');                       // 06 12 34 56 78
  if (/^\+33\d{9}$/.test(c)) return '+33 ' + c[3] + ' ' + c.slice(4).replace(/(\d{2})(?=\d)/g, '$1 ');
  return s;
}

/* Prochaine action, telle qu'elle s'écrit dans le tableau : « Appeler — avant le 08/10 à 10 h 15 ». */
const echeanceFr = (iso) => { const p = paris(new Date(iso)); return `${String(p.j).padStart(2, '0')}/${String(p.m).padStart(2, '0')} à ${heureFr(iso)}`; };
function actionSheet(d, visite, offres) {
  const a = prochaineAction(d, visite, new Date(), offres || {});
  if (!a.texte) return '';
  return a.echeance ? `${a.texte} — ${a.rdv ? 'le' : 'avant le'} ${echeanceFr(a.echeance)}${a.retard ? ' (en retard)' : ''}` : a.texte;
}

async function flux({ request, env }) {
  const url = new URL(request.url);
  await limiter(env, 'flux:' + ip(request), 120, 3600);
  if (!(await cleValide(env, url.searchParams.get('cle')))) throw new Erreur(403, 'interdit');
  const r = await (await db(env)).prepare('SELECT * FROM demandes ORDER BY id ASC').all();
  const visites = await visitesDe(await db(env), null);
  const offres = await etatOffres(await db(env));
  const lignes = [['date', 'site', 'civilité', 'prénom', 'nom', 'téléphone', 'e-mail', 'adresse du bien', 'type', 'surface', 'fourchette', 'délai de vente', 'prix idéal', 'statut', 'prochaine action', 'notes', 'référence']];
  for (const d of r.results) {
    const c = lireJson(d.contact);
    if (adresseDeTest(c.email)) continue;                       // les essais ne vont jamais dans le tableau
    const q = lireJson(d.reponses);
    const quand = new Date(d.cree_le).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
    lignes.push([
      quand, siteDe(d.source), c.civilite || '', c.prenom || '', c.nom || '', telephoneLisible(c.telephone), c.email || '', d.adresse || '',
      typeLibelle(q), q.surface ? `${q.surface} m²` : '',
      d.prix_bas ? `${euros(d.prix_bas)} – ${euros(d.prix_haut)}` : 'pas de fourchette (rappel)',
      LIBELLES.delai[q.delai] || '', q.prix_ideal ? euros(q.prix_ideal) : '',
      STATUTS_SHEET[d.statut] || d.statut, actionSheet(d, visites.get(d.id), offres.get(d.id)),
      [d.suspect ? 'Robot possible : à vérifier.' : '', d.raison ? `Raison : ${d.raison}.` : '', d.notes || ''].filter(Boolean).join(' '), d.reference,
    ]);
  }
  const tsv = url.searchParams.get('format') === 'tsv';
  return new Response(tsv ? lignes.map((l) => l.map((v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n') : csv(lignes, ','), {
    headers: { 'Content-Type': `${tsv ? 'text/tab-separated-values' : 'text/csv'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

/* ------------------------- E-mails ------------------------- */

function fiche(rep) {
  const L = [];
  const add = (k, v) => { if (v !== '' && v != null && v !== false) L.push([k, v === true ? 'oui' : String(v)]); };
  add('Type', typeLibelle(rep));
  add('Adresse', rep.adresse);
  add('Surface', rep.surface ? rep.surface + ' m²' : '');
  add('Pièces', rep.pieces); add('Chambres', rep.chambres);
  if (rep.type === 'appartement') {
    add('Étage', rep.etage === 0 ? 'Rez-de-chaussée' : rep.etage);
    add("Étages de l'immeuble", rep.etages_immeuble);
  }
  if (rep.type === 'maison') { add('Terrain', rep.terrain != null ? rep.terrain + ' m²' : ''); add('Niveaux', rep.niveaux); }
  add('Époque', LIBELLES.epoque[rep.epoque]); add('État', LIBELLES.etat[rep.etat]);
  const sp = ['ascenseur', 'balcon', 'terrasse', 'cave', 'gardien', 'parking', 'parking_box', 'plain_pied', 'piscine', 'garage']
    .filter((k) => rep[k]).map((k) => ({ parking_box: 'garage ou box', plain_pied: 'plain-pied' }[k] || k));
  add('Atouts', sp.join(', '));
  add('Prix idéal', rep.prix_ideal ? euros(rep.prix_ideal) : '');
  add('Délai', LIBELLES.delai[rep.delai]);
  add('Message', rep.message);
  return L;
}

/* Alerte immédiate à l'agence : fiche complète, fourchette, bouton appeler, lien vers la demande dans l'admin. */
async function notifier(env, request, ref, rep, c, res, lieu, suspect) {
  if (!mailPossible(env)) { await noterAlerte(env, { quand: maintenant(), destinataires: destinatairesAlerte(env).length, partis: 0, voies: [], erreurs: ['aucun service d\'envoi relié au site'] }); return; }
  const nom = [c.civilite, c.prenom, c.nom].filter(Boolean).join(' ');
  const fourchette = res.fourchette ? `${euros(res.bas)} – ${euros(res.haut)} (${res.comparables} ventes, rayon ${rayonLibelle(res.rayon)})` : 'Pas de fourchette automatique : rappel promis au plus vite';
  const lignes = [['Contact', nom], ['Téléphone', c.telephone], ['E-mail', c.email], ['Fourchette', fourchette], ...fiche(rep), ['Site', lieu === 'gravelin' ? 'gravelin-immo.com' : 'shawez-immo.com']];
  if (suspect) lignes.unshift(['À vérifier', 'Robot possible (formulaire rempli trop vite ou champ caché rempli)']);
  const tel = 'tel:' + c.telephone.replace(/[^\d+]/g, '');
  const admin = new URL('/admin/?q=' + encodeURIComponent(ref), request.url).toString();
  const html = gabarit(`${rep.commune || 'Nouvelle estimation'} — ${nom}`, `
<tr><td style="padding:4px 24px 12px;">${bouton(tel, 'Appeler ' + (c.prenom || ''), true, lieu)}${bouton('mailto:' + c.email + '?subject=' + encodeURIComponent('Votre estimation ' + ref), 'Répondre', false, lieu)}</td></tr>
<tr><td style="padding:0 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45;">
${lignes.map(([k, v]) => `<tr><td style="padding:7px 12px 7px 0;color:#6B655C;border-bottom:1px solid #ECE8E0;vertical-align:top;width:38%;">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #ECE8E0;">${esc(v)}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:12px 24px 8px;font-size:13px;color:#6B655C;">Référence ${esc(ref)} · <a href="${esc(admin)}" style="color:#8A6614;">ouvrir la demande dans l'espace agence</a></td></tr>`, lieu);
  const text = `Nouvelle estimation ${ref}\n\n${lignes.map(([k, v]) => `${k} : ${v}`).join('\n')}\n\nAppeler : ${c.telephone}\nAdmin : ${admin}`;
  const bilan = { quand: maintenant(), destinataires: 0, partis: 0, voies: [], erreurs: [] };
  for (const to of destinatairesAlerte(env)) {
    const detail = {};
    const ok = await envoyer(env, { to, subject: `${suspect ? '[à vérifier] ' : ''}Estimation ${rep.commune || ''} — ${nom} — ${c.telephone}`, text, html, replyTo: c.email }, detail);
    bilan.destinataires++;
    if (ok) { bilan.partis++; if (!bilan.voies.includes(detail.voie)) bilan.voies.push(detail.voie); }
    else bilan.erreurs.push(sansAdresses([detail.resend, detail.email, detail.mailer, detail.raison].filter(Boolean).join(' · ')).slice(0, 300));
  }
  await noterAlerte(env, bilan);
}

const sansAdresses = (t) => String(t || '').replace(/[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g, '(adresse)');
async function noterAlerte(env, bilan) {
  try {
    await (await db(env)).prepare("INSERT INTO reglages (cle, valeur) VALUES ('alerte', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(JSON.stringify(bilan)).run();
  } catch (e) { console.log('bilan alerte', e && e.message); }
}

/* E-mail immédiat au client : sa fourchette, les ventes utilisées, la suite, le lien vers son espace. */
async function mailResultat(env, request, compte, ref, rep, c, res, lieu) {
  const lien = await lienConnexion(env, request, compte.id);
  const espace = `${new URL(request.url).origin}/mon-espace/`;
  const bien = rep.type === 'maison' ? 'votre maison' : rep.type === 'appartement' ? 'votre appartement' : 'votre bien';
  let sujet, intro, introHtml;
  if (res.fourchette) {
    sujet = `Votre estimation : ${euros(res.bas)} – ${euros(res.haut)}`;
    const base = `${res.comparables} ventes réelles autour de chez vous (rayon de ${rayonLibelle(res.rayon)}, données publiques DVF${res.donnees_du ? ' à jour de ' + moisFr(res.donnees_du) : ''})`;
    intro = `Voici la première estimation de ${bien}, ${rep.adresse} :\n\n${euros(res.bas)} – ${euros(res.haut)}  (environ ${euros(res.prix_m2)}/m²)\n\nElle s'appuie sur ${base}.\nC'est une fourchette indicative, à confirmer par une visite : le calcul ne voit ni la lumière, ni la vue, ni les finitions.`;
    introHtml = paragraphe(`Bonjour ${esc(c.prenom)},<br>voici la première estimation de ${bien}, ${esc(rep.adresse)} :`)
      + `<tr><td style="padding:4px 24px 8px;font-size:28px;line-height:1.2;font-weight:bold;">${esc(euros(res.bas))} – ${esc(euros(res.haut))}</td></tr>`
      + paragraphe(`Soit environ ${esc(euros(res.prix_m2))}/m². Elle s'appuie sur ${esc(base)}.<br><br><b>C'est une fourchette indicative, à confirmer par une visite</b> : le calcul ne voit ni la lumière, ni la vue, ni les finitions.`);
  } else {
    sujet = 'Votre demande d\'estimation est bien arrivée';
    intro = `J'ai bien reçu votre demande pour ${bien}, ${rep.adresse}.\nIl n'y a pas assez de ventes comparables pour vous donner une fourchette automatique fiable : je l'étudie moi-même et je vous rappelle au plus vite.`;
    introHtml = paragraphe(`Bonjour ${esc(c.prenom)},<br>j'ai bien reçu votre demande pour ${bien}, ${esc(rep.adresse)}.<br>Il n'y a pas assez de ventes comparables pour vous donner une fourchette automatique fiable : je l'étudie moi-même et <b>je vous rappelle au plus vite</b>.`);
  }
  const suite = 'La suite : je vous appelle pour en parler. Si vous le souhaitez, je passe voir le bien (c\'est offert et sans engagement), puis je vous remets un avis de valeur détaillé, par écrit.';
  return envoyer(env, {
    to: c.email,
    subject: sujet,
    replyTo: 'shawez@gravelin-immo.com',
    text: `Bonjour ${c.prenom},\n\n${intro}\n\n${suite}\n\nVotre espace (estimation, avancement, documents) :\n${lien}\nCe lien est valable 30 minutes. Passé ce délai, demandez-en un nouveau sur ${espace}\n\nRéférence ${ref}\n\n${SIGNATURE}`,
    html: gabarit(res.fourchette ? 'Votre estimation' : 'Votre demande est bien arrivée', introHtml + paragraphe(esc(suite))
      + `<tr><td style="padding:0 24px 8px;">${bouton(lien, 'Ouvrir mon espace', true, lieu)}${bouton('tel:+33767579228', 'Appeler Shawez', false, lieu)}</td></tr>`
      + paragraphe(`<span style="font-size:14px;color:#6B655C;">Le bouton « Ouvrir mon espace » est valable 30 minutes. Passé ce délai, demandez un nouveau lien sur <a href="${esc(espace)}" style="color:inherit;">la page Mon espace</a>. Référence ${esc(ref)}.</span><br><br>${SIGNATURE_HTML}`), lieu),
  });
}

/* =====================================================================================================
   SYSTÈME PARFAIT — étape 2 : les 10 statuts, la visite d'estimation réservable, l'avis de valeur
   ===================================================================================================== */

const avant = (statut, repere) => {
  const i = PARCOURS.indexOf(statut);
  return i === -1 || i < PARCOURS.indexOf(repere);       // « pause » et « close » comptent comme avant : le dossier reprend
};

async function reglage(base, cle) {
  try { const r = await base.prepare('SELECT valeur FROM reglages WHERE cle = ?1').bind(cle).first(); return (r && r.valeur) || null; } catch (e) { return null; }
}

/* Journal d'un dossier : tout ce qui s'y passe, avec la date (c'est lui qui mesure les promesses). */
async function journal(base, demandeId, type, par, detail, de = null, vers = null) {
  await base.prepare('INSERT INTO evenements (demande_id, type, de, vers, detail, par, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
    .bind(demandeId, type, de, vers, detail ? JSON.stringify(detail) : null, par, maintenant()).run();
}

async function effacerSuivi(base, ids) {
  for (const id of ids) {
    await base.batch([
      base.prepare('DELETE FROM evenements WHERE demande_id = ?1').bind(id),
      base.prepare('DELETE FROM visites WHERE demande_id = ?1').bind(id),
      base.prepare('DELETE FROM avis WHERE demande_id = ?1').bind(id),
      base.prepare('DELETE FROM comptes_rendus WHERE demande_id = ?1').bind(id),
      base.prepare('DELETE FROM offres WHERE demande_id = ?1').bind(id),
      base.prepare('DELETE FROM notaires WHERE demande_id = ?1').bind(id),
      base.prepare('DELETE FROM courriers WHERE demande_id = ?1').bind(id),
    ]);
  }
}

/* La visite en cours de chaque demande (la dernière créée). ids = null : toutes. */
async function visitesDe(base, ids) {
  const m = new Map();
  if (ids && !ids.length) return m;
  const r = ids && ids.length <= 90
    ? await base.prepare(`SELECT * FROM visites WHERE demande_id IN (${ids.map((_, i) => `?${i + 1}`).join(',')}) ORDER BY id`).bind(...ids).all()
    : await base.prepare('SELECT * FROM visites ORDER BY id').all();
  for (const v of r.results) m.set(v.demande_id, v);
  return m;
}

/* Date à laquelle chaque statut a été atteint pour la première fois (frise du vendeur). */
async function datesStatuts(base, ids) {
  const m = new Map();
  if (!ids.length) return m;
  const r = ids.length <= 90
    ? await base.prepare(`SELECT demande_id, vers, MIN(cree_le) AS le FROM evenements WHERE type = 'statut' AND demande_id IN (${ids.map((_, i) => `?${i + 1}`).join(',')}) GROUP BY demande_id, vers`).bind(...ids).all()
    : await base.prepare("SELECT demande_id, vers, MIN(cree_le) AS le FROM evenements WHERE type = 'statut' GROUP BY demande_id, vers").all();
  for (const e of r.results) { if (!m.has(e.demande_id)) m.set(e.demande_id, {}); m.get(e.demande_id)[e.vers] = e.le; }
  return m;
}

async function dernieresTraces(base) {
  const r = await base.prepare('SELECT e.demande_id, e.type, e.vers, e.par, e.cree_le FROM evenements e JOIN (SELECT demande_id, MAX(id) AS m FROM evenements GROUP BY demande_id) x ON x.m = e.id').all();
  return new Map(r.results.map((e) => [e.demande_id, { type: e.type, vers: e.vers, par: e.par, le: e.cree_le }]));
}

const visitePublique = (v) => (v && v.etat !== 'annulee' ? { etat: v.etat, creneaux: lireCreneaux(v), debut: v.debut || null, duree: v.duree, demandee_le: v.demandee_le || null, fixee_le: v.fixee_le || null } : null);

/* Ce que le vendeur voit de l'avancement : la frise des 10 étapes, la prochaine étape, sa visite. */
function suiviVendeur(d, visite, dates = {}, offres = {}) {
  const v = visitePublique(visite);
  return {
    parcours: frise(d.statut, { ...dates, recue: d.cree_le }),
    suite: suiteVendeur(d, visite, 'Shawez', offres),
    visite: v,
    // il peut choisir (ou déplacer) son créneau tant que l'avis de valeur n'est pas parti
    visite_possible: ['recue', 'appele', 'visite'].includes(d.statut),
  };
}

/* Ce que l'agence voit d'une demande. */
function vueAgence(d, visite, offres = {}) {
  const v = visitePublique(visite);
  const c = lireJson(d.contact);
  return {
    ...demandePublique(d, STATUTS), site: siteDe(d.source), notes: d.notes, rappel_le: d.rappel_le || '', raison: d.raison || '',
    suspect: !!d.suspect, en_attente: !!d.en_attente, statut_le: d.statut_le || null,
    action: prochaineAction(d, visite, new Date(), offres),
    visite: v && { ...v, agenda: v.debut ? lienAgenda({
      debut: v.debut, duree: v.duree, titre: `Visite d'estimation avec ${[c.civilite, c.prenom, c.nom].filter(Boolean).join(' ')}`.trim(),
      lieu: d.adresse || '', details: `${c.telephone || ''} · ${c.email || ''} · réf. ${d.reference}`,
    }) : null },
  };
}

/* ---------------------- Changement de statut : base, journal, e-mail au vendeur ---------------------- */

async function changerStatut(ctx, demande, vers, { par = 'agence', prevenir = true, raison } = {}) {
  const { env } = ctx;
  const base = await db(env);
  const de = demande.statut;
  const t = maintenant();
  const r = await base.prepare('UPDATE demandes SET statut = ?1, maj_le = ?2, statut_le = ?2 WHERE id = ?3 RETURNING *').bind(vers, t, demande.id).first();
  if (!r) throw new Erreur(404, 'introuvable');
  if (de !== vers) await journal(base, r.id, 'statut', par, raison ? { raison } : null, de, vers);
  r._mail = 'non';
  let visiteEnCours = false;
  if (de !== vers && prevenir && vers === 'appele') { const v = (await visitesDe(base, [r.id])).get(r.id); visiteEnCours = !!v && v.etat !== 'annulee'; }
  const contenu = de !== vers && prevenir ? mailStatut(vers, { bien: nomDuBien(r), visiteEnCours }) : null;
  if (contenu) r._mail = await annoncer(ctx, r, contenu, 'statut:' + vers);
  return r;
}

const nomDuBien = (d) => (d.type === 'maison' ? 'votre maison' : d.type === 'appartement' ? 'votre appartement' : 'votre bien');

/* E-mail court au vendeur, signé Shawez Ali, avec un lien qui ouvre son espace (7 jours, une seule fois).
   Rend « envoye » si un envoi est possible vers cette adresse (il part en tâche de fond), « differe » entre 21 h et 8 h
   (l'e-mail est gardé et part à 8 h : jamais d'e-mail le soir tard ni la nuit), sinon « indisponible ».
   Le journal garde la trace de ce qui est parti — ou non, et pourquoi.
   controle : { visite: <début> } pour un e-mail gardé qui n'a plus lieu d'être si la visite a bougé entre-temps. */
async function annoncer(ctx, demande, contenu, motif, controle = null) {
  const { env, request } = ctx;
  const base = await db(env);
  const compte = demande.compte_id ? await base.prepare('SELECT * FROM comptes WHERE id = ?1').bind(demande.compte_id).first() : null;
  const possible = !!compte && !demande.suspect && peutEcrire(env, compte.email);
  if (!possible) {
    await journal(base, demande.id, 'mail', 'systeme', { motif, sujet: contenu.sujet, envoye: false, raison: !compte ? 'sans_compte' : demande.suspect ? 'suspect' : adresseDeTest(compte.email) ? 'adresse_de_test' : 'email_clients_ferme' });
    return 'indisponible';
  }
  const origine = new URL(request.url).origin;
  if (calme(ctx)) {
    await base.prepare('INSERT INTO courriers (demande_id, motif, contenu, origine, cree_le) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(demande.id, motif, JSON.stringify({ ...contenu, controle }), origine, maintenant()).run();
    await journal(base, demande.id, 'mail', 'systeme', { motif, sujet: contenu.sujet, envoye: false, raison: 'heures_calmes' });
    return 'differe';
  }
  ctx.waitUntil(expedier(env, demande, compte, contenu, motif, origine).catch((e) => console.log('annonce', e && e.message)));
  return 'envoye';
}

async function expedier(env, demande, compte, contenu, motif, origine) {
  const base = await db(env);
  const lieu = siteDe(demande.source);
  const jetonSuivi = await nouveauJeton(env, compte.id, 'suivi', 7 * 24 * 3600, { garder: true });
  const lien = `${origine}/mon-espace/?lien=${jetonSuivi}`;
  const bonjour = `Bonjour ${compte.prenom || ''}`.trim() + ',';
  const text = `${bonjour}\n\n${contenu.paragraphes.join('\n\n')}${contenu.plan ? `\nPlan d'accès : ${AGENCE.plan}` : ''}\n\n${contenu.bouton} :\n${lien}\n(lien valable 7 jours ; ensuite, demandez-en un nouveau sur ${origine}/mon-espace/)\n\n${SIGNATURE}`;
  const html = gabarit(contenu.titre,
    paragraphe(`${esc(bonjour)}<br>${contenu.paragraphes.map(esc).join('<br><br>')}${contenu.plan ? ` <a href="${esc(AGENCE.plan)}" style="color:inherit;">Plan d'accès</a>.` : ''}`)
    + `<tr><td style="padding:0 24px 8px;">${bouton(lien, contenu.bouton, true, lieu)}${bouton('tel:+33767579228', 'Appeler Shawez', false, lieu)}</td></tr>`
    + paragraphe(`<span style="font-size:14px;color:#6B655C;">Ce bouton est valable 7 jours. Référence ${esc(demande.reference)}.</span><br><br>${SIGNATURE_HTML}`), lieu);
  const detail = {};
  const ok = await envoyer(env, { to: compte.email, subject: contenu.sujet, replyTo: 'shawez@gravelin-immo.com', text, html }, detail);
  await journal(base, demande.id, 'mail', 'systeme', { motif, sujet: contenu.sujet, envoye: ok, voie: detail.voie || null });
  return ok;
}

/* L'heure qui compte pour les heures calmes. Tests locaux (variable HORLOGE_TEST) : l'heure est donnée par la requête
   (en-tête X-Horloge-Test ou ?maintenant=) ; sans heure donnée, jamais d'heures calmes. */
function horloge(ctx) {
  if (String(ctx.env.HORLOGE_TEST || '') !== '1') return new Date();
  const brut = ctx.request.headers.get('X-Horloge-Test') || new URL(ctx.request.url).searchParams.get('maintenant') || '';
  const d = new Date(brut);
  return brut && !Number.isNaN(d.getTime()) ? d : null;
}
const calme = (ctx) => { const h = horloge(ctx); return !!h && heuresCalmes(h); };

/* Les e-mails gardés pendant les heures calmes partent à partir de 8 h, une seule fois chacun. */
async function courriersDus(ctx, now = new Date()) {
  if (heuresCalmes(now)) return 0;
  const { env } = ctx;
  const base = await db(env);
  const r = await base.prepare('SELECT * FROM courriers WHERE envoye_le IS NULL ORDER BY id LIMIT 25').all();
  let n = 0;
  for (const c of r.results) {
    // on réserve l'envoi avant de le faire : deux passages en même temps n'en font qu'un
    const pris = await base.prepare('UPDATE courriers SET envoye_le = ?1 WHERE id = ?2 AND envoye_le IS NULL RETURNING id').bind(maintenant(), c.id).first();
    if (!pris) continue;
    const dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(c.demande_id).first();
    const compte = dem && dem.compte_id ? await base.prepare('SELECT * FROM comptes WHERE id = ?1').bind(dem.compte_id).first() : null;
    if (!dem || !compte || !peutEcrire(env, compte.email)) continue;
    const contenu = lireJson(c.contenu);
    if (contenu.controle && contenu.controle.visite) {
      const v = (await visitesDe(base, [dem.id])).get(dem.id);
      if (!v || v.etat !== 'fixee' || v.debut !== contenu.controle.visite) { await journal(base, dem.id, 'mail', 'systeme', { motif: c.motif, sujet: contenu.sujet, envoye: false, raison: 'perime' }); continue; }
    }
    if (await expedier(env, dem, compte, contenu, c.motif, c.origine)) n++;
  }
  if (Math.random() < 0.05) await base.prepare('DELETE FROM courriers WHERE envoye_le IS NOT NULL AND envoye_le < ?1').bind(new Date(now.getTime() - 30 * 86400000).toISOString()).run();
  return n;
}

/* ---------------------- Visite d'estimation ---------------------- */

async function creneauxDispo({ request, env }) {
  await limiter(env, 'cre:' + ip(request), 240, 3600);
  let rdv = null, base = null;
  try { base = await db(env); rdv = await reglage(base, 'rdv_url'); } catch (e) { /* base absente : les créneaux restent proposables */ }
  const { jours, agenda } = await creneauxLibres(base, new Date());
  return json(200, { duree: DUREE_VISITE, jours, rdv_url: rdv, agenda }, { 'Cache-Control': 'no-store' });
}

/* Créneaux proposables moins les moments pris : visites déjà fixées, et agenda Google s'il est relié.
   agenda : 'relie' (lu à l'instant), 'illisible' (relié mais pas lu : on le dit à l'agence), 'non' (pas relié). */
async function creneauxLibres(base, now) {
  // on calcule 12 jours, puis on garde les 6 premiers qui ont encore un créneau libre
  const jours = creneaux(now, 12);
  let agenda = 'non';
  if (!base) return { jours: jours.slice(0, 6), agenda };
  const de = now.getTime(), a = de + 22 * 86400000;
  const occupe = [];
  try {
    const r = await base.prepare("SELECT debut, duree FROM visites WHERE etat = 'fixee' AND debut >= ?1").bind(new Date(de - 3 * 3600000).toISOString()).all();
    for (const v of r.results || []) occupe.push([Date.parse(v.debut), Date.parse(v.debut) + (v.duree || DUREE_VISITE) * 60000]);
    // un rendez-vous pris en 2 clics (un seul créneau demandé, pas encore confirmé) bloque déjà son créneau
    const q = await base.prepare("SELECT creneaux, duree FROM visites WHERE etat = 'demandee' AND demandee_le >= ?1").bind(new Date(de - 21 * 86400000).toISOString()).all();
    for (const v of q.results || []) {
      const l = lireCreneaux(v);
      if (l.length === 1) occupe.push([Date.parse(l[0]), Date.parse(l[0]) + (v.duree || DUREE_VISITE) * 60000]);
    }
  } catch (e) { /* tables du système parfait pas encore créées */ }
  const ics = await reglage(base, 'agenda_ics');
  if (ics) {
    const g = await agendaOccupe(ics, de, a);
    if (g) { occupe.push(...g); agenda = 'relie'; } else agenda = 'illisible';
  }
  return { jours: retirerOccupes(jours, occupe, DUREE_VISITE).slice(0, 6), agenda };
}

/* ---------------------- Rendez-vous en 2 clics (sans estimation) ----------------------
   Le visiteur choisit un créneau libre (1er clic), donne prénom, téléphone et adresse du bien, confirme (2e clic).
   La demande arrive dans /admin/ comme les autres (statut « Nouvelle », visite demandée sur ce créneau, à confirmer
   d'un clic), avec l'alerte à l'agence. Essais : prénom « TEST… » ou e-mail en @test.invalid → aucune alerte. */
const REF = () => `R-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
const essai = (contact) => adresseDeTest(contact.email) || /^test\b/i.test(contact.prenom || '');

async function rdvExpress(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 4000);
  await limiter(env, 'rdv:' + ip(request), 8, 3600);
  const robot = antiRobot(d);
  if (d.consentement !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
  const contact = {
    civilite: '',
    prenom: texte(d.prenom, 80, { requis: true, nom: 'prenom' }),
    nom: texte(d.nom, 80, { nom: 'nom' }),
    email: d.email ? lireEmail(d.email) : '',
    telephone: telephone(d.telephone),
  };
  const adresse = texte(d.adresse, 200, { requis: true, nom: 'adresse' });
  if (adresse.length < 3) throw new Erreur(400, 'champs', { champ: 'adresse' });
  const message = texte(d.message, 500, { nom: 'message' });
  const base = await db(env);
  const now = new Date();
  const creneau = typeof d.creneau === 'string' ? d.creneau : '';
  // le créneau doit être encore libre (un autre visiteur, ou l'agenda, a pu le prendre depuis l'affichage)
  const { jours } = await creneauxLibres(base, now);
  if (!creneauValide(creneau, now) || !jours.some((j) => j.heures.some((h) => h.debut === creneau))) throw new Erreur(409, 'creneau_pris');

  const cle = typeof d.cle === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(d.cle) ? d.cle : null;
  if (cle) {
    const deja = await base.prepare('SELECT reference FROM demandes WHERE cle = ?1').bind(cle).first();
    if (deja) return json(200, { reference: deja.reference, creneau, rejoue: true });
  }
  const lieu = site(request, env, d);
  const ref = REF();
  const t = maintenant();
  const rep = { type: 'autre', autre_type: 'rdv', formulaire: d.depuis && /^[a-z0-9-]{1,30}$/.test(d.depuis) ? 'rdv-' + d.depuis : 'rdv', creneau, message };
  const notes = 'Rendez-vous pris en ligne (2 clics), sans estimation : confirmer le créneau et appeler.';
  const dem = await base.prepare(
    `INSERT INTO demandes (reference, compte_id, source, type, adresse, code_postal, commune, reponses, contact, cree_le, suspect, notes, cle)
     VALUES (?1, NULL, ?2, 'autre', ?3, '', '', ?4, ?5, ?6, ?7, ?8, ?9) RETURNING *`
  ).bind(ref, lieu, adresse, JSON.stringify(rep), JSON.stringify(contact), t, robot ? 1 : 0, notes, cle).first();
  await base.prepare("INSERT INTO visites (demande_id, etat, creneaux, duree, message, demandee_le, cree_le) VALUES (?1, 'demandee', ?2, ?3, ?4, ?5, ?5)")
    .bind(dem.id, JSON.stringify([creneau]), DUREE_VISITE, message, t).run();
  await journal(base, dem.id, 'rdv_en_ligne', 'client', { creneau, depuis: rep.formulaire }).catch(() => {});
  await journal(base, dem.id, 'visite_demandee', 'client', { creneaux: [creneau], deplacee: false }).catch(() => {});

  if (!robot && !essai(contact)) ctx.waitUntil(alerteVisite(env, request, dem, contact, [creneau], message, false).catch((e) => console.log('alerte rdv', e && e.message)));
  return json(201, { reference: ref, creneau, quand: quandFr(creneau) });
}

/* Le vendeur propose jusqu'à trois créneaux : l'agence est prévenue et confirme. */
async function visiteDemander(ctx) {
  const { request, env } = ctx;
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  const d = await corps(request, 3000);
  await limiter(env, 'vis:' + c.id, 12, 3600);
  const id = entier(d.demande, 1, 1e12, { requis: true, nom: 'demande' });
  const base = await db(env);
  const dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1 AND compte_id = ?2 AND en_attente = 0').bind(id, c.id).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  if (!['recue', 'appele', 'visite'].includes(dem.statut)) throw new Erreur(409, 'visite_close');
  const ancienne = (await visitesDe(base, [id])).get(id);

  // page de réservation Google Agenda ouverte par le vendeur : on le note seulement (l'agenda fait foi)
  if (d.agenda === true) {
    await journal(base, id, 'visite_agenda', 'client', null);
    return json(200, { ok: true });
  }

  const now = new Date();
  if (!Array.isArray(d.creneaux)) throw new Erreur(400, 'champs', { champ: 'creneaux' });
  const liste = [...new Set(d.creneaux)].filter((x) => creneauValide(x, now)).sort();
  if (!liste.length || liste.length !== new Set(d.creneaux).size || liste.length > 3) throw new Erreur(400, 'champs', { champ: 'creneaux' });
  const message = texte(d.message, 500, { nom: 'message' });
  const fixee = ancienne && ancienne.etat === 'fixee' && new Date(ancienne.debut).getTime() > now.getTime();
  if (fixee && d.deplacer !== true) throw new Erreur(409, 'visite_fixee');

  const t = maintenant();
  const v = ancienne && ancienne.etat !== 'annulee'
    ? await base.prepare("UPDATE visites SET etat = 'demandee', creneaux = ?1, debut = NULL, message = ?2, demandee_le = ?3, fixee_le = NULL, rappel_le = NULL, maj_le = ?3 WHERE id = ?4 RETURNING *")
      .bind(JSON.stringify(liste), message, t, ancienne.id).first()
    : await base.prepare("INSERT INTO visites (demande_id, etat, creneaux, duree, message, demandee_le, cree_le) VALUES (?1, 'demandee', ?2, ?3, ?4, ?5, ?5) RETURNING *")
      .bind(id, JSON.stringify(liste), DUREE_VISITE, message, t).first();
  await journal(base, id, 'visite_demandee', 'client', { creneaux: liste, deplacee: !!fixee });

  const contact = lireJson(dem.contact);
  if (!adresseDeTest(contact.email)) ctx.waitUntil(alerteVisite(env, request, dem, contact, liste, message, !!fixee).catch((e) => console.log('alerte visite', e && e.message)));
  return json(201, { ...suiviVendeur(dem, v, {}), parcours: undefined });
}

/* Alerte à l'agence : le vendeur demande une visite. */
async function alerteVisite(env, request, dem, c, liste, message, deplacee) {
  if (!mailPossible(env)) return;
  const lieu = siteDe(dem.source);
  const nom = [c.civilite, c.prenom, c.nom].filter(Boolean).join(' ');
  const admin = new URL('/admin/?q=' + encodeURIComponent(dem.reference), request.url).toString();
  const tel = 'tel:' + String(c.telephone || '').replace(/[^\d+]/g, '');
  const titre = deplacee ? 'Visite à déplacer' : 'Visite demandée';
  const text = `${titre} — ${nom} — ${dem.adresse || dem.commune || ''}\n\nCréneaux proposés :\n${liste.map((x) => '- ' + quandFr(x)).join('\n')}${message ? `\n\nMessage : ${message}` : ''}\n\nConfirmer d'un clic : ${admin}\nAppeler : ${c.telephone || ''}`;
  const html = gabarit(`${titre} — ${nom}`,
    paragraphe(`${esc(dem.adresse || dem.commune || '')}<br><b>Créneaux proposés :</b><br>${liste.map((x) => esc(quandFr(x))).join('<br>')}${message ? `<br><br>« ${esc(message)} »` : ''}`)
    + `<tr><td style="padding:0 24px 12px;">${bouton(admin, 'Confirmer un créneau', true, lieu)}${bouton(tel, 'Appeler ' + (c.prenom || ''), false, lieu)}</td></tr>`
    + `<tr><td style="padding:4px 24px 8px;font-size:13px;color:#6B655C;">Référence ${esc(dem.reference)} · promesse : confirmer dans l'heure, visite sous 48 h.</td></tr>`, lieu);
  for (const to of destinatairesAlerte(env)) {
    await envoyer(env, { to, subject: `${titre} : ${liste.map(quandCourt).join(' / ')} — ${nom} — ${c.telephone || ''}`, text, html, replyTo: c.email });
  }
}

/* L'agence fixe la visite (un des créneaux proposés, ou une autre date convenue au téléphone), ou l'annule. */
async function adminVisite(ctx) {
  const { request, env } = ctx;
  await exigerAdmin(request, env);
  const d = await corps(request, 2000);
  const id = entier(d.demande, 1, 1e12, { requis: true, nom: 'demande' });
  const base = await db(env);
  let dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(id).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  const ancienne = (await visitesDe(base, [id])).get(id);
  const t = maintenant();

  if (d.annuler === true) {
    if (!ancienne || ancienne.etat === 'annulee') throw new Erreur(404, 'introuvable');
    await base.prepare("UPDATE visites SET etat = 'annulee', maj_le = ?1 WHERE id = ?2").bind(t, ancienne.id).run();
    await journal(base, id, 'visite_annulee', 'agence', ancienne.debut ? { debut: ancienne.debut } : null);
    return json(200, { demande: vueAgence(dem, null, (await etatOffres(base, id)).get(id)), mail: 'non' });
  }

  let debut = null;
  if (typeof d.debut === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(d.debut)) debut = new Date(d.debut);
  else if (typeof d.debut_local === 'string') {
    const m = d.debut_local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);       // heure de Paris, telle que saisie
    if (m) {
      debut = deParis(+m[1], +m[2], +m[3], +m[4], +m[5]);
      const p = paris(debut);     // une date qui n'existe pas (le 45 du mois, 99 h) ne retombe pas sur ce qui a été saisi
      if (p.a !== +m[1] || p.m !== +m[2] || p.j !== +m[3] || p.h !== +m[4] || p.min !== +m[5]) debut = null;
    }
  }
  const maintenantMs = Date.now();
  if (!debut || Number.isNaN(debut.getTime()) || debut.getTime() < maintenantMs - 30 * 86400000 || debut.getTime() > maintenantMs + 200 * 86400000) throw new Erreur(400, 'champs', { champ: 'debut' });
  const iso = debut.toISOString();
  const deplacee = !!(ancienne && ancienne.etat === 'fixee' && ancienne.debut && ancienne.debut !== iso);
  const v = ancienne && ancienne.etat !== 'annulee'
    ? await base.prepare("UPDATE visites SET etat = 'fixee', debut = ?1, fixee_le = ?2, rappel_le = NULL, maj_le = ?2 WHERE id = ?3 RETURNING *").bind(iso, t, ancienne.id).first()
    : await base.prepare("INSERT INTO visites (demande_id, etat, creneaux, debut, duree, fixee_le, cree_le) VALUES (?1, 'fixee', '[]', ?2, ?3, ?4, ?4) RETURNING *").bind(id, iso, DUREE_VISITE, t).first();
  await journal(base, id, 'visite_fixee', 'agence', { debut: iso, deplacee, demandee_le: (ancienne && ancienne.demandee_le) || null });
  // le dossier passe à « Visite prévue » ; l'e-mail de confirmation tient lieu d'annonce
  if (avant(dem.statut, 'visite')) dem = await changerStatut(ctx, dem, 'visite', { prevenir: false });
  let mail = 'non';
  if (d.prevenir !== false && debut.getTime() > maintenantMs) mail = await annoncer(ctx, dem, mailVisite('confirmation', { debut: iso, adresse: dem.adresse, deplacee }), 'visite_fixee', { visite: iso });
  return json(200, { demande: vueAgence(dem, v, (await etatOffres(base, id)).get(id)), mail });
}

/* ---------------------- Tâches à heure fixe ----------------------
   Rappel de visite la veille à 18 h (heure de Paris) ; e-mails gardés pendant les heures calmes (21 h – 8 h), qui partent
   à 8 h. Appelé chaque heure par GitHub Actions (taches.yml) et, en plus, au passage des autres requêtes.
   Sans effet si rien n'est dû ; chaque envoi ne part qu'une fois. */
async function rappels(ctx, now = new Date()) {
  const { env } = ctx;
  const p = paris(now);
  if (p.h < 18 || p.h >= 21) return 0;       // jamais de rappel gardé pour le lendemain : il dirait « demain » le jour même
  const base = await db(env);
  const demain = deParis(p.a, p.m, p.j + 1, 0).toISOString();
  const apres = deParis(p.a, p.m, p.j + 2, 0).toISOString();
  const r = await base.prepare("SELECT * FROM visites WHERE etat = 'fixee' AND rappel_le IS NULL AND debut >= ?1 AND debut < ?2").bind(demain, apres).all();
  let n = 0;
  for (const v of r.results) {
    // on réserve le rappel avant de l'envoyer : deux passages en même temps n'en font qu'un
    const pris = await base.prepare('UPDATE visites SET rappel_le = ?1 WHERE id = ?2 AND rappel_le IS NULL RETURNING id').bind(maintenant(), v.id).first();
    if (!pris) continue;
    const dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(v.demande_id).first();
    if (!dem || dem.statut !== 'visite') continue;
    // confirmée il y a moins de trois heures : l'e-mail de confirmation vient de partir, pas de doublon
    if (v.fixee_le && now.getTime() - Date.parse(v.fixee_le) < 3 * 3600000) { await journal(base, dem.id, 'rappel_visite', 'systeme', { envoye: false, raison: 'confirmation_recente' }); continue; }
    const etat = await annoncer(ctx, dem, mailVisite('rappel', { debut: v.debut, adresse: dem.adresse }), 'rappel_visite');
    await journal(base, dem.id, 'rappel_visite', 'systeme', { envoye: etat === 'envoye', debut: v.debut });
    if (etat === 'envoye') n++;
  }
  return n;
}

async function taches(ctx) {
  await limiter(ctx.env, 'taches:' + ip(ctx.request), 60, 3600);
  // tests locaux seulement (variable HORLOGE_TEST) : l'heure peut être donnée, pour vérifier le rappel de la veille
  const faux = String(ctx.env.HORLOGE_TEST || '') === '1' ? new Date(new URL(ctx.request.url).searchParams.get('maintenant') || '') : null;
  const now = faux && !Number.isNaN(faux.getTime()) ? faux : new Date();
  return json(200, { ok: true, rappels: await rappels(ctx, now), courriers: await courriersDus(ctx, now) });
}

let dernierPassage = 0;
function tachesAuPassage(ctx) {
  const t = Date.now();
  if (t - dernierPassage < 10 * 60000) return;
  dernierPassage = t;
  if (String(ctx.env.HORLOGE_TEST || '') === '1') return;      // tests locaux : les tâches ne passent que sur demande
  const h = paris(new Date(t)).h;
  if (h >= 18 && h < 21) ctx.waitUntil(rappels(ctx).catch((e) => console.log('taches', e && e.message)));
  if (h >= 8 && h < 21) ctx.waitUntil(courriersDus(ctx).catch((e) => console.log('courriers', e && e.message)));
}

/* ---------------------- Avis de valeur ----------------------
   L'agence prépare le brouillon dans /admin/ : les ventes comparables réelles viennent de DVF, la fourchette proposée
   est celle de l'estimation quand il y avait au moins 5 ventes ; sinon elle reste vide et Shawez la saisit lui-même.
   Le PDF est fabriqué dans le navigateur de l'agence (assets/avis/), déposé ici comme brouillon, puis validé en un clic. */

/* Les trois points proposés par défaut reprennent ce que le site promet déjà aux vendeurs (page « Vendre à Dijon ») ;
   Shawez les adapte à chaque bien. */
const STRATEGIE = [
  { titre: 'Le prix juste, dès le départ', texte: 'Un prix d\'affichage fondé sur les ventes réelles du secteur et sur la visite. Les trois premières semaines décident : c\'est là qu\'une annonce est la plus regardée.' },
  { titre: 'Un film, pas une simple annonce', texte: 'Film de visite, photos professionnelles, plans et visite virtuelle, puis diffusion sur les grands portails et les réseaux : les acheteurs arrivent en ayant déjà vu le bien.' },
  { titre: 'Vous savez où en est votre vente', texte: 'Un seul interlocuteur du premier appel à la signature, un compte rendu après chaque visite, et votre espace en ligne pour suivre chaque étape.' },
];

function lireContenuAvis(c) {
  if (!c || typeof c !== 'object') throw new Erreur(400, 'champs', { champ: 'contenu' });
  const lignes = (v, nom) => {
    const l = Array.isArray(v) ? v : String(v || '').split(/\r?\n/);
    const propres = l.map((x) => texte(String(x == null ? '' : x).replace(/^\s*[-•–]\s*/, ''), 240, { nom })).filter(Boolean);
    if (propres.length > 8) throw new Erreur(400, 'champs', { champ: nom });
    return propres;
  };
  const strat = (Array.isArray(c.strategie) ? c.strategie : []).slice(0, 3).map((x) => ({ titre: texte(x && x.titre, 90, { nom: 'strategie' }), texte: texte(x && x.texte, 600, { nom: 'strategie' }) })).filter((x) => x.titre || x.texte);
  const r = {
    notes: texte(c.notes, 4000, { nom: 'notes' }),
    atouts: lignes(c.atouts, 'atouts'),
    vigilance: lignes(c.vigilance, 'vigilance'),
    strategie: strat,
    prix_bas: entier(c.prix_bas, 1000, 100000000, { nom: 'prix_bas' }),
    prix_haut: entier(c.prix_haut, 1000, 100000000, { nom: 'prix_haut' }),
    date_visite: texte(c.date_visite, 10, { nom: 'date_visite' }),
    // ventes citées dans le PDF, choisies par l'agent parmi les ventes proposées (absent : le choix par défaut)
    ventes: Array.isArray(c.ventes) ? c.ventes.slice(0, 12).map((x) => texte(x, 200, { nom: 'ventes' })).filter(Boolean) : null,
  };
  if (r.date_visite && (!/^\d{4}-\d{2}-\d{2}$/.test(r.date_visite) || Number.isNaN(Date.parse(r.date_visite)))) throw new Erreur(400, 'champs', { champ: 'date_visite' });
  if (r.prix_bas != null && r.prix_haut != null && r.prix_haut < r.prix_bas) throw new Erreur(400, 'champs', { champ: 'prix_haut' });
  return r;
}

const ATOUTS_LIB = { ascenseur: 'Ascenseur', balcon: 'Balcon', terrasse: 'Terrasse', cave: 'Cave', gardien: 'Gardien', parking: 'Place de parking', parking_box: 'Garage ou box', plain_pied: 'Plain-pied', piscine: 'Piscine', garage: 'Garage' };

/* Tout ce qu'il faut pour écrire l'avis de valeur d'une demande. */
async function dossierAvis(env, request, dem) {
  const base = await db(env);
  const q = lireJson(dem.reponses);
  const c = lireJson(dem.contact);
  const a = await base.prepare('SELECT * FROM avis WHERE demande_id = ?1').bind(dem.id).first();
  const visite = (await visitesDe(base, [dem.id])).get(dem.id);
  const contenu = a ? lireJson(a.contenu) : {};
  const comp = await ventesComparables(env, request.url, q, { choix: contenu.ventes });
  const fichier = a && a.fichier_id ? await base.prepare('SELECT * FROM fichiers WHERE id = ?1').bind(a.fichier_id).first() : null;
  const dateVisite = visite && visite.etat === 'fixee' && visite.debut ? paris(new Date(visite.debut)).date : '';
  return {
    demande: dem.id, reference: dem.reference, site: siteDe(dem.source), statut: dem.statut,
    avis: a ? { prepare_le: a.prepare_le, valide_le: a.valide_le, maj_le: a.maj_le, fichier: fichier ? fichierPublic(fichier) : null } : null,
    contenu: {
      notes: contenu.notes || '', atouts: contenu.atouts || [], vigilance: contenu.vigilance || [],
      strategie: contenu.strategie && contenu.strategie.length ? contenu.strategie : STRATEGIE,
      // jamais de prix inventé : la fourchette de l'estimation n'est proposée que si elle reposait sur assez de ventes
      prix_bas: contenu.prix_bas ?? (comp.assez && dem.prix_bas ? dem.prix_bas : null),
      prix_haut: contenu.prix_haut ?? (comp.assez && dem.prix_haut ? dem.prix_haut : null),
      date_visite: contenu.date_visite || dateVisite,
    },
    donnees: {
      client: { civilite: c.civilite || '', prenom: c.prenom || '', nom: c.nom || '' },
      bien: {
        type: q.type === 'autre' ? 'autre' : q.type, type_libelle: typeLibelle(q), adresse: dem.adresse || '', commune: dem.commune || '', code_postal: dem.code_postal || '',
        surface: q.surface ?? null, pieces: q.pieces ?? null, chambres: q.chambres ?? null,
        etage: q.type === 'appartement' ? q.etage ?? null : null, etages_immeuble: q.type === 'appartement' ? q.etages_immeuble ?? null : null,
        terrain: q.type === 'maison' ? q.terrain ?? null : null, niveaux: q.type === 'maison' ? q.niveaux ?? null : null,
        epoque: q.epoque && q.epoque !== 'nsp' ? LIBELLES.epoque[q.epoque] : '', etat: LIBELLES.etat[q.etat] || '',
        atouts: Object.keys(ATOUTS_LIB).filter((k) => q[k]).map((k) => ATOUTS_LIB[k]),
      },
      estimation: dem.prix_bas ? { prix_bas: dem.prix_bas, prix_haut: dem.prix_haut, prix_m2: dem.prix_m2, faite_le: dem.cree_le } : null,
      marche: comp.marche, ventes: comp.ventes, candidats: comp.candidats, assez_de_ventes: comp.assez, raison: comp.raison || null,
      conseiller: { nom: 'Shawez Ali', role: 'Agent immobilier', tel: '07 67 57 92 28', email: 'shawez@gravelin-immo.com', agence: AGENCE.nom, adresse: AGENCE.adresse, site: siteDe(dem.source) === 'gravelin' ? 'gravelin-immo.com' : 'shawez-immo.com' },
    },
  };
}

async function demandeAdmin(request, env, id) {
  await exigerAdmin(request, env);
  const dem = await (await db(env)).prepare('SELECT * FROM demandes WHERE id = ?1').bind(entier(id, 1, 1e12, { requis: true, nom: 'demande' })).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  return dem;
}

async function adminAvisLire({ request, env }) {
  const dem = await demandeAdmin(request, env, new URL(request.url).searchParams.get('demande'));
  return json(200, await dossierAvis(env, request, dem));
}

async function adminAvisEnregistrer({ request, env }) {
  const d = await corps(request, 30000);
  const dem = await demandeAdmin(request, env, d.demande);
  const contenu = lireContenuAvis(d.contenu);
  const base = await db(env);
  const t = maintenant();
  const comp = await ventesComparables(env, request.url, lireJson(dem.reponses), { choix: contenu.ventes });
  const deja = await base.prepare('SELECT demande_id FROM avis WHERE demande_id = ?1').bind(dem.id).first();
  await base.prepare(
    `INSERT INTO avis (demande_id, contenu, ventes, prepare_le, maj_le) VALUES (?1, ?2, ?3, ?4, ?4)
     ON CONFLICT(demande_id) DO UPDATE SET contenu = ?2, ventes = ?3, maj_le = ?4`
  ).bind(dem.id, JSON.stringify(contenu), JSON.stringify({ ventes: comp.ventes, marche: comp.marche, assez: comp.assez }), t).run();
  if (!deja) await journal(base, dem.id, 'avis_prepare', 'agence', null);
  return json(200, await dossierAvis(env, request, dem));
}

/* Le PDF brouillon : gardé avec les fichiers de la demande, sous le rôle « brouillon » (le vendeur ne le voit pas). */
async function adminAvisBrouillon({ request, env }) {
  const moiAdmin = await exigerAdmin(request, env);
  const dem = await demandeAdmin(request, env, new URL(request.url).searchParams.get('demande'));
  const base = await db(env);
  const a = await base.prepare('SELECT * FROM avis WHERE demande_id = ?1').bind(dem.id).first();
  if (!a) throw new Erreur(409, 'avis_absent');
  for (const f of (await fichiersDe(env, [dem.id])).filter((x) => x.role === 'brouillon')) await supprimerFichier(env, f);
  const f = await deposer(env, request, { demandeId: dem.id, compteId: moiAdmin.id, role: 'brouillon', par: 'agence', pdfSeul: true });
  await base.prepare('UPDATE avis SET fichier_id = ?1, maj_le = ?2 WHERE demande_id = ?3').bind(f.id, maintenant(), dem.id).run();
  return json(201, { fichier: fichierPublic(f) });
}

/* Validation en un clic : le brouillon devient l'avis de valeur, visible dans l'espace du vendeur ;
   statut « Avis de valeur envoyé », e-mail au vendeur, journal (et donc Google Sheet au prochain passage). */
async function adminAvisValider(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 1000);
  let dem = await demandeAdmin(request, env, d.demande);
  const base = await db(env);
  const a = await base.prepare('SELECT * FROM avis WHERE demande_id = ?1').bind(dem.id).first();
  const contenu = a ? lireJson(a.contenu) : {};
  const f = a && a.fichier_id ? await base.prepare("SELECT * FROM fichiers WHERE id = ?1 AND demande_id = ?2 AND role = 'brouillon'").bind(a.fichier_id, dem.id).first() : null;
  if (!f) throw new Erreur(409, 'avis_absent');
  // jamais d'avis de valeur sans fourchette décidée par l'agent
  if (!contenu.prix_bas || !contenu.prix_haut) throw new Erreur(400, 'champs', { champ: 'prix_bas' });
  const t = maintenant();
  for (const ancien of (await fichiersDe(env, [dem.id])).filter((x) => x.role === 'avis')) await supprimerFichier(env, ancien);
  await base.batch([
    base.prepare("UPDATE fichiers SET role = 'avis', cree_le = ?1 WHERE id = ?2").bind(t, f.id),
    base.prepare('UPDATE avis SET valide_le = ?1, maj_le = ?1 WHERE demande_id = ?2').bind(t, dem.id),
  ]);
  const visite = (await visitesDe(base, [dem.id])).get(dem.id);
  await journal(base, dem.id, 'avis_envoye', 'agence', { fichier: f.id, prix_bas: contenu.prix_bas, prix_haut: contenu.prix_haut, visite: (visite && visite.debut) || null });
  let mail = 'non';
  if (avant(dem.statut, 'avis')) { dem = await changerStatut(ctx, dem, 'avis', { prevenir: d.prevenir !== false }); mail = dem._mail; }
  else if (d.prevenir !== false) mail = await annoncer(ctx, dem, mailStatut('avis', {}), 'avis_envoye');
  return json(200, { demande: vueAgence(dem, visite, (await etatOffres(base, dem.id)).get(dem.id)), fichier: fichierPublic({ ...f, role: 'avis', cree_le: t }), mail });
}

async function adminJournal({ request, env }) {
  const dem = await demandeAdmin(request, env, new URL(request.url).searchParams.get('demande'));
  const r = await (await db(env)).prepare('SELECT id, type, de, vers, detail, par, cree_le FROM evenements WHERE demande_id = ?1 ORDER BY id DESC LIMIT 200').bind(dem.id).all();
  return json(200, { journal: [...r.results.map((e) => ({ ...e, detail: e.detail ? lireJson(e.detail) : null })), { id: 0, type: 'statut', de: null, vers: 'recue', detail: null, par: 'client', cree_le: dem.cree_le }] });
}

/* Réglages de l'agence. rdv_url : la page de réservation Google Agenda (« Planning de rendez-vous »), si elle existe ;
   l'espace du vendeur la propose alors à la place des trois créneaux. */
async function adminReglages({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 2000);
  const base = await db(env);
  if (d.agenda_ics != null) {
    const u = texte(d.agenda_ics, 600, { nom: 'agenda_ics' });
    if (u) {
      if (!adresseIcsValide(u)) throw new Erreur(400, 'champs', { champ: 'agenda_ics' });
      await base.prepare("INSERT INTO reglages (cle, valeur) VALUES ('agenda_ics', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(u).run();
    } else await base.prepare("DELETE FROM reglages WHERE cle = 'agenda_ics'").run();
  }
  if (d.rdv_url != null) {
    const u = texte(d.rdv_url, 400, { nom: 'rdv_url' });
    if (u) {
      let ok = false;
      try { const x = new URL(u); ok = x.protocol === 'https:' && ['calendar.app.google', 'calendar.google.com'].includes(x.hostname); } catch (e) { ok = false; }
      if (!ok) throw new Erreur(400, 'champs', { champ: 'rdv_url' });
      await base.prepare("INSERT INTO reglages (cle, valeur) VALUES ('rdv_url', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(u).run();
    } else await base.prepare("DELETE FROM reglages WHERE cle = 'rdv_url'").run();
  }
  return json(200, { rdv_url: await reglage(base, 'rdv_url'), agenda: (await creneauxLibres(base, new Date())).agenda });
}

/* =====================================================================================================
   SYSTÈME PARFAIT — étape 3 : après le mandat (comptes rendus de visite, offres, documents, notaire)
   Tout se saisit dans /admin/, dossier par dossier ; le vendeur le retrouve dans /mon-espace/.
   Les documents sont les fichiers du dossier (rôle « document », nature notée dans « libelle »).
   ===================================================================================================== */

function lireJour(v, nom, { requis = false } = {}) {
  const j = texte(v, 10, { requis, nom });
  if (!j) return '';
  const d = new Date(j + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(j) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== j) throw new Erreur(400, 'champs', { champ: nom });
  return j;
}

const crPublic = (c) => ({ id: c.id, visite_le: c.visite_le, texte: c.texte, publie: !!c.publie, publie_le: c.publie_le || null, cree_le: c.cree_le });
const offrePublique = (o) => ({ id: o.id, montant: o.montant, recue_le: o.recue_le, conditions: o.conditions || '', statut: o.statut, statut_libelle: OFFRES[o.statut] || o.statut, decidee_le: o.decidee_le || null });
function notairePublic(n) {
  const e = n ? lireJson(n.etapes) : {};
  return {
    nom: (n && n.nom) || '', coordonnees: (n && n.coordonnees) || '',
    etapes: ETAPES_NOTAIRE.map(([cle, libelle]) => ({ cle, libelle, fait: !!(e[cle] && e[cle].fait), le: (e[cle] && e[cle].le) || '' })),
  };
}

/* Comptes rendus, offres et notaire d'une liste de dossiers (les plus récents d'abord). */
async function suiteDe(base, ids) {
  const m = new Map(ids.map((id) => [id, { comptes_rendus: [], offres: [], notaire: null }]));
  if (!ids.length) return m;
  const dans = ids.length <= 90 ? ` WHERE demande_id IN (${ids.map((_, i) => `?${i + 1}`).join(',')})` : '';
  const lire = async (table, ordre) => { const q = base.prepare(`SELECT * FROM ${table}${dans} ORDER BY ${ordre}`); return (await (dans ? q.bind(...ids) : q).all()).results; };
  for (const c of await lire('comptes_rendus', 'visite_le DESC, id DESC')) { const x = m.get(c.demande_id); if (x) x.comptes_rendus.push(c); }
  for (const o of await lire('offres', 'recue_le DESC, id DESC')) { const x = m.get(o.demande_id); if (x) x.offres.push(o); }
  for (const n of await lire('notaires', 'demande_id')) { const x = m.get(n.demande_id); if (x) x.notaire = n; }
  return m;
}

/* Où en sont les offres d'un dossier : celle à présenter (la plus récente « à l'étude ») et s'il y en a une acceptée. */
function etatOffre(offres) {
  const etude = (offres || []).filter((o) => o.statut === 'etude').sort((a, b) => b.id - a.id)[0] || null;
  return { offre: etude, acceptee: (offres || []).some((o) => o.statut === 'acceptee') };
}
/* Le même état pour tous les dossiers (ou un seul) : Map demande → { offre, acceptee }. */
async function etatOffres(base, id = null) {
  const q = id ? base.prepare("SELECT * FROM offres WHERE demande_id = ?1 AND statut IN ('etude', 'acceptee')").bind(id)
    : base.prepare("SELECT * FROM offres WHERE statut IN ('etude', 'acceptee')");
  const par = new Map();
  for (const o of (await q.all()).results) { if (!par.has(o.demande_id)) par.set(o.demande_id, []); par.get(o.demande_id).push(o); }
  return new Map([...par].map(([k, l]) => [k, etatOffre(l)]));
}

/* Ce que le vendeur voit : les comptes rendus publiés, toutes les offres, le notaire dès qu'il y a quelque chose à en dire. */
function suiteVendeurPublique(s) {
  const n = s.notaire ? notairePublic(s.notaire) : null;
  return {
    comptes_rendus: s.comptes_rendus.filter((c) => c.publie).map((c) => ({ id: c.id, visite_le: c.visite_le, texte: c.texte, publie_le: c.publie_le })),
    offres: s.offres.map(offrePublique),
    notaire: n && (n.nom || n.coordonnees || n.etapes.some((e) => e.fait || e.le)) ? n : null,
  };
}

async function vueDossier(base, dem) {
  return vueAgence(dem, (await visitesDe(base, [dem.id])).get(dem.id), (await etatOffres(base, dem.id)).get(dem.id));
}

async function adminSuite({ request, env }) {
  const dem = await demandeAdmin(request, env, new URL(request.url).searchParams.get('demande'));
  const s = (await suiteDe(await db(env), [dem.id])).get(dem.id);
  return json(200, {
    demande: dem.id, comptes_rendus: s.comptes_rendus.map(crPublic), offres: s.offres.map(offrePublique), notaire: notairePublic(s.notaire),
    statuts_offre: OFFRES, documents: DOCUMENTS, aujourdhui: paris(new Date()).date,
  });
}

/* L'entrée (compte rendu ou offre) à modifier, avec son dossier ; ou le dossier d'une nouvelle entrée. */
async function entree(base, table, d) {
  let ligne = null;
  if (d.id != null) {
    ligne = await base.prepare(`SELECT * FROM ${table} WHERE id = ?1`).bind(entier(d.id, 1, 1e12, { requis: true, nom: 'id' })).first();
    if (!ligne) throw new Erreur(404, 'introuvable');
  }
  const dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(ligne ? ligne.demande_id : entier(d.demande, 1, 1e12, { requis: true, nom: 'demande' })).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  return { ligne, dem };
}

/* Compte rendu de visite (promesse 6 : le soir même). Brouillon tant qu'il n'est pas publié ; la première publication
   prévient le vendeur par e-mail et, si l'annonce venait d'être mise en ligne, fait passer le dossier à « Visites en cours ». */
async function adminCompteRendu(ctx) {
  const { request, env } = ctx;
  await exigerAdmin(request, env);
  const d = await corps(request, 12000);
  const base = await db(env);
  let { ligne: cr, dem } = await entree(base, 'comptes_rendus', d);
  if (d.supprimer === true) {
    if (!cr) throw new Erreur(404, 'introuvable');
    await base.prepare('DELETE FROM comptes_rendus WHERE id = ?1').bind(cr.id).run();
    await journal(base, dem.id, 'cr_supprime', 'agence', { cr: cr.id, visite_le: cr.visite_le });
    return json(200, { ok: true });
  }
  const t = maintenant();
  const aujourdhui = paris(horloge(ctx) || new Date()).date;
  const visiteLe = d.visite_le != null || !cr ? lireJour(d.visite_le, 'visite_le', { requis: true }) : cr.visite_le;
  if (visiteLe > aujourdhui) throw new Erreur(400, 'champs', { champ: 'visite_le' });         // un compte rendu vient après la visite
  const txt = d.texte != null || !cr ? texte(d.texte, 3000, { requis: true, nom: 'texte' }) : cr.texte;
  const publie = d.publie != null ? d.publie === true : !!(cr && cr.publie);
  const premiere = publie && !(cr && cr.publie_le);
  const nouveau = !cr;
  cr = cr
    ? await base.prepare('UPDATE comptes_rendus SET visite_le = ?1, texte = ?2, publie = ?3, publie_le = COALESCE(publie_le, ?4), maj_le = ?5 WHERE id = ?6 RETURNING *').bind(visiteLe, txt, publie ? 1 : 0, premiere ? t : null, t, cr.id).first()
    : await base.prepare('INSERT INTO comptes_rendus (demande_id, visite_le, texte, publie, publie_le, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING *').bind(dem.id, visiteLe, txt, publie ? 1 : 0, premiere ? t : null, t).first();
  let mail = 'non';
  if (premiere) {
    await journal(base, dem.id, 'cr_publie', 'agence', { cr: cr.id, visite_le: visiteLe, soir_meme: visiteLe === aujourdhui });
    if (dem.statut === 'annonce') dem = await changerStatut(ctx, dem, 'visites', { prevenir: false });
    // gardé pour le matin (heures calmes), l'e-mail ne dit pas « aujourd'hui »
    if (d.prevenir !== false) mail = await annoncer(ctx, dem, mailCompteRendu(visiteLe, calme(ctx) ? '' : aujourdhui), 'compte_rendu');
  }
  return json(nouveau ? 201 : 200, { compte_rendu: crPublic(cr), demande: await vueDossier(base, dem), mail });
}

/* Offre reçue : montant, date, conditions, où elle en est. Une offre sur un dossier sous mandat le fait passer à
   « Offre reçue » (e-mail d'annonce) ; le vendeur la voit tout de suite dans son espace. */
async function adminOffre(ctx) {
  const { request, env } = ctx;
  await exigerAdmin(request, env);
  const d = await corps(request, 6000);
  const base = await db(env);
  let { ligne: o, dem } = await entree(base, 'offres', d);
  if (d.supprimer === true) {
    if (!o) throw new Erreur(404, 'introuvable');
    await base.prepare('DELETE FROM offres WHERE id = ?1').bind(o.id).run();
    await journal(base, dem.id, 'offre_supprimee', 'agence', { offre: o.id, montant: o.montant });
    return json(200, { ok: true, demande: await vueDossier(base, dem) });
  }
  const t = maintenant();
  const aujourdhui = paris(horloge(ctx) || new Date()).date;
  const montant = d.montant != null || !o ? entier(d.montant, 1000, 100000000, { requis: true, nom: 'montant' }) : o.montant;
  const recueLe = d.recue_le != null && d.recue_le !== '' ? lireJour(d.recue_le, 'recue_le') : o ? o.recue_le : aujourdhui;
  if (recueLe > aujourdhui) throw new Erreur(400, 'champs', { champ: 'recue_le' });
  const conditions = d.conditions != null || !o ? texte(d.conditions, 1500, { nom: 'conditions' }) : o.conditions;
  const statut = d.statut != null && d.statut !== '' ? choix(d.statut, Object.keys(OFFRES), { requis: true, nom: 'statut' }) : o ? o.statut : 'etude';
  const decideeLe = statut === 'etude' ? null : (o && o.statut === statut && o.decidee_le) || t;
  let mail = 'non';
  if (o) {
    const ancien = o.statut;
    o = await base.prepare('UPDATE offres SET montant = ?1, recue_le = ?2, conditions = ?3, statut = ?4, decidee_le = ?5, maj_le = ?6 WHERE id = ?7 RETURNING *').bind(montant, recueLe, conditions, statut, decideeLe, t, o.id).first();
    if (ancien !== statut) await journal(base, dem.id, 'offre_statut', 'agence', { offre: o.id, montant, statut });
    return json(200, { offre: offrePublique(o), demande: await vueDossier(base, dem), mail });
  }
  const premiere = !(await base.prepare('SELECT id FROM offres WHERE demande_id = ?1 LIMIT 1').bind(dem.id).first());
  o = await base.prepare('INSERT INTO offres (demande_id, montant, recue_le, conditions, statut, decidee_le, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING *').bind(dem.id, montant, recueLe, conditions, statut, decideeLe, t).first();
  await journal(base, dem.id, 'offre_recue', 'agence', { offre: o.id, montant, recue_le: recueLe });
  if (['mandat', 'annonce', 'visites'].includes(dem.statut)) { dem = await changerStatut(ctx, dem, 'offre', { prevenir: d.prevenir !== false }); mail = dem._mail; }
  else if (d.prevenir !== false && !SORTIES.includes(dem.statut)) mail = await annoncer(ctx, dem, mailOffre(nomDuBien(dem), premiere), 'offre');
  return json(201, { offre: offrePublique(o), demande: await vueDossier(base, dem), mail });
}

/* Notaire : son nom, ses coordonnées, les étapes entre le compromis et l'acte. Une étape passée, ou la date de
   signature fixée, s'annonce au vendeur par un e-mail court. */
async function adminNotaire(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 6000);
  const dem = await demandeAdmin(request, env, d.demande);
  const base = await db(env);
  const nom = texte(d.nom, 120, { nom: 'nom_notaire' });
  const coordonnees = texte(d.coordonnees, 300, { nom: 'coordonnees' });
  const brut = d.etapes && typeof d.etapes === 'object' && !Array.isArray(d.etapes) ? d.etapes : {};
  const etapes = {};
  for (const [cle] of ETAPES_NOTAIRE) {
    const e = brut[cle] && typeof brut[cle] === 'object' ? brut[cle] : {};
    const le = lireJour(e.le, 'etapes');
    if (e.fait === true || le) etapes[cle] = { fait: e.fait === true, le };
  }
  const ancien = await base.prepare('SELECT * FROM notaires WHERE demande_id = ?1').bind(dem.id).first();
  const avantE = ancien ? lireJson(ancien.etapes) : {};
  const faites = ETAPES_NOTAIRE.filter(([cle]) => etapes[cle] && etapes[cle].fait && !(avantE[cle] && avantE[cle].fait)).map(([, libelle]) => libelle);
  // la date de signature de l'acte vient d'être fixée (ou a changé), et elle est à venir
  const rdv = etapes.rdv && !etapes.rdv.fait && etapes.rdv.le && etapes.rdv.le !== ((avantE.rdv && avantE.rdv.le) || '') && etapes.rdv.le >= paris(new Date()).date ? etapes.rdv.le : '';
  const change = !ancien || ancien.nom !== nom || ancien.coordonnees !== coordonnees || JSON.stringify(avantE) !== JSON.stringify(etapes);
  const n = await base.prepare(
    `INSERT INTO notaires (demande_id, nom, coordonnees, etapes, maj_le) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(demande_id) DO UPDATE SET nom = ?2, coordonnees = ?3, etapes = ?4, maj_le = ?5 RETURNING *`
  ).bind(dem.id, nom, coordonnees, JSON.stringify(etapes), maintenant()).first();
  if (change) await journal(base, dem.id, 'notaire', 'agence', { nom, faites, rdv: rdv || null });
  let mail = 'non';
  if ((faites.length || rdv) && d.prevenir !== false) mail = await annoncer(ctx, dem, mailNotaire(faites, rdv), 'notaire');
  return json(200, { notaire: notairePublic(n), mail });
}

/* =====================================================================================================
   SYSTÈME PARFAIT — étape 4 : la mesure des 7 promesses (/admin/promesses/)
   Tout se calcule sur ce que les dossiers et leur journal contiennent déjà ; rien n'est écrit ici.
   Les règles sont dans _lib/promesses.js. Les essais (adresses de test, comptes de l'agence, robots probables)
   ne comptent jamais.
   ===================================================================================================== */

async function mesuresPromesses(ctx) {
  const { env } = ctx;
  const now = horloge(ctx) || new Date();
  const base = await db(env);
  const tout = async (sql, ...a) => (await base.prepare(sql).bind(...a).all()).results;
  // le journal des 90 derniers jours suffit à juger 30 jours (une visite d'il y a un mois répond à une demande plus ancienne)
  const depuis = new Date(now.getTime() - 90 * 86400000).toISOString();
  const donnees = {
    demandes: await tout('SELECT id, reference, contact, commune, cree_le, statut, statut_le, suspect, prix_bas FROM demandes ORDER BY id DESC LIMIT 5000'),
    evenements: await tout('SELECT id, demande_id, type, de, vers, detail, cree_le FROM evenements WHERE cree_le >= ?1 ORDER BY id LIMIT 50000', depuis),
    visites: await tout('SELECT demande_id, etat, debut FROM visites ORDER BY id'),
    comptes_rendus: await tout('SELECT demande_id, visite_le, publie_le FROM comptes_rendus WHERE visite_le >= ?1', depuis.slice(0, 10)),
    fichiers: await tout("SELECT demande_id, role, libelle FROM fichiers WHERE role IN ('avis', 'document') AND depose_par = 'agence'"),
    notaires: await tout('SELECT demande_id, nom FROM notaires'),
  };
  const agence = admins(env);
  const essai = (d) => { const e = String(lireJson(d.contact).email || '').toLowerCase(); return adresseDeTest(e) || agence.includes(e); };
  const dossiers = new Map(donnees.demandes.map((d) => {
    const c = lireJson(d.contact);
    return [d.id, { reference: d.reference, vendeur: [c.prenom, c.nom].filter(Boolean).join(' '), commune: d.commune || '' }];
  }));
  return { now, mesures: mesurer(donnees, now, essai), dossiers };
}

async function adminPromesses(ctx) {
  await exigerAdmin(ctx.request, ctx.env);
  const { now, mesures, dossiers } = await mesuresPromesses(ctx);
  return json(200, {
    calcule_le: now.toISOString(), periodes: PERIODES, email_clients: mailClients(ctx.env),
    promesses: tableau(mesures, now).map((p) => ({
      n: p.n, cle: p.cle, titre: p.titre, regle: p.regle, periodes: p.periodes,
      // le délai d'un compte rendu est déjà dans son détail (« publié le lendemain »)
      a_regarder: p.a_regarder.slice(0, 60).map((m) => ({ debut: m.debut, date: m.date, resultat: m.resultat, detail: m.detail, delai_txt: p.unite === 'j' ? '' : delaiFr(m.delai, p.unite), ...dossiers.get(m.demande) })),
    })),
  });
}

/* Les mêmes chiffres pour le Google Sheet (onglet « Promesses », =IMPORTDATA) et pour le contrôle du soir : sept lignes,
   aucun nom, aucune adresse. Protégé par la clé du flux. */
async function fluxPromesses(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  await limiter(env, 'flux:' + ip(request), 120, 3600);
  if (!(await cleValide(env, url.searchParams.get('cle')))) throw new Erreur(403, 'interdit');
  const { now, mesures } = await mesuresPromesses(ctx);
  const quand = now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  const colonnes = (j) => [`tenues (${j} j)`, `ratées (${j} j)`, `en cours (${j} j)`, `délai médian (${j} j)`];
  const lignes = [['n°', 'promesse', ...PERIODES.flatMap(colonnes), 'calculé le']];
  for (const p of tableau(mesures, now)) lignes.push([p.n, p.titre, ...PERIODES.flatMap((j) => { const b = p.periodes[j]; return [b.tenue, b.ratee, b.en_cours, b.mediane_txt]; }), quand]);
  return new Response(csv(lignes, ','), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}

const RESULTATS_FR = { tenue: 'tenue', ratee: 'ratée', en_cours: 'en cours', hors: 'hors mesure' };
const UNITES_FR = { min: 'minutes', h: 'heures', j: 'jours' };

async function adminPromessesCsv(ctx) {
  await exigerAdmin(ctx.request, ctx.env);
  const jours = new URL(ctx.request.url).searchParams.get('jours') === '7' ? 7 : 30;
  const { now, mesures, dossiers } = await mesuresPromesses(ctx);
  const debut = now.getTime() - jours * 86400000;
  const quand = (iso) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  const lignes = [['n°', 'promesse', 'résultat', 'délai', 'unité', 'délai en clair', 'depuis le', 'référence', 'vendeur', 'commune', 'détail']];
  for (const m of mesures.filter((x) => Date.parse(x.debut) >= debut).sort((a, b) => a.p - b.p || Date.parse(b.debut) - Date.parse(a.debut))) {
    const p = PROMESSES[m.p - 1];
    const d = dossiers.get(m.demande) || {};
    lignes.push([m.p, p.titre, RESULTATS_FR[m.resultat], m.delai == null ? '' : String(m.delai).replace('.', ','), m.delai == null ? '' : UNITES_FR[p.unite] || '', delaiFr(m.delai, p.unite), m.date == null ? quand(m.debut) : jourFr(m.date), d.reference, d.vendeur, d.commune, m.detail]);
  }
  return new Response('\uFEFF' + csv(lignes, ';'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
      'Content-Disposition': `attachment; filename="promesses-${jours}-jours-${paris(now).date}.csv"`,
    },
  });
}
