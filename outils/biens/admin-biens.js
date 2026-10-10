(function () {
  'use strict';
  var R = document.getElementById('biens-admin');
  var $ = function (s) { return R.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var euros = function (n) { return n == null ? '' : Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €'; };
  var quand = function (iso) { return iso ? new Date(iso).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; };
  var donnees = null;
  function api(chemin, corps) {
    return fetch('/api/biens' + chemin, corps ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) } : {})
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'erreur'); e.d = d; e.status = r.status; throw e; } return d; }); });
  }
  function charger() {
    api('/admin/liste').then(function (d) { donnees = d; afficher(); }).catch(function (e) {
      $('[data-etat]').innerHTML = e.status === 401 || e.status === 403
        ? 'Connectez-vous d\'abord dans <a class="link" href="/admin/">l\'espace agence</a>, puis revenez ici.'
        : 'Lecture impossible (' + esc(e.message) + ').';
    });
  }
  var LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  function sel(nom, val, options) {
    return '<select name="' + nom + '"><option value="">—</option>' + options.map(function (o) { var v = o[0], l = o[1]; return '<option value="' + esc(v) + '"' + (String(val == null ? '' : val) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>';
  }
  function inp(nom, val, type) { return '<input name="' + nom + '" value="' + esc(val == null ? '' : val) + '"' + (type ? ' inputmode="' + type + '"' : '') + '>'; }
  function blocBien(b) {
    var s = b.suggestions || {};
    var etat = b.statut !== 'en vente' ? '<span class="ba-etat off">' + esc(b.statut) + '</span>' : b.visible ? '<span class="ba-etat ok">Publiée</span>' : '<span class="ba-etat ko">Non publiée</span>';
    var m = b.mesures || {};
    var mes = 'Vues ' + (m.vue || 0) + ' · clics « Visiter » ' + (m.visite_clic || 0) + ' · vidéo ' + (m.video || 0) + ' · WhatsApp ' + (m.whatsapp || 0) + ' · appels ' + (m.tel || 0) + ' · demandes ' + (m.visite_demande || 0) + ' (30 jours)';
    return '<details class="ba-bien" data-id="' + esc(b.id) + '"><summary>' +
      (b.photos && b.photos[0] ? '<img src="/annonces/' + encodeURIComponent(b.id) + '/1-600.webp" alt="" loading="lazy">' : '<span></span>') +
      '<span><b>' + esc(b.type) + ' · ' + esc(b.commune) + ' · ' + esc(euros(b.prix)) + '</b> <span class="bv-petit">réf. ' + esc(b.id) + '</span><br>' +
      (b.manque.length ? '<span class="ba-manque">Manque : ' + esc(b.manque.join(', ')) + '</span>' : '<a class="link" href="' + esc(b.url) + '" target="_blank">Voir la fiche</a>') +
      '<br><span class="ba-mes">' + mes + '</span></span>' + etat + '</summary>' +
      '<form class="ba-form">' +
      '<label>DPE (énergie) ' + sel('dpe', b.dpe, LETTRES.map(function (l) { return [l, l]; }).concat([['vierge', 'DPE vierge'], ['non_soumis', 'Non soumis']])) + (s.dpe ? '<span class="ba-sugg">Texte de l\'agence : « DPE ' + esc(s.dpe) + ' »</span>' : '') + '</label>' +
      '<label>GES (climat) ' + sel('ges', b.ges, LETTRES.map(function (l) { return [l, l]; })) + '</label>' +
      '<label>kWh/m²/an (facultatif) ' + inp('dpe_kwh', b.dpe_kwh, 'numeric') + '</label>' +
      '<label>kg CO₂/m²/an (facultatif) ' + inp('ges_kg', b.ges_kg, 'numeric') + '</label>' +
      '<label>Dépenses d\'énergie : de (€/an) ' + inp('energie_min', b.energie_min, 'numeric') + '</label>' +
      '<label>à (€/an) ' + inp('energie_max', b.energie_max, 'numeric') + '</label>' +
      '<label>Prix de l\'énergie au 1er janvier (année) ' + inp('energie_annee', b.energie_annee, 'numeric') + '</label>' +
      '<label>Honoraires à la charge de ' + sel('honoraires_charge', b.honoraires_charge, [['vendeur', 'Vendeur'], ['acquereur', 'Acquéreur']]) + (s.honoraires_charge ? '<span class="ba-sugg">Fiche de l\'agence : ' + (s.honoraires_charge === 'vendeur' ? 'vendeur ?' : 'acquéreur ?') + '</span>' : '') + '</label>' +
      '<label>Honoraires % TTC (si acquéreur) ' + inp('honoraires_pct', b.honoraires_pct, 'decimal') + '</label>' +
      '<label>Prix hors honoraires (si acquéreur) ' + inp('prix_hors_hon', b.prix_hors_hon, 'numeric') + '</label>' +
      '<label>Copropriété ' + sel('copro', b.copro, [['1', 'Oui'], ['0', 'Non']]) + '</label>' +
      '<label>Nombre de lots ' + inp('copro_lots', b.copro_lots, 'numeric') + '</label>' +
      '<label>Charges annuelles (€) ' + inp('copro_charges', b.copro_charges, 'numeric') + '</label>' +
      '<label>Procédure ' + sel('copro_procedure', b.copro_procedure, [['pas de procédure en cours', 'Pas de procédure en cours'], ['procédure en cours', 'Procédure en cours']]) + '</label>' +
      '<label>Vidéo (chemin .mp4 sur le site) ' + inp('video', b.video) + '</label>' +
      '<label>Image de la vidéo (.webp) ' + inp('video_affiche', b.video_affiche) + '</label>' +
      '<div class="ba-l"><label><input type="checkbox" name="masque"' + (b.masque ? ' checked' : '') + '> Masquer ce bien</label>' +
      '<button class="btn btn-primary" type="submit">Enregistrer</button> <a class="link" href="' + esc(b.url) + '?apercu=1" target="_blank">Aperçu</a> <span class="bv-petit" data-res></span></div>' +
      '</form></details>';
  }
  function afficher() {
    var d = donnees;
    $('[data-etat]').hidden = true; $('[data-contenu]').hidden = false;
    var enVente = d.biens.filter(function (b) { return b.statut === 'en vente'; });
    var pub = enVente.filter(function (b) { return b.visible; });
    var vis = d.visites.filter(function (v) { return !v.test; });
    $('[data-bilan]').innerHTML = '<span>' + enVente.length + ' en vente</span><span>' + pub.length + ' publiés</span><span>' + (enVente.length - pub.length) + ' à compléter</span><span>' + vis.filter(function (v) { return v.statut === 'demandee'; }).length + ' visite(s) à confirmer</span><span class="bv-petit">Annonces relues : ' + esc(quand(d.synchro_le)) + '</span>';
    var parId = {}; d.biens.forEach(function (b) { parId[b.id] = b; });
    $('[data-visites]').innerHTML = d.visites.length ? '<table class="ba-table"><thead><tr><th>Reçue</th><th>Bien</th><th>Contact</th><th>Créneau</th><th>Statut</th></tr></thead><tbody>' + d.visites.map(function (v) {
      var b = parId[v.bien_id] || {};
      return '<tr data-v="' + v.id + '"><td>' + esc(quand(v.cree_le)) + (v.test ? ' <b>(essai)</b>' : '') + '</td><td>' + esc(b.type || '') + ' ' + esc(b.commune || '') + ' — réf. ' + esc(v.bien_id) + '</td><td><b>' + esc(v.prenom) + ' ' + esc(v.nom || '') + '</b><br><a href="tel:' + esc(v.telephone) + '">' + esc(v.telephone) + '</a>' + (v.email ? '<br>' + esc(v.email) : '') + '<br><span class="bv-petit">' + esc(v.alerte || '') + '</span></td><td>' + esc(quand(v.creneau)) + '</td><td>' +
        sel('statut', v.statut, [['demandee', 'À confirmer'], ['confirmee', 'Confirmée'], ['faite', 'Faite'], ['annulee', 'Annulée']]) + (v.test ? ' <button class="btn" type="button" data-suppr>Effacer</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table>' : '<p class="bv-petit">Aucune demande de visite pour l\'instant.</p>';
    var seul = $('[data-filtre-vente]').checked;
    $('[data-biens]').innerHTML = d.biens.filter(function (b) { return !seul || b.statut === 'en vente'; }).map(blocBien).join('');
  }
  R.addEventListener('submit', function (e) {
    var f = e.target.closest('.ba-form'); if (!f) return;
    e.preventDefault();
    var id = f.closest('[data-id]').getAttribute('data-id');
    var c = { id: id };
    Array.prototype.forEach.call(f.elements, function (x) { if (!x.name) return; c[x.name] = x.type === 'checkbox' ? x.checked : x.value; });
    var res = f.querySelector('[data-res]'); res.textContent = 'Enregistrement…';
    api('/admin/bien', c).then(function (r) {
      res.textContent = r.visible ? 'Enregistré : fiche publiée.' : 'Enregistré. Manque encore : ' + r.manque.join(', ');
      var b = donnees.biens.filter(function (x) { return x.id === id; })[0];
      Object.keys(c).forEach(function (k) { if (k !== 'id') b[k] = c[k]; });
      b.manque = r.manque; b.visible = r.visible;
    }).catch(function (e2) { res.textContent = 'Refusé : ' + ((e2.d && e2.d.champ) || e2.message); });
  });
  R.addEventListener('change', function (e) {
    if (e.target.matches('[data-filtre-vente]')) return afficher();
    var tr = e.target.closest('tr[data-v]');
    if (tr && e.target.name === 'statut') api('/admin/visite', { id: Number(tr.getAttribute('data-v')), statut: e.target.value }).catch(function () {});
  });
  R.addEventListener('click', function (e) {
    if (e.target.matches('[data-synchro]')) { e.target.disabled = true; api('/admin/synchro', {}).then(charger).finally(function () { e.target.disabled = false; }); }
    if (e.target.matches('[data-suppr]')) { var tr = e.target.closest('tr[data-v]'); api('/admin/visite/supprimer', { id: Number(tr.getAttribute('data-v')) }).then(charger); }
  });
  charger();
})();
