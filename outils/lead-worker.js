/* Point de collecte des demandes d'estimation de shawez-immo.com : Worker Cloudflare, route shawez-immo.com/api/lead*.

   Reçoit la demande du formulaire (schéma lead.v1, voir payload() dans estimation-immobiliere-dijon/index.html)
   et la transmet aussitôt à Shawez. Rien n'est stocké : la demande ne fait que passer.

   Transmission (au moins une des deux, configurées dans Cloudflare) :
   - e-mail : liaison « Send email » nommée EMAIL + variables LEAD_FROM (ex. formulaire@shawez-immo.com)
     et LEAD_TO (ex. shawez@gravelin-immo.com, adresse vérifiée dans Email Routing) ;
   - webhook : variable secrète LEAD_WEBHOOK_URL (ex. webhook entrant GoHighLevel), reçoit le JSON.

   Réponses :
   GET  → 200 {ready:true|false}   le site n'envoie au Worker que si ready est vrai (sinon : WhatsApp ou e-mail)
   POST → 202 {reference}          demande transmise (au moins un canal a accepté)
          400/403/413               demande refusée (champs, origine, taille)
          502 {reference}           aucun canal n'a accepté : le site affiche l'échec et propose WhatsApp ou e-mail
          503                       Worker non configuré
*/
import { EmailMessage } from 'cloudflare:email';

const ORIGINES = ['https://shawez-immo.com', 'https://www.shawez-immo.com'];
const TAILLE_MAX = 16 * 1024;
const CHAMPS = {   // champ : longueur maximale
  type: 60, commune: 160, surface: 10, pieces: 40, delai: 60, deja_en_agence: 5, message: 3000,
  prenom: 80, nom: 80, email: 160, telephone: 30, creneau: 30,
  consent_notice: 5, consent_newsletter: 5, page: 300, ts: 40,
};

export default {
  async fetch(req, env) {
    const origine = req.headers.get('Origin') || '';
    const cors = ORIGINES.includes(origine) ? { 'Access-Control-Allow-Origin': origine, Vary: 'Origin' } : {};
    const json = (status, corps) => new Response(JSON.stringify(corps), {
      status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...cors },
    });
    const email = !!(env.EMAIL && env.LEAD_FROM && env.LEAD_TO);
    const webhook = !!env.LEAD_WEBHOOK_URL;

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    }
    if (req.method === 'GET') return json(200, { ready: email || webhook, schema: 'lead.v1' });
    if (req.method !== 'POST') return json(405, { error: 'methode' });
    if (!ORIGINES.includes(origine)) return json(403, { error: 'origine' });
    if (!email && !webhook) return json(503, { error: 'non_configure' });

    const brut = await req.text();
    if (brut.length > TAILLE_MAX) return json(413, { error: 'taille' });
    let d;
    try { d = JSON.parse(brut); } catch { return json(400, { error: 'json' }); }
    if (!d || typeof d !== 'object' || d.schema !== 'lead.v1') return json(400, { error: 'schema' });

    const reference = 'E-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 6).toUpperCase();
    if (d.website) return json(202, { reference });   // pot de miel rempli : robot, rien n'est transmis

    const lead = {};
    for (const [k, max] of Object.entries(CHAMPS)) {
      const v = d[k];
      lead[k] = typeof v === 'boolean' ? v : v == null ? '' : String(v).trim().slice(0, max);
    }
    // surface facultative : nulle, négative, absurde (> 100 000 m²) ou illisible → ignorée
    { const n = Number(String(lead.surface).replace(',', '.')); lead.surface = lead.surface !== '' && Number.isFinite(n) && n > 0 && n <= 100000 ? String(Math.round(n)) : ''; }
    const manque = [];
    if (!lead.prenom) manque.push('prenom');
    if (!lead.nom) manque.push('nom');
    if (!lead.commune) manque.push('commune');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) manque.push('email');
    if (lead.consent_notice !== true) manque.push('consent_notice');
    if (manque.length) return json(400, { error: 'champs', champs: manque });

    const erreurs = [];
    let transmis = false;
    if (email) {
      try {
        await env.EMAIL.send(new EmailMessage(env.LEAD_FROM, env.LEAD_TO, mime(lead, reference, env)));
        transmis = true;
      } catch (e) { erreurs.push('email: ' + (e && e.message)); }
    }
    if (webhook) {
      try {
        const r = await fetch(env.LEAD_WEBHOOK_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...lead, reference, source: 'shawez-immo.com', schema: 'lead.v1' }),
        });
        if (r.ok) transmis = true; else erreurs.push('webhook: http ' + r.status);
      } catch (e) { erreurs.push('webhook: ' + (e && e.message)); }
    }
    if (!transmis) {
      console.error('Demande ' + reference + ' non transmise : ' + erreurs.join(' | '));   // aucune donnée personnelle dans le journal
      return json(502, { error: 'transmission', reference });
    }
    if (erreurs.length) console.warn('Demande ' + reference + ' : un canal a échoué : ' + erreurs.join(' | '));
    return json(202, { reference });
  },
};

/* ---------- e-mail (texte brut UTF-8) ---------- */

const sansRetour = (s) => String(s).replace(/[\r\n]+/g, ' ');
function b64(s) {
  const o = new TextEncoder().encode(s);
  let t = '';
  for (let i = 0; i < o.length; i += 0x8000) t += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000));
  return btoa(t);
}
const motEncode = (s) => '=?UTF-8?B?' + b64(sansRetour(s)) + '?=';

function mime(l, reference, env) {
  const oui = (b) => (b ? 'oui' : 'non');
  const lignes = [
    "Nouvelle demande d'estimation reçue sur shawez-immo.com",
    'Référence : ' + reference,
    '',
    'BIEN',
    'Type : ' + l.type,
    'Commune ou adresse : ' + l.commune,
    'Surface : ' + (l.surface ? l.surface + ' m²' : 'non indiquée'),
    'Pièces : ' + l.pieces,
    '',
    'PROJET',
    'Où en est-il : ' + l.delai,
    'Déjà confié à une agence : ' + oui(l.deja_en_agence),
    'Précisions : ' + (l.message || '(aucune)'),
    '',
    'CONTACT',
    'Nom : ' + l.prenom + ' ' + l.nom,
    'E-mail : ' + l.email,
    'Téléphone : ' + (l.telephone || '(non indiqué)'),
    'Appel souhaité : ' + (l.creneau || '(non indiqué)'),
    '',
    'Notice d\'information acceptée : ' + oui(l.consent_notice),
    'Accepte les conseils par e-mail : ' + oui(l.consent_newsletter),
    'Page : ' + l.page,
    'Envoyée le : ' + l.ts,
    '',
    'Répondre à cet e-mail répond directement à ' + l.prenom + ' ' + l.nom + '.',
  ];
  const corps = b64(lignes.join('\r\n')).replace(/.{76}/g, '$&\r\n');
  const entetes = [
    'From: ' + motEncode('Site shawez-immo.com') + ' <' + sansRetour(env.LEAD_FROM) + '>',
    'To: <' + sansRetour(env.LEAD_TO) + '>',
    'Reply-To: ' + motEncode(l.prenom + ' ' + l.nom) + ' <' + sansRetour(l.email) + '>',
    'Subject: ' + motEncode("Demande d'estimation — " + l.commune + ' — ' + l.prenom + ' ' + l.nom + ' (' + reference + ')'),
    'Date: ' + new Date().toUTCString(),
    'Message-ID: <' + reference + '.' + crypto.randomUUID() + '@shawez-immo.com>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ];
  return entetes.join('\r\n') + '\r\n\r\n' + corps + '\r\n';
}
