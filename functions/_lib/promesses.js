/* Système parfait, étape 4 : la mesure des 7 promesses faites au vendeur (tenue / ratée, délais médians).
   Rien ici ne lit ni n'écrit la base : on lui passe les lignes des dossiers et du journal, il rend les mesures.
   La règle de chaque promesse est écrite une seule fois, ici ; la page /admin/promesses/ l'affiche telle quelle.

   Une mesure : { p, demande, debut, resultat, delai, detail, date }
     debut    : l'instant où la promesse commence à courir (c'est lui qui range la mesure dans « 7 jours » ou « 30 jours »)
     date     : ce qu'on affiche à la place de cet instant — un jour (AAAA-MM-JJ) pour une visite, '' quand il n'y a pas
                de date à montrer (l'état d'un dossier aujourd'hui) ; absent : on affiche l'instant
     resultat : 'tenue' | 'ratee' | 'en_cours' (le délai court encore) | 'hors' (rien à mesurer, et on dit pourquoi)
     delai    : dans l'unité de la promesse (min, h ou j), quand il y en a un ; sinon null */
import { PARCOURS } from './base.js';
import { echeanceAppel, paris } from './suivi.js';

export const PERIODES = [7, 30];

export const PROMESSES = [
  { n: 1, cle: 'fourchette', titre: 'Une fourchette en 2 minutes', unite: 'min',
    regle: 'Tenue : le vendeur lit sa fourchette moins de 2 minutes après avoir ouvert la page, sans mot de passe.' },
  { n: 2, cle: 'appel', titre: 'Appelé dans le quart d\'heure', unite: 'min',
    regle: 'Tenue : le dossier passe à « Appelé » dans les 15 minutes entre 9 h et 19 h ; sinon avant 9 h 15 le lendemain.' },
  { n: 3, cle: 'visite', titre: 'Visite d\'estimation sous 48 h', unite: 'h',
    regle: 'Tenue : la visite a lieu dans les 48 heures après la demande, ou plus tard sur un créneau proposé par le vendeur.' },
  { n: 4, cle: 'avis', titre: 'Avis de valeur 24 h après la visite', unite: 'h',
    regle: 'Tenue : l\'avis de valeur est dans l\'espace du vendeur dans les 24 heures qui suivent la visite.' },
  { n: 5, cle: 'espace', titre: 'Tout au même endroit', unite: '',
    regle: 'Tenue : l\'espace du vendeur contient ce que son dossier doit avoir à ce stade (avis de valeur, mandat, compromis, notaire).' },
  { n: 6, cle: 'compte_rendu', titre: 'Compte rendu le soir même', unite: 'j',
    regle: 'Tenue : le compte rendu d\'une visite est publié le jour même. Mesuré sur les visites saisies dans les dossiers.' },
  { n: 7, cle: 'nouvelles', titre: 'Prévenu à chaque étape', unite: 'min',
    regle: 'Tenue : à chaque changement de statut, un e-mail part au vendeur (au plus tard à 8 h si le changement a lieu le soir).' },
];

const MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ms = (iso) => new Date(iso).getTime();
const json = (s) => { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } };
const arrondi = (x, d = 0) => { const f = 10 ** d; return Math.round(x * f) / f; };

/* E-mails qui tiennent lieu d'annonce pour chaque statut (l'e-mail de confirmation de visite vaut annonce de
   « Visite prévue », celui du compte rendu vaut annonce de « Visites en cours », etc.). */
const ANNONCES = {
  appele: ['statut:appele'], visite: ['statut:visite', 'visite_fixee'], avis: ['statut:avis', 'avis_envoye'],
  mandat: ['statut:mandat'], annonce: ['statut:annonce'], visites: ['statut:visites', 'compte_rendu'],
  offre: ['statut:offre', 'offre'], compromis: ['statut:compromis'], acte: ['statut:acte'],
};
const ATTENTE_MAIL = 13 * HEURE;      // un changement fait à 21 h s'annonce à 8 h : onze heures, plus le passage de la tâche du matin
const RAISONS_MAIL = {
  email_clients_ferme: 'e-mails aux vendeurs pas encore ouverts', sans_compte: 'vendeur sans espace', suspect: 'demande à vérifier',
  perime: 'e-mail devenu sans objet', heures_calmes: 'e-mail gardé pour 8 h, jamais parti',
};

/* Ce que l'espace du vendeur doit contenir à partir de chaque statut. */
const PIECES = [
  ['avis', 'avis de valeur', (x) => x.fichiers.some((f) => f.role === 'avis')],
  ['mandat', 'mandat', (x) => x.fichiers.some((f) => f.role === 'document' && f.libelle === 'mandat')],
  ['compromis', 'compromis', (x) => x.fichiers.some((f) => f.role === 'document' && f.libelle === 'compromis')],
  ['compromis', 'nom du notaire', (x) => !!(x.notaire && String(x.notaire.nom || '').trim())],
];

/* Toutes les mesures, sans limite de période.
   donnees : { demandes, evenements, visites, comptes_rendus, fichiers, notaires } (lignes de la base)
   exclure(demande) : vrai pour un essai (adresse de test, compte de l'agence) — jamais compté. */
export function mesurer(donnees, maintenant = new Date(), exclure = () => false) {
  const now = maintenant.getTime();
  const demandes = (donnees.demandes || []).filter((d) => !d.suspect && !exclure(d));
  const par = (lignes) => { const m = new Map(); for (const l of lignes || []) { if (!m.has(l.demande_id)) m.set(l.demande_id, []); m.get(l.demande_id).push(l); } return m; };
  const journaux = par((donnees.evenements || []).map((e) => ({ ...e, t: ms(e.cree_le), d: json(e.detail) })).sort((a, b) => a.t - b.t || a.id - b.id));
  const visites = new Map((donnees.visites || []).map((v) => [v.demande_id, v]));
  const fichiers = par(donnees.fichiers);
  const notaires = new Map((donnees.notaires || []).map((n) => [n.demande_id, n]));
  const crs = par(donnees.comptes_rendus);
  const aujourdhui = paris(maintenant).date;
  const mesures = [];
  const noter = (p, d, debut, resultat, delai, detail, date) => mesures.push({ p, demande: d.id, debut: new Date(debut).toISOString(), resultat, delai, detail, ...(date == null ? {} : { date }) });

  for (const d of demandes) {
    const j = journaux.get(d.id) || [];
    const cree = ms(d.cree_le);

    /* 1. La fourchette en 2 minutes : la durée du parcours est notée à l'arrivée de la demande. */
    const est = j.find((e) => e.type === 'estimation');
    // dossier ouvert à la main par l'agence (vendeur venu par téléphone, mandat déjà signé) : pas de parcours en ligne
    const ouverture = j.find((e) => e.type === 'ouverture');
    if (ouverture) noter(1, d, cree, 'hors', null, 'Dossier ouvert par l\'agence (pas d\'estimation en ligne)');
    else if (d.prix_bas == null) noter(1, d, cree, 'hors', null, 'Pas de fourchette automatique (trop peu de ventes comparables) : rappel promis');
    else if (!est || !(est.d.duree > 0)) noter(1, d, cree, 'hors', null, 'Durée non relevée (demande d\'avant la mesure)');
    else noter(1, d, cree, est.d.duree <= 2 * MIN ? 'tenue' : 'ratee', arrondi(est.d.duree / MIN, 1), est.d.duree <= 2 * MIN ? '' : 'Parcours de plus de 2 minutes');

    /* 2. L'appel dans le quart d'heure : le premier geste de l'agence sur le dossier (statut ou visite fixée). */
    const limite = echeanceAppel(d.cree_le).getTime();
    const depart = limite - 15 * MIN;
    const contact = j.find((e) => (e.type === 'statut' && e.de === 'recue') || e.type === 'visite_fixee');
    // ouvert par l'agence après le premier contact : l'appel a déjà eu lieu, rien à mesurer
    if (ouverture && ouverture.d.statut && ouverture.d.statut !== 'recue') noter(2, d, cree, 'hors', null, 'Dossier ouvert par l\'agence après le premier contact');
    else if (contact) noter(2, d, cree, contact.t <= limite ? 'tenue' : 'ratee', arrondi(Math.max(0, contact.t - depart) / MIN), contact.t <= limite ? '' : 'Appelé après le quart d\'heure');
    else if (d.statut !== 'recue') noter(2, d, cree, 'hors', null, 'Appel non daté (statut changé avant la mesure)');
    else if (now > limite) noter(2, d, cree, 'ratee', null, 'Pas encore appelé');
    else noter(2, d, cree, 'en_cours', null, 'À appeler');

    /* 3. La visite sous 48 h : de la demande du vendeur (ou du jour où la date est convenue) à la visite. */
    const fixee = j.find((e) => e.type === 'visite_fixee' && e.d.debut);
    const demandeesAvant = j.filter((e) => e.type === 'visite_demandee' && (!fixee || e.t <= fixee.t));
    const demandee = demandeesAvant[0];
    if (fixee) {
      const ref = demandee ? demandee.t : fixee.t;
      const heures = Math.max(0, ms(fixee.d.debut) - ref) / HEURE;
      const choisi = demandeesAvant.some((e) => (e.d.creneaux || []).some((c) => ms(c) === ms(fixee.d.debut)));
      if (heures <= 48) noter(3, d, ref, 'tenue', arrondi(heures), '');
      else if (choisi) noter(3, d, ref, 'tenue', arrondi(heures), 'Créneau choisi par le vendeur');
      else noter(3, d, ref, 'ratee', arrondi(heures), 'Visite fixée à plus de 48 heures');
    } else if (demandee) {
      const derniere = demandeesAvant[demandeesAvant.length - 1];
      const annulee = j.some((e) => e.type === 'visite_annulee' && e.t >= derniere.t);
      if (annulee || ['pause', 'close'].includes(d.statut)) noter(3, d, demandee.t, 'hors', null, 'Visite annulée ou dossier arrêté');
      else if (now - demandee.t > 48 * HEURE) noter(3, d, demandee.t, 'ratee', null, 'Créneaux proposés, visite jamais confirmée');
      else noter(3, d, demandee.t, 'en_cours', null, 'Créneaux proposés : à confirmer');
    }

    /* 4. L'avis de valeur dans les 24 heures qui suivent la visite. */
    const v = visites.get(d.id);
    if (v && v.etat === 'fixee' && v.debut && ms(v.debut) < now) {
      const debut = ms(v.debut);
      const avis = j.find((e) => e.type === 'avis_envoye');
      if (avis) noter(4, d, debut, avis.t <= debut + 24 * HEURE ? 'tenue' : 'ratee', arrondi(Math.max(0, avis.t - debut) / HEURE), avis.t <= debut + 24 * HEURE ? '' : 'Avis de valeur envoyé après 24 heures');
      else if (['pause', 'close'].includes(d.statut)) noter(4, d, debut, 'hors', null, 'Dossier arrêté après la visite');
      else if (now > debut + 24 * HEURE) noter(4, d, debut, 'ratee', null, 'Avis de valeur pas encore envoyé');
      else noter(4, d, debut, 'en_cours', null, 'Avis de valeur à envoyer');
    }

    /* 5. Tout au même endroit : ce que l'espace du vendeur doit contenir à ce stade. Un dossier ouvert compte
          tant qu'il est ouvert ; un dossier signé compte à la date de l'acte. */
    const rang = PARCOURS.indexOf(d.statut);
    if (rang >= PARCOURS.indexOf('avis')) {
      const x = { fichiers: fichiers.get(d.id) || [], notaire: notaires.get(d.id) };
      const manque = PIECES.filter(([des, , ok]) => rang >= PARCOURS.indexOf(des) && !ok(x)).map(([, nom]) => nom);
      noter(5, d, d.statut === 'acte' ? ms(d.statut_le || d.cree_le) : now, manque.length ? 'ratee' : 'tenue', null, manque.length ? `Il manque dans son espace : ${manque.join(', ')}` : '', '');
    }

    /* 6. Le compte rendu le soir même, pour chaque visite saisie. */
    for (const c of crs.get(d.id) || []) {
      const midi = ms(c.visite_le + 'T12:00:00Z');
      const debut = Math.min(midi, now);          // une visite de ce matin compte dès maintenant
      if (c.publie_le) {
        const jours = Math.max(0, Math.round((ms(paris(new Date(c.publie_le)).date + 'T12:00:00Z') - midi) / JOUR));
        noter(6, d, debut, jours === 0 ? 'tenue' : 'ratee', jours, jours === 0 ? '' : jours === 1 ? 'Compte rendu publié le lendemain' : `Compte rendu publié ${jours} jours après la visite`, c.visite_le);
      } else if (c.visite_le < aujourdhui) noter(6, d, debut, 'ratee', null, 'Compte rendu resté en brouillon', c.visite_le);
      else noter(6, d, debut, 'en_cours', null, 'Brouillon à publier ce soir', c.visite_le);
    }

    /* 7. Prévenu à chaque étape : chaque changement de statut s'annonce par un e-mail. */
    for (const e of j) {
      if (e.type !== 'statut' || !ANNONCES[e.vers]) continue;
      const mails = j.filter((m) => m.type === 'mail' && ANNONCES[e.vers].includes(m.d.motif) && m.t >= e.t - MIN && m.t <= e.t + ATTENTE_MAIL);
      const parti = mails.find((m) => m.d.envoye === true);
      if (parti) { noter(7, d, e.t, 'tenue', arrondi(Math.max(0, parti.t - e.t) / MIN), ''); continue; }
      const garde = mails.find((m) => m.d.raison === 'heures_calmes');
      if (garde && now - e.t <= ATTENTE_MAIL) { noter(7, d, e.t, 'en_cours', null, 'E-mail gardé pour 8 h'); continue; }
      if (!mails.length && now - e.t < 2 * MIN) { noter(7, d, e.t, 'en_cours', null, 'E-mail en cours d\'envoi'); continue; }
      const refus = mails.find((m) => m.d.raison && m.d.raison !== 'heures_calmes') || garde;
      noter(7, d, e.t, 'ratee', null, refus ? `Pas d'e-mail : ${RAISONS_MAIL[refus.d.raison] || 'envoi refusé'}` : mails.length ? 'L\'e-mail n\'est pas parti' : 'Pas d\'e-mail (case décochée)');
    }
  }
  return mesures;
}

/* Médiane d'une liste de nombres (null si elle est vide). */
export function mediane(l) {
  const s = l.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/* Un délai, dit simplement. */
export function delaiFr(x, unite) {
  if (x == null) return '';
  if (unite === 'j') return x < 0.5 ? 'le jour même' : x < 1.5 ? 'le lendemain' : `${String(arrondi(x, 1)).replace('.', ',')} jours après`;
  let minutes = unite === 'h' ? x * 60 : x;
  if (minutes < 1) return 'moins d\'1 min';
  if (minutes < 90) return `${String(arrondi(minutes, minutes < 10 ? 1 : 0)).replace('.', ',')} min`;
  const h = minutes / 60;
  if (h < 48) { const hh = Math.floor(minutes / 60), mm = Math.round(minutes - hh * 60); return mm && hh < 10 ? `${hh} h ${String(mm).padStart(2, '0')}` : `${Math.round(h)} h`; }
  return `${String(arrondi(h / 24, 1)).replace('.', ',')} jours`;
}

/* Le bilan d'une promesse sur une période : ce qui est tenu, raté, en cours, hors mesure ; le taux et le délai médian
   se calculent sur ce qui est joué (tenu ou raté). */
function bilan(mesures, unite) {
  const n = (r) => mesures.filter((m) => m.resultat === r).length;
  const tenue = n('tenue'), ratee = n('ratee');
  const med = mediane(mesures.filter((m) => m.resultat === 'tenue' || m.resultat === 'ratee').map((m) => m.delai));
  return {
    tenue, ratee, en_cours: n('en_cours'), hors: n('hors'),
    taux: tenue + ratee ? Math.round((100 * tenue) / (tenue + ratee)) : null,
    mediane: med, mediane_txt: delaiFr(med, unite),
    etat: ratee ? 'ratee' : tenue ? 'tenue' : n('en_cours') ? 'en_cours' : 'vide',
  };
}

/* Le tableau des 7 promesses sur 7 et 30 jours, avec la liste de ce qu'il faut regarder (raté ou en cours). */
export function tableau(mesures, maintenant = new Date()) {
  const now = maintenant.getTime();
  const dans = (jours) => (m) => { const t = ms(m.debut); return t >= now - jours * JOUR && t <= now + MIN; };
  return PROMESSES.map((p) => {
    const miennes = mesures.filter((m) => m.p === p.n);
    const periodes = {};
    for (const jours of PERIODES) periodes[jours] = bilan(miennes.filter(dans(jours)), p.unite);
    const ordre = { ratee: 0, en_cours: 1 };
    const a_regarder = miennes.filter(dans(PERIODES[PERIODES.length - 1])).filter((m) => m.resultat in ordre)
      .sort((a, b) => ordre[a.resultat] - ordre[b.resultat] || ms(b.debut) - ms(a.debut));
    return { ...p, periodes, a_regarder };
  });
}
