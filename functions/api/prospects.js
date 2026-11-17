import { db,json,Erreur,compteSession,estAdmin,verifierOrigine,corps,limiter,ip,renouvellement } from '../_lib/base.js';
import { exclusions,exclu,veille,quotidien } from '../_lib/prospects.js';
import { SCHEMA_VEILLE } from '../_lib/prospects-schema.js';
export async function schema(env){const b=await db(env);await b.batch(SCHEMA_VEILLE.split(';').map(x=>x.trim()).filter(Boolean).map(x=>b.prepare(x)));return b;}
export async function onRequest(ctx){const {request,env}=ctx;try{
 const url=new URL(request.url);
 if(request.method==='GET'&&url.searchParams.get('job')==='1'){await limiter(env,'veille-job:'+ip(request),6,3600);await schema(env);return json(200,await quotidien(ctx));}
 const c=await compteSession(request,env);if(!c)return json(401,{error:'connexion'});if(!estAdmin(c,env))return json(403,{error:'interdit'});
 verifierOrigine(request);const regle=exclusions(env),b=await schema(env);
 if(request.method==='POST'){
  const d=await corps(request,4000);
  if(d.action==='actualiser')return json(200,await quotidien(ctx,true));
  if(d.action==='traiter'){
   const v=await veille(ctx);if(!v.actions.some(a=>a.cle===d.cle))return json(404,{error:'action_absente'});
   await b.prepare('INSERT OR IGNORE INTO veille_actions VALUES(?,?)').bind(d.cle,new Date().toISOString()).run();return json(200,{ok:true});
  }
  if(d.action==='courrier_envoye'){
   // Uniquement une référence vers un dossier que nous possédons déjà. Aucun champ d'annonce accepté.
   if(d.url_annonce||d.telephone||d.adresse||d.nom||d.email||d.annonces)return json(400,{error:'coordonnees_externes_interdites'});
   const ref=String(d.demande_reference||'');const dem=await b.prepare('SELECT * FROM demandes WHERE reference=?').bind(ref).first();
   if(!dem||dem.suspect||exclu([dem.contact,dem.adresse,dem.reponses],regle))return json(404,{error:'dossier_absent_ou_exclu'});
   if(await b.prepare("SELECT id FROM veille_postal WHERE demande_reference=? AND retour='opposition' LIMIT 1").bind(ref).first())return json(409,{error:'opposition_postale'});
   if(!/^[\w :./-]{1,200}$/.test(d.source_reference||'')||!/^\d{4}-\d{2}-\d{2}$/.test(d.envoye_le||''))return json(400,{error:'source_et_date_requises'});
   const date=new Date(d.envoye_le+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.envoye_le||date>Date.now())return json(400,{error:'date'});
   let avisId=null;if(d.avis_id){const existe=await b.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='avis_prospects'").first();if(!existe)return json(409,{error:'parcours_postal_non_raccorde'});const avis=await b.prepare('SELECT id FROM avis_prospects WHERE id=? AND revoque=0').bind(String(d.avis_id)).first();if(!avis)return json(404,{error:'page_personnelle_absente'});avisId=avis.id;}
   await b.prepare('INSERT OR IGNORE INTO veille_postal(id,source_reference,demande_reference,avis_id,envoye_le,cree_le) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),d.source_reference,ref,avisId,date.toISOString(),new Date().toISOString()).run();return json(200,{ok:true});
  }
  if(d.action==='retour_postal'){
   if(!['demande','npai','opposition','reponse_sans_demande'].includes(d.retour))return json(400,{error:'retour'});
   const p=await b.prepare('SELECT * FROM veille_postal WHERE id=?').bind(String(d.id||'')).first();if(!p)return json(404,{error:'courrier_absent'});
   const dem=await b.prepare('SELECT * FROM demandes WHERE reference=?').bind(p.demande_reference||'').first();if(!dem||exclu([dem.contact,dem.adresse],regle))return json(404,{error:'dossier_absent_ou_exclu'});
   await b.prepare('UPDATE veille_postal SET retour=?,retour_le=? WHERE id=?').bind(d.retour,new Date().toISOString(),p.id).run();return json(200,{ok:true});
  }
  return json(400,{error:'action_interdite'});
 }
 if(request.method!=='GET')return json(405,{error:'methode'});
 const v=await veille(ctx);const runs=(await b.prepare('SELECT jour,debut,fin,etat FROM veille_executions ORDER BY jour DESC LIMIT 7').all()).results;
 const resp=json(200,{...v,executions:runs,heure:'08:07',fuseau:env.PROSPECTS_TIMEZONE||'Asia/Karachi'});const cs=renouvellement(request);for(const x of cs||[])resp.headers.append('Set-Cookie',x);return resp;
}catch(e){return e instanceof Erreur?json(e.status,{error:e.code}):json(503,{error:'veille_bloquee',message:'Vérifier les exclusions privées, la base et les schémas des sources internes.'});}}
