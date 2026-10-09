/* Avis de valeur en PDF, fabriqué dans le navigateur de l'agence (/admin/ → « Préparer l'avis de valeur »).

   window.EEAvis.generer({ site, reference, date, contenu, donnees }) → Promise<Uint8Array>
     contenu : ce que l'agent a saisi (notes de visite, atouts, vigilance, stratégie en 3 points, fourchette, date de visite)
     donnees : le bien, le vendeur, le marché et les ventes comparables réelles (DVF), le conseiller
   Aucun chiffre n'est inventé ici : la fourchette est celle validée par l'agent, les ventes sont celles de DVF.
   S'il y a moins de 5 ventes comparables, le document le dit.

   Charte du site : fond ivoire, encre, moutarde ; Familjen Grotesk (titres, italique pour le mot en couleur) et
   Schibsted Grotesk (texte). Bibliothèques (même dossier) : pdf-lib et fontkit, licence MIT ; polices sous licence OFL. */
(function () {
  'use strict';
  var BASE = ((document.currentScript && document.currentScript.src) || '/assets/avis/avis-pdf.js').replace(/[^/]*$/, '');
  var A4 = [595.28, 841.89], MG = 56, LARGEUR = A4[0] - 2 * MG, BAS = 74;
  var HEX = { fond: 'F7F6F2', blanc: 'FFFFFF', encre: '0F0E0C', encre2: '3A3630', gris: '6B655C', accent: 'B5891F', accentTexte: '8A6614', pierre: 'ECE8E0', pierre2: 'E1DCD2', filet: 'D9D4C9', nuit: '0F0E0C', nuit2: '1A1815', ivoire: 'F3EFE6', nuitAccent: 'E3B341', nuitGris: 'A9A297', nuitFilet: '34302A', alerte: '7E2C1F', alerteFond: 'F6E9E5' };

  /* ---------- chargement : bibliothèques, polices, logos (une seule fois) ---------- */
  function script(nom, present) {
    if (present()) return Promise.resolve();
    return new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = BASE + nom;
      s.onload = function () { ok(); }; s.onerror = function () { ko(new Error('script ' + nom)); };
      document.head.appendChild(s);
    });
  }
  function octets(nom) {
    return fetch(BASE + nom).then(function (r) { if (!r.ok) throw new Error('fichier ' + nom); return r.arrayBuffer(); });
  }
  var pret = null;
  function ressources() {
    if (!pret) {
      var noms = ['familjen-400.woff', 'familjen-400-italic.woff', 'schibsted-400.woff', 'schibsted-600.woff', 'logo-horiz-ivory.png', 'logo-gravelin-ivory.png', 'logo-gravelin-ink.png', 'logo-mono-ink.png'];
      pret = script('pdf-lib.min.js', function () { return !!window.PDFLib; })
        .then(function () { return script('fontkit.umd.min.js', function () { return !!window.fontkit; }); })
        .then(function () { return Promise.all(noms.map(octets)); })
        .then(function (l) { var r = {}; noms.forEach(function (n, i) { r[n] = l[i]; }); return r; })
        .catch(function (e) { pret = null; throw e; });
    }
    return pret;
  }

  /* ---------- petits outils ---------- */
  function euros(n) { return n == null || n === '' ? '' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0€'; }
  function nombre(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); }
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  function dateLongue(iso) { var p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? (+p[2] === 1 ? '1er' : +p[2]) + ' ' + MOIS[+p[1] - 1] + ' ' + p[0] : ''; }
  function moisAnnee(am) { var p = String(am || '').split('-'); return p.length >= 2 ? MOIS[+p[1] - 1] + ' ' + p[0] : ''; }
  function moisCourt(am) { var p = String(am || '').split('-'); return p.length >= 2 ? p[1] + '/' + p[0] : ''; }
  function rayon(r) { return r >= 1000 ? String(Math.round(r / 100) / 10).replace('.', ',') + '\u00A0km' : r + '\u00A0m'; }
  function maj(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  function generer(d) {
    return ressources().then(function (R) { return construire(window.PDFLib, window.fontkit, R, d || {}); });
  }

  /* ---------- le document ---------- */
  function construire(P, fontkit, R, d) {
    var c = d.contenu || {}, D = d.donnees || {}, bien = D.bien || {}, client = D.client || {}, marche = D.marche || {}, ventes = D.ventes || [], cons = D.conseiller || {};
    var rgb = function (h) { h = HEX[h] || h; return P.rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255); };
    var doc, F = {}, IMG = {}, page, y, pages = [];

    return P.PDFDocument.create().then(function (x) {
      doc = x; doc.registerFontkit(fontkit);
      return Promise.all([
        doc.embedFont(R['familjen-400.woff'], { subset: true }), doc.embedFont(R['familjen-400-italic.woff'], { subset: true }),
        doc.embedFont(R['schibsted-400.woff'], { subset: true }), doc.embedFont(R['schibsted-600.woff'], { subset: true }),
        doc.embedPng(R['logo-horiz-ivory.png']), doc.embedPng(R['logo-gravelin-ivory.png']), doc.embedPng(R['logo-gravelin-ink.png']), doc.embedPng(R['logo-mono-ink.png']),
      ]);
    }).then(function (l) {
      F.titre = l[0]; F.italique = l[1]; F.texte = l[2]; F.gras = l[3];
      IMG.shawez = l[4]; IMG.gravelinIvoire = l[5]; IMG.gravelin = l[6]; IMG.mono = l[7];
      var jeux = {}; ['titre', 'italique', 'texte', 'gras'].forEach(function (k) { jeux[k] = new Set(F[k].getCharacterSet()); });

      /* texte sûr pour une police : guillemets et tirets ramenés à ce que la police sait dessiner, le reste retiré */
      function propre(s, police) {
        var jeu = jeux[police], out = '';
        s = String(s == null ? '' : s).replace(/\r/g, '').replace(/[‘’ʼ]/g, '\'').replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[   ]/g, '\u00A0').replace(/\t/g, ' ');
        for (var i = 0; i < s.length; i++) {
          var cp = s.codePointAt(i); if (cp > 0xFFFF) i++;
          if (cp === 10 || jeu.has(cp)) out += String.fromCodePoint(cp);
          else if (cp === 0x2192) out += '>';
          else if (cp === 0x2022 || cp === 0x25CF) out += '-';
          else if (cp === 0x2011 || cp === 0x2010) out += '-';
        }
        return out;
      }
      function largeur(s, police, taille, inter) { return F[police].widthOfTextAtSize(s, taille) + (inter ? inter * s.length : 0); }

      /* ---------- pages ---------- */
      function nouvellePage(fond) {
        page = doc.addPage(A4);
        page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(fond || 'fond') });
        pages.push({ page: page, nuit: fond === 'nuit' });
        y = A4[1] - MG;
        return page;
      }
      function place(h) { if (y - h < BAS) { nouvellePage(); entete(); } }

      /* une ligne de texte, avec interlettrage éventuel (surtitres) */
      function ligne(s, x, yy, o) {
        o = o || {};
        var police = o.police || 'texte', taille = o.taille || 10.5;
        s = propre(s, police);
        if (o.inter) page.pushOperators(P.setCharacterSpacing(o.inter));
        page.drawText(s, { x: o.droite ? x - largeur(s, police, taille, o.inter) : x, y: yy, size: taille, font: F[police], color: rgb(o.couleur || 'encre') });
        if (o.inter) page.pushOperators(P.setCharacterSpacing(0));
        return largeur(s, police, taille, o.inter);
      }
      /* coupe un texte en lignes qui tiennent dans une largeur (les espaces insécables tiennent les mots ensemble) */
      function couper(s, police, taille, max) {
        var lignes = [];
        propre(s, police).split('\n').forEach(function (par) {
          var mots = par.split(' ').filter(function (m) { return m !== ''; }), cur = '';
          if (!mots.length) { lignes.push(''); return; }
          mots.forEach(function (m) {
            var essai = cur ? cur + ' ' + m : m;
            if (largeur(essai, police, taille) <= max || !cur) {
              // un mot plus large que la ligne (lien, suite de caractères) : coupé net
              while (!cur && largeur(essai, police, taille) > max && essai.length > 1) {
                var k = essai.length - 1; while (k > 1 && largeur(essai.slice(0, k), police, taille) > max) k--;
                lignes.push(essai.slice(0, k)); essai = essai.slice(k);
              }
              cur = essai;
            } else { lignes.push(cur); cur = m; }
          });
          lignes.push(cur);
        });
        return lignes;
      }
      /* paragraphe qui s'écoule (et passe à la page suivante s'il le faut) ; rend le y sous le texte */
      function paragraphe(s, o) {
        o = o || {};
        var police = o.police || 'texte', taille = o.taille || 10.5, inter = o.interligne || taille * 1.5, x = o.x == null ? MG : o.x, max = o.largeur || LARGEUR - (x - MG);
        couper(s, police, taille, max).forEach(function (l) {
          if (o.coule !== false) place(inter);
          if (l) ligne(l, x, y - taille, { police: police, taille: taille, couleur: o.couleur });
          y -= inter;
        });
        return y;
      }
      function hauteur(s, o) { o = o || {}; var t = o.taille || 10.5; return couper(s, o.police || 'texte', t, o.largeur || LARGEUR).length * (o.interligne || t * 1.5); }
      function surtitre(s, x, yy, couleur) { return ligne(String(s).toUpperCase(), x, yy, { police: 'gras', taille: 7.6, inter: 1.5, couleur: couleur || 'accentTexte' }); }
      /* grand titre : un début en romain, la fin en italique moutarde, comme sur le site */
      function titre(debut, fin, o) {
        o = o || {};
        var taille = o.taille || 30, x = MG, mots = [];
        propre(debut, 'titre').split(' ').filter(Boolean).forEach(function (m) { mots.push([m, 'titre', o.couleur || 'encre']); });
        propre(fin || '', 'italique').split(' ').filter(Boolean).forEach(function (m) { mots.push([m, 'italique', o.accent || 'accentTexte']); });
        var esp = largeur(' ', 'titre', taille), cx = x;
        y -= taille;
        mots.forEach(function (m) {
          var w = largeur(m[0], m[1], taille);
          if (cx + w > MG + (o.largeur || LARGEUR) && cx > x) { cx = x; y -= taille * 1.08; }
          page.drawText(m[0], { x: cx, y: y, size: taille, font: F[m[1]], color: rgb(m[2]) });
          cx += w + esp;
        });
        y -= o.apres == null ? 26 : o.apres;
      }
      function filet(yy, x1, x2, couleur, e) { page.drawLine({ start: { x: x1 == null ? MG : x1, y: yy }, end: { x: x2 == null ? MG + LARGEUR : x2, y: yy }, thickness: e || 0.6, color: rgb(couleur || 'filet') }); }
      function boite(x, yy, w, h, couleur, bord) { page.drawRectangle({ x: x, y: yy, width: w, height: h, color: couleur ? rgb(couleur) : undefined, borderColor: bord ? rgb(bord) : undefined, borderWidth: bord ? 0.6 : 0 }); }
      function image(img, x, yy, w) { var h = w * img.height / img.width; page.drawImage(img, { x: x, y: yy, width: w, height: h }); return h; }
      /* en-tête des pages intérieures */
      function entete() {
        image(IMG.mono, MG, A4[1] - 46, 17);
        surtitre('Avis de valeur', MG + 26, A4[1] - 41.5, 'gris');
        var court = propre((bien.adresse || '').replace(/\s+\d{5}\s+/, ', '), 'texte');
        if (largeur(court, 'texte', 8.5) > 300) court = court.slice(0, 60) + '...';
        ligne(court, MG + LARGEUR, A4[1] - 42, { taille: 8.5, couleur: 'gris', droite: true });
        filet(A4[1] - 56);
        y = A4[1] - 56 - 40;
      }
      function puces(liste, x, w) {
        liste.forEach(function (t) {
          var h = hauteur(t, { largeur: w - 14, taille: 10.5 });
          place(h + 6);
          page.drawCircle({ x: x + 3, y: y - 7.2, size: 2, color: rgb('accent') });
          paragraphe(t, { x: x + 14, largeur: w - 14, coule: false });
          y -= 6;
        });
      }

      var typeBien = bien.type_libelle || (bien.type === 'maison' ? 'Maison' : bien.type === 'appartement' ? 'Appartement' : 'Bien');
      var resume = [bien.surface ? bien.surface + '\u00A0m²' : '', bien.pieces ? bien.pieces + (bien.pieces > 1 ? ' pièces' : ' pièce') : ''].filter(Boolean).join(' · ');
      var nomClient = [client.civilite, client.prenom, client.nom].filter(Boolean).join(' ');
      var jour = dateLongue(d.date);

      /* ======================= 1. Couverture ======================= */
      nouvellePage('nuit');
      image(IMG.shawez, MG, A4[1] - MG - 24, 178);
      surtitre('Avis de valeur', MG, 470, 'nuitAccent');
      y = 452;
      titre(typeBien + (resume ? ',' : ''), '', { taille: 44, couleur: 'ivoire', apres: 6 });
      if (resume) titre(resume, '', { taille: 44, couleur: 'ivoire', apres: 18 });
      titre('', (bien.adresse || bien.commune || '').replace(/\s+(\d{5})\s+/, ', $1 '), { taille: 22, accent: 'nuitAccent', apres: 0 });
      filet(196, MG, MG + LARGEUR, 'nuitFilet');
      var col = LARGEUR / 3;
      [['Préparé pour', nomClient || '—'], ['Date', jour], ['Référence', d.reference || '']].forEach(function (k, i) {
        surtitre(k[0], MG + i * col, 172, 'nuitGris');
        ligne(k[1], MG + i * col, 154, { police: 'texte', taille: 11.5, couleur: 'ivoire' });
      });
      filet(128, MG, MG + LARGEUR, 'nuitFilet');
      ligne((cons.nom || 'Shawez Ali') + ' — ' + (cons.role || 'Agent immobilier'), MG, 92, { police: 'gras', taille: 10.5, couleur: 'ivoire' });
      ligne([cons.tel, cons.email].filter(Boolean).join(' · '), MG, 76, { taille: 9.5, couleur: 'nuitGris' });
      image(IMG.gravelinIvoire, MG + LARGEUR - 120, 70, 120);

      /* ======================= 2. Le bien ======================= */
      nouvellePage(); entete();
      surtitre('Le bien', MG, y); y -= 14;
      titre('Votre', bien.type === 'maison' ? 'maison.' : bien.type === 'appartement' ? 'appartement.' : 'bien.');
      var fiche = [];
      var add = function (k, v) { if (v !== '' && v != null) fiche.push([k, String(v)]); };
      add('Adresse', bien.adresse);
      add('Type', typeBien);
      add('Surface', bien.surface ? bien.surface + '\u00A0m²' : '');
      add('Pièces', bien.pieces ? bien.pieces + (bien.chambres != null ? ' (dont ' + bien.chambres + (bien.chambres > 1 ? ' chambres)' : ' chambre)') : '') : '');
      if (bien.type === 'appartement') add('Étage', bien.etage == null ? '' : (bien.etage === 0 ? 'Rez-de-chaussée' : bien.etage + (bien.etage === 1 ? 'er' : 'e') + ' étage') + (bien.etages_immeuble ? ' sur ' + bien.etages_immeuble : ''));
      if (bien.type === 'maison') { add('Terrain', bien.terrain != null ? nombre(bien.terrain) + '\u00A0m²' : ''); add('Niveaux', bien.niveaux); }
      add('Époque de construction', bien.epoque);
      add('État général', bien.etat);
      add('Équipements déclarés', (bien.atouts || []).join(', '));
      add('Date de la visite', c.date_visite ? dateLongue(c.date_visite) : '');
      filet(y);
      fiche.forEach(function (l) {
        var lignesV = couper(l[1], 'gras', 10.5, LARGEUR - 170), h = Math.max(1, lignesV.length) * 15 + 12;
        ligne(l[0], MG, y - 18, { couleur: 'gris' });
        lignesV.forEach(function (t, i) { ligne(t, MG + 170, y - 18 - i * 15, { police: 'gras' }); });
        y -= h; filet(y);
      });
      y -= 30;
      if (c.notes) {
        place(80);
        surtitre('Ce que j\'ai vu sur place', MG, y); y -= 18;
        paragraphe(c.notes, { couleur: 'encre2', interligne: 16.5 });
      } else {
        paragraphe('Cet avis de valeur s\'appuie sur les caractéristiques ci-dessus et sur les ventes réelles du secteur, présentées dans les pages qui suivent.', { couleur: 'encre2' });
      }

      /* ======================= 3. La méthode ======================= */
      nouvellePage(); entete();
      surtitre('La méthode', MG, y); y -= 14;
      titre('Des prix signés,', 'pas des prix affichés.');
      [
        ['Les ventes réelles', 'Je pars des ventes signées chez le notaire autour de votre bien, publiées par l\'État dans la base DVF (Demandes de valeurs foncières). Ce sont des prix payés, pas des prix d\'annonce.'],
        ['La visite', 'Je compare ensuite votre bien à ces ventes, sur place : l\'étage, la lumière, le plan, l\'état, l\'extérieur, le stationnement. C\'est tout ce qu\'un calcul ne voit pas.'],
        ['La fourchette', 'J\'en tire une fourchette de valeur réaliste, puis un prix d\'affichage et une stratégie pour vendre dans de bons délais.'],
      ].forEach(function (e, i) {
        var h = hauteur(e[1], { largeur: LARGEUR - 62 }) + 30;
        ligne('0' + (i + 1), MG, y - 24, { police: 'titre', taille: 26, couleur: 'accent' });
        ligne(e[0], MG + 62, y - 13, { police: 'gras', taille: 12 });
        var y0 = y; y -= 24;
        paragraphe(e[1], { x: MG + 62, couleur: 'encre2', coule: false });
        y = Math.min(y, y0 - h) - 8;
      });
      y -= 12; filet(y); y -= 30;
      surtitre('Le marché autour de chez vous', MG, y); y -= 18;
      if (marche.comparables) {
        var tuiles = [[String(marche.comparables), marche.comparables > 1 ? 'ventes comparables' : 'vente comparable'], [rayon(marche.rayon || 0), 'rayon autour du bien'], marche.comparables >= 5 && marche.m2_median ? [nombre(marche.m2_median) + '\u00A0€', 'prix médian au m²'] : ['—', 'prix médian (trop peu de ventes)']];
        var tw = (LARGEUR - 24) / 3;
        tuiles.forEach(function (t, i) {
          var x = MG + i * (tw + 12);
          boite(x, y - 78, tw, 78, 'blanc', 'filet');
          ligne(t[0], x + 14, y - 40, { police: 'titre', taille: 24 });
          ligne(t[1], x + 14, y - 60, { taille: 9, couleur: 'gris' });
        });
        y -= 78 + 20;
        var annees = marche.annees && marche.annees.length ? marche.annees[0] + '–' + marche.annees[marche.annees.length - 1] : '';
        paragraphe('Ventes ' + (bien.type === 'maison' ? 'de maisons' : 'd\'appartements') + ' de surface comparable' + (annees ? ', signées de ' + annees.replace('–', ' à ') : '') + '.' +
          (marche.m2_bas && marche.m2_haut && marche.comparables >= 5 ? ' La moitié de ces ventes s\'est conclue entre ' + nombre(marche.m2_bas) + ' et ' + nombre(marche.m2_haut) + '\u00A0€ le m².' : ''), { couleur: 'encre2' });
      } else {
        paragraphe(bien.type === 'autre' ? 'Pour ce type de bien, il n\'existe pas de ventes comparables exploitables dans la base DVF : la valeur repose sur l\'étude du dossier et sur la visite.' : 'Aucune vente comparable n\'a été trouvée dans la base DVF autour de ce bien.', { couleur: 'encre2' });
      }
      y -= 8;
      paragraphe('Source : DVF géolocalisées (DGFiP, Etalab), Licence Ouverte 2.0' + (marche.donnees_du ? ' — données à jour de ' + moisAnnee(marche.donnees_du) : '') + '.', { taille: 8.5, couleur: 'gris', interligne: 12.5 });

      /* ======================= 4. Les ventes comparables ======================= */
      nouvellePage(); entete();
      surtitre('Les preuves', MG, y); y -= 14;
      titre('Les ventes', 'comparables.');
      if (!D.assez_de_ventes) {
        var msg = ventes.length
          ? 'Il y a eu trop peu de ventes comparables autour de ce bien (' + (marche.comparables || ventes.length) + ' seulement) pour en tirer une fourchette par le calcul. Elles sont listées ci-dessous à titre d\'information ; la valeur donnée page suivante repose sur la visite et sur ma connaissance du secteur.'
          : 'Aucune vente comparable exploitable n\'a été trouvée autour de ce bien dans la base DVF : pas de fourchette par le calcul. La valeur donnée page suivante repose sur la visite et sur ma connaissance du secteur.';
        var hm = hauteur(msg, { largeur: LARGEUR - 32 }) + 28;
        boite(MG, y - hm, LARGEUR, hm, 'alerteFond');
        var ym = y; y -= 14;
        paragraphe(msg, { x: MG + 16, largeur: LARGEUR - 32, couleur: 'alerte', coule: false });
        y = ym - hm - 24;
      }
      if (ventes.length) {
        var cols = [['Date', 58, false], ['Adresse', 178, false], ['Surface', 56, true], ['Pièces', 44, true], ['Prix de vente', 80, true], ['Prix au m²', 67, true]];
        var xs = [], cx = MG; cols.forEach(function (k) { xs.push(cx); cx += k[1]; });
        var cellule = function (i, s, yy, o) { o = o || {}; if (cols[i][2]) { o.droite = true; ligne(s, xs[i] + cols[i][1], yy, o); } else ligne(s, xs[i] + (i === 0 ? 0 : 6), yy, o); };
        cols.forEach(function (k, i) { cellule(i, k[0].toUpperCase(), y - 10, { police: 'gras', taille: 7.2, inter: cols[i][2] ? 0 : 1, couleur: 'gris' }); });
        y -= 18; filet(y, null, null, 'encre', 0.8);
        // votre bien, en première ligne, pour comparer d'un coup d'œil
        boite(MG - 8, y - 27, LARGEUR + 16, 27, 'pierre');
        cellule(0, 'Votre bien', y - 17, { police: 'gras', taille: 9.5 });
        cellule(1, propre((bien.adresse || '').replace(/^\d+\s*(bis|ter|quater)?\s*/i, '').replace(/\s+\d{5}\s+/, ', '), 'gras').slice(0, 34), y - 17, { police: 'gras', taille: 9.5 });
        cellule(2, bien.surface ? bien.surface + '\u00A0m²' : '', y - 17, { police: 'gras', taille: 9.5 });
        cellule(3, bien.pieces ? String(bien.pieces) : '', y - 17, { police: 'gras', taille: 9.5 });
        y -= 27;
        ventes.forEach(function (v) {
          var adr = [v.voie, v.commune].filter(Boolean).join(', ');
          if (largeur(propre(adr, 'texte'), 'texte', 9.5) > cols[1][1] - 10) adr = v.voie && largeur(propre(v.voie, 'texte'), 'texte', 9.5) <= cols[1][1] - 10 ? v.voie : propre(adr, 'texte').slice(0, 32) + '...';
          cellule(0, moisCourt(v.mois), y - 17, { taille: 9.5, couleur: 'encre2' });
          cellule(1, adr || '—', y - 17, { taille: 9.5 });
          cellule(2, v.surface ? v.surface + '\u00A0m²' : '', y - 17, { taille: 9.5 });
          cellule(3, v.pieces ? String(v.pieces) : '—', y - 17, { taille: 9.5 });
          cellule(4, v.prix ? euros(v.prix) : '—', y - 17, { police: 'gras', taille: 9.5 });
          cellule(5, v.prix_m2 ? euros(v.prix_m2) : '—', y - 17, { taille: 9.5 });
          y -= 26; filet(y);
        });
        y -= 18;
        paragraphe('Ventes signées devant notaire et publiées par la DGFiP (base DVF, Licence Ouverte 2.0)' + (marche.donnees_du ? ', à jour de ' + moisAnnee(marche.donnees_du) : '') + '. ' + (marche.comparables > ventes.length ? (ventes.length > 1 ? 'Ces ' + ventes.length + ' ventes sont choisies' : 'Cette vente est choisie') + ' parmi les plus proches de votre bien (distance, surface, date), sur les ' + marche.comparables + ' ventes comparables étudiées. ' : '') + 'Les numéros de rue ne sont pas indiqués.', { taille: 8.5, couleur: 'gris', interligne: 12.5 });
      }

      /* ======================= 5. La valeur ======================= */
      nouvellePage(); entete();
      surtitre('La valeur', MG, y); y -= 14;
      titre('Ce que vaut', 'votre bien.');
      var hb = 168;
      boite(MG, y - hb, LARGEUR, hb, 'nuit');
      surtitre('Fourchette de valeur', MG + 26, y - 34, 'nuitAccent');
      var bas = euros(c.prix_bas), haut = euros(c.prix_haut), tp = 36;
      if (largeur(bas + '  –  ' + haut, 'titre', tp) > LARGEUR - 52) tp = 30;
      var wx = MG + 26;
      wx += ligne(bas, wx, y - 82, { police: 'titre', taille: tp, couleur: 'ivoire' });
      wx += ligne('  –  ', wx, y - 82, { police: 'italique', taille: tp, couleur: 'nuitAccent' });
      ligne(haut, wx, y - 82, { police: 'titre', taille: tp, couleur: 'ivoire' });
      if (bien.surface && c.prix_bas && c.prix_haut) ligne('Soit ' + nombre(c.prix_bas / bien.surface) + ' à ' + nombre(c.prix_haut / bien.surface) + '\u00A0€ le m², pour ' + bien.surface + '\u00A0m².', MG + 26, y - 108, { taille: 10.5, couleur: 'pierre2' });
      filet(y - 124, MG + 26, MG + LARGEUR - 26, 'nuitFilet');
      ligne('Valeur au ' + jour + ', pour une vente dans des conditions normales de marché.', MG + 26, y - 144, { taille: 9, couleur: 'nuitGris' });
      y -= hb + 16;
      if (!D.assez_de_ventes) paragraphe('Cette fourchette ne vient pas d\'un calcul automatique : il y a eu trop peu de ventes comparables autour de ce bien. Elle repose sur la visite et sur ma connaissance du secteur.', { taille: 9.5, couleur: 'alerte', interligne: 14 });
      y -= 26;
      var atouts = c.atouts || [], vigi = c.vigilance || [];
      if (atouts.length || vigi.length) {
        var wc = (LARGEUR - 28) / 2, yTop = y, yFin = y;
        [['Les atouts', atouts, MG], ['Les points de vigilance', vigi, MG + wc + 28]].forEach(function (k) {
          y = yTop;
          surtitre(k[0], k[2], y); y -= 10; filet(y, k[2], k[2] + wc, 'encre', 0.8); y -= 14;
          if (k[1].length) puces(k[1], k[2], wc); else paragraphe('Rien à signaler.', { x: k[2], largeur: wc, couleur: 'gris', coule: false });
          yFin = Math.min(yFin, y);
        });
        y = yFin;
      }

      /* ======================= 6. La stratégie ======================= */
      nouvellePage(); entete();
      surtitre('La stratégie de vente', MG, y); y -= 14;
      titre('Vendre au bon prix,', 'en trois points.');
      (c.strategie || []).slice(0, 3).forEach(function (s, i) {
        var h = hauteur(s.texte || '', { largeur: LARGEUR - 96, interligne: 16.5 }) + 46;
        place(h + 20);
        filet(y, null, null, 'encre', 0.8);
        ligne('0' + (i + 1), MG, y - 46, { police: 'titre', taille: 40, couleur: 'accent' });
        ligne(s.titre || '', MG + 96, y - 30, { police: 'titre', taille: 17 });
        var y0 = y; y -= 44;
        paragraphe(s.texte || '', { x: MG + 96, couleur: 'encre2', interligne: 16.5, coule: false });
        y = Math.min(y, y0 - h) - 26;
      });

      /* ======================= 7. La suite et les coordonnées ======================= */
      nouvellePage(); entete();
      surtitre('La suite', MG, y); y -= 14;
      titre('Un seul interlocuteur,', 'jusqu\'à la signature.');
      paragraphe('Si vous décidez de vendre, voici comment les choses se passent. Vous suivez chaque étape dans votre espace en ligne, sans avoir à demander où en est votre dossier.', { couleur: 'encre2' });
      y -= 14;
      [['Le mandat', 'Nous fixons ensemble le prix d\'affichage et les conditions.'], ['Le film, les photos, l\'annonce', 'Tournage, photos, rédaction de l\'annonce, mise en ligne.'], ['Les visites', 'Après chaque visite, un compte rendu le soir même dans votre espace.'], ['L\'offre', 'Je vous présente chaque offre et son financement. Vous décidez.'], ['Le compromis, puis l\'acte', 'Je suis le dossier chez le notaire jusqu\'à la signature.']].forEach(function (e, i) {
        page.drawCircle({ x: MG + 9, y: y - 9, size: 9, color: rgb('encre') });
        ligne(String(i + 1), MG + 9 - largeur(String(i + 1), 'gras', 9.5) / 2, y - 12.3, { police: 'gras', taille: 9.5, couleur: 'ivoire' });
        ligne(e[0], MG + 32, y - 12, { police: 'gras', taille: 11 });
        ligne(e[1], MG + 32, y - 27, { taille: 10, couleur: 'encre2' });
        y -= 44;
      });
      y -= 10;
      var hc = 150;
      boite(MG, y - hc, LARGEUR, hc, 'blanc', 'filet');
      surtitre('Votre interlocuteur', MG + 22, y - 28);
      ligne(cons.nom || 'Shawez Ali', MG + 22, y - 56, { police: 'titre', taille: 22 });
      ligne((cons.role || 'Agent immobilier') + ' — ' + (cons.agence || 'GRAVELIN IMMO'), MG + 22, y - 74, { taille: 10, couleur: 'gris' });
      ligne(cons.tel || '', MG + 22, y - 102, { police: 'gras', taille: 12 });
      ligne(cons.email || '', MG + 22, y - 118, { taille: 10, couleur: 'encre2' });
      ligne('Votre espace : ' + (cons.site || 'shawez-immo.com') + '/mon-espace/', MG + 22, y - 133, { taille: 10, couleur: 'encre2' });
      image(IMG.gravelin, MG + LARGEUR - 22 - 130, y - 62, 130);
      ligne(cons.adresse || '', MG + LARGEUR - 22, y - 84, { taille: 9.5, couleur: 'gris', droite: true });
      y -= hc + 22;
      paragraphe('Cet avis de valeur est une estimation indicative établie à la date du ' + jour + ' à partir des informations communiquées, de la visite et des ventes publiées. Il ne constitue pas une expertise immobilière et n\'engage pas sur un prix de vente. ' +
        'Shawez Ali, agent commercial en immobilier immatriculé au RSAC de Dijon sous le n° 843 345 380, agit pour le compte de GRAVELIN IMMO, SAS au capital de 800 €, RCS Dijon 822 940 789, 30 rue Bannelier, 21000 Dijon, titulaire de la carte professionnelle « Transaction sur immeubles et fonds de commerce » n° CPI 2102 2016 000 014 831 délivrée par la CCI de Côte-d\'Or.', { taille: 7.8, couleur: 'gris', interligne: 11.4 });

      /* ---------- pieds de page (pages intérieures) ---------- */
      var total = pages.length;
      pages.forEach(function (p, i) {
        if (p.nuit) return;
        page = p.page;
        filet(46);
        ligne((cons.nom || 'Shawez Ali') + ' · ' + (cons.agence || 'GRAVELIN IMMO') + ' · ' + (cons.tel || ''), MG, 30, { taille: 8, couleur: 'gris' });
        ligne((d.reference ? 'Réf. ' + d.reference + ' · ' : '') + (i + 1) + ' / ' + total, MG + LARGEUR, 30, { taille: 8, couleur: 'gris', droite: true });
      });

      doc.setTitle('Avis de valeur — ' + (bien.adresse || d.reference || ''));
      doc.setAuthor((cons.nom || 'Shawez Ali') + ' — ' + (cons.agence || 'GRAVELIN IMMO'));
      doc.setSubject('Avis de valeur');
      doc.setLanguage('fr-FR');
      doc.setCreator((cons.site || 'shawez-immo.com'));
      doc.setProducer('pdf-lib');
      doc.setCreationDate(new Date());
      return doc.save();
    });
  }

  window.EEAvis = { generer: generer, version: '1' };
})();
