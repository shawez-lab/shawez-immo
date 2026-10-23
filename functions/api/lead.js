/* /api/lead — formulaire « Être rappelé par Shawez » de /estimation-immobiliere-dijon/ (et tout formulaire lead.v1).

   Même circuit que /estimer/ : la demande est enregistrée dans la base de l'espace estimation (table demandes, sans
   fourchette automatique, statut « Nouvelle ») et l'alerte part tout de suite à Shawez par la même voie d'envoi.
   Elle apparaît donc dans l'espace agence (/admin/) et dans le flux du Google Sheet comme les autres demandes.

   GET  /api/lead → { ready: true } quand la base est reliée (la page envoie alors d'elle-même ; sinon WhatsApp/e-mail)
   POST /api/lead → { reference } (201)
*/
import { db, json, Erreur, corps, texte, email as lireEmail, telephone, verifierOrigine, ip, limiter, maintenant } from '../_lib/base.js';
import { envoyer, mailPossible, destinatairesAlerte, adresseDeTest, gabarit, bouton, esc } from '../_lib/mail.js';

const TYPES = {
  Appartement: ['appartement', null], Maison: ['maison', null], Immeuble: ['autre', 'immeuble'],
  'Local ou commerce': ['autre', 'commerce'], Terrain: ['autre', 'terrain'], Autre: ['autre', 'autre'],
};
const DELAIS = { 'Je vends dans les 3 mois': 'asap', "Je vends dans l'année": '6mois', 'Je me renseigne': 'nsp' };

function reference() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `E-${d}-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/* Surface facultative : une valeur nulle, négative, absurde (> 100 000 m²) ou illisible est ignorée (null),
   pour ne jamais perdre la demande à cause d'elle. Le formulaire, lui, n'accepte que 5 à 2 000 m², ou vide. */
function surfaceLue(v) {
  if (v == null || v === '') return null;
  const n = Number(typeof v === 'string' ? v.trim().replace(',', '.') : v);
  return Number.isFinite(n) && n > 0 && n <= 100000 ? Math.round(n) : null;
}

export async function onRequest(context) {
  const { request, env } = context;
  try {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return json(200, { ready: !!env.DB, email: mailPossible(env) }, { 'Cache-Control': 'no-store' });
    }
    if (request.method !== 'POST') return json(405, { error: 'methode' });
    verifierOrigine(request);
    return await recevoir(context);
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code, ...(e.extra || {}) });
    console.log('lead', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}

async function recevoir(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 8000);
  await limiter(env, 'lead:' + ip(request), 10, 3600);
  if (d.consent_notice !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
  const robot = !!d.website;

  const [type, autreType] = TYPES[d.type] || ['autre', 'autre'];
  const piecesLibelle = texte(d.pieces, 40, { nom: 'pieces' });
  const pieces = parseInt(piecesLibelle, 10);
  const rep = {
    type, ...(autreType ? { autre_type: autreType } : {}),
    commune: texte(d.commune, 120, { requis: true, nom: 'commune' }),
    surface: surfaceLue(d.surface),
    pieces: Number.isFinite(pieces) ? pieces : (/studio/i.test(piecesLibelle) ? 1 : null),
    pieces_libelle: piecesLibelle,
    delai: DELAIS[d.delai] || 'nsp',
    delai_libelle: texte(d.delai, 60, { nom: 'delai' }),
    deja_en_agence: d.deja_en_agence === true,
    creneau: texte(d.creneau, 30, { nom: 'creneau' }),
    message: texte(d.message, 1500, { nom: 'message' }),
    newsletter: d.consent_newsletter === true,
    formulaire: 'estimation-immobiliere-dijon',
  };
  // « Demander une visite » depuis une fiche /biens/… : même circuit, la demande porte le bien concerné.
  const visite = d.formulaire === 'visite-bien';
  if (visite) {
    rep.formulaire = 'visite-bien';
    rep.bien = {
      ref: texte(d.bien_ref, 40, { requis: true, nom: 'bien_ref' }),
      titre: texte(d.bien_titre, 160, { nom: 'bien_titre' }),
      url: texte(d.bien_url, 300, { nom: 'bien_url' }),
    };
  }
  const contact = {
    civilite: '',
    prenom: texte(d.prenom, 80, { requis: true, nom: 'prenom' }),
    nom: texte(d.nom, 80, { requis: true, nom: 'nom' }),
    email: lireEmail(d.email),
    telephone: d.telephone ? telephone(d.telephone) : '',
  };

  const base = await db(env);
  const ref = reference();
  const t = maintenant();
  const notes = visite
    ? `Demande de visite du bien réf. ${rep.bien.ref}${rep.bien.titre ? ' (' + rep.bien.titre + ')' : ''} depuis ${rep.bien.url || 'shawez-immo.com'} : rappeler pour fixer la visite.`
    : 'Formulaire « être rappelé » (page Estimation) : pas de fourchette automatique, rappel au plus vite.';
  await base.prepare(
    `INSERT INTO demandes (reference, compte_id, source, type, adresse, code_postal, commune, reponses, contact, cree_le, suspect, notes)
     VALUES (?1, NULL, ?2, ?3, '', '', ?4, ?5, ?6, ?7, ?8, ?9)`
  ).bind(ref, 'shawez', type, rep.commune, JSON.stringify(rep), JSON.stringify(contact), t, robot ? 1 : 0, notes).run();

  if (!robot && !adresseDeTest(contact.email)) ctx.waitUntil(alerter(env, request, ref, rep, contact).catch((e) => console.log('alerte lead', e && e.message)));
  return json(201, { reference: ref });
}

async function alerter(env, request, ref, rep, c) {
  if (!mailPossible(env)) return;
  const nom = [c.prenom, c.nom].filter(Boolean).join(' ');
  const typeLib = { appartement: 'Appartement', maison: 'Maison' }[rep.type] || ({ immeuble: 'Immeuble', commerce: 'Local ou commerce', terrain: 'Terrain' }[rep.autre_type] || 'Autre');
  const lignes = [
    ['Contact', nom], ['Téléphone', c.telephone || '(non donné)'], ['E-mail', c.email],
    ['Bien', [typeLib, rep.commune, rep.surface ? rep.surface + ' m²' : '', rep.pieces_libelle].filter(Boolean).join(' · ')],
    ['Projet', rep.delai_libelle], ['Déjà en agence', rep.deja_en_agence ? 'oui (second avis)' : 'non'],
    ['Rappel souhaité', rep.creneau], ['Message', rep.message], ['Fourchette', 'aucune (formulaire « être rappelé ») : rappel promis au plus vite'],
  ].filter(([, v]) => v);
  if (rep.bien) {
    // demande de visite : le bien demandé en tête, pas de ligne « fourchette » ni « déjà en agence »
    lignes.splice(3, lignes.length - 3, ['Bien demandé', `Réf. ${rep.bien.ref}${rep.bien.titre ? ' — ' + rep.bien.titre : ''}`],
      ['Fiche', rep.bien.url], ['Disponibilités', rep.creneau], ['Message', rep.message]);
    for (let i = lignes.length - 1; i >= 0; i--) if (!lignes[i][1]) lignes.splice(i, 1);
  }
  const admin = new URL('/admin/?q=' + encodeURIComponent(ref), request.url).toString();
  const boutons = (c.telephone ? bouton('tel:' + c.telephone.replace(/[^\d+]/g, ''), 'Appeler ' + c.prenom, true) : '')
    + bouton('mailto:' + c.email + '?subject=' + encodeURIComponent('Votre demande d\'estimation ' + ref), 'Répondre', !c.telephone);
  const html = gabarit(`${rep.commune} — ${nom}`, `
<tr><td style="padding:4px 24px 12px;">${boutons}</td></tr>
<tr><td style="padding:0 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45;">
${lignes.map(([k, v]) => `<tr><td style="padding:7px 12px 7px 0;color:#6B655C;border-bottom:1px solid #ECE8E0;vertical-align:top;width:38%;">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #ECE8E0;">${esc(v)}</td></tr>`).join('')}
</table></td></tr>
<tr><td style="padding:12px 24px 8px;font-size:13px;color:#6B655C;">Référence ${esc(ref)} · <a href="${esc(admin)}" style="color:#8A6614;">ouvrir la demande dans l'espace agence</a></td></tr>`);
  const text = `Nouvelle demande de rappel ${ref}\n\n${lignes.map(([k, v]) => `${k} : ${v}`).join('\n')}\n\nAdmin : ${admin}`;
  for (const to of destinatairesAlerte(env)) {
    const subject = rep.bien
      ? `Visite réf. ${rep.bien.ref} (${rep.commune}) — ${nom}${c.telephone ? ' — ' + c.telephone : ''}`
      : `Estimation ${rep.commune} — ${nom}${c.telephone ? ' — ' + c.telephone : ''} (à rappeler)`;
    await envoyer(env, { to, subject, text, html, replyTo: c.email });
  }
}
