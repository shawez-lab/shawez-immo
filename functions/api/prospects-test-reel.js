import {json,Erreur,corps,compteSession,estAdmin,verifierOrigine,limiter} from '../_lib/base.js';
import {onRequest as manychat} from './manychat-dm.js';
import {onRequest as espace} from './espace/[[route]].js';
import {reelPublie} from '../_lib/entrees-reels.js';
export async function onRequest(ctx){try{
 const {env,request}=ctx;verifierOrigine(request);const c=await compteSession(request,env);
 if(!c||!estAdmin(c,env))throw new Erreur(403,'agence');
 if(request.method!=='POST'||new URL(request.url).origin!=='https://shawez-immo.com')throw new Erreur(403,'production_requise');
 const d=await corps(request,2000);if(!/^[\w-]{16,50}$/.test(d.test_id||'')||!['reponse','lead','controle'].includes(d.phase))throw new Erreur(400,'test_id_ou_phase');
 const reel=await reelPublie(env.DB,d.media_id);if(!reel)throw new Erreur(404,'reel_non_identifie');
 await limiter(env,'test-reel-agence:'+c.id,30,3600);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS dm_reels_tests(id TEXT PRIMARY KEY,media_id TEXT NOT NULL,disponibles INTEGER NOT NULL DEFAULT 0,doublons INTEGER NOT NULL DEFAULT 0,lead_rejoue INTEGER NOT NULL DEFAULT 0)').run();
 await env.DB.prepare('INSERT OR IGNORE INTO dm_reels_tests(id,media_id) VALUES(?,?)').bind(d.test_id,reel.id).run();
 const etat=await env.DB.prepare('SELECT * FROM dm_reels_tests WHERE id=?').bind(d.test_id).first();if(etat.media_id!==reel.id)throw new Erreur(409,'test_autre_reel');
 const contact='codex-test-'+d.test_id,evenement='test-reel-'+contact,cle='test-reel-'+d.test_id;
 // Les trois réponses sont appelées par trois requêtes HTTP distinctes : chaque
 // invocation conserve son budget D1, même sur le forfait Workers gratuit.
 if(d.phase==='reponse'){
  const r=await manychat({env,request:new Request('https://shawez-immo.com/api/manychat-dm',{method:'POST',headers:{'X-Boss-Token':env.MANYCHAT_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({action:'test_entree',source:'reel_identifie',media_id:reel.id,contact_id:contact,ig_username:'__test_attribution__',first_name:'TEST'})})});
  if(!r.ok)throw new Erreur(503,'test_reponse_indisponible');const x=await r.json();if(x.envoyer!=='non')throw new Erreur(503,'test_message_non_bloque');
  const disponible=x.test_reponse===true,doublon=x.raison==='doublon_reel';if(!disponible&&!doublon)throw new Erreur(503,'test_reponse_'+String(x.raison||'inconnue').replace(/[^a-z_]/g,''));
  await env.DB.prepare('UPDATE dm_reels_tests SET disponibles=disponibles+?,doublons=doublons+? WHERE id=?').bind(disponible?1:0,doublon?1:0,d.test_id).run();
  return json(200,{reponse_disponible:disponible,doublon_bloque:doublon,message_envoye:false});
 }
 if(d.phase==='lead'){
  const a=await env.DB.prepare('SELECT token FROM dm_reels_attribution WHERE evenement=? AND media_id=?').bind(evenement,reel.id).first();if(!a)throw new Erreur(503,'test_attribution_absente');
  const payload={cle,consentement:true,duree:5000,reel_source:a.token,contact:{prenom:'TEST',nom:'Attribution Reel',email:'reel-'+d.test_id+'@test.invalid',telephone:'0000000000'},reponses:{type:'autre',autre_type:'autre',adresse:'TEST technique — aucune adresse réelle',commune:'Dijon',delai:'nsp',surface:1,message:'Test technique autorisé par l’agence. Aucune personne réelle.'}};
  const r=await espace({...ctx,params:{route:['estimation']},request:new Request('https://shawez-immo.com/api/espace/estimation',{method:'POST',headers:{Origin:'https://shawez-immo.com','Content-Type':'application/json'},body:JSON.stringify(payload)})});if(!r.ok)throw new Erreur(503,'test_lead_refuse');
  const x=await r.json();if(x.rejoue)await env.DB.prepare('UPDATE dm_reels_tests SET lead_rejoue=1 WHERE id=?').bind(d.test_id).run();
  return json(200,{reference_test:x.reference,rejoue:!!x.rejoue,email_envoye:false});
 }
 const dossiers=await env.DB.prepare('SELECT id,reference FROM demandes WHERE cle=?').bind(cle).all(),dossier=dossiers.results[0];
 const preuve=dossier?await env.DB.prepare('SELECT media_id,COUNT(*) n FROM demandes_reels_attribution WHERE demande_id=? GROUP BY media_id').bind(dossier.id).first():null;
 const complet=!!preuve&&preuve.media_id===reel.id&&preuve.n===1&&dossiers.results.length===1&&etat.disponibles===1&&etat.doublons>=2&&etat.lead_rejoue===1;
 return json(200,{complet,reel:reel.url,media_id:reel.id,reference_test:dossier?.reference,reponses_disponibles:etat.disponibles,doublons_bloques:etat.doublons,attributions_lead:preuve?.n||0,lead_unique:dossiers.results.length===1,lead_rejoue:etat.lead_rejoue===1,message_envoye:false,email_envoye:false});
}catch(e){return e instanceof Erreur?json(e.status,{error:e.code}):json(503,{error:'test_attribution_indisponible'});}}
