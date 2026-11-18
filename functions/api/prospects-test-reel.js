import {json,Erreur,corps,compteSession,estAdmin,verifierOrigine,limiter} from '../_lib/base.js';
import {onRequest as manychat} from './manychat-dm.js';
import {onRequest as espace} from './espace/[[route]].js';
import {reelPublie} from '../_lib/entrees-reels.js';
export async function onRequest(ctx){try{
 const {env,request}=ctx;verifierOrigine(request);const c=await compteSession(request,env);
 if(!c||!estAdmin(c,env))throw new Erreur(403,'agence');
 if(request.method!=='POST'||new URL(request.url).origin!=='https://shawez-immo.com')throw new Erreur(403,'production_requise');
 const d=await corps(request,2000);if(!/^[\w-]{16,50}$/.test(d.test_id||''))throw new Erreur(400,'test_id');
 const reel=await reelPublie(env.DB,d.media_id);if(!reel)throw new Erreur(404,'reel_non_identifie');
 await limiter(env,'test-reel-agence:'+c.id,4,3600);
 const contact='codex-test-'+d.test_id,evenement='test-reel-'+contact,cle='test-reel-'+d.test_id;
 const precedent=await env.DB.prepare('SELECT id FROM demandes WHERE cle=?').bind(cle).first();
 const appeler=async()=>{const r=await manychat({env,request:new Request('https://shawez-immo.com/api/manychat-dm',{method:'POST',headers:{'X-Boss-Token':env.MANYCHAT_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({action:'test_entree',source:'reel_identifie',media_id:reel.id,contact_id:contact,ig_username:'__test_attribution__',first_name:'TEST'})})});if(!r.ok)throw new Erreur(503,'test_reponse_indisponible');return r.json();};
 const reponses=await Promise.all([appeler(),appeler(),appeler()]);
 if(reponses.some(r=>r.envoyer!=='non'))throw new Erreur(503,'test_message_non_bloque');
 const a=await env.DB.prepare('SELECT token FROM dm_reels_attribution WHERE evenement=? AND media_id=?').bind(evenement,reel.id).first();if(!a)throw new Erreur(503,'test_attribution_absente');
 const payload={cle,consentement:true,duree:5000,reel_source:a.token,contact:{prenom:'TEST',nom:'Attribution Reel',email:'reel-'+d.test_id+'@test.invalid',telephone:''},reponses:{type:'autre',autre_type:'autre',adresse:'TEST technique — aucune adresse réelle',commune:'Dijon',delai:'nsp',surface:1,message:'Test technique autorisé par l’agence. Aucune personne réelle.'}};
 const soumettre=()=>espace({...ctx,params:{route:['estimation']},request:new Request('https://shawez-immo.com/api/espace/estimation',{method:'POST',headers:{Origin:'https://shawez-immo.com','Content-Type':'application/json'},body:JSON.stringify(payload)})});
 const premier=await soumettre();if(!premier.ok)throw new Erreur(503,'test_lead_refuse');
 const second=await soumettre();if(!second.ok)throw new Erreur(503,'test_reprise_refusee');
 const dossier=await env.DB.prepare('SELECT id,reference FROM demandes WHERE cle=?').bind(cle).first();
 const preuve=dossier?await env.DB.prepare('SELECT media_id,COUNT(*) n FROM demandes_reels_attribution WHERE demande_id=? GROUP BY media_id').bind(dossier.id).first():null;
 const n=reponses.filter(r=>r.test_reponse===true).length,complet=!!preuve&&preuve.media_id===reel.id&&preuve.n===1&&(n===1||!!precedent&&n===0);
 return json(200,{complet,reel:reel.url,media_id:reel.id,reference_test:dossier?.reference,reponses_disponibles:n,doublons_bloques:3-n,attributions_lead:preuve?.n||0,lead_unique:!!dossier&&!!(await second.json()).rejoue,rejoue:!!precedent,message_envoye:false,email_envoye:false});
}catch(e){return e instanceof Erreur?json(e.status,{error:e.code}):json(503,{error:'test_attribution_indisponible'});}}
