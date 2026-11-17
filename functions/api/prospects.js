import { synchroniserDrive } from '../_lib/drive-cloudflare.js';
import { controlesDrive } from '../_lib/controles-drive.js';
import { db,json,Erreur,compteSession,estAdmin,verifierOrigine,corps,limiter,ip,renouvellement } from '../_lib/base.js';
import { exclusions,exclu,veille,quotidien } from '../_lib/prospects.js';
import { SCHEMA_VEILLE } from '../_lib/prospects-schema.js';
export async function schema(env){const b=await db(env);await b.batch(SCHEMA_VEILLE.split(';').map(x=>x.trim()).filter(Boolean).map(x=>b.prepare(x)));return b;}
export async function onRequest(ctx){const {request,env}=ctx;try{
 const url=new URL(request.url);
 if(request.method==='GET'&&url.searchParams.get('job')==='1'){await limiter(env,'veille-job:'+ip(request),6,3600);await schema(env);const controle_drive=await synchroniserDrive(env);const v=await quotidien(ctx);return json(200,{...v,controle_drive,complet:controle_drive.etat!=='erreur'&&['ok','deja_execute'].includes(v.etat)});}
 const c=await compteSession(request,env);if(!c)return json(401,{error:'connexion'});if(!estAdmin(c,env))return json(403,{error:'interdit'});
 verifierOrigine(request);const regle=exclusions(env),b=await schema(env);
 if(request.method==='POST'){
  const d=await corps(request,4000);
  if(d.action==='actualiser'){const controle_drive=await synchroniserDrive(env,{force:true});return json(200,{...await quotidien(ctx,true),controle_drive,complet:controle_drive.etat==='ok'});}
  if(d.action==='traiter'){
   const v=await veille(ctx);if(!v.actions.some(a=>a.cle===d.cle))return json(404,{error:'action_absente'});
   await b.prepare('INSERT OR IGNORE INTO veille_actions VALUES(?,?)').bind(d.cle,new Date().toISOString()).run();return json(200,{ok:true});
  }
  if(d.action==='controle_postal'){
   const dem=await b.prepare('SELECT * FROM demandes WHERE reference=?').bind(String(d.demande_reference||'')).first();
   if(!dem||dem.suspect||exclu([dem.contact,dem.adresse,dem.reponses],regle))return json(404,{error:'dossier_absent_ou_exclu'});
   const dr=await controlesDrive(b);let c={};try{c=JSON.parse(dem.contact)}catch{}
   const control=await dr.verifier(c,dem.adresse,dem.commune);
   const precedent=await b.prepare("SELECT id FROM courriers WHERE canal='postal' AND demande_id=? LIMIT 1").bind(dem.id).first();
   return json(200,{...control,deja_ecrit:!!precedent,preparation_bloquee:!!precedent||control.etat!=='aucune_correspondance_exacte',sources:dr.public.sources});
  }
  if(d.action==='courrier_envoye'){
   // Uniquement une référence vers un dossier que nous possédons déjà. Aucun champ d'annonce accepté.
   if(d.url_annonce||d.telephone||d.adresse||d.nom||d.email||d.annonces)return json(400,{error:'coordonnees_externes_interdites'});
   const ref=String(d.demande_reference||'');const dem=await b.prepare('SELECT * FROM demandes WHERE reference=?').bind(ref).first();
   if(!dem||dem.suspect||exclu([dem.contact,dem.adresse,dem.reponses],regle))return json(404,{error:'dossier_absent_ou_exclu'});
   const dr=await controlesDrive(b);let contact={};try{contact=JSON.parse(dem.contact)}catch{}
   if((await dr.verifier(contact,dem.adresse,dem.commune)).etat==='opposition')return json(409,{error:'opposition_drive'});
   if(await b.prepare("SELECT id FROM courriers WHERE canal='postal' AND demande_id=? AND retour='opposition' LIMIT 1").bind(dem.id).first())return json(409,{error:'opposition_postale'});
   if(!/^[\w :./-]{1,200}$/.test(d.source_reference||'')||!/^\d{4}-\d{2}-\d{2}$/.test(d.envoye_le||''))return json(400,{error:'source_et_date_requises'});
   const date=new Date(d.envoye_le+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.envoye_le||date>Date.now())return json(400,{error:'date'});
   let avisId=null;if(d.avis_id){const existe=await b.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='avis_prospects'").first();if(!existe)return json(409,{error:'parcours_postal_non_raccorde'});const avis=await b.prepare('SELECT id FROM avis_prospects WHERE id=? AND revoque=0').bind(String(d.avis_id)).first();if(!avis)return json(404,{error:'page_personnelle_absente'});avisId=avis.id;}
   await b.prepare("INSERT OR IGNORE INTO courriers(demande_id,motif,contenu,origine,canal,source_reference,avis_id,envoye_le,cree_le) VALUES(?,'postal','{}','registre-postal','postal',?,?,?,?)").bind(dem.id,d.source_reference,avisId,date.toISOString(),new Date().toISOString()).run();return json(200,{ok:true});
  }
  if(d.action==='retour_postal'){
   if(!['demande','npai','opposition','reponse_sans_demande'].includes(d.retour))return json(400,{error:'retour'});
   const p=await b.prepare("SELECT * FROM courriers WHERE canal='postal' AND id=?").bind(String(d.id||'')).first();if(!p)return json(404,{error:'courrier_absent'});
   const dem=await b.prepare('SELECT * FROM demandes WHERE id=?').bind(p.demande_id).first();if(!dem||exclu([dem.contact,dem.adresse],regle))return json(404,{error:'dossier_absent_ou_exclu'});
   await b.prepare("UPDATE courriers SET retour=?,retour_le=? WHERE canal='postal' AND id=?").bind(d.retour,new Date().toISOString(),p.id).run();return json(200,{ok:true});
  }
  return json(400,{error:'action_interdite'});
 }
 if(request.method!=='GET')return json(405,{error:'methode'});
 const v=await veille(ctx);const runs=(await b.prepare('SELECT jour,debut,fin,etat FROM veille_executions ORDER BY jour DESC LIMIT 7').all()).results;
 const resp=json(200,{...v,passage_drive:await b.prepare('SELECT debut,fin,etat,raison FROM veille_drive_passages ORDER BY debut DESC LIMIT 1').first(),executions:runs,heure:'08:07',fuseau:'Europe/Paris'});const cs=renouvellement(request);for(const x of cs||[])resp.headers.append('Set-Cookie',x);return resp;
}catch(e){return e instanceof Erreur?json(e.status,{error:e.code}):json(503,{error:'veille_bloquee',message:'Vérifier les exclusions privées, la base et les schémas des sources internes.'});}}

