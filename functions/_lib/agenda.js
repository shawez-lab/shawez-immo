/* Agenda réel de l'agent : les créneaux proposés aux vendeurs ne tombent jamais sur un moment déjà pris.

   Deux sources, sans aucun abonnement :
   1. les visites d'estimation déjà fixées dans la base (table visites) ;
   2. l'agenda Google de l'agent, si son « adresse secrète au format iCal » est enregistrée dans /admin/ → Réglages
      (réglage « agenda_ics » ; l'adresse n'est jamais renvoyée au navigateur). Lecture seule : rien n'est écrit dans l'agenda.

   Un créneau de visite (45 min) est retiré s'il chevauche un moment occupé, marge de trajet comprise (30 min avant et après).
   Événements ignorés : annulés, « Disponible » (TRANSP:TRANSPARENT, c'est le cas par défaut des journées entières Google).
   Répétitions prises en charge : FREQ=DAILY|WEEKLY (+ INTERVAL, COUNT, UNTIL, BYDAY), EXDATE. Le reste est lu comme un
   événement unique (plus prudent : on ne perd jamais une répétition qui bloquerait, on peut seulement en oublier). */
import { paris, deParis } from './suivi.js';

export const MARGE_TRAJET_MS = 30 * 60000;
const CACHE_MS = 5 * 60000;
let cache = { url: null, t: 0, occupe: null };

/* « 20261012T110000Z », « 20261012T110000 » (heure de Paris), « 20261012 » (journée) → Date */
function lireDate(valeur, params) {
  const v = String(valeur || '').trim();
  let m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (m) {
    if (m[7] === 'Z') return { d: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])), jour: false };
    // TZID=Europe/Paris ou heure « flottante » : l'agent travaille à Dijon, on lit l'heure de Paris
    return { d: deParis(+m[1], +m[2], +m[3], +m[4], +m[5]), jour: false };
  }
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m) return { d: deParis(+m[1], +m[2], +m[3], 0, 0), jour: true };
  return null;
}

/* Lignes iCal dépliées (RFC 5545 : une ligne qui commence par une espace prolonge la précédente) */
function lignes(ics) {
  return String(ics || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
}

export function lireEvenements(ics) {
  const evts = [];
  let e = null;
  for (const brute of lignes(ics)) {
    if (brute === 'BEGIN:VEVENT') { e = { exdates: [] }; continue; }
    if (brute === 'END:VEVENT') { if (e) evts.push(e); e = null; continue; }
    if (!e) continue;
    const i = brute.indexOf(':');
    if (i < 0) continue;
    const [nom, ...params] = brute.slice(0, i).split(';');
    const valeur = brute.slice(i + 1);
    const P = Object.fromEntries(params.map((p) => p.split('=')));
    switch (nom.toUpperCase()) {
      case 'DTSTART': e.debut = lireDate(valeur, P); break;
      case 'DTEND': e.fin = lireDate(valeur, P); break;
      case 'DURATION': e.duree = valeur; break;
      case 'RRULE': e.rrule = Object.fromEntries(valeur.split(';').map((p) => p.split('='))); break;
      case 'EXDATE': for (const x of valeur.split(',')) { const d = lireDate(x, P); if (d) e.exdates.push(d.d.getTime()); } break;
      case 'STATUS': e.statut = valeur.trim().toUpperCase(); break;
      case 'TRANSP': e.transp = valeur.trim().toUpperCase(); break;
      case 'RECURRENCE-ID': e.recurrence = lireDate(valeur, P); break;
      default:
    }
  }
  return evts;
}

function dureeMs(e) {
  if (e.fin && e.debut) return Math.max(0, e.fin.d.getTime() - e.debut.d.getTime());
  if (e.duree) {
    const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(e.duree.trim());
    if (m) return ((+m[1] || 0) * 7 * 86400 + (+m[2] || 0) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1000;
  }
  return e.debut && e.debut.jour ? 86400000 : 3600000;
}

const JOURS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/* Moments occupés [début, fin] (ms) entre « de » et « a » */
export function occupations(evts, de, a) {
  const out = [];
  for (const e of evts) {
    if (!e.debut || e.statut === 'CANCELLED' || e.transp === 'TRANSPARENT') continue;
    const d0 = e.debut.d.getTime();
    const dur = dureeMs(e);
    const ajouter = (t) => { if (t + dur > de && t < a && !e.exdates.includes(t)) out.push([t, t + dur]); };
    const r = e.rrule;
    if (!r || !['DAILY', 'WEEKLY'].includes(r.FREQ)) { ajouter(d0); continue; }
    const pas = Math.max(1, parseInt(r.INTERVAL, 10) || 1);
    const fin = r.UNTIL ? (lireDate(r.UNTIL, {}) || { d: new Date(8.64e15) }).d.getTime() : Infinity;
    const max = r.COUNT ? parseInt(r.COUNT, 10) : Infinity;
    const p0 = paris(e.debut.d);
    const jours = r.FREQ === 'WEEKLY' && r.BYDAY
      ? r.BYDAY.split(',').map((x) => JOURS[x.replace(/^[+-]?\d+/, '')]).filter((x) => x != null)
      : null;
    let n = 0;
    // on avance jour par jour (heure de Paris, changements d'heure compris) ; 400 jours au plus après le début
    for (let k = 0; k < 400 * pas && n < max; k++) {
      const t = deParis(p0.a, p0.m, p0.j + k, p0.h, p0.min).getTime();
      if (t > fin || t > a) break;
      const semaine = Math.floor(k / 7);
      let pris;
      if (r.FREQ === 'DAILY') pris = k % pas === 0;
      else if (jours) pris = semaine % pas === 0 && jours.includes(paris(new Date(t)).jour);
      else pris = k % (7 * pas) === 0;
      if (!pris) continue;
      n++;
      ajouter(t);
    }
  }
  return out;
}

/* L'adresse iCal acceptée : celle que Google donne (« Adresse secrète au format iCal »). */
export function adresseIcsValide(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && x.hostname === 'calendar.google.com' && /^\/calendar\/ical\/[^/]+\/[^/]+\/basic\.ics$/.test(x.pathname);
  } catch (e) { return false; }
}

/* Moments occupés de l'agenda Google (cache 5 min). null si l'agenda n'est pas lisible (on le dit, on ne devine pas). */
export async function agendaOccupe(url, de, a, fetcher = fetch) {
  if (!url) return null;
  const now = Date.now();
  if (cache.url !== url || now - cache.t > CACHE_MS || !cache.occupe) {
    try {
      const r = await fetcher(url, { headers: { Accept: 'text/calendar' }, cf: { cacheTtl: 120 } });
      if (!r.ok) return null;
      const evts = lireEvenements(await r.text());
      cache = { url, t: now, occupe: occupations(evts, now - 86400000, now + 30 * 86400000) };
    } catch (e) { return null; }
  }
  return cache.occupe.filter(([d, f]) => f > de && d < a);
}

/* Retire des jours de créneaux (sortie de creneaux()) ceux qui chevauchent un moment occupé. */
export function retirerOccupes(jours, occupe, dureeMin) {
  if (!occupe || !occupe.length) return jours;
  const libre = (iso) => {
    const d = Date.parse(iso) - MARGE_TRAJET_MS, f = Date.parse(iso) + dureeMin * 60000 + MARGE_TRAJET_MS;
    return !occupe.some(([a, b]) => a < f && b > d);
  };
  return jours.map((j) => {
    const heures = j.heures.filter((h) => libre(h.debut));
    return { ...j, heures, sous48h: heures.some((x) => x.sous48h) };
  }).filter((j) => j.heures.length);
}

export function viderCache() { cache = { url: null, t: 0, occupe: null }; }
