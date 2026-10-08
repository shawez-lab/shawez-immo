/* Suivi d'un dossier : heure de Paris, créneaux de visite, prochaine action de l'agence, prochaine étape dite au vendeur,
   textes des e-mails de changement de statut. Rien ici ne lit ni n'écrit la base. */
import { PARCOURS, STATUTS_CLIENT } from './base.js';

/* ---------- Heure de Paris (les Workers tournent en UTC) ---------- */
const FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
const JOURS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/* { a, m, j, h, min, jour (0 = dimanche), date: 'AAAA-MM-JJ' } à Paris pour un instant donné. */
export function paris(d = new Date()) {
  const p = {};
  for (const x of FMT.formatToParts(d)) p[x.type] = x.value;
  const r = { a: +p.year, m: +p.month, j: +p.day, h: +p.hour, min: +p.minute, jour: JOURS[p.weekday] };
  r.date = `${p.year}-${p.month}-${p.day}`;
  return r;
}

/* L'instant (Date) d'une heure de Paris. */
export function deParis(a, m, j, h = 0, min = 0) {
  const vise = Date.UTC(a, m - 1, j, h, min);
  let t = vise;
  for (let i = 0; i < 2; i++) {            // deux passes : la seconde corrige autour d'un changement d'heure
    const p = paris(new Date(t));
    t += vise - Date.UTC(p.a, p.m - 1, p.j, p.h, p.min);
  }
  return new Date(t);
}

const dateFr = (d, o) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', ...o });
export const jourLong = (d) => dateFr(d, { weekday: 'long', day: 'numeric', month: 'long' });      // vendredi 9 octobre
export const jourCourt = (d) => dateFr(d, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');   // ven 9 oct
export function heureFr(d) { const p = paris(new Date(d)); return p.min ? `${p.h} h ${String(p.min).padStart(2, '0')}` : `${p.h} h`; }
export const quandFr = (d) => `${jourLong(d)} à ${heureFr(d)}`;
export const quandCourt = (d) => `${jourCourt(d)} ${heureFr(d)}`;

/* ---------- Créneaux de visite d'estimation ----------
   Du lundi au samedi, de 9 h à 19 h, 45 minutes : un début par heure, de 9 h à 18 h. Le vendeur en propose jusqu'à trois,
   l'agence confirme. Un créneau commence au plus tôt deux heures après la demande. */
export const DUREE_VISITE = 45;
export const HEURES_VISITE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const AVANCE_MS = 2 * 3600000;
const HORIZON_JOURS = 21;

export function creneaux(maintenant = new Date(), nJours = 6) {
  const jours = [];
  const p0 = paris(maintenant);
  for (let k = 0; jours.length < nJours && k < HORIZON_JOURS; k++) {
    const midi = deParis(p0.a, p0.m, p0.j + k, 12);          // Date.UTC normalise un jour au-delà de la fin du mois
    const p = paris(midi);
    if (p.jour === 0) continue;                                // pas le dimanche
    const heures = [];
    for (const h of HEURES_VISITE) {
      const debut = deParis(p.a, p.m, p.j, h);
      if (debut.getTime() - maintenant.getTime() < AVANCE_MS) continue;
      heures.push({ debut: debut.toISOString(), h: `${h} h`, sous48h: debut.getTime() - maintenant.getTime() <= 48 * 3600000 });
    }
    if (!heures.length) continue;
    jours.push({ date: p.date, libelle: jourLong(midi), court: jourCourt(midi), sous48h: heures.some((x) => x.sous48h), heures });
  }
  return jours;
}

/* Un créneau proposé par le vendeur est-il recevable ? (heure pleine de 9 h à 18 h, du lundi au samedi, à venir) */
export function creneauValide(iso, maintenant = new Date()) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(iso)) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const dans = d.getTime() - maintenant.getTime();
  if (dans < AVANCE_MS - 45 * 60000 || dans > (HORIZON_JOURS + 1) * 86400000) return false;   // tolérance : la liste a pu être affichée un moment avant
  const p = paris(d);
  return p.jour !== 0 && p.min === 0 && d.getUTCSeconds() === 0 && HEURES_VISITE.includes(p.h);
}

/* ---------- Promesse n° 2 : l'appel dans le quart d'heure (9 h–19 h), sinon le lendemain à 9 h ---------- */
export function echeanceAppel(creeLe) {
  const d = new Date(creeLe);
  const p = paris(d);
  const minutes = p.h * 60 + p.min;
  if (minutes < 9 * 60) return deParis(p.a, p.m, p.j, 9, 15);
  if (minutes + 15 > 19 * 60) return deParis(p.a, p.m, p.j + 1, 9, 15);
  return new Date(d.getTime() + 15 * 60000);
}

/* ---------- Prochaine action de l'agence, avec son échéance ----------
   Rien ne doit rester sans prochaine action : chaque statut en a une. « rappel_le » (date choisie à la main dans
   l'admin) passe devant l'échéance calculée quand elle existe. */
export function prochaineAction(d, visite, maintenant = new Date()) {
  const rappel = d.rappel_le ? deParis(+d.rappel_le.slice(0, 4), +d.rappel_le.slice(5, 7), +d.rappel_le.slice(8, 10), 19) : null;
  // rdv : l'échéance est un rendez-vous (« le … »), pas une date limite (« avant le … »)
  const r = (texte, echeance, rdv = false) => {
    const e = echeance || rappel;
    return { texte, echeance: e ? e.toISOString() : null, retard: !!e && !rdv && e.getTime() < maintenant.getTime(), rdv: rdv && !!e };
  };
  const v = visite && visite.etat !== 'annulee' ? visite : null;
  const demandee = v && v.etat === 'demandee';
  const propos = demandee ? lireCreneaux(v).map(quandCourt).join(', ') : '';
  switch (d.statut) {
    case 'recue':
      if (demandee) return r(`Confirmer la visite (${propos}) et appeler`, new Date(Math.min(echeanceAppel(d.cree_le).getTime(), echeanceAppel(v.demandee_le).getTime() + 45 * 60000)));
      return r(d.prix_bas ? 'Appeler (promesse : dans le quart d\'heure)' : 'Appeler (pas de fourchette automatique)', rappel || echeanceAppel(d.cree_le));
    case 'appele':
      if (demandee) return r(`Confirmer la visite (${propos})`, new Date(echeanceAppel(v.demandee_le).getTime() + 45 * 60000));
      return r('Fixer la visite d\'estimation (promesse : sous 48 h)', rappel || new Date(new Date(d.cree_le).getTime() + 48 * 3600000));
    case 'visite': {
      if (demandee) return r(`Confirmer le nouveau créneau (${propos})`, new Date(echeanceAppel(v.demandee_le).getTime() + 45 * 60000));
      if (v && v.debut) {
        const debut = new Date(v.debut);
        if (debut.getTime() > maintenant.getTime()) return r('Visite d\'estimation', debut, true);
        return r('Envoyer l\'avis de valeur (promesse : 24 h après la visite)', new Date(debut.getTime() + 24 * 3600000));
      }
      return r('Fixer la date de la visite', rappel);
    }
    case 'avis': return r('Appeler pour présenter l\'avis de valeur, proposer le mandat');
    case 'mandat': return r('Photos, puis mise en ligne de l\'annonce (Modelo)');
    case 'annonce': return r('Organiser les premières visites');
    case 'visites': return r('Compte rendu au vendeur après chaque visite, le soir même');
    case 'offre': return r('Présenter l\'offre au vendeur');
    case 'compromis': return r('Suivre le dossier chez le notaire jusqu\'à l\'acte');
    case 'pause': return r(d.rappel_le ? 'Relancer' : 'Choisir une date de relance');
    default: return { texte: '', echeance: null, retard: false, rdv: false };
  }
}

export function lireCreneaux(v) {
  try { const l = JSON.parse((v && v.creneaux) || '[]'); return Array.isArray(l) ? l.filter((x) => typeof x === 'string') : []; } catch (e) { return []; }
}

/* ---------- Ce que voit le vendeur : la frise et la prochaine étape ---------- */
export function frise(statut, datesParStatut = {}) {
  const sorti = statut === 'pause' || statut === 'close';
  // en pause ou clos : on garde l'avancement atteint avant la sortie
  const atteint = sorti ? Math.max(0, ...PARCOURS.map((k, i) => (datesParStatut[k] ? i : 0))) : Math.max(0, PARCOURS.indexOf(statut));
  return PARCOURS.map((k, i) => ({
    cle: k, libelle: STATUTS_CLIENT[k],
    etat: i < atteint ? 'fait' : i === atteint ? (sorti ? 'fait' : 'encours') : 'avenir',
    le: datesParStatut[k] || null,
  }));
}

export function suiteVendeur(d, visite, conseiller = 'Shawez') {
  const v = visite && visite.etat !== 'annulee' ? visite : null;
  switch (d.statut) {
    case 'recue':
      if (v && v.etat === 'demandee') return `${conseiller} vous appelle et confirme votre créneau de visite.`;
      return `${conseiller} vous appelle : dans le quart d'heure entre 9 h et 19 h, sinon le lendemain à 9 h.`;
    case 'appele':
      if (v && v.etat === 'demandee') return `${conseiller} confirme votre créneau de visite dans l'heure (entre 9 h et 19 h).`;
      return 'La visite d\'estimation : choisissez votre créneau ci-dessous.';
    case 'visite':
      if (v && v.etat === 'demandee') return `${conseiller} confirme votre nouveau créneau dans l'heure (entre 9 h et 19 h).`;
      if (v && v.debut && new Date(v.debut).getTime() > Date.now()) return `La visite de votre bien, ${quandFr(v.debut)}. Ensuite : votre avis de valeur, sous 24 h.`;
      return 'Votre avis de valeur, dans les 24 heures qui suivent la visite.';
    case 'avis': return `${conseiller} vous appelle pour en parler. Si vous décidez de vendre : le mandat.`;
    case 'mandat': return 'Les photos, puis la mise en ligne de l\'annonce.';
    case 'annonce': return 'Les premières visites.';
    case 'visites': return 'Après chaque visite, un compte rendu le soir même, ici.';
    case 'offre': return `${conseiller} vous présente l'offre. C'est vous qui décidez.`;
    case 'compromis': return 'La signature de l\'acte, chez le notaire.';
    case 'acte': return 'La vente est signée. Merci de votre confiance.';
    case 'pause': return d.rappel_le ? `Dossier en pause. ${conseiller} reprend contact avec vous autour du ${d.rappel_le.slice(8, 10)}/${d.rappel_le.slice(5, 7)}.` : `Dossier en pause. Un mot à ${conseiller} suffit pour le reprendre.`;
    default: return 'Ce dossier est clos.';
  }
}

/* ---------- E-mails au vendeur : un message court à chaque changement de statut, signé Shawez Ali ----------
   Rend { sujet, titre, paragraphes: [texte…], bouton: [libellé] } ; null quand le statut ne s'annonce pas par e-mail
   (« Pas maintenant », « Perdu », retour à « Estimation reçue »). */
export const AGENCE = { nom: 'GRAVELIN IMMO', adresse: '30 rue Bannelier, 21000 Dijon', plan: 'https://www.google.com/maps/search/?api=1&query=GRAVELIN+IMMO+30+rue+Bannelier+21000+Dijon' };
const A_PREPARER = 'Si vous les avez sous la main, préparez : le titre de propriété, la dernière taxe foncière, les diagnostics, le montant des charges et la liste des travaux réalisés.';

export function mailStatut(statut, { bien = 'votre bien', visiteEnCours = false } = {}) {
  switch (statut) {
    // le vendeur a déjà proposé ses créneaux (ou la visite est fixée) : on ne lui redemande pas de choisir
    case 'appele': if (visiteEnCours) return {
      sujet: 'Suite à notre échange', titre: 'La suite : la visite',
      paragraphes: [`Merci pour notre échange. La prochaine étape, c'est la visite de ${bien} : 45 minutes, gratuites et sans engagement.`, 'Vous retrouvez la date et l\'avancement de votre dossier dans votre espace.'],
      bouton: 'Ouvrir mon espace',
    };
    return {
      sujet: 'Suite à notre échange : votre visite d\'estimation', titre: 'La suite : la visite',
      paragraphes: [`Merci pour notre échange. La prochaine étape, c'est la visite de ${bien} : comptez 45 minutes, c'est gratuit et sans engagement.`, 'Choisissez le moment qui vous arrange, je confirme dans l\'heure.'],
      bouton: 'Choisir mon créneau',
    };
    case 'avis': return {
      sujet: 'Votre avis de valeur est prêt', titre: 'Votre avis de valeur est prêt',
      paragraphes: ['Votre avis de valeur est dans votre espace : la fourchette de prix, les ventes réelles du quartier sur lesquelles elle s\'appuie et la stratégie que je vous propose.', 'Je vous appelle pour en parler.'],
      bouton: 'Lire mon avis de valeur',
    };
    case 'mandat': return {
      sujet: 'Le mandat est signé : la suite', titre: 'Le mandat est signé',
      paragraphes: ['Merci de votre confiance. La suite : les photos, puis la mise en ligne de l\'annonce.', 'Vous suivez chaque étape dans votre espace.'],
      bouton: 'Ouvrir mon espace',
    };
    case 'annonce': return {
      sujet: 'Votre annonce est en ligne', titre: 'Votre annonce est en ligne',
      paragraphes: [`L'annonce de ${bien} est en ligne. Dès les premières demandes, j'organise les visites et je vous tiens au courant.`],
      bouton: 'Ouvrir mon espace',
    };
    case 'visites': return {
      sujet: 'Les visites commencent', titre: 'Les visites commencent',
      paragraphes: ['Les visites commencent. Après chacune, vous trouvez mon compte rendu le soir même dans votre espace.'],
      bouton: 'Ouvrir mon espace',
    };
    case 'offre': return {
      sujet: 'Une offre est arrivée', titre: 'Une offre est arrivée',
      paragraphes: [`Une offre vient d'arriver pour ${bien}. Je vous appelle pour vous la présenter : c'est vous qui décidez.`],
      bouton: 'Ouvrir mon espace',
    };
    case 'compromis': return {
      sujet: 'Le compromis est signé', titre: 'Le compromis est signé',
      paragraphes: ['Le compromis est signé. La suite se passe chez le notaire, jusqu\'à la signature de l\'acte. Je reste votre interlocuteur jusqu\'au bout.'],
      bouton: 'Ouvrir mon espace',
    };
    case 'acte': return {
      sujet: 'L\'acte est signé', titre: 'L\'acte est signé',
      paragraphes: ['La vente est signée. Merci de m\'avoir fait confiance, et belle suite à vous.'],
      bouton: 'Ouvrir mon espace',
    };
    default: return null;
  }
}

export function mailVisite(genre, { debut, adresse, deplacee = false }) {
  const quand = quandFr(debut);
  const ou = adresse ? `, ${adresse}` : '';
  if (genre === 'rappel') return {
    sujet: `Rappel : visite d'estimation demain à ${heureFr(debut)}`, titre: 'À demain',
    paragraphes: [`Je passe voir votre bien demain, ${quand}${ou}. Comptez 45 minutes.`, A_PREPARER, 'Un empêchement ? Appelez-moi au 07 67 57 92 28.'],
    bouton: 'Ouvrir mon espace',
  };
  return {
    sujet: `${deplacee ? 'Nouvelle date de visite' : 'Visite d\'estimation confirmée'} : ${quand}`, titre: deplacee ? 'Votre visite est déplacée' : 'Votre visite est confirmée',
    paragraphes: [
      `C'est noté : je viens voir votre bien ${quand}${ou}. Comptez 45 minutes ; c'est gratuit et sans engagement.`,
      A_PREPARER,
      `Un empêchement ? Appelez-moi au 07 67 57 92 28. L'agence : ${AGENCE.nom}, ${AGENCE.adresse}.`,
    ],
    plan: true,
    bouton: 'Ouvrir mon espace',
  };
}

/* Lien « Ajouter à mon agenda Google » (pour l'agence) : un événement prérempli, sans aucun accès au compte. */
export function lienAgenda({ debut, duree = DUREE_VISITE, titre, lieu, details }) {
  const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const fin = new Date(new Date(debut).getTime() + duree * 60000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: titre, dates: `${f(debut)}/${f(fin)}`, location: lieu || '', details: details || '', ctz: 'Europe/Paris' });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
