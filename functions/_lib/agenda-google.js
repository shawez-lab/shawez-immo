/* Synchronisation serveur des visites vers Google Agenda.
   Les secrets sont fournis uniquement par l'environnement de production.
   La base du site reste la source de vérité ; les réservations directes
   sont provisoires jusqu'à confirmation par l'agence. Aucun invité ajouté. */
const PREFIX = 'ag'; // alphabet base32hex accepté par Google Agenda
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_URL = 'https://www.googleapis.com/calendar/v3/calendars/';
const PARIS = 'Europe/Paris';
const SCHEMA = "CREATE TABLE IF NOT EXISTS agenda_google_sync (demande_id INTEGER PRIMARY KEY, event_id TEXT NOT NULL UNIQUE, empreinte TEXT NOT NULL DEFAULT '', debut TEXT NOT NULL DEFAULT '')";
const LOCK = "CREATE TABLE IF NOT EXISTS agenda_google_verrou (id INTEGER PRIMARY KEY, jeton TEXT NOT NULL, expire INTEGER NOT NULL)";

export function agendaGoogleConfigure(env, url) {
  return new URL(url).hostname === 'shawez-immo.com' &&
    String(env.GOOGLE_CALENDAR_SYNC_ENABLED || '') === '1' &&
    !!(env.GOOGLE_CALENDAR_ID && env.GOOGLE_CALENDAR_CLIENT_ID &&
       env.GOOGLE_CALENDAR_CLIENT_SECRET && env.GOOGLE_CALENDAR_REFRESH_TOKEN &&
       Number.isFinite(Date.parse(env.GOOGLE_CALENDAR_SYNC_FROM)));
}

function objet(s) { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } }
function dateValide(s) { return typeof s === 'string' && Number.isFinite(Date.parse(s)); }

/* Une demande directe ne propose qu'un seul créneau ; les propositions multiples
   d'estimation ne bloquent pas l'agenda tant que l'agence n'en choisit pas un. */
export function evenementSouhaite(d, maintenant, depuis) {
  if (!d || d.suspect || d.en_attente || ['pause', 'close'].includes(d.statut)) return null;
  const c = objet(d.contact);
  if (/^test\b/i.test(c.prenom || '') || /@test\.invalid$/i.test(c.email || '')) return null;
  let debut, provisoire = false;
  if (d.etat === 'fixee') debut = d.debut;
  else if (d.etat === 'demandee' && ['visite_bien', 'rdv'].includes(objet(d.reponses).autre_type)) {
    const liste = objet(d.creneaux);
    if (Array.isArray(liste) && liste.length === 1) { debut = liste[0]; provisoire = true; }
  }
  if (!dateValide(debut) || Date.parse(debut) <= maintenant ||
      (!d.event_id && !(Date.parse(d.maj_le || d.fixee_le || d.demandee_le || d.cree_le) >= depuis))) return null;
  const duree = Number(d.duree) || 45;
  if (duree < 1 || duree > 480) return null;
  const type = objet(d.reponses).autre_type === 'visite_bien' ? 'Visite immobilière' : 'Rendez-vous immobilier';
  const nom = [c.prenom, c.nom].filter(Boolean).join(' ').slice(0, 100);
  return {
    summary: (provisoire ? 'À confirmer — ' : '') + type + (nom ? ' — ' + nom : ''),
    description: 'Référence site : ' + d.reference,
    location: String(d.adresse || '').slice(0, 200),
    start: { dateTime: new Date(debut).toISOString(), timeZone: PARIS },
    end: { dateTime: new Date(Date.parse(debut) + duree * 60000).toISOString(), timeZone: PARIS },
    status: provisoire ? 'tentative' : 'confirmed', transparency: 'opaque', visibility: 'private',
    extendedProperties: { private: { origine: 'shawez-immo', demande: String(d.demande_id) } },
  };
}

function idEvenement() { return PREFIX + crypto.randomUUID().replace(/-/g, ''); }
function erreur(code) { return new Error('agenda_google_' + code); }
async function requete(fetcher, url, options) {
  return fetcher(url, { ...options, signal: AbortSignal.timeout(8000), redirect: 'error' });
}
async function jetonGoogle(env, fetcher) {
  const r = await requete(fetcher, TOKEN_URL, { method: 'POST', body: new URLSearchParams({
    client_id: env.GOOGLE_CALENDAR_CLIENT_ID, client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    refresh_token: env.GOOGLE_CALENDAR_REFRESH_TOKEN, grant_type: 'refresh_token',
  }) });
  if (!r.ok) throw erreur('oauth_' + r.status);
  const j = await r.json();
  if (!j.access_token) throw erreur('oauth_sans_jeton');
  return j.access_token;
}

/* L'identifiant est enregistré avant l'appel Google. Une réponse perdue ne
   produit donc pas un deuxième événement ; le conflit 409 est relu. */
export async function appliquerGoogle(env, token, id, evt, fetcher = fetch) {
  const base = API_URL + encodeURIComponent(env.GOOGLE_CALENDAR_ID) + '/events';
  const cible = base + '/' + encodeURIComponent(id);
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const api = (url, method, body) => requete(fetcher, url + (method === 'GET' ? '' : '?sendUpdates=none'), {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!evt) {
    const r = await api(cible, 'DELETE');
    if (!r.ok && ![404, 410].includes(r.status)) throw erreur('suppression_' + r.status);
    return;
  }
  let r = await api(cible, 'PATCH', evt);
  if (r.status === 404 || r.status === 410) {
    r = await api(base, 'POST', { ...evt, id });
    if (r.status === 409) {
      const lu = await api(cible, 'GET');
      if (!lu.ok) throw erreur('conflit_' + lu.status);
      const existant = await lu.json();
      if (existant.status === 'cancelled') return 'supprime';
      if (existant.extendedProperties?.private?.origine !== 'shawez-immo' ||
          existant.extendedProperties?.private?.demande !== evt.extendedProperties.private.demande) throw erreur('conflit_identite');
      r = await api(cible, 'PATCH', evt);
    }
  }
  if (!r.ok) throw erreur('ecriture_' + r.status);
  const retour = await r.json();
  if (retour.status === 'cancelled') return 'supprime';
}

/* Réconciliation limitée, relancée par les tâches existantes et après une
   demande/confirmation. Aucun secret ni contenu client dans les journaux.
   On ne touche jamais à un événement créé manuellement dans Google Agenda. */
export async function synchroniserAgendaGoogle(ctx, base, fetcher = fetch) {
  const { env, request } = ctx;
  if (!agendaGoogleConfigure(env, request.url)) return { etat: 'non_configure' };
  await base.batch([base.prepare(SCHEMA), base.prepare(LOCK)]);
  const now = Date.now(), verrou = crypto.randomUUID();
  const pris = await base.prepare("INSERT INTO agenda_google_verrou (id, jeton, expire) VALUES (1, ?1, ?2) ON CONFLICT(id) DO UPDATE SET jeton = excluded.jeton, expire = excluded.expire WHERE agenda_google_verrou.expire < ?3 RETURNING jeton").bind(verrou, now + 180000, now).first();
  if (!pris) return { etat: 'occupe' };
  let n = 0, erreurs = 0;
  try {
    const depuis = Date.parse(env.GOOGLE_CALENDAR_SYNC_FROM);
    const r = await base.prepare(
      "SELECT d.id AS demande_id, d.reference, d.contact, d.adresse, d.reponses, d.suspect, d.en_attente, d.statut, v.etat, v.creneaux, v.debut, v.duree, v.maj_le, v.fixee_le, v.demandee_le, v.cree_le, a.event_id, a.empreinte, a.debut AS ancien_debut " +
      "FROM demandes d JOIN visites v ON v.id = (SELECT MAX(id) FROM visites WHERE demande_id = d.id) LEFT JOIN agenda_google_sync a ON a.demande_id = d.id " +
      "WHERE a.event_id IS NOT NULL OR v.etat IN ('fixee','demandee')").all();
    const absents = await base.prepare("SELECT a.demande_id, a.event_id, a.empreinte, a.debut AS ancien_debut FROM agenda_google_sync a WHERE NOT EXISTS (SELECT 1 FROM demandes d JOIN visites v ON v.demande_id = d.id WHERE d.id = a.demande_id)").all();
    const operations = [];
    for (const d of [...(r.results || []), ...(absents.results || [])]) {
      const evt = evenementSouhaite(d, now, depuis);
      // Conserver l'historique d'un rendez-vous terminé, sauf suppression explicite.
      if (!evt && d.event_id && d.etat === 'fixee' && dateValide(d.debut) && Date.parse(d.debut) <= now && d.debut === d.ancien_debut) continue;
      if (!evt && !d.event_id) continue;
      const empreinte = evt ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(evt)))), b => b.toString(16).padStart(2, '0')).join('') : '';
      if (evt && d.empreinte === empreinte) continue;
      operations.push({ d, evt, empreinte });
    }
    if (!operations.length) return { etat: 'ok', n, erreurs };
    const token = await jetonGoogle(env, fetcher);
    // Limiter les appels et garder un temps total inférieur à la durée du verrou.
    for (const { d, evt, empreinte } of operations.slice(0, 4)) {
      let id = d.event_id;
      try {
        if (!id) {
          id = idEvenement();
          await base.prepare("INSERT INTO agenda_google_sync (demande_id,event_id) VALUES (?1,?2)").bind(d.demande_id, id).run();
        }
        let resultat = await appliquerGoogle(env, token, id, evt, fetcher);
        if (resultat === 'supprime' && evt) {
          id = idEvenement();
          await base.prepare("UPDATE agenda_google_sync SET event_id=?1, empreinte='' WHERE demande_id=?2").bind(id, d.demande_id).run();
          resultat = await appliquerGoogle(env, token, id, evt, fetcher);
          if (resultat === 'supprime') throw erreur('evenement_supprime');
        }
        if (evt) await base.prepare("UPDATE agenda_google_sync SET empreinte=?1,debut=?2 WHERE demande_id=?3").bind(empreinte, evt.start.dateTime, d.demande_id).run();
        else await base.prepare("DELETE FROM agenda_google_sync WHERE demande_id=?1").bind(d.demande_id).run();
        n++;
      } catch (e) { erreurs++; console.log('agenda_google', /^agenda_google_[a-z0-9_]+$/.test(e?.message) ? e.message : 'echec'); }
    }
    return { etat: erreurs ? 'partiel' : 'ok', n, erreurs };
  } finally {
    await base.prepare("DELETE FROM agenda_google_verrou WHERE id=1 AND jeton=?1").bind(verrou).run();
  }
}

export function lancerAgendaGoogle(ctx, base) {
  if (!agendaGoogleConfigure(ctx.env, ctx.request.url)) return;
  ctx.waitUntil(synchroniserAgendaGoogle(ctx, base).catch((e) =>
    console.log('agenda_google', /^agenda_google_[a-z0-9_]+$/.test(e?.message) ? e.message : 'echec')));
}
