import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requeteModele} from '../../../functions/_lib/modele.js';
import {onRequest as lead} from '../../../functions/api/lead-tri.js';
import {onRequest as dm} from '../../../functions/api/manychat-dm.js';
const opts={headers:{'x-api-key':'synthetic-key'}};
for(const [status,type,message] of [[401,'authentication_error','invalid x-api-key'],[429,'rate_limit_error','PRIVATE-PAYLOAD'],[503,'overloaded_error','PRIVATE-PAYLOAD']]) {
 test(`modèle ${status} : statut et cause sans corps sensible`,async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json({error:{type,message}},{status}));
  await assert.rejects(requeteModele('https://api.anthropic.com/v1/messages',opts),e=>e.message.includes(String(status))&&e.message.includes(type)&&!e.message.includes('PRIVATE-PAYLOAD'));
 });
}
test('clé absente et réseau : diagnostic borné, aucun secret',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('PRIVATE-NETWORK-DIAGNOSTIC');});
 await assert.rejects(requeteModele('',{headers:{}}),/cle_absente/);
 await assert.rejects(requeteModele('',opts),/^Error: claude reseau_indisponible$/);
});
const env={MANYCHAT_TOKEN:'synthetic-token',ANTHROPIC_API_KEY:'synthetic-key',REGLE9_LEAD_ADRESSES:'["blocked@example.invalid"]',REGLE9_LEAD_NOMS:'["nomexclufictif"]',REGLE9_IG_BASE:'["compteexclufictif"]',DM_COMPTES_TEST:'["comptetestfictif"]'};
for(const [name,handler,path] of [['lead',lead,'lead-tri?test=1'],['dm',dm,'manychat-dm?test=1&intention=vendre']]){
 test(`${name} : 401 modèle -> secours explicite sans envoi réseau`,async t=>{
  const calls=[],logs=[];
  t.mock.method(console,'log',(...args)=>logs.push(args.join(' ')));
  t.mock.method(globalThis,'fetch',async url=>{calls.push(String(url));assert.equal(String(url),'https://api.anthropic.com/v1/messages');return Response.json({error:{type:'authentication_error',message:'invalid x-api-key'}},{status:401});});
  const response=await handler({env,request:new Request('https://site.example.invalid/api/'+path,{headers:{'X-Boss-Token':env.MANYCHAT_TOKEN}})});
  const data=await response.json();assert.equal(response.status,200);assert.equal(calls.length,1,JSON.stringify(data));
  assert.match(data.origine,/401.*authentication_error.*invalid x-api-key/);
  if(name==='lead'){assert.equal(data.decision,'brouillon');assert.equal(data.reponse,null);}
  else {assert.equal(data.envoyer,'oui');assert.ok(data.message);}
  assert.match(logs.join('\n'),/401/);assert.ok(!logs.join('\n').includes(env.ANTHROPIC_API_KEY));
 });
}
