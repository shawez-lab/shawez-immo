/* Worker « lead-redacteur » — Lead éclair (Shawez Ali, Gravelin Immo).
 *
 * Rôle : reçoit le strict minimum d'une demande (prénom, ville, rue, type de bien, projet, délai, message)
 * et renvoie un WhatsApp unique (≤ 60 mots) et un mail unique (≤ 90 mots), écrits dans la voix de Shawez,
 * avec une info vraie sur le secteur (ventes DVF, aucun prix) et la preuve sociale de l'agence.
 * Il n'envoie RIEN lui-même : c'est le script Google qui décide et envoie.
 *
 * Gratuit, sans dépassement possible :
 *  - modèle Workers AI @cf/google/gemma-4-26b-a4b-it (disponible sur l'offre Workers Free) ;
 *  - quota gratuit Cloudflare : 10 000 neurones / jour (remis à zéro à 0 h UTC). Sur l'offre Free, au-delà,
 *    Cloudflare refuse (erreur 3036) : rien n'est facturé. En plus, ce Worker s'arrête de lui-même à
 *    PLAFOND_NEURONES (7 000 par défaut) et à PLAFOND_APPELS par jour, compteur tenu dans la D1.
 *  - quota atteint, erreur, ou texte refusé par le contrôle → { ok:false } et le script prend la Bible.
 *
 * Liaisons (bindings) : AI (Workers AI), DB (D1 « espace-estimation », table lead_redacteur_jour).
 * Secret : LEAD_KEY (en-tête Authorization: Bearer <LEAD_KEY>).
 * Variables : DVF_BASE (https://shawez-immo.com/donnees-dvf), PLAFOND_NEURONES, PLAFOND_APPELS.
 */

const MODELE = '@cf/google/gemma-4-26b-a4b-it';
// tarif officiel du modèle (page Pricing Workers AI, mise à jour du 1/10/2026)
const NEURONES_ENTREE = 9091 / 1e6;
const NEURONES_SORTIE = 27273 / 1e6;
const PREUVE = 'Gravelin Immo 4,8/5 sur 137 avis Google';
const TEL = '07 67 57 92 28';

// ---------------------------------------------------------------- contrôle automatique (le même que dans le script)
const INTERDITS = [
  /\bI\.?\s?A\b/, /intelligence artificielle/i, /\bclaude\b/i, /automati/i, /mandataire/i, /\brobot/i,
  /chatgpt|gpt\b|gemma|gemini/i, /n'h[ée]sitez pas/i, /d[ée]couvrez/i, /incontournable/i, /sublime/i,
  /p[ée]pite/i, /coup de c(œ|oe)ur/i, /meilleur/i, /n°\s?1|num[ée]ro un|\bleader\b/i, /gratuit/i,
  /instantan[ée]/i, /garanti/i, /dans un monde o[uù]/i, /\bprix\b/i, /\beuros?\b/i, /€/, /\bk€|\d\s?k\b/i,
  /\b\d{1,3}(?:[\s.  ]\d{3})+\b/, /\b\d{5,}\b/, /\b(?!19\d\d\b|20\d\d\b)\d{4}\b/, /!{2,}/,
];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const mots = (t) => (String(t).trim().match(/[^\s]+/g) || []).length;
const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-']/g, ' ');

export function controler(texte, { prenom, ville, max, preuve = true }) {
  const e = [];
  const t = String(texte || '');
  if (!t.trim()) e.push('vide');
  if (mots(t) > max) e.push(`trop long (${mots(t)} mots > ${max})`);
  if (/[{}\[\]<>]/.test(t)) e.push('accolade ou crochet');
  if (EMOJI.test(t)) e.push('emoji');
  for (const r of INTERDITS) if (r.test(t.replaceAll(TEL, ''))) e.push(`interdit : ${r.source}`);
  if (prenom) {
    if (!sansAccent(t).includes(sansAccent(prenom))) e.push('prénom absent');
    const m = t.match(/^(?:Bonjour|Bonsoir|Hello)\s+([A-ZÀ-ÖØ-Ý][\p{L}'-]+)/u);
    if (m && sansAccent(m[1]) !== sansAccent(prenom.split(/\s+/)[0])) e.push(`mauvais prénom (${m[1]})`);
  }
  if (ville && !sansAccent(t).includes(sansAccent(ville).replace(/\s*\(.*\)$/, '').trim())) e.push('ville absente');
  if (preuve && !/4,8\/5/.test(t)) e.push('preuve sociale absente');
  const autresTel = (t.match(/0\d(?:[\s.]?\d{2}){4}/g) || []).filter((n) => n.replace(/\D/g, '') !== '0767579228');
  if (autresTel.length) e.push('numéro inconnu');
  if ((t.match(/\?/g) || []).length > 2) e.push('trop de questions');
  return { ok: e.length === 0, erreurs: e };
}

// ---------------------------------------------------------------- données minimales
const nettoie = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
function minimal(b) {
  let message = nettoie(b.message, 1200)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '(e-mail)')
    .replace(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, '(téléphone)');
  return {
    prenom: nettoie(b.prenom, 40).replace(/[^\p{L}' -]/gu, ''),
    ville: nettoie(b.ville, 60),
    rue: nettoie(b.rue, 80).replace(/^\d+\s*(bis|ter)?\s*,?\s*/i, ''), // jamais le numéro de la maison
    code_postal: nettoie(b.code_postal, 5).replace(/\D/g, ''),
    type_bien: nettoie(b.type_bien, 40),
    projet: nettoie(b.projet, 30) || 'vente',
    delai: nettoie(b.delai, 40),
    source: nettoie(b.source, 40),
    annonce: nettoie(b.annonce, 120), // titre public de l'annonce, si le lead vient d'un portail
    message,
  };
}

// ---------------------------------------------------------------- info secteur (DVF, aucun prix)
function distance(lat1, lon1, lat2, lon2) {
  const k = Math.PI / 180;
  const x = (lon2 - lon1) * k * Math.cos(((lat1 + lat2) / 2) * k);
  const y = (lat2 - lat1) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export async function secteur(env, d) {
  try {
    if (!d.ville) return null;
    if (/commerce|fonds|local|bureau|murs|bail|terrain|parking|garage|immeuble/i.test(`${d.type_bien} ${d.annonce}`)) return null; // DVF ici = logements seulement
    const q = d.rue ? `${d.rue} ${d.ville}` : d.ville;
    const u = new URL('https://api-adresse.data.gouv.fr/search/');
    u.searchParams.set('q', q);
    u.searchParams.set('limit', '1');
    if (!d.rue) u.searchParams.set('type', 'municipality');
    if (d.code_postal) u.searchParams.set('postcode', d.code_postal);
    const g = await (await fetch(u, { cf: { cacheTtl: 86400 } })).json();
    const f = g.features?.[0];
    if (!f || f.properties.score < 0.5) return null;
    const [lon, lat] = f.geometry.coordinates;
    const cp = f.properties.postcode || '';
    if (!cp.startsWith('21')) return null;
    const base = env.DVF_BASE || 'https://shawez-immo.com/donnees-dvf';
    const idx = await (await fetch(`${base}/index.json`, { cf: { cacheTtl: 86400 } })).json();
    const maison = /maison|villa|pavillon|long[eè]re|ferme/i.test(d.type_bien);
    const appart = /appart|studio|t\d|f\d|duplex|loft/i.test(d.type_bien);
    const t = maison ? 1 : appart ? 0 : null;
    const rayon = f.properties.type === 'municipality' ? 1500 : (t === 1 ? 800 : 400);
    const pas = idx.tuile;
    const dLat = rayon / 111320, dLon = rayon / (111320 * Math.cos((lat * Math.PI) / 180));
    let n = 0, dernier = 0;
    for (let x = Math.floor((lon - dLon) / pas); x <= Math.floor((lon + dLon) / pas); x++)
      for (let y = Math.floor((lat - dLat) / pas); y <= Math.floor((lat + dLat) / pas); y++) {
        const nom = `${x}_${y}`;
        if (!idx.tuiles.includes(nom)) continue;
        const v = await (await fetch(`${base}/t/${nom}.json`, { cf: { cacheTtl: 86400 } })).json();
        for (const s of v) {
          if (t !== null && s[2] !== t) continue;
          if (distance(lat, lon, s[0], s[1]) > rayon) continue;
          n++; if (s[5] > dernier) dernier = s[5];
        }
      }
    if (n < 3) return null;
    const quoi = t === 1 ? 'maisons' : t === 0 ? 'appartements' : 'logements';
    const voie = f.properties.street || d.rue;
    const de = /^(rue|place|route|avenue|all[ée]e|impasse|esplanade|cour|promenade|r[ée]sidence)\b/i.test(voie)
      ? (/^[aeiouyéè]/i.test(voie) ? "de l'" : 'de la ') : (/^(boulevard|chemin|quai|faubourg|cours|square|clos|parc|mail|passage|quartier)\b/i.test(voie) ? 'du ' : '');
    const ou = f.properties.type === 'municipality' ? `à ${f.properties.city}` : (de ? `autour ${de}${voie}` : `autour de ${voie}`);
    const an0 = idx.annees[0], an1 = idx.annees[idx.annees.length - 1];
    const nb = n > 900 ? 'plus de 900' : String(n);
    const der = dernier ? ` La plus récente date de ${MOIS[(dernier % 100) - 1]} ${Math.floor(dernier / 100)}.` : '';
    return {
      phrase: `${an0}-${an1} : ${nb} ${quoi} ${t === 1 ? 'vendues' : 'vendus'} ${ou} (DVF, ventes enregistrées chez les notaires).${der}`,
      ventes: n, rayon, ville: f.properties.city, source: 'DVF Etalab/DGFiP',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- quota (compteur D1, jour UTC comme Cloudflare)
const jour = () => new Date().toISOString().slice(0, 10);
async function compteur(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS lead_redacteur_jour (jour TEXT PRIMARY KEY, appels INTEGER NOT NULL DEFAULT 0, neurones REAL NOT NULL DEFAULT 0, replis INTEGER NOT NULL DEFAULT 0)').run();
  return (await env.DB.prepare('SELECT appels, neurones, replis FROM lead_redacteur_jour WHERE jour = ?').bind(jour()).first()) || { appels: 0, neurones: 0, replis: 0 };
}
async function noter(env, neurones, repli) {
  await env.DB.prepare('INSERT INTO lead_redacteur_jour (jour, appels, neurones, replis) VALUES (?, 1, ?, ?) ON CONFLICT(jour) DO UPDATE SET appels = appels + 1, neurones = neurones + excluded.neurones, replis = replis + excluded.replis')
    .bind(jour(), neurones, repli ? 1 : 0).run();
}

// ---------------------------------------------------------------- rédaction
const CONSIGNES = `Tu écris à la place de Shawez Ali, agent immobilier chez Gravelin Immo, 30 rue Bannelier à Dijon (${TEL}). Il répond lui-même, vite, à une personne qui vient de lui écrire.
Voix de Shawez : vouvoiement, phrases courtes et simples, chaleureux, direct, sobre. Comme un SMS d'un pro du quartier. Pas de formule toute faite, pas de liste, pas d'emoji, pas de point d'exclamation en série, pas de tirets en série.
Obligatoire dans CHAQUE texte :
1. Commencer par « Bonjour <prénom exact>, » (si pas de prénom : « Bonjour, »).
2. Prouver qu'il a lu SA demande : reprendre la ville, la rue si donnée, le type de bien, le délai et un ou deux mots de son message.
3. Glisser l'info secteur fournie, telle quelle sur le fond (chiffre de ventes et période), sans rien inventer d'autre.
4. Glisser « ${PREUVE} ».
Si c'est un acheteur (projet achat) : parler de l'annonce qui l'intéresse et de sa recherche, sans jamais redonner le montant de l'annonce ; s'il pose des questions précises, dire qu'il aura les réponses pendant l'appel.
5. Finir par UNE seule étape simple : proposer un appel de 10 minutes aujourd'hui ou demain, en demandant le moment qui l'arrange.
Interdits absolus : tout prix, montant, valeur, fourchette, « € », le mot « prix », toute promesse de délai ou de résultat, « meilleur », « gratuit », « garanti », « automatique », « mandataire », « IA », « robot », le nom d'un outil, tout chiffre inventé, toute adresse e-mail.
WhatsApp : 60 mots maximum, signé « Shawez ». Mail : 90 mots maximum, objet court (8 mots max) qui cite la ville, signé « Shawez Ali — Gravelin Immo — ${TEL} ».
Réponds UNIQUEMENT en JSON : {"whatsapp":"...","objet":"...","mail":"..."}`;

function demande(d, info) {
  return [
    `Prénom : ${d.prenom || '(inconnu)'}`,
    `Projet : ${d.projet}`,
    `Ville : ${d.ville || '(inconnue)'}`,
    d.rue ? `Rue : ${d.rue}` : null,
    `Type de bien : ${d.type_bien || '(non précisé)'}`,
    `Délai : ${d.delai || '(non précisé)'}`,
    `Arrivée par : ${d.source || '(non précisé)'}`,
    d.annonce ? `Annonce qui l'intéresse : ${d.annonce}` : null,
    `Son message, mot pour mot : « ${d.message || '(aucun message)'} »`,
    `Info secteur à utiliser : ${info ? info.phrase : '(aucune : ne cite aucun chiffre de marché)'}`,
  ].filter(Boolean).join('\n');
}

function lireJson(r) {
  const brut = typeof r === 'string' ? r : r?.choices?.[0]?.message?.content ?? r?.response ?? '';
  if (typeof brut === 'object') return brut;
  const m = String(brut).match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function rediger(env, d, info, retour) {
  const messages = [
    { role: 'system', content: CONSIGNES },
    { role: 'user', content: demande(d, info) },
  ];
  if (retour) messages.push({ role: 'user', content: `Ta première version a été refusée par le contrôle : ${retour}. Réécris en corrigeant, mêmes règles.` });
  const r = await env.AI.run(MODELE, {
    messages,
    max_completion_tokens: 600,
    temperature: 0.7,
    chat_template_kwargs: { enable_thinking: false },
    response_format: { type: 'json_object' },
  });
  const u = r?.usage || {};
  const neurones = (u.prompt_tokens || 1500) * NEURONES_ENTREE + (u.completion_tokens || 600) * NEURONES_SORTIE;
  return { sortie: lireJson(r), neurones };
}

const repondre = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function egal(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(x, y) : new Uint8Array(x).every((v, i) => v === new Uint8Array(y)[i]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cle = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.LEAD_KEY || !cle || !(await egal(cle, env.LEAD_KEY))) return repondre({ ok: false, raison: 'cle' }, 401);

    if (request.method === 'GET' && url.pathname === '/etat') {
      const c = await compteur(env);
      return repondre({ ok: true, modele: MODELE, jour_utc: jour(), ...c, plafond_neurones: Number(env.PLAFOND_NEURONES || 7000), plafond_appels: Number(env.PLAFOND_APPELS || 200) });
    }
    if (request.method !== 'POST' || url.pathname !== '/rediger') return repondre({ ok: false, raison: 'route' }, 404);

    const t0 = Date.now();
    let b;
    try { b = await request.json(); } catch { return repondre({ ok: false, raison: 'json' }, 400); }
    const d = minimal(b);
    const info = await secteur(env, d);

    const c = await compteur(env);
    const plafN = Number(env.PLAFOND_NEURONES || 7000), plafA = Number(env.PLAFOND_APPELS || 200);
    if (c.neurones >= plafN || c.appels >= plafA) return repondre({ ok: false, raison: 'quota', secteur: info, ms: Date.now() - t0 });

    let neurones = 0, dernier = null, erreurs = [];
    for (let essai = 0; essai < 2; essai++) {
      try {
        const r = await rediger(env, d, info, essai ? erreurs.join(' ; ') : null);
        neurones += r.neurones;
        dernier = r.sortie;
        if (!dernier) { erreurs = ['réponse illisible']; continue; }
        const cw = controler(dernier.whatsapp, { prenom: d.prenom, ville: d.ville, max: 60 });
        const cm = controler(`${dernier.objet || ''}\n${dernier.mail}`, { prenom: d.prenom, ville: d.ville, max: 90 + 8 });
        const cm2 = controler(dernier.mail, { prenom: d.prenom, ville: d.ville, max: 90 });
        erreurs = [...cw.erreurs.map((e) => `WhatsApp : ${e}`), ...cm.erreurs.concat(cm2.erreurs).filter((e, i, a) => a.indexOf(e) === i).map((e) => `mail : ${e}`)];
        if (!erreurs.length) {
          await noter(env, neurones, false);
          return repondre({ ok: true, origine: 'redacteur', whatsapp: dernier.whatsapp.trim(), mail: { objet: String(dernier.objet || '').trim(), texte: dernier.mail.trim() }, secteur: info, neurones: Math.round(neurones), ms: Date.now() - t0 });
        }
      } catch (e) {
        const msg = String(e?.message || e);
        if (/3036|daily free allocation|5035|403/.test(msg)) { await noter(env, neurones, true); return repondre({ ok: false, raison: 'quota', secteur: info, ms: Date.now() - t0 }); }
        erreurs = ['erreur du modèle'];
      }
    }
    await noter(env, neurones, true);
    return repondre({ ok: false, raison: 'controle', erreurs, secteur: info, neurones: Math.round(neurones), ms: Date.now() - t0 });
  },
};
