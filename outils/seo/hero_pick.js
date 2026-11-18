/* Source du héros d’accueil : deux images rendues après load avant toute source vidéo. */
var heroPainted=false, heroPending=false;
function heroPick(){
  if(!heroV)return;
  var want=heroMQ.matches?'d':'m';
  var poster=heroV.getAttribute(want==='d'?'data-poster-d':'data-poster-m');
  if(poster)heroV.poster=poster;
  var cn=navigator.connection;
  if(!AUTOPLAY||PERF==='accessible'||(cn&&cn.saveData)){
    heroV.pause();
    return;
  }
  if(!heroPainted){
    if(heroPending)return;
    heroPending=true;
    var afterLoad=function(){
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        heroPainted=true;
        heroPending=false;
        heroPick();
        kickVideos();
      });});
    };
    if(document.readyState==='complete')afterLoad();
    else window.addEventListener('load',afterLoad,{once:true});
    return;
  }
  if(heroV.getAttribute('data-kind')===want)return;
  var slow=!!(cn&&/2g|3g/.test(cn.effectiveType||''));
  $$('source',heroV).forEach(function(s){
    if(s.getAttribute('data-for')===want)s.src=(slow&&s.getAttribute('data-src-lent'))||s.getAttribute('data-src');
    else s.removeAttribute('src');
  });
  heroV.setAttribute('data-kind',want);
  heroV.preload='metadata';
  heroV.muted=true;
  heroV.defaultMuted=true;
  heroV.setAttribute('muted','');
  heroV.load();
}
