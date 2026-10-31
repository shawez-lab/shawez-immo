/* /api/manychat-dm — DM Instagram personnalisé quand quelqu'un commente une vidéo d'un bien (étape 1 du
   cahier des charges API Claude).

   ManyChat (requête externe, POST JSON) → cette fonction → Claude (API, clé dans le secret ANTHROPIC_API_KEY)
   → réponse au format « Dynamic Block v2 » de ManyChat : un message de 4 lignes + 3 boutons
   (Dossier du bien, Estimer mon bien, Calculer mon prêt).

   Entrée (JSON) : { "first_name": "...", "comment": "...", "post": "<id ou lien du Reel>" }
   Accès : en-tête  X-Boss-Token  =  secret MANYCHAT_TOKEN (Cloudflare). Sans lui : 401.
   GET /api/manychat-dm?test=1 avec le même en-tête → essai complet sur le T3 de Chevigny, rien n'est envoyé à personne.

   Le registre vidéo → bien est le fichier /videos-biens.json (public, aucune donnée sensible : jamais d'adresse
   exacte, jamais de nom de vendeur). Les données d'un bien viennent de annonces.json (prix, surface, pièces,
   commune, DPE) ou, pour un bien sans annonce publique, de l'entrée « manuel » du registre.
   Si rien n'est reconnu, ou si Claude ne répond pas, un message simple et honnête part quand même.
*/

const MODELE = 'claude-sonnet-5-5';
const ESTIMER = 'https://shawez-immo.com/estimer/';
const PRET = 'https://shawez-immo.com/simulateur-pret-immobilier-dijon/';
const BIENS = 'https://shawez-immo.com/biens-a-vendre-dijon/';
const WHATSAPP = '07 67 57 92 28';
const PLAFOND_JOUR_USD = 0.5;              // au-delà : message de secours, aucun appel à Claude
const PRIX_ENTREE = 2 / 1e6, PRIX_SORTIE = 10 / 1e6;   // Sonnet 5.5 : 2 $ / 10 $ par million de jetons (entrée / sortie), pour le plafond
// Mode test : tant que DM_MODE n'est pas « live » (variable Cloudflare), seuls ces comptes reçoivent un DM.
const COMPTES_TEST = ['gravelin_immo', 'shawez_immo'];
// Règle 9 du Cerveau : comptes Instagram à qui on n'écrit jamais (en minuscules, sans @).
const JAMAIS_BASE = ['xvbabar21'];
// Liste complétable sans code : variable Cloudflare JAMAIS_IG = « compte1,compte2 » (minuscules, sans @).
const jamais = (env, cpt) => JAMAIS_BASE.concat(String(env.JAMAIS_IG || '').toLowerCase().split(/[\s,;]+/).filter(Boolean).map(x => x.replace(/^@/, ''))).includes(cpt);
const STOP = /^\s*(stop|arr[eê]te[rz]?|d[ée]sinscri|ne m'[ée]cri(s|vez) plus)/i;
// WhatsApp par ManyChat (numéro de Shawez en coexistence). Vide = pas en service : aucune réponse automatique sur WhatsApp.
// À la mise en service, date ISO : seuls les contacts créés APRÈS cette date sont servis ; les conversations d'avant restent à Shawez.
const WA_EN_SERVICE_DEPUIS = '';
// Numéros jamais servis automatiquement (9 derniers chiffres) : règle 9, famille et proches, Marion, l'agence.
// Complétable sans code : variable Cloudflare WA_BLOQUES = « 0612345678,0687654321 ».
const WA_BLOQUES_BASE = [];
// Métadiscours : la sortie explique le raisonnement ou cite les consignes au lieu d'être le seul message au contact
const META = /\b((le client|la cliente|le contact|la personne) (r[eé]p[eè]te|demande|[eé]crit|veut|parle|dit|semble|propose|relance)|consignes?|historique|hors_sujet|r[eè]gles? absolues?|pas de « ?salut|on ne redit|ne pas redire|d[ée]j[àa] en pleine conversation|je r[ée]ponds donc|voici (le|mon) message|message (au|pour le) (client|contact)|type ?:|pr[ée]nom ?:)/i;
// Instagram ne transmet pas à ManyChat le texte d'un commentaire (ni l'identifiant du Reel) : le flux « tous les Reels »
// envoie ce texte fixe. Claude ne doit alors rien deviner du commentaire (ni compliment, ni question).
const COMMENTAIRE_INCONNU = /^\s*demande d.informations sur un reel\s*$/i;
// Défi « Seul 1 % arrive à mettre pause » (vidéo skate de Shawez, 28/10/2026) : la vidéo promet l'estimation offerte à qui envoie
// en message privé la capture de la bonne image. Instagram transmet une image seule sous forme de lien lookaside signé.
const IMAGE_SEULE = /^\s*https:\/\/lookaside\.fbsbx\.com\/ig_messaging_cdn\/\S*\s*$/i;
const DEFI_PAUSE = { depuis: '2026-10-28', jusqu_au: '2026-12-31' };
const MOTS_DEFI = /pause|capture|screen|je l.?ai eu|j.?ai r[ée]ussi|\b1 ?%|d[ée]fi|skate/i;
const DONNEES_DEFI = 'Défi pause : la vidéo du skate de Shawez dit « Seul 1 % arrive à mettre pause pile au bon moment » et promet l’estimation offerte à qui envoie en message privé la capture de la bonne image.';
// Une ligne du journal ne compte comme « réponse déjà envoyée » que si un message est vraiment parti
// (hors sujet et refus : rien n'est parti, la personne doit pouvoir être servie au message suivant).
const ENVOYE = "origine NOT IN ('hors_creneau','hors_sujet') AND origine NOT LIKE 'refus_%' AND origine NOT LIKE 'muet_%'";
// Prénom ManyChat qui n'en est pas un (compte d'entreprise « Les Suites… », « La Maison… ») : on n'écrit pas « Salut Les »
const PAS_UN_PRENOM = /^(les|la|le|l'|des|du|de|un|une|the|mon|ma|agence|immo|studio|domaine|restaurant|boutique|maison|sas|sarl)$/i;
const INTERDITS = /\b(mandataire|gratuit|gratuite|gratuitement|ia|robot|automatique|automatiquement|claude|chatgpt|intelligence artificielle)\b/i;

const json = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function egal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || !a.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const propre = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

function idReel(post) {
  const s = String(post || '');
  const m = s.match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : s.trim();
}

async function lireJson(env, request, chemin) {
  const r = await env.ASSETS.fetch(new URL(chemin, request.url));
  if (!r.ok) throw new Error(`${chemin} ${r.status}`);
  return r.json();
}

// Fiche du bien sur shawez-immo.com : /biens/<ref>-<type>-<commune>/ (même règle que outils/biens/commun.py, chemin_fiche).
const slug = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function ficheUrl(ref, a) {
  const bout = [slug(ref), slug(a.type || 'bien'), slug(a.commune)].filter(Boolean).join('-');
  return `https://shawez-immo.com/biens/${bout}/`;
}

function ficheDepuisAnnonce(ref, a) {
  const c = a.caracteristiques || {};
  return {
    ref,
    // Nature du bien d'abord (« Château », « Maison »), puis la composition : Claude et le message de secours savent de quoi on parle
    type: propre([a.type, a.compo_agence].filter(Boolean).join(' - '), 80),
    commune: propre(a.commune, 60),
    prix: propre(c.prix_honoraires_inclus || c.prix_vente || '', 30),
    pieces: propre(c.nbpiecees, 5),
    chambres: propre(c.nbchambres, 5),
    surface: propre(c.surf_carrez, 20),
    exterieur: [c.balcon === 'OUI' && 'balcon', c.terrasse === 'OUI' && 'terrasse', c.nb_garage && 'garage', c.nb_parking && 'parking']
      .filter(Boolean).join(', '),
    dpe: propre(a.dpe, 5),
    atouts: propre(a.description_expurgee, 400),
    lien: a.type && a.commune ? ficheUrl(ref, a) : BIENS,
  };
}

// Mots-clés des vidéos (« Commente CHÂTEAU ») : registre motscles de /videos-biens.json, sans accents, en minuscules.
// Sert quand le Reel n'est pas dans le registre (Trial Reels, nouvelles versions) : le mot du commentaire dit le bien.
const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Budget annoncé par la personne (« vous avez la même chose à moins de 600 000 € ? », 31/10/2026).
// Sans ça, le worker n'avait aucun bien à proposer et répondait en demandant ce qu'elle cherchait,
// alors que le catalogue contient la réponse. Il faut une tournure de budget explicite : un simple
// prix cité dans une phrase ne déclenche rien.
const CUE_BUDGET = /\b(moins de|en dessous|au dessous|sous|maxi|maximum|max|budget|jusqu|pas plus de|abordable)\b/i;
function budgetDuTexte(texte) {
  const t = sansAccents(texte).replace(/[  ]/g, ' ');
  if (!CUE_BUDGET.test(t)) return 0;
  let max = 0;
  for (const m of t.matchAll(/(\d[\d\s.]{0,12}\d|\d)\s*(k\b|€|euros?\b)?/g)) {
    let n = parseInt(String(m[1]).replace(/[\s.]/g, ''), 10);
    if (!Number.isFinite(n)) continue;
    if (/^k/i.test(m[2] || '')) n *= 1000;
    if (n >= 20000 && n <= 5000000 && n > max) max = n;
  }
  return max;
}

// Le bien le plus cher qui tient dans le budget, plus un second cité en une ligne. Jamais un bien
// qui n'est plus « en vente » : sous offre et sous compromis sont écartés.
async function biensPourBudget(env, request, texte) {
  const budget = budgetDuTexte(texte);
  if (!budget) return null;
  let data = {};
  try { data = await lireJson(env, request, '/annonces.json'); } catch (e) { return null; }
  const liste = Object.entries(data.annonces || {})
    .map(([ref, a]) => ({ ref, a, prix: Number(a.prix) || 0 }))
    .filter(x => x.a && x.a.status === 'en vente' && x.prix > 0 && x.prix <= budget)
    .sort((x, y) => y.prix - x.prix);
  if (!liste.length) return null;
  const bien = ficheDepuisAnnonce(liste[0].ref, liste[0].a);
  const second = liste[1];
  if (second) {
    const c = second.a.caracteristiques || {};
    const prix = c.prix_honoraires_inclus || c.prix_vente || '';
    bien.autre_bien_sous_ce_budget = propre([second.a.type, second.a.commune && `à ${second.a.commune}`, prix].filter(Boolean).join(' '), 120);
  }
  return bien;
}

async function motCle(env, request, texte) {
  let registre = {};
  try { registre = await lireJson(env, request, '/videos-biens.json'); } catch (e) { return ''; }
  const t = ` ${sansAccents(texte).replace(/[^a-z0-9]+/g, ' ')} `;
  for (const k of Object.keys(registre.motscles || {})) {
    if (t.includes(` ${sansAccents(k)} `)) return `mot:${sansAccents(k)}`;
  }
  return '';
}

// Trial Reels en cours (« Commente LOFT ») : Instagram ne transmet ni le texte du commentaire ni la vidéo,
// alors on cite les biens des vidéos du moment pour que la personne dise lequel en un mot.
async function videosDuMoment(env, request, jour) {
  try {
    const registre = await lireJson(env, request, '/videos-biens.json');
    // Biens en cours ce jour-là, les plus récents d'abord, 4 au plus pour que la question reste courte
    const biens = (registre.en_essai || []).filter(e => (!e.depuis || e.depuis <= jour) && (!e.jusqu_au || e.jusqu_au >= jour))
      .sort((a, b) => String(b.depuis || '').localeCompare(String(a.depuis || ''))).slice(0, 4)
      .map(e => `- ${e.libelle} : mot « ${e.mot} »`);
    // Le commentaire peut aussi venir de la vidéo skate du défi pause (le texte et le Reel ne sont pas transmis)
    if (jour >= DEFI_PAUSE.depuis && jour <= DEFI_PAUSE.jusqu_au) biens.push('- la vidéo skate « mets pause au bon moment », pas un bien : la capture envoyée en privé donne droit à l’estimation offerte');
    return biens.join('\n');
  } catch (e) { return ''; }
}

async function trouverBien(env, request, post) {
  const id = idReel(post);
  let registre = {};
  try { registre = await lireJson(env, request, '/videos-biens.json'); } catch (e) { console.log('registre', e.message); }
  const entree = /^mot:/.test(id)
    ? Object.entries(registre.motscles || {}).find(([k]) => `mot:${sansAccents(k)}` === id)?.[1]
    : (registre.videos || {})[id];
  if (!entree) return null;
  // Vidéo en anglais (« langue »: « en » dans le registre) : Claude répond en anglais, boutons en anglais
  const langue = entree.langue === 'en' ? { langue: 'anglais, la vidéo est en anglais' } : {};
  if (entree.manuel) return { ...entree.manuel, ...langue, lien: entree.manuel.lien || BIENS };
  try {
    const d = await lireJson(env, request, '/annonces.json');
    const a = (d.annonces || {})[entree.ref];
    return a ? { ...ficheDepuisAnnonce(entree.ref, a), ...langue } : null;
  } catch (e) { console.log('annonces', e.message); return null; }
}

const CONSIGNES = `Tu écris, au nom de Shawez Ali, agent immobilier chez Gravelin Immo à Dijon, un message privé Instagram
à une personne qui vient de commenter la vidéo d'un bien, de répondre à une story ou d'écrire un message privé (le « Type » le précise).
D'ABORD, vérifie que le message parle d'immobilier : acheter, vendre, estimer, louer, visiter, un bien, un prix, un fonds de commerce, un prêt,
ou que c'est la capture du « défi pause » quand les données en parlent.
Si ce n'est pas le cas (conversation personnelle ou amicale, paiement, virement, sponsoring, partenariat, matériel, rendez-vous déjà en cours,
remerciement, message qui répond visiblement à une conversation précédente avec Shawez), réponds exactement HORS_SUJET et rien d'autre.
Si un historique est fourni et qu'il parle d'immobilier, un message court comme « oui », « merci », une disponibilité ou une question
de suite fait partie de la conversation immobilière : ce n'est PAS hors sujet, poursuis-la vers le résultat (visite, appel, estimation).
Juge le DERNIER message : s'il se rattache à l'échange immobilier de l'historique (visite, disponibilité, prix, « oui »), réponds, même si
un message personnel est arrivé entre-temps ou s'il répète un message déjà envoyé. HORS_SUJET seulement si le dernier message lui-même est personnel.
Dans ce cas, ne recommence pas par « Salut », écris 1 à 3 lignes courtes, 280 caractères maximum, qui répondent directement au dernier message,
sans répéter ce qui a déjà été dit. Si la personne répond « oui » à une question qui proposait un choix, pose seulement une question courte pour préciser son choix.
Ne propose jamais toi-même une heure ou un créneau précis, et ne reprends jamais une heure écrite par Shawez dans l'historique : seules les heures écrites par la personne comptent. C'est Shawez qui confirme le créneau après avoir regardé son agenda. Les rendez-vous se font du lundi au vendredi : ne propose jamais le samedi ni le dimanche.
Dès que tu écris un message, règles absolues, sauf le « Salut » de début et le nombre de lignes quand la conversation continue :
- Commence par « Salut <prénom> » (ou « Salut » si le prénom est inconnu). Exactement 3 ou 4 lignes de texte, séparées par un seul retour à la ligne, SANS ligne vide, 600 caractères maximum au total, tutoiement, ton chaleureux et naturel, 1 ou 2 emojis maximum, signé implicitement par Shawez (pas de signature).
- Commence par le prénom s'il est donné.
- Prénom inconnu mais pseudo Instagram fourni : si le pseudo commence clairement par un prénom, par exemple justin.bridoux10 → Justin
  ou emeline7435 → Emeline, utilise ce prénom avec une majuscule, sans ajouter d'accent. Si le pseudo n'est pas clairement un prénom
  (nom d'entreprise, de lieu, lettres et chiffres), écris seulement « Salut ».
- Langue : si la personne écrit en anglais, ou si les données du bien contiennent « langue : anglais », écris tout le message en anglais,
  avec le même style et les mêmes règles, en commençant par « Hi <prénom> » au lieu de « Salut ». Sinon, toujours en français.
- Si le commentaire pose une question précise (quartier, prix, surface, visite, disponibilité), réponds-y d'abord, en une phrase,
  UNIQUEMENT avec les données du bien fournies. Si la donnée n'y est pas, dis que tu lui envoies la réponse en direct.
- Cite le bien (type, commune, prix tel qu'écrit dans les données) sans jamais donner d'adresse exacte ni de nom de rue.
- Termine par UNE seule question courte qui ne demande qu'une chose : visite, appel, OU ce qu'il cherche, jamais deux demandes reliées par « et » ou « ou ».
  Exception : si la personne n'a pas de projet, dit non, remercie ou clôt la conversation, réponds en UNE phrase courte et chaleureuse, sans question et sans relancer.
- Quand la conversation continue (historique non vide), ne commence JAMAIS par « Salut », « Bonjour » ni par le prénom : réponds directement, comme dans une vraie discussion.
- Écris comme Shawez écrit sur son téléphone : phrases simples et naturelles, AUCUNE parenthèse, aucun tiret de liste, aucun deux-points d'énumération, aucune formule administrative (« honoraires à la charge du vendeur », « n'hésitez pas »). Si un détail compte, glisse-le dans une phrase normale.
- Ne jamais inventer un prix, une surface, un quartier ou une caractéristique. Jamais les mots « mandataire », « gratuit », « IA »,
  « robot », « automatique ». Dis « offert » si besoin.
- Si la personne demande des documents, des chiffres, le bilan, la comptabilité ou le chiffre d'affaires d'un fonds de commerce :
  donne d'abord les chiffres publics fournis dans les données, en expliquant simplement leur sens (par exemple la différence entre
  l'argent qui passe en caisse et le chiffre d'affaires comptable), puis dis que pour recevoir les bilans complets il suffit de
  signer l'engagement de confidentialité du bouton « Accès aux bilans » et de le renvoyer avec sa pièce d'identité, et que tu lui
  envoies les bilans tout de suite après. Ne donne jamais le résultat comptable, les salaires ni le nom ou l'adresse du commerce.
- Si les données contiennent une ligne « autre_bien_sous_ce_budget » : la personne a donné un budget et ces biens y entrent.
  Présente le bien principal en une phrase avec son prix, cite ce second bien en une phrase, puis UNE seule question pour savoir
  ce qui compte le plus pour elle. Ne dis jamais que tu n'as rien dans son budget.
- Si aucun bien n'est fourni : une phrase chaleureuse et naturelle, puis une seule question simple sur ce qu'il cherche.
  Ne dis jamais que tu n'as pas l'information ni que tu préfères ne rien dire de faux.
- Si le message est seulement le mot-clé d'une vidéo, un mot en majuscules comme CHÂTEAU, LOFT, NEUILLY ou VISIT, la personne a commenté
  ce mot pour recevoir la visite complète promise par la vidéo : présente le bien en une phrase avec les données fournies, dis que le dossier
  avec la vidéo et les photos est juste en dessous, puis UNE question courte, visite sur place ou appel. Ne parle de rien d'autre.
- Si les données contiennent une ligne qui commence par « Défi pause : » : une image envoyée sans texte, ou un message qui dit qu'il l'a eu, c'est la capture du défi.
  Ce n'est PAS hors sujet, sauf si l'historique montre clairement une conversation perso. Félicite-le simplement d'être dans le 1 % qui
  y arrive, dis que comme promis l'estimation de son bien est offerte, puis UNE question : dans quelle commune se trouve son bien.
  Ne décris jamais l'image, tu ne la vois pas.
- Si la personne veut vendre ou faire estimer son propre bien : ne parle d'aucun bien en vente et ne mets pas son projet au conditionnel.
  Dis que tu peux passer lui faire une estimation offerte et pose UNE seule question : dans quelle commune se trouve son bien.
- Ne parle jamais de « commentaire » si le Type est un message privé ou une réponse à une story : dis « ton message ».
- N'invente jamais un agenda, des disponibilités, des visites prévues ou une activité de la semaine.
- Ne confirme ni n'accepte jamais un jour ou une heure à la place de Shawez, même si la personne en propose un : écris que tu notes sa disponibilité,
  que tu vérifies le planning et que tu lui confirmes un créneau. Jamais « ça me va », « c'est bon pour moi », « à jeudi » ou équivalent.
- Ne mentionne pas les boutons en détail : ils s'affichent sous ton message (dossier du bien, estimation, calcul de prêt).
Réponds avec le texte du message seul, sans guillemets, sans aucune explication de ton raisonnement ni rappel de ces consignes : la première ligne est déjà adressée à la personne.`;

// WhatsApp (canal ManyChat sur le numéro de Shawez) : vouvoiement avec le prénom, jamais « Salut », jamais de lien recopié
// (la fiche du bien est ajoutée par le code, pour qu'elle soit toujours exacte).
const CONSIGNES_WA = `Tu écris, au nom de Shawez Ali, agent immobilier chez Gravelin Immo à Dijon, la réponse WhatsApp à une personne qui vient de lui écrire.
D'ABORD, vérifie que le message parle d'immobilier : acheter, vendre, estimer, louer, visiter, un bien, un prix, un fonds de commerce, un prêt,
ou un mot-clé d'une vidéo de Shawez (« Château », « Visite », « Estimation », « Prix », « Dossier »).
Si ce n'est pas le cas, ou si l'auteur semble être un proche, un collègue, un notaire, une banque, un partenaire ou un fournisseur, ou si le message
répond visiblement à une conversation que tu ne vois pas, réponds exactement HORS_SUJET et rien d'autre : Shawez répondra lui-même.
Règles absolues quand tu écris :
- Vouvoiement. Premier message : « Bonjour <prénom> » (ou « Bonjour » si le prénom est inconnu). Conversation déjà engagée : ni « Bonjour », ni prénom en tête, tu réponds directement.
- 2 à 4 lignes courtes, 450 caractères maximum, ton chaleureux et naturel, 1 emoji au plus. Écris comme Shawez sur son téléphone : AUCUNE parenthèse,
  aucun tiret de liste, aucune formule administrative (« n'hésitez pas », « honoraires à la charge du vendeur »).
- Un mot-clé seul (« Château ») avec un bien fourni : la personne attend ce que la vidéo a promis. Donne-le tout de suite : le bien en une phrase,
  puis dis que la fiche avec la vidéo et les photos est juste en dessous. Ne lui demande jamais ce qu'elle cherche à la place.
- Une question précise (prix, surface, quartier, visite) : réponds d'abord, en une phrase, UNIQUEMENT avec les données du bien fournies.
- Aucun bien fourni : une phrase chaleureuse, puis une seule question simple sur le bien ou la vidéo qui l'intéresse.
- Termine par UNE seule question courte qui ne demande qu'une chose, sauf si la personne remercie, dit non ou clôt : alors une phrase de politesse, sans question.
- Ne jamais inventer un prix, une surface, un quartier, une caractéristique, un agenda ou une disponibilité. Jamais d'adresse exacte, jamais de nom de rue.
  Jamais les mots « mandataire », « gratuit », « IA », « robot », « automatique » ; dis « offert » si besoin. Ne recopie aucun lien.
- Ne propose jamais d'heure ni de jour, n'accepte jamais un créneau à la place de Shawez : note sa disponibilité, Shawez confirme lui-même.
- Documents, bilans, chiffre d'affaires d'un fonds : chiffres publics fournis seulement, puis l'engagement de confidentialité à signer avec une pièce d'identité.
Réponds avec le texte du message seul, sans guillemets ni explication : la première ligne est déjà adressée à la personne.`;

async function rediger(env, prenom, commentaire, bien, source, fil = [], intention = '', videosDuMoment = '', defi = false, pseudo = '') {
  if (!env.ANTHROPIC_API_KEY) throw new Error('cle absente');
  const inconnu = COMMENTAIRE_INCONNU.test(commentaire || '');
  // Mots-clés du flux vendeur (« vendre ma », « je vends », « estimation »…) : la personne parle de SON bien
  if (intention === 'vendre') commentaire = 'texte exact non transmis par Instagram ; d’après ses mots, la personne veut vendre ou faire estimer son bien';
  else if (inconnu) commentaire = 'texte du commentaire non transmis par Instagram';
  const donneesBien = intention === 'vendre' ? 'Aucun bien en vente à présenter : la personne est peut-être vendeuse.'
    : bien
    ? Object.entries(bien).filter(([k, v]) => v && k !== 'lien' && k !== 'ref').map(([k, v]) => `${k} : ${v}`).join('\n')
    : inconnu ? (videosDuMoment ? `Bien non identifié. Vidéos du moment, avec le mot à commenter :\n${videosDuMoment}` : 'Bien non identifié.')
    : 'Bien non identifié : remercie, demande quel bien l’intéresse ou ce qu’il cherche.';
  // Capture du défi pause : la promesse de la vidéo passe avant la question générique sur le bien recherché
  const donnees = !defi ? donneesBien : bien ? `${donneesBien}\n\n${DONNEES_DEFI}` : `Aucun bien en vente à présenter.\n${DONNEES_DEFI}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.CLAUDE_MODELE_DM || MODELE,
      max_tokens: 1024,
      // Sonnet 5.5 : pas de réflexion préalable pour un DM court (doc officielle : between_tools, effort ≤ high)
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low' },
      system: source === 'whatsapp' ? CONSIGNES_WA : CONSIGNES,
      messages: [{ role: 'user', content: `${fil.length ? 'Historique récent de la conversation, du plus ancien au plus récent :\n' + fil.map(m => (m.sens === 'out' ? 'Shawez : ' : 'Client : ') + m.texte).join('\n') + '\n\n' : ''}Type : ${source === 'whatsapp' ? 'message WhatsApp' : source === 'dm' ? 'message privé direct' : /story/i.test(source || '') ? 'réponse à une story' : 'commentaire sous une vidéo'}\nPrénom : ${prenom || '(inconnu)'}${!prenom && pseudo ? `\nPseudo Instagram : ${pseudo}` : ''}\nMessage : ${commentaire || '(vide)'}\n\nDonnées du bien :\n${donnees}` }],
    }),
  });
  if (!r.ok) throw new Error(`api ${r.status} ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const texte = normaliser((d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
  const info = {
    stop_reason: d.stop_reason || null,
    blocs: (d.content || []).map(b => `${b.type}:${(b.text || b.thinking || '').length}`),
  };
  if (!texte) {
    // On garde l'usage : des jetons ont pu être facturés même sans texte
    const e = new Error(`reponse vide (${info.stop_reason}; ${info.blocs.join(',')})`);
    e.usage = d.usage || null; e.info = info;
    throw e;
  }
  return { texte, usage: d.usage || null, info };
}

// Lignes vides supprimées, espaces nettoyés : le DM fait au plus 4 lignes non vides
function creneauOuvert(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hour12: false })
    .formatToParts(d).map(x => [x.type, x.value]));
  const h = Number(p.hour);
  return !/^dim/i.test(p.weekday) && h >= 8 && h < 20;
}

// Minutes avant le prochain créneau d'envoi (lundi-samedi 8 h, Paris) : sert au « Smart Delay » de ManyChat
function minutesAvantCreneau(d = new Date()) {
  for (let m = 0; m <= 60 * 24 * 3; m += 5) {
    if (creneauOuvert(new Date(d.getTime() + m * 60000))) return Math.max(m, 5);
  }
  return 60 * 12;
}

function normaliser(t) {
  return String(t || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

function secours(prenom, bien, wa = false) {
  const p = prenom ? ` ${prenom}` : '';
  if (wa) {
    // WhatsApp : vouvoiement, pas de numéro WhatsApp à rappeler, le lien de la fiche est ajouté par blocManyChat
    if (!bien || bien.confidentialite) return `Bonjour${p}, merci pour votre message 🙂\nC'est Shawez, agent immobilier à Dijon.\nDites-moi quel bien vous intéresse, je vous réponds moi-même.`;
    const b = bien.type ? bien.type.split(' - ')[0].trim().replace(/^./, c => c.toLowerCase()) : 'bien';
    const d = /^(maison|propri|villa|long[eè]re|ferme|grange|demeure|b[aâ]tisse)/i.test(b) ? 'cette' : /^[aeiouyéèêh]/i.test(b) ? 'cet' : 'ce';
    return `Bonjour${p}, merci pour votre message 🙂\nLa fiche de ${d} ${b} à ${bien.commune}${bien.prix ? `, à ${bien.prix},` : ''} est juste en dessous, avec la vidéo et les photos.\nVous voulez le visiter ou je vous appelle ?`;
  }
  if (!bien) return `Salut${p} 👋 merci pour ton message !\nC'est Shawez, agent immobilier à Dijon.\nDis-moi quel bien t'intéresse ou ce que tu cherches, je te réponds moi-même.\nWhatsApp : ${WHATSAPP}`;
  if (bien.chiffres && bien.confidentialite) {
    return `Salut${p} 👋 le 1,8 million, c'est tout ce qui passe en caisse sur l'année, tabac, jeux et presse compris.\nLa plus grande partie repart à l'État, le chiffre d'affaires comptable tourne autour de 208 000 €.\nPour les bilans complets, signe l'engagement de confidentialité du bouton Accès aux bilans et renvoie-le avec ta pièce d'identité, je t'envoie tout dans la foulée.\nTu cherches à reprendre un commerce sur Dijon ?`;
  }
  const brut = bien.type ? bien.type.split(' - ')[0].trim() : 'bien';
  const t = brut.replace(/\b(t\d)\b/gi, m => m.toUpperCase()).replace(/^./, c => c.toLowerCase());
  const det = /^(maison|propri|villa|long[eè]re|ferme|grange|demeure|b[aâ]tisse)/i.test(t) ? 'cette' : /^[aeiouyéèêh]/i.test(t) ? 'cet' : 'ce';
  return `Salut${p} 👋 merci pour ton message !\nC'est Shawez, agent immobilier à Dijon.\nLe dossier de ${det} ${t} à ${bien.commune}${bien.prix ? `, à ${bien.prix},` : ''} est juste en dessous.\nTu veux le visiter ou je t'appelle ? WhatsApp : ${WHATSAPP}`;
}

// Contrôle du texte de Claude avant envoi : vocabulaire, montants, adresse. Renvoie la raison du refus ou null.
// Heures écrites dans un texte, normalisées : « 18 h 30 », « 18h30 », « 20h » → 1830, 2000
function heures(t) {
  return [...String(t || '').matchAll(/\b([01]?\d|2[0-3])\s?(?:h|heures?|:)\s?([0-5]\d)?\b/gi)].map(m => Number(m[1]) * 100 + Number(m[2] || 0));
}

function controle(texte, bien, suite = false, client = '') {
  if (META.test(texte)) return 'metadiscours';
  // Une heure n'est permise que si la personne l'a écrite elle-même : jamais une heure proposée par nous
  const permises = new Set(heures(client));
  if (heures(texte).some(h => !permises.has(h))) return 'horaire';
  // Rendez-vous du lundi au vendredi seulement (Cerveau) : jamais proposer le week-end si la personne n'en parle pas
  if (/\b(samedi|dimanche|week-?end)\b/i.test(texte) && !/\b(samedi|dimanche|week-?end)\b/i.test(client)) return 'jour';
  if ((texte.match(/\?/g) || []).length > 1) return 'questions';
  if (suite && texte.length > 320) return 'longueur_suite';
  if (INTERDITS.test(texte)) return 'vocabulaire';
  if (/[()]/.test(texte)) return 'parentheses';
  if (/\b\d{1,3}\s?,?\s?(bis|ter)?\s*(rue|avenue|bd|boulevard|place|impasse|allée|chemin|route)\b/i.test(texte)) return 'adresse';
  if (/\b(rue|avenue|boulevard|impasse|allée)\s+[A-ZÉ]/.test(texte)) return 'adresse';
  const chiffres = v => String(v || '').replace(/\D/g, '');
  // Montants autorisés : tous ceux qui figurent dans les données du bien (prix, chiffres publics)
  const source = bien ? Object.values(bien).join(' ') : '';
  const permis = new Set((source.match(/\d[\d\s.,\u202f]*\s?(€|euros|k€|million)/gi) || []).map(chiffres));
  const montants = (texte.match(/\d[\d\s.,\u202f]*\s?(€|euros|k€|millions?)/gi) || []).map(chiffres);
  for (const m of montants) if (!m || !(permis.has(m) || permis.has(m.replace(/000$/, '')) || [...permis].some(p => p === m + '000'))) return 'montant';
  if (texte.length > 640) return 'longueur';
  if (texte.split('\n').filter(l => l.trim()).length > 4) return 'lignes';
  return null;
}

// Message qui ne fait que remercier, dire non ou clore (« Merci, bonne journée », « Non pas pour l'instant ») : pas de nouvelle question
const FORMULES_CLOTURE = ['pas pour l instant', 'pas pour le moment', 'pas maintenant', 'bonne fin de journee', 'bonne journee', 'bonne soiree',
  'bon week end', 'bon weekend', 'du retour', 'pour ta reponse', 'pour votre reponse', 'pour l info', 'pour l information', 'a toi aussi', 'a vous aussi',
  'toi aussi', 'vous aussi', 'a bientot', 'avec plaisir', 'ca marche', 'merci beaucoup', 'merci bien', 'cordialement', 'pareillement', 'merci', 'beaucoup',
  'non', 'ok', 'okay', 'oki', 'd accord', 'daccord', 'super', 'parfait', 'top', 'cool', 'genial', 'a toi', 'a vous', 'bien', 'aussi', 'et', 'encore', 'de meme'];
function estCloture(t) {
  let x = String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!x) return /\S/.test(String(t || ''));   // seulement des emojis / ponctuation
  for (const f of FORMULES_CLOTURE) x = x.replace(new RegExp('\\b' + f + '\\b', 'g'), ' ');
  return !x.replace(/\s+/g, '');
}
const CLOTURES = ['Avec plaisir, belle journée à toi 😊', 'Merci à toi, à bientôt 🙂', 'Pas de souci, belle journée à toi 😊', 'Avec plaisir, à bientôt 🙂'];
const MENTION_IA = 'Réponse rapide de mon assistant IA, je prends le relais moi-même 🙂';
const MENTION_IA_EN = 'Quick reply from my AI assistant, I’ll take it from here myself 🙂';
// Message rédigé en anglais (vidéo anglaise, contact qui écrit en anglais) : mention et boutons en anglais
function enAnglais(t) {
  const x = ` ${String(t || '').toLowerCase().replace(/[’]/g, "'").replace(/[^a-z' ]+/g, ' ')} `;
  const en = (x.match(/ (?=(the|you|your|and|is|it|this|for|with|i'll|i|to|of|what|which|would|send|here|hi|hello|can|me|my) )/g) || []).length;
  const fr = (x.match(/ (?=(le|la|les|de|des|tu|ton|ta|et|est|pour|avec|je|un|une|que|qui|sur|salut|bonjour|te|mon|ma) )/g) || []).length;
  return en > fr;
}
// Conversation déjà engagée : pas de « Salut <prénom> » à chaque message
function sansSalut(t) {
  const l = String(t || '').split('\n');
  if (/^(salut|bonjour|hello|hi|coucou|hey)\b/i.test(l[0] || '')) {
    if (l.length > 1 && l[0].replace(/[^\p{L}]/gu, '').length <= 22) l.shift();
    else l[0] = l[0].replace(/^([Ss]alut|[Bb]onjour|[Hh]ello|[Hh]i|[Cc]oucou|[Hh]ey)\b[\s,]*([\p{Lu}][\p{L}'-]*)?[\s,!.]*(\p{Extended_Pictographic}\s*)*/u, '');
    if (l[0]) l[0] = l[0].charAt(0).toUpperCase() + l[0].slice(1);
  }
  return l.filter(Boolean).join('\n');
}

const sansMessage = (raison, extra = {}) => json(200, { message: '', fiche_url: '', envoyer: 'non', raison, ...extra });

async function journal(env) {
  if (!env.DB) return null;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS dm_instagram (
    evenement TEXT PRIMARY KEY, contact TEXT, compte TEXT, post TEXT, ref TEXT, jour TEXT,
    origine TEXT, entree INTEGER, sortie INTEGER, cout REAL, cree TEXT)`).run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS dm_stop (cle TEXT PRIMARY KEY, motif TEXT, cree TEXT)').run();
  // Fil de conversation : derniers messages reçus et envoyés par contact, pour poursuivre un échange sans le perdre
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS dm_fil (id INTEGER PRIMARY KEY AUTOINCREMENT, contact TEXT, sens TEXT, texte TEXT, cle TEXT, cree TEXT)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS dm_fil_contact ON dm_fil (contact, id)').run();
  return env.DB;
}

// Stop mémorisé : une personne qui a dit stop (par son contact ManyChat ou son compte Instagram) ne reçoit plus
// aucune réponse automatique, sur tous les flux, jusqu'à ce que Shawez retire la ligne de dm_stop.
async function estStoppe(env, contact, compte) {
  const b = await journal(env).catch(() => null);
  if (!b) return false;
  const cles = [contact && `c:${contact}`, compte && `i:${compte}`].filter(Boolean);
  if (!cles.length) return false;
  const r = await b.prepare(`SELECT 1 FROM dm_stop WHERE cle IN (${cles.map((_, i) => '?' + (i + 1)).join(',')}) LIMIT 1`).bind(...cles).first().catch(() => null);
  return !!r;
}
async function memoriserStop(env, contact, compte, motif) {
  const b = await journal(env).catch(() => null);
  if (!b) return;
  for (const cle of [contact && `c:${contact}`, compte && `i:${compte}`].filter(Boolean)) {
    await b.prepare('INSERT OR IGNORE INTO dm_stop VALUES (?1,?2,?3)').bind(cle, motif, new Date().toISOString()).run().catch(() => {});
  }
}

const jourParis = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());

function blocManyChat(texte, bien, avecBoutons = true, wa = false, en = false) {
  if (wa) {
    // WhatsApp : texte seul ; quand un bien est en jeu, la fiche est ajoutée en dernière ligne (WhatsApp en montre l'aperçu)
    const t = bien && bien.lien && avecBoutons && !texte.includes(bien.lien) ? `${texte}\n${bien.lien}` : texte;
    return { version: 'v2', content: { type: 'whatsapp', messages: [{ type: 'text', text: t.slice(0, 1000) }] },
      message: t.slice(0, 1000), fiche_url: bien && bien.lien ? bien.lien : '', bien_ref: bien ? bien.ref || '' : '' };
  }
  const boutons = en ? [
    { type: 'url', caption: '📄 See the property', url: bien && bien.lien ? bien.lien : BIENS },
    { type: 'url', caption: '🇬🇧 Guides for buyers', url: 'https://shawez-immo.com/en/guides/' },
    { type: 'url', caption: '💬 WhatsApp me', url: 'https://wa.me/33767579228' },
  ] : [
    bien && bien.lien ? { type: 'url', caption: '📄 Dossier du bien', url: bien.lien } : { type: 'url', caption: '🔑 Voir les biens à vendre', url: BIENS },
    { type: 'url', caption: '🏠 Estimer mon bien', url: ESTIMER },
    bien && bien.confidentialite
      ? { type: 'url', caption: '🔒 Accès aux bilans', url: bien.confidentialite }
      : { type: 'url', caption: '💶 Calculer mon prêt', url: PRET },
  ];
  return {
    version: 'v2',
    content: { type: 'instagram', messages: [avecBoutons ? { type: 'text', text: texte.slice(0, 640), buttons: boutons } : { type: 'text', text: texte.slice(0, 640) }] },
    // Champs à plat, pour un mappage en champs personnalisés si on préfère un bloc ManyChat classique :
    message: texte.slice(0, 640),
    fiche_url: boutons[0].url,
    bien_ref: bien ? bien.ref || '' : '',
  };
}

export async function onRequest({ request, env }) {
  try {
    if (!egal(request.headers.get('X-Boss-Token') || '', env.MANYCHAT_TOKEN || '')) return json(401, { error: 'acces' });

    let prenom, commentaire, post, contact, compte, evenement, source = '', test = false, waContactExistant = false, intention = '';
    if (request.method === 'GET') {
      const u = new URL(request.url);
      if (u.searchParams.get('diag')) {
        // Diagnostic : un appel minimal à l'API, renvoie le statut et l'erreur éventuelle (jamais la clé)
        try {
          const pd = u.searchParams.get('post');
          const bd = pd ? await trouverBien(env, request, pd) : null;
          const { texte, usage, info } = await rediger(env, 'Test', u.searchParams.get('c') || 'Bonjour', bd);
          return json(200, { ok: true, modele: env.CLAUDE_MODELE_DM || MODELE, bien: bd ? bd.ref : null, info, usage,
            longueur: texte.length, lignes: texte.split('\n').length, controle: controle(texte, bd), texte });
        } catch (e) {
          return json(200, { ok: false, modele: env.CLAUDE_MODELE_DM || MODELE, info: e.info || null, usage: e.usage || null,
            erreur: String(e.message || '').replace(/sk-[\w-]+/g, '***').slice(0, 300) });
        }
      }
      if (!u.searchParams.get('test')) return json(200, { ready: !!env.ANTHROPIC_API_KEY, mode: env.DM_MODE === 'live' ? 'live' : 'test' });
      test = true; prenom = 'Test'; commentaire = u.searchParams.get('c') || 'Il est dans quel quartier ?';
      post = u.searchParams.get('post') || 'test-chevigny'; compte = 'gravelin_immo'; contact = 'test'; evenement = `test-${Date.now()}`;
      intention = /^vend/i.test(u.searchParams.get('intention') || '') ? 'vendre' : '';
      if (intention) post = 'vendre';
    } else if (request.method === 'POST') {
      const c = await request.json().catch(() => ({}));
      if (c.action === 'garde') {
        // Garde-fou sans appel à Claude, pour les flux ManyChat non personnalisés (réponses aux stories,
        // Conversation Starters, mentions en story) : règle 9, mode test, horaires de Paris, fenêtre Instagram de 24 h.
        const cpt = propre(c.ig_username || c.username, 60).toLowerCase().replace(/^@/, '');
        const source = propre(c.source, 40);
        if (jamais(env, cpt)) return sansMessage('regle9', { source });
        const ctc = propre(c.contact_id || c.user_id, 80);
        if (STOP.test(propre(c.comment || c.commentaire, 500))) { await memoriserStop(env, ctc, cpt, 'stop'); return sansMessage('stop', { source, a_reprendre: true }); }
        if (await estStoppe(env, ctc, cpt)) return sansMessage('stop', { source, a_reprendre: true });
        if (env.DM_MODE !== 'live' && !COMPTES_TEST.includes(cpt)) return sansMessage('mode_test', { compte: cpt, source });
        // Décision de Shawez du 24/10/2026 : quand c'est le client qui écrit en premier, on répond tout de suite,
        // y compris le soir et le dimanche (au-delà de 24 h, Meta n'autorise plus la réponse automatique).
        return json(200, { envoyer: 'oui', raison: 'ok', source });
      }
      source = propre(c.source, 40);
      prenom = propre(c.first_name || c.prenom, 40);
      // « GRAVELIN » ou « gravelin » → « Gravelin »
      if (/[{}]/.test(prenom || '')) prenom = '';   // variable ManyChat non remplacée (« {{first_name}} »)
      if (prenom && (prenom === prenom.toUpperCase() || prenom === prenom.toLowerCase())) prenom = prenom.toLowerCase().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase());
      if (prenom && PAS_UN_PRENOM.test(prenom)) prenom = '';
      commentaire = propre(c.comment || c.commentaire, 500);
      intention = /^vend/i.test(propre(c.intention, 20)) ? 'vendre' : '';
      post = propre(c.post || c.post_id || c.reel || c.url, 300);
      // Vendeur : clé à part, pour qu'une réponse du matin à un autre commentaire ne bloque jamais un vendeur (une réponse vendeur par jour)
      if (intention) post = 'vendre';
      contact = propre(c.contact_id || c.user_id, 80);
      compte = propre(c.ig_username || c.username, 60).replace(/^@/, '').toLowerCase();
      evenement = propre(c.event_id || c.comment_id, 120);
      if (source === 'whatsapp') {
        // WhatsApp : l'identité est le numéro (9 derniers chiffres). Garde-fous AVANT tout : canal en service, numéro non bloqué.
        const tel = String(c.phone || c.telephone || '').replace(/\D/g, '').slice(-9);
        compte = tel ? `wa:${tel}` : '';
        post = 'wa';
        if (!WA_EN_SERVICE_DEPUIS) return sansMessage('wa_pas_en_service', { a_reprendre: true });
        const bloques = WA_BLOQUES_BASE.concat(String(env.WA_BLOQUES || '').split(/[,;\n]+/).map(x => x.replace(/\D/g, '').slice(-9)).filter(Boolean));
        if (!tel || bloques.includes(tel)) return sansMessage('regle9', { a_reprendre: true });
        // Contact qui existait avant la mise en service (proches, collègues, clients en cours) : Shawez garde la main,
        // sauf si la conversation a été ouverte par cette fonction (vérifié plus bas avec l'historique). Date inconnue = contact existant.
        const cree = Date.parse(c.contact_cree || c.subscribed_at || c.subscribed || '');
        waContactExistant = !(cree && cree >= Date.parse(WA_EN_SERVICE_DEPUIS));
      }
    } else return json(405, { error: 'methode' });

    // 1. Filtres : règle 9, mode test, doublons
    if (jamais(env, compte)) return sansMessage('regle9');
    // La personne demande d'arrêter : aucune réponse automatique, à traiter par Shawez (tag ManyChat « stop »).
    if (STOP.test(commentaire || '')) { if (!test) await memoriserStop(env, contact, compte, 'stop'); return sansMessage('stop', { a_reprendre: true }); }
    if (!test && await estStoppe(env, contact, compte)) return sansMessage('stop', { a_reprendre: true });
    if (env.DM_MODE !== 'live' && !COMPTES_TEST.includes(compte)) return sansMessage('mode_test', { compte });
    // Décision de Shawez du 24/10/2026 : le client qui écrit en premier reçoit sa réponse tout de suite, à toute heure,
    // dimanche compris. Seuls les envois à l'initiative du réseau (relances, alertes) restent du lundi au samedi, 8 h-20 h.
    if (!evenement) {
      // DM et stories sans identifiant d'événement : même texte du même contact à 2 minutes près = même événement (relance ManyChat),
      // au-delà c'est un nouveau message (plusieurs « oui » dans une conversation). Commentaires : un par jour et par Reel.
      const fenetre = (source === 'dm' || source === 'whatsapp' || /^(story|dm|wa)/i.test(post || '')) ? `m${Math.floor(Date.now() / 120000)}` : jourParis();
      const brut = new TextEncoder().encode(`${contact}|${idReel(post)}|${commentaire}|${fenetre}`);
      evenement = [...new Uint8Array(await crypto.subtle.digest('SHA-256', brut))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const base = await journal(env).catch(e => { console.log('journal', e.message); return null; });
    const jour = jourParis();
    // Image seule en message privé : repère court à la place du lien signé d'Instagram.
    // Pendant le défi pause, une image seule ou « je l'ai eu » en privé, c'est sans doute la capture promise par la vidéo.
    const prive = source === 'dm' || /^story/i.test(source || '') || /^(story|dm)/i.test(post || '');
    const imageSeule = IMAGE_SEULE.test(commentaire || '');
    if (imageSeule) commentaire = '[image envoyée sans texte]';
    const defi = prive && source !== 'whatsapp' && jour >= DEFI_PAUSE.depuis && jour <= DEFI_PAUSE.jusqu_au
      && (imageSeule || MOTS_DEFI.test(commentaire || ''));
    if (base && !test) {
      // Stories et DM directs : antidoublon par message seulement (décision de Shawez du 20/10 : plus de limite d'une réponse par jour)
      const story = /^(story|dm|wa)/i.test(post || '') || source === 'dm' || source === 'whatsapp';
      const deja = await base.prepare(`SELECT 1 FROM dm_instagram WHERE (evenement = ?1 AND origine <> 'hors_creneau') OR (?5 = 0 AND contact = ?2 AND post = ?3 AND jour = ?4 AND ${ENVOYE}) LIMIT 1`)
        .bind(evenement, contact, idReel(post), jour, story ? 1 : 0).first();
      if (deja) return sansMessage('doublon');
      // Déclencheur « tous les Reels » (source=reel_tous) : il passe 1 minute après les déclencheurs par Reel.
      // Si ce contact a déjà reçu une réponse à un COMMENTAIRE dans les 15 dernières minutes, c'est le même commentaire : on ne répond pas deux fois.
      // Un DM, une story ou un message resté sans réponse (hors sujet, refus) ne bloque jamais un commentaire (bug du 27/10 : « Je veux vendre ma maison » ignoré).
      if (source === 'reel_tous') {
        const recent = await base.prepare(`SELECT 1 FROM dm_instagram WHERE contact = ?1 AND ${ENVOYE} AND post NOT IN ('dm','wa') AND post NOT LIKE 'story%' AND cree > ?2 LIMIT 1`)
          .bind(contact, new Date(Date.now() - 15 * 60000).toISOString()).first();
        if (recent) return sansMessage('doublon_reel_tous');
      }
    }

    // 2. Bien + plafond du jour
    // Réponses aux stories : on ne sait pas quelle story a été vue. Le texte de la réponse décide :
    // mots du tabac / des chiffres → dossier tabac ; sinon aucun bien (réponse honnête : « dis-moi ce qui t'intéresse »).
    // Messages privés directs (post=dm) et réponses aux stories (post=story) : le texte décide du bien.
    // Historique récent du contact (30 jours, 8 derniers messages) : sert au contexte et à retrouver le bien déjà discuté
    let fil = [];
    if (base && !test && contact) {
      const depuis = new Date(Date.now() - 30 * 864e5).toISOString();
      const r = await base.prepare('SELECT sens, texte, cle FROM dm_fil WHERE contact = ?1 AND cree > ?2 ORDER BY id DESC LIMIT 8').bind(contact, depuis).all().catch(() => null);
      fil = ((r && r.results) || []).reverse();
    }
    const noter = async (sens, texte, cle) => {
      if (base && !test && contact && texte) await base.prepare('INSERT INTO dm_fil (contact, sens, texte, cle, cree) VALUES (?1,?2,?3,?4,?5)')
        .bind(contact, sens, String(texte).slice(0, 1000), cle || '', new Date().toISOString()).run().catch(() => {});
    };
    const dejaEcrit = fil.some(m => m.sens === 'out');
    // WhatsApp : un contact d'avant la mise en service n'est servi que si cette fonction lui a déjà écrit
    if (source === 'whatsapp' && waContactExistant && !dejaEcrit) { await noter('in', commentaire, ''); return sansMessage('wa_contact_existant', { a_reprendre: true }); }
    if (dejaEcrit && estCloture(commentaire)) {
      // Fin de conversation : une seule phrase de politesse, sans question ni boutons ; si on a déjà clos, plus rien
      const avant = [...fil].reverse();
      const iOut = avant.findIndex(m => m.sens === 'out');
      const inAvant = avant.slice(iOut + 1).find(m => m.sens === 'in');
      const dejaClos = iOut >= 0 && CLOTURES.includes(avant[iOut].texte) || (inAvant && estCloture(inAvant.texte) && avant[iOut].texte.length < 80);
      await noter('in', commentaire, '');
      if (dejaClos) return sansMessage('cloture');
      const t = CLOTURES[(fil.length + (commentaire || '').length) % CLOTURES.length];
      await noter('out', t, '');
      return json(200, { ...blocManyChat(t, null, false), envoyer: 'oui', origine: 'cloture', cout: 0 });
    }
    // Commentaire « à l'aveugle » : Instagram ne transmet à ManyChat ni le texte du commentaire ni la vidéo commentée.
    // Impossible d'y répondre de façon logique, donc AUCUN message : ni question au hasard sur les biens du moment, ni défi,
    // ni bien d'une conversation précédente. Décision de Shawez du 29/10/2026, après des DM hors sujet
    // (« Toujours pas vendu… » sous le château → message sur la vidéo skate). Seuls les déclencheurs par mot-clé répondent :
    // ManyChat « Mot-clé CHÂTEAU — tous les Reels » (dm_post = mot:chateau), boutons par vidéo (prix, quartier, visite), VISIT en anglais.
    const muet = async (motif) => {
      if (base && !test) await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
        .bind(evenement, contact, compte, idReel(post), '', jour, `muet_${motif}`, 0, 0, 0, new Date().toISOString()).run().catch(() => {});
      return sansMessage(`commentaire_${motif}`);
    };
    // Commentaire sans texte : le flux « tous les Reels » (texte fixe) ou un flux « Autres » d'une vidéo (dm_comment vidé).
    // Seuls les flux par mot-clé disent ce que la personne a écrit (dm_comment : « CHÂTEAU », « Question sur le prix »…).
    const aveugle = !prive && source !== 'whatsapp' && intention !== 'vendre' && (!commentaire || COMMENTAIRE_INCONNU.test(commentaire));
    if (aveugle) {
      // Décision de Shawez du 31/10/2026, qui remplace celle du 29/10 : plus personne ne reste sans réponse.
      // Instagram ne transmet ni le texte ni la vidéo, donc on n'affirme rien et on ne cite AUCUN bien : on demande
      // le mot, et la suite repart du mot reçu. C'est la réponse de secours sans bien, pas de rédaction, coût nul.
      // Une seule demande de ce type par contact et par jour, pour ne jamais tourner en boucle sur ses commentaires.
      if (base && !test) {
        const dejaDemande = await base.prepare("SELECT 1 FROM dm_instagram WHERE contact = ?1 AND jour = ?2 AND origine = 'preciser' LIMIT 1")
          .bind(contact, jour).first().catch(() => null);
        if (dejaDemande) return muet('inconnu_deja_demande');
      }
      const tp = dejaEcrit ? sansSalut(secours(prenom, null)) : secours(prenom, null);
      if (base && !test) {
        await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
          .bind(evenement, contact, compte, idReel(post), '', jour, 'preciser', 0, 0, 0, new Date().toISOString()).run().catch(() => {});
        await noter('out', tp, '');
      }
      return json(200, { ...blocManyChat(tp, null, true), envoyer: 'oui', origine: 'preciser', cout: 0 });
    }
    if (/^(story|dm|wa)$/i.test(post || '')) {
      const c = commentaire || '';
      post = /tabac|bilan|chiffre|\bca\b|\bebe\b|compta|fdj|presse|fonds|1[,.]8|million/i.test(c) ? 'story-tabac'
        : /bourroche|blondel|deux balcons|2 balcons/i.test(c) ? 'Del8q6GtmLp'
        : /chevigny/i.test(c) ? 'DeY_bQeoGA3'
        : /ch[eé]n[oô]ve/i.test(c) ? 'DdzDuf0uxln'
        : '';
    }
    if (/^(story|dm|wa)$/i.test(post || '') || post === '') {
      // Rien de reconnu dans ce message : on reste sur le bien dont on parlait déjà avec ce contact
      const dernier = [...fil].reverse().find(m => m.cle);
      if (dernier) post = dernier.cle;
    }
    let bien = intention === 'vendre' ? null : await trouverBien(env, request, post);
    let cleBien = bien ? post : '';
    if (!bien && intention !== 'vendre') {
      // Reel absent du registre (Trial Reel, nouvelle version) ou message sans bien reconnu : le mot-clé écrit par la personne décide
      const mc = await motCle(env, request, commentaire);
      if (mc) { bien = await trouverBien(env, request, mc); if (bien) cleBien = mc; }
    }
    // Toujours aucun bien, mais la personne a annoncé un budget : on lui propose ce qui correspond
    // au lieu de lui demander ce qu'elle cherche. Demande de Shawez du 31/10/2026.
    if (!bien && intention !== 'vendre') bien = await biensPourBudget(env, request, commentaire);
    if (base && !test && bien && bien.ref && !prive && source !== 'whatsapp') {
      // Même bien déjà envoyé aujourd'hui à ce contact (un même commentaire peut passer par le déclencheur de la vidéo
      // et par celui du mot-clé) : jamais un second message sur le même bien
      const memeBien = await base.prepare(`SELECT 1 FROM dm_instagram WHERE contact = ?1 AND ref = ?2 AND jour = ?3 AND ${ENVOYE} AND post NOT IN ('dm','wa') AND post NOT LIKE 'story%' LIMIT 1`)
        .bind(contact, String(bien.ref), jour).first().catch(() => null);
      if (memeBien) return sansMessage('doublon_bien');
    }
    let depense = 0;
    if (base) {
      const r = await base.prepare('SELECT COALESCE(SUM(cout), 0) AS c FROM dm_instagram WHERE jour = ?1').bind(jour).first();
      depense = (r && r.c) || 0;
    }

    // 3. Rédaction par Claude, contrôlée ; sinon secours
    let texte, usage = null, origine = 'claude', refus = null;
    if (depense >= PLAFOND_JOUR_USD) { texte = secours(prenom, bien, source === 'whatsapp'); origine = 'plafond'; }
    else {
      try {
        ({ texte, usage } = await rediger(env, prenom, commentaire, bien, source || (/^dm$/i.test(post || '') ? 'dm' : ''), fil, intention, '', defi,
          source === 'whatsapp' || /^wa:/.test(compte || '') ? '' : compte));
        if (/^\W*HORS_SUJET\W*$/i.test(texte)) {
          // Pas une demande immobilière (conversation perso, partenariat…) : aucun message, Shawez reprend à la main
          const coutHs = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;
          if (base) await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
            .bind(evenement, contact, compte, source === 'dm' ? 'dm' : idReel(post), '', jour, 'hors_sujet',
              usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, coutHs, new Date().toISOString()).run().catch(() => {});
          await noter('in', commentaire, '');
          return sansMessage('hors_sujet', { a_reprendre: true });
        }
        // Une parenthèse devient une simple virgule, comme on l'écrirait sur un téléphone
        texte = normaliser(texte.replace(/\s*\(([^()\n]{1,120})\)/g, ', $1,').replace(/,\s*([.!?,])/g, '$1').replace(/,\s*$/gm, ''));
        if (dejaEcrit) texte = sansSalut(texte);
        refus = controle(texte, bien, fil.length > 0 && (source === 'dm' || source === 'whatsapp' || /^story/i.test(source || '')), fil.filter(m => m.sens === 'in').map(m => m.texte).concat(commentaire || '').join('\n'));
        if (refus) {
          console.log('manychat-dm refus', refus, texte);
          if (refus === 'metadiscours' || (fil.length && (source === 'dm' || source === 'whatsapp' || /^story/i.test(source || '')))) {
            // Pas de message de secours au milieu d'une conversation : Shawez reprend à la main
            const coutR = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;
            if (base) await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
              .bind(evenement, contact, compte, source === 'dm' ? 'dm' : idReel(post), bien ? bien.ref || '' : '', jour, `refus_${refus}`,
                usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, coutR, new Date().toISOString()).run().catch(() => {});
            await noter('in', commentaire, cleBien);
            return sansMessage(`refus_${refus}`, { a_reprendre: true });
          }
          texte = secours(prenom, bien, source === 'whatsapp'); origine = `secours_${refus}`;
        }
      } catch (e) {
        console.log('manychat-dm claude', e.message);
        if (e.usage) usage = e.usage;
        texte = secours(prenom, bien, source === 'whatsapp');
        // Raison courte (statut + type d'erreur Anthropic), jamais la clé : visible dans dm_instagram.origine
        origine = ('secours_api:' + String(e.message || '').replace(/sk-[\w-]+/g, '***').replace(/\s+/g, ' ')).slice(0, 160);
      }
    }
    const cout = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;
    // Règlement européen sur l'IA, article 50 (en vigueur depuis le 2 août 2026) : la personne est informée qu'un assistant IA
    // lui répond. Une seule fois par contact, sur le premier message rédigé par l'IA ; la mention est enregistrée avec le message.
    const anglais = source !== 'whatsapp' && enAnglais(texte);
    if (origine === 'claude' && !fil.some(m => m.sens === 'out' && (String(m.texte || '').includes(MENTION_IA) || String(m.texte || '').includes(MENTION_IA_EN))))
      texte = `${texte}\n${anglais ? MENTION_IA_EN : MENTION_IA}`;

    if (base) {
      await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
        .bind(evenement, contact, compte, source === 'dm' ? 'dm' : idReel(post), bien ? bien.ref || '' : '', jour, origine,
          usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, cout, new Date().toISOString())
        .run().catch(e => console.log('journal insert', e.message));
    }
    await noter('in', commentaire, cleBien);
    await noter('out', texte, cleBien);
    console.log('manychat-dm', JSON.stringify({ post: idReel(post), ref: bien && bien.ref, compte, origine, cout }));
    // Boutons seulement au premier message (ou quand un bien est en jeu) : pas à chaque réponse d'une conversation
    const bloc = blocManyChat(texte, bien, !dejaEcrit || !!bien, source === 'whatsapp', anglais);
    if (intention === 'vendre') bloc.fiche_url = ESTIMER;
    return json(200, { ...bloc, envoyer: 'oui', origine, cout: Math.round(cout * 1e5) / 1e5, depense_jour: Math.round((depense + cout) * 1e4) / 1e4 });
  } catch (e) {
    console.log('manychat-dm', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
