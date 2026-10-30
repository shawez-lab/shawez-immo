/* Parcours d'estimation /estimer/ : une question par écran, 6 étapes, puis un seul écran de coordonnées
   et le résultat tout de suite. Pas de mot de passe : le compte est créé avec l'e-mail. */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, err=EE.err;
  var form=$('#ee-form'); if(!form)return;
  var CLE_MEM='ee-parcours-v2', DUREE_MEM=2*3600*1000;
  var ORDRE=['adresse','type','bien','atouts','prix','projet','contact'];
  var steps={}; $$('.ee-step',form).forEach(function(s){steps[s.getAttribute('data-s')]=s;});
  var barre=$$('#ee-steps li');
  var R={type:'',adresse:'',code_postal:'',commune:'',citycode:'',lat:null,lon:null,epoque:'',etat:'',delai:'',autre_type:''};
  var civ='', compte=null, cur='adresse', T0=Date.now(), CLE=EE.uuid(), pret=false;
  EE.portraits(document);
  $$('[data-ee-txt=conseiller]').forEach(function(e){e.textContent=EE.CONF.conseiller;});
  $$('[data-ee-lien=confidentialite]').forEach(function(a){a.href=EE.CONF.confidentialite;});

  /* ---------- session : déjà connecté ? ---------- */
  function appliquerCompte(){
    if(!compte)return;
    $('#ee-new').hidden=true;
    var w=$('#ee-logged'); w.hidden=false;
    $('p',w).innerHTML='Connecté en tant que <b>'+EE.esc(((compte.prenom||'')+' '+(compte.nom||'')).trim()||compte.email)+'</b>. L\'estimation sera ajoutée à votre espace.';
    $('#ee-contact-sub').textContent='Vérifiez votre numéro : '+EE.CONF.conseiller+' vous rappelle au plus vite pour en parler.';
    if(compte.telephone&&!$('#ee-tel').value)$('#ee-tel').value=compte.telephone;
  }
  EE.api('/moi').then(function(d){ if(d&&d.compte){compte=d.compte;appliquerCompte();} EE.pictogramme(); });

  /* ---------- étapes visibles selon le type ---------- */
  function sequence(){
    if(R.type==='autre')return ['adresse','type','bien','projet','contact'];
    return ORDRE;
  }
  function appliquerType(){
    $$('[data-pour]',form).forEach(function(el){
      var pour=el.getAttribute('data-pour').split(' ');
      el.hidden=pour.indexOf(R.type||'appartement')<0;
    });
    var autre=R.type==='autre';
    $('#ee-surface-lab').textContent=autre?'Surface approximative (facultatif)':'Surface habitable';
    $('#ee-surface-hint').textContent=autre?'Si vous la connaissez.':R.type==='maison'?'Une surface approximative suffit.':'Surface loi Carrez si vous l\'avez, sinon une surface approximative.';
    $('.msg',$('#ee-surface').closest('.field')).textContent=autre?'Indiquez une surface en m², ou laissez vide si vous ne la connaissez pas.':'Indiquez une surface entre 5 et 2 000 m².';
  }
  var change=0;   // heure du dernier changement d'étape
  function aller(nom,focus){
    var seq=sequence(); if(seq.indexOf(nom)<0)nom=seq[0];
    if(nom!==cur)change=Date.now();
    cur=nom;
    var i=seq.indexOf(nom);
    Object.keys(steps).forEach(function(k){steps[k].hidden=(k!==nom);});
    // barre : position dans les 6 étapes numérotées
    var num=Math.min(i,5);
    if(R.type==='autre'){ num={adresse:0,type:1,bien:2,projet:5,contact:6}[nom]; }
    if(nom==='contact')num=6;
    barre.forEach(function(li,k){li.classList.toggle('done',k<num);li.classList.toggle('on',k===num);if(k===num)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    var c=$('.ee-count',steps[nom]); if(c&&R.type==='autre'){ c.textContent='Étape '+(i+1)+' sur 4'; }
    else if(c){ c.textContent='Étape '+(ORDRE.indexOf(nom)+1)+' sur 6'; }
    if(focus!==false){
      var top=form.getBoundingClientRect().top+window.scrollY-80;
      if(window.scrollY>top||window.scrollY<top-window.innerHeight*0.6)window.scrollTo({top:top,behavior:'smooth'});
      steps[nom].focus({preventScroll:true});
    }
    memoriser();
  }

  /* ---------- 1. adresse ---------- */
  var inp=$('#ee-adresse'), ul=$('#ee-sugg'), picked=$('#ee-picked'), items=[], sel=-1, tmr=null, seqReq=0, rechercheKo=false;
  var SOURCES=['https://api-adresse.data.gouv.fr/search/','https://data.geopf.fr/geocodage/search'];
  function chercher(q){
    var n=++seqReq;
    var qs='?q='+encodeURIComponent(q)+'&limit=6&autocomplete=1&lat=47.32&lon=5.04';
    function essai(k){
      return fetch(SOURCES[k]+qs).then(function(r){if(!r.ok)throw 0;return r.json();}).catch(function(){ if(k+1<SOURCES.length)return essai(k+1); throw 0; });
    }
    essai(0).then(function(d){ if(n!==seqReq)return; rechercheKo=false; items=(d.features||[]).map(function(f){var p=f.properties;return {label:p.label,name:p.name,city:p.city,postcode:p.postcode,citycode:p.citycode,context:p.context,type:p.type,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]};}); afficher(); })
      .catch(function(){ if(n!==seqReq)return; rechercheKo=true; items=[]; afficher(); });
  }
  function afficher(){
    sel=-1; inp.removeAttribute('aria-activedescendant');
    if(!items.length){ul.hidden=true;inp.setAttribute('aria-expanded','false');return;}
    ul.innerHTML=items.map(function(it,k){return '<li role="option" id="ee-o'+k+'" aria-selected="false" data-k="'+k+'"><b>'+EE.esc(it.name)+'</b><span>'+EE.esc((it.postcode||'')+' '+(it.city||'')+(it.context?' · '+it.context.split(', ').slice(-1)[0]:''))+'</span></li>';}).join('');
    ul.hidden=false; inp.setAttribute('aria-expanded','true');
  }
  function retenue(){
    if(R.lat==null){picked.hidden=true;return;}
    $('span',picked).textContent=R.adresse_type==='municipality'?'Commune retenue : '+R.adresse+'. Ajoutez le numéro et la rue pour un calcul plus précis.':'Adresse retenue : '+R.adresse;
    picked.hidden=false;
  }
  function choisir(it){
    R.adresse=it.label; R.code_postal=it.postcode||''; R.commune=it.city||''; R.citycode=it.citycode||''; R.lat=it.lat; R.lon=it.lon; R.adresse_type=it.type||'';
    inp.value=it.label; ul.hidden=true; inp.setAttribute('aria-expanded','false');
    retenue(); err(inp,false); memoriser();
  }
  inp.addEventListener('input',function(){
    R.lat=R.lon=null; R.adresse=''; R.code_postal=''; R.commune=''; R.citycode=''; picked.hidden=true; inp.dataset.libre='';
    clearTimeout(tmr); var q=inp.value.trim();
    if(q.length<3){items=[];afficher();return;}
    tmr=setTimeout(function(){chercher(q);},180);
  });
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      if(!ul.hidden&&sel>=0){choisir(items[sel]);return;}
      if(!ul.hidden&&items.length===1){choisir(items[0]);return;}
      suivant(); return;
    }
    if(ul.hidden)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;$$('li',ul).forEach(function(li,k){li.setAttribute('aria-selected',String(k===sel));});inp.setAttribute('aria-activedescendant','ee-o'+sel);}
    else if(e.key==='Escape'){ul.hidden=true;inp.setAttribute('aria-expanded','false');}
  });
  ul.addEventListener('mousedown',function(e){e.preventDefault();});
  ul.addEventListener('click',function(e){var li=e.target.closest('li');if(li)choisir(items[+li.getAttribute('data-k')]);});
  inp.addEventListener('blur',function(){setTimeout(function(){ul.hidden=true;inp.setAttribute('aria-expanded','false');},150);});

  /* ---------- 2. type ---------- */
  function presser(liste,actif){liste.forEach(function(x){x.setAttribute('aria-pressed',String(actif(x)));});}
  $$('.ee-tile',form).forEach(function(b){b.addEventListener('click',function(){
    R.type=b.getAttribute('data-type'); R.autre_type='';
    presser($$('.ee-tile',form),function(x){return x===b;});
    presser($$('[data-autre]',form),function(){return false;});
    $('#ee-type-msg').hidden=true; appliquerType(); memoriser();
    setTimeout(function(){ if(cur==='type')suivant(); },180);
  });});
  $('#ee-autre-btn').addEventListener('click',function(){var a=$('#ee-autre');a.hidden=!a.hidden;this.setAttribute('aria-expanded',String(!a.hidden));});
  $$('[data-autre]',form).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){
    R.type='autre'; R.autre_type=b.getAttribute('data-autre');
    presser($$('[data-autre]',form),function(x){return x===b;});
    presser($$('.ee-tile',form),function(){return false;});
    $('#ee-type-msg').hidden=true; appliquerType(); memoriser();
  });});

  /* ---------- 3. compteurs et choix ---------- */
  /* Les compteurs partent vides (« – ») : rien n'est prérempli, le vendeur choisit chaque valeur.
     Premier appui : « − » donne le minimum, « + » le minimum plus un. */
  function vide(s){ return s.getAttribute('data-v')===''||s.getAttribute('data-v')==null; }
  function majCompteur(s){
    var o=$('output',s), min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k'), v=+s.getAttribute('data-v');
    if(vide(s)){ o.textContent='–'; o.setAttribute('aria-label','non renseigné'); $$('button',s)[0].disabled=false; $$('button',s)[1].disabled=false; return; }
    o.removeAttribute('aria-label');
    o.textContent=(k==='etage'&&v===0)?'RDC':v; $$('button',s)[0].disabled=v<=min; $$('button',s)[1].disabled=v>=max;
  }
  function errCompteur(s,on){ s.classList.toggle('err',!!on); return !on; }
  $$('.ee-stp',form).forEach(function(s){
    var min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k'), nom=$('.l',s).firstChild.textContent;
    $$('button',s)[0].setAttribute('aria-label',nom+' : moins'); $$('button',s)[1].setAttribute('aria-label',nom+' : plus');
    $$('button',s).forEach(function(b){b.addEventListener('click',function(){var d=+b.getAttribute('data-d');var v=vide(s)?(d<0?min:Math.min(max,min+1)):Math.max(min,Math.min(max,+s.getAttribute('data-v')+d));s.setAttribute('data-v',v);majCompteur(s);errCompteur(s,false);
      if(k==='niveaux'){var pp=form.querySelector('input[name=plain_pied]');if(pp)pp.checked=(v===1);}
      memoriser();
    });});
    majCompteur(s);
  });
  function stp(k){return form.querySelector('.ee-stp[data-k="'+k+'"]');}
  function val(k){var s=stp(k);return s&&!vide(s)?+s.getAttribute('data-v'):null;}
  function fixer(k,v){var s=stp(k);if(s){s.setAttribute('data-v',v==null||v===''?'':v);majCompteur(s);}}
  $$('[data-choix]',form).forEach(function(g){
    var k=g.getAttribute('data-choix');
    $$('.ee-opt',g).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){
      R[k]=b.getAttribute('data-v'); presser($$('.ee-opt',g),function(x){return x===b;});
      err(g,false); memoriser();
      if(k==='delai')setTimeout(function(){ if(cur==='projet')suivant(); },180);
    });});
  });
  /* prix : espaces de milliers à la saisie */
  var prix=$('#ee-prix');
  prix.addEventListener('input',function(){var d=prix.value.replace(/\D/g,'').slice(0,9);prix.value=d?(+d).toLocaleString('fr-FR').replace(/[  ]/g,' '):'';});

  /* ---------- validation par étape ---------- */
  function valider(nom){
    if(nom==='adresse'){
      if(R.lat==null){
        var t=inp.value.trim();
        // la recherche d'adresses ne répond pas : on garde le texte saisi, Shawez rappellera
        if(t.length>=6&&rechercheKo){R.adresse=t;return err(inp,false);}
        // une seule proposition : on la prend
        if(items.length===1&&t.length>=3){choisir(items[0]);return true;}
        $('#ee-adresse-msg').textContent=t.length<3?'Écrivez le numéro et la rue (ex. 30 rue Bannelier, Dijon).':'Choisissez votre adresse dans la liste qui s\'affiche.';
        if(items.length&&t.length>=3){ul.hidden=false;inp.setAttribute('aria-expanded','true');}
        return err(inp,true);
      }
      return err(inp,false);
    }
    if(nom==='type'){ var ok=!!R.type&&(R.type!=='autre'||!!R.autre_type); $('#ee-type-msg').hidden=ok; $('#ee-type-msg').style.display=ok?'':'block'; return ok; }
    if(nom==='bien'){
      var s=$('#ee-surface'), v=s.value.trim().replace(',','.'), ok2=true;
      if(R.type==='autre'){ ok2=err(s,s.validity.badInput||(v!==''&&!(+v>=1&&+v<=100000))); return ok2; }
      ok2=err(s,!(+v>=5&&+v<=2000))&&ok2;
      // compteurs visibles : un choix est obligatoire
      $$('.ee-stp',form).forEach(function(c){ if(!c.hidden)ok2=errCompteur(c,vide(c))&&ok2; else errCompteur(c,false); });
      if(R.type==='maison'){var t2=$('#ee-terrain');ok2=err(t2,t2.value.trim()===''||!(+t2.value>=0&&+t2.value<=1000000))&&ok2;}
      ok2=err($('[data-choix=epoque]',form),!R.epoque)&&ok2;
      ok2=err($('[data-choix=etat]',form),!R.etat)&&ok2;
      if(ok2){
        if(R.type==='appartement'&&val('etage')>val('etages_immeuble'))fixer('etages_immeuble',val('etage'));
        if(val('chambres')>=val('pieces')&&val('pieces')>1)fixer('chambres',val('pieces')-1);
        if(val('pieces')===1&&val('chambres')>1)fixer('chambres',1);
      }
      if(!ok2){var f=steps.bien.querySelector('.field.err,.ee-stp.err');if(f){f.scrollIntoView({block:'center',behavior:'smooth'});var c=f.querySelector('input,button');if(c)c.focus({preventScroll:true});}}
      return ok2;
    }
    if(nom==='prix'){ return true; }
    if(nom==='projet'){ return err($('[data-choix=delai]',form),!R.delai); }
    return true;
  }
  function suivant(){
    if(!valider(cur))return;
    var seq=sequence(), i=seq.indexOf(cur);
    if(i<seq.length-1)aller(seq[i+1]);
  }
  function precedent(){ var seq=sequence(),i=seq.indexOf(cur);if(i>0)aller(seq[i-1]); }
  /* Un double clic ne fait pas sauter une étape : le second clic tombe sur le bouton de l'étape suivante, au même
     endroit. On l'ignore (2e clic d'un double clic, ou clic dans le quart de seconde qui suit un changement d'étape). */
  function tropTot(e){ return (e&&e.detail>1)||Date.now()-change<250; }
  /* Même garde pour toute la page : après un changement d'étape, l'écran n'a plus la même hauteur, et le second clic
     d'un double clic tomberait sur un lien du pied de page. On l'avale. */
  document.addEventListener('click',function(e){ if(e.isTrusted!==false&&Date.now()-change<300&&change){e.preventDefault();e.stopPropagation();} },true);
  $$('[data-next]',form).forEach(function(b){b.addEventListener('click',function(e){ if(!tropTot(e))suivant(); });});
  $$('[data-prev]',form).forEach(function(b){b.addEventListener('click',function(e){ if(!tropTot(e))precedent(); });});
  form.addEventListener('keydown',function(e){ if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'&&cur!=='contact'&&e.target!==inp){e.preventDefault();suivant();} });
  form.addEventListener('input',function(e){ if(e.target.closest('.field.err')&&e.target.id!=='ee-adresse')err(e.target,false); memoriserBientot(); });
  form.addEventListener('change',memoriserBientot);

  /* ---------- coordonnées ---------- */
  $$('[data-civ]',form).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){civ=b.getAttribute('data-civ');presser($$('[data-civ]',form),function(x){return x===b;});memoriser();});});
  function reponses(){
    var o={type:R.type,adresse:R.adresse,code_postal:R.code_postal,commune:R.commune,citycode:R.citycode,lat:R.lat,lon:R.lon,delai:R.delai};
    var p=prix.value.replace(/\D/g,''); if(p&&R.type!=='autre')o.prix_ideal=+p;
    var s=$('#ee-surface').value.trim().replace(',','.'); if(s)o.surface=Math.round(+s);
    if(R.type==='autre'){o.autre_type=R.autre_type;o.message=$('#ee-message').value.trim();return o;}
    o.pieces=val('pieces');o.chambres=val('chambres');o.epoque=R.epoque;o.etat=R.etat;
    o.terrasse=form.querySelector('input[name=terrasse]').checked;
    if(R.type==='appartement'){o.etage=val('etage');o.etages_immeuble=val('etages_immeuble');['ascenseur','balcon','cave','gardien','parking','parking_box'].forEach(function(k){o[k]=form.querySelector('input[name='+k+']').checked;});}
    else {o.terrain=Math.round(+$('#ee-terrain').value);o.niveaux=val('niveaux');['plain_pied','piscine','garage'].forEach(function(k){o[k]=form.querySelector('input[name='+k+']').checked;});}
    return o;
  }
  var envoi=false;
  function bouton(actif){ var b=$('#ee-submit'); b.disabled=!actif; b.setAttribute('aria-busy',String(!actif)); $('#ee-submit-txt').textContent=actif?'Connaître le prix de mon bien':'Calcul en cours…'; }
  form.addEventListener('submit',function(e){
    e.preventDefault(); if(envoi)return;
    if(cur!=='contact'){suivant();return;}
    if(Date.now()-change<250)return;   // second clic d'un double clic sur « Voir mon estimation »
    var ok=true, tel=$('#ee-tel'), mail=$('#ee-email');
    mail.value=mail.value.replace(/\s+/g,'');
    if(!compte){
      ok=err($('#ee-prenom'),!$('#ee-prenom').value.trim())&&ok;
      ok=err($('#ee-nom'),!$('#ee-nom').value.trim())&&ok;
      ok=err(mail,!EE.emailOk(mail.value))&&ok;
    }
    ok=err(tel,!EE.telOk(tel.value))&&ok;
    ok=err($('#ee-consent'),!$('#ee-consent').checked)&&ok;
    var m=$('#ee-err'); m.hidden=true;
    if(!ok){var f=steps.contact.querySelector('.field.err');if(f){f.scrollIntoView({block:'center',behavior:'smooth'});var c=f.querySelector('input');if(c)c.focus({preventScroll:true});}return;}
    // tout le parcours doit être complet (au cas où l'on arrive ici par un état incomplet)
    var seq=sequence();
    for(var i=0;i<seq.length-1;i++){ if(!valider(seq[i])){aller(seq[i]);return;} }
    var corps={reponses:reponses(),consentement:true,ee_hp:$('#ee-hp').value,duree:Date.now()-T0,cle:CLE,site:EE.CONF.site||undefined,
      contact:compte?{telephone:tel.value.trim()}:{civilite:civ,prenom:$('#ee-prenom').value.trim(),nom:$('#ee-nom').value.trim(),email:mail.value.trim(),telephone:tel.value.trim()}};
    envoi=true; bouton(false);
    EE.api('/estimation',{body:corps,delai:45000}).then(function(d){
      envoi=false; bouton(true);
      if(d._status===200||d._status===201){
        var etat={resultat:d.resultat,reference:d.reference,adresse:R.adresse,espace:d.espace||{},email:compte?compte.email:mail.value.trim(),mdp:false,demande:d.demande_id||null,visite:null};
        var finir=function(){
          memoriser(etat);
          montrer(etat,true);
          try{ if(window.beTracker)window.beTracker.t({hash:'33710f67a0c16d7cbb94d1b2ba10e7a8'}); }catch(x){}
          try{ if(window.oaiLead)window.oaiLead(d.reference); }catch(x){}
        };
        /* Hors Côte-d'Or : la demande est enregistrée, la fourchette se calcule ensuite sur les ventes de la commune.
           Si ce calcul échoue, le résultat dit simplement que l'on rappelle avec une première fourchette. */
        if(d.resultat&&d.resultat.raison==='calcul'){
          envoi=true; bouton(false);
          EE.api('/estimation/fourchette',{body:{cle:CLE,reference:d.reference},delai:40000}).then(function(f){
            envoi=false; bouton(true);
            etat.resultat=(f&&f._status===200&&f.resultat)?f.resultat:{fourchette:false,raison:'donnees_indisponibles',donnees_du:d.resultat.donnees_du,annees:d.resultat.annees};
            if(f&&f.lien==='envoye')etat.espace.lien='envoye';
            finir();
          });
          return;
        }
        finir();
        return;
      }
      if(d.error==='champs'&&d.champ){
        var map={telephone:'#ee-tel',email:'#ee-email',prenom:'#ee-prenom',nom:'#ee-nom',consentement:'#ee-consent'};
        if(map[d.champ]){err($(map[d.champ]),true);$(map[d.champ]).focus();return;}
        var retour={adresse:'adresse',code_postal:'adresse',lat:'adresse',lon:'adresse',surface:'bien',terrain:'bien',pieces:'bien',chambres:'bien',epoque:'bien',etat:'bien',type:'type',autre_type:'type',delai:'projet'}[d.champ];
        if(retour){aller(retour);valider(retour);return;}
      }
      m.textContent=EE.messageChamp(d); m.hidden=false; m.scrollIntoView({block:'center',behavior:'smooth'});
    });
  });

  /* ---------- résultat, puis (après seulement) de quoi le retrouver ---------- */
  function montrer(etat,defiler){
    form.hidden=true;
    $('#ee-res-box').innerHTML=EE.resultat(etat.resultat,etat.reference,etat.adresse);
    var res=$('#ee-result'); res.hidden=false;
    apres(etat);
    rdv(etat);
    EE.pictogramme();
    if(defiler){ window.scrollTo({top:res.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); res.focus({preventScroll:true}); }
  }
  /* La visite d'estimation, proposée dès le résultat (si l'espace est ouvert : sinon elle se choisit dans l'espace). */
  function rdv(etat){
    var z=$('#ee-rdv'); z.hidden=true;
    if(!etat.demande||!(etat.espace||{}).connecte)return;
    EE.visite(z,{demande:etat.demande,visite:etat.visite||null,possible:true,email:(etat.espace||{}).lien==='envoye',onChange:function(r){
      etat.visite=r.visite; var m=EE.mem.lire(CLE_MEM); if(m&&m.fini){m.fini.visite=r.visite;EE.mem.ecrire(CLE_MEM,m);}
    }});
  }
  function apres(etat){
    var e=etat.espace||{}, box=$('#ee-apres'), titre=$('#ee-apres-titre'), txt=$('#ee-apres-txt'), f=$('#ee-mdp-form'), lien=$('#ee-apres-espace');
    var mail='<b>'+EE.esc(etat.email||'')+'</b>';
    box.hidden=false; f.hidden=true; lien.hidden=false; lien.href=EE.CONF.espace;
    if(e.connecte){
      titre.innerHTML='Retrouvez-la <em>quand vous voulez.</em>';
      if(e.nouveau){
        txt.innerHTML='Votre espace est créé avec '+mail+' : cette estimation y est rangée, avec l\'avancement de votre dossier.'+(e.lien==='envoye'?' Un e-mail vient de partir avec votre estimation et un lien pour y revenir.':' Gardez cette page ou choisissez un mot de passe pour revenir.');
        if(!etat.mdp&&!e.mot_de_passe){
          f.hidden=false;
          $('#ee-mdp-hint').textContent=e.lien==='envoye'?'8 caractères au moins. Facultatif : le lien reçu par e-mail suffit.':'8 caractères au moins. Facultatif, mais utile pour retrouver votre estimation depuis un autre appareil.';
        } else if(etat.mdp){ txt.innerHTML+=' Votre mot de passe est enregistré.'; }
      } else {
        txt.innerHTML='Cette estimation est ajoutée à votre espace.';
      }
    } else if(e.existant){
      titre.innerHTML='Vous avez déjà <em>un espace.</em>';
      lien.href=EE.CONF.espace+'?email='+encodeURIComponent(etat.email||'');
      lien.firstChild.textContent='Me connecter ';
      txt.innerHTML='Un espace existe déjà avec '+mail+' : cette estimation y est rangée.'+
        (e.lien==='envoye'?' Ouvrez le lien que nous venons de vous envoyer par e-mail pour la retrouver.'
          :e.en_attente?' Elle y apparaîtra dès que votre adresse e-mail sera confirmée : '+EE.esc(EE.CONF.conseiller)+' vous envoie un lien de connexion quand il vous appelle.'
          :' Connectez-vous pour la retrouver.');
    } else { box.hidden=true; }
  }
  EE.voirMdp(document);
  $('#ee-mdp-form').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, i=$('#ee-mdp'), ko=$('.ee-err',f), ok=$('.ee-ok',f);
    ko.hidden=true; ok.hidden=true;
    if(!err(i,i.value.trim().length<8)){i.focus();return;}
    var b=$('[type=submit]',f); b.disabled=true;
    EE.api('/mot-de-passe/definir',{body:{mot_de_passe:i.value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){
        i.value=''; $('.field',f).hidden=true; $('.ee-nav',f).hidden=true;
        ok.textContent='Mot de passe enregistré. Vous pourrez vous connecter avec votre e-mail et ce mot de passe.'; ok.hidden=false;
        var m=EE.mem.lire(CLE_MEM); if(m&&m.fini){m.fini.mdp=true;EE.mem.ecrire(CLE_MEM,m);}
        return;
      }
      ko.textContent=d.error==='connexion'?'Votre session a expiré. Ouvrez votre espace pour choisir un mot de passe.':EE.messageChamp(d); ko.hidden=false;
    });
  });
  $('#ee-refaire').addEventListener('click',function(){ EE.mem.effacer(CLE_MEM); location.href=EE.CONF.estimer; });

  /* ---------- mémoire du parcours : un rechargement ne fait rien perdre ---------- */
  var tm=null;
  function memoriserBientot(){ clearTimeout(tm); tm=setTimeout(function(){memoriser();},250); }
  function memoriser(fini){
    if(!pret)return;
    var ancien=EE.mem.lire(CLE_MEM)||{};
    var m={v:2,t0:T0,cle:CLE,cur:cur,R:R,civ:civ,libre:inp.dataset.libre||'',adresseSaisie:inp.value,
      champs:{},compteurs:{},coches:{},autreOuvert:!$('#ee-autre').hidden,fini:fini||ancien.fini||null};
    ['ee-surface','ee-terrain','ee-prix','ee-message','ee-prenom','ee-nom','ee-email','ee-tel'].forEach(function(id){var el=document.getElementById(id);if(el)m.champs[id]=el.value;});
    $$('.ee-stp',form).forEach(function(s){m.compteurs[s.getAttribute('data-k')]=vide(s)?null:+s.getAttribute('data-v');});
    $$('.ee-check input, #ee-consent',form).forEach(function(c){m.coches[c.name||c.id]=c.checked;});
    EE.mem.ecrire(CLE_MEM,m);
  }
  function restaurer(){
    var m=EE.mem.lire(CLE_MEM);
    if(!m||m.v!==2||!m.t0||Date.now()-m.t0>DUREE_MEM){EE.mem.effacer(CLE_MEM);return false;}
    T0=m.t0; CLE=m.cle||CLE; civ=m.civ||'';
    Object.keys(m.R||{}).forEach(function(k){R[k]=m.R[k];});
    Object.keys(m.champs||{}).forEach(function(id){var el=document.getElementById(id);if(el&&m.champs[id]!=null)el.value=m.champs[id];});
    Object.keys(m.compteurs||{}).forEach(function(k){fixer(k,m.compteurs[k]);});
    Object.keys(m.coches||{}).forEach(function(k){var c=form.querySelector('input[name="'+k+'"]')||document.getElementById(k);if(c)c.checked=!!m.coches[k];});
    inp.value=m.adresseSaisie||R.adresse||''; if(m.libre)inp.dataset.libre=m.libre;
    retenue();
    presser($$('.ee-tile',form),function(x){return x.getAttribute('data-type')===R.type;});
    presser($$('[data-autre]',form),function(x){return R.type==='autre'&&x.getAttribute('data-autre')===R.autre_type;});
    if(m.autreOuvert||R.type==='autre'){$('#ee-autre').hidden=false;$('#ee-autre-btn').setAttribute('aria-expanded','true');}
    $$('[data-choix]',form).forEach(function(g){var k=g.getAttribute('data-choix');presser($$('.ee-opt',g),function(x){return x.getAttribute('data-v')===R[k];});});
    presser($$('[data-civ]',form),function(x){return x.getAttribute('data-civ')===civ;});
    appliquerType();
    if(m.fini){ pret=true; montrer(m.fini,false); return true; }
    // on revient à l'étape en cours, sans dépasser la première étape incomplète
    var seq=sequence(), cible=seq.indexOf(m.cur); if(cible<0)cible=0;
    var i=0; pret=false;
    while(i<cible&&valider(seq[i]))i++;
    $$('.field.err,.ee-stp.err',form).forEach(function(f){f.classList.remove('err');}); $('#ee-type-msg').hidden=true; $('#ee-type-msg').style.display='';
    pret=true; aller(seq[i],false);
    return true;
  }

  appliquerType();
  if(!restaurer()){
    pret=true; aller('adresse',false);
    /* adresse passée dans l'URL (?adresse=…) : on pré-remplit */
    var q=new URLSearchParams(location.search).get('adresse'); if(q){inp.value=q;chercher(q);}
  }
})();
