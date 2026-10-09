/* /admin/ : toutes les demandes des deux sites et tous les comptes ; statut, rappel, notes, fichiers, export CSV ;
   visite d'estimation, avis de valeur ; après le mandat : comptes rendus de visite, offres, documents, notaire */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, C=EE.CONF;
  var D=[], Cp=[], STATUTS={}, TAILLE_MAX=10*1024*1024, MAIL_CLIENTS=false, AVIS={}, SUITE={}, OFFRES={}, DOCS={}, AUJ='';
  $$('[data-ee-lien]').forEach(function(a){var k=a.getAttribute('data-ee-lien');if(C[k])a.href=C[k];});
  $('#ad-export').href=C.api+'/admin/export.csv?quoi=demandes'; $('#ad-export-c').href=C.api+'/admin/export.csv?quoi=comptes';
  var LIB={
    delai:{asap:'Dès que possible','6mois':'Dans les 6 mois',plus6mois:'Plus de 6 mois',nsp:'Ne sait pas',aucun:'Pas de projet'},
    etat:{travaux:'Travaux importants',rafraichir:'Quelques travaux',bon:'Bon état',neuf:'Refait à neuf'},
    epoque:{avant1948:'Avant 1948','1948-1974':'1948 – 1974','1975-2000':'1975 – 2000','2001-2012':'2001 – 2012',apres2012:'Après 2012',nsp:'Ne sait pas'},
    autre_type:{commerce:'Fonds de commerce',murs:'Murs commerciaux',immeuble:'Immeuble',terrain:'Terrain',autre:'Autre'},
    site:{shawez:'shawez-immo.com',gravelin:'gravelin-immo.com'}
  };
  function fiche(r){
    var L=[];
    function a(k,v){if(v!==''&&v!=null&&v!==false)L.push([k,v===true?'oui':String(v)]);}
    a('Type',r.type==='autre'?LIB.autre_type[r.autre_type]:r.type==='maison'?'Maison':'Appartement');
    a('Adresse',r.adresse); a('Surface',r.surface?r.surface+' m²':''); a('Pièces',r.pieces); a('Chambres',r.chambres);
    if(r.type==='appartement'){a('Étage',r.etage===0?'RDC':r.etage);a('Étages immeuble',r.etages_immeuble);}
    if(r.type==='maison'){a('Terrain',r.terrain!=null?r.terrain+' m²':'');a('Niveaux',r.niveaux);}
    a('Époque',LIB.epoque[r.epoque]); a('État',LIB.etat[r.etat]);
    a('Atouts',['ascenseur','balcon','terrasse','cave','gardien','parking','parking_box','plain_pied','piscine','garage'].filter(function(k){return r[k];}).map(function(k){return {parking_box:'garage/box',plain_pied:'plain-pied'}[k]||k;}).join(', '));
    a('Prix idéal',r.prix_ideal?EE.euros(r.prix_ideal):''); a('Délai',LIB.delai[r.delai]); a('Message',r.message);
    return L;
  }
  function lienFichier(f){return C.api+'/fichier?id='+encodeURIComponent(f.id);}
  function fichier(f){
    return '<li data-fid="'+EE.esc(f.id)+'"><a href="'+lienFichier(f)+'" target="_blank" rel="noopener"><i aria-hidden="true">'+(f.role==='avis'?'AVIS':f.type==='application/pdf'?'PDF':'IMG')+'</i><span><b>'+EE.esc(f.nom)+'</b><small>'+EE.taille(f.taille)+' · '+(f.role==='avis'?'avis de valeur, visible par le vendeur':f.role==='brouillon'?'brouillon, invisible pour le vendeur':f.depose_par==='client'?'déposé par le client':(f.libelle?EE.esc(f.libelle)+' · ':'')+'déposé par l\'agence, visible par le vendeur')+' · '+EE.jour(f.cree_le)+'</small></span></a><button type="button" data-fsuppr="'+EE.esc(f.id)+'" aria-label="Retirer '+EE.esc(f.nom)+'">Retirer</button></li>';
  }
  function retard(d){ return !!(d.action&&d.action.retard); }
  function echeance(iso){ if(!iso)return ''; var j=EE.quandCourt(iso); return j; }
  function actionTxt(d){ var a=d.action||{}; if(!a.texte)return ''; return a.texte+(a.echeance?' · '+(a.rdv?'':a.retard?'en retard depuis ':'avant ')+echeance(a.echeance):''); }
  /* bloc « Visite d'estimation » d'un dossier : créneaux proposés par le vendeur, date fixée, agenda */
  function blocVisite(d){
    var v=d.visite, h='<div class="ee-bloc" data-bloc="visite"><p class="lab">Visite d\'estimation</p>';
    if(v&&v.etat==='fixee'&&v.debut){
      h+='<p class="ee-note" data-test="visite-fixee"><b>'+EE.esc(EE.quand(v.debut))+'</b> · '+(v.duree||45)+' min · chez le vendeur</p>'+
        '<div class="acts">'+(v.agenda?'<a class="btn" href="'+EE.esc(v.agenda)+'" target="_blank" rel="noopener" data-test="agenda">Ajouter à mon agenda Google</a>':'')+'<button type="button" class="btn" data-vannuler>Annuler la visite</button></div>';
    } else if(v&&v.etat==='demandee'){
      h+='<p class="hint">Créneaux proposés par le vendeur'+(v.demandee_le?' le '+EE.esc(EE.quandCourt(v.demandee_le)):'')+' : un clic confirme.</p>'+
        '<div class="acts">'+(v.creneaux||[]).map(function(c){return '<button type="button" class="btn btn-primary" data-vfix="'+EE.esc(c)+'">Confirmer '+EE.esc(EE.quandCourt(c))+'</button>';}).join('')+'</div>';
    } else h+='<p class="hint">Aucune visite fixée. Le vendeur peut proposer ses créneaux depuis son espace ; vous pouvez aussi fixer la date convenue au téléphone.</p>';
    h+='<div class="field"><label for="ad-vd-'+d.id+'">'+(v&&v.etat==='fixee'?'Déplacer au':'Autre date (heure de Paris)')+'</label><input type="datetime-local" id="ad-vd-'+d.id+'" data-vdate step="900"></div>'+
      '<label class="ee-check-l"><input type="checkbox" data-vprevenir'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Envoyer la confirmation au vendeur par e-mail':'E-mails aux vendeurs pas encore ouverts : prévenez-le par téléphone')+'</label>'+
      '<div class="acts"><button type="button" class="btn" data-vfixdate>Fixer la visite</button></div>'+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>';
    return h;
  }
  function blocAvis(d){
    var a=d.avis;
    return '<div class="ee-bloc" data-bloc="avis"><p class="lab">Avis de valeur</p>'+
      '<p class="hint" data-avis-etat>'+(a&&a.valide_le?'Envoyé au vendeur le '+EE.jour(a.valide_le)+'.':a&&a.prepare_le?'Brouillon commencé le '+EE.jour(a.prepare_le)+'.':'PDF à la charte, avec les ventes réelles du quartier. Vous complétez vos notes, vous validez : il part dans l\'espace du vendeur.')+'</p>'+
      '<div class="acts"><button type="button" class="btn btn-primary" data-avis-ouvrir>'+(a&&a.prepare_le?'Reprendre l\'avis de valeur':'Préparer l\'avis de valeur')+'</button></div>'+
      '<div class="ee-avis-ed" data-avis-ed hidden></div></div>';
  }
  function ligne(d){
    var c=d.contact||{}, nom=[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ');
    var opts=Object.keys(STATUTS).map(function(k){return '<option value="'+k+'"'+(k===d.statut?' selected':'')+'>'+EE.esc(STATUTS[k])+'</option>';}).join('');
    var tel=String(c.telephone||'').replace(/[^\d+]/g,'');
    return '<details class="ee-row" data-id="'+d.id+'"><summary><b>'+EE.esc(nom||c.email)+' · '+EE.esc(d.commune||'')+'</b>'+
      '<span class="st '+d.statut+'">'+EE.esc(STATUTS[d.statut]||d.statut)+'</span>'+
      (actionTxt(d)?'<span class="act'+(retard(d)?' ee-late':'')+'" data-test="action">→ '+EE.esc(actionTxt(d))+'</span>':'')+
      '<small>'+EE.date(d.cree_le)+' · '+EE.esc((d.type==='autre'?'Autre':d.type==='maison'?'Maison':'Appart.')+(d.surface?' '+d.surface+' m²':''))+' · '+(d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut):'rappel')+' · '+EE.esc(LIB.site[d.site]||d.site||'')+
        (d.rappel_le?' · rappeler avant le '+EE.jour(d.rappel_le):'')+(d.suspect?' · <span class="ee-late">robot possible</span>':'')+(d.test?' · essai':'')+'</small></summary>'+
      '<div class="in">'+
        '<div class="acts ee-top"><a class="btn btn-primary" href="tel:'+EE.esc(tel)+'">Appeler '+EE.esc(c.telephone||'')+'</a><a class="btn" href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre estimation '+d.reference)+'">E-mail</a>'+(tel?'<a class="btn" href="https://wa.me/'+EE.esc(tel.replace(/^\+/,'').replace(/^0/,'33'))+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'</div>'+
      '<div class="ee-col">'+
        blocVisite(d)+
        '<div class="field"><label for="ad-st-'+d.id+'">Statut</label><select id="ad-st-'+d.id+'" data-f="statut">'+opts+'</select></div>'+
        '<label class="ee-check-l" data-prevenir-l><input type="checkbox" data-f="prevenir"'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Annoncer le changement de statut au vendeur par e-mail':'E-mails aux vendeurs pas encore ouverts : rien ne part')+'</label>'+
        '<div class="field" data-raison-f'+(d.statut==='pause'||d.statut==='close'?'':' hidden')+'><label for="ad-ra-'+d.id+'">Raison (pas maintenant, perdu)</label><input type="text" id="ad-ra-'+d.id+'" data-f="raison" maxlength="300" value="'+EE.esc(d.raison||'')+'"></div>'+
        '<div class="field"><label for="ad-rp-'+d.id+'">Rappeler avant le</label><input type="date" id="ad-rp-'+d.id+'" data-f="rappel_le" value="'+EE.esc(d.rappel_le||'')+'"></div>'+
        '<div class="field"><label for="ad-no-'+d.id+'">Notes (visibles par l\'agence seulement)</label><textarea id="ad-no-'+d.id+'" data-f="notes" maxlength="5000">'+EE.esc(d.notes||'')+'</textarea></div>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-save>Enregistrer</button><span class="saved" role="status" hidden>Enregistré</span></div>'+
        blocAvis(d)+
        '<div class="ee-suite" data-suite></div>'+
        '<div class="ee-files"><p class="lab">Fichiers du dossier</p><ul class="ee-flist">'+(d.fichiers||[]).map(fichier).join('')+'</ul>'+
          '<div class="acts"><label class="btn ee-add"><input type="file" accept="application/pdf" data-depot="avis">Déposer un avis de valeur fait ailleurs (PDF)</label><label class="btn ee-add"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" data-depot="document">Ajouter un document</label></div>'+
          '<div class="field"><label for="ad-dn-'+d.id+'">Nature du prochain document</label><select id="ad-dn-'+d.id+'" data-doc-nature><option value="">Document</option>'+Object.keys(DOCS).map(function(k){return '<option value="'+k+'">'+EE.esc(DOCS[k])+'</option>';}).join('')+'</select></div>'+
          '<p class="hint">Le vendeur voit l\'avis de valeur et les documents dans son espace (mandat, diagnostics, compromis…). 10 Mo au plus par fichier.</p><p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>'+
        '<details class="ee-journal" data-journal><summary>Journal du dossier</summary><ul></ul></details>'+
        '<div class="ee-links">'+(d.suspect?'<button type="button" data-humain>Ce n\'est pas un robot</button>':'')+'<button type="button" class="ee-danger" data-dsuppr>Supprimer cette demande</button></div>'+
      '</div>'+
        '<div class="ee-fiche"><ul class="ee-kv">'+[['Référence',d.reference],['Site',LIB.site[d.site]||d.site],['E-mail',c.email],['Fourchette',d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+' ('+EE.euros(d.prix_m2)+'/m², '+d.comparables+' ventes'+(d.rayon?' à moins de '+EE.rayon(d.rayon):'')+')':'Pas de fourchette : rappel promis sous 24 h']].concat(fiche(d.reponses||{})).concat(d.en_attente?[['Espace client','en attente de confirmation de l\'e-mail']]:[]).map(function(l){return '<li><span>'+EE.esc(l[0])+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('')+'</ul>'+'</div>'+
      '</div></details>';
  }
  function filtres(){ return {q:$('#ad-q').value.trim().toLowerCase(),s:$('#ad-statut').value,site:$('#ad-site').value}; }
  function filtrer(){
    var f=filtres();
    var ouvertes=$$('#ad-rows details[open]').map(function(x){return x.getAttribute('data-id');});
    var l=D.filter(function(d){ if(f.s&&d.statut!==f.s)return false; if(f.site&&d.site!==f.site)return false; if(!f.q)return true; var c=d.contact||{}; return [c.prenom,c.nom,c.email,c.telephone,String(c.telephone||'').replace(/\D/g,''),d.commune,d.adresse,d.reference,d.site].join(' ').toLowerCase().indexOf(f.q)>=0; });
    // les actions en retard en haut (la plus ancienne d'abord), puis le reste, du plus récent au plus ancien
    l=l.slice().sort(function(a,b){ var ra=retard(a), rb=retard(b); if(ra!==rb)return ra?-1:1; if(ra)return String(a.action.echeance)<String(b.action.echeance)?-1:1; return String(a.cree_le)<String(b.cree_le)?1:-1; });
    $('#ad-rows').innerHTML=l.length?l.map(ligne).join(''):'<div class="ee-empty">Aucune demande.</div>';
    ouvertes.forEach(function(id){var x=$('#ad-rows details[data-id="'+id+'"]');if(x)x.open=true;});
    if(l.length===1)$('#ad-rows details').open=true;
    $('#ad-export').href=C.api+'/admin/export.csv?quoi=demandes'+(f.site?'&site='+f.site:'')+(f.s?'&statut='+f.s:'');
  }
  function stats(){
    var n=function(s){return D.filter(function(d){return d.statut===s;}).length;};
    $('#ad-stats').innerHTML=[['Dossiers',D.length],['Actions en retard',D.filter(retard).length],['Visites à confirmer',D.filter(function(d){return d.visite&&d.visite.etat==='demandee';}).length],['Visites prévues',n('visite')]].map(function(x){return '<div class="ee-stat"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>';}).join('');
  }
  function comptes(){
    var q=$('#ad-qc').value.trim().toLowerCase();
    var l=Cp.filter(function(c){return !q||[c.prenom,c.nom,c.email,c.telephone].join(' ').toLowerCase().indexOf(q)>=0;});
    $('#ad-crows').innerHTML=l.length?l.map(function(c){
      return '<details class="ee-row" data-cid="'+c.id+'"><summary><b>'+EE.esc([c.civilite,c.prenom,c.nom].filter(Boolean).join(' ')||c.email)+'</b><span class="st">'+c.demandes+' est.</span><small>'+EE.esc(c.email)+' · '+EE.esc(c.telephone||'')+' · créé le '+EE.date(c.cree_le)+(c.admin?' · admin':'')+'</small></summary>'+
        '<div class="in"><ul class="ee-kv">'+[['E-mail',c.email+(c.verifie?' (confirmé)':' (non confirmé)')],['Téléphone',c.telephone||'—'],['Mot de passe',c.mot_de_passe?'défini':'aucun (connexion par lien)'],['Site',LIB.site[c.site]||c.site||'—'],['Dernière connexion',c.derniere_connexion?EE.date(c.derniere_connexion):'—']].map(function(x){return '<li><span>'+x[0]+'</span><span>'+EE.esc(x[1])+'</span></li>';}).join('')+'</ul>'+
        '<div><div class="acts">'+(c.telephone?'<a class="btn btn-primary" href="tel:'+EE.esc(c.telephone.replace(/[^\d+]/g,''))+'">Appeler</a>':'')+'<button type="button" class="btn" data-lien="acces">Lien de connexion</button><button type="button" class="btn" data-lien="reinit">Lien nouveau mot de passe</button>'+(c.admin?'':'<button type="button" class="btn" data-del="'+c.id+'">Supprimer ce compte</button>')+'</div><p class="ee-ok" data-lien-out role="status" hidden style="margin-top:12px;"></p></div></div></details>';
    }).join(''):'<div class="ee-empty">Aucun compte.</div>';
  }
  function charger(){
    return Promise.all([EE.api('/admin/demandes'),EE.api('/admin/comptes')]).then(function(r){
      $('#ad-load').hidden=true;
      if(r[0]._status!==200){
        $('#ad-no').hidden=false; $('#ad-in').hidden=true;
        if(r[0].error==='admin_non_verifie')$('#ad-no-txt').textContent='Votre adresse doit être confirmée avant d\'ouvrir l\'espace agence : demandez votre lien de connexion ci-dessous et ouvrez-le depuis votre boîte e-mail.';
        else if(r[0].error==='interdit')$('#ad-no-txt').textContent='Ce compte n\'a pas accès à l\'espace agence.';
        else if(r[0]._status!==401&&r[0]._status!==403)$('#ad-no-txt').textContent=EE.message(r[0]);
        return;
      }
      STATUTS=r[0].statuts; D=r[0].demandes; Cp=r[1].comptes||[]; if(r[0].taille_max)TAILLE_MAX=r[0].taille_max; MAIL_CLIENTS=!!r[0].email_clients;
      OFFRES=r[0].statuts_offre||{}; DOCS=r[0].documents||{}; AUJ=r[0].aujourdhui||new Date().toISOString().slice(0,10); SUITE={};
      var ru=$('#ad-rdv-url'); if(ru&&document.activeElement!==ru)ru.value=r[0].rdv_url||'';
      var s=$('#ad-statut'), v=s.value;
      s.innerHTML='<option value="">Tous les statuts</option>'+Object.keys(STATUTS).map(function(k){return '<option value="'+k+'">'+EE.esc(STATUTS[k])+'</option>';}).join(''); s.value=v;
      $('#ad-in').hidden=false; stats(); filtrer(); comptes();
    });
  }
  $('#ad-q').addEventListener('input',filtrer); $('#ad-statut').addEventListener('change',filtrer); $('#ad-site').addEventListener('change',filtrer); $('#ad-qc').addEventListener('input',comptes);
  $$('[data-vue]').forEach(function(b){b.addEventListener('click',function(){var v=b.getAttribute('data-vue');['demandes','comptes','reglages'].forEach(function(k){$('#ad-'+k).hidden=v!==k;});$$('[data-vue]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});

  /* ce qu'il est advenu de l'e-mail au vendeur, en fin de message */
  function mailTxt(m){ return m==='envoye'?' · e-mail envoyé au vendeur.':m==='differe'?' · e-mail au vendeur prévu à 8 h (rien ne part entre 21 h et 8 h).':MAIL_CLIENTS?'.':' · prévenez-le par téléphone (e-mails pas encore ouverts).'; }
  function note(row,t,ko){var s=$('.saved',row);s.hidden=false;s.style.color=ko?'#7E2C1F':'';s.textContent=t;if(!ko)setTimeout(function(){s.hidden=true;},2500);}
  function zoneMsg(zone,txt,ok){var e=$(ok?'.ee-ok':'.ee-err',zone),a=$(ok?'.ee-err':'.ee-ok',zone);a.hidden=true;e.textContent=txt||'';e.hidden=!txt;}
  function demande(id){return D.filter(function(k){return k.id===id;})[0];}
  /* après une action : la ligne reflète le dossier tel que le serveur le rend (statut, prochaine action, visite) */
  function maj(row,x,n){
    if(!x||!n)return;
    ['statut','statut_libelle','notes','rappel_le','raison','action','visite','suspect','statut_le'].forEach(function(k){ if(n[k]!==undefined)x[k]=n[k]; });
    var st=$('summary .st',row); st.className='st '+x.statut; st.textContent=STATUTS[x.statut]||x.statut;
    $('[data-f=statut]',row).value=x.statut;
    var act=$('summary .act',row), txt=actionTxt(x);
    if(!act&&txt){ st.insertAdjacentHTML('afterend','<span class="act" data-test="action"></span>'); act=$('summary .act',row); }
    if(act){ act.textContent=txt?'→ '+txt:''; act.className='act'+(retard(x)?' ee-late':''); act.hidden=!txt; }
    $('[data-raison-f]',row).hidden=!(x.statut==='pause'||x.statut==='close');
    var bv=$('[data-bloc=visite]',row); if(bv)bv.outerHTML=blocVisite(x);
    var jr=$('[data-journal]',row); if(jr&&jr.open)journal(jr,x.id);
    stats();
  }
  var TRACES={statut:'Statut',visite_demandee:'Créneaux proposés par le vendeur',visite_fixee:'Visite fixée',visite_annulee:'Visite annulée',visite_agenda:'Page de réservation ouverte par le vendeur',rappel_visite:'Rappel de visite',avis_prepare:'Avis de valeur : brouillon commencé',avis_envoye:'Avis de valeur envoyé',mail:'E-mail au vendeur',cr_publie:'Compte rendu de visite publié',cr_supprime:'Compte rendu de visite supprimé',offre_recue:'Offre reçue',offre_statut:'Offre',offre_supprimee:'Offre supprimée',notaire:'Notaire',document:'Document déposé'};
  function trace(e){
    var d=e.detail||{}, t=TRACES[e.type]||e.type;
    if(e.type==='statut')t='Statut : '+(STATUTS[e.vers]||e.vers)+(d.raison?' ('+d.raison+')':'');
    else if(e.type==='visite_fixee'&&d.debut)t='Visite fixée : '+EE.quandCourt(d.debut);
    else if(e.type==='visite_demandee'&&d.creneaux)t='Créneaux proposés : '+d.creneaux.map(EE.quandCourt).join(', ');
    else if(e.type==='mail')t=(d.envoye?'E-mail envoyé : ':'E-mail non envoyé : ')+(d.sujet||'')+(d.envoye?'':d.raison==='email_clients_ferme'?' (envoi aux vendeurs pas encore ouvert)':d.raison==='adresse_de_test'?' (adresse d\'essai)':d.raison==='heures_calmes'?' (gardé pour 8 h)':d.raison==='perime'?' (plus d\'actualité)':'');
    else if(e.type==='rappel_visite')t='Rappel de visite '+(d.envoye?'envoyé':'non envoyé');
    else if(e.type==='cr_publie')t='Compte rendu publié (visite du '+EE.jour(d.visite_le)+(d.soir_meme?', le jour même':'')+')';
    else if(e.type==='offre_recue')t='Offre reçue : '+EE.euros(d.montant);
    else if(e.type==='offre_statut')t='Offre de '+EE.euros(d.montant)+' : '+String(OFFRES[d.statut]||d.statut).toLowerCase();
    else if(e.type==='offre_supprimee')t='Offre supprimée : '+EE.euros(d.montant);
    else if(e.type==='notaire')t='Notaire'+(d.nom?' : '+d.nom:'')+((d.faites||[]).length?' · '+d.faites.join(', '):'')+(d.rdv?' · acte prévu le '+EE.jour(d.rdv):'');
    else if(e.type==='document')t='Document déposé : '+(d.libelle?d.libelle+' · ':'')+(d.nom||'');
    return '<li><span>'+EE.esc(t)+'</span><span>'+EE.esc(EE.quandCourt(e.cree_le))+'</span></li>';
  }
  function journal(det,id){ EE.api('/admin/journal?demande='+id).then(function(d){ $('ul',det).innerHTML=d._status===200?d.journal.map(trace).join(''):'<li><span>'+EE.esc(EE.message(d))+'</span><span></span></li>'; }); }
  $('#ad-rows').addEventListener('toggle',function(e){
    var det=e.target; if(!det||!det.hasAttribute||!det.open)return;
    if(det.hasAttribute('data-journal'))journal(det,+det.closest('.ee-row').getAttribute('data-id'));
    else if(det.classList.contains('ee-row'))suiteCharger(det,+det.getAttribute('data-id'));
  },true);
  $('#ad-rows').addEventListener('change',function(e){ var s=e.target.closest('[data-f=statut]'); if(!s)return; var row=s.closest('.ee-row'); $('[data-raison-f]',row).hidden=!(s.value==='pause'||s.value==='close'); });

  /* ---------- avis de valeur : brouillon, PDF fabriqué dans le navigateur, validation en un clic ---------- */
  function lignesTxt(l){return (l||[]).join('\n');}
  function avisOuvrir(row,id){
    var ed=$('[data-avis-ed]',row); ed.hidden=false; ed.innerHTML='<div class="ee-load" style="height:90px;" role="status" aria-label="Chargement"></div>';
    EE.api('/admin/avis?demande='+id).then(function(d){
      if(d._status!==200){ed.innerHTML='<p class="ee-err">'+EE.esc(EE.message(d))+'</p>';return;}
      AVIS[id]=d; avisForm(row,id);
    });
  }
  function avisForm(row,id){
    var d=AVIS[id], c=d.contenu, m=d.donnees.marche||{}, ed=$('[data-avis-ed]',row), n=(d.donnees.ventes||[]).length, p='ad-av-'+id+'-';
    var marche=d.donnees.assez_de_ventes
      ?'<p class="ee-note" data-test="avis-ventes"><b>'+n+' ventes réelles</b> seront citées dans le PDF (date, surface, prix, prix au m²), parmi '+m.comparables+' ventes comparables à moins de '+EE.rayon(m.rayon)+'. Prix médian : '+EE.euros(m.m2_median)+'/m².</p>'
      :'<p class="ee-note warn" data-test="avis-ventes"><b>Moins de 5 ventes comparables'+(n?' ('+n+')':'')+'.</b> Pas de fourchette automatique : le PDF le dit, et la fourchette ci-dessous est la vôtre.</p>';
    var strat=[0,1,2].map(function(k){var s=(c.strategie||[])[k]||{};return '<div class="ee-strat"><label for="'+p+'st'+k+'">Stratégie, point '+(k+1)+'</label><input type="text" id="'+p+'st'+k+'" data-av="strat-titre" maxlength="90" value="'+EE.esc(s.titre||'')+'" aria-label="Titre du point '+(k+1)+'"><textarea data-av="strat-texte" maxlength="600" aria-label="Texte du point '+(k+1)+'">'+EE.esc(s.texte||'')+'</textarea></div>';}).join('');
    var cand=d.donnees.candidats||[];
    var choixVentes=cand.length?'<details class="ee-ventes" data-av-ventes><summary><span data-av-compte></span> <u>Choisir</u></summary>'+
      '<p class="hint">Cochez les ventes à citer (12 au plus). Les ventes au prix très éloigné des autres ne sont pas cochées d\'office.</p><ul>'+cand.map(function(v,k){
        return '<li><label><input type="checkbox" data-av-vente="'+EE.esc(v.cle)+'"'+(v.retenue?' checked':'')+'><span><b>'+EE.esc(v.mois.slice(5)+'/'+v.mois.slice(0,4))+' · '+EE.esc(v.voie||v.commune||'')+'</b><small>'+v.surface+' m²'+(v.pieces?' · '+v.pieces+' p.':'')+' · '+(v.prix?EE.euros(v.prix):'prix non publié')+' · '+EE.euros(v.prix_m2)+'/m² · à '+EE.rayon(v.distance)+(v.atypique?' · <i>prix atypique</i>':'')+'</small></span></label></li>';
      }).join('')+'</ul></details>':'';
    ed.innerHTML=marche+choixVentes+
      '<div class="field"><label for="'+p+'dv">Date de la visite</label><input type="date" id="'+p+'dv" data-av="date_visite" value="'+EE.esc(c.date_visite||'')+'"></div>'+
      '<div class="field"><label for="'+p+'no">Notes de visite <small>(dictez : le texte est repris tel quel)</small></label><textarea id="'+p+'no" data-av="notes" maxlength="4000" style="min-height:140px;">'+EE.esc(c.notes||'')+'</textarea></div>'+
      '<div class="field"><label for="'+p+'at">Atouts <small>(un par ligne)</small></label><textarea id="'+p+'at" data-av="atouts">'+EE.esc(lignesTxt(c.atouts))+'</textarea></div>'+
      '<div class="field"><label for="'+p+'vi">Points de vigilance <small>(un par ligne)</small></label><textarea id="'+p+'vi" data-av="vigilance">'+EE.esc(lignesTxt(c.vigilance))+'</textarea></div>'+
      '<div class="ee-2"><div class="field"><label for="'+p+'pb">Valeur basse (€)</label><input type="number" inputmode="numeric" id="'+p+'pb" data-av="prix_bas" min="1000" step="1000" value="'+(c.prix_bas||'')+'"></div>'+
      '<div class="field"><label for="'+p+'ph">Valeur haute (€)</label><input type="number" inputmode="numeric" id="'+p+'ph" data-av="prix_haut" min="1000" step="1000" value="'+(c.prix_haut||'')+'"></div></div>'+
      (d.donnees.estimation&&d.donnees.assez_de_ventes?'<p class="hint">Estimation en ligne : '+EE.euros(d.donnees.estimation.prix_bas)+' – '+EE.euros(d.donnees.estimation.prix_haut)+'. Ajustez après la visite : c\'est votre fourchette qui figure dans l\'avis.</p>':'')+
      strat+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
      '<div class="acts"><button type="button" class="btn btn-primary" data-avis-pdf>Enregistrer et créer le PDF</button>'+
        '<a class="btn" data-avis-lien target="_blank" rel="noopener"'+(d.avis&&d.avis.fichier?' href="'+lienFichier(d.avis.fichier)+'"':' hidden')+'>Ouvrir le PDF</a>'+
        '<button type="button" class="btn" data-avis-valider'+(d.avis&&d.avis.fichier&&d.avis.fichier.role==='brouillon'?'':' hidden')+'>Valider et envoyer au vendeur</button></div>'+
      '<label class="ee-check-l"><input type="checkbox" data-avis-prevenir'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Prévenir le vendeur par e-mail à la validation':'E-mails aux vendeurs pas encore ouverts : prévenez-le par téléphone')+'</label>';
    compteVentes(ed);
  }
  function compteVentes(ed){
    var boites=$$('[data-av-vente]',ed), n=boites.filter(function(b){return b.checked;}).length, c=$('[data-av-compte]',ed);
    if(c)c.textContent=n+' vente'+(n>1?'s':'')+' citée'+(n>1?'s':'')+' sur '+boites.length+' proposées.';
    boites.forEach(function(b){b.disabled=!b.checked&&n>=12;});
  }
  $('#ad-rows').addEventListener('change',function(e){ if(e.target.closest('[data-av-vente]'))compteVentes(e.target.closest('[data-avis-ed]')); });
  function avisContenu(row){
    var ed=$('[data-avis-ed]',row), v=function(k){return $('[data-av='+k+']',ed).value;};
    var titres=$$('[data-av=strat-titre]',ed), textes=$$('[data-av=strat-texte]',ed);
    var boites=$$('[data-av-vente]',ed);
    return {notes:v('notes'),atouts:v('atouts').split('\n'),vigilance:v('vigilance').split('\n'),prix_bas:v('prix_bas')||null,prix_haut:v('prix_haut')||null,date_visite:v('date_visite'),
      ventes:boites.length?boites.filter(function(b){return b.checked;}).map(function(b){return b.getAttribute('data-av-vente');}):null,
      strategie:titres.map(function(t,k){return {titre:t.value,texte:textes[k].value};})};
  }
  function nomPdf(d){ return ('Avis de valeur - '+(d.donnees.bien.adresse||d.reference)).replace(/[\\/:*?"<>|]+/g,' ').slice(0,100)+'.pdf'; }
  function avisPdf(row,id,b){
    var ed=$('[data-avis-ed]',row), cA=avisContenu(row);
    // jamais de prix inventé : sans fourchette saisie par l'agent, pas d'avis de valeur
    if(!(+cA.prix_bas>0)||!(+cA.prix_haut>0)){zoneMsg(ed,'Indiquez la fourchette de prix (valeur basse et valeur haute) : c\'est la vôtre qui figure dans l\'avis.');$('[data-av=prix_bas]',ed).focus();return;}
    if(+cA.prix_haut<+cA.prix_bas){zoneMsg(ed,'La valeur haute doit dépasser la valeur basse.');$('[data-av=prix_haut]',ed).focus();return;}
    b.disabled=true; zoneMsg(ed,'Enregistrement…',true);
    EE.api('/admin/avis',{body:{demande:id,contenu:cA}}).then(function(d){
      if(d._status!==200){b.disabled=false;zoneMsg(ed,EE.messageChamp(d));return;}
      AVIS[id]=d; var x=demande(id); if(x)x.avis={prepare_le:d.avis.prepare_le,valide_le:d.avis.valide_le};
      var nv=$('[data-test=avis-ventes] b',ed); if(nv&&d.donnees.assez_de_ventes)nv.textContent=d.donnees.ventes.length+' ventes réelles';
      zoneMsg(ed,'Création du PDF…',true);
      return EE.script(C.avisPdf||'/assets/avis/avis-pdf.js?v=1').then(function(){
        return window.EEAvis.generer({site:d.site,reference:d.reference,date:new Date().toISOString().slice(0,10),contenu:d.contenu,donnees:d.donnees});
      }).then(function(octets){
        var f=new Blob([octets],{type:'application/pdf'});
        return EE.api('/admin/avis/brouillon?demande='+id,{fichier:f,nom:nomPdf(d),delai:120000});
      }).then(function(r){
        b.disabled=false;
        if(r._status!==201){zoneMsg(ed,EE.message(r));return;}
        d.avis.fichier=r.fichier;
        var lien=$('[data-avis-lien]',ed); lien.href=lienFichier(r.fichier); lien.hidden=false;
        $('[data-avis-valider]',ed).hidden=false;
        var liste=$('.ee-flist',row); $$('li',liste).forEach(function(li){ if((x&&x.fichiers||[]).some(function(k){return k.id===li.getAttribute('data-fid')&&k.role==='brouillon';}))li.parentNode.removeChild(li); });
        if(x){x.fichiers=(x.fichiers||[]).filter(function(k){return k.role!=='brouillon';});x.fichiers.push(r.fichier);}
        liste.insertAdjacentHTML('beforeend',fichier(r.fichier));
        zoneMsg(ed,'PDF créé ('+EE.taille(r.fichier.taille)+'). Relisez-le, puis validez : il part dans l\'espace du vendeur.',true);
      },function(){ b.disabled=false; zoneMsg(ed,'Le PDF n\'a pas pu être créé sur cet appareil. Réessayez, ou déposez un PDF fait ailleurs (plus bas).'); });
    });
  }
  function avisValider(row,id,b){
    var ed=$('[data-avis-ed]',row), x=demande(id);
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer : le vendeur le verra dans son espace';return;}
    b.disabled=true;
    EE.api('/admin/avis/valider',{body:{demande:id,prevenir:$('[data-avis-prevenir]',ed).checked}}).then(function(d){
      b.disabled=false; b.removeAttribute('data-ok'); b.textContent='Valider et envoyer au vendeur';
      if(d._status!==200){zoneMsg(ed,EE.messageChamp(d));return;}
      if(x){x.avis={prepare_le:(x.avis||{}).prepare_le,valide_le:new Date().toISOString()};x.fichiers=(x.fichiers||[]).filter(function(k){return k.role!=='avis'&&k.id!==d.fichier.id;});x.fichiers.push(d.fichier);}
      $('.ee-flist',row).innerHTML=((x&&x.fichiers)||[]).map(fichier).join('');
      maj(row,x,d.demande);
      b.hidden=true;
      $('[data-avis-etat]',row).textContent='Envoyé au vendeur le '+EE.jour(new Date().toISOString())+'.';
      zoneMsg(ed,'Avis de valeur déposé dans l\'espace du vendeur'+(d.mail==='envoye'?' · e-mail envoyé.':mailTxt(d.mail)),true);
    });
  }

  /* ---------- après le mandat : comptes rendus de visite, offres, notaire (chargés à l'ouverture du dossier) ---------- */
  function prevenirCase(attr,txt){ return '<label class="ee-check-l"><input type="checkbox" '+attr+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?txt:'E-mails aux vendeurs pas encore ouverts : prévenez-le par téléphone')+'</label>'; }
  function tete(titre,compte){ return '<summary><span class="lab">'+titre+'</span><small>'+EE.esc(compte)+'</small></summary><div class="ee-plie-in">'; }
  function pluriel(n,un,des){ return n+' '+(n>1?des:un); }
  function blocCr(id,s,ouvert){
    var l=s.comptes_rendus||[], pub=l.filter(function(c){return c.publie;}).length, p='ad-cr-'+id+'-';
    return '<details class="ee-bloc ee-plie" data-bloc="cr"'+(ouvert?' open':'')+'>'+tete('Comptes rendus de visite',l.length?pluriel(pub,'publié','publiés')+(l.length>pub?' · '+pluriel(l.length-pub,'brouillon','brouillons'):''):'aucun')+
      '<p class="hint">Après chaque visite, le soir même : dictez trois lignes, publiez. Le vendeur les lit dans son espace.</p>'+
      '<ul class="ee-items">'+l.map(function(c){
        return '<li data-cr="'+c.id+'"><p class="t"><b>Visite du '+EE.esc(EE.jourLong(c.visite_le))+'</b><span class="tag'+(c.publie?' ok':'')+'">'+(c.publie?'Publié':'Brouillon')+'</span></p><p class="txt">'+EE.esc(c.texte)+'</p>'+
          '<div class="ee-links">'+(c.publie?'':'<button type="button" data-cr-publier>Publier</button>')+'<button type="button" data-cr-modifier>Modifier</button><button type="button" class="ee-danger" data-cr-suppr>Supprimer</button></div></li>';
      }).join('')+'</ul>'+
      '<div class="ee-saisie" data-saisie>'+
        '<div class="field"><label for="'+p+'d">Date de la visite</label><input type="date" id="'+p+'d" data-cr-f="visite_le" max="'+AUJ+'" value="'+AUJ+'"></div>'+
        '<div class="field"><label for="'+p+'t">Compte rendu <small>(dictez : le texte est repris tel quel)</small></label><textarea id="'+p+'t" data-cr-f="texte" maxlength="3000"></textarea></div>'+
        '<label class="ee-check-l"><input type="checkbox" data-cr-f="publie" checked>Publier tout de suite dans l\'espace du vendeur</label>'+
        prevenirCase('data-cr-f="prevenir"','Le prévenir par e-mail à la publication')+
        '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-cr-save>Enregistrer le compte rendu</button><button type="button" class="btn" data-annuler hidden>Annuler</button></div>'+
      '</div></div></details>';
  }
  function blocOffres(id,s,ouvert){
    var l=s.offres||[], p='ad-of-'+id+'-', etude=l.filter(function(o){return o.statut==='etude';}).length;
    return '<details class="ee-bloc ee-plie" data-bloc="offres"'+(ouvert?' open':'')+'>'+tete('Offres',l.length?pluriel(l.length,'offre','offres')+(etude?' · '+etude+' à l\'étude':''):'aucune')+
      '<p class="hint">Chaque offre reçue, dès qu\'elle arrive. Le vendeur la voit dans son espace : montant, date, conditions, où elle en est.</p>'+
      '<ul class="ee-items">'+l.map(function(o){
        return '<li data-of="'+o.id+'"><p class="t"><b>'+EE.euros(o.montant)+'</b><span class="tag'+(o.statut==='acceptee'?' ok':o.statut==='etude'?' att':'')+'">'+EE.esc(o.statut_libelle)+'</span></p><p class="meta">Reçue le '+EE.jour(o.recue_le)+'</p>'+(o.conditions?'<p class="txt">'+EE.esc(o.conditions)+'</p>':'')+
          '<div class="field"><label for="'+p+'s'+o.id+'">Où en est cette offre</label><select id="'+p+'s'+o.id+'" data-of-statut>'+Object.keys(OFFRES).map(function(k){return '<option value="'+k+'"'+(k===o.statut?' selected':'')+'>'+EE.esc(OFFRES[k])+'</option>';}).join('')+'</select></div>'+
          '<div class="ee-links"><button type="button" data-of-modifier>Modifier</button><button type="button" class="ee-danger" data-of-suppr>Supprimer</button></div></li>';
      }).join('')+'</ul>'+
      '<div class="ee-saisie" data-saisie>'+
        '<div class="ee-2"><div class="field"><label for="'+p+'m">Montant (€)</label><input type="number" inputmode="numeric" id="'+p+'m" data-of-f="montant" min="1000" step="500"></div>'+
        '<div class="field"><label for="'+p+'d">Reçue le</label><input type="date" id="'+p+'d" data-of-f="recue_le" max="'+AUJ+'" value="'+AUJ+'"></div></div>'+
        '<div class="field"><label for="'+p+'c">Conditions <small>(financement, délai, conditions suspensives)</small></label><textarea id="'+p+'c" data-of-f="conditions" maxlength="1500"></textarea></div>'+
        prevenirCase('data-of-f="prevenir"','Prévenir le vendeur par e-mail')+
        '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-of-save>Enregistrer l\'offre</button><button type="button" class="btn" data-annuler hidden>Annuler</button></div>'+
      '</div></div></details>';
  }
  function blocNotaire(id,s,ouvert){
    var n=s.notaire||{etapes:[]}, p='ad-nt-'+id+'-', faites=(n.etapes||[]).filter(function(e){return e.fait;}).length;
    return '<details class="ee-bloc ee-plie" data-bloc="notaire"'+(ouvert?' open':'')+'>'+tete('Notaire',n.nom?n.nom+(faites?' · '+pluriel(faites,'étape passée','étapes passées'):''):'à renseigner')+
      '<p class="hint">Du compromis à l\'acte : le vendeur voit le notaire et chaque étape passée dans son espace.</p>'+
      '<div class="field"><label for="'+p+'n">Notaire</label><input type="text" id="'+p+'n" data-nt-f="nom" maxlength="120" placeholder="Maître …" value="'+EE.esc(n.nom||'')+'"></div>'+
      '<div class="field"><label for="'+p+'c">Coordonnées de l\'étude <small>(adresse, téléphone)</small></label><input type="text" id="'+p+'c" data-nt-f="coordonnees" maxlength="300" value="'+EE.esc(n.coordonnees||'')+'"></div>'+
      '<ul class="ee-etapes">'+(n.etapes||[]).map(function(e){
        return '<li data-nt-etape="'+EE.esc(e.cle)+'"><label class="ee-check-l"><input type="checkbox" data-nt-fait'+(e.fait?' checked':'')+'>'+EE.esc(e.libelle)+'</label><input type="date" data-nt-le value="'+EE.esc(e.le||'')+'" aria-label="Date : '+EE.esc(e.libelle)+'"></li>';
      }).join('')+'</ul>'+
      '<p class="hint">Cochez une étape quand elle est passée. Une date sans coche : c\'est la date prévue.</p>'+
      prevenirCase('data-nt-f="prevenir"','Prévenir le vendeur par e-mail quand une étape passe')+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
      '<div class="acts"><button type="button" class="btn btn-primary" data-nt-save>Enregistrer</button></div>'+
    '</div></details>';
  }
  function suiteRendre(row,id){
    var z=$('[data-suite]',row), s=SUITE[id], x=demande(id)||{}; if(!z||!s)return;
    var etat={}; $$('details[data-bloc]',z).forEach(function(d){etat[d.getAttribute('data-bloc')]=d.open;});
    function o(k,statuts){ return etat[k]!==undefined?etat[k]:statuts.indexOf(x.statut)>=0; }
    z.innerHTML=blocCr(id,s,o('cr',['annonce','visites']))+blocOffres(id,s,o('offres',['visites','offre']))+blocNotaire(id,s,o('notaire',['offre','compromis']));
  }
  function suiteCharger(row,id){
    var z=$('[data-suite]',row); if(!z)return;
    if(SUITE[id]){ if(!z.firstChild)suiteRendre(row,id); return; }
    z.innerHTML='<div class="ee-load" style="height:64px;" role="status" aria-label="Chargement"></div>';
    EE.api('/admin/suite?demande='+id).then(function(d){
      if(d._status!==200){z.innerHTML='<p class="ee-err">'+EE.esc(EE.message(d))+'</p>';return;}
      SUITE[id]=d; suiteRendre(row,id);
    });
  }
  function ranger(l,cle){ return l.sort(function(a,b){ return a[cle]===b[cle]?b.id-a.id:(a[cle]<b[cle]?1:-1); }); }
  /* après un enregistrement : la liste à jour, la ligne du dossier (statut, prochaine action), le message */
  function suiteApres(row,id,bloc,d,txt){
    suiteRendre(row,id); maj(row,demande(id),d.demande);
    zoneMsg($('[data-bloc='+bloc+']',row),txt,true);
  }
  function confirmer(b,txt){ if(b.getAttribute('data-ok')==='1')return true; b.setAttribute('data-ok','1'); b.textContent=txt; return false; }
  function suiteClic(e,row,id){
    var t=e.target.closest('button'); if(!t)return false;
    var zone=t.closest('details[data-bloc]'); if(!zone||!SUITE[id])return false;
    var s=SUITE[id], li=t.closest('li'), f;
    /* --- comptes rendus --- */
    if(t.hasAttribute('data-cr-save')){
      f=function(k){return $('[data-cr-f='+k+']',zone);};
      var c={visite_le:f('visite_le').value,texte:f('texte').value,publie:f('publie').checked,prevenir:f('prevenir').checked}, ce=zone.getAttribute('data-edit');
      if(ce)c.id=+ce; else c.demande=id;
      if(!c.visite_le){zoneMsg(zone,'Indiquez la date de la visite.');f('visite_le').focus();return true;}
      if(!c.texte.trim()){zoneMsg(zone,'Écrivez ou dictez le compte rendu.');f('texte').focus();return true;}
      t.disabled=true;
      EE.api('/admin/compte-rendu',{body:c}).then(function(d){
        t.disabled=false;
        if(d._status>=300){zoneMsg(zone,EE.messageChamp(d));return;}
        s.comptes_rendus=ranger(s.comptes_rendus.filter(function(k){return k.id!==d.compte_rendu.id;}).concat([d.compte_rendu]),'visite_le');
        suiteApres(row,id,'cr',d,!d.compte_rendu.publie?'Brouillon enregistré : le vendeur ne le voit pas encore.':ce&&d.mail==='non'?'Compte rendu modifié.':'Compte rendu publié dans l\'espace du vendeur'+mailTxt(d.mail));
      });
      return true;
    }
    if(t.hasAttribute('data-cr-publier')){
      t.disabled=true;
      EE.api('/admin/compte-rendu',{body:{id:+li.getAttribute('data-cr'),publie:true,prevenir:$('[data-cr-f=prevenir]',zone).checked}}).then(function(d){
        t.disabled=false;
        if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
        s.comptes_rendus=s.comptes_rendus.map(function(k){return k.id===d.compte_rendu.id?d.compte_rendu:k;});
        suiteApres(row,id,'cr',d,'Compte rendu publié dans l\'espace du vendeur'+mailTxt(d.mail));
      });
      return true;
    }
    if(t.hasAttribute('data-cr-modifier')){
      var cr=s.comptes_rendus.filter(function(k){return k.id===+li.getAttribute('data-cr');})[0]; if(!cr)return true;
      zone.setAttribute('data-edit',cr.id);
      $('[data-cr-f=visite_le]',zone).value=cr.visite_le; $('[data-cr-f=texte]',zone).value=cr.texte; $('[data-cr-f=publie]',zone).checked=!!cr.publie;
      $('[data-cr-save]',zone).textContent='Enregistrer les changements'; $('[data-annuler]',zone).hidden=false; $('[data-cr-f=texte]',zone).focus();
      return true;
    }
    if(t.hasAttribute('data-cr-suppr')){
      if(!confirmer(t,'Confirmer la suppression'))return true;
      var cid=+li.getAttribute('data-cr');
      EE.api('/admin/compte-rendu',{body:{id:cid,supprimer:true}}).then(function(d){
        if(d._status!==200){zoneMsg(zone,EE.message(d));return;}
        s.comptes_rendus=s.comptes_rendus.filter(function(k){return k.id!==cid;}); suiteRendre(row,id); zoneMsg($('[data-bloc=cr]',row),'Compte rendu supprimé.',true);
      });
      return true;
    }
    /* --- offres --- */
    if(t.hasAttribute('data-of-save')){
      f=function(k){return $('[data-of-f='+k+']',zone);};
      var o={montant:f('montant').value,recue_le:f('recue_le').value,conditions:f('conditions').value,prevenir:f('prevenir').checked}, oe=zone.getAttribute('data-edit');
      if(oe)o.id=+oe; else o.demande=id;
      if(!(+o.montant>=1000)){zoneMsg(zone,'Indiquez le montant de l\'offre, en euros.');f('montant').focus();return true;}
      t.disabled=true;
      EE.api('/admin/offre',{body:o}).then(function(d){
        t.disabled=false;
        if(d._status>=300){zoneMsg(zone,EE.messageChamp(d));return;}
        s.offres=ranger(s.offres.filter(function(k){return k.id!==d.offre.id;}).concat([d.offre]),'recue_le');
        suiteApres(row,id,'offres',d,oe?'Offre modifiée.':'Offre enregistrée : le vendeur la voit dans son espace'+mailTxt(d.mail));
      });
      return true;
    }
    if(t.hasAttribute('data-of-modifier')){
      var of=s.offres.filter(function(k){return k.id===+li.getAttribute('data-of');})[0]; if(!of)return true;
      zone.setAttribute('data-edit',of.id);
      $('[data-of-f=montant]',zone).value=of.montant; $('[data-of-f=recue_le]',zone).value=of.recue_le; $('[data-of-f=conditions]',zone).value=of.conditions||'';
      $('[data-of-save]',zone).textContent='Enregistrer les changements'; $('[data-annuler]',zone).hidden=false; $('[data-of-f=montant]',zone).focus();
      return true;
    }
    if(t.hasAttribute('data-of-suppr')){
      if(!confirmer(t,'Confirmer la suppression'))return true;
      var oid=+li.getAttribute('data-of');
      EE.api('/admin/offre',{body:{id:oid,supprimer:true}}).then(function(d){
        if(d._status!==200){zoneMsg(zone,EE.message(d));return;}
        s.offres=s.offres.filter(function(k){return k.id!==oid;}); suiteApres(row,id,'offres',d,'Offre supprimée.');
      });
      return true;
    }
    /* --- notaire --- */
    if(t.hasAttribute('data-nt-save')){
      var etapes={}; $$('[data-nt-etape]',zone).forEach(function(l){ etapes[l.getAttribute('data-nt-etape')]={fait:$('[data-nt-fait]',l).checked,le:$('[data-nt-le]',l).value}; });
      t.disabled=true;
      EE.api('/admin/notaire',{body:{demande:id,nom:$('[data-nt-f=nom]',zone).value,coordonnees:$('[data-nt-f=coordonnees]',zone).value,etapes:etapes,prevenir:$('[data-nt-f=prevenir]',zone).checked}}).then(function(d){
        t.disabled=false;
        if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
        s.notaire=d.notaire; suiteRendre(row,id);
        zoneMsg($('[data-bloc=notaire]',row),'Enregistré : le vendeur le voit dans son espace'+(d.mail==='non'?'.':mailTxt(d.mail)),true);
      });
      return true;
    }
    if(t.hasAttribute('data-annuler')){ zone.removeAttribute('data-edit'); suiteRendre(row,id); return true; }
    return false;
  }
  /* une offre change d'état (à l'étude, acceptée, refusée…) : enregistré dès le choix */
  $('#ad-rows').addEventListener('change',function(e){
    var sel=e.target.closest('[data-of-statut]'); if(!sel)return;
    var row=sel.closest('.ee-row'), id=+row.getAttribute('data-id'), oid=+sel.closest('li').getAttribute('data-of'), zone=sel.closest('details[data-bloc]');
    sel.disabled=true;
    EE.api('/admin/offre',{body:{id:oid,statut:sel.value}}).then(function(d){
      sel.disabled=false;
      if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
      SUITE[id].offres=SUITE[id].offres.map(function(k){return k.id===oid?d.offre:k;});
      suiteApres(row,id,'offres',d,'Offre de '+EE.euros(d.offre.montant)+' : '+String(d.offre.statut_libelle).toLowerCase()+'. Le vendeur le voit dans son espace.');
    });
  });
  $('#ad-rows').addEventListener('click',function(e){
    var row=e.target.closest('.ee-row'); if(!row)return; var id=+row.getAttribute('data-id'), x=demande(id);
    if(suiteClic(e,row,id))return;
    var b=e.target.closest('[data-save]');
    if(b){
      var corps={id:id,statut:$('[data-f=statut]',row).value,notes:$('[data-f=notes]',row).value,rappel_le:$('[data-f=rappel_le]',row).value,raison:$('[data-f=raison]',row).value,prevenir:$('[data-f=prevenir]',row).checked};
      b.disabled=true;
      EE.api('/admin/demande',{body:corps}).then(function(d){
        b.disabled=false;
        if(d._status!==200){note(row,EE.messageChamp(d),true);return;}
        maj(row,x,d.demande);
        note(row,d.mail==='envoye'?'Enregistré · e-mail envoyé au vendeur':d.mail==='differe'?'Enregistré · e-mail au vendeur prévu à 8 h':'Enregistré');
      });
      return;
    }
    /* visite : confirmer un créneau proposé, fixer une autre date, annuler */
    var vf=e.target.closest('[data-vfix],[data-vfixdate],[data-vannuler]');
    if(vf){
      var zone=$('[data-bloc=visite]',row), corpsV={demande:id,prevenir:$('[data-vprevenir]',row).checked};
      if(vf.hasAttribute('data-vannuler')){
        if(vf.getAttribute('data-ok')!=='1'){vf.setAttribute('data-ok','1');vf.textContent='Confirmer l\'annulation';return;}
        corpsV={demande:id,annuler:true};
      } else if(vf.hasAttribute('data-vfix'))corpsV.debut=vf.getAttribute('data-vfix');
      else { corpsV.debut_local=$('[data-vdate]',row).value; if(!corpsV.debut_local){zoneMsg(zone,'Choisissez la date et l\'heure de la visite.');return;} }
      vf.disabled=true;
      EE.api('/admin/visite',{body:corpsV}).then(function(d){
        vf.disabled=false;
        if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
        maj(row,x,d.demande);
        zoneMsg($('[data-bloc=visite]',row),corpsV.annuler?'Visite annulée.':'Visite fixée'+(d.mail==='envoye'?' · confirmation envoyée au vendeur par e-mail.':mailTxt(d.mail)),true);
      });
      return;
    }
    if(e.target.closest('[data-avis-ouvrir]')){ avisOuvrir(row,id); return; }
    if(e.target.closest('[data-avis-pdf]')){ avisPdf(row,id,e.target.closest('[data-avis-pdf]')); return; }
    if(e.target.closest('[data-avis-valider]')){ avisValider(row,id,e.target.closest('[data-avis-valider]')); return; }
    var h=e.target.closest('[data-humain]');
    if(h){ EE.api('/admin/demande',{body:{id:id,suspect:false}}).then(function(d){ if(d._status===200){if(x)x.suspect=false;filtrer();} }); return; }
    var ds=e.target.closest('[data-dsuppr]');
    if(ds){
      if(ds.getAttribute('data-ok')!=='1'){ds.setAttribute('data-ok','1');ds.textContent='Confirmer : demande et fichiers effacés';return;}
      EE.api('/admin/demande/supprimer',{body:{id:id}}).then(function(d){ if(d._status===200){D=D.filter(function(k){return k.id!==id;});stats();filtrer();} else ds.textContent=EE.message(d); });
      return;
    }
    var fs=e.target.closest('[data-fsuppr]');
    if(fs){
      if(fs.getAttribute('data-ok')!=='1'){fs.setAttribute('data-ok','1');fs.textContent='Confirmer';return;}
      var fid=fs.getAttribute('data-fsuppr');
      EE.api('/fichier/supprimer',{body:{id:fid}}).then(function(d){ if(d._status===200){ if(x)x.fichiers=(x.fichiers||[]).filter(function(f){return f.id!==fid;}); var li=fs.closest('li'); li.parentNode.removeChild(li);} else fs.textContent=EE.message(d); });
    }
  });
  /* dépôt de l'avis de valeur (PDF) ou d'un document */
  $('#ad-rows').addEventListener('change',function(e){
    var input=e.target.closest('[data-depot]'); if(!input||!input.files||!input.files.length)return;
    var row=input.closest('.ee-row'), id=+row.getAttribute('data-id'), x=demande(id), zone=$('.ee-files',row), liste=$('.ee-flist',row), role=input.getAttribute('data-depot');
    var fichiers=Array.prototype.slice.call(input.files), n=0, erreurs=[];
    input.disabled=true; input.parentNode.classList.add('busy'); zoneMsg(zone,'');
    function suite(){
      if(n>=fichiers.length){
        input.disabled=false; input.value=''; input.parentNode.classList.remove('busy');
        if(erreurs.length)zoneMsg(zone,erreurs.join(' '));
        else zoneMsg(zone,role==='avis'?'Avis de valeur déposé : le client peut le télécharger dans son espace.':'Fichier ajouté.',true);
        return;
      }
      var f=fichiers[n++];
      if(f.size>TAILLE_MAX){erreurs.push(f.name+' : plus de 10 Mo.');return suite();}
      zoneMsg(zone,'Envoi '+n+' sur '+fichiers.length+'…',true);
      EE.api('/admin/fichier?demande='+id+'&role='+role+(role==='document'&&$('[data-doc-nature]',row).value?'&libelle='+$('[data-doc-nature]',row).value:''),{fichier:f,nom:f.name,delai:120000}).then(function(d){
        if(d._status===201){
          liste.insertAdjacentHTML('beforeend',fichier(d.fichier)); if(x){(x.fichiers=x.fichiers||[]).push(d.fichier);}
          if(d.statut&&x&&x.statut!==d.statut){x.statut=d.statut;$('[data-f=statut]',row).value=d.statut;var st=$('summary .st',row);st.className='st '+d.statut;st.textContent=STATUTS[d.statut];stats();}
          if(role==='avis'){var he=$('[data-avis-etat]',row);if(he)he.textContent='Avis de valeur déposé le '+EE.jour(new Date().toISOString())+'.';}
        } else erreurs.push(f.name+' : '+EE.message(d));
        suite();
      });
    }
    suite();
  });
  $('#ad-crows').addEventListener('click',function(e){
    var l=e.target.closest('[data-lien]');
    if(l){
      var row=l.closest('.ee-row'), id=+row.getAttribute('data-cid'), out=$('[data-lien-out]',row), c=Cp.filter(function(x){return x.id===id;})[0]||{}, type=l.getAttribute('data-lien');
      EE.api('/admin/compte/lien',{body:{id:id,type:type}}).then(function(d){
        out.hidden=false;
        if(d._status!==200){out.className='ee-err';out.textContent=EE.message(d);return;}
        var txt='Bonjour '+(c.prenom||'')+', voici le lien pour '+(type==='reinit'?'choisir un nouveau mot de passe pour votre espace':'ouvrir votre espace et retrouver votre estimation')+' (valable 24 h, une seule fois) : '+d.lien;
        out.className='ee-ok';
        out.innerHTML=(type==='reinit'?'Lien « nouveau mot de passe »':'Lien de connexion')+', valable 24 h, à transmettre au client :<br><span style="word-break:break-all;" data-test="lien">'+EE.esc(d.lien)+'</span><br>'+
          (c.telephone?'<a href="https://wa.me/'+EE.esc(String(c.telephone).replace(/\D/g,'').replace(/^0/,'33'))+'?text='+encodeURIComponent(txt)+'" target="_blank" rel="noopener">Envoyer par WhatsApp</a> · <a href="sms:'+EE.esc(String(c.telephone).replace(/[^\d+]/g,''))+'?&body='+encodeURIComponent(txt)+'">par SMS</a> · ':'')+
          '<a href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre espace estimation')+'&body='+encodeURIComponent(txt)+'">par e-mail</a>';
      });
      return;
    }
    var b=e.target.closest('[data-del]'); if(!b)return;
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer : compte et estimations effacés';return;}
    EE.api('/admin/compte/supprimer',{body:{id:+b.getAttribute('data-del')}}).then(function(d){ if(d._status===200)charger(); else b.textContent=EE.message(d); });
  });
  $('#ad-flux').addEventListener('click',function(){
    var b=this, out=$('#ad-flux-out');
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer : l\'ancienne clé ne marchera plus';return;}
    EE.api('/admin/flux',{body:{}}).then(function(d){
      out.hidden=false; b.removeAttribute('data-ok'); b.textContent='Créer une nouvelle clé';
      if(d._status!==200){out.className='ee-err';out.textContent=EE.message(d);return;}
      out.className='ee-ok'; out.innerHTML='Nouvelle clé créée. Collez cette formule dans la cellule A1 de l\'onglet « Site » (elle ne sera plus affichée) :<br><span style="word-break:break-all;" data-test="formule">'+EE.esc(d.formule)+'</span>';
    });
  });
  $('#ad-rdv-save').addEventListener('click',function(){
    var out=$('#ad-rdv-out');
    EE.api('/admin/reglages',{body:{rdv_url:$('#ad-rdv-url').value.trim()}}).then(function(d){
      out.hidden=false;
      if(d._status!==200){out.className='ee-err';out.textContent=EE.messageChamp(d);return;}
      out.className='ee-ok'; out.textContent=d.rdv_url?'Enregistré : les vendeurs choisissent leur créneau dans votre agenda.':'Enregistré : les vendeurs proposent jusqu\'à 3 créneaux, vous confirmez.';
    });
  });
  /* connexion sans mot de passe : l'agence demande son lien ici, il rouvre cette page (c'est aussi l'entrée des agents) */
  $('#ad-lien').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, m=$('#ad-email'), b=$('#ad-lien-btn'); m.value=m.value.replace(/\s+/g,'');
    if(!EE.err(m,!EE.emailOk(m.value))){m.focus();return;}
    zoneMsg(f,''); b.disabled=true;
    EE.api('/lien',{body:{email:m.value,vers:'admin',site:C.site||undefined}}).then(function(d){
      b.disabled=false;
      if(d._status!==200){zoneMsg(f,EE.messageChamp(d));return;}
      if(d.envoye)zoneMsg(f,'Si cette adresse est celle de l\'agence, un lien vient d\'y être envoyé. Il ouvre l\'espace agence, dure 30 minutes et ne sert qu\'une fois.',true);
      else zoneMsg(f,'L\'envoi de liens vers cette adresse n\'est pas encore ouvert. Connectez-vous avec votre mot de passe.');
    });
  });
  /* arrivée depuis l'e-mail d'alerte : /admin/?q=<référence> ; depuis le lien de connexion : /admin/?lien=<jeton> */
  var qs0=new URLSearchParams(location.search), q0=qs0.get('q'); if(q0)$('#ad-q').value=q0;
  if(qs0.get('lien')){
    EE.api('/lien/ouvrir',{body:{jeton:qs0.get('lien')}}).then(function(d){
      qs0.delete('lien'); history.replaceState(null,'',location.pathname+(qs0.toString()?'?'+qs0.toString():''));
      EE.pictogramme();
      charger().then(function(){ if(d._status!==200&&!$('#ad-no').hidden)zoneMsg($('#ad-lien'),d.error==='jeton'?'Ce lien de connexion n\'est plus valable : il dure 30 minutes et ne sert qu\'une fois. Demandez-en un nouveau.':EE.message(d)); });
    });
  } else charger();
})();
