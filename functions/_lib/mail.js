/* Envoi d'e-mails depuis l'API.
   - Liaison « send_email » nommée EMAIL (Cloudflare Email Routing / Email Service), si le projet la propose ;
   - sinon liaison de service MAILER vers le Worker outils/mailer/ (shawez-mailer), qui porte la liaison EMAIL.
   Expéditeur : MAIL_FROM (défaut estimation@shawez-immo.com). Sans liaison, rien n'est envoyé et on le dit. */

const enc = (s) => '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=';
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, '$&\r\n');

export function mailPossible(env) {
  return !!(env.EMAIL || env.MAILER);
}

/* Email Routing n'écrit qu'aux adresses vérifiées (admins, destinataires des notifications).
   Pour écrire aux clients (lien de vérification, mot de passe oublié), il faut un service d'envoi
   ouvert à tous les destinataires (Cloudflare Email Sending) : variable CLIENT_MAIL = 1. */
export function peutEcrire(env, to) {
  if (!mailPossible(env)) return false;
  if (String(env.CLIENT_MAIL || '') === '1') return true;
  const verifiees = String((env.ADMIN_EMAILS || 'shawez@gravelin-immo.com') + ',' + (env.NOTIFY_EMAILS || 'shawez@gravelin-immo.com'))
    .toLowerCase().split(/[,;\s]+/).filter(Boolean);
  return verifiees.includes(String(to || '').toLowerCase());
}

function mime({ from, to, subject, text, html, replyTo }) {
  const fr = 'b' + crypto.randomUUID().replace(/-/g, '');
  const domaine = from.split('@')[1];
  return [
    `From: ${enc('Shawez Ali — Estimation')} <${from}>`,
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

export async function envoyer(env, m) {
  const from = env.MAIL_FROM || 'estimation@shawez-immo.com';
  const msg = { ...m, from };
  if (env.EMAIL) {
    try {
      // API objet (Email Service)
      await env.EMAIL.send({ to: m.to, from: { email: from, name: 'Shawez Ali — Estimation' }, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo });
      return true;
    } catch (e1) {
      try {
        const { EmailMessage } = await import('cloudflare:email');
        await env.EMAIL.send(new EmailMessage(from, m.to, mime(msg)));
        return true;
      } catch (e2) { console.log('email', e1 && e1.message, e2 && e2.message); }
    }
  }
  if (env.MAILER) {
    try {
      const r = await env.MAILER.fetch('https://mailer/envoyer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg),
      });
      if (r.ok) return true;
      console.log('mailer', r.status, await r.text());
    } catch (e) { console.log('mailer', e && e.message); }
  }
  return false;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Gabarit commun, sobre, aux couleurs du site (pierre, encre, moutarde). */
export function gabarit(titre, blocs) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F6F2;font-family:Arial,Helvetica,sans-serif;color:#0F0E0C;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F2;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E1DCD2;">
<tr><td style="padding:24px 24px 8px;font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#8A6614;font-weight:bold;">Shawez Ali · Estimation</td></tr>
<tr><td style="padding:0 24px 8px;font-size:24px;line-height:1.2;">${esc(titre)}</td></tr>
${blocs}
<tr><td style="padding:20px 24px 24px;font-size:12px;color:#6B655C;border-top:1px solid #E1DCD2;">GRAVELIN IMMO — 30 rue Bannelier, 21000 Dijon · shawez-immo.com</td></tr>
</table></td></tr></table></body></html>`;
}

export const bouton = (lien, libelle, sombre = true) =>
  `<a href="${esc(lien)}" style="display:inline-block;padding:14px 22px;margin:4px 8px 4px 0;border-radius:999px;font-weight:bold;text-decoration:none;font-size:15px;${sombre ? 'background:#0F0E0C;color:#F3EFE6;' : 'border:1px solid #0F0E0C;color:#0F0E0C;'}">${esc(libelle)}</a>`;
