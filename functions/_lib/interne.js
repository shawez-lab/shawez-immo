/* Fichiers internes (notes des agents, outils, journaux) : jamais servis au public.
   Réponse : la page 404 du site, statut 404, non indexable. Action 15 du plan « Site parfait ». */
export async function introuvable({ request, env }) {
  let corps = 'Page introuvable';
  try {
    const r = await env.ASSETS.fetch(new URL('/404.html', request.url));
    if (r.ok) corps = await r.text();
  } catch (e) { /* page 404 absente : texte simple */ }
  return new Response(corps, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-store' },
  });
}
