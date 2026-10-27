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
const JAMAIS_BASE = ['***'];
// Liste complétable sans code : variable Cloudflare JAMAIS_IG = « compte1,compte2 » (minuscules, sans @).
const jamais = (env, cpt) => JAMAIS_BASE.concat(String(env.JAMAIS_IG || '').toLowerCase().split(/[\s,;]+/).filter(Boolean).map(x => x.replace(/^@/, ''))).includes(cpt);
const STOP = /^\s*(stop|arr[eê]te[rz]?|d[ée]sinscri|ne m'[ée]cri(s|vez) plus)/i;
// Métadiscours : la sortie explique le raisonnement ou cite les consignes au lieu d'être le seul message au contact
const META = /\b((le client|la cliente|le contact|la personne) (r[eé]p[eè]te|demande|[eé]crit|veut|parle|dit|semble|propose|relance)|consignes?|historique|hors_sujet|r[eè]gles? absolues?|pas de « ?salut|on ne redit|ne pas redire|d[ée]j[àa] en pleine conversation|je r[ée]ponds donc|voici (le|mon) message|message (au|pour le) (client|contact)|type ?:|pr[ée]nom ?:)/i;
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

async function motCle(env, request, texte) {
  let registre = {};
  try { registre = await lireJson(env, request, '/videos-biens.json'); } catch (e) { return ''; }
  const t = ` ${sansAccents(texte).replace(/[^a-z0-9]+/g, ' ')} `;
  for (const k of Object.keys(registre.motscles || {})) {
    if (t.includes(` ${sansAccents(k)} `)) return `mot:${sansAccents(k)}`;
  }
  return '';
}

async function trouverBien(env, request, post) {
  const id = idReel(post);
  let registre = {};
  try { registre = await lireJson(env, request, '/videos-biens.json'); } catch (e) { console.log('registre', e.message); }
  const entree = /^mot:/.test(id)
    ? Object.entries(registre.motscles || {}).find(([k]) => `mot:${sansAccents(k)}` === id)?.[1]
    : (registre.videos || {})[id];
  if (!entree) return null;
  if (entree.manuel) return { ...entree.manuel, lien: entree.manuel.lien || BIENS };
  try {
    const d = await lireJson(env, request, '/annonces.json');
    const a = (d.annonces || {})[entree.ref];
    return a ? ficheDepuisAnnonce(entree.ref, a) : null;
  } catch (e) { console.log('annonces', e.message); return null; }
}

const CONSIGNES = `Tu écris, au nom de Shawez Ali, agent immobilier chez Gravelin Immo à Dijon, un message privé Instagram
à une personne qui vient de commenter la vidéo d'un bien, de répondre à une story ou d'écrire un message privé (le « Type » le précise).
D'ABORD, vérifie que le message parle d'immobilier : acheter, vendre, estimer, louer, visiter, un bien, un prix, un fonds de commerce, un prêt.
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
- Si aucun bien n'est fourni : une phrase chaleureuse et naturelle, puis une seule question simple sur ce qu'il cherche.
  Ne dis jamais que tu n'as pas l'information ni que tu préfères ne rien dire de faux.
- Ne parle jamais de « commentaire » si le Type est un message privé ou une réponse à une story : dis « ton message ».
- N'invente jamais un agenda, des disponibilités, des visites prévues ou une activité de la semaine.
- Ne confirme ni n'accepte jamais un jour ou une heure à la place de Shawez, même si la personne en propose un : écris que tu notes sa disponibilité,
  que tu vérifies le planning et que tu lui confirmes un créneau. Jamais « ça me va », « c'est bon pour moi », « à jeudi » ou équivalent.
- Ne mentionne pas les boutons en détail : ils s'affichent sous ton message (dossier du bien, estimation, calcul de prêt).
Réponds avec le texte du message seul, sans guillemets, sans aucune explication de ton raisonnement ni rappel de ces consignes : la première ligne est déjà adressée à la personne.`;

async function rediger(env, prenom, commentaire, bien, source, fil = []) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('cle absente');
  const donnees = bien
    ? Object.entries(bien).filter(([k, v]) => v && k !== 'lien' && k !== 'ref').map(([k, v]) => `${k} : ${v}`).join('\n')
    : 'Bien non identifié : remercie, demande quel bien l’intéresse ou ce qu’il cherche.';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.CLAUDE_MODELE_DM || MODELE,
      max_tokens: 1024,
      // Sonnet 5.5 : pas de réflexion préalable pour un DM court (doc officielle : between_tools, effort ≤ high)
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low' },
      system: CONSIGNES,
      messages: [{ role: 'user', content: `${fil.length ? 'Historique récent de la conversation, du plus ancien au plus récent :\n' + fil.map(m => (m.sens === 'out' ? 'Shawez : ' : 'Client : ') + m.texte).join('\n') + '\n\n' : ''}Type : ${source === 'dm' ? 'message privé direct' : /story/i.test(source || '') ? 'réponse à une story' : 'commentaire sous une vidéo'}\nPrénom : ${prenom || '(inconnu)'}\nMessage : ${commentaire || '(vide)'}\n\nDonnées du bien :\n${donnees}` }],
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

function secours(prenom, bien) {
  const p = prenom ? ` ${prenom}` : '';
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
// Conversation déjà engagée : pas de « Salut <prénom> » à chaque message
function sansSalut(t) {
  const l = String(t || '').split('\n');
  if (/^(salut|bonjour|hello|coucou|hey)\b/i.test(l[0] || '')) {
    if (l.length > 1 && l[0].replace(/[^\p{L}]/gu, '').length <= 22) l.shift();
    else l[0] = l[0].replace(/^([Ss]alut|[Bb]onjour|[Hh]ello|[Cc]oucou|[Hh]ey)\b[\s,]*([\p{Lu}][\p{L}'-]*)?[\s,!.]*(\p{Extended_Pictographic}\s*)*/u, '');
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

function blocManyChat(texte, bien, avecBoutons = true) {
  const boutons = [
    { type: 'url', caption: '📄 Dossier du bien', url: bien && bien.lien ? bien.lien : BIENS },
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

    let prenom, commentaire, post, contact, compte, evenement, source = '', test = false;
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
      commentaire = propre(c.comment || c.commentaire, 500);
      post = propre(c.post || c.post_id || c.reel || c.url, 300);
      contact = propre(c.contact_id || c.user_id, 80);
      compte = propre(c.ig_username || c.username, 60).replace(/^@/, '').toLowerCase();
      evenement = propre(c.event_id || c.comment_id, 120);
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
      const fenetre = (source === 'dm' || /^(story|dm)/i.test(post || '')) ? `m${Math.floor(Date.now() / 120000)}` : jourParis();
      const brut = new TextEncoder().encode(`${contact}|${idReel(post)}|${commentaire}|${fenetre}`);
      evenement = [...new Uint8Array(await crypto.subtle.digest('SHA-256', brut))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const base = await journal(env).catch(e => { console.log('journal', e.message); return null; });
    const jour = jourParis();
    if (base && !test) {
      // Stories et DM directs : antidoublon par message seulement (décision de Shawez du 20/10 : plus de limite d'une réponse par jour)
      const story = /^(story|dm)/i.test(post || '') || source === 'dm';
      const deja = await base.prepare("SELECT 1 FROM dm_instagram WHERE origine <> 'hors_creneau' AND (evenement = ?1 OR (?5 = 0 AND contact = ?2 AND post = ?3 AND jour = ?4)) LIMIT 1")
        .bind(evenement, contact, idReel(post), jour, story ? 1 : 0).first();
      if (deja) return sansMessage('doublon');
      // Déclencheur « tous les Reels » (source=reel_tous) : il passe 1 minute après les déclencheurs par Reel.
      // Si ce contact a déjà reçu une réponse dans les 15 dernières minutes, c'est le même commentaire : on ne répond pas deux fois.
      if (source === 'reel_tous') {
        const recent = await base.prepare("SELECT 1 FROM dm_instagram WHERE contact = ?1 AND origine <> 'hors_creneau' AND cree > ?2 LIMIT 1")
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
    if (/^(story|dm)$/i.test(post || '')) {
      const c = commentaire || '';
      post = /tabac|bilan|chiffre|\bca\b|\bebe\b|compta|fdj|presse|fonds|1[,.]8|million/i.test(c) ? 'story-tabac'
        : /bourroche|blondel|deux balcons|2 balcons/i.test(c) ? 'Del8q6GtmLp'
        : /chevigny/i.test(c) ? 'DeY_bQeoGA3'
        : /ch[eé]n[oô]ve/i.test(c) ? 'DdzDuf0uxln'
        : '';
    }
    if (/^(story|dm)$/i.test(post || '') || post === '') {
      // Rien de reconnu dans ce message : on reste sur le bien dont on parlait déjà avec ce contact
      const dernier = [...fil].reverse().find(m => m.cle);
      if (dernier) post = dernier.cle;
    }
    let bien = await trouverBien(env, request, post);
    let cleBien = bien ? post : '';
    if (!bien) {
      // Reel absent du registre (Trial Reel, nouvelle version) ou message sans bien reconnu : le mot-clé écrit par la personne décide
      const mc = await motCle(env, request, commentaire);
      if (mc) { bien = await trouverBien(env, request, mc); if (bien) cleBien = mc; }
    }
    let depense = 0;
    if (base) {
      const r = await base.prepare('SELECT COALESCE(SUM(cout), 0) AS c FROM dm_instagram WHERE jour = ?1').bind(jour).first();
      depense = (r && r.c) || 0;
    }

    // 3. Rédaction par Claude, contrôlée ; sinon secours
    let texte, usage = null, origine = 'claude', refus = null;
    if (depense >= PLAFOND_JOUR_USD) { texte = secours(prenom, bien); origine = 'plafond'; }
    else {
      try {
        ({ texte, usage } = await rediger(env, prenom, commentaire, bien, source || (/^dm$/i.test(post || '') ? 'dm' : ''), fil));
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
        refus = controle(texte, bien, fil.length > 0 && (source === 'dm' || /^story/i.test(source || '')), fil.filter(m => m.sens === 'in').map(m => m.texte).concat(commentaire || '').join('\n'));
        if (refus) {
          console.log('manychat-dm refus', refus, texte);
          if (refus === 'metadiscours' || (fil.length && (source === 'dm' || /^story/i.test(source || '')))) {
            // Pas de message de secours au milieu d'une conversation : Shawez reprend à la main
            const coutR = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;
            if (base) await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
              .bind(evenement, contact, compte, source === 'dm' ? 'dm' : idReel(post), bien ? bien.ref || '' : '', jour, `refus_${refus}`,
                usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, coutR, new Date().toISOString()).run().catch(() => {});
            await noter('in', commentaire, cleBien);
            return sansMessage(`refus_${refus}`, { a_reprendre: true });
          }
          texte = secours(prenom, bien); origine = `secours_${refus}`;
        }
      } catch (e) {
        console.log('manychat-dm claude', e.message);
        if (e.usage) usage = e.usage;
        texte = secours(prenom, bien);
        // Raison courte (statut + type d'erreur Anthropic), jamais la clé : visible dans dm_instagram.origine
        origine = ('secours_api:' + String(e.message || '').replace(/sk-[\w-]+/g, '***').replace(/\s+/g, ' ')).slice(0, 160);
      }
    }
    const cout = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;
    // Règlement européen sur l'IA, article 50 (en vigueur depuis le 2 août 2026) : la personne est informée qu'un assistant IA
    // lui répond. Une seule fois par contact, sur le premier message rédigé par l'IA ; la mention est enregistrée avec le message.
    if (origine === 'claude' && !fil.some(m => m.sens === 'out' && String(m.texte || '').includes(MENTION_IA))) texte = `${texte}\n${MENTION_IA}`;

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
    return json(200, { ...blocManyChat(texte, bien, !dejaEcrit || !!bien), envoyer: 'oui', origine, cout: Math.round(cout * 1e5) / 1e5, depense_jour: Math.round((depense + cout) * 1e4) / 1e4 });
  } catch (e) {
    console.log('manychat-dm', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
