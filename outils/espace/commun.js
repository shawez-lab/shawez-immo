/* Espace estimation : outils communs (estimer, mon-espace, admin).
   Le même module sert les deux sites ; ce qui change d'un site à l'autre est dans EE_CONF (défini avant ce script
   par la page, sinon valeurs de shawez-immo.com) et dans la feuille de thème. */
var EE=(function(){
  'use strict';
  var CONF={site:'',api:'/api/espace',estimer:'/estimer/',espace:'/mon-espace/',admin:'/admin/',
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
      return r.json().catch(function(){return {};}).then(function(d){d=d||{};d._status=r.status;if(r.status>=500&&!d.error)d.error='serveur';return d;});
    },function(){clearTimeout(t);return {_status:0,error:'reseau'};});
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
    stockage_plein:"L'espace de stockage est plein : envoyez ce fichier par e-mail à "+CONF.email+"."
  };
  function message(d){return MSG[d&&d.error]||MSG.serveur;}
  var CHAMPS={email:"L'adresse e-mail n'est pas valide.",telephone:"Le numéro de téléphone n'est pas valide.",prenom:"Indiquez votre prénom.",nom:"Indiquez votre nom.",mot_de_passe:"Le mot de passe doit compter 8 caractères au moins.",consentement:"Cochez la case pour continuer.",adresse:"L'adresse du bien est incomplète.",surface:"La surface n'est pas valide.",confirmation:"Écrivez SUPPRIMER pour confirmer."};
  function messageChamp(d){return (d&&d.error==='champs'&&CHAMPS[d.champ])||message(d);}

  function wa(txt){return 'https://wa.me/'+CONF.tel.replace(/\D/g,'')+'?text='+encodeURIComponent(txt);}

  /* Bloc résultat (fond sombre) : la fourchette, puis d'où elle vient. */
  function resultat(res,ref,adresse){
    var h='';
    if(res&&res.fourchette){
      h+='<p class="label">Votre estimation · indicative</p>'+
        '<p class="ee-price" data-test="fourchette"><span>'+euros(res.bas)+'</span><em>–</em><span>'+euros(res.haut)+'</span></p>'+
        '<p class="ee-m2">Soit environ <b>'+euros(res.prix_m2)+'/m²</b>'+(adresse?' · '+esc(adresse):'')+'</p>'+
        '<p class="ee-warn"><span><b>Indicatif, à confirmer par une visite.</b> Le calcul ne voit ni la lumière, ni la vue, ni les finitions : c\'est la visite qui donne le prix juste.</span></p>'+
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
        '<p class="ee-price ee-price-txt" data-test="rappel">Je vous rappelle <em>sous 24 h.</em></p>'+
        '<p class="ee-m2">'+(r==='peu_de_ventes'?"Il y a eu trop peu de ventes comparables près de chez vous"+(res.comparables!=null?' ('+res.comparables+' seulement)':'')+" pour donner une fourchette fiable. Pas de prix au hasard : "+CONF.conseiller+" l'étudie lui-même.":r==='type'?"Pour ce type de bien, l'estimation se fait sur pièces : "+CONF.conseiller+" l'étudie lui-même.":r==='hors_zone'?"Ce secteur est hors de la Côte-d'Or : "+CONF.conseiller+" vous dit ce qu'il peut faire pour vous.":CONF.conseiller+" étudie votre bien lui-même et vous donne une première fourchette au téléphone.")+'</p>'+
        (res&&res.donnees_du?'<p class="ee-warn"><span>Données des ventes réelles (DVF) à jour de '+mois(res.donnees_du)+'.</span></p>':'');
    }
    if(ref)h+='<ul class="ee-facts ee-ref"><li><span>Référence</span><span data-test="reference">'+esc(ref)+'</span></li></ul>';
    h+='<div class="btn-row">'+
      '<a class="btn btn-primary btn-lg" href="tel:'+CONF.tel+'">Prendre rendez-vous <span class="arw">→</span></a>'+
      '<a class="btn btn-ghost" href="'+wa('Bonjour '+CONF.conseiller+', je viens de faire mon estimation en ligne'+(ref?' (réf. '+ref+')':'')+'. ')+'" target="_blank" rel="noopener">WhatsApp</a>'+
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

  return {CONF:CONF,$:$,$$:$$,esc:esc,euros:euros,date:date,jour:jour,mois:mois,taille:taille,rayon:rayon,api:api,message:message,messageChamp:messageChamp,resultat:resultat,voirMdp:voirMdp,err:err,emailOk:emailOk,telOk:telOk,connecte:connecte,pictogramme:pictogramme,portraits:portraits,mem:mem,uuid:uuid,TEL:CONF.tel,wa:wa};
})();
