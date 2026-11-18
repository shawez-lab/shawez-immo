import { json,Erreur,corps,limiter,ip } from '../_lib/base.js';
import { schema } from './prospects.js';
import { recevoirRelais } from '../_lib/relais-google.js';
import { veille } from '../_lib/prospects.js';
export async function onRequest(ctx){try{
 const {request,env}=ctx;if(request.method!=='POST')return json(405,{error:'methode'});await limiter(env,'relais-google:'+ip(request),30,3600);
 const auth=/^Bearer ([\w.-]+)$/.exec(request.headers.get('Authorization')||'');if(!auth)return json(401,{error:'identite_google_requise'});await schema(env);
 const d=await corps(request,500000);const resultat=await recevoirRelais(env,auth[1],d);const v=await veille(ctx);return json(200,{...resultat,mode:'entrants_uniquement',veille:v.etat,complet:resultat.complet&&v.etat==='ok'});
 }catch(e){return e instanceof Erreur?json(e.status,{error:e.code,...(e.extra?.audience?{audience:e.extra.audience}:{}),...(e.extra?.diagnostic?{diagnostic:e.extra.diagnostic}:{})}):json(503,{error:'relais_google_indisponible',complet:false});}}
