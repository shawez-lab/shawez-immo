/* /admin/ : toutes les demandes et tous les comptes ; statut, notes, export CSV */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$;
  var D=[], C=[], STATUTS={};
  var LIB={
    delai:{asap:'Dès que possible','6mois':'Dans les 6 mois',plus6mois:'Plus de 6 mois',nsp:'Ne sait pas',aucun:'Pas de projet'},
    etat:{travaux:'Travaux importants',rafraichir:'Quelques travaux',bon:'Bon état',neuf:'Refait à neuf'},
    epoque:{avant1948:'Avant 1948','1948-1974':'1948 – 1974','1975-2000':'1975 – 2000','2001-2012':'2001 – 2012',apres2012:'Après 2012',nsp:'Ne sait pas'},
    autre_type:{commerce:'Fonds de commerce',murs:'Murs commerciaux',immeuble:'Immeuble',terrain:'Terrain',autre:'Autre'}
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
  function ligne(d){
    var c=d.contact||{}, nom=[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ');
    var opts=Object.keys(STATUTS).map(function(k){return '<option value="'+k+'"'+(k===d.statut?' selected':'')+'>'+EE.esc(STATUTS[k])+'</option>';}).join('');
    return '<details class="ee-row" data-id="'+d.id+'"><summary><b>'+EE.esc(nom||c.email)+' · '+EE.esc(d.commune||'')+'</b>'+
      '<span class="st '+d.statut+'">'+EE.esc(STATUTS[d.statut]||d.statut)+'</span>'+
      '<small>'+EE.date(d.cree_le)+' · '+EE.esc((d.type==='autre'?'Autre':d.type==='maison'?'Maison':'Appart.')+(d.surface?' '+d.surface+' m²':''))+' · '+(d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut):'rappel')+' · '+EE.esc(d.source||'')+'</small></summary>'+
      '<div class="in"><div>'+
        '<div class="acts"><a class="btn btn-primary" href="tel:'+EE.esc(String(c.telephone||'').replace(/[^\d+]/g,''))+'">Appeler '+EE.esc(c.telephone||'')+'</a><a class="btn" href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre estimation '+d.reference)+'">E-mail</a></div>'+
        '<ul class="ee-kv" style="margin-top:14px;">'+[['Référence',d.reference],['E-mail',c.email],['Fourchette',d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+' ('+EE.euros(d.prix_m2)+'/m², '+d.comparables+' ventes)':'Pas de fourchette']].concat(fiche(d.reponses||{})).map(function(l){return '<li><span>'+EE.esc(l[0])+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('')+'</ul>'+
      '</div><div style="display:flex;flex-direction:column;gap:12px;">'+
        '<div class="field"><label>Statut</label><select data-f="statut">'+opts+'</select></div>'+
        '<div class="field"><label>Notes (visibles par l\'agence seulement)</label><textarea data-f="notes" maxlength="5000">'+EE.esc(d.notes||'')+'</textarea></div>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-save>Enregistrer</button><span class="saved" hidden>Enregistré</span></div>'+
      '</div></div></details>';
  }
  function filtrer(){
    var q=$('#ad-q').value.trim().toLowerCase(), s=$('#ad-statut').value;
    var l=D.filter(function(d){ if(s&&d.statut!==s)return false; if(!q)return true; var c=d.contact||{}; return [c.prenom,c.nom,c.email,c.telephone,d.commune,d.adresse,d.reference,d.source].join(' ').toLowerCase().indexOf(q)>=0; });
    $('#ad-rows').innerHTML=l.length?l.map(ligne).join(''):'<div class="ee-empty">Aucune demande.</div>';
  }
  function stats(){
    var n=function(s){return D.filter(function(d){return d.statut===s;}).length;};
    $('#ad-stats').innerHTML=[['Demandes',D.length],['À traiter',n('recue')],['Visites prévues',n('visite')],['Comptes',C.length]].map(function(x){return '<div class="ee-stat"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>';}).join('');
  }
  function comptes(){
    var q=$('#ad-qc').value.trim().toLowerCase();
    var l=C.filter(function(c){return !q||[c.prenom,c.nom,c.email,c.telephone].join(' ').toLowerCase().indexOf(q)>=0;});
    $('#ad-crows').innerHTML=l.length?l.map(function(c){
      return '<details class="ee-row" data-cid="'+c.id+'"><summary><b>'+EE.esc([c.civilite,c.prenom,c.nom].filter(Boolean).join(' ')||c.email)+'</b><span class="st">'+c.demandes+' est.</span><small>'+EE.esc(c.email)+' · '+EE.esc(c.telephone||'')+' · créé le '+EE.date(c.cree_le)+(c.admin?' · admin':'')+'</small></summary>'+
        '<div class="in"><ul class="ee-kv">'+[['E-mail',c.email+(c.verifie?' (confirmé)':' (non confirmé)')],['Téléphone',c.telephone||'—'],['Source',c.source||'—'],['Dernière connexion',c.derniere_connexion?EE.date(c.derniere_connexion):'—']].map(function(x){return '<li><span>'+x[0]+'</span><span>'+EE.esc(x[1])+'</span></li>';}).join('')+'</ul>'+
        '<div class="acts">'+(c.telephone?'<a class="btn btn-primary" href="tel:'+EE.esc(c.telephone.replace(/[^\d+]/g,''))+'">Appeler</a>':'')+'<button type="button" class="btn" data-lien="'+c.id+'">Lien nouveau mot de passe</button>'+(c.admin?'':'<button type="button" class="btn" data-del="'+c.id+'">Supprimer ce compte</button>')+'</div><p class="ee-ok" data-lien-out hidden></p></div></details>';
    }).join(''):'<div class="ee-empty">Aucun compte.</div>';
  }
  function charger(){
    Promise.all([EE.api('/admin/demandes'),EE.api('/admin/comptes')]).then(function(r){
      $('#ad-load').hidden=true;
      if(r[0]._status!==200){
        $('#ad-no').hidden=false;
        if(r[0].error==='admin_non_verifie')$('#ad-no-txt').textContent='Votre adresse doit être confirmée avant d\'ouvrir l\'espace agence : cliquez sur le lien reçu par e-mail (ou renvoyez-le depuis Mon espace).';
        else if(r[0].error==='interdit')$('#ad-no-txt').textContent='Ce compte n\'a pas accès à l\'espace agence.';
        else if(r[0]._status!==401&&r[0]._status!==403)$('#ad-no-txt').textContent=EE.message(r[0]);
        return;
      }
      STATUTS=r[0].statuts; D=r[0].demandes; C=r[1].comptes||[];
      $('#ad-statut').innerHTML='<option value="">Tous les statuts</option>'+Object.keys(STATUTS).map(function(k){return '<option value="'+k+'">'+EE.esc(STATUTS[k])+'</option>';}).join('');
      $('#ad-in').hidden=false; stats(); filtrer(); comptes();
    });
  }
  $('#ad-q').addEventListener('input',filtrer); $('#ad-statut').addEventListener('change',filtrer); $('#ad-qc').addEventListener('input',comptes);
  $$('[data-vue]').forEach(function(b){b.addEventListener('click',function(){var v=b.getAttribute('data-vue');$('#ad-demandes').hidden=v!=='demandes';$('#ad-comptes').hidden=v!=='comptes';$$('[data-vue]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});
  $('#ad-rows').addEventListener('click',function(e){
    var b=e.target.closest('[data-save]'); if(!b)return;
    var row=b.closest('.ee-row'), id=+row.getAttribute('data-id');
    var corps={id:id,statut:$('[data-f=statut]',row).value,notes:$('[data-f=notes]',row).value};
    b.disabled=true;
    EE.api('/admin/demande',{body:corps}).then(function(d){
      b.disabled=false;
      if(d._status!==200){alertMsg(row,EE.message(d));return;}
      var x=D.filter(function(k){return k.id===id;})[0]; if(x){x.statut=corps.statut;x.notes=corps.notes;}
      var s=$('.saved',row); s.hidden=false; s.textContent='Enregistré'; setTimeout(function(){s.hidden=true;},2500);
      var st=$('summary .st',row); st.className='st '+corps.statut; st.textContent=STATUTS[corps.statut]; stats();
    });
  });
  function alertMsg(row,t){var s=$('.saved',row);s.hidden=false;s.style.color='#7E2C1F';s.textContent=t;}
  $('#ad-crows').addEventListener('click',function(e){
    var l=e.target.closest('[data-lien]');
    if(l){
      var row=l.closest('.ee-row'), out=$('[data-lien-out]',row), c=C.filter(function(x){return x.id===+l.getAttribute('data-lien');})[0]||{};
      EE.api('/admin/compte/lien',{body:{id:+l.getAttribute('data-lien')}}).then(function(d){
        out.hidden=false;
        if(d._status!==200){out.className='ee-err';out.textContent=EE.message(d);return;}
        var txt='Bonjour '+(c.prenom||'')+', voici le lien pour choisir un nouveau mot de passe pour votre espace (valable 24 h) : '+d.lien;
        out.className='ee-ok';
        out.innerHTML='Lien valable 24 h, à transmettre au client :<br><span style="word-break:break-all;">'+EE.esc(d.lien)+'</span><br>'+
          (c.telephone?'<a href="https://wa.me/'+EE.esc(String(c.telephone).replace(/\D/g,'').replace(/^0/,'33'))+'?text='+encodeURIComponent(txt)+'" target="_blank" rel="noopener">Envoyer par WhatsApp</a> · ':'')+
          '<a href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre espace estimation')+'&body='+encodeURIComponent(txt)+'">par e-mail</a>';
      });
      return;
    }
    var b=e.target.closest('[data-del]'); if(!b)return;
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer : compte et estimations effacés';return;}
    EE.api('/admin/compte/supprimer',{body:{id:+b.getAttribute('data-del')}}).then(function(d){ if(d._status===200)charger(); else b.textContent=EE.message(d); });
  });
  charger();
})();
