/* /api/lead-tri — Étape 2 du cahier des charges API : tri et première réponse des leads (mails de portails, formulaires).

   Appelé par le script Gmail (Apps Script) du compte shawez@gravelin-immo.com, jamais par le public.
   Auth : en-tête X-Boss-Token = env.MANYCHAT_TOKEN (même secret que /api/manychat-dm).

   POST JSON : { id (Message-ID Gmail), de (adresse), nom_expediteur, objet, corps (texte brut), recu (ISO), source? }
   Réponse : {
     categorie : acheteur | vendeur | info | professionnel | spam,
     serieux : true/false, raison, nom, prenom, telephone, email, bien_ref, question,
     reponse : { objet, corps } | null,
     decision : envoyer | brouillon | attente | rien,  (+ raison_decision)
     notification : une ligne pour Shawez, origine, cout
   }
   Le script Gmail applique la décision : « envoyer » → envoi ; « brouillon » → brouillon Gmail ; « attente » → libellé,
   envoi au prochain créneau (lun-sam 8 h-20 h) ; « rien » → libellé seulement.

   Mode : tant que env.LEAD_MODE !== 'live', la décision n'est jamais « envoyer » (brouillon à la place).
   GET ?test=1 → essai sur un faux mail d'acheteur, sans rien écrire dans la base.
*/

const MODELE = 'claude-sonnet-5-5';
const PLAFOND_JOUR_USD = 0.5;
const PRIX_ENTREE = 2 / 1e6, PRIX_SORTIE = 10 / 1e6;
const SIGNATURE = 'Shawez Ali — agent immobilier, Gravelin Immo, Dijon — 07 67 57 92 28';
const INTERDITS = /\b(mandataire|gratuit|gratuite|gratuitement|ia|robot|automatique|automatiquement|claude|chatgpt|intelligence artificielle)\b/i;

// Règle 9 : personnes à ne jamais contacter (noms et adresses connues), et dossiers de Marion.
const JAMAIS_ADRESSES = ['dtallon@free.fr', 'taldom@free.fr'];
const JAMAIS_NOMS = ['tallon', 'beraudier', 'béraudier', 'jeannine', 'moretti', 'mangin', 'rachidy', 'manon b fifi', 'hyenne',
  'laura gil', 'vanryssel', 'jashari', 'banani'];

const json = (status, obj) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function egal(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const propre = (v, n) => String(v || '').replace(/\u0000/g, '').trim().slice(0, n);
const sansAccents = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function regle9(...champs) {
  const t = sansAccents(champs.join(' '));
  if (JAMAIS_ADRESSES.some(a => t.includes(a))) return true;
  return JAMAIS_NOMS.some(n => new RegExp(`\\b${sansAccents(n)}\\b`).test(t));
}

// Créneau d'envoi : lundi-samedi, 8 h-20 h, heure de Paris
function heureParis(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d).map(x => [x.type, x.value]));
  return { jour: `${p.year}-${p.month}-${p.day}`, semaine: p.weekday, heure: Number(p.hour) };
}
function creneauOuvert(d = new Date()) {
  const { semaine, heure } = heureParis(d);
  return !/^dim/i.test(semaine) && heure >= 8 && heure < 20;
}

async function annoncesCompactes(env, request) {
  try {
    const r = await env.ASSETS.fetch(new URL('/annonces.json', request.url));
    if (!r.ok) return { liste: '', index: {} };
    const a = (await r.json()).annonces || {};
    const index = {};
    const lignes = Object.entries(a).map(([ref, x]) => {
      const c = x.caracteristiques || {};
      const prix = c.prix_honoraires_inclus || (x.prix ? `${Number(x.prix).toLocaleString('fr-FR')} €` : '');
      index[ref] = { prix, commune: x.commune || '' };
      const type = (x.chemin || '').split('/')[3] || '';
      return `${ref} | ${type} ${c.nbpiecees ? c.nbpiecees + ' p.' : ''} | ${x.commune || ''} | ${c.surf_carrez || c.surf_habitable || ''} | ${prix}`;
    });
    return { liste: lignes.join('\n').slice(0, 12000), index };
  } catch (e) { console.log('lead-tri annonces', e.message); return { liste: '', index: {} }; }
}

const CONSIGNES = `Tu tries les demandes reçues par Shawez Ali, agent immobilier chez Gravelin Immo à Dijon (30 rue Bannelier),
et tu écris la première réponse par mail, en son nom, comme lui l'écrirait.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"categorie":"acheteur|vendeur|info|professionnel|spam","serieux":true|false,"raison":"une ligne",
 "prenom":"","nom":"","telephone":"","email":"","bien_ref":"référence de la liste ou vide","question":"ce que la personne demande, en une ligne",
 "reponse":{"objet":"","corps":""} ou null,"notification":"une ligne pour Shawez : prénom, bien, ce qu'il veut, téléphone"}

Règles de tri :
- acheteur : demande sur un bien en vente ou une recherche d'achat ; vendeur : veut vendre ou faire estimer ; info : autre question
  d'un particulier ; professionnel : notaire, banque, diagnostiqueur, autre agence, fournisseur ; spam : publicité, démarchage.
- serieux = true si la personne donne un téléphone, une disponibilité, un projet daté ou une question précise.
- Ne recopie que ce qui est écrit dans le mail : un champ absent reste vide. Ne devine jamais un téléphone ou un nom.

Règles de la réponse (seulement pour acheteur, vendeur, info ; null pour professionnel et spam) :
- Vouvoiement, 5 à 8 lignes, chaleureux, simple, humain, sans formule toute faite ni superlatif.
- Reprends la question exacte de la personne et réponds-y avec les seules données de la liste des biens (prix tel qu'affiché).
- Une seule question à la fin pour obtenir un rendez-vous : visite (acheteur) ou estimation sur place offerte (vendeur),
  en proposant d'appeler ou de passer, sans donner d'heure précise.
- Vendeur : jamais de prix ni de fourchette. Jamais l'adresse exacte d'un bien. Jamais de nom d'un autre client.
- Interdits : « mandataire », « gratuit », « IA », « robot », « automatique », « Claude ». Dis « agent immobilier », « offert ».
- Termine le corps par : ${SIGNATURE}
- Objet : « Re: » + l'objet reçu.`;

async function analyser(env, mail, biens) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('cle absente');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.CLAUDE_MODELE_LEADS || MODELE,
      max_tokens: 1500,
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low' },
      system: CONSIGNES,
      messages: [{
        role: 'user',
        content: `Biens en vente (référence | type | commune | surface | prix affiché) :\n${biens || '(liste indisponible)'}\n\n` +
          `Mail reçu\nDe : ${mail.nom_expediteur} <${mail.de}>\nObjet : ${mail.objet}\nSource : ${mail.source || 'inconnue'}\n\n${mail.corps}`,
      }],
    }),
  });
  if (!r.ok) throw new Error(`api ${r.status} ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const brut = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  const debut = brut.indexOf('{'), fin = brut.lastIndexOf('}');
  let res = null;
  try { res = JSON.parse(brut.slice(debut, fin + 1)); } catch (e) { /* traité plus bas */ }
  return { res, usage: d.usage || null, stop: d.stop_reason || null };
}

// Contrôle de la réponse avant tout envoi. Renvoie la raison du refus ou null.
function controle(rep, bienPrix) {
  if (!rep || !rep.corps) return null;
  const t = `${rep.objet || ''}\n${rep.corps}`;
  if (INTERDITS.test(t)) return 'vocabulaire';
  if (/\b\d{1,3}\s?,?\s?(bis|ter)?\s*(rue|avenue|bd|boulevard|place|impasse|allée|chemin|route)\b/i.test(t.replace('30 rue Bannelier', ''))) return 'adresse';
  const chiffres = v => String(v || '').replace(/\D/g, '');
  const prix = chiffres(bienPrix);
  const montants = (t.match(/\d[\d\s. ]*\s?(€|euros|k€)/gi) || []).map(chiffres);
  if (montants.some(m => m && m !== prix)) return 'montant';
  if (rep.corps.length > 2000) return 'longueur';
  return null;
}

async function journal(env) {
  if (!env.DB) return null;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads_tri (
    id TEXT PRIMARY KEY, recu TEXT, de TEXT, categorie TEXT, serieux INTEGER, bien_ref TEXT, telephone TEXT,
    decision TEXT, raison TEXT, origine TEXT, entree INTEGER, sortie INTEGER, cout REAL, jour TEXT, cree TEXT)`).run();
  return env.DB;
}

export async function onRequest({ request, env }) {
  try {
    if (!egal(request.headers.get('X-Boss-Token') || '', env.MANYCHAT_TOKEN || '')) return json(401, { error: 'acces' });

    let mail, test = false;
    if (request.method === 'GET') {
      const u = new URL(request.url);
      if (!u.searchParams.get('test')) return json(200, { ready: !!env.ANTHROPIC_API_KEY, mode: env.LEAD_MODE === 'live' ? 'live' : 'test', creneau: creneauOuvert() });
      test = true;
      mail = {
        id: `test-${Date.now()}`, de: 'lucie.test@example.com', nom_expediteur: 'Lucie Martin', source: 'Leboncoin',
        objet: 'Demande sur votre annonce appartement Chevigny-Saint-Sauveur',
        corps: u.searchParams.get('c') || "Bonjour, l'appartement de Chevigny est-il toujours disponible ? Je suis intéressée pour une visite samedi. Mon numéro : 06 00 00 00 00. Lucie",
        recu: new Date().toISOString(),
      };
    } else if (request.method === 'POST') {
      const c = await request.json().catch(() => ({}));
      mail = {
        id: propre(c.id, 200), de: propre(c.de, 200).toLowerCase(), nom_expediteur: propre(c.nom_expediteur, 120),
        objet: propre(c.objet, 300), corps: propre(c.corps, 8000), recu: propre(c.recu, 40), source: propre(c.source, 60),
      };
      if (!mail.id || !mail.corps) return json(400, { error: 'champs' });
    } else return json(405, { error: 'methode' });

    const base = await journal(env).catch(e => { console.log('lead-tri journal', e.message); return null; });
    const { jour } = heureParis();
    if (base && !test) {
      const deja = await base.prepare('SELECT decision FROM leads_tri WHERE id = ?1').bind(mail.id).first();
      if (deja) return json(200, { decision: 'rien', raison_decision: 'doublon', categorie: null, reponse: null });
    }

    // Règle 9 avant tout appel
    if (regle9(mail.de, mail.nom_expediteur, mail.corps.slice(-400))) {
      if (base && !test) await base.prepare('INSERT OR IGNORE INTO leads_tri (id, recu, de, decision, raison, origine, cout, jour, cree) VALUES (?1,?2,?3,?4,?5,?6,0,?7,?8)')
        .bind(mail.id, mail.recu, mail.de, 'rien', 'regle9', 'regle9', jour, new Date().toISOString()).run();
      return json(200, { decision: 'rien', raison_decision: 'regle9', categorie: null, reponse: null, notification: '' });
    }

    let depense = 0;
    if (base) {
      const r = await base.prepare('SELECT COALESCE(SUM(cout), 0) AS c FROM leads_tri WHERE jour = ?1').bind(jour).first();
      depense = (r && r.c) || 0;
    }
    if (depense >= PLAFOND_JOUR_USD) {
      return json(200, { decision: 'brouillon', raison_decision: 'plafond', categorie: null, reponse: null,
        notification: `Nouveau mail de ${mail.nom_expediteur || mail.de} : « ${mail.objet} » (plafond du jour atteint, à traiter à la main)` });
    }

    const { liste, index } = await annoncesCompactes(env, request);
    let res = null, usage = null, origine = 'claude';
    try {
      ({ res, usage } = await analyser(env, mail, liste));
      if (!res || !res.categorie) origine = 'secours_json';
    } catch (e) {
      console.log('lead-tri claude', e.message);
      origine = ('secours_api:' + String(e.message || '').replace(/sk-[\w-]+/g, '***')).slice(0, 160);
    }
    const cout = usage ? (usage.input_tokens || 0) * PRIX_ENTREE + (usage.output_tokens || 0) * PRIX_SORTIE : 0;

    let decision, raisonDecision;
    const ref = res && res.bien_ref && index[res.bien_ref] ? res.bien_ref : '';
    if (!res || !res.categorie) { decision = 'brouillon'; raisonDecision = 'analyse_impossible'; }
    else if (!res.reponse || ['professionnel', 'spam'].includes(res.categorie)) { decision = 'rien'; raisonDecision = res.categorie; }
    else {
      const refus = controle(res.reponse, ref ? index[ref].prix : '');
      if (refus) { decision = 'brouillon'; raisonDecision = `controle_${refus}`; }
      else if (env.LEAD_MODE !== 'live') { decision = 'brouillon'; raisonDecision = 'mode_test'; }
      else if (!creneauOuvert()) { decision = 'attente'; raisonDecision = 'hors_creneau'; }
      else { decision = 'envoyer'; raisonDecision = 'ok'; }
    }

    if (base && !test) {
      await base.prepare(`INSERT OR IGNORE INTO leads_tri VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`)
        .bind(mail.id, mail.recu, mail.de, res ? res.categorie || '' : '', res && res.serieux ? 1 : 0, ref, res ? propre(res.telephone, 30) : '',
          decision, raisonDecision, origine, usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, cout, jour, new Date().toISOString())
        .run().catch(e => console.log('lead-tri insert', e.message));
    }

    return json(200, {
      categorie: res ? res.categorie : null, serieux: !!(res && res.serieux), raison: res ? res.raison || '' : '',
      prenom: res ? res.prenom || '' : '', nom: res ? res.nom || '' : '', telephone: res ? res.telephone || '' : '',
      email: res ? res.email || mail.de : mail.de, bien_ref: ref, question: res ? res.question || '' : '',
      reponse: res && res.reponse ? res.reponse : null,
      decision, raison_decision: raisonDecision,
      notification: res && res.notification ? res.notification : `Nouveau mail de ${mail.nom_expediteur || mail.de} : « ${mail.objet} »`,
      origine, cout: Math.round(cout * 1e5) / 1e5, depense_jour: Math.round((depense + cout) * 1e4) / 1e4,
    });
  } catch (e) {
    console.log('lead-tri', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
