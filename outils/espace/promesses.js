/* /admin/promesses/ : les 7 promesses faites au vendeur, sur 7 et 30 jours — tenue ou ratée, délai médian,
   et la liste de ce qu'il faut regarder. Tout est calculé par l'API (/admin/promesses) sur les dossiers et leur journal. */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, C=EE.CONF, esc=EE.esc;
  var T=null, JOURS=7;
  $$('[data-ee-lien]').forEach(function(a){var k=a.getAttribute('data-ee-lien');if(C[k])a.href=C[k];});

  var ETATS={tenue:['ok','Tenue'],ratee:['ko','Ratée'],en_cours:['att','En cours'],vide:['','Pas encore de mesure']};
  function s(n,mot){ return n+' '+mot+(n>1?'s':''); }
  function debutDans(m){ return new Date(m.debut).getTime()>=new Date(T.calcule_le).getTime()-JOURS*86400000; }
  function chiffres(b){
    var l=[];
    if(b.tenue)l.push('<span><b>'+b.tenue+'</b> '+(b.tenue>1?'tenues':'tenue')+'</span>');
    if(b.ratee)l.push('<span class="ko"><b>'+b.ratee+'</b> '+(b.ratee>1?'ratées':'ratée')+'</span>');
    if(b.en_cours)l.push('<span><b>'+b.en_cours+'</b> en cours</span>');
    return l.join('');
  }
  function carte(p){
    var b=p.periodes[JOURS], e=ETATS[b.etat]||ETATS.vide;
    var liste=(p.a_regarder||[]).filter(debutDans);
    var h='<article class="ee-card ee-prom" data-promesse="'+p.n+'" data-etat="'+b.etat+'">'+
      '<div class="ee-prom-t"><p class="ee-count">Promesse '+p.n+'</p><span class="tag '+e[0]+'" data-test="etat">'+e[1]+(b.etat==='ratee'&&b.ratee>1?'s : '+b.ratee:'')+'</span></div>'+
      '<h2>'+esc(p.titre)+'</h2>';
    if(b.etat==='vide')h+='<p class="ee-prom-vide">'+(b.hors?s(b.hors,'dossier')+' hors mesure sur cette période.':'Rien à mesurer sur cette période.')+'</p>';
    else{
      h+='<p class="ee-prom-n" data-test="chiffres">'+chiffres(b)+'</p>';
      var lignes=[];
      if(b.taux!=null)lignes.push(['Tenue',b.tenue+' fois sur '+(b.tenue+b.ratee)+' ('+b.taux+' %)']);
      if(b.mediane_txt)lignes.push(['Délai médian',b.mediane_txt]);
      if(b.hors)lignes.push(['Hors mesure',s(b.hors,'dossier')]);
      if(lignes.length)h+='<ul class="ee-kv">'+lignes.map(function(x){return '<li><span>'+x[0]+'</span><span data-test="'+(x[0]==='Délai médian'?'mediane':x[0]==='Tenue'?'taux':'hors')+'">'+esc(x[1])+'</span></li>';}).join('')+'</ul>';
    }
    if(liste.length){
      var nr=liste.filter(function(m){return m.resultat==='ratee';}).length;
      h+='<details class="ee-prom-liste"'+(nr?' open':'')+'><summary>'+(nr?'Voir '+(nr>1?'les '+nr+' ratées':'la ratée')+(liste.length>nr?' et '+(liste.length-nr)+' en cours':''):'Voir '+(liste.length>1?'les '+liste.length:'le dossier')+' en cours')+'</summary><ul class="ee-items">'+
        liste.map(function(m){
          return '<li><p class="t"><b>'+esc(m.vendeur||m.reference||'Dossier')+(m.commune?' · '+esc(m.commune):'')+'</b><span class="tag '+(m.resultat==='ratee'?'ko':'att')+'">'+(m.resultat==='ratee'?'Ratée':'En cours')+'</span></p>'+
            '<p class="meta">'+[m.detail,m.delai_txt,m.date===''?'':m.date?'visite du '+EE.jourLong(m.date):EE.quandCourt(m.debut)].filter(Boolean).map(esc).join(' · ')+'</p>'+
            (m.reference?'<div class="ee-links"><a href="'+esc(C.admin)+'?q='+encodeURIComponent(m.reference)+'">Ouvrir le dossier</a></div>':'')+'</li>';
        }).join('')+'</ul></details>';
    }
    h+='<p class="meta">'+esc(p.regle)+'</p></article>';
    return h;
  }
  function dessiner(){
    var l=T.promesses, n=function(e){return l.filter(function(p){return p.periodes[JOURS].etat===e;}).length;};
    var tenues=n('tenue'), ratees=n('ratee'), reste=l.length-tenues-ratees;
    $('#pr-stats').innerHTML=[[tenues,tenues>1?'Tenues':'Tenue','tenues'],[ratees,ratees>1?'Ratées':'Ratée','ratees'],[reste,'En attente','reste']].map(function(x){return '<div class="ee-stat'+(x[2]==='ratees'&&x[0]?' ko':'')+'" data-test="'+x[2]+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>';}).join('');
    $('#pr-cartes').innerHTML=l.map(carte).join('');
    var al=$('#pr-alerte');
    if(!T.email_clients){ al.hidden=false; al.innerHTML='<b>La promesse 7 ne peut pas être tenue aujourd\'hui :</b> les e-mails aux vendeurs ne sont pas encore ouverts. Chaque changement de statut compte donc comme raté.'; } else al.hidden=true;
    $('#pr-pied').textContent='Calculé le '+EE.quand(T.calcule_le)+', sur ce qui est noté dans les dossiers. Les essais ne comptent pas.';
    $('#pr-export').href=C.api+'/admin/promesses.csv?jours='+JOURS;
    $$('[data-jours]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-jours')===JOURS));});
  }
  $$('[data-jours]').forEach(function(b){b.addEventListener('click',function(){JOURS=+b.getAttribute('data-jours');if(T)dessiner();});});

  EE.api('/admin/promesses').then(function(d){
    $('#pr-load').hidden=true;
    if(d._status!==200||!d.promesses){
      $('#pr-no').hidden=false;
      if(d.error==='interdit')$('#pr-no-txt').textContent='Ce compte n\'a pas accès à l\'espace agence.';
      else if(d.error==='admin_non_verifie')$('#pr-no-txt').textContent='Votre adresse doit être confirmée : demandez votre lien de connexion depuis l\'espace agence.';
      else if(d._status!==401&&d._status!==403)$('#pr-no-txt').textContent=EE.message(d);
      return;
    }
    T=d; $('#pr-in').hidden=false; dessiner();
  });
})();
