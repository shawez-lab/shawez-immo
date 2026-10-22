/* Mesure des annonces ChatGPT (pixel OpenAI Ads, pixel WRyfV8yqWLaDBWnWVAG9Vu), avec accord préalable.
   - Rien n'est chargé pour un visiteur qui ne vient pas d'une annonce ChatGPT et n'a jamais accepté.
   - Visiteur venu d'une annonce (?oppref=… ou utm_source=chatgpt|openai) : bandeau Accepter / Refuser, proposé
     pendant toute la visite (onglet) tant qu'il n'a pas choisi. Choix gardé dans localStorage « oai_mesure » (oui / non).
   - « oui » : le SDK OpenAI est chargé sur les pages publiques (pour mesurer une demande faite plus tard dans la visite).
   - Jamais sur /admin/ ni /mon-espace/, jamais quand l'adresse de la page porte ?adresse= ou ?lien= (données personnelles).
   - window.oaiLead(ref) : à appeler APRÈS la réponse OK du serveur ; envoie « lead_created » une fois par demande,
     seulement si l'accord est donné et le SDK chargé. Aucune donnée du formulaire n'est transmise.
   - window.oaiRetirer() : retire l'accord (page /cookies/) et efface les cookies __oppref et __obref.
   Mentions : /cookies/ et /politique-de-confidentialite/. */
(function () {
  'use strict';
  var PIXEL = 'WRyfV8yqWLaDBWnWVAG9Vu', SDK = 'https://bzrcdn.openai.com/sdk/oaiq.min.js', CLE = 'oai_mesure';
  var w = window, d = document, loc = w.location;
  if (w.oaiLead) return;
  function lire(s, k) { try { return w[s].getItem(k); } catch (e) { return null; } }
  function ecrire(s, k, v) { try { w[s].setItem(k, v); } catch (e) {} }
  var q; try { q = new URLSearchParams(loc.search); } catch (e) { q = { has: function () { return false; }, get: function () { return null; } }; }
  var prive = /^\/(admin|mon-espace)(\/|$)/.test(loc.pathname) || q.has('adresse') || q.has('lien');

  var charge = false, faites = {};
  function charger() {
    if (charge || prive) return; charge = true;
    !function (w, d, s, u) { if (w.oaiq) return; var q = function () { q.q.push(arguments); }; q.q = []; w.oaiq = q; var j = d.createElement(s); j.async = 1; j.src = u; var f = d.getElementsByTagName(s)[0]; f.parentNode.insertBefore(j, f); }(w, d, 'script', SDK);
    w.oaiq('consent', true);
    w.oaiq('init', { pixelId: PIXEL, debug: false });
  }
  function effacerCookies() {
    var h = loc.hostname.replace(/^www\./, ''), exp = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    ['__oppref', '__obref'].forEach(function (n) {
      d.cookie = n + exp; d.cookie = n + exp + '; domain=' + h; d.cookie = n + exp + '; domain=.' + h;
    });
  }

  /* demande enregistrée (réponse OK du serveur) : une seule mesure par demande */
  w.oaiLead = function (ref) {
    if (lire('localStorage', CLE) !== 'oui' || !charge || typeof w.oaiq !== 'function') return false;
    var k = ref ? String(ref) : '_' + loc.pathname;
    if (faites[k]) return false; faites[k] = 1;
    try { w.oaiq('measure', 'lead_created', { type: 'customer_action' }); } catch (e) { return false; }
    return true;
  };
  w.oaiRetirer = function () {
    ecrire('localStorage', CLE, 'non');
    try { if (typeof w.oaiq === 'function') w.oaiq('consent', false); } catch (e) {}
    effacerCookies(); fermer();
  };
  w.oaiChoix = function () { return lire('localStorage', CLE); };

  if (prive) return;
  var choix = lire('localStorage', CLE);
  if (choix === 'oui') { charger(); return; }
  if (choix === 'non') return;

  /* arrivée par une annonce ChatGPT ? (gardé pour la durée de l'onglet) */
  var src = (q.get('utm_source') || '').toLowerCase(), ref = q.get('oppref');
  if (q.has('oppref') || src === 'chatgpt' || src === 'openai') {
    ecrire('sessionStorage', 'oai_venu', '1');
    if (ref) ecrire('sessionStorage', 'oai_oppref', ref);
  } else if (lire('sessionStorage', 'oai_venu') !== '1') return;

  /* ---------- bandeau ---------- */
  var b = null, st = null;
  function fermer() {
    if (b && b.parentNode) b.parentNode.removeChild(b);
    if (st && st.parentNode) st.parentNode.removeChild(st);
    b = st = null; d.documentElement.style.removeProperty('--oai-h'); d.documentElement.classList.remove('oai-b');
  }
  function accepter() {
    ecrire('localStorage', CLE, 'oui'); fermer();
    /* accord donné sur une autre page que celle d'arrivée : la référence de l'annonce est remise un instant dans
       l'adresse pour que le SDK la retrouve, puis l'adresse d'origine est rétablie */
    var r = lire('sessionStorage', 'oai_oppref'), avant = loc.href, remis = false;
    if (r && !q.has('oppref') && w.history && history.replaceState) {
      try { var u = new URL(avant); u.searchParams.set('oppref', r); history.replaceState(history.state, '', u.toString()); remis = true; } catch (e) {}
    }
    charger();
    if (remis) {
      var s = d.querySelector('script[src="' + SDK + '"]'), fini = false;
      var retour = function () { if (fini) return; fini = true; setTimeout(function () { try { history.replaceState(history.state, '', avant); } catch (e) {} }, 0); };
      if (s) { s.addEventListener('load', retour); s.addEventListener('error', retour); }
      setTimeout(retour, 4000);
    }
  }
  function refuser() { ecrire('localStorage', CLE, 'non'); fermer(); }
  function hauteur() { if (b) d.documentElement.style.setProperty('--oai-h', (b.offsetHeight + 12) + 'px'); }
  function montrer() {
    if (b || !d.body) return;
    st = d.createElement('style'); st.id = 'oai-style';
    st.textContent =
      '#oai-bandeau{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:130;max-width:720px;margin:0 auto;box-sizing:border-box;' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:14px 16px;border-radius:16px;background:var(--ink,#0F0E0C);color:var(--ground,#F7F6F2);' +
      'font-family:var(--font-text,system-ui,sans-serif);font-size:.92rem;line-height:1.45;box-shadow:0 14px 36px rgba(0,0,0,.25);}' +
      '#oai-bandeau p{margin:0;flex:1 1 300px;min-width:0;}' +
      '#oai-bandeau a{color:inherit;text-decoration:underline;text-underline-offset:3px;}' +
      '#oai-bandeau .oai-btns{display:flex;gap:8px;flex:0 0 auto;}' +
      '#oai-bandeau button{min-height:44px;min-width:110px;padding:0 18px;border-radius:999px;border:1px solid var(--ground,#F7F6F2);background:var(--ground,#F7F6F2);color:var(--ink,#0F0E0C);font:inherit;font-weight:600;cursor:pointer;}' +
      '#oai-bandeau button:focus-visible{outline:2px solid var(--accent,#B5891F);outline-offset:2px;}' +
      '@media(max-width:520px){#oai-bandeau{font-size:.88rem;padding:12px 14px;}#oai-bandeau .oai-btns{width:100%;}#oai-bandeau button{flex:1 1 0;min-width:0;}}' +
      'html.oai-b body{padding-bottom:var(--oai-h,0px);}' +
      'html.oai-b #stickybar{bottom:calc(12px + var(--oai-h,0px) + env(safe-area-inset-bottom,0px));}';
    d.head.appendChild(st);
    b = d.createElement('div'); b.id = 'oai-bandeau'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Mesure de notre annonce');
    b.innerHTML = '<p>Vous venez de notre annonce sur ChatGPT. Acceptez-vous qu\'OpenAI mesure, sans vos nom ni coordonnées, si cette annonce vous a été utile ? <a href="/cookies/#annonces-chatgpt">En savoir plus</a></p>' +
      '<div class="oai-btns"><button type="button" data-oai="oui">Accepter</button><button type="button" data-oai="non">Refuser</button></div>';
    b.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-oai]') : null; if (!t) return;
      if (t.getAttribute('data-oai') === 'oui') accepter(); else refuser();
    });
    d.body.appendChild(b); d.documentElement.classList.add('oai-b'); hauteur();
    w.addEventListener('resize', hauteur);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', montrer); else montrer();
})();
