/**
 * Déclencheur leads 1 min — Shawez Ali, Gravelin Immo
 * Compte : shawez@gravelin-immo.com — fuseau du projet : Europe/Paris
 *
 * Chaque minute : lit les nouveaux leads dans Gmail (Mandat Machine, site
 * shawez-immo.com, portails acheteurs), pose une alerte ROUGE dans l'agenda,
 * envoie si possible UN mail court au lead (lun-sam 8 h-19 h), et trace le lead
 * dans le bon Google Sheet.
 *
 * Fonctions à lancer à la main (menu « Exécuter ») :
 *   essai()        -> lit les leads des dernières 24 h et écrit dans le journal ce
 *                     qu'il ferait. Rien n'est envoyé, rien n'est créé.
 *   installer()    -> marque comme « déjà vus » les leads existants (aucune alerte
 *                     pour le passé), puis crée le déclencheur toutes les minutes.
 *   desinstaller() -> supprime le déclencheur (le script s'arrête).
 *   etat()         -> écrit dans le journal le réglage et le compte utilisé.
 */

// ============================ RÉGLAGES ============================
var MODE_ESSAI = true;           // true = ne fait que lire et écrire dans le journal
var ALERTE_LA_NUIT = false;      // true = alerte immédiate même entre 20 h et 8 h et le dimanche
var MAIL_AU_LEAD = true;         // false = jamais de mail au lead, seulement l'alerte
var MINUTES_AVANT_ALERTE = 2;    // l'événement rouge commence dans 2 min
var DUREE_ALERTE_MIN = 15;

var COMPTE_ATTENDU = 'shawez@gravelin-immo.com';
var MAIL_ERREURS = 'shawez@gravelin-immo.com';
var SIGNATURE = 'Shawez Ali — Gravelin Immo — 07 67 57 92 28';
var JAMAIS_ECRIRE_A = ['contact-retire@exemple.fr', 'contact-retire@exemple.fr'];

var SHEET_VENDEURS_ID = '15tJaaanhDpATfunPHIM2lHu0CHqlgEJcNBX3vdCToHA';   // Suivi vendeurs — tous les dossiers
var SHEET_ACHETEURS_ID = '1WyEyLJ9Hi79wGEyzJXFty9I-yQQXWCrHvEFoHC0paNs';  // Suivi acquéreurs — tous les biens
var ONGLET_ACHETEURS = 'Leads';
var ONGLET_ESSAIS = 'Déclencheur (essais)';    // les faux leads de test vont ici, jamais dans le registre

var LIBELLE_TRAITE = 'Déclencheur/traité';
var LIBELLE_ENVOIS = '✉ Suivi envois';
var SUJET_TEST = '[TEST-DECLENCHEUR]';
var FENETRE_MS = 24 * 3600 * 1000;   // ne traite que les mails des dernières 24 h

// Recherche Gmail (limitée à 1 jour pour les quotas)
var REQUETE = 'newer_than:1d {' +
  'from:gravelin.evaluer-mon-logement.fr ' +
  'from:estimation@shawez-immo.com ' +
  'from:lead.seloger.com from:bienici.com from:la-boite-immo.com ' +
  'from:leboncoin.fr from:logic-immo.com from:pap.fr ' +
  'subject:"' + SUJET_TEST + '"}';

// ============================ ENTRÉES ============================

function tick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;          // un passage déjà en cours
  try { passage_(MODE_ESSAI, false); }
  catch (e) { signalerErreur_('passage', e); }
  finally { lock.releaseLock(); }
}

function essai() {
  Logger.log('=== MODE ESSAI : rien ne sera envoyé ni créé ===');
  passage_(true, true);
}

// Contrôle de lecture sur 30 jours (lecture seule, rien n'est envoyé ni créé)
function essaiLarge() {
  REQUETE = REQUETE.replace('newer_than:1d', 'newer_than:30d');
  FENETRE_MS = 30 * 24 * 3600 * 1000;
  Logger.log('=== ESSAI LARGE 30 JOURS : rien ne sera envoyé ni créé ===');
  passage_(true, true);
}

function installer() {
  verifierCompte_();
  // 1) baseline : tous les messages actuels sont « déjà vus »
  var vus = chargerVus_();
  var threads = GmailApp.search(REQUETE, 0, 100);
  var n = 0;
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (!vus[m.getId()]) { vus[m.getId()] = Date.now(); n++; }
    });
  });
  sauverVus_(vus);
  libelle_(LIBELLE_TRAITE);
  // 2) déclencheur unique toutes les minutes
  desinstaller();
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(1).create();
  Logger.log('Installé. ' + n + ' messages existants marqués comme déjà vus. Déclencheur : toutes les minutes.');
}

function desinstaller() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'tick') ScriptApp.deleteTrigger(tr);
  });
}

function etat() {
  var email = Session.getEffectiveUser().getEmail();
  Logger.log('Compte : ' + email + ' | fuseau : ' + Session.getScriptTimeZone());
  Logger.log('Type de compte : ' + (/@gmail\.com$/i.test(email) ? 'gratuit (90 min/jour de déclencheurs)' : 'Google Workspace (6 h/jour de déclencheurs)'));
  Logger.log('MODE_ESSAI=' + MODE_ESSAI + ' ALERTE_LA_NUIT=' + ALERTE_LA_NUIT + ' MAIL_AU_LEAD=' + MAIL_AU_LEAD);
  Logger.log('Déclencheurs : ' + ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }).join(', '));
}

// ============================ CŒUR ============================

function passage_(essaiMode, toutRelire) {
  verifierCompte_();
  var vus = chargerVus_();
  var curseurs = toutRelire ? {} : chargerCurseurs_();
  var threads = GmailApp.search(REQUETE, 0, 30);
  var aTraiter = [];

  threads.forEach(function (t) {
    var last = t.getLastMessageDate().getTime();
    if (!toutRelire && curseurs[t.getId()] === last) return;   // fil inchangé : on ne relit pas
    t.getMessages().forEach(function (m) {
      if (Date.now() - m.getDate().getTime() > FENETRE_MS) return;
      if (!toutRelire && vus[m.getId()]) return;
      aTraiter.push({ thread: t, msg: m });
    });
    curseurs[t.getId()] = last;
  });

  aTraiter.forEach(function (x) {
    var m = x.msg;
    try {
      var lead = analyser_(m);
      if (!lead) { if (!essaiMode) vus[m.getId()] = Date.now(); return; }
      if (lead.ignorer) {
        Logger.log('IGNORÉ (' + lead.ignorer + ') : ' + m.getSubject());
        if (!essaiMode) vus[m.getId()] = Date.now();
        return;
      }
      traiterLead_(lead, x.thread, m, essaiMode);
      if (!essaiMode) {
        vus[m.getId()] = Date.now();
        x.thread.addLabel(libelle_(LIBELLE_TRAITE));   // libellé posé APRÈS traitement
      }
    } catch (e) {
      signalerErreur_('lead ' + m.getSubject(), e);
      // pas marqué « vu » : il sera retenté au passage suivant
    }
  });

  if (!essaiMode) { sauverVus_(vus); sauverCurseurs_(curseurs); }
  if (essaiMode) Logger.log('=== Fin essai : ' + aTraiter.length + ' message(s) lus ===');
}

function traiterLead_(lead, thread, m, essaiMode) {
  var lien = 'https://mail.google.com/mail/u/0/#all/' + m.getId();
  var maintenant = new Date();

  // a) ALERTE AGENDA
  var debut = heureAlerte_(maintenant);
  var titre = '📞 APPELER MAINTENANT — ' + lead.nom + ' — ' + (lead.tel || 'pas de tél.') + ' — ' + (lead.ville || '?') + ' (' + lead.sourceCourte + ')';
  var desc = descriptionAlerte_(lead, lien, debut, maintenant);

  // b) MAIL AU LEAD
  var decisionMail = peutEcrire_(lead, maintenant);
  var creneaux = decisionMail.ok ? deuxCreneaux_(maintenant) : [];

  if (essaiMode) {
    Logger.log('--- LEAD : ' + lead.source + ' | ' + lead.nom + ' | ' + lead.tel + ' | ' + lead.ville + ' | ' + (lead.email || 'pas de mail') + ' | ' + (lead.type || 'type ?'));
    Logger.log('   Alerte : « ' + titre + ' » à ' + fmt_(debut, 'EEEE dd/MM HH:mm'));
    Logger.log('   Mail au lead : ' + (decisionMail.ok ? 'OUI → ' + lead.email + ' (créneaux : ' + creneaux.map(texteCreneau_).join(' / ') + ')' : 'NON (' + decisionMail.raison + ')'));
    Logger.log('   Sheet : ' + (lead.test ? ONGLET_ESSAIS : (lead.acheteur ? 'Suivi acquéreurs' : 'Suivi vendeurs')));
    return;
  }

  var dejaAlerte = alerteExiste_(lead, debut);
  if (!dejaAlerte) {
    var cal = CalendarApp.getDefaultCalendar();
    var ev = cal.createEvent(titre, debut, new Date(debut.getTime() + DUREE_ALERTE_MIN * 60000), { description: desc });
    ev.setColor('11');
    ev.removeAllReminders();
    ev.addPopupReminder(0);
  }

  var heureMail = '';
  if (decisionMail.ok) {
    var mail = composerMail_(lead, creneaux);
    GmailApp.sendEmail(lead.email, mail.sujet, mail.texte, { name: 'Shawez Ali', replyTo: COMPTE_ATTENDU });
    heureMail = fmt_(new Date(), 'HH:mm');
    Utilities.sleep(1500);
    var envoyes = GmailApp.search('in:sent to:' + lead.email + ' newer_than:1h', 0, 1);
    if (envoyes.length) envoyes[0].addLabel(libelle_(LIBELLE_ENVOIS));
  }

  // c) TRACE DANS LE SHEET
  var statut = 'Alerte envoyée' + (dejaAlerte ? ' (déjà dans l\'agenda)' : '') + (heureMail ? ' + Mail envoyé à ' + heureMail : '');
  tracer_(lead, statut, heureMail, decisionMail, lien);
  Logger.log('TRAITÉ : ' + lead.nom + ' | ' + statut);
}

// ============================ LECTURE DES MAILS ============================

function analyser_(m) {
  var from = (m.getFrom() || '').toLowerCase();
  var sujet = m.getSubject() || '';
  var corps = m.getPlainBody() || '';
  var lead = null;

  if (sujet.indexOf(SUJET_TEST) !== -1) {
    if (from.indexOf(COMPTE_ATTENDU) === -1) return { ignorer: 'sujet de test venant d\'un autre expéditeur' };
    lead = lireSite_(corps);
    lead.source = 'TEST (faux lead)'; lead.sourceCourte = 'TEST'; lead.test = true; lead.acheteur = false;
  } else if (from.indexOf('evaluer-mon-logement.fr') !== -1) {
    if (!/nouveau lead/i.test(sujet)) return null;
    lead = {
      nom: champ_(corps, 'Nom'), tel: champ_(corps, 'Téléphone'), ville: champ_(corps, 'Ville'),
      email: champ_(corps, 'E-mail') || champ_(corps, 'Email'), type: champ_(corps, 'Type'),
      nomInverse: true
    };
    lead.source = 'Mandat Machine (alerte mail)'; lead.sourceCourte = 'Mandat Machine'; lead.acheteur = false;
    lead.message = /lead vendeur/i.test(sujet) ? 'Lead vendeur' : 'Demande d\'estimation';
  } else if (from.indexOf('estimation@shawez-immo.com') !== -1) {
    if (!/^Estimation/i.test(sujet)) return null;         // lien de connexion, etc.
    lead = lireSite_(corps);
    lead.source = 'Site shawez-immo.com'; lead.sourceCourte = 'site'; lead.acheteur = false;
    var bruit = sujet + '\n' + corps;
    if (/\bTEST\b|essai|@test\.invalid|à ignorer/i.test(bruit)) return { ignorer: 'essai du site' };
  } else if (from.indexOf('lead.seloger.com') !== -1) {
    if (!/acquéreur/i.test(sujet)) return null;
    lead = lireSeLoger_(corps);
    lead.source = 'SeLoger'; lead.sourceCourte = 'SeLoger'; lead.acheteur = true;
  } else if (from.indexOf('bienici.com') !== -1) {
    if (!/prospect/i.test(sujet)) return null;
    lead = lireBienici_(corps);
    lead.source = 'Bien\'ici'; lead.sourceCourte = 'Bien\'ici'; lead.acheteur = true;
  } else if (from.indexOf('la-boite-immo.com') !== -1) {
    if (!/lead/i.test(sujet)) return null;
    lead = lireHektor_(corps);
    var passerelle = (corps.match(/passerelle\s+(\S+)/i) || [])[1] || 'portail';
    lead.source = passerelle.replace(/direct$/i, '') + ' (Hektor)'; lead.sourceCourte = lead.source; lead.acheteur = true;
  } else {
    return null;   // autre portail : format non connu, ignoré sans erreur
  }

  lead.nom = propre_(lead.nom) || 'Sans nom';
  lead.tel = normTelAffiche_(lead.tel);
  lead.email = (lead.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) lead.email = '';
  lead.ville = propre_(lead.ville);
  lead.extrait = corps.replace(/\[https?:[^\]]*\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 1500);
  if (!lead.tel && !lead.email) return { ignorer: 'ni téléphone ni e-mail' };
  return lead;
}

function lireSite_(c) {
  return {
    nom: champ_(c, 'Contact') || champ_(c, 'Nom'), tel: champ_(c, 'Téléphone'), email: champ_(c, 'E-mail'),
    type: champ_(c, 'Type'), surface: champ_(c, 'Surface'), delai: champ_(c, 'Délai'),
    ville: villeDepuisAdresse_(champ_(c, 'Adresse')) || champ_(c, 'Ville'), adresse: champ_(c, 'Adresse')
  };
}

function lireSeLoger_(c) {
  var t = c.replace(/\s*\n\s*/g, ' ');
  var nom = (t.match(/([A-ZÀ-Ýa-zà-ÿ' -]{2,60}?) s'intéresse à ce bien/) || [])[1];
  var mails = (c.match(/mailto:([^\s\]>"]+)/g) || []).map(function (x) { return x.replace('mailto:', ''); })
    .filter(function (x) { return !/seloger|groupe-seloger|aviv/i.test(x); });
  var tel = (c.match(/tel:(\+?\d{9,13})/) || [])[1];
  var ville = (t.match(/€\s+([A-ZÀ-Ý' -]{2,40}?)\s*,\s*(\d{5})/) || []);
  var type = (t.match(/\d{5}\s+(Appartement|Maison|Terrain|Local|Immeuble|Parking|Commerce)/i) || [])[1];
  var ref = (t.match(/Ref\. de l'annonce\s*:\s*(\S+)/i) || [])[1];
  var msg = (c.match(/projet\s*\n([\s\S]{5,600}?)\n\s*mailto:/i) || [])[1];
  return { nom: nom, email: mails[0], tel: tel, ville: ville[1] ? titre_(ville[1]) : '', type: type, ref: ref, message: msg ? msg.trim() : '' };
}

function lireBienici_(c) {
  var t = c.replace(/\[https?:[^\]]*\]/g, '');
  var nom = (t.match(/Ses coordonn[ée]es\s*(.+?)\s*T[ée]l[ée]phone/i) || [])[1];
  var ref = (t.match(/R[ÉE]F[ÉE]RENCE\s*:\s*(\S+)/i) || [])[1];
  var ville = (t.match(/\n\s*\d{5}\s+([^\n]+)/) || [])[1];
  var type = (t.match(/\n\s*(Appartement|Maison|Terrain|Local commercial|Local|Immeuble)[^\n]*/i) || [])[1];
  var msg = (t.match(/Son message\s*([\s\S]{2,600}?)\n\s*Rappel de l/i) || [])[1];
  return { nom: nom, tel: champ_(t, 'Téléphone'), email: champ_(t, 'E-mail'), ville: ville, type: type, ref: ref, message: msg ? msg.trim() : '' };
}

function lireHektor_(c) {
  var nom = champ_(c, 'Nom'), prenom = champ_(c, 'Prénom');
  var annonce = champ_(c, 'Annonce') || '';
  var ref = (annonce.match(/\((\d+)\)/) || [])[1];
  var msg = (c.match(/Message\s*\n([\s\S]{2,800}?)\n\s*A bientôt/i) || [])[1];
  var nomComplet = nom;
  if (prenom && nom && nom.toLowerCase().indexOf(prenom.split(' ')[0].toLowerCase()) === 0) nomComplet = titre_(nom);
  else if (prenom) nomComplet = titre_(prenom.split(' ')[0]) + ' ' + titre_(nom || '');
  var villeH = (c.match(/Annonce[^\n]*\n\s*([A-ZÀ-Ý][^\n]{1,40})\n/) || [])[1];
  return { nom: nomComplet, tel: champ_(c, 'Téléphone'), email: champ_(c, 'Email'), ville: (villeH || '').replace(/\s*\(\d+\)\s*$/, ''), type: annonce.split('–')[1] ? annonce.split('–')[1].trim() : annonce, ref: ref, message: msg ? msg.trim() : '' };
}

// ============================ RÈGLES ============================

function heureAlerte_(now) {
  var d = new Date(now.getTime() + MINUTES_AVANT_ALERTE * 60000);
  if (ALERTE_LA_NUIT) return d;
  var h = d.getHours();
  var nuit = h >= 20 || h < 8;
  var dimanche = d.getDay() === 0;
  if (!nuit && !dimanche) return d;
  var j = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);
  if (h >= 20 || dimanche) j.setDate(j.getDate() + 1);   // après 20 h : lendemain
  while (j.getDay() === 0) j.setDate(j.getDate() + 1);    // jamais un dimanche
  return j;
}

function peutEcrire_(lead, now) {
  if (!MAIL_AU_LEAD) return { ok: false, raison: 'mail au lead désactivé' };
  if (!lead.email) return { ok: false, raison: 'pas d\'adresse e-mail' };
  if (JAMAIS_ECRIRE_A.indexOf(lead.email) !== -1) return { ok: false, raison: 'contact bloqué' };
  var jour = now.getDay(), h = now.getHours();
  if (jour === 0 || h < 8 || h >= 19) return { ok: false, raison: 'hors horaires (lun-sam 8 h-19 h) : l\'agent Suivi s\'en charge' };
  var echanges = GmailApp.search('(from:' + lead.email + ' OR to:' + lead.email + ' OR cc:' + lead.email + ') -in:trash', 0, 1);
  if (echanges.length) return { ok: false, raison: 'un échange existe déjà avec cette adresse' };
  return { ok: true };
}

function deuxCreneaux_(now) {
  var cal = CalendarApp.getDefaultCalendar();
  var heures = [[10, 0], [11, 30], [14, 30], [16, 0], [17, 30]];
  var min = new Date(now.getTime() + 24 * 3600 * 1000);
  var res = [];
  var jour = new Date(min.getFullYear(), min.getMonth(), min.getDate());
  for (var i = 0; i < 10 && res.length < 2; i++, jour.setDate(jour.getDate() + 1)) {
    if (jour.getDay() === 0) continue;
    if (res.length && res[0].toDateString() === jour.toDateString()) continue;
    var evs = cal.getEvents(new Date(jour.getTime()), new Date(jour.getTime() + 24 * 3600 * 1000))
      .filter(function (e) { return !e.isAllDayEvent() && e.getMyStatus() !== CalendarApp.GuestStatus.NO; });
    for (var k = 0; k < heures.length; k++) {
      var s = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), heures[k][0], heures[k][1]);
      var e = new Date(s.getTime() + 60 * 60000);
      if (s < min) continue;
      var pris = evs.some(function (ev) { return ev.getStartTime() < new Date(e.getTime() + 30 * 60000) && ev.getEndTime() > new Date(s.getTime() - 30 * 60000); });
      if (!pris) { res.push(s); break; }
    }
  }
  return res;
}

function alerteExiste_(lead, debut) {
  var cal = CalendarApp.getDefaultCalendar();
  var cle = lead.tel || lead.email;
  var a = new Date(Date.now() - 6 * 3600 * 1000), b = new Date(debut.getTime() + 24 * 3600 * 1000);
  return cal.getEvents(a, b).some(function (ev) {
    var t = ev.getTitle();
    return t.indexOf('APPELER MAINTENANT') !== -1 && chiffres_(t).indexOf(chiffres_(cle)) !== -1 && chiffres_(cle).length >= 9;
  });
}

// ============================ TEXTES ============================

function composerMail_(lead, creneaux) {
  var salut = salutation_(lead);
  var bien = lead.type ? bienTexte_(lead.type) : 'votre bien';
  var ville = lead.ville ? ' à ' + lead.ville : '';
  var lignes = [];
  var sujet;
  if (lead.acheteur) {
    sujet = 'Votre demande' + (lead.type ? ' pour ' + bienTexte_(lead.type, true) : '') + ville;
    lignes.push(salut);
    lignes.push('');
    lignes.push('Merci pour votre message au sujet ' + deBien_(lead.type) + ville + (lead.ref ? ' (réf. ' + lead.ref + ')' : '') + '.');
    lignes.push('');
    lignes.push('Je vous appelle dans les prochaines minutes' + (lead.tel ? ' au ' + lead.tel : '') + '.');
    if (creneaux.length === 2) lignes.push('Si vous préférez venir le voir directement, je peux vous le faire visiter ' + texteCreneau_(creneaux[0]) + ' ou ' + texteCreneau_(creneaux[1]) + '. Dites-moi ce qui vous arrange.');
  } else {
    sujet = 'Votre estimation' + ville;
    lignes.push(salut);
    lignes.push('');
    lignes.push('Merci pour votre demande d\'estimation pour ' + bien + ville + ', je l\'ai bien reçue.');
    lignes.push('');
    lignes.push('Je vous appelle dans les prochaines minutes' + (lead.tel ? ' au ' + lead.tel : '') + '.');
    if (creneaux.length === 2) lignes.push('Si ce n\'est pas le bon moment, je peux aussi passer voir le bien ' + texteCreneau_(creneaux[0]) + ' ou ' + texteCreneau_(creneaux[1]) + '. L\'estimation est offerte et sans engagement.');
    lignes.push('');
    lignes.push('Je travaille à l\'agence Gravelin Immo, rue Bannelier à Dijon, notée 4,8/5 sur 137 avis Google.');
  }
  lignes.push('');
  lignes.push('À tout de suite,');
  lignes.push('');
  lignes.push(SIGNATURE);
  return { sujet: sujet, texte: lignes.join('\n') };
}

function salutation_(lead) {
  var n = (lead.nom || '').trim();
  var civ = (n.match(/^(M\.|Mme|Madame|Monsieur|Mlle)\s+/i) || [])[1];
  n = n.replace(/^(M\.|Mme|Madame|Monsieur|Mlle)\s+/i, '');
  var mots = n.split(/\s+/).filter(Boolean);
  if (civ && mots.length) {
    var c = /^m\.|monsieur/i.test(civ) ? 'Monsieur' : 'Madame';
    return 'Bonjour ' + c + ' ' + titre_(mots[mots.length - 1]) + ',';
  }
  if (!mots.length || /^sans nom$/i.test(n)) return 'Bonjour,';
  var prenom = lead.nomInverse && mots.length > 1 ? mots[mots.length - 1] : mots[0];
  if (prenom.length < 2 || /^(je|moi|test)$/i.test(prenom)) return 'Bonjour,';
  return 'Bonjour ' + titre_(prenom) + ',';
}

function bienTexte_(type, article) {
  var t = (type || '').toLowerCase();
  if (/appart/.test(t)) return article ? 'l\'appartement' : 'votre appartement';
  if (/maison/.test(t)) return article ? 'la maison' : 'votre maison';
  if (/terrain/.test(t)) return article ? 'le terrain' : 'votre terrain';
  if (/fonds|commerce|local|restaurant|bar/.test(t)) return article ? 'le local' : 'votre local';
  if (/immeuble/.test(t)) return article ? 'l\'immeuble' : 'votre immeuble';
  return article ? 'le bien' : 'votre bien';
}

function deBien_(type) {
  var b = bienTexte_(type, true);
  if (b.indexOf('le ') === 0) return 'du ' + b.slice(3);
  return 'de ' + b;
}

function texteCreneau_(d) {
  var jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var h = d.getHours() + ' h' + (d.getMinutes() ? ' ' + ('0' + d.getMinutes()).slice(-2) : '');
  return jours[d.getDay()] + ' ' + d.getDate() + ' ' + mois[d.getMonth()] + ' à ' + h;
}

function descriptionAlerte_(lead, lien, debut, now) {
  var l = [];
  l.push('Nouveau lead ' + lead.source + ' reçu le ' + fmt_(now, 'dd/MM à HH:mm') + '.');
  if (debut.getTime() - now.getTime() > 10 * 60000) l.push('(Arrivé la nuit ou le dimanche : alerte placée au jour ouvré suivant à 9 h.)');
  l.push('');
  l.push('Nom : ' + lead.nom);
  l.push('Téléphone : ' + (lead.tel || '—'));
  l.push('E-mail : ' + (lead.email || '—'));
  l.push('Ville : ' + (lead.ville || '—'));
  if (lead.adresse) l.push('Adresse : ' + lead.adresse);
  if (lead.type) l.push('Bien : ' + lead.type + (lead.surface ? ', ' + lead.surface : ''));
  if (lead.ref) l.push('Réf. annonce : ' + lead.ref);
  if (lead.delai) l.push('Délai : ' + lead.delai);
  if (lead.message) l.push('Message : ' + lead.message);
  l.push('');
  l.push('Mail d\'origine : ' + lien);
  l.push('');
  l.push('--- Contenu du mail ---');
  l.push(lead.extrait || '');
  l.push('');
  l.push('(posé par le Déclencheur leads 1 min le ' + fmt_(now, 'dd/MM à HH\'h\'mm') + ')');
  return l.join('\n').slice(0, 7000);
}

// ============================ SHEET ============================

function tracer_(lead, statut, heureMail, decisionMail, lien) {
  var ss, sh;
  if (lead.test) {
    ss = SpreadsheetApp.openById(SHEET_VENDEURS_ID);
    sh = ss.getSheetByName(ONGLET_ESSAIS) || ss.insertSheet(ONGLET_ESSAIS);
    if (sh.getLastRow() === 0) sh.appendRow(['Date', 'Heure', 'Source', 'Nom', 'Téléphone', 'Mail', 'Statut', 'Lien']);
    sh.appendRow([fmt_(new Date(), 'dd/MM/yyyy'), fmt_(new Date(), 'HH:mm:ss'), lead.source, lead.nom, lead.tel, lead.email, statut, lien]);
    return;
  }
  ss = SpreadsheetApp.openById(lead.acheteur ? SHEET_ACHETEURS_ID : SHEET_VENDEURS_ID);
  sh = lead.acheteur ? (ss.getSheetByName(ONGLET_ACHETEURS) || ss.getSheets()[0]) : ss.getSheets()[0];
  var data = sh.getDataRange().getValues();
  var head = data[0].map(function (h) { return String(h).trim(); });
  var col = function (nom) { return head.indexOf(nom); };
  var cTel = col('Téléphone'), cMail = col('Mail'), cNotes = col(lead.acheteur ? 'Notes agent' : 'Géré par / notes agent');
  var telN = chiffres9_(lead.tel);
  var now = new Date();
  var note = 'Déclencheur ' + fmt_(now, 'dd/MM HH:mm') + ' : nouveau contact via ' + lead.source + ' — ' + statut;

  for (var r = 1; r < data.length; r++) {
    var memeTel = telN && cTel >= 0 && chiffres9_(String(data[r][cTel])) === telN;
    var memeMail = lead.email && cMail >= 0 && String(data[r][cMail]).trim().toLowerCase() === lead.email;
    if (memeTel || memeMail) {
      if (cNotes >= 0) {
        var cell = sh.getRange(r + 1, cNotes + 1);
        cell.setValue((String(cell.getValue()) ? cell.getValue() + ' | ' : '') + note);
      }
      return;   // déjà dans le registre : pas de 2e ligne
    }
  }

  var prefixe = lead.acheteur ? 'A' : 'V';
  var max = 0;
  for (var i = 1; i < data.length; i++) {
    var m = String(data[i][0]).match(/^[AV](\d+)$/);
    if (m) max = Math.max(max, +m[1]);
  }
  var row = head.map(function () { return ''; });
  var set = function (nom, v) { var c = col(nom); if (c >= 0) row[c] = v; };
  set('ID', prefixe + ('00' + (max + 1)).slice(-3));
  set('Date d\'arrivée', fmt_(now, 'dd/MM/yyyy HH:mm'));
  set('Source', lead.source);
  set('Nom', lead.nom);
  set('Téléphone', lead.tel);
  set('Mail', lead.email);
  set('Statut', statut);
  set('Envois faits (1 étape = 1 envoi)', heureMail ? 'Mail d\'accusé de réception envoyé à ' + heureMail + ' (Déclencheur)' : 'Aucun (' + decisionMail.raison + ')');
  set('Message', lead.message || '');
  set('Message du client', lead.message || '');
  set('Type', lead.type || '');
  set('Surface', lead.surface || '');
  set('Projet / délai', lead.delai || '');
  set('Adresse du bien / ville', lead.adresse || lead.ville || '');
  set('Ville', lead.ville || '');
  set('Réf bien', lead.ref || '');
  set('Étape', '1er contact');
  set('Prochaine action', 'Appel Shawez (alerte rouge dans l\'agenda)');
  if (heureMail) { set('Dernier contact – date', fmt_(now, 'dd/MM/yyyy HH:mm')); set('Dernier contact – canal', 'Mail'); set('Dernier contact – texte', 'Accusé de réception + appel annoncé (Déclencheur)'); }
  set(lead.acheteur ? 'Notes agent' : 'Géré par / notes agent', 'Ajouté par le Déclencheur leads 1 min. Mail d\'origine : ' + lien);
  sh.appendRow(row);
}

// ============================ OUTILS ============================

function champ_(corps, nom) {
  var re = new RegExp('(?:^|\\n)\\s*' + nom.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:?\\s*\\n?\\s*([^\\n]+)', 'i');
  var m = corps.match(re);
  return m ? m[1].replace(/\[[^\]]*\]/g, '').trim() : '';
}
function villeDepuisAdresse_(a) { var m = (a || '').match(/\d{5}\s+(.+)$/); return m ? m[1].trim() : ''; }
function propre_(s) { return (s || '').replace(/\s+/g, ' ').replace(/^À\s+/i, '').trim(); }
function titre_(s) { return (s || '').toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, function (a, b, c) { return b + c.toUpperCase(); }); }
function chiffres_(s) { return String(s || '').replace(/\D/g, ''); }
function chiffres9_(s) { var d = chiffres_(s); return d.length >= 9 ? d.slice(-9) : ''; }
function normTelAffiche_(t) {
  var d = chiffres_(t);
  if (!d) return '';
  if (d.indexOf('33') === 0 && d.length === 11) d = '0' + d.slice(2);
  if (d.length === 10) return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  return (t || '').trim();
}
function fmt_(d, p) { return Utilities.formatDate(d, 'Europe/Paris', p); }

function libelle_(nom) { return GmailApp.getUserLabelByName(nom) || GmailApp.createLabel(nom); }

function verifierCompte_() {
  var e = Session.getEffectiveUser().getEmail();
  if (e && e.toLowerCase() !== COMPTE_ATTENDU) throw new Error('Mauvais compte : ' + e + ' (attendu ' + COMPTE_ATTENDU + ')');
}

function chargerVus_() {
  var p = PropertiesService.getScriptProperties().getProperty('vus');
  var v = p ? JSON.parse(p) : {};
  var limite = Date.now() - 3 * 24 * 3600 * 1000;
  Object.keys(v).forEach(function (k) { if (v[k] < limite) delete v[k]; });
  return v;
}
function sauverVus_(v) { PropertiesService.getScriptProperties().setProperty('vus', JSON.stringify(v)); }
function chargerCurseurs_() { var p = PropertiesService.getScriptProperties().getProperty('curseurs'); return p ? JSON.parse(p) : {}; }
function sauverCurseurs_(c) {
  var keys = Object.keys(c);
  if (keys.length > 100) keys.slice(0, keys.length - 100).forEach(function (k) { delete c[k]; });
  PropertiesService.getScriptProperties().setProperty('curseurs', JSON.stringify(c));
}

function signalerErreur_(ou, e) {
  Logger.log('ERREUR ' + ou + ' : ' + e + '\n' + (e && e.stack));
  var cache = CacheService.getScriptCache();
  var cle = 'err_' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(ou) + String(e))).slice(0, 20);
  if (cache.get(cle)) return;              // même erreur déjà signalée dans l'heure
  cache.put(cle, '1', 3600);
  try {
    MailApp.sendEmail(MAIL_ERREURS, '⚠️ Déclencheur leads : erreur',
      'Où : ' + ou + '\nErreur : ' + e + '\n\n' + (e && e.stack ? e.stack : '') +
      '\n\nLe lead n\'est pas perdu : il sera retenté à la minute suivante. Si ce mail revient, le script est à vérifier.');
  } catch (x) { Logger.log('Impossible d\'envoyer le mail d\'erreur : ' + x); }
}
