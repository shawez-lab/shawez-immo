/* Espace estimation : outils communs (estimer, mon-espace, admin) */
var EE=(function(){
  'use strict';
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function euros(n){return n==null?'':Math.round(n).toLocaleString('fr-FR').replace(/ | /g,' ')+' €';}
  function date(s){try{return new Date(s).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}catch(e){return s;}}
  function mois(s){ if(!s)return ''; try{return new Date(s+'T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});}catch(e){return s;} }
  function api(chemin,opts){
    opts=opts||{};
    var init={method:opts.method||'GET',credentials:'same-origin',headers:{}};
    if(opts.body!==undefined){init.method=opts.method||'POST';init.headers['Content-Type']='application/json';init.body=JSON.stringify(opts.body);}
    return fetch('/api/espace'+chemin,init).then(function(r){
      return r.json().catch(function(){return {};}).then(function(d){d=d||{};d._status=r.status;return d;});
    },function(){return {_status:0,error:'reseau'};});
  }
  var MSG={reseau:"La connexion a échoué. Vérifiez votre réseau et réessayez.",trop_de_demandes:"Trop d'essais d'affilée. Réessayez dans quelques minutes.",identifiants:"E-mail ou mot de passe incorrect.",serveur:"Un souci technique de notre côté. Réessayez, ou appelez Shawez au 07 67 57 92 28.",base_absente:"L'espace n'est pas encore ouvert. Appelez Shawez au 07 67 57 92 28.",compte_existe:"Un espace existe déjà avec cet e-mail.",champs:"Un champ est incomplet ou mal rempli.",jeton:"Ce lien n'est plus valable. Demandez-en un nouveau.",origine:"Requête refusée.",connexion:"Votre session a expiré : reconnectez-vous."};
  function message(d){return MSG[d&&d.error]||MSG.serveur;}
  var TEL='+33767579228';
  function wa(txt){return 'https://wa.me/33767579228?text='+encodeURIComponent(txt);}
  /* bloc résultat (fond sombre) */
  function resultat(res,ref,adresse){
    var h='';
    if(res&&res.fourchette){
      h+='<p class="label">Votre estimation · indicative</p>'+
        '<p class="ee-price"><span>'+euros(res.bas)+'</span><em>–</em><span>'+euros(res.haut)+'</span></p>'+
        '<p class="ee-m2">Soit environ <b>'+euros(res.prix_m2)+'/m²</b>'+(adresse?' · '+esc(adresse):'')+'</p>'+
        '<p class="ee-warn"><span><b>Indicatif, à confirmer par une visite.</b> Le calcul ne voit ni la lumière, ni la vue, ni les finitions : c\'est la visite qui donne le prix juste.</span></p>'+
        '<ul class="ee-facts">'+
          '<li><span>Ventes comparables</span><span>'+res.comparables+' ventes à moins de '+(res.rayon>=1000?(res.rayon/1000).toLocaleString('fr-FR')+' km':res.rayon+' m')+'</span></li>'+
          '<li><span>Prix médian du secteur</span><span>'+euros(res.m2_quartier)+'/m²</span></li>'+
          ((res.ajustements||[]).length?'<li><span>Ajustements</span><span>'+res.ajustements.map(function(a){return esc(a.libelle)+' '+(a.pct>0?'+':'')+a.pct+' %';}).join('<br>')+'</span></li>':'')+
          '<li><span>Source</span><span>Ventes réelles DVF'+(res.annees?' '+res.annees[0]+'–'+res.annees[res.annees.length-1]:'')+(res.donnees_du?', à jour de '+mois(res.donnees_du):'')+'</span></li>'+
        '</ul>';
    } else {
      h+='<p class="label">Votre demande est enregistrée</p>'+
        '<p class="ee-price" style="font-size:clamp(2rem,6vw,3rem);">Shawez vous rappelle <em>sous 24 h.</em></p>'+
        '<p class="ee-m2">'+(res&&res.raison==='peu_de_ventes'?"Il y a eu trop peu de ventes comparables près de chez vous pour donner une fourchette fiable : Shawez l'étudie lui-même.":res&&res.raison==='type'?"Pour ce type de bien, l'estimation se fait sur pièces : Shawez l'étudie lui-même.":res&&res.raison==='hors_zone'?"Ce secteur est hors de la Côte-d'Or : Shawez vous dit ce qu'il peut faire pour vous.":"Shawez étudie votre bien lui-même et vous donne une première fourchette au téléphone.")+'</p>'+
        (res&&res.donnees_du?'<p class="ee-warn"><span>Données des ventes réelles (DVF) à jour de '+mois(res.donnees_du)+'.</span></p>':'');
    }
    if(ref)h+='<ul class="ee-facts" style="margin-top:0;border-top:0;"><li><span>Référence</span><span>'+esc(ref)+'</span></li></ul>';
    h+='<div class="btn-row">'+
      '<a class="btn btn-primary btn-lg" href="tel:'+TEL+'">Prendre rendez-vous <span class="arw">→</span></a>'+
      '<a class="btn btn-ghost" href="'+wa('Bonjour Shawez, je viens de faire mon estimation en ligne'+(ref?' (réf. '+ref+')':'')+'. ')+'" target="_blank" rel="noopener">WhatsApp</a>'+
      '<a class="btn btn-ghost" href="/mon-espace/">Mon espace</a>'+
    '</div>';
    return h;
  }
  function voirMdp(root){
    $$('[data-voir]',root).forEach(function(b){b.addEventListener('click',function(){var i=document.getElementById(b.getAttribute('data-voir'));var v=i.type==='password';i.type=v?'text':'password';b.textContent=v?'Masquer':'Afficher';});});
  }
  return {$:$,$$:$$,esc:esc,euros:euros,date:date,mois:mois,api:api,message:message,resultat:resultat,voirMdp:voirMdp,TEL:TEL,wa:wa};
})();
