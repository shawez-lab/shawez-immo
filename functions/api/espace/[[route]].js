/* API de l'espace estimation — /api/espace/*  (Cloudflare Pages Functions + D1, liaison DB)

   Public
     GET  /api/espace/sante                 état : base, données DVF, e-mail
     POST /api/espace/estimation            parcours /estimer/ : crée la demande (et le compte), renvoie la fourchette
     POST /api/espace/connexion             { email, mot_de_passe }
     POST /api/espace/deconnexion
     POST /api/espace/inscription           compte sans estimation (ex. accès admin)
     POST /api/espace/mot-de-passe/oubli    { email } → lien par e-mail (si l'envoi est possible)
     POST /api/espace/mot-de-passe/reinit   { jeton, mot_de_passe }
     GET  /api/espace/verifier?jeton=…      lien de vérification de l'adresse e-mail
   Client connecté
     GET  /api/espace/moi                   compte + ses demandes
     POST /api/espace/verification          renvoie le lien de vérification
     POST /api/espace/compte/supprimer      { mot_de_passe } : supprime le compte et ses demandes
   Admin (e-mail dans ADMIN_EMAILS et vérifié)
     GET  /api/espace/admin/demandes
     GET  /api/espace/admin/comptes
     POST /api/espace/admin/demande         { id, statut?, notes? }
     POST /api/espace/admin/compte/supprimer { id }
     POST /api/espace/admin/compte/lien     { id } : lien « nouveau mot de passe » (24 h) à transmettre au client
     GET  /api/espace/admin/export.csv?quoi=demandes|comptes
*/
import {
  db, json, Erreur, corps, texte, entier, choix, email as lireEmail, telephone, motDePasse, verifierOrigine,
  ip, limiter, hacher, verifierMdp, jeton, sha256, ouvrirSession, cookieEfface, compteSession, fermerSession,
  estAdmin, admins, comptepublic, maintenant, STATUTS,
} from '../../_lib/base.js';
import { estimer } from '../../_lib/estimation.js';
import { envoyer, mailPossible, peutEcrire, gabarit, bouton, esc } from '../../_lib/mail.js';



export async function onRequest(context) {
  const { request, env, params } = context;
  const chemin = '/' + [].concat(params.route || []).join('/');
  try {
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
  'POST /connexion': connexion,
  'POST /deconnexion': deconnexion,
  'POST /inscription': inscription,
  'POST /mot-de-passe/oubli': oubli,
  'POST /mot-de-passe/reinit': reinit,
  'GET /verifier': verifier,
  'GET /moi': moi,
  'POST /verification': renvoyerVerification,
  'POST /compte/supprimer': supprimerCompte,
  'GET /admin/demandes': adminDemandes,
  'GET /admin/comptes': adminComptes,
  'POST /admin/demande': adminDemande,
  'POST /admin/compte/supprimer': adminSupprimerCompte,
  'POST /admin/compte/lien': adminLienMdp,
  'GET /admin/export.csv': adminExport,
};

/* ------------------------------------------------------------------ */

async function sante({ env, request }) {
  let base = false, dvf = null;
  try { await (await db(env)).prepare('SELECT 1').first(); base = true; } catch (e) { /* base absente */ }
  try {
    const r = await env.ASSETS.fetch(new URL('/donnees-dvf/index.json', request.url));
    if (r.ok) { const i = await r.json(); dvf = { ventes: i.ventes, derniere_vente: i.derniere_vente, annees: i.annees }; }
  } catch (e) { /* pas de données */ }
  return json(200, { base, dvf, email: mailPossible(env) });
}

function antiRobot(d) {
  // champ leurre rempli, ou formulaire rempli en moins de 4 secondes : robot
  if (d.website) return true;
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

function source(request, env) {
  return env.SOURCE || new URL(request.url).hostname.replace(/^www\./, '');
}

async function estimation(ctx) {
  const { request, env } = ctx;
  const d = await corps(request);
  if (antiRobot(d)) return json(202, { reference: reference(), resultat: { fourchette: false, raison: 'rappel' } });
  await limiter(env, 'est:' + ip(request), 8, 3600);

  const rep = lireReponses(d.reponses || {});
  if (d.consentement !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
  const base = await db(env);
  let compte = await compteSession(request, env);
  let cookie = null;
  let contact;

  if (compte) {
    contact = { civilite: compte.civilite, prenom: compte.prenom, nom: compte.nom, email: compte.email, telephone: compte.telephone };
    if (d.contact && d.contact.telephone) contact.telephone = telephone(d.contact.telephone);
  } else {
    contact = lireContact(d.contact);
    const mdp = motDePasse(d.contact.mot_de_passe);
    const existant = await base.prepare('SELECT * FROM comptes WHERE email = ?1').bind(contact.email).first();
    if (existant) {
      await limiter(env, 'cnx:' + contact.email, 10, 900);
      if (!(await verifierMdp(mdp, existant.mdp))) throw new Erreur(409, 'compte_existe');
      compte = existant;
    } else {
      const r = await base.prepare(
        `INSERT INTO comptes (email, mdp, civilite, prenom, nom, telephone, source, consentement_le, cree_le)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING *`
      ).bind(contact.email, await hacher(mdp), contact.civilite, contact.prenom, contact.nom, contact.telephone, source(request, env), maintenant()).first();
      compte = r;
      ctx.waitUntil(lienVerification(env, request, compte).catch(() => {}));
    }
    cookie = await ouvrirSession(env, compte.id);
  }

  const res = await estimer(env, request.url, rep);
  const ref = reference();
  await base.prepare(
    `INSERT INTO demandes (reference, compte_id, source, type, adresse, code_postal, commune, lat, lon, reponses, contact,
       prix_bas, prix_haut, prix_m2, comparables, rayon, donnees_du, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`
  ).bind(ref, compte.id, source(request, env), rep.type, rep.adresse, rep.code_postal, rep.commune, rep.lat, rep.lon,
    JSON.stringify(rep), JSON.stringify(contact),
    res.fourchette ? res.bas : null, res.fourchette ? res.haut : null, res.fourchette ? res.prix_m2 : null,
    res.comparables ?? null, res.rayon ?? null, res.donnees_du || null, maintenant()).run();

  ctx.waitUntil(notifier(env, request, ref, rep, contact, res).catch((e) => console.log('notification', e && e.message)));
  return json(201, { reference: ref, resultat: res, compte: comptepublic(compte, env) }, cookie ? { 'Set-Cookie': cookie } : {});
}

async function connexion({ request, env }) {
  const d = await corps(request, 2000);
  const e = lireEmail(d.email);
  await limiter(env, 'cnx:' + ip(request), 20, 900);
  await limiter(env, 'cnx:' + e, 10, 900);
  const c = await (await db(env)).prepare('SELECT * FROM comptes WHERE email = ?1').bind(e).first();
  const ok = c && typeof d.mot_de_passe === 'string' && (await verifierMdp(d.mot_de_passe, c.mdp));
  if (!ok) throw new Erreur(401, 'identifiants');
  return json(200, { compte: comptepublic(c, env) }, { 'Set-Cookie': await ouvrirSession(env, c.id) });
}

async function deconnexion({ request, env }) {
  await fermerSession(request, env);
  return json(200, { ok: true }, { 'Set-Cookie': cookieEfface });
}

async function inscription(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 4000);
  if (d.website) return json(202, { ok: true });
  await limiter(env, 'ins:' + ip(request), 5, 3600);
  if (d.consentement !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
  const c = lireContact(d);
  const mdp = motDePasse(d.mot_de_passe);
  const base = await db(env);
  if (await base.prepare('SELECT id FROM comptes WHERE email = ?1').bind(c.email).first()) throw new Erreur(409, 'compte_existe');
  const compte = await base.prepare(
    `INSERT INTO comptes (email, mdp, civilite, prenom, nom, telephone, source, consentement_le, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING *`
  ).bind(c.email, await hacher(mdp), c.civilite, c.prenom, c.nom, c.telephone, source(request, env), maintenant()).first();
  ctx.waitUntil(lienVerification(env, request, compte).catch(() => {}));
  return json(201, { compte: comptepublic(compte, env) }, { 'Set-Cookie': await ouvrirSession(env, compte.id) });
}

async function nouveauJeton(env, compteId, usage, secondes) {
  const t = jeton();
  const base = await db(env);
  await base.batch([
    base.prepare('DELETE FROM jetons WHERE compte_id = ?1 AND usage = ?2').bind(compteId, usage),
    base.prepare('INSERT INTO jetons (id, compte_id, usage, expire) VALUES (?1, ?2, ?3, ?4)').bind(await sha256(t), compteId, usage, Math.floor(Date.now() / 1000) + secondes),
  ]);
  return t;
}

async function consommerJeton(env, t, usage) {
  if (typeof t !== 'string' || t.length < 20 || t.length > 100) return null;
  const base = await db(env);
  const id = await sha256(t);
  const r = await base.prepare('DELETE FROM jetons WHERE id = ?1 AND usage = ?2 AND expire > ?3 RETURNING compte_id')
    .bind(id, usage, Math.floor(Date.now() / 1000)).first();
  return r ? r.compte_id : null;
}

async function lienVerification(env, request, compte) {
  if (!peutEcrire(env, compte.email)) return false;
  const t = await nouveauJeton(env, compte.id, 'verif', 7 * 24 * 3600);
  const lien = `${new URL(request.url).origin}/api/espace/verifier?jeton=${t}`;
  return envoyer(env, {
    to: compte.email,
    subject: 'Confirmez votre adresse e-mail',
    text: `Bonjour ${compte.prenom || ''},\n\nPour confirmer votre adresse e-mail et sécuriser votre espace, ouvrez ce lien (valable 7 jours) :\n${lien}\n\nShawez Ali — GRAVELIN IMMO`,
    html: gabarit('Confirmez votre adresse e-mail', `<tr><td style="padding:8px 24px 16px;font-size:16px;line-height:1.55;color:#3A3630;">Bonjour ${esc(compte.prenom || '')},<br>pour confirmer votre adresse et sécuriser votre espace, cliquez ci-dessous. Le lien est valable 7 jours.</td></tr><tr><td style="padding:0 24px 16px;">${bouton(lien, 'Confirmer mon adresse')}</td></tr>`),
  });
}

async function verifier({ request, env }) {
  const t = new URL(request.url).searchParams.get('jeton');
  const id = await consommerJeton(env, t, 'verif');
  if (id) await (await db(env)).prepare('UPDATE comptes SET verifie = 1 WHERE id = ?1').bind(id).run();
  return Response.redirect(new URL(id ? '/mon-espace/?verifie=1' : '/mon-espace/?verifie=0', request.url).toString(), 303);
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
    const t = await nouveauJeton(env, c.id, 'reinit', 3600);
    const lien = `${new URL(request.url).origin}/mon-espace/?reinit=${t}`;
    await envoyer(env, {
      to: c.email,
      subject: 'Nouveau mot de passe pour votre espace',
      text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${lien}\n\nSi vous n'avez rien demandé, ignorez ce message.\n\nShawez Ali — GRAVELIN IMMO`,
      html: gabarit('Nouveau mot de passe', `<tr><td style="padding:8px 24px 16px;font-size:16px;line-height:1.55;color:#3A3630;">Pour choisir un nouveau mot de passe, cliquez ci-dessous. Le lien est valable 1 heure. Si vous n'avez rien demandé, ignorez ce message.</td></tr><tr><td style="padding:0 24px 16px;">${bouton(lien, 'Choisir un mot de passe')}</td></tr>`),
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
  // le lien reçu par e-mail prouve aussi l'adresse
  await base.batch([
    base.prepare('UPDATE comptes SET mdp = ?1, verifie = 1 WHERE id = ?2').bind(await hacher(mdp), id),
    base.prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(id),
  ]);
  const c = await base.prepare('SELECT * FROM comptes WHERE id = ?1').bind(id).first();
  return json(200, { compte: comptepublic(c, env) }, { 'Set-Cookie': await ouvrirSession(env, id) });
}

function demandePublique(d) {
  const rep = JSON.parse(d.reponses || '{}');
  return {
    id: d.id, reference: d.reference, cree_le: d.cree_le, type: d.type, adresse: d.adresse, commune: d.commune,
    surface: rep.surface ?? null, pieces: rep.pieces ?? null,
    prix_bas: d.prix_bas, prix_haut: d.prix_haut, prix_m2: d.prix_m2, comparables: d.comparables, donnees_du: d.donnees_du,
    statut: d.statut, statut_libelle: STATUTS[d.statut] || d.statut, maj_le: d.maj_le,
  };
}

async function moi({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) return json(200, { compte: null, email: mailPossible(env) });
  const r = await (await db(env)).prepare('SELECT * FROM demandes WHERE compte_id = ?1 ORDER BY cree_le DESC').bind(c.id).all();
  return json(200, { compte: comptepublic(c, env), demandes: r.results.map(demandePublique), email: peutEcrire(env, c.email) });
}

async function supprimerCompte({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  const d = await corps(request, 1000);
  if (typeof d.mot_de_passe !== 'string' || !(await verifierMdp(d.mot_de_passe, c.mdp))) throw new Erreur(401, 'identifiants');
  await effacerCompte(env, c.id);
  return json(200, { ok: true }, { 'Set-Cookie': cookieEfface });
}

async function effacerCompte(env, id) {
  const base = await db(env);
  await base.batch([
    base.prepare('DELETE FROM demandes WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM jetons WHERE compte_id = ?1').bind(id),
    base.prepare('DELETE FROM comptes WHERE id = ?1').bind(id),
  ]);
}

/* ---------------------------- Admin ---------------------------- */

async function exigerAdmin(request, env) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  if (!estAdmin(c, env)) throw new Erreur(403, admins(env).includes(c.email) ? 'admin_non_verifie' : 'interdit');
  return c;
}

async function adminDemandes({ request, env }) {
  await exigerAdmin(request, env);
  const r = await (await db(env)).prepare(
    `SELECT d.*, c.email AS compte_email FROM demandes d LEFT JOIN comptes c ON c.id = d.compte_id ORDER BY d.cree_le DESC LIMIT 2000`
  ).all();
  return json(200, {
    statuts: STATUTS,
    demandes: r.results.map((d) => ({ ...demandePublique(d), source: d.source, notes: d.notes, contact: JSON.parse(d.contact), reponses: JSON.parse(d.reponses), compte_email: d.compte_email })),
  });
}

async function adminComptes({ request, env }) {
  await exigerAdmin(request, env);
  const r = await (await db(env)).prepare(
    `SELECT c.id, c.email, c.civilite, c.prenom, c.nom, c.telephone, c.verifie, c.source, c.cree_le, c.derniere_connexion,
            (SELECT COUNT(*) FROM demandes d WHERE d.compte_id = c.id) AS demandes
     FROM comptes c ORDER BY c.cree_le DESC LIMIT 5000`
  ).all();
  return json(200, { comptes: r.results.map((c) => ({ ...c, admin: estAdmin(c, env) })) });
}

async function adminDemande({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 8000);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  const sets = [];
  const vals = [];
  if (d.statut != null) { sets.push('statut = ?'); vals.push(choix(d.statut, Object.keys(STATUTS), { requis: true, nom: 'statut' })); }
  if (d.notes != null) { sets.push('notes = ?'); vals.push(texte(d.notes, 5000, { nom: 'notes' })); }
  if (!sets.length) throw new Erreur(400, 'champs');
  sets.push('maj_le = ?');
  vals.push(maintenant(), id);
  const r = await (await db(env)).prepare(`UPDATE demandes SET ${sets.join(', ')} WHERE id = ? RETURNING *`).bind(...vals).first();
  if (!r) throw new Erreur(404, 'introuvable');
  return json(200, { demande: { ...demandePublique(r), notes: r.notes } });
}

async function adminSupprimerCompte({ request, env }) {
  const moiAdmin = await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  if (id === moiAdmin.id) throw new Erreur(400, 'soi_meme');
  await effacerCompte(env, id);
  return json(200, { ok: true });
}

async function adminLienMdp({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: 'id' });
  const c = await (await db(env)).prepare('SELECT id FROM comptes WHERE id = ?1').bind(id).first();
  if (!c) throw new Erreur(404, 'introuvable');
  const t = await nouveauJeton(env, id, 'reinit', 24 * 3600);
  return json(200, { lien: `${new URL(request.url).origin}/mon-espace/?reinit=${t}` });
}

const csvCase = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // pas de formule dans le tableur
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function adminExport({ request, env }) {
  await exigerAdmin(request, env);
  const quoi = new URL(request.url).searchParams.get('quoi') === 'comptes' ? 'comptes' : 'demandes';
  const base = await db(env);
  let lignes;
  if (quoi === 'comptes') {
    const r = await base.prepare('SELECT id, cree_le, email, civilite, prenom, nom, telephone, verifie, source, derniere_connexion FROM comptes ORDER BY cree_le DESC').all();
    lignes = [['id', 'créé le', 'e-mail', 'civilité', 'prénom', 'nom', 'téléphone', 'e-mail vérifié', 'source', 'dernière connexion'],
      ...r.results.map((c) => [c.id, c.cree_le, c.email, c.civilite, c.prenom, c.nom, c.telephone, c.verifie ? 'oui' : 'non', c.source, c.derniere_connexion])];
  } else {
    const r = await base.prepare('SELECT * FROM demandes ORDER BY cree_le DESC').all();
    lignes = [['référence', 'reçue le', 'source', 'statut', 'civilité', 'prénom', 'nom', 'e-mail', 'téléphone', 'type', 'adresse', 'code postal', 'commune',
      'surface', 'pièces', 'chambres', 'étage', 'état', 'époque', 'terrain', 'prix idéal', 'délai', 'fourchette basse', 'fourchette haute', 'prix m²', 'comparables', 'données du', 'notes', 'réponses (JSON)']];
    for (const d of r.results) {
      const c = JSON.parse(d.contact || '{}');
      const p = JSON.parse(d.reponses || '{}');
      lignes.push([d.reference, d.cree_le, d.source, STATUTS[d.statut] || d.statut, c.civilite, c.prenom, c.nom, c.email, c.telephone, d.type, d.adresse, d.code_postal, d.commune,
        p.surface, p.pieces, p.chambres, p.etage, p.etat, p.epoque, p.terrain, p.prix_ideal, p.delai, d.prix_bas, d.prix_haut, d.prix_m2, d.comparables, d.donnees_du, d.notes, d.reponses]);
    }
  }
  const csv = '﻿' + lignes.map((l) => l.map(csvCase).join(';')).join('\r\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
      'Content-Disposition': `attachment; filename="${quoi}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

/* ------------------------- Notification ------------------------- */

const LIBELLES = {
  delai: { asap: 'Dès que possible', '6mois': 'Dans les 6 mois', plus6mois: 'Dans plus de 6 mois', nsp: 'Ne sait pas encore', aucun: 'Pas de projet de vente' },
  etat: { travaux: 'Travaux importants', rafraichir: 'Quelques travaux', bon: 'Bon état', neuf: 'Refait à neuf' },
  epoque: { avant1948: 'Avant 1948', '1948-1974': '1948 – 1974', '1975-2000': '1975 – 2000', '2001-2012': '2001 – 2012', apres2012: 'Après 2012', nsp: 'Ne sait pas' },
  autre_type: { commerce: 'Fonds de commerce', murs: 'Murs commerciaux', immeuble: 'Immeuble', terrain: 'Terrain', autre: 'Autre' },
};
const euros = (n) => (n == null ? '' : n.toLocaleString('fr-FR') + ' €');

function fiche(rep) {
  const L = [];
  const add = (k, v) => { if (v !== '' && v != null && v !== false) L.push([k, v === true ? 'oui' : String(v)]); };
  add('Type', rep.type === 'autre' ? LIBELLES.autre_type[rep.autre_type] : rep.type === 'maison' ? 'Maison' : 'Appartement');
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

async function notifier(env, request, ref, rep, c, res) {
  if (!mailPossible(env)) return;
  const dest = String(env.NOTIFY_EMAILS || 'shawez@gravelin-immo.com').split(/[,;\s]+/).filter(Boolean);
  const nom = [c.civilite, c.prenom, c.nom].filter(Boolean).join(' ');
  const fourchette = res.fourchette ? `${euros(res.bas)} – ${euros(res.haut)} (${res.comparables} ventes, rayon ${res.rayon} m)` : 'Pas de fourchette automatique : rappel promis';
  const lignes = [['Contact', nom], ['Téléphone', c.telephone], ['E-mail', c.email], ['Fourchette', fourchette], ...fiche(rep), ['Source', source(request, env)]];
  const tel = 'tel:' + c.telephone.replace(/[^\d+]/g, '');
  const admin = new URL('/admin/', request.url).toString();
  const html = gabarit(`${rep.commune || 'Nouvelle estimation'} — ${nom}`, `
<tr><td style="padding:4px 24px 12px;">${bouton(tel, 'Appeler ' + (c.prenom || ''))}${bouton('mailto:' + c.email + '?subject=' + encodeURIComponent('Votre estimation ' + ref), 'Répondre', false)}</td></tr>
<tr><td style="padding:0 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45;">
${lignes.map(([k, v]) => `<tr><td style="padding:7px 12px 7px 0;color:#6B655C;border-bottom:1px solid #ECE8E0;vertical-align:top;width:38%;">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #ECE8E0;">${esc(v)}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:12px 24px 8px;font-size:13px;color:#6B655C;">Référence ${esc(ref)} · <a href="${esc(admin)}" style="color:#8A6614;">ouvrir l'espace admin</a></td></tr>`);
  const text = `Nouvelle estimation ${ref}\n\n${lignes.map(([k, v]) => `${k} : ${v}`).join('\n')}\n\nAppeler : ${c.telephone}\nAdmin : ${admin}`;
  for (const to of dest) {
    await envoyer(env, { to, subject: `Estimation ${rep.commune || ''} — ${nom} — ${c.telephone}`, text, html, replyTo: c.email });
  }
}

