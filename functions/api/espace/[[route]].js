/* API de l'espace estimation — /api/espace/*  (Cloudflare Pages Functions + D1, liaison DB)

   Le même code sert les deux sites (shawez-immo.com et le site de l'agence) : même base, « site » noté sur chaque demande.

   Public
     GET  /api/espace/sante                 état : base, données DVF, e-mail
     POST /api/espace/estimation            parcours /estimer/ : enregistre la demande, crée le compte (sans mot de passe),
                                            renvoie la fourchette tout de suite
     POST /api/espace/lien                  { email } → lien de connexion par e-mail (30 min, usage unique)
     POST /api/espace/lien/ouvrir           { jeton } → ouvre la session
     POST /api/espace/connexion             { email, mot_de_passe } (pour ceux qui ont choisi un mot de passe)
     POST /api/espace/deconnexion
     POST /api/espace/inscription           compte sans estimation (ex. accès admin)
     POST /api/espace/mot-de-passe/oubli    { email } → lien par e-mail (si l'envoi est possible)
     POST /api/espace/mot-de-passe/reinit   { jeton, mot_de_passe }
     GET  /api/espace/verifier?jeton=…      anciens liens de confirmation : renvoi vers /mon-espace/?lien=…
     GET  /api/espace/flux/site.csv?cle=…   demandes pour le Google Sheet (IMPORTDATA), protégé par une clé
   Client connecté
     GET  /api/espace/moi                   compte + ses demandes + ses fichiers
     POST /api/espace/verification          renvoie le lien de vérification
     POST /api/espace/mot-de-passe/definir  { mot_de_passe, actuel? } : choisir ou changer son mot de passe
     POST /api/espace/compte/supprimer      { mot_de_passe } ou { confirmation: 'SUPPRIMER' }
     POST /api/espace/fichier?demande=…     dépôt d'une photo ou d'un document (corps = le fichier, 10 Mo max)
     GET  /api/espace/fichier?id=…          téléchargement (le client pour ses demandes, l'agence pour toutes)
     POST /api/espace/fichier/supprimer     { id }
   Admin (e-mail dans ADMIN_EMAILS et vérifié)
     GET  /api/espace/admin/demandes
     GET  /api/espace/admin/comptes
     POST /api/espace/admin/demande         { id, statut?, notes?, rappel_le? }
     POST /api/espace/admin/demande/supprimer { id }
     POST /api/espace/admin/fichier?demande=…&role=avis|document   dépôt de l'avis de valeur (PDF) ou d'un document
     POST /api/espace/admin/compte/supprimer { id }
     POST /api/espace/admin/compte/lien     { id, type: 'acces' | 'reinit' } : lien (24 h) à transmettre au client
     POST /api/espace/admin/flux            nouvelle clé pour le Google Sheet (affichée une seule fois)
     GET  /api/espace/admin/export.csv?quoi=demandes|comptes&site=…&statut=…
*/
import {
  db, json, Erreur, corps, texte, entier, choix, email as lireEmail, telephone, motDePasse, verifierOrigine,
  ip, limiter, hacher, verifierMdp, jeton, sha256, ouvrirSession, cookieEfface, temoinPresent, compteSession, fermerSession,
  estAdmin, admins, comptepublic, maintenant, STATUTS, STATUTS_CLIENT, reglerHachage,
} from '../../_lib/base.js';
import { estimer } from '../../_lib/estimation.js';
import { envoyer, mailPossible, mailClients, peutEcrire, destinatairesAlerte, adresseDeTest, gabarit, paragraphe, bouton, esc } from '../../_lib/mail.js';
import { deposer, lire as lireFichier, supprimerFichier, fichiersDe, supprimerFichiersDe, TAILLE_MAX } from '../../_lib/fichiers.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const chemin = '/' + [].concat(params.route || []).join('/');
  try {
    reglerHachage(env);
    verifierOrigine(request);
    const r = ROUTES[`${request.method} ${chemin}`];
    if (!r) return json(404, { error: 'introuvable' });
    return await r(context);
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code, ...(e.extra || {}) });
    console.log('erreur', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}

const ROUTES = {
  'GET /sante': sante,
  'POST /estimation': estimation,
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
};

/* ------------------------------------------------------------------ */

/* Version de l'API : les tests sur l'aperçu attendent de la voir avant de commencer (le site met une à deux minutes
   à se mettre à jour après une poussée). À changer à chaque évolution de l'API. */
const VERSION = '2026-10-08.2';

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
    let res = null;
    try { res = JSON.parse(deja.resultat || 'null'); } catch (e) { /* ancien format */ }
    return json(200, {
      reference: deja.reference, resultat: res || { fourchette: false, raison: 'rappel' }, rejoue: true,
      compte: connecte ? comptepublic(c, env) : null,
      espace: { connecte, nouveau: connecte && !c.verifie && !c.mdp, existant: !connecte && !!c, en_attente: !!deja.en_attente, lien: c && !deja.suspect && peutEcrire(env, c.email) ? 'envoye' : 'indisponible', mot_de_passe: !!(c && c.mdp) },
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
  try {
    await base.prepare(
      `INSERT INTO demandes (reference, compte_id, source, type, adresse, code_postal, commune, lat, lon, reponses, contact,
         prix_bas, prix_haut, prix_m2, comparables, rayon, donnees_du, cree_le, en_attente, cle, suspect, resultat)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)`
    ).bind(ref, compte.id, lieu, rep.type, rep.adresse, rep.code_postal, rep.commune, rep.lat, rep.lon,
      JSON.stringify(rep), JSON.stringify(contact),
      res.fourchette ? res.bas : null, res.fourchette ? res.haut : null, res.fourchette ? res.prix_m2 : null,
      res.comparables ?? null, res.rayon ?? null, res.donnees_du || null, t, enAttente, cle, suspect ? 1 : 0, JSON.stringify(res)).run();
  } catch (e) {
    // deux envois arrivés en même temps avec la même clé : le second rend la demande du premier
    const r = await rejouer();
    if (r) return r;
    throw e;
  }
  if (nouveau) cookie = await ouvrirSession(env, compte.id);

  const ecrireAuClient = !suspect && peutEcrire(env, contact.email);
  ctx.waitUntil((async () => {
    if (!adresseDeTest(contact.email)) await notifier(env, request, ref, rep, contact, res, lieu, suspect).catch((e) => console.log('notification', e && e.message));
    if (ecrireAuClient) await mailResultat(env, request, compte, ref, rep, contact, res, lieu).catch((e) => console.log('mail client', e && e.message));
  })());

  const connecte = !!session || nouveau;
  return json(201, {
    reference: ref, resultat: res,
    compte: connecte ? comptepublic(compte, env) : null,
    espace: { connecte, nouveau, existant: !connecte, en_attente: !!enAttente, lien: ecrireAuClient ? 'envoye' : 'indisponible', mot_de_passe: !!compte.mdp },
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

async function nouveauJeton(env, compteId, usage, secondes) {
  const t = jeton();
  const base = await db(env);
  const maintenantS = Math.floor(Date.now() / 1000);
  await base.batch([
    base.prepare('DELETE FROM jetons WHERE (compte_id = ?1 AND usage = ?2) OR expire < ?3').bind(compteId, usage, maintenantS),
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
async function lienConnexion(env, request, compteId) {
  const t = await nouveauJeton(env, compteId, 'magique', DUREE_LIEN);
  return `${new URL(request.url).origin}/mon-espace/?lien=${t}`;
}

const SIGNATURE = 'Shawez Ali – Gravelin Immo\n07 67 57 92 28';
const SIGNATURE_HTML = '<b>Shawez Ali</b> – Gravelin Immo<br><a href="tel:+33767579228" style="color:inherit;">07 67 57 92 28</a>';

async function lienDemander({ request, env }) {
  const d = await corps(request, 1000);
  const e = lireEmail(d.email);
  await limiter(env, 'lien:' + ip(request), 8, 3600);
  await limiter(env, 'lien:' + e, 4, 3600);
  if (!peutEcrire(env, e)) return json(200, { envoye: false, raison: 'email_indisponible' });
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
    const lien = await lienConnexion(env, request, c.id);
    await envoyer(env, {
      to: c.email,
      subject: 'Votre lien de connexion',
      text: `Bonjour ${c.prenom || ''},\n\nVoici votre lien pour ouvrir votre espace (valable 30 minutes, une seule fois) :\n${lien}\n\nSi vous n'avez rien demandé, ignorez ce message.\n\n${SIGNATURE}`,
      html: gabarit('Votre lien de connexion', paragraphe(`Bonjour ${esc(c.prenom || '')},<br>voici votre lien pour ouvrir votre espace. Il est valable 30 minutes et ne sert qu'une fois.`) + `<tr><td style="padding:0 24px 16px;">${bouton(lien, 'Ouvrir mon espace', true, lieu)}</td></tr>` + paragraphe(`<span style="font-size:14px;color:#6B655C;">Si vous n'avez rien demandé, ignorez ce message.</span><br><br>${SIGNATURE_HTML}`), lieu),
    });
  }
  // même réponse que le compte existe ou non
  return json(200, { envoye: true });
}

async function lienOuvrir({ request, env }) {
  const d = await corps(request, 1000);
  await limiter(env, 'ouvrir:' + ip(request), 30, 3600);
  const id = await consommerJeton(env, d.jeton, ['magique', 'acces', 'verif']);
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
  const fichiers = await fichiersDe(env, r.results.map((d) => d.id));
  return json(200, {
    compte: comptepublic(c, env),
    demandes: r.results.map((d) => ({ ...demandePublique(d), fichiers: fichiers.filter((f) => f.demande_id === d.id).map(fichierPublic) })),
    en_attente: await enAttenteDe(base, c.id),
    email: peutEcrire(env, c.email),
    taille_max: TAILLE_MAX,
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
  await base.batch([
    base.prepare('DELETE FROM demandes WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM jetons WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM comptes WHERE id = ?1').bind(id),
  ]);
}

/* ---------------------- Fichiers (photos, documents, avis de valeur) ---------------------- */

const fichierPublic = (f) => ({ id: f.id, nom: f.nom, type: f.type, taille: f.taille, role: f.role, depose_par: f.depose_par, cree_le: f.cree_le });

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
  if (!f || !(estAdmin(c, env) || (f.proprietaire === c.id && !f.attente))) throw new Erreur(404, 'introuvable');
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

async function adminFichier({ request, env }) {
  const moiAdmin = await exigerAdmin(request, env);
  const url = new URL(request.url);
  const demandeId = entier(url.searchParams.get('demande'), 1, 1e12, { requis: true, nom: 'demande' });
  const base = await db(env);
  const dem = await base.prepare('SELECT * FROM demandes WHERE id = ?1').bind(demandeId).first();
  if (!dem) throw new Erreur(404, 'introuvable');
  const role = url.searchParams.get('role') === 'avis' ? 'avis' : 'document';
  const f = await deposer(env, request, { demandeId, compteId: moiAdmin.id, role, par: 'agence', pdfSeul: role === 'avis' });
  let statut = dem.statut;
  // l'avis de valeur est déposé : le dossier passe à « avis de valeur envoyé »
  if (role === 'avis' && ['recue', 'appele', 'visite'].includes(dem.statut)) {
    statut = 'avis';
    await base.prepare('UPDATE demandes SET statut = ?1, maj_le = ?2 WHERE id = ?3').bind(statut, maintenant(), demandeId).run();
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
  const fichiers = await fichiersDe(env, r.results.map((d) => d.id));
  return json(200, {
    statuts: STATUTS,
    stockage: env.FICHIERS ? 'r2' : 'd1',
    taille_max: TAILLE_MAX,
    demandes: r.results.map((d) => ({
      ...demandePublique(d, STATUTS), site: siteDe(d.source), notes: d.notes, rappel_le: d.rappel_le || '', suspect: !!d.suspect, en_attente: !!d.en_attente,
      test: adresseDeTest(lireJson(d.contact).email),
      contact: lireJson(d.contact), reponses: lireJson(d.reponses), compte_email: d.compte_email,
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

async function adminDemande({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 8000);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  const sets = [];
  const vals = [];
  if (d.statut != null) { sets.push('statut = ?'); vals.push(choix(d.statut, Object.keys(STATUTS), { requis: true, nom: 'statut' })); }
  if (d.notes != null) { sets.push('notes = ?'); vals.push(texte(d.notes, 5000, { nom: 'notes' })); }
  if (d.rappel_le != null) {
    const j = texte(d.rappel_le, 10, { nom: 'rappel_le' });
    if (j && (!/^\d{4}-\d{2}-\d{2}$/.test(j) || Number.isNaN(Date.parse(j)))) throw new Erreur(400, 'champs', { champ: 'rappel_le' });
    sets.push('rappel_le = ?'); vals.push(j || null);
  }
  if (d.suspect === false) sets.push('suspect = 0');
  if (!sets.length) throw new Erreur(400, 'champs');
  sets.push('maj_le = ?');
  vals.push(maintenant(), id);
  const r = await (await db(env)).prepare(`UPDATE demandes SET ${sets.join(', ')} WHERE id = ? RETURNING *`).bind(...vals).first();
  if (!r) throw new Erreur(404, 'introuvable');
  return json(200, { demande: { ...demandePublique(r, STATUTS), notes: r.notes, rappel_le: r.rappel_le || '', suspect: !!r.suspect } });
}

async function adminSupprimerDemande({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  await supprimerFichiersDe(env, [id]);
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
  return json(200, { adresse, formule: `=IMPORTDATA("${adresse}")` });
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
const STATUTS_SHEET = { recue: 'nouvelle', appele: 'appelé', visite: 'visite prévue', avis: 'avis envoyé', close: 'perdu' };

function telephoneLisible(t) {
  const s = String(t || '').trim();
  const c = s.replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(c)) return c.replace(/(\d{2})(?=\d)/g, '$1 ');                       // 06 12 34 56 78
  if (/^\+33\d{9}$/.test(c)) return '+33 ' + c[3] + ' ' + c.slice(4).replace(/(\d{2})(?=\d)/g, '$1 ');
  return s;
}

function prochaineAction(d) {
  const avant = d.rappel_le ? ` avant le ${jourFr(d.rappel_le)}` : '';
  switch (d.statut) {
    case 'recue': return d.prix_bas ? `Appeler${avant || ' dans les 15 min'}` : `Appeler${avant || ' sous 24 h'} (pas de fourchette automatique)`;
    case 'appele': return avant ? `Rappeler${avant}` : 'Proposer une visite';
    case 'visite': return `Visite, puis avis de valeur${avant}`;
    case 'avis': return avant ? `Relancer${avant}` : "Relancer après l'avis de valeur";
    default: return '';
  }
}

async function flux({ request, env }) {
  const url = new URL(request.url);
  await limiter(env, 'flux:' + ip(request), 120, 3600);
  if (!(await cleValide(env, url.searchParams.get('cle')))) throw new Erreur(403, 'interdit');
  const r = await (await db(env)).prepare('SELECT * FROM demandes ORDER BY id ASC').all();
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
      STATUTS_SHEET[d.statut] || d.statut, prochaineAction(d),
      [d.suspect ? 'Robot possible : à vérifier.' : '', d.notes || ''].filter(Boolean).join(' '), d.reference,
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
  const fourchette = res.fourchette ? `${euros(res.bas)} – ${euros(res.haut)} (${res.comparables} ventes, rayon ${rayonLibelle(res.rayon)})` : 'Pas de fourchette automatique : rappel promis sous 24 h';
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
    intro = `J'ai bien reçu votre demande pour ${bien}, ${rep.adresse}.\nIl n'y a pas assez de ventes comparables pour vous donner une fourchette automatique fiable : je l'étudie moi-même et je vous rappelle sous 24 h.`;
    introHtml = paragraphe(`Bonjour ${esc(c.prenom)},<br>j'ai bien reçu votre demande pour ${bien}, ${esc(rep.adresse)}.<br>Il n'y a pas assez de ventes comparables pour vous donner une fourchette automatique fiable : je l'étudie moi-même et <b>je vous rappelle sous 24 h</b>.`);
  }
  const suite = 'La suite : je vous appelle pour en parler. Si vous le souhaitez, je passe voir le bien (c\'est gratuit et sans engagement), puis je vous remets un avis de valeur détaillé, par écrit.';
  await envoyer(env, {
    to: c.email,
    subject: sujet,
    replyTo: 'shawez@gravelin-immo.com',
    text: `Bonjour ${c.prenom},\n\n${intro}\n\n${suite}\n\nVotre espace (estimation, avancement, documents) :\n${lien}\nCe lien est valable 30 minutes. Passé ce délai, demandez-en un nouveau sur ${espace}\n\nRéférence ${ref}\n\n${SIGNATURE}`,
    html: gabarit(res.fourchette ? 'Votre estimation' : 'Votre demande est bien arrivée', introHtml + paragraphe(esc(suite))
      + `<tr><td style="padding:0 24px 8px;">${bouton(lien, 'Ouvrir mon espace', true, lieu)}${bouton('tel:+33767579228', 'Appeler Shawez', false, lieu)}</td></tr>`
      + paragraphe(`<span style="font-size:14px;color:#6B655C;">Le bouton « Ouvrir mon espace » est valable 30 minutes. Passé ce délai, demandez un nouveau lien sur <a href="${esc(espace)}" style="color:inherit;">la page Mon espace</a>. Référence ${esc(ref)}.</span><br><br>${SIGNATURE_HTML}`), lieu),
  });
}
