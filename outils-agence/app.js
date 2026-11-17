/* GRAVELIN IMMO — comportements du site. Aucune dépendance. */
(function(){
'use strict';
var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
var calme=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;

/* menu */
var mb=$('.menu-btn'),nav=$('.nav');
if(mb&&nav){mb.addEventListener('click',function(){var o=nav.hasAttribute('data-ouvert');
  if(o){nav.removeAttribute('data-ouvert');}else{nav.setAttribute('data-ouvert','');}
  mb.setAttribute('aria-expanded',String(!o));document.body.style.overflow=o?'':'hidden';});}

/* vitrine : les biens se succèdent sous le toit */
var toit=$('.toit');
if(toit){var imgs=$$('img',toit),car=$('.toit-carton',toit),i=0;
  var montrer=function(n){imgs.forEach(function(im,k){if(k===n)im.setAttribute('data-on','');else im.removeAttribute('data-on');});
    var d=imgs[n].dataset;car.href=d.lien;car.querySelector('b').textContent=d.titre;car.querySelector('span').textContent=d.prix;};
  if(imgs.length>1&&!calme){var pause=false;toit.addEventListener('mouseenter',function(){pause=true});toit.addEventListener('mouseleave',function(){pause=false});
    toit.addEventListener('focusin',function(){pause=true});toit.addEventListener('focusout',function(){pause=false});
    setInterval(function(){if(pause||document.hidden)return;i=(i+1)%imgs.length;if(imgs[i].loading==='lazy')imgs[i].loading='eager';montrer(i);},6500);}
}

/* film : la vidéo n'est chargée qu'au clic */
$$('.film-jouer').forEach(function(b){b.addEventListener('click',function(){var c=b.parentNode,v=document.createElement('video');
  v.src=b.dataset.video;v.controls=true;v.autoplay=true;v.playsInline=true;v.poster=$('img',c).src;c.appendChild(v);b.remove();v.focus();});});

/* liste des biens : filtres */
var liste=$('[data-liste]');
if(liste){var f=$('.filtres'),cartes=$$('.bien',liste),cpt=$('.compte-res'),vide=$('.vide');
  var q=new URLSearchParams(location.search);
  ['type','commune','budget','surface','tri'].forEach(function(k){var el=f.elements[k];if(el&&q.get(k)){el.value=q.get(k);if(el.value!==q.get(k))el.value='';}});
  var appliquer=function(){var v={};['type','commune','budget','surface','tri'].forEach(function(k){v[k]=f.elements[k].value});
    var n=0;cartes.forEach(function(c){var d=c.dataset,ok=true;
      if(v.type&&d.famille!==v.type)ok=false;
      if(v.commune&&d.commune!==v.commune)ok=false;
      if(v.budget&&(!+d.prix||+d.prix>+v.budget))ok=false;
      if(v.surface&&+d.surface<+v.surface)ok=false;
      c.hidden=!ok;if(ok)n++;});
    var cle={'prix-haut':function(a,b){return (+b.dataset.prix||0)-(+a.dataset.prix||0)},'prix-bas':function(a,b){return (+a.dataset.prix||9e9)-(+b.dataset.prix||9e9)},
      'surface':function(a,b){return +b.dataset.surface-+a.dataset.surface},'':function(a,b){return +a.dataset.rang-+b.dataset.rang}}[v.tri||''];
    cartes.slice().sort(cle).forEach(function(c){liste.appendChild(c)});
    cpt.textContent=n===cartes.length?n+' biens à vendre':n===0?'':n===1?'1 bien correspond à votre recherche':n+' biens correspondent à votre recherche';
    vide.hidden=n!==0;
    var p=new URLSearchParams();Object.keys(v).forEach(function(k){if(v[k])p.set(k,v[k])});
    history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));};
  f.addEventListener('change',appliquer);f.addEventListener('submit',function(e){e.preventDefault()});
  var raz=$('[data-raz]');if(raz)raz.addEventListener('click',function(){f.reset();appliquer();});
  appliquer();
}

/* fiche : visionneuse */
var gal=$('.galerie');
if(gal){var photos=JSON.parse(gal.dataset.photos),vis=$('.vis'),vi=$('img',vis),vn=$('.n',vis),k=0,avant=null;
  var voir=function(n){k=(n+photos.length)%photos.length;vi.src=photos[k];vi.alt='Photo '+(k+1)+' sur '+photos.length;vn.textContent=(k+1)+' / '+photos.length;};
  var ouvrir=function(n){avant=document.activeElement;vis.setAttribute('data-on','');document.body.style.overflow='hidden';voir(n);$('.x',vis).focus();};
  var fermer=function(){vis.removeAttribute('data-on');document.body.style.overflow='';if(avant)avant.focus();};
  $$('button',gal).forEach(function(b){b.addEventListener('click',function(){ouvrir(+b.dataset.n)})});
  $('.x',vis).addEventListener('click',fermer);$('.g',vis).addEventListener('click',function(){voir(k-1)});$('.d',vis).addEventListener('click',function(){voir(k+1)});
  vis.addEventListener('click',function(e){if(e.target===vis)fermer()});
  document.addEventListener('keydown',function(e){if(!vis.hasAttribute('data-on'))return;if(e.key==='Escape')fermer();if(e.key==='ArrowLeft')voir(k-1);if(e.key==='ArrowRight')voir(k+1);});
  var x0=null;vis.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
  vis.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50)voir(k+(dx<0?1:-1));x0=null});
}

/* fiche : mensualité */
var calc=$('.calc');
if(calc){var out=$('output',calc),prix=+calc.dataset.prix;
  var eur=function(n){return Math.round(n).toLocaleString('fr-FR')+' €'};
  var maj=function(){var ap=+calc.elements.apport.value||0,an=+calc.elements.duree.value||0,t=parseFloat(String(calc.elements.taux.value).replace(',','.'))||0;
    var c=Math.max(prix-ap,0),n=an*12,m=t/100/12;
    if(!n||!c){out.textContent='';return;}
    var mens=m?c*m/(1-Math.pow(1+m,-n)):c/n;
    out.textContent=eur(mens)+' par mois';};
  calc.addEventListener('input',maj);maj();
}
})();
