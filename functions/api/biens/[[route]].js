/* API « Biens à vendre » — /api/biens/*  (Cloudflare Pages Functions + D1, liaison DB)

   Public (sans cookie)
     GET  /api/biens/creneaux               créneaux de visite proposables (lundi-samedi, 9 h-18 h), sans ceux déjà demandés
     POST /api/biens/mesure                 { bien, quoi } quoi ∈ visite_clic | video | whatsapp | tel | estimer : un compteur de plus
     POST /api/biens/visite                 { bien, creneau, prenom, nom?, telephone, email?, message?, consentement }
                                            demande de visite d'un bien → /admin/biens/ + alerte e-mail à l'agence
                                            (prénom « TEST… » ou adresse …@test.invalid : enregistrée comme essai, aucune alerte)
   Admin (même session que /admin/)
     GET  /api/biens/admin/liste            tous les biens : mentions manquantes, suggestions, mesures 30 jours ; demandes de visite
     POST /api/biens/admin/bien             { id, dpe, ges, dpe_kwh, ges_kg, energie_min, energie_max, energie_annee, honoraires_charge,
                                              honoraires_pct, prix_hors_hon, copro, copro_lots, copro_charges, copro_procedure,
                                              video, video_affiche, masque, sites }
     POST /api/biens/admin/visite           { id, statut: demandee | confirmee | faite | annulee }
     POST /api/biens/admin/visite/supprimer { id }
     POST /api/biens/admin/synchro          relit annonces.json tout de suite
*/
import {
  db, json, Erreur, corps, texte, entier, choix, email as lireEmail, telephone, verifierOrigine, ip, limiter,
  compteSession, estAdmin, admins, maintenant,
} from '../../_lib/base.js';
import { creneaux, creneauValide, quandFr } from '../../_lib/suivi.js';
import { envoyer, mailPossible, destinatairesAlerte, adresseDeTest, gabarit, paragraphe, bouton } from '../../_lib/mail.js';
import {
  baseBiens, synchroniser, manque, visible, suggestions, urlBien, compter, MESURES, LETTRES, esc, euros, TEL_AFFICHE, jourParis,
} from '../../_lib/biens.js';

export async function onRequest(context) {
  const { request, params } = context;
  const chemin = '/' + [].concat(params.route || []).join('/');
  try {
    verifierOrigine(request);
    const r = ROUTES[`${request.method} ${chemin}`];
    if (!r) return json(404, { error: 'introuvable' });
    return await r(context);
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code, ...(e.extra || {}) });
    console.log('erreur biens', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}

const ROUTES = {
  'GET /creneaux': creneauxBiens,
  'POST /mesure': mesure,
  'POST /visite': visite,
  'GET /admin/liste': adminListe,
  'POST /admin/bien': adminBien,
  'POST /admin/visite': adminVisite,
  'POST /admin/visite/supprimer': adminVisiteSupprimer,
  'POST /admin/synchro': adminSynchro,
};

async function base(env) { return baseBiens(await db(env)); }
const estEssai = (prenom, email) => /^\s*test\b/i.test(prenom || '') || adresseDeTest(email);

async function bienPublic(env, request, id) {
  const b = await (await base(env)).prepare('SELECT * FROM biens WHERE id = ?1').bind(String(id || '').slice(0, 40)).first();
  if (!b || !visible(b)) throw new Erreur(404, 'bien_introuvable');
  return b;
}

async function prisLes(env) {
  const r = await (await base(env)).prepare(
    `SELECT creneau FROM biens_visites WHERE statut IN ('demandee', 'confirmee') AND creneau > ?1`
  ).bind(new Date().toISOString()).all();
  return new Set((r.results || []).map((x) => new Date(x.creneau).toISOString()));
}

async function creneauxBiens({ env }) {
  const pris = await prisLes(env);
  const jours = creneaux(new Date(), 6)
    .map((j) => ({ ...j, heures: j.heures.filter((h) => !pris.has(h.debut)) }))
    .filter((j) => j.heures.length);
  return json(200, { jours }, { 'Cache-Control': 'no-store' });
}

async function mesure({ request, env }) {
  const c = await corps(request, 2000);
  const quoi = choix(c.quoi, MESURES.filter((m) => !['vue', 'visite_demande'].includes(m)), { requis: true, nom: 'quoi' });
  await limiter(env, `biens-mesure:${ip(request)}`, 120, 3600);
  await bienPublic(env, request, c.bien);
  await compter(env, c.bien, quoi);
  return json(200, { ok: true });
}

async function visite({ request, env, waitUntil }) {
  const c = await corps(request, 6000);
  if (c.site_web) return json(200, { ok: true });                     // piège à robots : on ne dit rien
  const b = await bienPublic(env, request, c.bien);
  const prenom = texte(c.prenom, 60, { requis: true, nom: 'prenom' });
  const nom = texte(c.nom, 80);
  const tel = telephone(c.telephone);
  if (!tel) throw new Erreur(400, 'telephone');
  const mail = c.email ? lireEmail(c.email) : null;
  const message = texte(c.message, 1000);
  if (c.consentement !== true) throw new Erreur(400, 'consentement');
  let creneau = null;
  if (c.creneau) {
    if (!creneauValide(c.creneau)) throw new Erreur(400, 'creneau');
    if ((await prisLes(env)).has(new Date(c.creneau).toISOString())) throw new Erreur(409, 'creneau_pris');
    creneau = new Date(c.creneau).toISOString();
  }
  await limiter(env, `biens-visite:${ip(request)}`, 6, 3600);
  const essai = estEssai(prenom, mail) ? 1 : 0;
  const quand = maintenant();
  const r = await (await base(env)).prepare(
    `INSERT INTO biens_visites (bien_id, prenom, nom, telephone, email, creneau, message, test, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) RETURNING id`
  ).bind(b.id, prenom, nom || null, tel, mail, creneau, message || null, essai, quand).first();
  await compter(env, b.id, 'visite_demande');
  const alerte = alerter(env, request, b, { id: r.id, prenom, nom, tel, mail, creneau, message, essai });
  if (waitUntil) waitUntil(alerte); else await alerte;
  return json(200, { ok: true, id: r.id, creneau, creneau_fr: creneau ? quandFr(creneau) : null });
}

async function alerter(env, request, b, v) {
  const base_ = await base(env);
  let etat;
  if (v.essai) etat = 'essai : aucune alerte';
  else if (!mailPossible(env)) etat = 'aucun service d\'envoi relié';
  else {
    const origine = new URL(request.url).origin;
    const titre = `Visite demandée — ${b.type} à ${b.commune} (réf. ${b.id})`;
    const lignes = [
      `<b>${esc(v.prenom)} ${esc(v.nom || '')}</b> — <a href="tel:${esc(v.tel)}">${esc(v.tel)}</a>${v.mail ? ` — ${esc(v.mail)}` : ''}`,
      v.creneau ? `Créneau souhaité : <b>${esc(quandFr(v.creneau))}</b> (à confirmer)` : 'Pas de créneau choisi : à rappeler pour fixer la visite.',
      `Bien : ${esc(b.type)} à ${esc(b.commune)}, ${esc(euros(b.prix))} — <a href="${origine}${urlBien(b)}">voir la fiche</a>`,
      v.message ? `Message : « ${esc(v.message)} »` : '',
    ].filter(Boolean);
    const html = gabarit(titre, lignes.map(paragraphe).join('') + bouton(`${origine}/admin/biens/`, 'Ouvrir les demandes de visite'), 'shawez');
    const text = `${titre}\n${v.prenom} ${v.nom || ''} — ${v.tel}${v.mail ? ' — ' + v.mail : ''}\n${v.creneau ? 'Créneau : ' + quandFr(v.creneau) : 'Sans créneau'}\n${origine}${urlBien(b)}\n${origine}/admin/biens/`;
    let partis = 0;
    for (const to of destinatairesAlerte(env)) {
      try { if (await envoyer(env, { to, subject: titre, html, text })) partis++; } catch (e) { /* noté plus bas */ }
    }
    etat = `${partis} e-mail(s) d'alerte parti(s)`;
  }
  await base_.prepare('UPDATE biens_visites SET alerte = ?1 WHERE id = ?2').bind(etat, v.id).run();
}

/* ---------- Admin ---------- */
async function exigerAdmin(request, env) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  if (!estAdmin(c, env)) throw new Erreur(403, admins(env).includes(c.email) ? 'admin_non_verifie' : 'interdit');
  return c;
}

async function adminListe({ request, env }) {
  await exigerAdmin(request, env);
  await synchroniser(env, new URL(request.url).origin);
  const B = await base(env);
  const biens = (await B.prepare(`SELECT * FROM biens ORDER BY CASE statut WHEN 'en vente' THEN 0 WHEN 'sous compromis' THEN 1 ELSE 2 END, premier_le DESC, id`).all()).results || [];
  const depuis = jourParis(new Date(Date.now() - 30 * 86400000));
  const mes = (await B.prepare('SELECT bien_id, quoi, SUM(n) AS n FROM biens_mesures WHERE jour >= ?1 GROUP BY bien_id, quoi').bind(depuis).all()).results || [];
  const parBien = {};
  for (const m of mes) (parBien[m.bien_id] = parBien[m.bien_id] || {})[m.quoi] = m.n;
  const visites = (await B.prepare('SELECT * FROM biens_visites ORDER BY cree_le DESC LIMIT 500').all()).results || [];
  const synchro = (await B.prepare("SELECT valeur FROM reglages WHERE cle = 'biens_synchro_le'").first())?.valeur || null;
  return json(200, {
    synchro_le: synchro,
    biens: biens.map((b) => ({
      ...b, carac: undefined, description: undefined,
      photos: JSON.parse(b.photos || '[]').slice(0, 1),
      manque: manque(b), visible: visible(b), url: urlBien(b), suggestions: suggestions(b), mesures: parBien[b.id] || {},
    })),
    visites,
  }, { 'Cache-Control': 'no-store' });
}

const nbOuNull = (v, min, max, nom) => (v === '' || v == null ? null : entier(v, min, max, { nom }));
async function adminBien({ request, env }) {
  const compte = await exigerAdmin(request, env);
  const c = await corps(request, 8000);
  const B = await base(env);
  const b = await B.prepare('SELECT * FROM biens WHERE id = ?1').bind(String(c.id || '')).first();
  if (!b) throw new Erreur(404, 'bien_introuvable');
  const dpe = c.dpe ? choix(c.dpe, [...LETTRES, 'vierge', 'non_soumis'], { nom: 'dpe' }) : null;
  const ges = c.ges ? choix(c.ges, LETTRES, { nom: 'ges' }) : null;
  const charge = c.honoraires_charge ? choix(c.honoraires_charge, ['vendeur', 'acquereur'], { nom: 'honoraires_charge' }) : null;
  let pct = c.honoraires_pct === '' || c.honoraires_pct == null ? null : Number(String(c.honoraires_pct).replace(',', '.'));
  if (pct != null && !(pct > 0 && pct <= 15)) throw new Erreur(400, 'champs', { champ: 'honoraires_pct' });
  const video = c.video ? texte(c.video, 300) : null;
  if (video && !/^\/[A-Za-z0-9/_.-]+\.(mp4|webm)$/.test(video)) throw new Erreur(400, 'champs', { champ: 'video' });
  const affiche = c.video_affiche ? texte(c.video_affiche, 300) : null;
  if (affiche && !/^\/[A-Za-z0-9/_.-]+\.(webp|jpg|jpeg|png)$/.test(affiche)) throw new Erreur(400, 'champs', { champ: 'video_affiche' });
  const sites = c.sites ? String(c.sites).split(',').map((s) => s.trim()).filter((s) => ['shawez', 'gravelin'].includes(s)).join(',') : b.sites;
  const copro = c.copro === '' || c.copro == null ? null : (c.copro === true || c.copro === 1 || c.copro === '1' ? 1 : 0);
  const procs = ['pas de procédure en cours', 'procédure en cours'];
  const proc = c.copro_procedure ? choix(c.copro_procedure, procs, { nom: 'copro_procedure' }) : null;
  await B.prepare(
    `UPDATE biens SET dpe = ?2, ges = ?3, dpe_kwh = ?4, ges_kg = ?5, energie_min = ?6, energie_max = ?7, energie_annee = ?8,
       honoraires_charge = ?9, honoraires_pct = ?10, prix_hors_hon = ?11, copro = ?12, copro_lots = ?13, copro_charges = ?14,
       copro_procedure = ?15, video = ?16, video_affiche = ?17, masque = ?18, sites = ?19, saisi_le = ?20, saisi_par = ?21
     WHERE id = ?1`
  ).bind(
    b.id, dpe, ges, nbOuNull(c.dpe_kwh, 0, 2000, 'dpe_kwh'), nbOuNull(c.ges_kg, 0, 500, 'ges_kg'),
    nbOuNull(c.energie_min, 0, 50000, 'energie_min'), nbOuNull(c.energie_max, 0, 50000, 'energie_max'),
    nbOuNull(c.energie_annee, 2021, 2100, 'energie_annee'), charge, pct, nbOuNull(c.prix_hors_hon, 1, 100000000, 'prix_hors_hon'),
    copro, nbOuNull(c.copro_lots, 1, 10000, 'copro_lots'), nbOuNull(c.copro_charges, 0, 1000000, 'copro_charges'), proc,
    video, affiche, c.masque ? 1 : 0, sites, maintenant(), compte.email,
  ).run();
  const apres = await B.prepare('SELECT * FROM biens WHERE id = ?1').bind(b.id).first();
  return json(200, { ok: true, manque: manque(apres), visible: visible(apres), url: urlBien(apres) });
}

async function adminVisite({ request, env }) {
  await exigerAdmin(request, env);
  const c = await corps(request, 2000);
  const statut = choix(c.statut, ['demandee', 'confirmee', 'faite', 'annulee'], { requis: true, nom: 'statut' });
  const r = await (await base(env)).prepare('UPDATE biens_visites SET statut = ?1, maj_le = ?2 WHERE id = ?3').bind(statut, maintenant(), entier(c.id, 1, 1e9, { requis: true })).run();
  if (!r.meta || !r.meta.changes) throw new Erreur(404, 'introuvable');
  return json(200, { ok: true });
}

async function adminVisiteSupprimer({ request, env }) {
  await exigerAdmin(request, env);
  const c = await corps(request, 2000);
  await (await base(env)).prepare('DELETE FROM biens_visites WHERE id = ?1').bind(entier(c.id, 1, 1e9, { requis: true })).run();
  return json(200, { ok: true });
}

async function adminSynchro({ request, env }) {
  await exigerAdmin(request, env);
  const r = await synchroniser(env, new URL(request.url).origin, { forcer: true });
  return json(200, { ok: true, ...r });
}
