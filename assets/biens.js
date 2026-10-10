/* Fiche d'un bien (/biens/<…>/) : créneaux de visite en 2 clics, vidéo lue au clic, mesures sans cookie. */
(function () {
  'use strict';
  var fiche = document.querySelector('[data-bien]');
  if (!fiche) return;
  var bien = fiche.getAttribute('data-bien');

  function envoyer(chemin, corps) {
    return fetch('/api/biens' + chemin, { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  }
  function mesurer(quoi) { try { envoyer('/mesure', { bien: bien, quoi: quoi }).catch(function () {}); } catch (e) { /* */ } }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-mesure],[data-mesure-lien]');
    if (!a) return;
    mesurer(a.getAttribute('data-mesure') || a.getAttribute('data-mesure-lien'));
  });

  /* vidéo : rien n'est chargé avant le clic */
  var lire = fiche.querySelector('[data-video]');
  if (lire) lire.addEventListener('click', function () {
    var v = document.createElement('video');
    v.src = lire.getAttribute('data-video'); v.controls = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.className = 'bv-v'; v.preload = 'auto';
    var img = lire.querySelector('img'); if (img) v.poster = img.src;
    lire.parentNode.replaceChild(v, lire);
    v.play().catch(function () {});
    mesurer('video');
  });

  /* créneaux */
  var boite = fiche.querySelector('[data-creneaux]');
  var form = fiche.querySelector('[data-visite]');
  var choisi = null;
  function afficher(jours) {
    if (!jours.length) { boite.innerHTML = '<p class="bv-petit">Pas de créneau en ligne cette semaine : écrivez-moi sur WhatsApp.</p>'; return; }
    var h = '';
    jours.slice(0, 6).forEach(function (j, i) {
      h += '<fieldset class="bv-jour"' + (i > 1 ? ' hidden' : '') + '><legend>' + j.libelle + '</legend><div>';
      j.heures.forEach(function (x) { h += '<button type="button" class="bv-h" data-debut="' + x.debut + '" data-quand="' + j.libelle + ' à ' + x.h + '" aria-pressed="false">' + x.h + '</button>'; });
      h += '</div></fieldset>';
    });
    if (jours.length > 2) h += '<button type="button" class="btn bv-plus" data-plus>Autres jours</button>';
    boite.innerHTML = h;
  }
  fetch('/api/biens/creneaux', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (d) { afficher(d.jours || []); })
    .catch(function () { boite.innerHTML = '<p class="bv-petit">Créneaux indisponibles pour l\'instant : appelez-moi ou écrivez-moi sur WhatsApp.</p>'; });
  boite.addEventListener('click', function (e) {
    if (e.target.closest('[data-plus]')) {
      Array.prototype.forEach.call(boite.querySelectorAll('.bv-jour[hidden]'), function (x) { x.hidden = false; });
      e.target.closest('[data-plus]').remove(); return;
    }
    var b = e.target.closest('.bv-h'); if (!b) return;
    Array.prototype.forEach.call(boite.querySelectorAll('.bv-h'), function (x) { x.setAttribute('aria-pressed', 'false'); });
    b.setAttribute('aria-pressed', 'true');
    choisi = b.getAttribute('data-debut');
    form.hidden = false;
    form.querySelector('[data-choisi]').textContent = 'Créneau choisi : ' + b.getAttribute('data-quand');
    form.querySelector('[name=prenom]').focus();
  });
  var ERREURS = { telephone: 'Vérifiez le numéro de téléphone.', prenom: 'Indiquez votre prénom.', email: 'Vérifiez l\'adresse e-mail.', consentement: 'Cochez la case pour que je puisse vous rappeler.', creneau_pris: 'Ce créneau vient d\'être pris : choisissez-en un autre.', trop_de_demandes: 'Trop de demandes : appelez-moi directement.' };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = form.querySelector('[data-msg]'); msg.textContent = '';
    var f = form.elements;
    if (!f.prenom.value.trim()) { msg.textContent = ERREURS.prenom; f.prenom.focus(); return; }
    if (f.telephone.value.replace(/\D/g, '').length < 9) { msg.textContent = ERREURS.telephone; f.telephone.focus(); return; }
    if (!f.consentement.checked) { msg.textContent = ERREURS.consentement; f.consentement.focus(); return; }
    var bouton = form.querySelector('button[type=submit]'); bouton.disabled = true;
    envoyer('/visite', { bien: bien, creneau: choisi, prenom: f.prenom.value, telephone: f.telephone.value, email: f.email.value || undefined, consentement: true, site_web: f.site_web.value || undefined })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        bouton.disabled = false;
        if (!x.ok) { var c = (x.d && (x.d.champ || x.d.error)) || ''; msg.textContent = ERREURS[c] || 'Envoi impossible : appelez-moi au 07 67 57 92 28.'; return; }
        form.hidden = true; boite.hidden = true;
        var ok = fiche.querySelector('[data-ok]'); ok.hidden = false;
        ok.innerHTML = '<p><b>C\'est noté' + (x.d.creneau_fr ? ' pour ' + x.d.creneau_fr : '') + '.</b></p><p>Je vous rappelle au plus vite pour confirmer la visite.</p>';
        ok.focus();
      })
      .catch(function () { bouton.disabled = false; msg.textContent = 'Envoi impossible : appelez-moi au 07 67 57 92 28.'; });
  });
})();
