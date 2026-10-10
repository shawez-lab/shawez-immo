/* Rendez-vous en 2 clics — accueil, /contact/, /merci/.
   1er clic : un créneau libre (l'API retire les moments déjà pris : visites fixées et, s'il est relié, l'agenda Google
   de Shawez). 2e clic : « Confirmer », après prénom, téléphone et adresse du bien. La demande arrive dans /admin/
   (statut « Nouvelle », visite demandée sur ce créneau) avec l'alerte à Shawez. Aucun cookie, aucune donnée gardée
   dans le navigateur. Point de montage : <div data-rdv data-depuis="accueil"></div>. */
(function () {
  'use strict';
  var TEL = '+33767579228', TEL_AFF = '07 67 57 92 28';
  var WA = 'https://wa.me/33767579228?text=' + encodeURIComponent('Bonjour Shawez, je souhaite un rendez-vous pour estimer mon bien.');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function fr(iso, o) { o.timeZone = 'Europe/Paris'; try { return new Date(iso).toLocaleString('fr-FR', o); } catch (e) { return iso; } }
  function heure(iso) { var h = fr(iso, { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).split(':'); return (+h[0]) + ' h' + (h[1] && h[1] !== '00' ? ' ' + h[1] : ''); }
  function quand(iso) { var j = fr(iso, { weekday: 'long', day: 'numeric', month: 'long' }); return j + ' à ' + heure(iso); }
  function uuid() { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 10); }
  function api(chemin, corps) {
    var o = { method: corps ? 'POST' : 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (corps) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(corps); }
    return fetch('/api/espace' + chemin, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; });
    }).catch(function () { return { _status: 0, error: 'reseau' }; });
  }

  var CSS = '.rdvx{min-width:0;width:100%;box-sizing:border-box;border:1px solid var(--line,rgba(22,22,26,.12));border-radius:var(--r-l,20px);background:var(--surface,#fff);padding:clamp(20px,3.4vw,36px);max-width:860px;margin:0 auto;color:var(--ink,#0F0E0C);}' +
    '.rdvx h2{font-family:var(--font-display,inherit);font-size:clamp(1.6rem,3.6vw,2.4rem);line-height:1.08;margin:0;letter-spacing:-.01em;}' +
    '.rdvx h2 em{font-style:normal;color:var(--accent-text,#8A6614);}' +
    '.rdvx-sub{margin:10px 0 0;color:var(--muted,#6B655C);font-size:1rem;line-height:1.5;}' +
    '.rdvx-days{max-width:100%;display:flex;gap:8px;overflow-x:auto;padding:4px 2px 6px;margin:18px -2px 0;scrollbar-width:none;}.rdvx-days::-webkit-scrollbar{display:none;}' +
    '.rdvx-day{flex:0 0 auto;min-height:48px;min-width:76px;padding:6px 14px;border-radius:14px;border:1px solid var(--line-strong,rgba(22,22,26,.3));background:transparent;color:inherit;font:inherit;font-size:.9rem;cursor:pointer;line-height:1.15;}.rdvx-day::first-letter{text-transform:uppercase;}' +
    '.rdvx-day[aria-pressed="true"]{background:var(--ink,#0F0E0C);color:var(--ground,#F7F6F2);border-color:var(--ink,#0F0E0C);}' +
    '.rdvx-hours{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin-top:12px;}' +
    '.rdvx-h{min-height:48px;border-radius:12px;border:1px solid var(--line-strong,rgba(22,22,26,.3));background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer;}' +
    '.rdvx-h:hover,.rdvx-day:hover{border-color:var(--ink,#0F0E0C);}' +
    '.rdvx-h[aria-pressed="true"]{background:var(--accent,#B5891F);border-color:var(--accent,#B5891F);color:#0F0E0C;}' +
    '.rdvx button:focus-visible,.rdvx a:focus-visible,.rdvx input:focus-visible{outline:3px solid var(--accent,#B5891F);outline-offset:2px;}' +
    '.rdvx-form{display:grid;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid var(--line,rgba(22,22,26,.12));}' +
    '.rdvx-choisi{margin:0;font-weight:600;font-size:1.05rem;}' +
    '.rdvx-grid{display:grid;gap:12px;grid-template-columns:1fr 1fr;}@media(max-width:640px){.rdvx-grid{grid-template-columns:1fr;}}' +
    '.rdvx label{display:block;font-size:.88rem;font-weight:600;margin-bottom:6px;}' +
    '.rdvx input[type=text],.rdvx input[type=tel],.rdvx input[type=email]{width:100%;box-sizing:border-box;min-height:50px;padding:0 14px;border-radius:12px;border:1px solid var(--line-strong,rgba(22,22,26,.3));background:var(--ground,#F7F6F2);color:inherit;font:inherit;font-size:16px;}' +
    '.rdvx input[aria-invalid="true"]{border-color:#B3261E;}' +
    '.rdvx-note{margin:0;font-size:.84rem;color:var(--muted,#6B655C);line-height:1.45;}.rdvx-note a{color:inherit;}' +
    '.rdvx-go{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}' +
    '.rdvx-go .btn{white-space:normal;text-align:center;}' +
    '.rdvx-err{margin:0;color:#B3261E;font-weight:600;}.tone-dark .rdvx-err{color:#FF8A80;}' +
    '.rdvx-alt{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}' +
    '.rdvx-ok{margin-top:16px;padding:16px 18px;border-radius:14px;background:var(--accent-soft,rgba(181,137,31,.13));}' +
    '.rdvx-ok b{display:block;font-size:1.15rem;}.rdvx-ok span{display:block;margin-top:6px;color:var(--muted,#6B655C);}' +
    '.rdvx-load{height:112px;margin-top:18px;border-radius:14px;background:var(--stone,#ECE8E0);opacity:.6;}' +
    '.rdvx-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden;}';

  function style() {
    if (document.getElementById('rdvx-css')) return;
    var s = document.createElement('style'); s.id = 'rdvx-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function monter(racine) {
    var depuis = racine.getAttribute('data-depuis') || 'site';
    var titre = racine.getAttribute('data-titre') || 'Prenez rendez-vous <em>en 2 clics.</em>';
    var jours = null, agenda = 'non', jour = 0, choisi = null, envoi = false, fini = null, t0 = Date.now(), cle = uuid(), erreur = '';
    var champs = { prenom: '', telephone: '', adresse: '' };
    var id = 'rdvx-' + Math.random().toString(36).slice(2, 8);

    function alt() {
      return '<div class="rdvx-alt"><a class="btn" href="tel:' + TEL + '">Appeler le ' + TEL_AFF + '</a><a class="btn" href="' + WA + '" target="_blank" rel="noopener">M\'écrire sur WhatsApp</a></div>';
    }
    function dessiner(focus) {
      var h = '<h2 id="' + id + '-t">' + titre + '</h2>';
      if (fini) {
        h += '<div class="rdvx-ok" role="status" data-test="rdv-ok"><b>C\'est noté : ' + esc(fini.quand) + '.</b><span>Shawez vous appelle pour confirmer ce rendez-vous, au plus vite. Comptez 45 minutes chez vous, c\'est offert et sans engagement.</span><span>Référence ' + esc(fini.reference) + '</span></div>' + alt();
        racine.innerHTML = h; var ok = racine.querySelector('.rdvx-ok'); if (ok && focus) { ok.setAttribute('tabindex', '-1'); ok.focus({ preventScroll: true }); try { ok.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { ok.scrollIntoView(); } }
        return;
      }
      h += '<p class="rdvx-sub">Shawez passe voir votre bien : 45 minutes, offert et sans engagement. ' +
        (agenda === 'relie' ? 'Les créneaux ci-dessous sont libres dans son agenda.' : 'Choisissez un créneau, il vous appelle pour le confirmer.') + '</p>';
      if (!jours) { h += '<div class="rdvx-load" role="status" aria-label="Chargement des créneaux"></div>'; racine.innerHTML = h; return; }
      if (!jours.length) { h += '<p class="rdvx-sub"><b>Aucun créneau en ligne pour le moment.</b> Appelez Shawez ou écrivez-lui : il vous propose une date.</p>' + alt(); racine.innerHTML = h; return; }
      var j = jours[jour] || jours[0];
      h += '<div class="rdvx-days" role="group" aria-label="Jour du rendez-vous">' + jours.map(function (x, k) {
        return '<button type="button" class="rdvx-day" data-jour="' + k + '" aria-pressed="' + (k === jour) + '">' + esc(x.court) + '</button>';
      }).join('') + '</div>';
      h += '<div class="rdvx-hours" role="group" aria-label="Heure, ' + esc(j.libelle) + '">' + j.heures.map(function (x) {
        return '<button type="button" class="rdvx-h" data-h="' + esc(x.debut) + '" aria-pressed="' + (choisi === x.debut) + '">' + esc(x.h) + '</button>';
      }).join('') + '</div>';
      if (choisi) {
        h += '<form class="rdvx-form" novalidate>' +
          '<p class="rdvx-choisi" id="' + id + '-c">Rendez-vous ' + esc(quand(choisi)) + '</p>' +
          '<div class="rdvx-grid"><div><label for="' + id + '-p">Prénom</label><input type="text" id="' + id + '-p" name="prenom" autocomplete="given-name" required maxlength="80" value="' + esc(champs.prenom) + '"></div>' +
          '<div><label for="' + id + '-tel">Téléphone</label><input type="tel" id="' + id + '-tel" name="telephone" autocomplete="tel" inputmode="tel" required maxlength="30" value="' + esc(champs.telephone) + '"></div></div>' +
          '<div><label for="' + id + '-a">Adresse du bien</label><input type="text" id="' + id + '-a" name="adresse" autocomplete="street-address" required maxlength="200" placeholder="Rue, ville" value="' + esc(champs.adresse) + '"></div>' +
          '<div class="rdvx-hp" aria-hidden="true"><label for="' + id + '-w">Ne pas remplir</label><input type="text" id="' + id + '-w" name="ee_hp" tabindex="-1" autocomplete="off"></div>' +
          (erreur ? '<p class="rdvx-err" role="alert">' + esc(erreur) + '</p>' : '') +
          '<div class="rdvx-go"><button type="submit" class="btn btn-primary btn-lg" data-test="rdv-confirmer"' + (envoi ? ' disabled' : '') + '>' + (envoi ? 'Envoi…' : 'Confirmer ce rendez-vous') + ' <span class="arw" aria-hidden="true">→</span></button></div>' +
          '<p class="rdvx-note">Shawez vous appelle pour confirmer. Vos coordonnées servent seulement à ce rendez-vous : <a href="/politique-de-confidentialite/">confidentialité</a>.</p>' +
          '</form>';
      } else if (erreur) h += '<p class="rdvx-err" role="alert" style="margin-top:12px;">' + esc(erreur) + '</p>';
      racine.innerHTML = h;
      if (focus) { var f = racine.querySelector(focus); if (f) f.focus({ preventScroll: focus.indexOf('-p') < 0 }); }
    }
    function charger() {
      api('/creneaux').then(function (d) {
        if (d._status !== 200 || !d.jours) { jours = []; } else { jours = d.jours; agenda = d.agenda || 'non'; }
        dessiner();
      });
    }
    function lire() {
      ['prenom', 'telephone', 'adresse'].forEach(function (k) { var i = racine.querySelector('[name="' + k + '"]'); if (i) champs[k] = i.value; });
    }
    racine.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !racine.contains(b)) return;
      if (b.hasAttribute('data-jour')) { lire(); jour = +b.getAttribute('data-jour'); erreur = ''; dessiner('[data-jour="' + jour + '"]'); return; }
      if (b.hasAttribute('data-h')) {
        lire(); erreur = '';
        var c = b.getAttribute('data-h'); choisi = choisi === c ? null : c;
        dessiner(choisi ? '#' + id + '-p' : '[data-h="' + c + '"]');
        if (choisi) { var f = racine.querySelector('.rdvx-form'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      }
    });
    racine.addEventListener('submit', function (e) {
      e.preventDefault(); if (envoi || !choisi) return;
      lire();
      var p = racine.querySelector('[name="prenom"]'), t = racine.querySelector('[name="telephone"]'), a = racine.querySelector('[name="adresse"]');
      var chiffres = champs.telephone.replace(/\D/g, '');
      var ko = [[p, !champs.prenom.trim()], [t, chiffres.length < 9 || chiffres.length > 15], [a, champs.adresse.trim().length < 3]];
      ko.forEach(function (x) { x[0].setAttribute('aria-invalid', String(x[1])); });
      var premier = ko.filter(function (x) { return x[1]; })[0];
      if (premier) { erreur = premier[0] === p ? 'Indiquez votre prénom.' : premier[0] === t ? 'Le numéro de téléphone n\'est pas valide.' : 'Indiquez l\'adresse du bien.'; dessiner('#' + premier[0].id); return; }
      envoi = true; erreur = ''; dessiner();
      api('/rdv', { creneau: choisi, prenom: champs.prenom.trim(), telephone: champs.telephone.trim(), adresse: champs.adresse.trim(), consentement: true,
        ee_hp: (racine.querySelector('[name="ee_hp"]') || {}).value || '', duree: Date.now() - t0, cle: cle, depuis: depuis }).then(function (d) {
        envoi = false;
        if (d._status === 201 || d._status === 200) { fini = { quand: d.quand || quand(choisi), reference: d.reference }; dessiner(true); return; }
        if (d.error === 'creneau_pris') { erreur = 'Ce créneau vient d\'être pris : choisissez-en un autre.'; choisi = null; jours = null; dessiner(); charger(); return; }
        if (d.error === 'champs') erreur = { prenom: 'Indiquez votre prénom.', telephone: 'Le numéro de téléphone n\'est pas valide.', adresse: 'Indiquez l\'adresse du bien.' }[d.champ] || 'Vérifiez le formulaire.';
        else if (d._status === 429) erreur = 'Trop d\'essais d\'un coup. Appelez Shawez au ' + TEL_AFF + '.';
        else erreur = 'L\'envoi n\'a pas marché. Appelez Shawez au ' + TEL_AFF + ' ou écrivez-lui sur WhatsApp.';
        dessiner();
      });
    });
    racine.classList.add('rdvx'); racine.setAttribute('aria-labelledby', id + '-t');
    dessiner();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); charger(); } }, { rootMargin: '600px 0px' });
      io.observe(racine);
    } else charger();
  }

  function demarrer() {
    var l = document.querySelectorAll('[data-rdv]'); if (!l.length) return;
    style();
    for (var i = 0; i < l.length; i++) monter(l[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
