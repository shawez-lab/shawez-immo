/* Pages privées (/admin/, /admin/promesses/, /mon-espace/) : en-têtes de sécurité posés au moment de servir la page.

   - Politique de sécurité du contenu stricte, à « nonce » : un code tiré au hasard à chaque affichage est posé sur les
     scripts de la page ; un script glissé dans la page par quelqu'un d'autre (champ mal échappé, extension) n'a pas ce
     code et ne s'exécute pas. Le nonce est calculé ici, à chaque page : il ne peut jamais être « en retard » sur le
     contenu de la page (rien à recalculer quand une page est reconstruite).
   - Aucun service tiers : la balise de mesure d'audience est retirée si elle traîne (le lien de connexion ?lien=…
     ne doit jamais partir ailleurs), et la politique ne l'autoriserait pas.
   - Jamais dans un cadre, jamais en cache, jamais de provenance transmise.

   En cas de souci imprévu, la page est servie telle quelle (avec les en-têtes de _headers) : jamais de page blanche. */

const NONCE_OCTETS = 18;

function nonce() {
  const b = crypto.getRandomValues(new Uint8Array(NONCE_OCTETS));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const local = (url) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);

export function politique(n, url) {
  return [
    "default-src 'self'",
    // 'strict-dynamic' : les scripts de la page peuvent charger les leurs (le fabricant de PDF de l'avis de valeur)
    `script-src 'nonce-${n}' 'strict-dynamic' 'self'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "media-src 'self'",
    // l'adresse d'un dossier ouvert par l'agence : Base Adresse Nationale (deux points d'accès)
    "connect-src 'self' https://api-adresse.data.gouv.fr https://data.geopf.fr",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    ...(local(url) ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export const ENTETES = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
};

/* Balise de mesure d'audience : jamais sur une page privée. */
const TIERS = /tracker\.metricool\.com|beTracker/;

export async function servirPagePrivee(context) {
  const reponse = await context.next();
  const type = reponse.headers.get('Content-Type') || '';
  if (!type.includes('text/html')) return reponse;
  try {
    const n = nonce();
    const url = new URL(context.request.url);
    const h = new Headers(reponse.headers);
    // la politique du site entier (scripts en ligne autorisés, Metricool) est remplacée par celle-ci, plus stricte
    h.set('Content-Security-Policy', politique(n, url));
    for (const [k, v] of Object.entries(ENTETES)) h.set(k, v);
    if (!local(url)) h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    let tampon = '';
    const page = new HTMLRewriter()
      .on('script', {
        element(e) {
          const src = e.getAttribute('src') || '';
          if (src && TIERS.test(src)) { e.remove(); return; }
          tampon = '';
          e.setAttribute('nonce', n);
        },
        text(t) {
          // le texte d'un script arrive parfois en plusieurs morceaux : on le garde en entier avant de le rendre,
          // et celui de la balise de mesure n'est pas rendu (le script reste, vide)
          tampon += t.text;
          if (!t.lastInTextNode) { t.remove(); return; }
          t.replace(TIERS.test(tampon) ? '' : tampon, { html: true });
          tampon = '';
        },
      })
      .transform(new Response(reponse.body, { status: reponse.status, statusText: reponse.statusText, headers: h }));
    return page;
  } catch (e) {
    console.log('pages privées', e && e.message);
    return reponse;
  }
}
