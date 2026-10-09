/* /mon-espace/ : connexion (lien reçu par e-mail ou mot de passe), estimations, avancement, avis de valeur, photos et documents ;
   après le mandat : offres, comptes rendus de visite, notaire, documents de la vente */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, err=EE.err, C=EE.CONF;
  var out=$('#me-out'), inn=$('#me-in'), load=$('#me-load');
  var qs=new URLSearchParams(location.search);
  var civ='', compte=null, lienPossible=false, TAILLE_MAX=10*1024*1024;
  EE.voirMdp(document);
  $$('[data-ee-txt=conseiller]').forEach(function(e){e.textContent=C.conseiller;});
  $$('[data-ee-lien]').forEach(function(a){var k=a.getAttribute('data-ee-lien');if(C[k])a.href=C[k];});

  function msg(form,txt,ok){var e=$(ok?'.ee-ok':'.ee-err',form);if(!e)return;if(ok){var k=$('.ee-err',form);if(k)k.hidden=true;}else{var o=$('.ee-ok',form);if(o)o.hidden=true;}e.innerHTML=txt||'';e.hidden=!txt;}
  function flash(txt,ok){var f=$('#me-flash');f.className=ok?'ee-ok':'ee-err';f.textContent=txt;f.hidden=!txt;}
  function onglet(t){
    ['cnx','ins','oubli','reinit'].forEach(function(k){$('#me-'+k).hidden=(k!==t);});
    var f=$('#me-'+t), c=f&&f.querySelector('input:not([tabindex="-1"])'); if(c&&t!=='cnx')c.focus({preventScroll:true});
  }
  $$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){onglet(b.getAttribute('data-tab'));});});
  $('#me-oubli-btn').addEventListener('click',function(){$('#mo-email').value=$('#me-email').value;onglet('oubli');});
  $$('[data-civ]').forEach(function(b){b.addEventListener('click',function(){civ=b.getAttribute('data-civ');$$('[data-civ]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});
  var aide='Demandez-le à '+EE.esc(C.conseiller)+' : <a href="tel:'+C.tel+'">'+C.telAffiche+'</a> (appel ou WhatsApp).';

  /* ---------- estimations ---------- */
  var RDV_URL=null, DOSSIERS={};
  /* Avancement : les dix étapes du dossier, celle en cours, et la prochaine (dite par l'agence). */
  function suivi(d){
    var p=d.parcours||[], n=p.length||10, k=0;
    p.forEach(function(e,i){ if(e.etat==='encours'||e.etat==='fait')k=i; });
    var enCours=p[k]||{libelle:d.statut_libelle}, sorti=d.statut==='pause'||d.statut==='close';
    return '<div class="ee-suivi" data-test="suivi">'+
      '<p class="ee-etape"><span>'+(sorti?EE.esc(d.statut_libelle):'Étape '+(k+1)+' sur '+n)+'</span><b data-test="etape">'+EE.esc(enCours.libelle||'')+'</b></p>'+
      '<div class="ee-bar" role="img" aria-label="Étape '+(k+1)+' sur '+n+' : '+EE.esc(enCours.libelle||'')+'">'+p.map(function(e){return '<i class="'+e.etat+'"></i>';}).join('')+'</div>'+
      (d.suite?'<p class="ee-suite" data-test="suite"><b>'+(d.statut==='acte'||sorti?'':'Prochaine étape : ')+'</b>'+EE.esc(d.suite)+'</p>':'')+
      '<details class="ee-frise"><summary>Voir toutes les étapes</summary><ol>'+p.map(function(e){
        return '<li class="'+e.etat+'"'+(e.etat==='encours'?' aria-current="step"':'')+'><span>'+EE.esc(e.libelle)+'</span>'+(e.etat!=='avenir'&&e.le?'<small>'+EE.jour(e.le)+'</small>':'')+'</li>';
      }).join('')+'</ol></details>'+
    '</div>';
  }
  var TYPES={appartement:'Appartement',maison:'Maison',autre:'Bien'};
  function lienFichier(f){return C.api+'/fichier?id='+encodeURIComponent(f.id);}
  function fichier(f){
    var img=/^image\/(jpeg|png|webp)$/.test(f.type);
    return '<li data-fid="'+EE.esc(f.id)+'">'+
      '<a href="'+lienFichier(f)+'"'+(img?' target="_blank" rel="noopener"':' download="'+EE.esc(f.nom)+'"')+'>'+(img?'<img src="'+lienFichier(f)+'" alt="" loading="lazy" width="56" height="56">':'<i aria-hidden="true">'+(f.type==='application/pdf'?'PDF':'DOC')+'</i>')+
      '<span><b>'+EE.esc(f.libelle||f.nom)+'</b><small>'+(f.libelle?EE.esc(f.nom)+' · ':'')+EE.taille(f.taille)+(f.depose_par==='agence'?' · déposé par '+EE.esc(C.conseiller)+(f.cree_le?' le '+EE.jour(f.cree_le):''):'')+'</small></span></a>'+
      (f.depose_par==='client'?'<button type="button" data-suppr="'+EE.esc(f.id)+'" aria-label="Retirer '+EE.esc(f.nom)+'">Retirer</button>':'')+'</li>';
  }
  /* ---------- après le mandat : offres, comptes rendus de visite, notaire (affichés dès qu'il y a quelque chose) ---------- */
  function partOffres(d){
    var l=d.offres||[]; if(!l.length)return '';
    return '<div class="ee-part" data-test="offres"><h4>'+(l.length>1?'Offres reçues':'Offre reçue')+'</h4><ul class="ee-items">'+l.map(function(o){
      return '<li><p class="t"><b class="prix">'+EE.euros(o.montant)+'</b><span class="tag'+(o.statut==='acceptee'?' ok':o.statut==='etude'?' att':'')+'">'+EE.esc(o.statut_libelle)+'</span></p><p class="meta">Reçue le '+EE.jour(o.recue_le)+'</p>'+(o.conditions?'<p class="txt">'+EE.esc(o.conditions)+'</p>':'')+'</li>';
    }).join('')+'</ul></div>';
  }
  function partComptesRendus(d){
    var l=d.comptes_rendus||[]; if(!l.length)return '';
    function un(c){ return '<li><p class="t"><b>Visite du '+EE.esc(EE.jourLong(c.visite_le))+'</b></p><p class="txt">'+EE.esc(c.texte)+'</p></li>'; }
    return '<div class="ee-part" data-test="comptes-rendus"><h4>Comptes rendus de visite <small>'+l.length+'</small></h4><ul class="ee-items">'+l.slice(0,3).map(un).join('')+'</ul>'+
      (l.length>3?'<details class="ee-frise"><summary>Voir les '+(l.length-3>1?(l.length-3)+' comptes rendus précédents':'le compte rendu précédent')+'</summary><ul class="ee-items">'+l.slice(3).map(un).join('')+'</ul></details>':'')+'</div>';
  }
  function partNotaire(d){
    var n=d.notaire; if(!n)return '';
    return '<div class="ee-part" data-test="notaire"><h4>Chez le notaire</h4>'+
      (n.nom||n.coordonnees?'<p class="ee-notaire">'+(n.nom?'<b>'+EE.esc(n.nom)+'</b>':'')+(n.coordonnees?'<span>'+EE.esc(n.coordonnees)+'</span>':'')+'</p>':'')+
      '<div class="ee-frise"><ol>'+(n.etapes||[]).map(function(e){
        return '<li class="'+(e.fait?'fait':'avenir')+'"><span>'+EE.esc(e.libelle)+'</span>'+(e.le?'<small>'+(e.fait?'le ':'prévu le ')+EE.jour(e.le)+'</small>':e.fait?'<small>fait</small>':'')+'</li>';
      }).join('')+'</ol></div></div>';
  }
  function carte(d){
    var rang=(d.parcours||[]).filter(function(e){return e.etat!=='avenir';}).length-1;
    DOSSIERS[d.id]=d;
    var titre=(TYPES[d.type]||'Bien')+(d.surface?' · '+d.surface+' m²':'')+(d.pieces?' · '+d.pieces+' p.':'');
    var avis=(d.fichiers||[]).filter(function(f){return f.role==='avis';}), autres=(d.fichiers||[]).filter(function(f){return f.role!=='avis'&&f.depose_par!=='agence';});
    var docs=(d.fichiers||[]).filter(function(f){return f.role!=='avis'&&f.depose_par==='agence';});
    return '<article class="ee-card" data-id="'+d.id+'">'+
      '<div><h3>'+EE.esc(titre)+'</h3><p class="meta">'+EE.esc(d.adresse||d.commune||'')+'</p></div>'+
      (d.prix_bas?'<div><p class="fp">'+EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+'</p><p class="meta">Environ '+EE.euros(d.prix_m2)+'/m² · '+d.comparables+' ventes comparables'+(d.rayon?' à moins de '+EE.rayon(d.rayon):'')+(d.donnees_du?' · données à jour de '+EE.mois(d.donnees_du):'')+' · indicatif, à confirmer par une visite</p></div>'
        :'<div><p class="fp fp-txt">Étude personnalisée</p><p class="meta">'+EE.esc(C.conseiller)+' étudie votre bien lui-même et vous rappelle.</p></div>')+
      suivi(d)+
      '<div class="ee-rdv" data-rdv="'+d.id+'" hidden></div>'+
      (avis.length?'<div class="ee-avis">'+avis.map(function(f){return '<a class="btn btn-primary" href="'+lienFichier(f)+'" download="'+EE.esc(f.nom)+'">Télécharger mon avis de valeur (PDF) <span class="arw">↓</span></a>';}).join('')+'</div>'
        :rang>=3&&d.statut!=='close'&&d.statut!=='pause'?'<p class="meta">Votre avis de valeur vous a été remis ; il sera aussi déposé ici.</p>':'')+
      partOffres(d)+partComptesRendus(d)+partNotaire(d)+
      (docs.length?'<div class="ee-part" data-test="documents"><h4>Documents de votre vente</h4><ul class="ee-flist">'+docs.map(fichier).join('')+'</ul></div>':'')+
      '<div class="ee-files"><p class="lab">'+(docs.length?'Vos photos et documents':'Photos et documents')+'</p>'+
        '<ul class="ee-flist">'+autres.map(fichier).join('')+'</ul>'+
        '<label class="btn ee-add"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" data-ajout="'+d.id+'">Ajouter des photos ou des documents</label>'+
        '<p class="hint">Photos (JPEG, PNG, HEIC) ou PDF, 10 Mo au plus par fichier. Seuls '+EE.esc(C.conseiller)+' et l\'agence les voient.</p>'+
        '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>'+
      '<p class="meta">Réf. '+EE.esc(d.reference)+' · le '+EE.date(d.cree_le)+(d.statut==='close'?' · dossier clos':'')+'</p>'+
    '</article>';
  }
  function afficher(d){
    load.hidden=true;
    lienPossible=d.email!==false;
    if(d.taille_max)TAILLE_MAX=d.taille_max;
    compte=d.compte||null;
    EE.pictogramme();
    if(!compte){
      out.hidden=false; inn.hidden=true;
      etape('email');
      if(qs.get('email')&&!$('#me-email').value)$('#me-email').value=qs.get('email');
      if(qs.get('reinit'))onglet('reinit'); else if(qs.get('oubli'))onglet('oubli'); else onglet('cnx');
      if(qs.get('verifie')==='0')flash('Ce lien de confirmation n\'est plus valable. Connectez-vous pour en recevoir un nouveau.');
      return;
    }
    var c=compte;
    out.hidden=true; inn.hidden=false;
    $('#me-titre').innerHTML=(c.prenom?'Bonjour '+EE.esc(c.prenom)+', <em>voici votre espace.</em>':'Bonjour, <em>voici votre espace.</em>');
    $('#me-lede').textContent=d.demandes.length?'Vos estimations et l\'avancement de chaque dossier.':'Vous n\'avez pas encore d\'estimation.';
    RDV_URL=d.rdv_url||null; DOSSIERS={};
    $('#me-bonjour').textContent=d.demandes.length+' estimation'+(d.demandes.length>1?'s':'');
    $('#me-cards').innerHTML=d.demandes.length?d.demandes.map(carte).join(''):'<div class="ee-empty"><p style="margin:0;">Deux minutes suffisent pour connaître la fourchette de prix de votre bien.</p><a class="btn btn-primary" href="'+C.estimer+'">Estimer mon bien <span class="arw">→</span></a></div>';
    // visite d'estimation : choisir, voir ou déplacer son créneau, dans chaque dossier
    $$('#me-cards [data-rdv]').forEach(function(z){
      var x=DOSSIERS[z.getAttribute('data-rdv')]; if(!x)return;
      EE.visite(z,{demande:x.id,visite:x.visite,possible:!!x.visite_possible,rdvUrl:RDV_URL,email:lienPossible,onChange:function(r){
        x.visite=r.visite; if(r.suite){x.suite=r.suite;var t=$('[data-test=suite]',z.closest('.ee-card'));if(t)t.innerHTML='<b>Prochaine étape : </b>'+EE.esc(r.suite);}
      }});
    });
    $('#me-infos').innerHTML=[['Nom',[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ')],['E-mail',c.email+(c.verifie?' (confirmé)':'')],['Téléphone',c.telephone||'—'],['Mot de passe',c.mot_de_passe?'défini':'aucun (connexion par lien)'],['Espace créé le',EE.date(c.cree_le)]].map(function(l){return '<li><span>'+l[0]+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('');
    $('#me-admin').hidden=!c.admin;
    $('#me-mdp-btn').textContent=c.mot_de_passe?'Changer mon mot de passe':'Choisir un mot de passe';
    $('#me-verif').hidden=!!c.verifie||!lienPossible;
    var att=$('#me-attente'); att.hidden=!d.en_attente;
    if(d.en_attente){
      $('p',att).innerHTML='<b>'+d.en_attente+' estimation'+(d.en_attente>1?'s attendent':' attend')+' la confirmation de votre e-mail</b> (faite'+(d.en_attente>1?'s':'')+' sans être connecté). '+
        (lienPossible?'<button type="button" class="ee-skip" id="me-att-btn">Recevoir le lien de confirmation</button>':'Un lien de connexion suffit pour la faire apparaître. '+aide);
      var ab=$('#me-att-btn'); if(ab)ab.addEventListener('click',function(){ab.disabled=true;EE.api('/lien',{body:{email:c.email}}).then(function(r){ab.textContent=r.envoye?'Lien envoyé : ouvrez-le depuis votre boîte e-mail':'Envoi impossible pour le moment';});});
    }
    if(qs.get('verifie')==='1')$('#me-verif-ok').hidden=false;
    if(qs.get('verifie')||qs.get('reinit')||qs.get('lien')||qs.get('email'))history.replaceState(null,'',location.pathname);
  }
  function charger(){ return EE.api('/moi').then(function(d){ if(d._status!==200){load.hidden=true;out.hidden=false;onglet('cnx');msg($('#me-cnx'),EE.message(d));return;} afficher(d); }); }

  /* ---------- connexion en deux temps : l'e-mail, puis le mot de passe (s'il y en a un) ou le lien envoyé ---------- */
  var etapeCnx='email', emailCnx='';
  var SOUS={email:'Indiquez l\'e-mail donné le jour de votre estimation.',mdp:'Votre espace est protégé par un mot de passe.',envoye:''};
  function etape(t){
    var f=$('#me-cnx'), b=$('#me-cnx-btn');
    etapeCnx=t; msg(f,'');
    $('#me-email-f').hidden=(t==='envoye');
    $('#me-mdp-f').hidden=(t!=='mdp');
    $('#me-envoye').hidden=(t!=='envoye');
    $('#me-cnx-nav').hidden=(t==='envoye');
    $('#me-lien-btn').hidden=(t!=='mdp');
    $('#me-cnx-sub').textContent=SOUS[t];
    $('#me-cnx-sub').hidden=!SOUS[t];
    b.innerHTML=t==='mdp'?'Me connecter <span class="arw">→</span>':'Continuer <span class="arw">→</span>';
    err($('#me-mdp'),false);
    if(t==='mdp'){ $('#me-mdp').value=''; $('#me-mdp').focus({preventScroll:true}); }
    if(t==='envoye'){ $('#me-envoye-a').textContent=emailCnx.toLowerCase(); }
  }
  function emailSaisi(){ var m=$('#me-email'); m.value=m.value.replace(/\s+/g,''); return err(m,!EE.emailOk(m.value))?m.value:null; }
  var sansEnvoi='L\'envoi de liens par e-mail n\'est pas encore ouvert. Votre espace s\'ouvre avec un lien de connexion : '+aide;
  function lien(b){
    var f=$('#me-cnx');
    if(!emailCnx){ emailCnx=emailSaisi(); if(!emailCnx){$('#me-email').focus();return;} }
    msg(f,''); if(b)b.disabled=true;
    EE.api('/lien',{body:{email:emailCnx,site:C.site||undefined}}).then(function(d){
      if(b)b.disabled=false;
      if(d._status!==200){msg(f,EE.messageChamp(d));return;}
      if(!d.envoye){msg(f,sansEnvoi);return;}
      var deja=etapeCnx==='envoye'; etape('envoye');
      if(deja)msg(f,'Nouveau lien envoyé. Seul le dernier reçu fonctionne.',true);
    });
  }
  $('#me-email').addEventListener('input',function(){ if(etapeCnx==='mdp'&&this.value.replace(/\s+/g,'').toLowerCase()!==emailCnx.toLowerCase())etape('email'); });
  $('#me-lien-btn').addEventListener('click',function(){ emailCnx=emailSaisi()||''; if(!emailCnx){$('#me-email').focus();return;} lien(this); });
  $('#me-renvoi').addEventListener('click',function(){ lien(this); });
  $('#me-autre').addEventListener('click',function(){ emailCnx=''; etape('email'); var m=$('#me-email'); m.focus(); m.select(); });
  $('#me-cnx').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, b=$('#me-cnx-btn');
    var adr=emailSaisi(); if(!adr){$('#me-email').focus();return;}
    emailCnx=adr; msg(f,'');
    if(etapeCnx!=='mdp'){
      b.disabled=true;
      EE.api('/acces',{body:{email:adr,site:C.site||undefined}}).then(function(d){
        b.disabled=false;
        if(d._status!==200){msg(f,EE.messageChamp(d));return;}
        if(d.etape==='mot_de_passe'){etape('mdp');return;}
        if(d.envoye){etape('envoye');return;}
        msg(f,sansEnvoi);
      });
      return;
    }
    if(!err($('#me-mdp'),!$('#me-mdp').value)){$('#me-mdp').focus();return;}
    b.disabled=true;
    EE.api('/connexion',{body:{email:adr,mot_de_passe:$('#me-mdp').value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){ $('#me-mdp').value=''; charger(); window.scrollTo({top:0}); return; }
      if(d.error==='sans_mot_de_passe'){ msg(f,'Cet espace n\'a pas de mot de passe : il s\'ouvre avec un lien. Cliquez sur « Recevoir plutôt un lien par e-mail ».'); return; }
      if(d.error==='identifiants'){ msg(f,'Mot de passe incorrect. Réessayez, ou recevez plutôt un lien par e-mail.'); return; }
      msg(f,EE.messageChamp(d));
    });
  });
  /* ---------- création sans estimation ---------- */
  $('#me-ins').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, ok=true; $('#mi-email').value=$('#mi-email').value.replace(/\s+/g,'');
    ok=err($('#mi-prenom'),!$('#mi-prenom').value.trim())&&ok; ok=err($('#mi-nom'),!$('#mi-nom').value.trim())&&ok;
    ok=err($('#mi-email'),!EE.emailOk($('#mi-email').value))&&ok;
    ok=err($('#mi-tel'),!EE.telOk($('#mi-tel').value))&&ok;
    ok=err($('#mi-mdp'),$('#mi-mdp').value.trim().length<8)&&ok; ok=err($('#mi-consent'),!$('#mi-consent').checked)&&ok;
    if(!ok){var k=f.querySelector('.field.err input');if(k)k.focus();return;} msg(f,''); var b=$('[type=submit]',f); b.disabled=true;
    EE.api('/inscription',{body:{civilite:civ,prenom:$('#mi-prenom').value.trim(),nom:$('#mi-nom').value.trim(),email:$('#mi-email').value.trim(),telephone:$('#mi-tel').value.trim(),mot_de_passe:$('#mi-mdp').value,consentement:true,ee_hp:$('#me-hp').value,site:C.site||undefined}}).then(function(d){
      b.disabled=false; if(d._status===201){charger();window.scrollTo({top:0});} else msg(f,d.error==='compte_existe'?'Un espace existe déjà avec cet e-mail : connectez-vous.':EE.messageChamp(d));
    });
  });
  /* ---------- mot de passe oublié ---------- */
  $('#me-oubli').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, m=$('#mo-email'); m.value=m.value.replace(/\s+/g,''); if(!err(m,!EE.emailOk(m.value)))return;
    msg(f,'');
    EE.api('/mot-de-passe/oubli',{body:{email:m.value,site:C.site||undefined}}).then(function(d){
      if(d._status!==200){msg(f,EE.messageChamp(d));return;}
      if(d.envoye)msg(f,'Si un espace existe avec cette adresse, un lien vient d\'y être envoyé (pensez aux indésirables). Il est valable 1 heure.',true);
      else msg(f,'L\'envoi de liens par e-mail n\'est pas encore ouvert. '+aide+' Il vous envoie un lien pour choisir un nouveau mot de passe.');
    });
  });
  /* ---------- nouveau mot de passe (lien reçu) ---------- */
  $('#me-reinit').addEventListener('submit',function(e){
    e.preventDefault(); var f=this; if(!err($('#mr-mdp'),$('#mr-mdp').value.trim().length<8))return;
    EE.api('/mot-de-passe/reinit',{body:{jeton:qs.get('reinit'),mot_de_passe:$('#mr-mdp').value}}).then(function(d){
      if(d._status===200){history.replaceState(null,'',location.pathname);qs=new URLSearchParams();charger();} else msg(f,EE.messageChamp(d));
    });
  });

  /* ---------- connecté ---------- */
  $('#me-logout').addEventListener('click',function(){EE.api('/deconnexion',{body:{}}).then(function(){location.href=C.espace;});});
  $('#me-verif-btn').addEventListener('click',function(){var b=this;b.disabled=true;EE.api('/verification',{body:{}}).then(function(d){b.textContent=d.envoye?'Lien envoyé':'Envoi impossible pour le moment';});});
  /* choisir ou changer son mot de passe */
  $('#me-mdp-btn').addEventListener('click',function(){
    var f=$('#me-mdp-form'); f.hidden=false; $('#me-mdp-ok').hidden=true; msg(f,'');
    $('#mp-actuel-f').hidden=!compte.mot_de_passe;
    $('#me-mdp-titre').innerHTML=compte.mot_de_passe?'Changer <em>mon mot de passe</em>':'Choisir <em>un mot de passe</em>';
    $('#me-mdp-sub').textContent=compte.mot_de_passe?'Les autres appareils connectés seront déconnectés.':'Facultatif : il permet de vous connecter sans attendre un e-mail.';
    (compte.mot_de_passe?$('#mp-actuel'):$('#mp-mdp')).focus();
  });
  $('#me-mdp-annule').addEventListener('click',function(){$('#me-mdp-form').hidden=true;});
  $('#me-mdp-form').addEventListener('submit',function(e){
    e.preventDefault(); var f=this;
    if(!err($('#mp-mdp'),$('#mp-mdp').value.trim().length<8)){$('#mp-mdp').focus();return;}
    var b=$('[type=submit]',f); b.disabled=true; msg(f,'');
    EE.api('/mot-de-passe/definir',{body:{mot_de_passe:$('#mp-mdp').value,actuel:$('#mp-actuel').value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){ $('#mp-mdp').value='';$('#mp-actuel').value=''; f.hidden=true; $('#me-mdp-ok').hidden=false; charger(); return; }
      msg(f,d.error==='identifiants'?'Le mot de passe actuel est incorrect.':EE.messageChamp(d));
    });
  });
  /* suppression du compte */
  function modeSuppr(parMdp){ $('#md-mdp-f').hidden=!parMdp; $('#md-conf-f').hidden=parMdp; }
  $('#me-del-btn').addEventListener('click',function(){$('#me-del').hidden=false;modeSuppr(!!compte.mot_de_passe);(compte.mot_de_passe?$('#md-mdp'):$('#md-conf')).focus();});
  $('#me-del-annule').addEventListener('click',function(){$('#me-del').hidden=true;});
  $('#me-del').addEventListener('submit',function(e){
    e.preventDefault(); var f=this;
    EE.api('/compte/supprimer',{body:{mot_de_passe:$('#md-mdp').value,confirmation:$('#md-conf').value}}).then(function(d){
      if(d._status===200){location.href='/';return;}
      if(d.error==='champs'&&d.champ==='confirmation'){modeSuppr(false);err($('#md-conf'),true);$('#md-conf').focus();return;}
      msg(f,d.error==='identifiants'?'Mot de passe incorrect.':EE.messageChamp(d));
    });
  });

  /* ---------- photos et documents ---------- */
  // Les grandes photos sont allégées dans le navigateur avant l'envoi (2 400 px au plus) : plus rapide, même en 4G.
  function alleger(file){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<1500000||!window.createImageBitmap)return Promise.resolve(file);
    return createImageBitmap(file).then(function(bmp){
      var r=Math.min(1,2400/Math.max(bmp.width,bmp.height)), c=document.createElement('canvas');
      c.width=Math.round(bmp.width*r); c.height=Math.round(bmp.height*r);
      c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
      return new Promise(function(res){ c.toBlob(function(b){res(b&&b.size<file.size?b:file);},'image/jpeg',0.85); });
    }).catch(function(){return file;});
  }
  $('#me-cards').addEventListener('change',function(e){
    var input=e.target.closest('[data-ajout]'); if(!input||!input.files||!input.files.length)return;
    var card=input.closest('.ee-card'), zone=$('.ee-files',card), liste=$('.ee-flist',zone), id=input.getAttribute('data-ajout');
    var fichiers=Array.prototype.slice.call(input.files), n=0, erreurs=[], lab=input.parentNode;
    msg(zone,''); lab.classList.add('busy'); input.disabled=true;
    function suite(){
      if(n>=fichiers.length){
        lab.classList.remove('busy'); input.disabled=false; input.value='';
        if(erreurs.length)msg(zone,erreurs.map(EE.esc).join('<br>'));
        else msg(zone,fichiers.length>1?fichiers.length+' fichiers ajoutés.':'Fichier ajouté.',true);
        return;
      }
      var f=fichiers[n++];
      msg(zone,'Envoi '+n+' sur '+fichiers.length+'…',true);
      alleger(f).then(function(b){
        if(b.size>TAILLE_MAX){erreurs.push(f.name+' : plus de 10 Mo.');return suite();}
        return EE.api('/fichier?demande='+id+'&role='+(f.type==='application/pdf'?'document':'photo'),{fichier:b,nom:f.name,delai:120000}).then(function(d){
          if(d._status===201)liste.insertAdjacentHTML('beforeend',fichier(d.fichier));
          else erreurs.push(f.name+' : '+EE.message(d));
          suite();
        });
      });
    }
    suite();
  });
  $('#me-cards').addEventListener('click',function(e){
    var b=e.target.closest('[data-suppr]'); if(!b)return;
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer';return;}
    b.disabled=true;
    EE.api('/fichier/supprimer',{body:{id:b.getAttribute('data-suppr')}}).then(function(d){ if(d._status===200){var li=b.closest('li');li.parentNode.removeChild(li);} else {b.disabled=false;b.textContent=EE.message(d);} });
  });

  /* ---------- arrivée par un lien de connexion (?lien=…) : la page l'échange contre une session ---------- */
  if(qs.get('lien')){
    EE.api('/lien/ouvrir',{body:{jeton:qs.get('lien')}}).then(function(d){
      history.replaceState(null,'',location.pathname);
      var ok=d._status===200;
      qs=new URLSearchParams();
      charger().then(function(){
        if(ok&&d.mot_de_passe_retire){var n=$('#me-mdp-ok');n.textContent='Votre adresse e-mail est confirmée. Par sécurité, le mot de passe choisi avant cette confirmation a été retiré : vous pouvez en choisir un nouveau ci-dessous.';n.hidden=false;}
        if(!ok&&!compte)flash(d.error==='jeton'?'Ce lien de connexion n\'est plus valable : il dure 30 minutes et ne sert qu\'une fois. Demandez-en un nouveau ci-dessous.':EE.message(d));
      });
    });
  } else charger();
})();
