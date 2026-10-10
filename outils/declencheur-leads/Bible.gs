/**
 * Bible des messages leads — moteur de rédaction (Google Apps Script, compatible Node pour les tests).
 * À coller dans le projet Apps Script « Déclencheur leads 1 min » (fichier Bible.gs).
 *
 * Le texte des messages N'EST PAS dans le code : il est lu à chaque exécution dans le Sheet
 * « Bible des messages leads — variantes (lue par le script) », onglet 1. Pour améliorer un message,
 * on modifie la cellule du Sheet ; aucun code à toucher.
 *
 * Entrée : un lead = { cas, prenom, nom, type, surface, ville, rue, quartier, reference, nb_ventes,
 *   delai, message, pieces, ref_annonce, video, demande, creneaux:[ 'lundi 12 octobre à 10 h', ... ],
 *   dispo_verifiee:bool, appel_rate:bool }
 * Sortie : { variante, objet, texte, mots, alertes:[...] }
 */

var BIBLE_SHEET_ID = '1BvJbM0KNrIonsBjUOZwQIBtopkCEDSa5BU9Lfl05rs4'; // Sheet « Bible des messages leads — variantes (lue par le script) »

// Lecture du Sheet à chaque passage (cache 5 min pour les quotas). En cas d'échec : null → le script prend le texte de secours.
function bibleLire_() {
  if (typeof CacheService === 'undefined') return null;
  var cache = CacheService.getScriptCache();
  var c = cache.get('bible_rows');
  var rows = c ? JSON.parse(c) : null;
  if (!rows) {
    rows = SpreadsheetApp.openById(BIBLE_SHEET_ID).getSheets()[0].getDataRange().getValues();
    try { cache.put('bible_rows', JSON.stringify(rows), 300); } catch (e) {}
  }
  return bibleCharger_(rows);
}

// Rotation A → B → C par cas et par canal (compteur dans les propriétés du script).
function bibleRang_(cas, canal, avancer) {
  var p = PropertiesService.getScriptProperties();
  var k = 'bible_rang_' + cas + '_' + canal;
  var n = parseInt(p.getProperty(k) || '0', 10);
  if (avancer) p.setProperty(k, String(n + 1));
  return n;
}

function bibleCharger_(rows) {
  // rows : tableau 2D lu dans le Sheet (1re ligne = en-têtes). En Apps Script :
  //   rows = SpreadsheetApp.openById(BIBLE_SHEET_ID).getSheets()[0].getDataRange().getValues();
  var h = rows[0].map(String), out = { variantes: [], accroches: [], delai: {}, demande: {}, signature: '' };
  for (var i = 1; i < rows.length; i++) {
    var r = {}; for (var j = 0; j < h.length; j++) r[h[j]] = String(rows[i][j] == null ? '' : rows[i][j]);
    if (r.genre === 'variante') out.variantes.push(r);
    else if (r.genre === 'accroche') out.accroches.push(r);
    else if (r.genre === 'delai') out.delai[r.cle] = r.texte;
    else if (r.genre === 'demande') out.demande[r.cle] = r.texte;
    else if (r.genre === 'signature') out.signature = r.texte;
  }
  return out;
}

function sansAccent_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-']/g, ' ').replace(/\s+/g, ' ').trim(); }

function prenomPropre_(p) {
  p = String(p || '').trim();
  if (!p || p.length < 2 || /\d|@|test|essai/i.test(p)) return '';
  if (/^(je|moi|madame|monsieur|mme|mr|m\.)$/i.test(p)) return '';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase().replace(/([- ])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
}


// Prénoms fréquents : sert à retrouver le prénom dans « Dupont Nathalie » (Mandat Machine met souvent le nom en premier).
var PRENOMS_ = ('nathalie isabelle sylvie catherine christine martine francoise monique nicole valerie sandrine stephanie veronique sophie celine chantal patricia anne nadine brigitte marie laurence corinne helene emilie julie aurelie caroline virginie christelle karine laetitia sabrina elodie audrey melanie lucie camille lea manon chloe sarah laura marion pauline claire jeanne alice louise emma ines jade lina mila rose anna juliette agnes beatrice danielle denise genevieve jacqueline josiane michele odile pascale colette annie evelyne mireille dominique claude fabienne florence luigia lisa valentine margaux oceane justine charlotte mathilde amandine jessica vanessa fatima samira nadia leila amina yasmine ' +
  'jean pierre michel philippe alain patrick nicolas christophe christian daniel bernard eric frederic laurent stephane david olivier thierry pascal jacques francois sebastien julien gerard andre rene marc didier vincent bruno serge dominique denis yves guy claude paul louis thomas alexandre antoine maxime romain kevin anthony jerome mathieu guillaume cedric fabrice franck herve hugo lucas arthur jules leo gabriel raphael adam mohamed ahmed karim mehdi samir rachid abdelmajid issam loris emile sofiane xavier jean-luc jean-pierre jean-claude jean-marc').split(' ');

function extrairePrenom_(nomComplet) {
  var mots = String(nomComplet || '').replace(/\s+/g, ' ').trim().split(' ').filter(String);
  if (!mots.length) return '';
  for (var i = 0; i < mots.length; i++) if (PRENOMS_.indexOf(sansAccent_(mots[i]).replace(/ /g, '-')) >= 0) return prenomPropre_(mots[i]);
  if (mots.length === 1) return prenomPropre_(mots[0]); // « Nadine », « Luigia »
  return ''; // doute : on écrit « Bonjour, » (jamais de prénom deviné)
}

function choisirAccroche_(bible, lead, rang) {
  var v = sansAccent_(lead.ville), q = sansAccent_((lead.quartier || '') + ' ' + (lead.rue || ''));
  var cands = [];
  bible.accroches.forEach(function (a) {
    var communes = a.communes.split(/,/).map(sansAccent_);
    var quarts = a.quartiers ? a.quartiers.split(/,/).map(sansAccent_).filter(String) : [];
    if (quarts.length) { if (quarts.some(function (x) { return x && q.indexOf(x) >= 0; })) cands.unshift(a); return; }
    if (a.secteur === 'Partout') return;
    if (a.secteur === 'Dijon centre' || a.secteur === 'Dijon quartiers') { if (v === 'dijon') cands.push(a); return; }
    if (communes.some(function (c) { return c && v === c; })) cands.push(a);
  });
  if (!cands.length) cands = bible.accroches.filter(function (a) { return a.secteur === 'Partout'; });
  return cands[rang % cands.length].texte;
}

function bibleRendre_(bible, lead, canal, rang) {
  var alertes = [];
  var accTxt = choisirAccroche_(bible, { ville: lead.ville ? String(lead.ville).replace(/^(à|a)\s+/i, '').replace(/^\d{5}\s*/, '') : '', quartier: lead.quartier, rue: lead.rue }, rang);
  var accrocheGenerique = bible.accroches.some(function (a) { return a.secteur === 'Partout' && a.texte === accTxt; });
  var vs = bible.variantes.filter(function (x) { return x.cas === lead.cas && x.canal === canal; });
  // variantes soumises à condition
  vs = vs.filter(function (x) {
    if (x.cle === '4-acheteur-seloger|mail|C') return !!lead.dispo_verifiee;
    if (x.cle === '3-site-rappel|relance48h|A') return !!lead.appel_rate;
    if (/info sur votre secteur|dernière info/.test(x.texte)) return !accrocheGenerique;
    if (x.cle === '5-instagram-manychat|relance48h|B') return lead.demande === 'estimation' || lead.demande === 'guide';
    return true;
  });
  if (!vs.length) return null;
  var v = vs[rang % vs.length];
  var prenom = lead.prenom ? prenomPropre_(lead.prenom) : extrairePrenom_(lead.nom);
  var type = String(lead.type || '').toLowerCase().trim();
  if (/^appart/.test(type)) type = 'appartement'; else if (/^mais/.test(type)) type = 'maison'; else if (!/^(terrain|immeuble|local|commerce|loft)$/.test(type)) type = '';
  var surface = /^\d{1,4}$/.test(String(lead.surface || '').trim()) ? String(lead.surface).trim() : '';
  var ville = String(lead.ville || '').replace(/^(à|a)\s+/i, '').replace(/^\d{5}\s*/, '').trim();
  if (/^\d+$/.test(ville)) ville = '';
  if (ville) ville = ville.split(/([- ])/).map(function (w) { return /^(lès|les|sur|sous|la|le|en|de|du|d)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join('').replace(/\bLes\b/g, 'lès');
  var c = (lead.creneaux || []).filter(String);
  var mots = String(lead.message || '').replace(/\s+/g, ' ').trim();
  if (/^Je suis intéressé par votre offre et souhaite organiser un rendez-vous de visite/i.test(mots)) mots = ''; // texte par défaut SeLoger
  if (mots.split(' ').length > 12) mots = mots.split(' ').slice(0, 12).join(' ').replace(/[,;:.]$/, '') + '…';
  var n = parseInt(lead.nb_ventes, 10);

  var bien = type ? 'votre ' + type + (surface ? ' de ' + surface + ' m²' : '') : 'votre bien';
  var annonce = (lead.pieces && ville) ? lead.pieces + ' pièces' + (surface ? ' de ' + surface + ' m²' : '') + ' à ' + ville + (lead.ref_annonce ? ' (réf. ' + lead.ref_annonce + ')' : '') : '';
  var demandeTxt = bible.demande[lead.demande] || bible.demande['_repli'] || '';
  var J = {
    '{bonjour}': prenom ? 'Bonjour ' + prenom + ',' : 'Bonjour,',
    '{bien}': bien,
    '{a_ville}': ville ? ' à ' + ville : '',
    '{rue_a_ville}': ville ? (lead.rue ? ' ' + lead.rue + ' à ' + ville : ' à ' + ville) : '',
    '{accroche}': choisirAccroche_(bible, { ville: ville, quartier: lead.quartier, rue: lead.rue }, rang),
    '{creneaux_visite}': c.length >= 2 ? c[0] + ' ou ' + c[1] : 'quand ça vous arrange cette semaine',
    '{proposition_appel}': c.length >= 2 ? 'Je vous propose un appel ' + c[0] + ' ou ' + c[1] + ' ; si aucun ne vous va, donnez-moi le vôtre.' : 'Dites-moi simplement quand vous appeler, je m\'adapte.',
    '{creneaux_appel}': c.length >= 2 ? 'un appel ' + c[0] + ' ou ' + c[1] : 'un appel au moment qui vous arrange',
    '{dvf}': n >= 5 ? 'Autour de chez vous, ' + n + ' ventes comparables ont été signées entre 2023 et 2025 (données publiques DVF).' : '',
    '{delai}': bible.delai[lead.delai] || '',
    '{mots}': mots ? 'Vous m\'avez écrit : « ' + mots + ' ». Je garde ça en tête.' : '',
    '{ref}': lead.reference ? ' (réf. ' + lead.reference + ')' : '',
    '{annonce}': annonce || 'bien que vous avez repéré',
    '{annonce_court}': (lead.pieces && ville) ? lead.pieces + ' pièces à ' + ville : 'bien',
    '{video}': lead.video ? ', sous la vidéo ' + lead.video : '',
    '{demande}': demandeTxt
  };
  function remplir(s) {
    var t = s;
    for (var pass = 0; pass < 2; pass++) Object.keys(J).forEach(function (k) { t = t.split(k).join(J[k]); });
    return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').replace(/ ([,.])/g, '$1').replace(/^\n+|\n+$/g, '');
  }
  var texte = remplir(v.texte), objet = remplir(v.objet || '');
  if (lead.portail && lead.portail !== 'SeLoger') { texte = texte.split('SeLoger').join(lead.portail); objet = objet.split('SeLoger').join(lead.portail); }
  objet = objet.charAt(0).toUpperCase() + objet.slice(1);
  if (canal === 'mail') texte += '\n\n' + bible.signature;
  // contrôles automatiques (points 3, 5, 6 de la grille)
  if (/[{}\[\]]/.test(texte + objet)) alertes.push('jeton non rempli');
  if (/\d[\d  ]*\s?€|fourchette de \d|estim\w* à \d/i.test(texte)) alertes.push('prix détecté');
  if (/\b(IA|Claude|automatique|message généré|mandataire|gratuit\w*|instantan\w*|garanti\w*|meilleur|n°\s?1|N'hésitez pas|Découvrez)\b/i.test(texte)) alertes.push('mot interdit');
  var corps = texte.trim(); // signature comprise : règle stricte
  var nbMots = corps.split(/\s+/).filter(function (w) { return /[\p{L}\p{N}]/u.test(w); }).length;
  var max = canal === 'whatsapp' ? 60 : (canal === 'mail' ? 90 : 60);
  if (nbMots > max) alertes.push('trop long : ' + nbMots + ' mots (max ' + max + ')');
  return { variante: v.cle, objet: objet, texte: texte, mots: nbMots, alertes: alertes };
}

if (typeof module !== 'undefined') module.exports = { bibleCharger_: bibleCharger_, bibleRendre_: bibleRendre_, prenomPropre_: prenomPropre_, extrairePrenom_: extrairePrenom_ };
