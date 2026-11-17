/* /api/contact — messages et demandes de visite du site de l'agence. L'alerte part par la même voie d'envoi que les
   demandes d'estimation. GET → { ready } ; POST → 201. Rien n'est stocké : le message vit dans la boîte de l'agence. */
import { json, Erreur, corps, texte, email as lireEmail, telephone, verifierOrigine, ip, limiter } from '../_lib/base.js';
import { envoyer, mailPossible, destinatairesAlerte, gabarit, paragraphe, esc } from '../_lib/mail.js';

export async function onRequest({ request, env }) {
  try {
    if (request.method === 'GET' || request.method === 'HEAD') return json(200, { ready: mailPossible(env) }, { 'Cache-Control': 'no-store' });
    if (request.method !== 'POST') return json(405, { error: 'methode' });
    verifierOrigine(request);
    const d = await corps(request, 6000);
    if (d.website) return json(201, { ok: true });            // champ piège rempli : un robot, on ne dit rien
    await limiter(env, 'contact:' + ip(request), 6, 3600);
    if (d.consent !== true) throw new Erreur(400, 'champs', { champ: 'consentement' });
    const nom = texte(d.nom, 80, { requis: true, nom: 'nom' });
    const mail = d.email ? lireEmail(d.email) : null;
    const tel = d.telephone ? telephone(d.telephone) : null;
    if (!mail && !tel) throw new Erreur(400, 'champs', { champ: 'contact' });
    const objet = texte(d.objet, 120, { nom: 'objet' }) || 'Message du site';
    const bien = texte(d.bien, 200, { nom: 'bien' }) || '';
    const message = texte(d.message, 2000, { nom: 'message' }) || '';
    const page = texte(d.page, 200, { nom: 'page' }) || '';
    const lignes = [`Nom : ${nom}`, tel && `Téléphone : ${tel}`, mail && `E-mail : ${mail}`, bien && `Bien : ${bien}`, page && `Page : ${page}`, '', message].filter((l) => l !== null && l !== false);
    const subject = `Site de l'agence — ${objet}${bien ? ' — ' + bien : ''}`;
    const html = gabarit(objet, lignes.filter(Boolean).map((l) => paragraphe(esc(l).replace(/\n/g, '<br>'))), new URL(request.url).origin);
    let partis = 0;
    for (const to of destinatairesAlerte(env)) if (await envoyer(env, { to, subject, text: lignes.join('\n'), html, replyTo: mail || undefined })) partis++;
    if (!partis) return json(503, { error: 'envoi' });
    return json(201, { ok: true });
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code, ...(e.extra || {}) });
    console.log('contact', e && e.stack);
    return json(500, { error: 'serveur' });
  }
}
