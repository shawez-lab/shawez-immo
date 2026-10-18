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
const PRIX_ENTREE = 3 / 1e6, PRIX_SORTIE = 15 / 1e6;   // estimation Sonnet ($ par jeton), pour le plafond
// Mode test : tant que DM_MODE n'est pas « live » (variable Cloudflare), seuls ces comptes reçoivent un DM.
const COMPTES_TEST = ['gravelin_immo', 'shawez_immo'];
// Règle 9 du Cerveau : comptes Instagram à qui on n'écrit jamais (en minuscules, sans @).
const JAMAIS = ['***'];
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
    lien: a.chemin ? `https://www.gravelin-immo.com${a.chemin}` : BIENS,
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
- 4 lignes maximum, tutoiement, ton chaleureux et naturel, 1 ou 2 emojis maximum, signé implicitement par Shawez (pas de signature).
- Commence par le prénom s'il est donné.
- Si le commentaire pose une question précise (quartier, prix, surface, visite, disponibilité), réponds-y d'abord, en une phrase,
  UNIQUEMENT avec les données du bien fournies. Si la donnée n'y est pas, dis que tu lui envoies la réponse en direct.
- Cite le bien (type, commune, prix tel qu'écrit dans les données) sans jamais donner d'adresse exacte ni de nom de rue.
- Termine par une seule question qui fait avancer : visite, appel, ou ce qu'il cherche.
- Ne jamais inventer un prix, une surface, un quartier ou une caractéristique. Jamais les mots « mandataire », « gratuit », « IA »,
  « robot », « automatique ». Dis « offert » si besoin.
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
      max_tokens: 300,
      system: CONSIGNES,
      messages: [{ role: 'user', content: `Prénom : ${prenom || '(inconnu)'}\nCommentaire : ${commentaire || '(vide)'}\n\nDonnées du bien :\n${donnees}` }],
    }),
  });
  if (!r.ok) throw new Error(`api ${r.status} ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const texte = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!texte) throw new Error('reponse vide');
  return { texte, usage: d.usage || null };
}

function secours(prenom, bien) {
  const p = prenom ? ` ${prenom}` : '';
  if (!bien) return `Salut${p} 👋 merci pour ton commentaire ! C'est Shawez, agent immobilier à Dijon. Dis-moi quel bien t'intéresse ou ce que tu cherches, et je te réponds moi-même. WhatsApp : ${WHATSAPP}`;
  const t = bien.type ? bien.type.split(' - ')[0].toLowerCase() : 'bien';
  return `Salut${p} 👋 merci pour ton commentaire ! C'est Shawez, agent immobilier à Dijon. Le dossier de ce ${t} à ${bien.commune}${bien.prix ? ` (${bien.prix})` : ''} est juste en dessous. Tu veux le visiter ou je t'appelle ? WhatsApp : ${WHATSAPP}`;
}

// Contrôle du texte de Claude avant envoi : vocabulaire, montants, adresse. Renvoie la raison du refus ou null.
function controle(texte, bien) {
  if (INTERDITS.test(texte)) return 'vocabulaire';
  if (/\b\d{1,3}\s?,?\s?(bis|ter)?\s*(rue|avenue|bd|boulevard|place|impasse|allée|chemin|route)\b/i.test(texte)) return 'adresse';
  if (/\b(rue|avenue|boulevard|impasse|allée)\s+[A-ZÉ]/.test(texte)) return 'adresse';
  const chiffres = v => String(v || '').replace(/\D/g, '');
  const prix = chiffres(bien && bien.prix);
  const montants = (texte.match(/\d[\d\s.\u202f]*\s?(€|euros|k€)/gi) || []).map(chiffres);
  for (const m of montants) if (!prix || (m !== prix && m + '000' !== prix)) return 'montant';
  if (texte.length > 900) return 'longueur';
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
    { type: 'url', caption: '💶 Calculer mon prêt', url: PRET },
  ];
  return {
    version: 'v2',
    content: { type: 'instagram', messages: [{ type: 'text', text: texte.slice(0, 900), buttons: boutons }] },
    // Champs à plat, pour un mappage en champs personnalisés si on préfère un bloc ManyChat classique :
    message: texte.slice(0, 900),
    fiche_url: boutons[0].url,
    bien_ref: bien ? bien.ref || '' : '',
  };
}

export async function onRequest({ request, env }) {
  try {
    if (!egal(request.headers.get('X-Boss-Token') || '', env.MANYCHAT_TOKEN || '')) return json(401, { error: 'acces' });

    let prenom, commentaire, post, contact, compte, evenement, test = false;
    if (request.method === 'GET') {
      const u = new URL(request.url);
      if (!u.searchParams.get('test')) return json(200, { ready: !!env.ANTHROPIC_API_KEY, mode: env.DM_MODE === 'live' ? 'live' : 'test' });
      test = true; prenom = 'Test'; commentaire = u.searchParams.get('c') || 'Il est dans quel quartier ?';
      post = u.searchParams.get('post') || 'test-chevigny'; compte = 'gravelin_immo'; contact = 'test'; evenement = `test-${Date.now()}`;
    } else if (request.method === 'POST') {
      const c = await request.json().catch(() => ({}));
      prenom = propre(c.first_name || c.prenom, 40);
      commentaire = propre(c.comment || c.commentaire, 500);
      post = propre(c.post || c.post_id || c.reel || c.url, 300);
      contact = propre(c.contact_id || c.user_id, 80);
      compte = propre(c.ig_username || c.username, 60).replace(/^@/, '').toLowerCase();
      evenement = propre(c.event_id || c.comment_id, 120);
    } else return json(405, { error: 'methode' });

    // 1. Filtres : règle 9, mode test, doublons
    if (JAMAIS.includes(compte)) return sansMessage('regle9');
    if (env.DM_MODE !== 'live' && !COMPTES_TEST.includes(compte)) return sansMessage('mode_test', { compte });
    if (!evenement) {
      const brut = new TextEncoder().encode(`${contact}|${idReel(post)}|${commentaire}`);
      evenement = [...new Uint8Array(await crypto.subtle.digest('SHA-256', brut))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const base = await journal(env).catch(e => { console.log('journal', e.message); return null; });
    const jour = jourParis();
    if (base && !test) {
      const deja = await base.prepare('SELECT 1 FROM dm_instagram WHERE evenement = ?1 OR (contact = ?2 AND post = ?3 AND jour = ?4) LIMIT 1')
        .bind(evenement, contact, idReel(post), jour).first();
      if (deja) return sansMessage('doublon');
    }

    // 2. Bien + plafond du jour
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
        refus = controle(texte, bien);
        if (refus) { console.log('manychat-dm refus', refus, texte); texte = secours(prenom, bien); origine = `secours_${refus}`; }
      } catch (e) { console.log('manychat-dm claude', e.message); texte = secours(prenom, bien); origine = 'secours_api'; }
    }
    const cout = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;

    if (base) {
      await base.prepare('INSERT OR IGNORE INTO dm_instagram VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)')
        .bind(evenement, contact, compte, idReel(post), bien ? bien.ref || '' : '', jour, origine,
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
