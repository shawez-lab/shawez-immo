import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../hero_pick.js', import.meta.url), 'utf8');

function navigateur({complete=false, desktop=false, saveData=false, reduced=false}={}) {
  const frames=[], events={}, attrs={}, loads=[];
  const sources=['m','d'].map(kind=>({
    attrs:{'data-for':kind,'data-src':kind==='m'?'/hero.mp4':'/film-equipe-bg.mp4','data-src-lent':'/hero-720.mp4'},
    getAttribute(k){return this.attrs[k];},removeAttribute(k){delete this.attrs[k];}
  }));
  const video={attrs:{'data-poster-m':'/hero-poster.webp','data-poster-d':'/film-equipe-bg-poster.webp'},
    getAttribute(k){return this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;},pause(){},load(){loads.push('load');}};
  const context={heroV:video,heroMQ:{matches:desktop},AUTOPLAY:!reduced,PERF:reduced?'accessible':'auto',
    navigator:{connection:{saveData,effectiveType:'4g'}},document:{readyState:complete?'complete':'loading'},
    window:{addEventListener(n,f){events[n]=f;}},requestAnimationFrame(f){frames.push(f);},
    $$(selector,v){assert.equal(selector,'source');assert.equal(v,video);return sources;},kickVideos(){}};
  vm.createContext(context);vm.runInContext(source,context);
  return {context,video,sources,frames,events,loads};
}

test('mobile : aucune source ni lecture avant load et deux frames',()=>{
  const b=navigateur();b.context.heroPick();b.context.heroPick();
  assert.equal(b.frames.length,0);assert.equal(b.loads.length,0);
  assert.ok(b.sources.every(s=>!s.src));
  b.context.document.readyState='complete';b.events.load();
  b.frames.shift()();assert.equal(b.loads.length,0);
  b.frames.shift()();assert.deepEqual(b.loads,['load']);
  assert.equal(b.sources[0].src,'/hero.mp4');assert.equal(b.sources[1].src,undefined);
  assert.equal(b.video.preload,'metadata');
  b.context.heroPick();assert.equal(b.loads.length,1);
});

test('bureau déjà chargé : attend aussi les deux frames',()=>{
  const b=navigateur({complete:true,desktop:true});b.context.heroPick();
  assert.equal(b.loads.length,0);b.frames.shift()();b.frames.shift()();
  assert.equal(b.sources[1].src,'/film-equipe-bg.mp4');assert.equal(b.sources[0].src,undefined);
});

for(const option of ['saveData','reduced'])test(option+' : affiche seule, sans chargement',()=>{
  const b=navigateur({complete:true,[option]:true});b.context.heroPick();
  assert.equal(b.frames.length,0);assert.equal(b.loads.length,0);assert.ok(b.sources.every(s=>!s.src));
});
