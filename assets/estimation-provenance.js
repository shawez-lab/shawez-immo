/* Conserve les seuls libellés de campagne jusqu'à la demande personnelle.
   Aucune lecture du référent, aucun stockage, aucun cookie ni appel réseau. */
(function () {
  'use strict';
  var destination = '/estimation-immobiliere-dijon/';
  var cles = ['utm_source', 'utm_medium', 'utm_campaign'];
  var sensibles = /^(?:adresse|address|lien|token|email|telephone|tel|prenom|nom|message|password|mot_de_passe|url|redirect|redirect_uri|next|return|return_to)$/i;

  function campagne(v) {
    return typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v) && !/[0-9]{9,}/.test(v) ? v : '';
  }
  function personnelle(q) {
    var oui = false;
    q.forEach(function (_, k) { if (sensibles.test(k)) oui = true; });
    return oui;
  }
  function prive(chemin) {
    try { chemin = decodeURIComponent(chemin); } catch (_) { return true; }
    return /^\/(?:admin|mon-espace|api|merci|outils|de-claude)(?:\/|$)/i.test(chemin);
  }

  var actuelle;
  try { actuelle = new URL(window.location.href); } catch (_) { return; }
  if (!/^https?:$/.test(actuelle.protocol) || prive(actuelle.pathname) || personnelle(actuelle.searchParams)) return;
  var provenance = {};
  cles.forEach(function (k) { var v = campagne(actuelle.searchParams.get(k)); if (v) provenance[k] = v; });
  if (!Object.keys(provenance).length) return;

  function cible(brut) {
    var u;
    try { u = new URL(brut, actuelle.href); } catch (_) { return null; }
    return /^https?:$/.test(u.protocol) && u.origin === actuelle.origin && !u.username && !u.password
      && u.pathname === destination && !personnelle(u.searchParams) ? u : null;
  }

  document.querySelectorAll('a[href]').forEach(function (a) {
    var u = cible(a.getAttribute('href'));
    if (!u) return;
    var change = false;
    cles.forEach(function (k) {
      if (provenance[k] && !campagne(u.searchParams.get(k))) { u.searchParams.set(k, provenance[k]); change = true; }
    });
    if (change) a.setAttribute('href', u.pathname + u.search + u.hash);
  });

  document.querySelectorAll('form').forEach(function (form) {
    if ((form.getAttribute('method') || 'get').toLowerCase() !== 'get') return;
    var u = cible(form.getAttribute('action') || actuelle.href);
    if (!u) return;
    cles.forEach(function (k) {
      var champs = form.querySelectorAll('[name="' + k + '"]');
      var valeur = campagne(u.searchParams.get(k)) || provenance[k];
      if (!valeur) return;
      if (champs.length) {
        // Ne jamais modifier un champ de saisie, ni multiplier les champs déjà présents.
        if (champs.length === 1 && champs[0].tagName === 'INPUT'
          && (champs[0].getAttribute('type') || '').toLowerCase() === 'hidden'
          && !campagne(champs[0].value)) champs[0].value = valeur;
        return;
      }
      // La soumission GET remplace la requête de l'action : les UTM doivent être des champs.
      var champ = document.createElement('input');
      champ.setAttribute('type', 'hidden');
      champ.setAttribute('name', k);
      champ.value = valeur;
      form.appendChild(champ);
    });
  });
})();
