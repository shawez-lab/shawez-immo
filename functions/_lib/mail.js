/* Envoi d'e-mails depuis l'API.

   Trois voies, dans cet ordre :
   1. RESEND_API_KEY (secret du projet Pages) : service d'envoi ouvert à tous les destinataires (offre gratuite
      3 000 e-mails/mois). C'est ce qui permet d'écrire aux clients (résultat, lien de connexion).
   2. Liaison « send_email » nommée EMAIL (Cloudflare), si le projet la propose.
   3. Liaison de service MAILER vers le Worker outils/mailer/ (shawez-mailer), qui porte la liaison EMAIL.
   Les voies 2 et 3 (Email Routing, gratuit) n'écrivent qu'aux adresses de destination vérifiées du compte Cloudflare :
   elles servent aux alertes de l'agence. Pour écrire aux clients par Cloudflare, il faut « Email Sending »
   (plan Workers payant) puis CLIENT_MAIL = 1.
   Expéditeur : MAIL_FROM (défaut estimation@shawez-immo.com). Sans aucune voie, rien n'est envoyé et on le dit. */

const enc = (s) => '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=';
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, '$&\r\n');

export const NOM_EXPEDITEUR = 'Shawez Ali – Gravelin Immo';

export function mailPossible(env) {
  return !!(env.RESEND_API_KEY || env.EMAIL || env.MAILER);
}

/* Peut-on écrire aux clients (toute adresse) ? CLIENT_MAIL = 0 ferme l'envoi aux clients même avec un service ouvert
   (les alertes et les liens de connexion de l'agence continuent d'arriver). */
export function mailClients(env) {
  if (String(env.CLIENT_MAIL || '') === '0') return false;
  return !!env.RESEND_API_KEY || (!!(env.EMAIL || env.MAILER) && String(env.CLIENT_MAIL || '') === '1');
}

const liste = (s) => String(s || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
export const destinatairesAlerte = (env) => liste(env.NOTIFY_EMAILS || 'shawez@gravelin-immo.com');

/* Les adresses de test (…@test.invalid) ne reçoivent jamais rien, quel que soit le service. */
export const adresseDeTest = (a) => /@(?:[a-z0-9-]+\.)*test\.invalid$/i.test(String(a || ''));

export function peutEcrire(env, to) {
  if (!mailPossible(env) || adresseDeTest(to)) return false;
  if (mailClients(env)) return true;
  const verifiees = [...liste(env.ADMIN_EMAILS || 'shawez@gravelin-immo.com'), ...destinatairesAlerte(env)];
  return verifiees.includes(String(to || '').toLowerCase());
}

function mime({ from, to, subject, text, html, replyTo }) {
  const fr = 'b' + crypto.randomUUID().replace(/-/g, '');
  const domaine = from.split('@')[1];
  return [
    `From: ${enc(NOM_EXPEDITEUR)} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${enc(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${domaine}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${fr}"`,
    '',
    `--${fr}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(text),
    `--${fr}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(html),
    `--${fr}--`, '',
  ].filter((l) => l !== null).join('\r\n');
}

/* Envoie un e-mail. Renvoie true si un service l'a accepté ; sinon false, et « detail » dit pourquoi (journal, santé). */
export async function envoyer(env, m, detail = {}) {
  const from = env.MAIL_FROM || 'estimation@shawez-immo.com';
  const msg = { ...m, from, subject: String(m.subject || '').replace(/[\r\n]+/g, ' ') };
  if (adresseDeTest(m.to)) { detail.raison = 'adresse_de_test'; return false; }
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch(env.RESEND_API_URL || 'https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${NOM_EXPEDITEUR} <${from}>`, to: [m.to], subject: msg.subject, text: m.text, html: m.html, reply_to: m.replyTo || env.REPLY_TO || 'shawez@gravelin-immo.com' }),
      });
      if (r.ok) { detail.voie = 'resend'; return true; }
      detail.resend = `${r.status} ${(await r.text()).slice(0, 300)}`;
      console.log('resend', detail.resend);
    } catch (e) { detail.resend = String(e && e.message); console.log('resend', detail.resend); }
  }
  if (env.EMAIL) {
    try {
      // API objet (Email Service)
      await env.EMAIL.send({ to: m.to, from: { email: from, name: NOM_EXPEDITEUR }, subject: msg.subject, text: m.text, html: m.html, replyTo: m.replyTo });
      detail.voie = 'email'; return true;
    } catch (e1) {
      try {
        const { EmailMessage } = await import('cloudflare:email');
        await env.EMAIL.send(new EmailMessage(from, m.to, mime(msg)));
        detail.voie = 'email'; return true;
      } catch (e2) { detail.email = `${e1 && e1.message} / ${e2 && e2.message}`; console.log('email', detail.email); }
    }
  }
  if (env.MAILER) {
    try {
      const r = await env.MAILER.fetch('https://mailer/envoyer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
      });
      if (r.ok) { detail.voie = 'mailer'; return true; }
      detail.mailer = `${r.status} ${(await r.text()).slice(0, 300)}`;
      console.log('mailer', detail.mailer);
    } catch (e) { detail.mailer = String(e && e.message); console.log('mailer', detail.mailer); }
  }
  if (!mailPossible(env)) detail.raison = 'aucun_service';
  return false;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Habillage des e-mails selon le site d'où vient la demande. */
const MARQUES = {
  shawez: { surtitre: 'Shawez Ali · Estimation', pied: 'GRAVELIN IMMO — 30 rue Bannelier, 21000 Dijon · shawez-immo.com', fond: '#F7F6F2', filet: '#E1DCD2', accent: '#8A6614', sombre: '#0F0E0C', clair: '#F3EFE6', texte: '#0F0E0C' },
  gravelin: { surtitre: 'GRAVELIN IMMO · Estimation', pied: 'GRAVELIN IMMO — 30 rue Bannelier, 21000 Dijon · gravelin-immo.com', fond: '#F6F3EC', filet: '#D3CCBC', accent: '#955C28', sombre: '#0F1320', clair: '#F2EEE4', texte: '#14161C' },
};
const marque = (site) => MARQUES[site] || MARQUES.shawez;

/* Gabarit commun, sobre, aux couleurs du site. */
export function gabarit(titre, blocs, site) {
  const m = marque(site);
  return `<!doctype html><html lang="fr"><body style="margin:0;background:${m.fond};font-family:Arial,Helvetica,sans-serif;color:${m.texte};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${m.fond};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${m.filet};">
<tr><td style="padding:24px 24px 8px;font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:${m.accent};font-weight:bold;">${m.surtitre}</td></tr>
<tr><td style="padding:0 24px 8px;font-size:24px;line-height:1.2;">${esc(titre)}</td></tr>
${blocs}
<tr><td style="padding:20px 24px 24px;font-size:12px;color:#6B655C;border-top:1px solid ${m.filet};">${m.pied}</td></tr>
</table></td></tr></table></body></html>`;
}

export const paragraphe = (html) => `<tr><td style="padding:8px 24px 12px;font-size:16px;line-height:1.55;color:#3A3630;">${html}</td></tr>`;

export const bouton = (lien, libelle, sombre = true, site) => {
  const m = marque(site);
  return `<a href="${esc(lien)}" style="display:inline-block;padding:14px 22px;margin:4px 8px 4px 0;border-radius:999px;font-weight:bold;text-decoration:none;font-size:15px;${sombre ? `background:${m.sombre};color:${m.clair};` : `border:1px solid ${m.sombre};color:${m.sombre};`}">${esc(libelle)}</a>`;
};
