import { requeteModele } from '../_lib/modele.js';
import { listePrivee } from '../_lib/exclusions-privees.js';

/* /api/lead-tri — Étape 2 du cahier des charges API : tri et première réponse des leads (mails de portails, formulaires).

   Appelé par le script Gmail (Apps Script) du compte shawez@gravelin-immo.com, jamais par le public.
   Auth : en-tête X-Boss-Token = env.MANYCHAT_TOKEN (même secret que /api/manychat-dm).

   POST JSON : { id (Message-ID Gmail du MESSAGE, pas du fil), de (adresse du prospect : Reply-To ou adresse extraite, jamais
   la notification de la plateforme), nom_expediteur, objet, corps (texte brut), recu (ISO), source?, essai? (true = rien journalisé) }
   Reprise : un message en « attente », ou dont l'analyse a échoué / a buté sur le plafond, est retraité au passage suivant.
   Réponse : {
     categorie : acheteur | vendeur | info | professionnel | spam,
     serieux : true/false, raison, nom, prenom, telephone, email, bien_ref, question,
     reponse : { objet, corps } | null,
     decision : envoyer | brouillon | attente | rien,  (+ raison_decision)
     notification : une ligne pour Shawez, origine, cout
   }
   Le script Gmail applique la décision : « envoyer » → envoi ; « brouillon » → brouillon Gmail ; « attente » → libellé,
   envoi au prochain créneau (lun-sam 8 h-20 h) ; « rappel » → prospect sans e-mail fiable : notification « à rappeler » ;
   « rien » → libellé seulement. Puis il CONFIRME : POST {action:'confirme', id, applique:'brouillon|envoye|attente|rappel|rien'}.
   Tant que ce n'est pas confirmé, un nouvel appel renvoie la même réponse (conservée), sans nouvel appel facturé.

   Mode : tant que env.LEAD_MODE !== 'live', la décision n'est jamais « envoyer » (brouillon à la place).
   GET ?test=1 → essai sur un faux mail d'acheteur, sans rien écrire dans la base.
*/

const MODELE = 'claude-sonnet-5-5';
const PLAFOND_JOUR_USD = 0.5;
const PRIX_ENTREE = 2 / 1e6, PRIX_SORTIE = 10 / 1e6;
const SIGNATURE = 'Shawez Ali — agent immobilier, Gravelin Immo, Dijon — 07 67 57 92 28';
const NON_PROUVES = /\b(rare|unique|exceptionnel(le)?|id[ée]al(e)?|incroyable)\b/i;
const INTERDITS = /\b(mandataire|gratuit|gratuite|gratuitement|ia|robot|automatique|automatiquement|claude|chatgpt|intelligence artificielle)\b/i;

// Règle 9 : personnes à ne jamais contacter (noms et adresses connues), et dossiers de Marion.



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

function regle9(exclusions, ...champs) {
  const t = sansAccents(champs.join(' '));
  if (exclusions.adresses.some(a => t.includes(a))) return true;
  return exclusions.noms.some(n => new RegExp(`\\b${sansAccents(n)}\\b`).test(t));
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
 "prenom":"","nom":"","telephone":"","email":"","bien_ref":"référence de la liste ou vide","ref_citee":"référence ou nom cité dans le mail, ou vide","question":"ce que la personne demande, en une ligne",
 "reponse":{"objet":"","corps":""} ou null,"notification":"une ligne pour Shawez : prénom, bien, ce qu'il veut, téléphone"}

Règles de tri :
- acheteur : demande sur un bien en vente ou une recherche d'achat ; vendeur : veut vendre ou faire estimer ; info : autre question
  d'un particulier ; professionnel : notaire, banque, diagnostiqueur, autre agence, fournisseur ; spam : publicité, démarchage.
- serieux = true si la personne donne un téléphone, une disponibilité, un projet daté ou une question précise.
- Ne recopie que ce qui est écrit dans le mail : un champ absent reste vide. Ne devine jamais un téléphone ou un nom.
- bien_ref : la référence de la liste qui correspond au bien demandé. Si le mail cite une référence (« réf. 498 ») ou un nom
  de commerce absent de la liste, mets-la dans "ref_citee" et laisse bien_ref vide. Recopie les noms propres EXACTEMENT
  (nom du commerce, de la rue, de la personne), sans jamais les modifier.
- Une demande sur un local, un fonds de commerce ou sa disponibilité est « acheteur », pas « info ».

Règles de la réponse (TOUJOURS une réponse pour acheteur, vendeur, info, même si le mail ne donne qu'un téléphone ;
null seulement pour professionnel et spam) :
- Vouvoiement, 4 à 6 lignes courtes, factuel, chaleureux, humain, sans formule toute faite ni superlatif.
- Pas d'excuses, pas de promesse d'action future (« je reviens vers vous très vite », « je vais me procurer », « je vérifie
  et je vous dis ») : une réponse utile maintenant, puis la question de rendez-vous. Si une information manque, dis
  simplement qu'on en parlera au téléphone ou sur place.
- Écris comme Shawez écrit sur son téléphone : phrases simples et naturelles, AUCUNE parenthèse, aucun tiret de liste, aucun deux-points d'énumération, aucune formule administrative (« honoraires à la charge du vendeur », « n'hésitez pas »). Si un détail compte, glisse-le dans une phrase normale.
- Reprends la question exacte de la personne et réponds-y avec les seules données de la liste des biens (prix tel qu'affiché).
- Si le bien demandé est absent de la liste (ref_citee hors liste : vendu, sous offre ou retiré), ne propose ni visite
  ni document de ce bien : remercie, dis qu'il n'est plus disponible à la visite pour le moment, et propose de parler
  de sa recherche pour lui présenter des biens qui y correspondent.
- Aucun qualificatif non prouvé par les données (« rare », « unique », « exceptionnel », « idéal »).
- UNE seule question en tout, à la fin, pour obtenir un rendez-vous : visite (acheteur) ou estimation sur place offerte (vendeur),
  en proposant d'appeler ou de passer, sans donner d'heure précise.
- Vendeur : jamais de prix ni de fourchette. Jamais l'adresse exacte d'un bien. Jamais de nom d'un autre client.
- Interdits : « mandataire », « gratuit », « IA », « robot », « automatique », « Claude ». Dis « agent immobilier », « offert ».
- Termine le corps par : ${SIGNATURE}
- Objet : « Re: » + l'objet reçu.`;

async function analyser(env, mail, biens) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('cle absente');
  const r = await requeteModele('https://api.anthropic.com/v1/messages', {
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
  if (NON_PROUVES.test(t)) return 'qualificatif';
  if (/[()]/.test(rep.corps)) return 'parentheses';
  if ((rep.corps.match(/\?/g) || []).length > 1) return 'questions';
  if (/je reviens vers vous|je vais me procurer|je vais vérifier|je vous recontacte très vite/i.test(t)) return 'promesse';
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
  // Réponse conservée jusqu'à confirmation par le script Gmail (aucune demande perdue, aucun nouvel appel facturé)
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS leads_reponses (id TEXT PRIMARY KEY, resultat TEXT, cree TEXT)').run();
  // Coûts des essais, comptés à part (jamais mélangés au journal des vrais leads)
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS leads_essais (jour TEXT, cout REAL, cree TEXT)').run();
  // Journal des coûts en ajout seul (plafond du jour, alerte mensuelle) : jamais modifié ni remplacé
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS leads_couts (jour TEXT, id TEXT, cout REAL, essai INTEGER, cree TEXT)').run();
  return env.DB;
}

export async function onRequest({ request, env }) {
  try {
    if (!egal(request.headers.get('X-Boss-Token') || '', env.MANYCHAT_TOKEN || '')) return json(401, { error: 'acces' });

    let exclusions;
    try {
      exclusions = {
        adresses: listePrivee(env, 'REGLE9_LEAD_ADRESSES'),
        noms: listePrivee(env, 'REGLE9_LEAD_NOMS', { motifs: true }),
      };
    } catch {
      return json(503, { error: 'configuration_exclusions', decision: 'rien', reponse: null, notification: '' });
    }


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
      if (c.action === 'confirme') {
        // Le script confirme que la décision a bien été appliquée dans Gmail (brouillon créé, envoyé, libellé posé…)
        const id = propre(c.id, 200), applique = propre(c.applique, 30);
        if (!id || !applique) return json(400, { error: 'champs' });
        const b = await journal(env);
        // « attente » n'est qu'un libellé provisoire : le message reste repris au prochain créneau
        const raison = applique === 'attente' ? 'attente_libellee' : `applique:${applique}`;
        const r = await b.prepare('UPDATE leads_tri SET raison = ?2 WHERE id = ?1').bind(id, raison).run();
        return json(200, { ok: true, modifie: (r.meta && r.meta.changes) || 0 });
      }
      mail = {
        id: propre(c.id, 200), de: propre(c.de, 200).toLowerCase(), nom_expediteur: propre(c.nom_expediteur, 120),
        objet: propre(c.objet, 300), corps: propre(c.corps, 8000), recu: propre(c.recu, 40), source: propre(c.source, 60),
      };
      if (!mail.id || !mail.corps) return json(400, { error: 'champs' });
      // Essai : analyse complète mais rien n'est journalisé (l'id réel n'est pas « consommé »)
      if (c.essai === true) test = true;
    } else return json(405, { error: 'methode' });

    const base = await journal(env).catch(e => { console.log('lead-tri journal', e.message); return null; });
    const { jour } = heureParis();
    if (base && !test) {
      // Déjà confirmé par le script (applique:…) ou décision « rien » → doublon.
      // Analysé mais pas confirmé → on renvoie la réponse conservée, sans nouvel appel facturé (attente : créneau réévalué).
      // Échec d'analyse ou plafond → nouvelle analyse.
      const deja = await base.prepare('SELECT decision, raison FROM leads_tri WHERE id = ?1').bind(mail.id).first();
      if (deja) {
        const confirme = String(deja.raison || '').startsWith('applique:');
        if (confirme || deja.decision === 'rien') return json(200, { decision: 'rien', raison_decision: 'doublon', decision_initiale: deja.decision, categorie: null, reponse: null });
        if (!['analyse_impossible', 'plafond'].includes(deja.raison)) {
          const g = await base.prepare('SELECT resultat FROM leads_reponses WHERE id = ?1').bind(mail.id).first();
          if (g && g.resultat) {
            const r = JSON.parse(g.resultat);
            if (r.decision === 'attente' && creneauOuvert()) { r.decision = 'envoyer'; r.raison_decision = 'reprise_creneau'; }
            if (r.decision === 'envoyer' && env.LEAD_MODE !== 'live') { r.decision = 'brouillon'; r.raison_decision = 'mode_test'; }
            return json(200, { ...r, reprise: true, cout: 0 });
          }
        }
      }
    }

    // Règle 9 avant tout appel
    if (regle9(exclusions, mail.de, mail.nom_expediteur, mail.corps.slice(-400))) {
      if (base && !test) await base.prepare('INSERT OR IGNORE INTO leads_tri (id, recu, de, decision, raison, origine, cout, jour, cree) VALUES (?1,?2,?3,?4,?5,?6,0,?7,?8)')
        .bind(mail.id, mail.recu, mail.de, 'rien', 'regle9', 'regle9', jour, new Date().toISOString()).run();
      return json(200, { decision: 'rien', raison_decision: 'regle9', categorie: null, reponse: null, notification: '' });
    }

    let depense = 0;
    if (base) {
      const r = await base.prepare('SELECT COALESCE(SUM(cout), 0) AS c FROM leads_couts WHERE jour = ?1').bind(jour).first();
      depense = (r && r.c) || 0;
    }
    if (depense >= PLAFOND_JOUR_USD) {
      if (base && !test) await base.prepare(`INSERT INTO leads_tri (id, recu, de, decision, raison, origine, cout, jour, cree) VALUES (?1,?2,?3,?4,?5,?6,0,?7,?8)
          ON CONFLICT(id) DO UPDATE SET decision = excluded.decision, raison = excluded.raison`)
        .bind(mail.id, mail.recu, mail.de, 'brouillon', 'plafond', 'plafond', jour, new Date().toISOString()).run().catch(() => {});
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
    const refCitee = res ? propre(res.ref_citee, 80) : '';
    const emailFiable = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(mail.de || '');
    if (!res || !res.categorie) { decision = 'brouillon'; raisonDecision = 'analyse_impossible'; }
    else if (['professionnel', 'spam'].includes(res.categorie)) { decision = 'rien'; raisonDecision = res.categorie; }
    else if (!res.reponse || !emailFiable) {
      // Prospect joignable seulement par téléphone (ou sans réponse rédigée) : jamais perdu, il part en « à rappeler »
      decision = 'rappel'; raisonDecision = emailFiable ? 'sans_reponse' : 'sans_email';
    }
    else {
      const refus = controle(res.reponse, ref ? index[ref].prix : '');
      if (refus) { decision = 'brouillon'; raisonDecision = `controle_${refus}`; }
      else if (env.LEAD_MODE !== 'live') { decision = 'brouillon'; raisonDecision = 'mode_test'; }
      else if (!creneauOuvert()) { decision = 'attente'; raisonDecision = 'hors_creneau'; }
      else { decision = 'envoyer'; raisonDecision = 'ok'; }
    }

    if (base && cout) {
      await base.prepare('INSERT INTO leads_couts VALUES (?1, ?2, ?3, ?4, ?5)').bind(jour, mail.id, cout, test ? 1 : 0, new Date().toISOString()).run().catch(() => {});
    }
    if (base && test && cout) {
      await base.prepare('INSERT INTO leads_essais VALUES (?1, ?2, ?3)').bind(jour, cout, new Date().toISOString()).run().catch(() => {});
    }
    if (base && !test) {
      await base.prepare(`INSERT INTO leads_tri VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
        ON CONFLICT(id) DO UPDATE SET categorie = excluded.categorie, serieux = excluded.serieux, bien_ref = excluded.bien_ref,
          telephone = excluded.telephone, decision = excluded.decision, raison = excluded.raison, origine = excluded.origine,
          entree = entree + excluded.entree, sortie = sortie + excluded.sortie, cout = cout + excluded.cout`)
        .bind(mail.id, mail.recu, mail.de, res ? res.categorie || '' : '', res && res.serieux ? 1 : 0, ref, res ? propre(res.telephone, 30) : '',
          decision, raisonDecision, origine, usage ? usage.input_tokens || 0 : 0, usage ? usage.output_tokens || 0 : 0, cout, jour, new Date().toISOString())
        .run().catch(e => console.log('lead-tri insert', e.message));
    }

    const resultat = {
      categorie: res ? res.categorie : null, serieux: !!(res && res.serieux), raison: res ? res.raison || '' : '',
      prenom: res ? res.prenom || '' : '', nom: res ? res.nom || '' : '', telephone: res ? res.telephone || '' : '',
      email: res ? res.email || mail.de : mail.de, bien_ref: ref, ref_citee: refCitee,
      hors_catalogue: !!(refCitee && !ref), question: res ? res.question || '' : '',
      reponse: res && res.reponse ? res.reponse : null,
      decision, raison_decision: raisonDecision,
      notification: res && res.notification ? res.notification : `Nouveau mail de ${mail.nom_expediteur || mail.de} : « ${mail.objet} »`,
      origine, cout: Math.round(cout * 1e5) / 1e5, depense_jour: Math.round((depense + cout) * 1e4) / 1e4,
    };
    if (base && !test && res && res.categorie) {
      await base.prepare('INSERT OR REPLACE INTO leads_reponses VALUES (?1, ?2, ?3)')
        .bind(mail.id, JSON.stringify(resultat), new Date().toISOString()).run().catch(e => console.log('lead-tri reponse', e.message));
    }
    return json(200, resultat);
  } catch (e) {
    console.log('lead-tri', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
