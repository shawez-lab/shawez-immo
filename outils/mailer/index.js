/* Worker « shawez-mailer » : envoie les e-mails de l'espace estimation (shawez-immo.com, Pages Functions).

   Pages ne propose pas la liaison « Send email » : le site passe par ce Worker (outils/mailer/), appelé uniquement
   par liaison de service (MAILER), sans route ni adresse workers.dev.

   Liaisons du Worker (tableau de bord → Workers & Pages → shawez-mailer → Settings → Bindings) :
   - Send email, nom EMAIL (Email Routing activé sur shawez-immo.com ; destinataires = adresses vérifiées).
   Variables (facultatif) : MAIL_FROM (défaut estimation@shawez-immo.com).

   POST /envoyer  { to, subject, text, html, replyTo? }  → 200 { ok:true } | 4xx/5xx { error } */
import { EmailMessage } from 'cloudflare:email';

const enc = (s) => '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(s))) + '?=';
const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, '$&\r\n');
const adresse = (s) => typeof s === 'string' && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(s) && s.length < 200;

function mime({ from, to, subject, text, html, replyTo }) {
  const fr = 'b' + crypto.randomUUID().replace(/-/g, '');
  return [
    `From: ${enc('Shawez Ali — Estimation')} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${enc(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${from.split('@')[1]}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${fr}"`,
    '',
    `--${fr}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(text || ''),
    `--${fr}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', b64(html || ''),
    `--${fr}--`, '',
  ].filter((l) => l !== null).join('\r\n');
}

export default {
  async fetch(req, env) {
    const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
    if (req.method === 'GET') return json(200, { ready: !!env.EMAIL });
    if (req.method !== 'POST') return json(405, { error: 'methode' });
    if (!env.EMAIL) return json(503, { error: 'liaison_email_absente' });
    let m;
    try { m = await req.json(); } catch { return json(400, { error: 'json' }); }
    if (!m || !adresse(m.to) || typeof m.subject !== 'string' || m.subject.length > 300) return json(400, { error: 'champs' });
    if (m.replyTo && !adresse(m.replyTo)) delete m.replyTo;
    const from = env.MAIL_FROM || 'estimation@shawez-immo.com';
    try {
      await env.EMAIL.send(new EmailMessage(from, m.to, mime({ ...m, from, subject: m.subject.replace(/[\r\n]+/g, ' ') })));
      return json(200, { ok: true });
    } catch (e) {
      return json(502, { error: 'envoi', detail: String(e && e.message) });
    }
  },
};
