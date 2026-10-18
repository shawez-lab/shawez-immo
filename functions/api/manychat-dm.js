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
  const p = prenom ? `${prenom}, ` : '';
  const b = bien ? `ce ${bien.type ? bien.type.split(' - ')[0].toLowerCase() : 'bien'} à ${bien.commune}${bien.prix ? `, ${bien.prix}` : ''}` : 'ce bien';
  return `Salut ${p}merci pour ton commentaire 🙏 C'est Shawez, agent immobilier à Dijon. Tu as tout le dossier de ${b} juste en dessous. Tu veux le visiter ou je t'appelle ? WhatsApp : ${WHATSAPP}`;
}

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

    let prenom, commentaire, post;
    if (request.method === 'GET') {
      const u = new URL(request.url);
      if (!u.searchParams.get('test')) return json(200, { ready: !!env.ANTHROPIC_API_KEY });
      prenom = 'Test'; commentaire = 'Il est dans quel quartier ?'; post = u.searchParams.get('post') || 'test-chevigny';
    } else if (request.method === 'POST') {
      const c = await request.json().catch(() => ({}));
      prenom = propre(c.first_name || c.prenom, 40);
      commentaire = propre(c.comment || c.commentaire, 500);
      post = propre(c.post || c.post_id || c.reel || c.url, 300);
    } else return json(405, { error: 'methode' });

    const bien = await trouverBien(env, request, post);
    let texte, usage = null, origine = 'claude';
    try { ({ texte, usage } = await rediger(env, prenom, commentaire, bien)); }
    catch (e) { console.log('manychat-dm claude', e.message); texte = secours(prenom, bien); origine = 'secours'; }

    console.log('manychat-dm', JSON.stringify({ post: idReel(post), ref: bien && bien.ref, origine, usage }));
    return json(200, { ...blocManyChat(texte, bien), origine, usage });
  } catch (e) {
    console.log('manychat-dm', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
