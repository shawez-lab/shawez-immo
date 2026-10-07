/* Parcours d'estimation /estimer/ : une question par écran, 6 étapes, puis coordonnées et résultat */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$;
  var form=$('#ee-form'); if(!form)return;
  var T0=Date.now();
  var ORDRE=['adresse','type','bien','atouts','prix','projet','contact'];
  var steps={}; $$('.ee-step',form).forEach(function(s){steps[s.getAttribute('data-s')]=s;});
  var barre=$$('#ee-steps li');
  var R={type:'',adresse:'',code_postal:'',commune:'',citycode:'',lat:null,lon:null,epoque:'',etat:'',delai:'',autre_type:''};
  var civ='', compte=null, cur='adresse';

  /* ---------- session : déjà connecté ? ---------- */
  EE.api('/moi').then(function(d){
    if(d&&d.compte){
      compte=d.compte;
      $('#ee-new').hidden=true; $('#ee-pw-field').hidden=true;
      var w=$('#ee-logged'); w.hidden=false;
      $('p',w).innerHTML='Connecté en tant que <b>'+EE.esc((compte.prenom+' '+compte.nom).trim()||compte.email)+'</b>. L\'estimation sera ajoutée à votre espace.';
      $('#ee-contact-sub').textContent='Vérifiez votre numéro : Shawez vous appelle pour en parler.';
      if(compte.telephone)$('#ee-tel').value=compte.telephone;
    }
  });

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
    $('#ee-surface-lab').textContent=autre?'Surface approximative (facultatif)':R.type==='maison'?'Surface habitable':'Surface habitable';
    $('#ee-surface-hint').textContent=autre?'Si vous la connaissez.':R.type==='maison'?'Une surface approximative suffit.':'Surface loi Carrez si vous l\'avez, sinon une surface approximative.';
  }
  function aller(nom,focus){
    cur=nom;
    var seq=sequence(), i=seq.indexOf(nom);
    Object.keys(steps).forEach(function(k){steps[k].hidden=(k!==nom);});
    // barre : position dans les 6 étapes numérotées
    var num=Math.min(i,5);
    if(R.type==='autre'){ num={adresse:0,type:1,bien:2,projet:5,contact:6}[nom]; }
    if(nom==='contact')num=6;
    barre.forEach(function(li,k){li.classList.toggle('done',k<num);li.classList.toggle('on',k===num);});
    var c=$('.ee-count',steps[nom]); if(c&&R.type==='autre'){ c.textContent='Étape '+(i+1)+' sur 4'; }
    else if(c){ c.textContent='Étape '+(ORDRE.indexOf(nom)+1)+' sur 6'; }
    if(focus!==false){
      var top=form.getBoundingClientRect().top+window.scrollY-80;
      if(window.scrollY>top||window.scrollY<top-window.innerHeight*0.6)window.scrollTo({top:top,behavior:'smooth'});
      steps[nom].focus({preventScroll:true});
    }
  }

  /* ---------- 1. adresse ---------- */
  var inp=$('#ee-adresse'), ul=$('#ee-sugg'), picked=$('#ee-picked'), items=[], sel=-1, tmr=null, seqReq=0;
  var SOURCES=['https://api-adresse.data.gouv.fr/search/','https://data.geopf.fr/geocodage/search'];
  function chercher(q){
    var n=++seqReq;
    var qs='?q='+encodeURIComponent(q)+'&limit=6&autocomplete=1&lat=47.32&lon=5.04';
    function essai(k){
      return fetch(SOURCES[k]+qs).then(function(r){if(!r.ok)throw 0;return r.json();}).catch(function(){ if(k+1<SOURCES.length)return essai(k+1); throw 0; });
    }
    essai(0).then(function(d){ if(n!==seqReq)return; items=(d.features||[]).map(function(f){var p=f.properties;return {label:p.label,name:p.name,city:p.city,postcode:p.postcode,citycode:p.citycode,context:p.context,type:p.type,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]};}); afficher(); })
      .catch(function(){ if(n!==seqReq)return; items=[]; afficher(); });
  }
  function afficher(){
    sel=-1;
    if(!items.length){ul.hidden=true;inp.setAttribute('aria-expanded','false');return;}
    ul.innerHTML=items.map(function(it,k){return '<li role="option" id="ee-o'+k+'" aria-selected="false" data-k="'+k+'"><b>'+EE.esc(it.name)+'</b><span>'+EE.esc(it.postcode+' '+it.city+(it.context?' · '+it.context.split(', ').slice(-1)[0]:''))+'</span></li>';}).join('');
    ul.hidden=false; inp.setAttribute('aria-expanded','true');
  }
  function choisir(it){
    R.adresse=it.label; R.code_postal=it.postcode||''; R.commune=it.city||''; R.citycode=it.citycode||''; R.lat=it.lat; R.lon=it.lon;
    inp.value=it.label; ul.hidden=true; inp.setAttribute('aria-expanded','false');
    $('span',picked).textContent=it.type==='municipality'?'Commune retenue : '+it.label+'. Ajoutez le numéro et la rue pour un calcul plus précis.':'Adresse retenue : '+it.label;
    picked.hidden=false; inp.closest('.field').classList.remove('err');
  }
  inp.addEventListener('input',function(){
    R.lat=R.lon=null; R.adresse=''; picked.hidden=true;
    clearTimeout(tmr); var q=inp.value.trim();
    if(q.length<3){items=[];afficher();return;}
    tmr=setTimeout(function(){chercher(q);},180);
  });
  inp.addEventListener('keydown',function(e){
    if(ul.hidden)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;$$('li',ul).forEach(function(li,k){li.setAttribute('aria-selected',String(k===sel));});inp.setAttribute('aria-activedescendant','ee-o'+sel);}
    else if(e.key==='Enter'){ if(sel>=0){e.preventDefault();choisir(items[sel]);} }
    else if(e.key==='Escape'){ul.hidden=true;}
  });
  ul.addEventListener('mousedown',function(e){e.preventDefault();});
  ul.addEventListener('click',function(e){var li=e.target.closest('li');if(li)choisir(items[+li.getAttribute('data-k')]);});
  inp.addEventListener('blur',function(){setTimeout(function(){ul.hidden=true;inp.setAttribute('aria-expanded','false');},150);});

  /* ---------- 2. type ---------- */
  $$('.ee-tile',form).forEach(function(b){b.addEventListener('click',function(){
    R.type=b.getAttribute('data-type'); R.autre_type='';
    $$('.ee-tile',form).forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
    $$('[data-autre]',form).forEach(function(x){x.setAttribute('aria-pressed','false');});
    $('#ee-type-msg').hidden=true; appliquerType();
    setTimeout(function(){suivant();},180);
  });});
  $('#ee-autre-btn').addEventListener('click',function(){var a=$('#ee-autre');a.hidden=!a.hidden;this.setAttribute('aria-expanded',String(!a.hidden));});
  $$('[data-autre]',form).forEach(function(b){b.addEventListener('click',function(){
    R.type='autre'; R.autre_type=b.getAttribute('data-autre');
    $$('[data-autre]',form).forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
    $$('.ee-tile',form).forEach(function(x){x.setAttribute('aria-pressed','false');});
    $('#ee-type-msg').hidden=true; appliquerType();
  });});

  /* ---------- 3. compteurs et choix ---------- */
  $$('.ee-stp',form).forEach(function(s){
    var o=$('output',s), min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k');
    function maj(){var v=+s.getAttribute('data-v'); o.textContent=(k==='etage'&&v===0)?'RDC':v; $$('button',s)[0].disabled=v<=min; $$('button',s)[1].disabled=v>=max;}
    $$('button',s).forEach(function(b){b.addEventListener('click',function(){var v=Math.max(min,Math.min(max,+s.getAttribute('data-v')+(+b.getAttribute('data-d'))));s.setAttribute('data-v',v);maj();
      if(k==='niveaux'){var pp=form.querySelector('input[name=plain_pied]');if(pp)pp.checked=(v===1);}
    });});
    maj();
  });
  function val(k){var s=form.querySelector('.ee-stp[data-k="'+k+'"]');return s?+s.getAttribute('data-v'):null;}
  $$('[data-choix]',form).forEach(function(g){
    var k=g.getAttribute('data-choix');
    $$('.ee-opt',g).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){
      R[k]=b.getAttribute('data-v'); $$('.ee-opt',g).forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});
      g.closest('.field').classList.remove('err');
      if(k==='delai')setTimeout(function(){suivant();},180);
    });});
  });
  /* prix : espaces de milliers à la saisie */
  var prix=$('#ee-prix');
  prix.addEventListener('input',function(){var d=prix.value.replace(/\D/g,'').slice(0,9);prix.value=d?(+d).toLocaleString('fr-FR'):'';});

  /* ---------- validation par étape ---------- */
  function err(el,on){var f=el.closest('.field');if(f)f.classList.toggle('err',!!on);return !on;}
  function valider(nom){
    if(nom==='adresse'){
      if(R.lat==null){
        // pas d'adresse choisie dans la liste : si la recherche est indisponible, on garde le texte saisi
        var t=inp.value.trim();
        if(t.length>=3&&!items.length&&inp.dataset.libre==='1'){R.adresse=t;return true;}
        if(t.length>=3&&!items.length){inp.dataset.libre='1';}
        return err(inp,true);
      }
      return err(inp,false);
    }
    if(nom==='type'){ var ok=!!R.type&&(R.type!=='autre'||!!R.autre_type); $('#ee-type-msg').hidden=ok; $('#ee-type-msg').style.display=ok?'':'block'; return ok; }
    if(nom==='bien'){
      var s=$('#ee-surface'), v=s.value.trim(), ok2=true;
      if(R.type==='autre'){ ok2=err(s,v!==''&&!(+v>=1&&+v<=100000)); return ok2; }
      ok2=err(s,!(+v>=9&&+v<=2000))&&ok2;
      if(R.type==='maison'){var t2=$('#ee-terrain');ok2=err(t2,t2.value.trim()===''||!(+t2.value>=0&&+t2.value<=1000000))&&ok2;}
      ok2=err($('[data-choix=epoque]',form),!R.epoque)&&ok2;
      ok2=err($('[data-choix=etat]',form),!R.etat)&&ok2;
      if(R.type==='appartement'&&val('etage')>val('etages_immeuble')){ var e=form.querySelector('.ee-stp[data-k="etages_immeuble"]'); e.setAttribute('data-v',val('etage')); $('output',e).textContent=val('etage'); }
      if(R.type==='appartement'||R.type==='maison'){ if(val('chambres')>=val('pieces')&&val('pieces')>1){ var c=form.querySelector('.ee-stp[data-k="chambres"]'); c.setAttribute('data-v',val('pieces')-1); $('output',c).textContent=val('pieces')-1; } }
      if(!ok2){var f=steps.bien.querySelector('.field.err');if(f)f.scrollIntoView({block:'center',behavior:'smooth'});}
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
  function precedent(){var seq=sequence(),i=seq.indexOf(cur);if(i>0)aller(seq[i-1]);}
  $$('[data-next]',form).forEach(function(b){b.addEventListener('click',suivant);});
  $$('[data-prev]',form).forEach(function(b){b.addEventListener('click',precedent);});
  form.addEventListener('keydown',function(e){ if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'&&cur!=='contact'&&e.target!==inp){e.preventDefault();suivant();} });

  /* ---------- coordonnées ---------- */
  $$('[data-civ]',form).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){civ=b.getAttribute('data-civ');$$('[data-civ]',form).forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});
  EE.voirMdp(form);
  function reponses(){
    var o={type:R.type,adresse:R.adresse,code_postal:R.code_postal,commune:R.commune,citycode:R.citycode,lat:R.lat,lon:R.lon,delai:R.delai};
    var p=prix.value.replace(/\D/g,''); if(p&&R.type!=='autre')o.prix_ideal=+p;
    var s=$('#ee-surface').value.trim(); if(s)o.surface=+s;
    if(R.type==='autre'){o.autre_type=R.autre_type;o.message=$('#ee-message').value.trim();return o;}
    o.pieces=val('pieces');o.chambres=val('chambres');o.epoque=R.epoque;o.etat=R.etat;
    o.terrasse=form.querySelector('input[name=terrasse]').checked;
    if(R.type==='appartement'){o.etage=val('etage');o.etages_immeuble=val('etages_immeuble');['ascenseur','balcon','cave','gardien','parking','parking_box'].forEach(function(k){o[k]=form.querySelector('input[name='+k+']').checked;});}
    else {o.terrain=+$('#ee-terrain').value;o.niveaux=val('niveaux');['plain_pied','piscine','garage'].forEach(function(k){o[k]=form.querySelector('input[name='+k+']').checked;});}
    return o;
  }
  var envoi=false;
  form.addEventListener('submit',function(e){
    e.preventDefault(); if(envoi)return;
    if(cur!=='contact'){suivant();return;}
    var ok=true, tel=$('#ee-tel');
    var telOk=/^[+\d][\d\s.\-()]{7,}$/.test(tel.value.trim())&&tel.value.replace(/\D/g,'').length>=9;
    ok=err(tel,!telOk)&&ok;
    if(!compte){
      ok=err($('#ee-prenom'),!$('#ee-prenom').value.trim())&&ok;
      ok=err($('#ee-nom'),!$('#ee-nom').value.trim())&&ok;
      ok=err($('#ee-email'),!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test($('#ee-email').value.trim()))&&ok;
      ok=err($('#ee-mdp'),$('#ee-mdp').value.length<8)&&ok;
    }
    ok=err($('#ee-consent'),!$('#ee-consent').checked)&&ok;
    if(!ok){var f=steps.contact.querySelector('.field.err');if(f)f.scrollIntoView({block:'center',behavior:'smooth'});return;}
    var corps={reponses:reponses(),consentement:true,website:$('#ee-website').value,duree:Date.now()-T0,
      contact:compte?{telephone:tel.value.trim()}:{civilite:civ,prenom:$('#ee-prenom').value.trim(),nom:$('#ee-nom').value.trim(),email:$('#ee-email').value.trim(),telephone:tel.value.trim(),mot_de_passe:$('#ee-mdp').value}};
    envoi=true; var b=$('#ee-submit'); b.disabled=true; b.firstChild.textContent='Calcul en cours… ';
    $('#ee-err').hidden=true; $('#ee-exist').hidden=true;
    EE.api('/estimation',{body:corps}).then(function(d){
      envoi=false; b.disabled=false; b.firstChild.textContent='Afficher mon estimation ';
      if(d._status===201||d._status===202){
        form.hidden=true;
        var box=$('#ee-res-box'); box.innerHTML=EE.resultat(d.resultat,d.reference,R.adresse);
        var res=$('#ee-result'); res.hidden=false;
        window.scrollTo({top:res.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); res.focus({preventScroll:true});
        try{ if(window.beTracker)window.beTracker.t({hash:'33710f67a0c16d7cbb94d1b2ba10e7a8'}); }catch(x){}
        return;
      }
      if(d.error==='compte_existe'){ $('#ee-exist').hidden=false; $('#ee-mdp').value=''; $('#ee-mdp').focus(); $('#ee-mdp-hint').textContent='Le mot de passe de votre espace existant.'; return; }
      if(d.error==='champs'&&d.champ){
        var map={telephone:'#ee-tel',email:'#ee-email',prenom:'#ee-prenom',nom:'#ee-nom',mot_de_passe:'#ee-mdp',consentement:'#ee-consent'};
        if(map[d.champ]){err($(map[d.champ]),true);$(map[d.champ]).focus();return;}
      }
      var m=$('#ee-err'); m.textContent=EE.message(d); m.hidden=false;
    });
  });

  appliquerType(); aller('adresse',false);
  /* adresse passée dans l'URL (?adresse=…) : on pré-remplit */
  var q=new URLSearchParams(location.search).get('adresse'); if(q){inp.value=q;chercher(q);}
})();
