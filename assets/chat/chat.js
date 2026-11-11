/* Assistant du site — bulle en bas à droite, branchée sur /api/chat.
   Aucune dépendance. Injecté avant </body> de toutes les pages publiques par outils/build.py.
   Rien n'est envoyé tant que le visiteur n'a pas écrit : la bulle est muette au chargement. */
(function () {
  'use strict';
  if (window.__chatShawez) return;
  window.__chatShawez = 1;
  if (/\/(admin|mon-espace)\//.test(location.pathname)) return;

  var API = '/api/chat';
  var CLE = 'se_chat_session';
  var session = '';
  try { session = localStorage.getItem(CLE) || ''; } catch (e) { }
  if (!/^[a-f0-9]{32}$/.test(session)) {
    var a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
    session = Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    try { localStorage.setItem(CLE, session); } catch (e) { }
  }

  var css = '\
.sec-ouvrir{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:9px;\
border:0;border-radius:999px;padding:13px 19px 13px 15px;cursor:pointer;font:600 15px/1.2 inherit;\
background:#2F2A24;color:#FBF8F4;box-shadow:0 8px 28px rgba(47,42,36,.28);transition:transform .16s,box-shadow .16s}\
.sec-ouvrir:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(47,42,36,.34)}\
.sec-ouvrir svg{width:19px;height:19px;flex:none}\
.sec-pan{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:min(382px,calc(100vw - 28px));\
max-height:min(620px,calc(100vh - 36px));display:none;flex-direction:column;overflow:hidden;\
background:#FFFDFB;border:1px solid #E6DFD5;border-radius:18px;box-shadow:0 18px 56px rgba(47,42,36,.26);\
font:15px/1.5 inherit;color:#2F2A24}\
.sec-pan[data-on]{display:flex}\
.sec-tete{display:flex;align-items:center;gap:11px;padding:14px 15px;border-bottom:1px solid #EFE9E1;background:#FBF8F4}\
.sec-pt{width:38px;height:38px;border-radius:50%;flex:none;background:#2F2A24;color:#FBF8F4;\
display:grid;place-items:center;font:600 15px/1 inherit;letter-spacing:.02em}\
.sec-nom{font-weight:650;font-size:15px}\
.sec-sous{font-size:12.5px;color:#7D7366;margin-top:1px}\
.sec-x{margin-left:auto;border:0;background:0;cursor:pointer;color:#7D7366;font-size:22px;line-height:1;padding:4px 6px;border-radius:8px}\
.sec-x:hover{background:#F1EBE3;color:#2F2A24}\
.sec-fil{flex:1;overflow-y:auto;padding:15px;display:flex;flex-direction:column;gap:11px;overscroll-behavior:contain}\
.sec-m{max-width:85%;padding:10px 13px;border-radius:15px;white-space:pre-wrap;word-wrap:break-word}\
.sec-m.eux{align-self:flex-start;background:#F4EFE8;border-bottom-left-radius:5px}\
.sec-m.moi{align-self:flex-end;background:#2F2A24;color:#FBF8F4;border-bottom-right-radius:5px}\
.sec-m a{color:inherit}\
.sec-wa{align-self:flex-start;display:inline-flex;align-items:center;gap:7px;text-decoration:none;\
background:#1F7A4D;color:#fff;padding:9px 14px;border-radius:999px;font-weight:600;font-size:14px}\
.sec-pts{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;background:#F4EFE8;border-radius:15px;border-bottom-left-radius:5px}\
.sec-pts i{width:6px;height:6px;border-radius:50%;background:#A99C8B;animation:sec-b 1.1s infinite}\
.sec-pts i:nth-child(2){animation-delay:.16s}.sec-pts i:nth-child(3){animation-delay:.32s}\
@keyframes sec-b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}\
.sec-bas{display:flex;gap:8px;padding:11px;border-top:1px solid #EFE9E1;background:#FBF8F4}\
.sec-bas textarea{flex:1;resize:none;border:1px solid #E2DACE;border-radius:12px;padding:10px 12px;\
font:15px/1.4 inherit;color:#2F2A24;background:#fff;max-height:110px;min-height:42px}\
.sec-bas textarea:focus{outline:2px solid #2F2A24;outline-offset:-1px;border-color:#2F2A24}\
.sec-env{border:0;border-radius:12px;width:42px;flex:none;cursor:pointer;background:#2F2A24;color:#FBF8F4;display:grid;place-items:center}\
.sec-env:disabled{opacity:.42;cursor:default}\
.sec-env svg{width:18px;height:18px}\
@media (prefers-color-scheme:dark){\
.sec-pan{background:#211D18;border-color:#38322A;color:#F0EAE2}\
.sec-tete,.sec-bas{background:#1A1713;border-color:#38322A}\
.sec-m.eux,.sec-pts{background:#2C2721}.sec-m.moi{background:#F0EAE2;color:#211D18}\
.sec-bas textarea{background:#2C2721;border-color:#413A31;color:#F0EAE2}\
.sec-x:hover{background:#2C2721;color:#F0EAE2}}\
@media (max-width:420px){.sec-pan{right:9px;left:9px;bottom:9px;width:auto;max-height:calc(100vh - 18px)}\
.sec-ouvrir{right:12px;bottom:12px}}';

  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);

  var btn = document.createElement('button');
  btn.className = 'sec-ouvrir'; btn.type = 'button';
  btn.setAttribute('aria-label', 'Poser une question à Shawez');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-5A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg><span>Une question ?</span>';

  var pan = document.createElement('div');
  pan.className = 'sec-pan'; pan.setAttribute('role', 'dialog');
  pan.setAttribute('aria-label', 'Discussion avec l’assistant de Shawez Ali');
  pan.innerHTML = '<div class="sec-tete"><div class="sec-pt" aria-hidden="true">SA</div>'
    + '<div><div class="sec-nom">Shawez Ali</div><div class="sec-sous">Agent immobilier à Dijon</div></div>'
    + '<button class="sec-x" type="button" aria-label="Fermer">×</button></div>'
    + '<div class="sec-fil" role="log" aria-live="polite"></div>'
    + '<form class="sec-bas"><textarea rows="1" placeholder="Écrivez votre question…" aria-label="Votre message"></textarea>'
    + '<button class="sec-env" type="submit" aria-label="Envoyer" disabled>'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6"/></svg></button></form>';

  document.body.appendChild(btn); document.body.appendChild(pan);

  var fil = pan.querySelector('.sec-fil'), form = pan.querySelector('.sec-bas'),
    champ = pan.querySelector('textarea'), env = pan.querySelector('.sec-env'), fini = false;

  function bas() { fil.scrollTop = fil.scrollHeight; }

  function liens(t) {
    var d = document.createElement('div');
    t.split(/(https?:\/\/[^\s)]+|shawez-immo\.com\/[^\s),]*)/g).forEach(function (p, i) {
      if (i % 2) {
        var a = document.createElement('a');
        a.href = /^https?:/.test(p) ? p : 'https://' + p;
        a.textContent = p.replace(/^https?:\/\//, ''); a.rel = 'noopener';
        d.appendChild(a);
      } else if (p) d.appendChild(document.createTextNode(p));
    });
    return d;
  }

  function dire(t, qui) {
    var e = document.createElement('div');
    e.className = 'sec-m ' + (qui === 'moi' ? 'moi' : 'eux');
    e.appendChild(liens(t)); fil.appendChild(e); bas(); return e;
  }

  function whatsapp(num) {
    if (pan.querySelector('.sec-wa')) return;
    var a = document.createElement('a');
    a.className = 'sec-wa'; a.rel = 'noopener'; a.target = '_blank';
    a.href = 'https://wa.me/33767579228';
    a.textContent = 'WhatsApp de Shawez · ' + num;
    fil.appendChild(a); bas();
  }

  function ouvrir() {
    pan.setAttribute('data-on', ''); btn.style.display = 'none';
    if (!fil.children.length) dire('Bonjour, je suis l’assistant du site de Shawez. Dites-moi ce que vous cherchez à faire et je vous oriente.', 'eux');
    setTimeout(function () { champ.focus(); }, 60);
  }
  function fermer() { pan.removeAttribute('data-on'); btn.style.display = ''; btn.focus(); }

  btn.addEventListener('click', ouvrir);
  pan.querySelector('.sec-x').addEventListener('click', fermer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pan.hasAttribute('data-on')) fermer(); });

  champ.addEventListener('input', function () {
    env.disabled = !champ.value.trim() || fini;
    champ.style.height = 'auto'; champ.style.height = Math.min(champ.scrollHeight, 110) + 'px';
  });
  champ.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = champ.value.trim();
    if (!t || fini) return;
    dire(t, 'moi');
    champ.value = ''; champ.style.height = 'auto'; env.disabled = true;
    var attente = document.createElement('div');
    attente.className = 'sec-pts'; attente.innerHTML = '<i></i><i></i><i></i>';
    fil.appendChild(attente); bas();

    fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: session, message: t, page: location.pathname }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      attente.remove();
      dire(d.reponse || 'Je n’ai pas pu répondre. Écrivez à Shawez depuis shawez-immo.com/contact/.', 'eux');
      if (d.whatsapp) whatsapp(d.whatsapp);
      if (d.fin) { fini = true; champ.disabled = true; champ.placeholder = 'Conversation terminée'; }
    }).catch(function () {
      attente.remove();
      dire('La connexion a échoué. Réessayez, ou écrivez à Shawez depuis shawez-immo.com/contact/.', 'eux');
    }).then(function () { env.disabled = !champ.value.trim() || fini; });
  });
})();
