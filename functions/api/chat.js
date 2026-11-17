import { listePrivee } from '../_lib/exclusions-privees.js';

/* /api/chat — l'assistant du site, visible en bas à droite de shawez-immo.com.

   Widget (/assets/chat/chat.js) → cette fonction → Claude (clé ANTHROPIC_API_KEY) → réponse + qualification.

   Même base D1 que l'espace estimation (binding DB) : la conversation est enregistrée dans chat_fil,
   l'état de la qualification dans chat_sessions, et le coût du jour dans leads_couts, comme /api/lead-tri.

   Entrée  (POST JSON) : { "session": "<32 car.>", "message": "...", "page": "/estimer/" }
   Sortie  (JSON)      : { "reponse": "...", "fin": false, "whatsapp": null|"07 67 57 92 28" }

   Règles de Shawez appliquées ici, et contrôlées après la réponse du modèle :
   - vouvoiement avec le prénom ; jamais « Bonjour » à chaque message d'une conversation déjà commencée ;
   - « offert », jamais « gratuit » ; « agent immobilier », jamais « mandataire » ;
   - aucun prix, aucune surface, aucune adresse inventés ; jamais le nom d'un client ;
   - l'IA n'est mentionnée que dans la mention légale courte du tout premier message, jamais ensuite ;
   - pas de parenthèses ;
   - règle 9 : certaines personnes ne reçoivent jamais de réponse automatique.

   Le WhatsApp de Shawez n'est donné qu'à un contact sérieux : projet clair, secteur, et budget ou échéance,
   ou une vraie question de prix, de travaux ou de financement. Les curieux sont servis jusqu'au bout sans le déranger.

   POST uniquement : aucun essai public ne peut appeler le modèle en dehors des gardes et plafonds.
*/

import { json, corps, texte, limiter, ip, maintenant, verifierOrigine, Erreur } from '../_lib/base.js';
import { envoyer, destinatairesAlerte, gabarit, paragraphe, esc, mailPossible } from '../_lib/mail.js';

const MODELE = 'claude-sonnet-5-5';
const WHATSAPP = '07 67 57 92 28';
const PLAFOND_JOUR_USD = 0.5;
const PRIX_ENTREE = 2 / 1e6, PRIX_SORTIE = 10 / 1e6;
const MAX_TOURS = 30;                       // au-delà, l'assistant renvoie vers le formulaire et s'arrête
const FIL_GARDE = 12;                       // nombre de messages d'historique envoyés au modèle

// Vocabulaire interdit dans un texte qui part au visiteur.
const INTERDITS = /\b(mandataire|gratuit|gratuite|gratuitement|ia|robot|intelligence artificielle|claude|chatgpt|openai|anthropic)\b/i;
// Métadiscours : le modèle explique ce qu'il fait au lieu de parler au visiteur.
const META = /\b(le visiteur|la personne (semble|demande|veut)|consignes?|historique|qualification|json|r[eè]gles? absolues?)\b/i;
// Règle 9 : personnes à qui on ne répond jamais automatiquement.


const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const regle9 = (noms, ...champs) => {
  const t = sansAccents(champs.join(' '));
  return noms.some((n) => new RegExp(`\\b${n}\\b`).test(t));
};

const jourParis = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(d);

const MENTION = "Je suis l'assistant du site de Shawez Ali, je réponds à sa place en dehors de ses rendez-vous.";

const CONSIGNES = `Tu es l'assistant du site de Shawez Ali, agent immobilier chez Gravelin Immo, 30 rue Bannelier à Dijon.
Tu parles à un visiteur du site, en son nom à lui, comme un collaborateur de l'agence le ferait.

Réponds UNIQUEMENT par un objet JSON valide, sans rien autour :
{"reponse":"le message au visiteur","intention":"vendre|acheter|louer|autre|inconnu","secteur":"commune ou quartier, sinon vide",
"budget":"ce que la personne a dit, sinon vide","echeance":"ce que la personne a dit, sinon vide",
"serieux":true|false,"raison":"une ligne pour Shawez"}

Comment tu écris :
- Vouvoiement, avec le prénom dès que tu le connais. Phrases courtes, ton naturel et humain, jamais commercial.
- Une seule question à la fois. Tu ne récites pas une liste de questions.
- Tu ne dis « Bonjour » qu'au tout premier message. Ensuite tu enchaînes.
- Jamais de parenthèses. Jamais de formule administrative.
- Tu écris « offert », jamais « gratuit ». « Agent immobilier », jamais « mandataire ».
- Tu ne parles jamais d'intelligence artificielle, de robot ni d'automatisation. La mention légale du premier message est déjà ajoutée, ne la répète pas.
- Tu n'inventes jamais un prix, une surface, un quartier, une caractéristique, une disponibilité ni une adresse. Si tu ne sais pas, tu le dis et tu proposes que Shawez réponde lui-même.
- Tu ne donnes jamais le nom d'un client ni l'adresse exacte d'un bien.
- Tu ne promets jamais un rendez-vous à une heure précise. Shawez confirme lui-même après avoir regardé son agenda. Les rendez-vous se font du lundi au vendredi.

Ce que tu cherches à savoir, dans cet ordre, sans brusquer :
1. Ce que la personne veut faire : vendre, acheter ou louer.
2. Le secteur : la commune, ou le quartier à Dijon.
3. Le budget si elle achète, ou ce qu'elle attend de son bien si elle vend.
4. Quand : son échéance.

Tu mets "serieux":true seulement quand le projet est clair ET que tu as le secteur ET le budget ou l'échéance,
ou quand la personne pose une vraie question de prix, de travaux ou de financement sur un projet réel.
Une personne qui regarde par curiosité, qui cherche un emploi, qui démarche ou qui pose une question générale reste "serieux":false :
tu lui réponds complètement et gentiment, mais tu ne la fais pas remonter.

Ce que tu peux proposer : l'estimation offerte et sans engagement sur shawez-immo.com/estimer/,
le simulateur de prêt sur shawez-immo.com/simulateur-pret-immobilier-dijon/,
les biens à vendre sur shawez-immo.com/biens-a-vendre-dijon/.
Shawez parle français, anglais, hindi, ourdou, pendjabi, persan, grec et arabe : réponds dans la langue du visiteur.`;

async function base(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS chat_fil (id INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT, sens TEXT, texte TEXT, cree TEXT)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS chat_fil_session ON chat_fil (session, id)').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_sessions (session TEXT PRIMARY KEY, prenom TEXT, intention TEXT,
    secteur TEXT, budget TEXT, echeance TEXT, serieux INTEGER NOT NULL DEFAULT 0, notifie INTEGER NOT NULL DEFAULT 0,
    page TEXT, cree TEXT, maj TEXT)`).run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS leads_couts (jour TEXT, id TEXT, cout REAL, essai INTEGER, cree TEXT)').run();
  return env.DB;
}

async function depenseDuJour(db, jour) {
  const r = await db.prepare('SELECT COALESCE(SUM(cout), 0) AS c FROM leads_couts WHERE jour = ?1').bind(jour).first().catch(() => null);
  return (r && r.c) || 0;
}

async function appelClaude(env, fil, message, etat, correction) {
  const historique = fil.length
    ? 'Conversation, du plus ancien au plus récent :\n' + fil.map((m) => (m.sens === 'out' ? 'Assistant : ' : 'Visiteur : ') + m.texte).join('\n') + '\n\n'
    : '';
  const connu = [etat.prenom && `Prénom : ${etat.prenom}`, etat.intention && `Intention : ${etat.intention}`,
    etat.secteur && `Secteur : ${etat.secteur}`, etat.budget && `Budget : ${etat.budget}`,
    etat.echeance && `Échéance : ${etat.echeance}`].filter(Boolean).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.CLAUDE_MODELE_CHAT || MODELE,
      max_tokens: 700,
      system: CONSIGNES,
      messages: [{
        role: 'user',
        content: `${historique}${connu ? `Ce que tu sais déjà :\n${connu}\n\n` : ''}${etat.page ? `Page où se trouve le visiteur : ${etat.page}\n` : ''}Nouveau message du visiteur : ${message}${correction ? `\n\nTa réponse précédente a été refusée : ${correction}. Réécris-la entièrement en corrigeant ce point, sans rien inventer.` : ''}`,
      }],
    }),
  });
  if (!r.ok) throw new Error('claude ' + r.status);
  const d = await r.json();
  const brut = (d.content || []).map((c) => c.text || '').join('').trim();
  const cout = (d.usage ? d.usage.input_tokens * PRIX_ENTREE + d.usage.output_tokens * PRIX_SORTIE : 0);
  const m = brut.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('reponse illisible');
  return { ...JSON.parse(m[0]), cout };
}

// Contrôle du texte avant envoi. Renvoie la raison du refus, ou null.
function controle(t, premier) {
  if (!t || t.length < 2) return 'message vide';
  if (META.test(t)) return 'le message explique ton raisonnement au lieu de parler au visiteur';
  if (/[()]/.test(t)) return 'le message contient des parenthèses';
  const sansMention = premier ? t.replace(MENTION, '') : t;
  if (INTERDITS.test(sansMention)) return 'le message contient un mot interdit, par exemple gratuit, mandataire ou une mention d\'intelligence artificielle';
  if (/\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/.test(t)) return 'le message donne un numéro de téléphone, ce n\'est pas à toi de le faire';
  return null;
}

const secours = (prenom) => `${prenom ? prenom + ', je' : 'Je'} préfère laisser Shawez vous répondre lui-même sur ce point. `
  + `Dites-moi votre projet en deux mots et il vous rappelle. Vous pouvez aussi demander votre estimation offerte sur shawez-immo.com/estimer/.`;

async function prevenir(env, etat, fil) {
  if (!mailPossible(env)) return;
  const lignes = [etat.prenom && `Prénom : ${etat.prenom}`, `Projet : ${etat.intention || 'à préciser'}`,
    etat.secteur && `Secteur : ${etat.secteur}`, etat.budget && `Budget : ${etat.budget}`,
    etat.echeance && `Échéance : ${etat.echeance}`, etat.page && `Page : ${etat.page}`].filter(Boolean);
  const conv = fil.slice(-10).map((m) => `${m.sens === 'out' ? 'Assistant' : 'Visiteur'} : ${esc(m.texte)}`).join('<br>');
  const courrier = {
    subject: `Contact sérieux sur le site${etat.secteur ? ' — ' + etat.secteur : ''}`,
    html: gabarit('Un contact sérieux vient de se qualifier sur le site', [
      paragraphe(lignes.map(esc).join('<br>')),
      paragraphe(`<b>La conversation</b><br>${conv}`),
    ], 'https://shawez-immo.com'),
  };
  // envoyer attend une seule adresse et construit la liste propre à son transport.
  for (const to of destinatairesAlerte(env)) {
    await envoyer(env, { ...courrier, to }, { origine: 'chat' }).catch(() => {});
  }
}

export async function onRequestGet() {
  return json(405, { erreur: 'methode' }, { Allow: 'POST' });
}

export async function onRequestPost(contexte) {
  try {
    return await traiterMessage(contexte);
  } catch (e) {
    if (e instanceof Erreur) {
      const erreur = { erreur: e.code };
      if (typeof e.extra?.champ === 'string') erreur.champ = e.extra.champ;
      // Un plafond ne déclenche pas de réponse de secours avant le contrôle des exclusions.
      if (e.status === 429) Object.assign(erreur, { reponse: '', fin: true });
      return json(e.status, erreur);
    }
    console.log('chat', 'erreur_interne');
    return json(500, { erreur: 'serveur', reponse: '', fin: true });
  }
}

async function traiterMessage({ request, env }) {
  // Ces gardes réussissent sans valeur et lèvent Erreur en cas de refus.
  verifierOrigine(request);
  let nomsExclus;
  try { nomsExclus = listePrivee(env, 'REGLE9_CHAT_NOMS', { motifs: true }); }
  catch { return json(503, { erreur: 'configuration_exclusions', reponse: '', fin: true }); }
  const c = await corps(request, 8000);
  const session = texte(c.session, 64, { requis: true, nom: 'session' }).replace(/[^A-Za-z0-9_-]/g, '');
  const message = texte(c.message, 2000, { requis: true, nom: 'message' });
  const page = texte(c.page, 200);
  if (session.length < 16) return json(400, { erreur: 'session' });

  // Garde-fous : par visiteur et par adresse, avant tout appel au modèle.
  const adresse = ip(request);
  await limiter(env, `chat:s:${session}`, 40, 3600);
  await limiter(env, `chat:ip:${adresse}`, 80, 3600);

  const db = await base(env);
  const etat = (await db.prepare('SELECT * FROM chat_sessions WHERE session = ?1').bind(session).first().catch(() => null))
    || { session, prenom: '', intention: '', secteur: '', budget: '', echeance: '', serieux: 0, notifie: 0, page };
  const fil = (await db.prepare('SELECT sens, texte FROM chat_fil WHERE session = ?1 ORDER BY id DESC LIMIT ?2')
    .bind(session, FIL_GARDE).all().catch(() => ({ results: [] }))).results.reverse();
  const premier = fil.length === 0;

  await db.prepare('INSERT INTO chat_fil (session, sens, texte, cree) VALUES (?1, ?2, ?3, ?4)')
    .bind(session, 'in', message, maintenant()).run().catch(() => {});

  // Règle 9 : on ne répond pas automatiquement, et on ne garde rien de plus.
  if (regle9(nomsExclus, message, etat.prenom || '')) {
    return json(200, { reponse: '', fin: true });
  }
  if (fil.length >= MAX_TOURS) {
    return json(200, { reponse: `On a bien avancé. Le plus simple maintenant, c'est que Shawez vous réponde lui-même : demandez votre estimation offerte sur shawez-immo.com/estimer/.`, fin: true });
  }

  const jour = jourParis();
  if (await depenseDuJour(db, jour) >= PLAFOND_JOUR_USD) {
    const t = secours(etat.prenom);
    await db.prepare('INSERT INTO chat_fil (session, sens, texte, cree) VALUES (?1, ?2, ?3, ?4)').bind(session, 'out', t, maintenant()).run().catch(() => {});
    return json(200, { reponse: t, fin: false, whatsapp: null });
  }

  let r = null, refus = null;
  try {
    r = await appelClaude(env, fil, message, { ...etat, page: page || etat.page }, null);
    refus = controle(r.reponse, premier);
    if (refus) { const r2 = await appelClaude(env, fil, message, { ...etat, page: page || etat.page }, refus); const f2 = controle(r2.reponse, premier); if (!f2) { r = { ...r2, cout: r.cout + r2.cout }; refus = null; } else { r.cout += r2.cout; } }
  } catch (e) {
    console.log('chat', 'modele_indisponible');
  }

  await db.prepare('INSERT INTO leads_couts VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(jour, `chat:${session}:${Date.now()}`, (r && r.cout) || 0, 0, maintenant()).run().catch(() => {});

  let reponse = r && !refus ? String(r.reponse).trim() : secours(etat.prenom);
  if (premier) reponse = `${reponse}\n\n${MENTION}`;

  // Mise à jour de ce qu'on sait, sans jamais effacer une information déjà obtenue.
  const garde = (ancien, nouveau) => (String(nouveau || '').trim() || ancien || '');
  const suite = {
    prenom: garde(etat.prenom, r && r.prenom),
    intention: garde(etat.intention, r && r.intention && r.intention !== 'inconnu' ? r.intention : ''),
    secteur: garde(etat.secteur, r && r.secteur),
    budget: garde(etat.budget, r && r.budget),
    echeance: garde(etat.echeance, r && r.echeance),
    serieux: (r && r.serieux) || etat.serieux ? 1 : 0,
  };
  const aPrevenir = suite.serieux && !etat.notifie;
  await db.prepare(`INSERT INTO chat_sessions (session, prenom, intention, secteur, budget, echeance, serieux, notifie, page, cree, maj)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
    ON CONFLICT(session) DO UPDATE SET prenom = ?2, intention = ?3, secteur = ?4, budget = ?5, echeance = ?6,
      serieux = ?7, notifie = ?8, maj = ?10`)
    .bind(session, suite.prenom, suite.intention, suite.secteur, suite.budget, suite.echeance, suite.serieux,
      aPrevenir ? 1 : etat.notifie, page || etat.page || '', maintenant()).run().catch(() => {});

  await db.prepare('INSERT INTO chat_fil (session, sens, texte, cree) VALUES (?1, ?2, ?3, ?4)')
    .bind(session, 'out', reponse, maintenant()).run().catch(() => {});

  if (aPrevenir) await prevenir(env, { ...suite, page: page || etat.page }, fil.concat([{ sens: 'in', texte: message }, { sens: 'out', texte: reponse }]));

  return json(200, { reponse, fin: false, whatsapp: suite.serieux ? WHATSAPP : null });
}
