/* /mon-espace/ : connexion, création, mot de passe oublié, estimations et avancement */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$;
  var out=$('#me-out'), inn=$('#me-in'), load=$('#me-load');
  var qs=new URLSearchParams(location.search);
  var mailOk=true, civ='';
  EE.voirMdp(document);

  function err(el,on){var f=el.closest('.field');if(f)f.classList.toggle('err',!!on);return !on;}
  function msg(form,txt,ok){var e=$(ok?'.ee-ok':'.ee-err',form);if(!e)return;e.textContent=txt||'';e.hidden=!txt;}
  function onglet(t){
    ['cnx','ins','oubli','reinit'].forEach(function(k){$('#me-'+k).hidden=(k!==t);});
    $$('.ee-tabs [data-tab]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-tab')===t));});
    $('.ee-tabs').hidden=(t==='oubli'||t==='reinit');
  }
  $$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){onglet(b.getAttribute('data-tab'));});});
  $('#me-oubli-btn').addEventListener('click',function(){$('#mo-email').value=$('#me-email').value;onglet('oubli');});
  $$('[data-civ]').forEach(function(b){b.addEventListener('click',function(){civ=b.getAttribute('data-civ');$$('[data-civ]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});

  var ETAPES=[['recue','Demande reçue'],['visite','Visite prévue'],['avis','Avis de valeur envoyé']];
  var TYPES={appartement:'Appartement',maison:'Maison',autre:'Bien'};
  function carte(d){
    var rang={recue:0,visite:1,avis:2,close:2}[d.statut]||0;
    var titre=(TYPES[d.type]||'Bien')+(d.surface?' · '+d.surface+' m²':'')+(d.pieces?' · '+d.pieces+' p.':'');
    return '<article class="ee-card">'+
      '<div><h3>'+EE.esc(titre)+'</h3><p class="meta">'+EE.esc(d.adresse||d.commune||'')+'</p></div>'+
      (d.prix_bas?'<div><p class="fp">'+EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+'</p><p class="meta">Environ '+EE.euros(d.prix_m2)+'/m² · '+d.comparables+' ventes comparables · indicatif, à confirmer par une visite</p></div>'
        :'<div><p class="fp" style="font-size:1.3rem;">Étude personnalisée</p><p class="meta">Shawez étudie votre bien lui-même et vous rappelle.</p></div>')+
      '<ol class="ee-tl" aria-label="Avancement">'+ETAPES.map(function(e,k){return '<li class="'+(k<=rang?'done':'')+'"'+(k===rang?' aria-current="step"':'')+'>'+e[1]+'</li>';}).join('')+'</ol>'+
      '<p class="meta">Réf. '+EE.esc(d.reference)+' · le '+EE.date(d.cree_le)+(d.statut==='close'?' · dossier clos':'')+'</p>'+
    '</article>';
  }
  function afficher(d){
    load.hidden=true;
    mailOk=d.email!==false;
    if(!d.compte){
      out.hidden=false; inn.hidden=true;
      if(qs.get('reinit'))onglet('reinit'); else if(qs.get('oubli'))onglet('oubli'); else onglet('cnx');
      if(qs.get('verifie')==='0'){var f=$('#me-flash');f.className='ee-err';f.textContent='Ce lien de confirmation n\'est plus valable. Connectez-vous pour en recevoir un nouveau.';f.hidden=false;}
      return;
    }
    var c=d.compte;
    out.hidden=true; inn.hidden=false;
    $('#me-titre').innerHTML='Bonjour '+EE.esc(c.prenom||'')+', <em>voici votre espace.</em>';
    $('#me-lede').textContent=d.demandes.length?'Vos estimations et l\'avancement de chaque dossier.':'Vous n\'avez pas encore d\'estimation.';
    $('#me-bonjour').textContent=d.demandes.length+' estimation'+(d.demandes.length>1?'s':'');
    $('#me-cards').innerHTML=d.demandes.length?d.demandes.map(carte).join(''):'<div class="ee-empty"><p style="margin:0;">Deux minutes suffisent pour connaître la fourchette de prix de votre bien.</p><a class="btn btn-primary" href="/estimer/">Estimer mon bien <span class="arw">→</span></a></div>';
    $('#me-infos').innerHTML=[['Nom',[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ')],['E-mail',c.email+(c.verifie?'':' (non confirmé)')],['Téléphone',c.telephone||'—'],['Espace créé le',EE.date(c.cree_le)]].map(function(l){return '<li><span>'+l[0]+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('');
    $('#me-admin').hidden=!c.admin;
    $('#me-verif').hidden=!!c.verifie||!mailOk;
    if(qs.get('verifie')==='1')$('#me-verif-ok').hidden=false;
    if(qs.get('verifie')||qs.get('reinit'))history.replaceState(null,'',location.pathname);
  }
  function charger(){ EE.api('/moi').then(function(d){ if(d._status!==200){load.hidden=true;out.hidden=false;onglet('cnx');msg($('#me-cnx'),EE.message(d));return;} afficher(d); }); }

  /* connexion */
  $('#me-cnx').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, ok=true;
    ok=err($('#me-email'),!$('#me-email').value.trim())&&ok; ok=err($('#me-mdp'),!$('#me-mdp').value)&&ok; if(!ok)return;
    msg(f,''); var b=$('[type=submit]',f); b.disabled=true;
    EE.api('/connexion',{body:{email:$('#me-email').value.trim(),mot_de_passe:$('#me-mdp').value}}).then(function(d){
      b.disabled=false; if(d._status===200){ $('#me-mdp').value=''; charger(); window.scrollTo({top:0}); } else msg(f,EE.message(d));
    });
  });
  /* création */
  $('#me-ins').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, ok=true;
    ok=err($('#mi-prenom'),!$('#mi-prenom').value.trim())&&ok; ok=err($('#mi-nom'),!$('#mi-nom').value.trim())&&ok;
    ok=err($('#mi-email'),!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test($('#mi-email').value.trim()))&&ok;
    ok=err($('#mi-tel'),$('#mi-tel').value.replace(/\D/g,'').length<9)&&ok;
    ok=err($('#mi-mdp'),$('#mi-mdp').value.length<8)&&ok; ok=err($('#mi-consent'),!$('#mi-consent').checked)&&ok;
    if(!ok)return; msg(f,''); var b=$('[type=submit]',f); b.disabled=true;
    EE.api('/inscription',{body:{civilite:civ,prenom:$('#mi-prenom').value.trim(),nom:$('#mi-nom').value.trim(),email:$('#mi-email').value.trim(),telephone:$('#mi-tel').value.trim(),mot_de_passe:$('#mi-mdp').value,consentement:true,website:$('#me-website').value}}).then(function(d){
      b.disabled=false; if(d._status===201){charger();window.scrollTo({top:0});} else msg(f,d.error==='compte_existe'?'Un espace existe déjà avec cet e-mail : connectez-vous.':EE.message(d));
    });
  });
  /* oubli */
  $('#me-oubli').addEventListener('submit',function(e){
    e.preventDefault(); var f=this; if(!err($('#mo-email'),!$('#mo-email').value.trim()))return;
    msg(f,''); msg(f,'',true);
    EE.api('/mot-de-passe/oubli',{body:{email:$('#mo-email').value.trim()}}).then(function(d){
      if(d._status!==200){msg(f,EE.message(d));return;}
      if(d.envoye)msg(f,'Si un espace existe avec cette adresse, un lien vient d\'y être envoyé (pensez aux indésirables). Il est valable 1 heure.',true);
      else msg(f,'Appelez ou écrivez à Shawez (07 67 57 92 28, WhatsApp ou shawez@gravelin-immo.com) : il vous envoie un lien pour choisir un nouveau mot de passe.');
    });
  });
  /* réinitialisation */
  $('#me-reinit').addEventListener('submit',function(e){
    e.preventDefault(); var f=this; if(!err($('#mr-mdp'),$('#mr-mdp').value.length<8))return;
    EE.api('/mot-de-passe/reinit',{body:{jeton:qs.get('reinit'),mot_de_passe:$('#mr-mdp').value}}).then(function(d){
      if(d._status===200){history.replaceState(null,'',location.pathname);qs=new URLSearchParams();charger();} else msg(f,EE.message(d));
    });
  });
  /* connecté */
  $('#me-logout').addEventListener('click',function(){EE.api('/deconnexion',{body:{}}).then(function(){location.href='/mon-espace/';});});
  $('#me-verif-btn').addEventListener('click',function(){var b=this;b.disabled=true;EE.api('/verification',{body:{}}).then(function(d){b.textContent=d.envoye?'Lien envoyé':'Envoi impossible pour le moment';});});
  $('#me-del-btn').addEventListener('click',function(){$('#me-del').hidden=false;$('#md-mdp').focus();});
  $('#me-del-annule').addEventListener('click',function(){$('#me-del').hidden=true;});
  $('#me-del').addEventListener('submit',function(e){
    e.preventDefault(); var f=this;
    EE.api('/compte/supprimer',{body:{mot_de_passe:$('#md-mdp').value}}).then(function(d){
      if(d._status===200){location.href='/';} else msg(f,EE.message(d));
    });
  });
  charger();
})();
