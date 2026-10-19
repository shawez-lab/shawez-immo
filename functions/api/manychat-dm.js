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
    type: propre(a.compo_agence || a.type, 80),
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

async function trouverBien(env, request, post) {
  const id = idReel(post);
  let registre = {};
  try { registre = await lireJson(env, request, '/videos-biens.json'); } catch (e) { console.log('registre', e.message); }
  const entree = (registre.videos || {})[id];
  if (!entree) return null;
  if (entree.manuel) return { ...entree.manuel, lien: entree.manuel.lien || BIENS };
  try {
    const d = await lireJson(env, request, '/annonces.json');
    const a = (d.annonces || {})[entree.ref];
    return a ? ficheDepuisAnnonce(entree.ref, a) : null;
  } catch (e) { console.log('annonces', e.message); return null; }
}

const CONSIGNES = `Tu écris, au nom de Shawez Ali, agent immobilier chez Gravelin Immo à Dijon, un message privé Instagram
à une personne qui vient de commenter la vidéo d'un bien. Règles absolues :
- Commence par « Salut <prénom> » (ou « Salut » si le prénom est inconnu). Exactement 3 ou 4 lignes de texte, séparées par un seul retour à la ligne, SANS ligne vide, 600 caractères maximum au total, tutoiement, ton chaleureux et naturel, 1 ou 2 emojis maximum, signé implicitement par Shawez (pas de signature).
- Commence par le prénom s'il est donné.
- Si le commentaire pose une question précise (quartier, prix, surface, visite, disponibilité), réponds-y d'abord, en une phrase,
  UNIQUEMENT avec les données du bien fournies. Si la donnée n'y est pas, dis que tu lui envoies la réponse en direct.
- Cite le bien (type, commune, prix tel qu'écrit dans les données) sans jamais donner d'adresse exacte ni de nom de rue.
- Termine par UNE seule question courte qui ne demande qu'une chose : visite, appel, OU ce qu'il cherche, jamais deux demandes reliées par « et » ou « ou ».
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
- Ne mentionne pas les boutons en détail : ils s'affichent sous ton message (dossier du bien, estimation, calcul de prêt).
Réponds avec le texte du message seul, sans guillemets.`;

async function rediger(env, prenom, commentaire, bien) {
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
      messages: [{ role: 'user', content: `Prénom : ${prenom || '(inconnu)'}\nCommentaire : ${commentaire || '(vide)'}\n\nDonnées du bien :\n${donnees}` }],
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
  if (!bien) return `Salut${p} 👋 merci pour ton commentaire !\nC'est Shawez, agent immobilier à Dijon.\nDis-moi quel bien t'intéresse ou ce que tu cherches, je te réponds moi-même.\nWhatsApp : ${WHATSAPP}`;
  if (bien.chiffres && bien.confidentialite) {
    return `Salut${p} 👋 le 1,8 million, c'est tout ce qui passe en caisse sur l'année, tabac, jeux et presse compris.\nLa plus grande partie repart à l'État, le chiffre d'affaires comptable tourne autour de 208 000 €.\nPour les bilans complets, signe l'engagement de confidentialité du bouton Accès aux bilans et renvoie-le avec ta pièce d'identité, je t'envoie tout dans la foulée.\nTu cherches à reprendre un commerce sur Dijon ?`;
  }
  const brut = bien.type ? bien.type.split(' - ')[0].trim() : 'bien';
  const t = brut.replace(/\b(t\d)\b/gi, m => m.toUpperCase()).replace(/^./, c => c.toLowerCase());
  const det = /^[aeiouyéèêh]/i.test(t) ? 'cet' : 'ce';
  return `Salut${p} 👋 merci pour ton commentaire !\nC'est Shawez, agent immobilier à Dijon.\nLe dossier de ${det} ${t} à ${bien.commune}${bien.prix ? `, à ${bien.prix},` : ''} est juste en dessous.\nTu veux le visiter ou je t'appelle ? WhatsApp : ${WHATSAPP}`;
}

// Contrôle du texte de Claude avant envoi : vocabulaire, montants, adresse. Renvoie la raison du refus ou null.
function controle(texte, bien) {
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

const sansMessage = (raison, extra = {}) => json(200, { message: '', fiche_url: '', envoyer: 'non', raison, ...extra });

async function journal(env) {
  if (!env.DB) return null;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS dm_instagram (
    evenement TEXT PRIMARY KEY, contact TEXT, compte TEXT, post TEXT, ref TEXT, jour TEXT,
    origine TEXT, entree INTEGER, sortie INTEGER, cout REAL, cree TEXT)`).run();
  return env.DB;
}

const jourParis = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());

function blocManyChat(texte, bien) {
  const boutons = [
    { type: 'url', caption: '📄 Dossier du bien', url: bien && bien.lien ? bien.lien : BIENS },
    { type: 'url', caption: '🏠 Estimer mon bien', url: ESTIMER },
    bien && bien.confidentialite
      ? { type: 'url', caption: '🔒 Accès aux bilans', url: bien.confidentialite }
      : { type: 'url', caption: '💶 Calculer mon prêt', url: PRET },
  ];
  return {
    version: 'v2',
    content: { type: 'instagram', messages: [{ type: 'text', text: texte.slice(0, 640), buttons: boutons }] },
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
        if (env.DM_MODE !== 'live' && !COMPTES_TEST.includes(cpt)) return sansMessage('mode_test', { compte: cpt, source });
        if (COMPTES_TEST.includes(cpt) || creneauOuvert()) return json(200, { envoyer: 'oui', raison: 'ok', source });
        const att = minutesAvantCreneau();
        // Fenêtre de 24 h ouverte par le message de la personne : au-delà de 23 h d'attente, on ne programme pas,
        // le cas reste à reprendre à la main dans l'Inbox.
        if (att > 23 * 60) return sansMessage('fenetre_24h', { source, a_reprendre: true });
        return sansMessage('hors_creneau', { source, envoyer: 'plus_tard', attendre_minutes: att });
      }
      source = propre(c.source, 40);
      prenom = propre(c.first_name || c.prenom, 40);
      // « GRAVELIN » ou « gravelin » → « Gravelin »
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
    if (STOP.test(commentaire || '')) return sansMessage('stop', { a_reprendre: true });
    if (env.DM_MODE !== 'live' && !COMPTES_TEST.includes(compte)) return sansMessage('mode_test', { compte });
    // Règle de Shawez : rien n'est envoyé à un client la nuit (20 h-8 h) ni le dimanche. Le commentaire est journalisé
    // (origine « hors_creneau ») pour que l'agent « Rattrapage commentaires » réponde au prochain créneau.
    if (!COMPTES_TEST.includes(compte) && !creneauOuvert()) {
      const b = await journal(env).catch(() => null);
      if (b) await b.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
        .bind(`hc-${evenement || Date.now()}`, contact, compte, idReel(post), '', jourParis(), 'hors_creneau', 0, 0, 0, new Date().toISOString())
        .run().catch(() => {});
      // ManyChat : branche « plus_tard » → Smart Delay de attendre_minutes → rappel de cette même requête → envoi.
      const att = minutesAvantCreneau();
      // Réponses aux stories : fenêtre Instagram de 24 h → au-delà de 23 h d'attente, pas de report, reprise à la main
      if ((source === 'story_reply' || source === 'dm') && att > 23 * 60) return sansMessage('fenetre_24h', { compte, source, a_reprendre: true });
      return sansMessage('hors_creneau', { compte, source, envoyer: 'plus_tard', attendre_minutes: att });
    }
    if (!evenement) {
      const brut = new TextEncoder().encode(`${contact}|${idReel(post)}|${commentaire}|${jourParis()}`);
      evenement = [...new Uint8Array(await crypto.subtle.digest('SHA-256', brut))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const base = await journal(env).catch(e => { console.log('journal', e.message); return null; });
    const jour = jourParis();
    if (base && !test) {
      const story = /^story/i.test(post || '');
      if (source === 'dm') {
        const dejaDm = await base.prepare("SELECT 1 FROM dm_instagram WHERE contact = ?1 AND jour = ?2 AND post = 'dm' AND origine <> 'hors_creneau' LIMIT 1").bind(contact, jour).first();
        if (dejaDm) return sansMessage('deja_repondu_aujourdhui');
      }
      const deja = await base.prepare("SELECT 1 FROM dm_instagram WHERE origine <> 'hors_creneau' AND (evenement = ?1 OR (?5 = 0 AND contact = ?2 AND post = ?3 AND jour = ?4)) LIMIT 1")
        .bind(evenement, contact, idReel(post), jour, story ? 1 : 0).first();
      if (deja) return sansMessage('doublon');
    }

    // 2. Bien + plafond du jour
    // Réponses aux stories : on ne sait pas quelle story a été vue. Le texte de la réponse décide :
    // mots du tabac / des chiffres → dossier tabac ; sinon aucun bien (réponse honnête : « dis-moi ce qui t'intéresse »).
    // Messages privés directs (post=dm) et réponses aux stories (post=story) : le texte décide du bien.
    if (/^(story|dm)$/i.test(post || '')) {
      const c = commentaire || '';
      post = /tabac|bilan|chiffre|\bca\b|\bebe\b|compta|fdj|presse|fonds|1[,.]8|million/i.test(c) ? 'story-tabac'
        : /bourroche|blondel|deux balcons|2 balcons/i.test(c) ? 'Del8q6GtmLp'
        : /chevigny/i.test(c) ? 'DeY_bQeoGA3'
        : /ch[eé]n[oô]ve/i.test(c) ? 'DdzDuf0uxln'
        : '';
    }
    const bien = await trouverBien(env, request, post);
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
        ({ texte, usage } = await rediger(env, prenom, commentaire, bien));
        // Une parenthèse devient une simple virgule, comme on l'écrirait sur un téléphone
        texte = normaliser(texte.replace(/\s*\(([^()\n]{1,120})\)/g, ', $1,').replace(/,\s*([.!?,])/g, '$1').replace(/,\s*$/gm, ''));
        refus = controle(texte, bien);
        if (refus) { console.log('manychat-dm refus', refus, texte); texte = secours(prenom, bien); origine = `secours_${refus}`; }
      } catch (e) {
        console.log('manychat-dm claude', e.message);
        if (e.usage) usage = e.usage;
        texte = secours(prenom, bien);
        // Raison courte (statut + type d'erreur Anthropic), jamais la clé : visible dans dm_instagram.origine
        origine = ('secours_api:' + String(e.message || '').replace(/sk-[\w-]+/g, '***').replace(/\s+/g, ' ')).slice(0, 160);
      }
    }
    const cout = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;

    if (base) {
      await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
        .bind(evenement, contact, compte, source === 'dm' ? 'dm' : idReel(post), bien ? bien.ref || '' : '', jour, origine,
          usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, cout, new Date().toISOString())
        .run().catch(e => console.log('journal insert', e.message));
    }
    console.log('manychat-dm', JSON.stringify({ post: idReel(post), ref: bien && bien.ref, compte, origine, cout }));
    return json(200, { ...blocManyChat(texte, bien), envoyer: 'oui', origine, cout: Math.round(cout * 1e5) / 1e5, depense_jour: Math.round((depense + cout) * 1e4) / 1e4 });
  } catch (e) {
    console.log('manychat-dm', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
