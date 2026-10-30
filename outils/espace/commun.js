/* Espace estimation : outils communs (estimer, mon-espace, admin).
   Le même module sert les deux sites ; ce qui change d'un site à l'autre est dans EE_CONF (défini avant ce script
   par la page, sinon valeurs de shawez-immo.com) et dans la feuille de thème. */
var EE=(function(){
  'use strict';
  var CONF={site:'',api:'/api/espace',estimer:'/estimer/',espace:'/mon-espace/',admin:'/admin/',promesses:'/admin/promesses/',
    tel:'+33767579228',telAffiche:'07 67 57 92 28',conseiller:'Shawez',email:'shawez@gravelin-immo.com',
    confidentialite:'/politique-de-confidentialite/#espace-estimation',portrait:''};
  var ext=window.EE_CONF||{}; Object.keys(ext).forEach(function(k){CONF[k]=ext[k];});

  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function euros(n){return n==null?'':Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g,' ')+' €';}
  function date(s){try{return new Date(s).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}catch(e){return s;}}
  function jour(s){ if(!s)return ''; var p=String(s).slice(0,10).split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s; }
  function mois(s){ if(!s)return ''; try{return new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});}catch(e){return s;} }
  function taille(o){ return o>=1048576?(o/1048576).toLocaleString('fr-FR',{maximumFractionDigits:1})+' Mo':Math.max(1,Math.round(o/1024))+' Ko'; }
  function rayon(r){ return r>=1000?(r/1000).toLocaleString('fr-FR')+' km':r+' m'; }

  /* Appel de l'API. Délai de garde : sur un réseau lent, on rend la main avec un message clair plutôt que d'attendre sans fin. */
  function api(chemin,opts){
    opts=opts||{};
    var init={method:opts.method||'GET',credentials:'same-origin',headers:{}};
    if(opts.fichier){init.method='POST';init.body=opts.fichier;init.headers['Content-Type']=opts.fichier.type||'application/octet-stream';init.headers['X-Fichier-Nom']=encodeURIComponent(opts.nom||opts.fichier.name||'fichier');}
    else if(opts.body!==undefined){init.method=opts.method||'POST';init.headers['Content-Type']='application/json';init.body=JSON.stringify(opts.body);}
    var ctrl=window.AbortController?new AbortController():null, t=null;
    if(ctrl){init.signal=ctrl.signal;t=setTimeout(function(){ctrl.abort();},opts.delai||30000);}
    return fetch(CONF.api+chemin,init).then(function(r){
      clearTimeout(t);
      return r.json().catch(function(){return {};}).then(function(d){
        d=d||{};d._status=r.status;if(r.status>=500&&!d.error)d.error='serveur';
        // session expirée pendant qu'on travaillait : la page le dit une fois et propose de se reconnecter
        if(r.status===401&&d.error==='connexion'&&chemin!=='/moi'){ try{window.dispatchEvent(new CustomEvent('ee:session',{detail:{chemin:chemin}}));}catch(e){} }
        return d;
      });
    },function(){clearTimeout(t);return {_status:0,error:'reseau'};});
  }
  /* Action irréversible : le premier clic arme le bouton (« Confirmer : … »), le second agit. Sans second clic dans les
     8 secondes, le bouton reprend son texte : un clic oublié ne supprime jamais rien plus tard. Rend true au second clic. */
  function confirmer(b,txt,ms){
    if(b.getAttribute('data-ok')==='1'){ clearTimeout(b._eeT); b.removeAttribute('data-ok'); if(b._eeTxt!=null)b.textContent=b._eeTxt; return true; }
    b._eeTxt=b.textContent; b.setAttribute('data-ok','1'); b.textContent=txt;
    clearTimeout(b._eeT); b._eeT=setTimeout(function(){ b.removeAttribute('data-ok'); b.textContent=b._eeTxt; },ms||8000);
    return false;
  }
  /* Bouton occupé pendant une requête : désactivé, annoncé (aria-busy), texte d'attente le cas échéant. */
  function occupe(b,on,txt){
    if(!b)return;
    if(on){ b.disabled=true; b.setAttribute('aria-busy','true'); if(txt){ b._eeAvant=b.innerHTML; b.textContent=txt; } }
    else { b.disabled=false; b.removeAttribute('aria-busy'); if(b._eeAvant!=null){ b.innerHTML=b._eeAvant; b._eeAvant=null; } }
  }
  function retarder(fn,ms){ var t=null; return function(){ var a=arguments, s=this; clearTimeout(t); t=setTimeout(function(){fn.apply(s,a);},ms||150); }; }
  /* Téléchargement d'un fichier de l'API (export) : la session expirée se dit clairement au lieu d'un fichier d'erreur. */
  function telecharger(chemin,nom){
    return fetch(CONF.api+chemin,{credentials:'same-origin'}).then(function(r){
      if(!r.ok)return r.json().catch(function(){return {};}).then(function(d){ d._status=r.status; if(r.status===401)try{window.dispatchEvent(new CustomEvent('ee:session',{detail:{chemin:chemin}}));}catch(e){} return d; });
      return r.blob().then(function(b){ var u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=nom; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(u);a.remove();},1500); return {_status:200}; });
    },function(){ return {_status:0,error:'reseau'}; });
  }
  var MSG={
    reseau:"La connexion a échoué ou a mis trop de temps. Vérifiez votre réseau et réessayez : rien n'est perdu.",
    trop_de_demandes:"Trop d'essais d'affilée. Réessayez dans quelques minutes.",
    identifiants:"E-mail ou mot de passe incorrect.",
    sans_mot_de_passe:"Cet espace existe, mais sans mot de passe : il a été créé pendant votre estimation.",
    serveur:"Un souci technique de notre côté. Réessayez, ou appelez "+CONF.conseiller+" au "+CONF.telAffiche+".",
    base_absente:"L'espace n'est pas encore ouvert. Appelez "+CONF.conseiller+" au "+CONF.telAffiche+".",
    compte_existe:"Un espace existe déjà avec cet e-mail.",
    champs:"Un champ est incomplet ou mal rempli.",
    jeton:"Ce lien n'est plus valable (il ne sert qu'une fois). Demandez-en un nouveau.",
    origine:"Requête refusée.",
    connexion:"Votre session a expiré : reconnectez-vous.",
    interdit:"Ce compte n'a pas accès à cette page.",
    introuvable:"Introuvable.",
    taille:"Ce fichier dépasse 10 Mo.",
    type_fichier:"Format non accepté. Envoyez une photo (JPEG, PNG, WebP, HEIC) ou un PDF.",
    pdf_attendu:"L'avis de valeur doit être un fichier PDF.",
    trop_de_fichiers:"Il y a déjà 30 fichiers sur cette estimation.",
    stockage_plein:"L'espace de stockage est plein : envoyez ce fichier par e-mail à "+CONF.email+".",
    visite_fixee:"Une visite est déjà fixée pour ce bien.",
    visite_close:"Ce dossier a avancé : la visite se fixe par téléphone.",
    avis_absent:"Créez d'abord le PDF de l'avis de valeur.",
    admin_non_verifie:"Votre adresse doit d'abord être confirmée par le lien reçu par e-mail.",
    compte_agence:"C'est un compte de l'agence : il ne se modifie pas d'ici.",
    soi_meme:"Vous ne pouvez pas supprimer votre propre compte d'ici.",
    format:"Requête refusée.",json:"Requête refusée.",
    espace_existe:"Ce dossier a déjà un espace : rechargez la page.",
    creneau_pris:"Ce créneau vient d'être pris : choisissez-en un autre."
  };
  function message(d){return MSG[d&&d.error]||MSG.serveur;}
  var CHAMPS={email:"L'adresse e-mail n'est pas valide.",telephone:"Le numéro de téléphone n'est pas valide.",prenom:"Indiquez votre prénom.",nom:"Indiquez votre nom.",mot_de_passe:"Le mot de passe doit compter 8 caractères au moins.",consentement:"Cochez la case pour continuer.",adresse:"L'adresse du bien est incomplète.",surface:"La surface n'est pas valide.",confirmation:"Écrivez SUPPRIMER pour confirmer.",creneaux:"Ce créneau n'est plus proposé : choisissez-en un autre.",debut:"La date de la visite n'est pas valide.",prix_bas:"Indiquez la fourchette de prix (basse et haute).",prix_haut:"La valeur haute doit dépasser la valeur basse.",agenda_ics:"Collez l'« Adresse secrète au format iCal » de Google Agenda (https://calendar.google.com/calendar/ical/…/basic.ics).",rdv_url:"Collez le lien de votre page de réservation Google Agenda (https://calendar.app.google/…).",atouts:"8 lignes au plus, 240 caractères par ligne.",vigilance:"8 lignes au plus, 240 caractères par ligne.",visite_le:"Indiquez la date de la visite (aujourd'hui au plus tard).",texte:"Écrivez ou dictez le compte rendu (3 000 caractères au plus).",montant:"Indiquez le montant de l'offre, en euros.",recue_le:"La date de l'offre n'est pas valide.",conditions:"Les conditions sont trop longues (1 500 caractères au plus).",etapes:"Une date d'étape n'est pas valide.",nom_notaire:"Le nom du notaire est trop long.",coordonnees:"Les coordonnées sont trop longues (300 caractères au plus)."};
  function messageChamp(d){return (d&&d.error==='champs'&&CHAMPS[d.champ])||message(d);}

  function wa(txt){return 'https://wa.me/'+CONF.tel.replace(/\D/g,'')+'?text='+encodeURIComponent(txt);}

  /* Bloc résultat (fond sombre) : la fourchette, puis d'où elle vient. */
  function resultat(res,ref,adresse){
    var h='';
    if(res&&res.fourchette){
      h+='<p class="label">Votre fourchette de prix · indicative</p>'+
        '<p class="ee-price" data-test="fourchette"><span>'+euros(res.bas)+'</span><em>–</em><span>'+euros(res.haut)+'</span></p>'+
        '<p class="ee-m2">Soit environ <b>'+euros(res.prix_m2)+'/m²</b>'+(adresse?' · '+esc(adresse):'')+'</p>'+
        '<p class="ee-warn"><span><b>Indicatif, à confirmer par une visite.</b> Le calcul en ligne ne voit ni la lumière, ni la vue, ni les finitions. Une visite chez vous les voit : c\'est elle qui donne votre prix précis, offerte et sans engagement.</span></p>'+
        '<ul class="ee-facts">'+
          '<li><span>Ventes comparables utilisées</span><span data-test="ventes">'+res.comparables+' ventes réelles</span></li>'+
          '<li><span>Rayon</span><span data-test="rayon">à moins de '+rayon(res.rayon)+'</span></li>'+
          '<li><span>Prix médian de ces ventes</span><span>'+euros(res.m2_quartier)+'/m²</span></li>'+
          ((res.ajustements||[]).length?'<li><span>Ajustements pour votre bien</span><span>'+res.ajustements.map(function(a){return esc(a.libelle)+' '+(a.pct>0?'+':'')+a.pct+' %';}).join('<br>')+'</span></li>':'')+
          '<li><span>Date des données</span><span data-test="donnees">Ventes DVF'+(res.annees?' '+res.annees[0]+'–'+res.annees[res.annees.length-1]:'')+(res.donnees_du?', à jour de '+mois(res.donnees_du):'')+'</span></li>'+
        '</ul>';
    } else {
      var r=res&&res.raison;
      h+='<p class="label">Votre demande est enregistrée</p>'+
        '<p class="ee-price ee-price-txt" data-test="rappel">Je vous rappelle <em>au plus vite.</em></p>'+
        '<p class="ee-m2">'+(r==='peu_de_ventes'?"Il y a eu trop peu de ventes comparables près de chez vous"+(res.comparables!=null?' ('+res.comparables+' seulement)':'')+" pour donner une fourchette fiable. Pas de prix au hasard : "+CONF.conseiller+" étudie votre bien lui-même.":r==='type'?"Pour ce type de bien, l'estimation se fait sur pièces : "+CONF.conseiller+" étudie votre bien lui-même.":r==='sans_dvf'?"Dans votre secteur, l'État ne publie pas les prix des ventes (Alsace, Moselle, Mayotte) : pas de prix au hasard, "+CONF.conseiller+" étudie votre bien lui-même.":CONF.conseiller+" étudie votre bien lui-même et vous donne une première fourchette au téléphone.")+'</p>'+
        (res&&res.donnees_du?'<p class="ee-warn"><span>Données des ventes réelles (DVF) à jour de '+mois(res.donnees_du)+'.</span></p>':'');
    }
    if(ref)h+='<ul class="ee-facts ee-ref"><li><span>Référence</span><span data-test="reference">'+esc(ref)+'</span></li></ul>';
    /* « Prendre rendez-vous » : appel sur téléphone ; sur ordinateur (un lien tel: n'y fait rien), WhatsApp avec le message prêt. */
    var ordi=!!(window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var rdv=ordi?wa('Bonjour '+CONF.conseiller+', je viens de faire une estimation'+(ref?' (réf. '+ref+')':'')+', je voudrais un rendez-vous pour une estimation sur place.'):'tel:'+CONF.tel;
    h+='<div class="btn-row">'+
      '<a class="btn btn-primary btn-lg" data-test="rdv" href="'+rdv+'"'+(ordi?' target="_blank" rel="noopener"':'')+'>Obtenir mon prix précis sur place <span class="arw">→</span></a>'+
      '<a class="btn btn-ghost" href="'+wa('Bonjour '+CONF.conseiller+', je viens de faire mon estimation en ligne'+(ref?' (réf. '+ref+')':'')+'. ')+'" target="_blank" rel="noopener">Écrire sur WhatsApp</a>'+
    '</div>';
    return h;
  }
  function voirMdp(root){
    $$('[data-voir]',root).forEach(function(b){b.addEventListener('click',function(){var i=document.getElementById(b.getAttribute('data-voir'));var v=i.type==='password';i.type=v?'text':'password';b.textContent=v?'Masquer':'Afficher';b.setAttribute('aria-pressed',String(v));});});
  }
  /* champ en erreur : classe + aria-invalid, pour l'œil et pour les lecteurs d'écran */
  function err(el,on){
    var f=el.closest('.field'); if(f)f.classList.toggle('err',!!on);
    if(el.setAttribute){ if(on)el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); }
    return !on;
  }
  function emailOk(v){return /^[^\s@"<>(),;:]+@[^\s@"<>(),;:]+\.[a-z]{2,}$/i.test(String(v||'').trim());}
  function telOk(v){v=String(v||'').trim();var n=v.replace(/\D/g,'').length;return /^[+\d][\d\s.\-()]{7,}$/.test(v)&&n>=9&&n<=15;}

  /* Témoin « connecté » (cookie se_ok, sans valeur secrète) : le pictogramme de l'en-tête le lit sur toutes les pages. */
  function connecte(){return /(?:^|;\s*)se_ok=1/.test(document.cookie||'');}
  function pictogramme(){ try{ if(window.EECompte)window.EECompte(); }catch(e){} }

  /* Portrait du conseiller : affiché seulement si le site en fournit un. */
  function portraits(root){ $$('img[data-ee-portrait]',root).forEach(function(i){ if(CONF.portrait){i.src=CONF.portrait;i.hidden=false;} else i.hidden=true; }); }

  /* Mémoire du parcours dans l'onglet (sessionStorage) : jamais bloquant si le navigateur la refuse. */
  var mem={
    lire:function(k){try{var v=window.sessionStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}},
    ecrire:function(k,v){try{window.sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}},
    effacer:function(k){try{window.sessionStorage.removeItem(k);}catch(e){}}
  };
  function uuid(){ try{ if(window.crypto&&crypto.randomUUID)return crypto.randomUUID(); }catch(e){} return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,12); }

  /* ---------- Dates à l'heure de Paris (le vendeur peut être ailleurs : la visite, elle, est à Dijon) ---------- */
  function fr(iso,o){ o=o||{}; o.timeZone='Europe/Paris'; try{return new Date(iso).toLocaleDateString('fr-FR',o);}catch(e){return String(iso);} }
  function heure(iso){ try{ var p=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)),h='',m=''; p.forEach(function(x){if(x.type==='hour')h=String(+x.value);if(x.type==='minute')m=x.value;}); return h+' h'+(m!=='00'?' '+m:''); }catch(e){return '';} }
  function jourLong(j){ if(!j)return ''; try{return new Date(String(j).slice(0,10)+'T12:00:00Z').toLocaleDateString('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});}catch(e){return String(j);} }
  function quand(iso){ return fr(iso,{weekday:'long',day:'numeric',month:'long'})+' à '+heure(iso); }
  function quandCourt(iso){ return fr(iso,{weekday:'short',day:'numeric',month:'short'}).replace(/\./g,'')+' '+heure(iso); }

  /* ---------- Visite d'estimation : le vendeur propose jusqu'à trois créneaux, l'agence confirme ----------
     racine : l'élément où dessiner ; o : { demande, visite, possible, rdvUrl, onChange(reponse) }.
     Le même bloc sert après le résultat (/estimer/) et dans chaque dossier de /mon-espace/. */
  function visite(racine,o){
    var choisis=[], jours=null, jourOuvert=0, ouvert=false, v=o.visite||null;
    function fixee(){ return v&&v.etat==='fixee'&&v.debut; }
    function passee(){ return fixee()&&new Date(v.debut).getTime()<Date.now(); }
    function dessiner(){
      var h='<h3 class="ee-rdv-t">Votre prix précis, chez vous</h3>';
      if(fixee()){
        h+='<p class="ee-rdv-ok" data-test="visite-fixee"><b>'+esc(quand(v.debut).replace(/^./,function(c){return c.toUpperCase();}))+'</b><span>'+(passee()?'Visite faite. ':'')+esc(CONF.conseiller)+' vient voir votre bien : comptez '+(v.duree||45)+' minutes. Offert et sans engagement.</span></p>';
        if(!passee()){
          h+='<p class="ee-rdv-prep">Pour gagner du temps, si vous les avez sous la main : le titre de propriété, la dernière taxe foncière, les diagnostics, le montant des charges et la liste des travaux réalisés.</p>';
          if(o.possible&&!ouvert)h+='<div class="ee-links"><button type="button" data-rdv-ouvrir>Demander un autre créneau</button><a href="tel:'+CONF.tel+'">Appeler '+esc(CONF.conseiller)+'</a></div>';
        }
      } else if(v&&v.etat==='demandee'&&!ouvert){
        h+='<p class="ee-rdv-ok" data-test="visite-demandee"><b>Créneaux envoyés à '+esc(CONF.conseiller)+'</b><span>'+(v.creneaux||[]).map(function(c){return esc(quand(c));}).join('<br>')+'</span></p>'+
          '<p class="ee-rdv-prep">'+esc(CONF.conseiller)+' confirme l\'un d\'eux au plus vite. Vous recevez la confirmation ici'+(o.email?' et par e-mail':'')+'.</p>'+
          (o.possible?'<div class="ee-links"><button type="button" data-rdv-ouvrir>Changer mes créneaux</button></div>':'');
      } else if(!o.possible){
        racine.hidden=true; racine.innerHTML=''; return;
      } else if(o.rdvUrl&&!ouvert){
        h+='<p class="ee-rdv-prep">'+esc(CONF.conseiller)+' vient chez vous pour votre prix précis : 45 minutes, offert et sans engagement. Choisissez votre créneau dans son agenda, en 2 clics.</p>'+
          '<div class="ee-rdv-go"><a class="btn btn-primary" href="'+esc(o.rdvUrl)+'" target="_blank" rel="noopener" data-rdv-agenda>Choisir mon créneau <span class="arw">→</span></a></div>';
      } else if(!ouvert){
        h+='<p class="ee-rdv-prep">'+esc(CONF.conseiller)+' vient chez vous pour votre prix précis, sous 48 h si vous le souhaitez : 45 minutes, offert et sans engagement. Vous restez libre ensuite.</p>'+
          '<div class="ee-rdv-go"><button type="button" class="btn btn-primary" data-rdv-ouvrir>Choisir mon créneau <span class="arw">→</span></button></div>';
      }
      if(ouvert)h+=selecteur();
      racine.hidden=false; racine.innerHTML=h;
    }
    function selecteur(){
      if(!jours)return '<div class="ee-load" style="height:120px;" role="status" aria-label="Chargement des créneaux"></div>';
      if(!jours.length)return '<p class="ee-err">Aucun créneau en ligne pour le moment : appelez '+esc(CONF.conseiller)+' au <a href="tel:'+CONF.tel+'">'+CONF.telAffiche+'</a>, il trouve une date avec vous.</p>';
      var j=jours[jourOuvert]||jours[0];
      return '<p class="ee-rdv-prep" id="'+idAide+'">Choisissez jusqu\'à 3 créneaux qui vous arrangent : '+esc(CONF.conseiller)+' confirme l\'un d\'eux au plus vite.</p>'+
        '<div class="ee-days" role="group" aria-label="Jour">'+jours.map(function(x,k){
          var n=choisis.filter(function(c){return x.heures.some(function(hh){return hh.debut===c;});}).length;
          return '<button type="button" class="pill" data-rdv-jour="'+k+'" aria-pressed="'+(k===jourOuvert)+'"><b>'+esc(x.court)+'</b>'+(x.sous48h?'<small>sous 48 h</small>':'')+(n?'<i aria-label="'+n+' choisi'+(n>1?'s':'')+'">'+n+'</i>':'')+'</button>';
        }).join('')+'</div>'+
        '<div class="ee-hours" role="group" aria-label="Heure, '+esc(j.libelle)+'">'+j.heures.map(function(x){
          var on=choisis.indexOf(x.debut)>=0;
          return '<button type="button" class="ee-hour" data-rdv-h="'+esc(x.debut)+'" aria-pressed="'+on+'"'+(!on&&choisis.length>=3?' disabled':'')+'>'+esc(x.h)+'</button>';
        }).join('')+'</div>'+
        '<ul class="ee-sel" aria-label="Créneaux choisis">'+choisis.slice().sort().map(function(c){return '<li><span>'+esc(quand(c))+'</span><button type="button" data-rdv-retirer="'+esc(c)+'" aria-label="Retirer '+esc(quand(c))+'">Retirer</button></li>';}).join('')+'</ul>'+
        '<p class="ee-err" role="alert" hidden></p>'+
        '<div class="ee-nav"><button type="button" class="btn" data-rdv-fermer>Annuler</button><button type="button" class="btn btn-primary" data-rdv-envoyer'+(choisis.length?'':' disabled')+'>'+(choisis.length>1?'Envoyer mes '+choisis.length+' créneaux':choisis.length?'Envoyer ce créneau':'Choisissez un créneau')+' <span class="arw">→</span></button></div>';
    }
    var idAide='ee-rdv-aide-'+String(o.demande);
    function ouvrir(){
      ouvert=true; choisis=[]; dessiner();
      if(jours)return;
      api('/creneaux').then(function(d){ jours=(d&&d.jours)||[]; if(d&&d.rdv_url&&!o.rdvUrl)o.rdvUrl=d.rdv_url; dessiner(); });
    }
    racine.addEventListener('click',function(e){
      var t=e.target.closest('button,a'); if(!t||!racine.contains(t))return;
      if(t.hasAttribute('data-rdv-agenda')){ api('/visite',{body:{demande:o.demande,agenda:true}}); return; }
      if(t.hasAttribute('data-rdv-ouvrir')){ ouvrir(); return; }
      if(t.hasAttribute('data-rdv-fermer')){ ouvert=false; dessiner(); return; }
      if(t.hasAttribute('data-rdv-jour')){ jourOuvert=+t.getAttribute('data-rdv-jour'); dessiner(); var b=racine.querySelector('[data-rdv-jour="'+jourOuvert+'"]'); if(b)b.focus({preventScroll:true}); return; }
      if(t.hasAttribute('data-rdv-h')){ var c=t.getAttribute('data-rdv-h'), i=choisis.indexOf(c); if(i>=0)choisis.splice(i,1); else if(choisis.length<3)choisis.push(c); dessiner(); var b2=racine.querySelector('[data-rdv-h="'+c+'"]'); if(b2)b2.focus({preventScroll:true}); return; }
      if(t.hasAttribute('data-rdv-retirer')){ var r=choisis.indexOf(t.getAttribute('data-rdv-retirer')); if(r>=0)choisis.splice(r,1); dessiner(); return; }
      if(t.hasAttribute('data-rdv-envoyer')){
        if(!choisis.length)return;
        t.disabled=true;
        api('/visite',{body:{demande:o.demande,creneaux:choisis,deplacer:!!fixee()}}).then(function(d){
          if(d._status===201){ v=d.visite; ouvert=false; dessiner(); if(o.onChange)o.onChange(d); racine.scrollIntoView({block:'nearest',behavior:'smooth'}); return; }
          t.disabled=false;
          var m=racine.querySelector('.ee-err');
          if(d.error==='champs'&&d.champ==='creneaux'){ jours=null; choisis=[]; ouvrir(); m=null; }
          if(m){ m.textContent=d.error==='connexion'?'Votre session a expiré : ouvrez votre espace pour choisir votre créneau.':d.error==='visite_close'?'Ce dossier a avancé : appelez '+CONF.conseiller+' au '+CONF.telAffiche+' pour convenir d\'une date.':message(d); m.hidden=false; }
        });
      }
    });
    dessiner();
    return {ouvrir:ouvrir};
  }

  /* Charge un script du site une seule fois (le fabricant de PDF de l'avis de valeur, par exemple). */
  var scripts={};
  function script(src){
    if(!scripts[src])scripts[src]=new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=function(){ok();};s.onerror=function(){delete scripts[src];ko(new Error('script'));};document.head.appendChild(s);});
    return scripts[src];
  }

  return {MSG:MSG,confirmer:confirmer,occupe:occupe,retarder:retarder,telecharger:telecharger,jourLong:jourLong,quand:quand,quandCourt:quandCourt,heure:heure,visite:visite,script:script,CONF:CONF,$:$,$$:$$,esc:esc,euros:euros,date:date,jour:jour,mois:mois,taille:taille,rayon:rayon,api:api,message:message,messageChamp:messageChamp,resultat:resultat,voirMdp:voirMdp,err:err,emailOk:emailOk,telOk:telOk,connecte:connecte,pictogramme:pictogramme,portraits:portraits,mem:mem,uuid:uuid,TEL:CONF.tel,wa:wa};
})();
