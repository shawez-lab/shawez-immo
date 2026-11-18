import { db,jeton,sha256 } from './base.js';
import { envoyer,peutEcrire,esc } from './mail.js';
import { exclusions,exclu } from './prospects.js';
import { controlesDrive } from './controles-drive.js';
import { paris,deParis } from './suivi.js';
export const LIEN_AVIS='https://g.page/r/CYPwi7YaBmj_EBM/review';
export const SCHEMA_AVIS=`CREATE TABLE IF NOT EXISTS google_avis(id TEXT PRIMARY KEY,evenement_id INTEGER UNIQUE,demande_id INTEGER NOT NULL,email TEXT NOT NULL,email_hash TEXT NOT NULL,prenom TEXT NOT NULL,type TEXT NOT NULL,token TEXT NOT NULL UNIQUE,etat TEXT NOT NULL DEFAULT 'attente',cree_le TEXT NOT NULL,envoye_le TEXT,relance_prevue TEXT,relance_le TEXT,verrou_le TEXT,raison TEXT);
CREATE TABLE IF NOT EXISTS google_oppositions(email_hash TEXT PRIMARY KEY,cree_le TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS google_suivi(cle TEXT PRIMARY KEY,valeur TEXT NOT NULL);`;
export async function baseAvis(env){const b=await db(env);await b.batch(SCHEMA_AVIS.split(';').filter(s=>s.trim()).map(s=>b.prepare(s)));return b;}
const objet=s=>{try{return JSON.parse(s||'{}')}catch{return {}}};
export function jPlus3(now){const p=paris(now);return deParis(p.a,p.m,p.j+3,p.h,p.min).toISOString();}
export function messageAvis(prenom,relance,token){const stop='https://shawez-immo.com/avis-google/opposition/?token='+encodeURIComponent(token);const salut=prenom?'Bonjour '+prenom+',':'Bonjour,';const text=salut+'\n'+(relance?'Un dernier message pour vous proposer de partager votre expérience avec moi.':'Merci pour votre confiance. Vous souhaitez partager votre expérience avec moi ?')+'\nVoici le lien pour laisser votre avis, positif ou critique :\n'+LIEN_AVIS+'\nMerci pour votre retour.\nShawez\n\nNe plus recevoir ces demandes : '+stop;return {subject:relance?'Votre retour sur mon accompagnement':'Votre expérience avec Shawez',text,html:'<p>'+esc(text).replace(/\n/g,'<br>')+'</p>'};}
export async function synchroniserAvis(env,now=new Date()){
 const b=await baseAvis(env);const initial=await b.prepare("SELECT valeur FROM google_suivi WHERE cle='dernier_evenement'").first();
 if(!initial){const m=await b.prepare('SELECT COALESCE(MAX(id),0) n FROM evenements').first();await b.prepare("INSERT OR IGNORE INTO google_suivi VALUES('dernier_evenement',?)").bind(String(m.n)).run();return {initialise:true,ajoutes:0};}
 const ev=(await b.prepare('SELECT * FROM evenements WHERE id>? ORDER BY id LIMIT 200').bind(+initial.valeur).all()).results;const regle=exclusions(env);const dr=await controlesDrive(b,now);let ajoutes=0;
 for(const e of ev){const type=e.type==='visite_realisee'?'visite':e.type==='statut'&&['mandat','compromis','acte'].includes(e.vers)?'signature':null;if(!type)continue;
  // Un compte rendu de visite remis au vendeur ne désigne pas l'acquéreur visiteur.
  const detail=objet(e.detail);const participant=type==='visite'?Number(detail.participant_demande_id||e.demande_id):e.demande_id;
  const d=await b.prepare('SELECT * FROM demandes WHERE id=?').bind(participant).first();if(!d||d.suspect)continue;const c=objet(d.contact),email=String(c.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||exclu([d.contact,d.adresse],regle)||(await dr.verifier(c,d.adresse,d.commune)).etat==='opposition')continue;
  const h=await sha256(email);if(await b.prepare('SELECT email_hash FROM google_oppositions WHERE email_hash=?').bind(h).first())continue;
  if(await b.prepare("SELECT id FROM google_avis WHERE email_hash=? AND (etat='avis_recu' OR cree_le>?) LIMIT 1").bind(h,new Date(+now-30*86400000).toISOString()).first())continue;
  const r=await b.prepare('INSERT OR IGNORE INTO google_avis(id,evenement_id,demande_id,email,email_hash,prenom,type,token,cree_le) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),e.id,d.id,email,h,c.prenom||'',type,jeton(),now.toISOString()).run();ajoutes+=r.meta?.changes?1:0;
 }
 if(ev.length)await b.prepare("UPDATE google_suivi SET valeur=? WHERE cle='dernier_evenement' AND CAST(valeur AS INTEGER)<?").bind(String(ev.at(-1).id),ev.at(-1).id).run();return {ajoutes};
}
function reportAvis(now){const p=paris(now);return p.jour===0?'dimanche':p.h<8||p.h>=20?'heures_calmes':null;}
export async function traiterAvis(env,{now,transport=envoyer,origine='https://shawez-immo.com',horloge}={}){
 // En production, relire l'heure avant chaque transport : un lot peut franchir 20 h.
 const instant=horloge||(now?()=>now:()=>new Date());now=now||instant();
 const b=await baseAvis(env);const sync=await synchroniserAvis(env,now);
 if(env.AVIS_GOOGLE_ACTIF!=='1'||origine!=='https://shawez-immo.com')return {...sync,actif:false};
 const report=reportAvis(now);if(report)return {...sync,actif:true,envoyes:0,raison:report};
 await b.prepare("UPDATE google_avis SET etat='a_verifier',raison='envoi_interrompu' WHERE etat='en_cours' AND verrou_le<?").bind(new Date(+now-600000).toISOString()).run();
 const dr=await controlesDrive(b,now),regle=exclusions(env);if(dr.public.etat!=='raccorde')return {...sync,actif:true,envoyes:0,bloques:0,raison:'controles_drive_incomplets'};let envoyes=0,bloques=0;
 const rows=(await b.prepare("SELECT * FROM google_avis WHERE etat='attente' OR (etat='envoye' AND relance_le IS NULL AND relance_prevue<=?) ORDER BY cree_le LIMIT 20").bind(now.toISOString()).all()).results;
 for(const q of rows){const d=await b.prepare('SELECT * FROM demandes WHERE id=?').bind(q.demande_id).first();const c=objet(d?.contact);
  if(!d||d.suspect||exclu([d.contact,d.adresse],regle)||(await dr.verifier({...c,email:q.email},d.adresse,d.commune)).etat==='opposition'||await b.prepare('SELECT email_hash FROM google_oppositions WHERE email_hash=?').bind(q.email_hash).first()){await b.prepare("UPDATE google_avis SET etat='stop',raison='opposition_ou_exclusion' WHERE id=?").bind(q.id).run();continue;}
  if(!peutEcrire(env,q.email)){bloques++;await b.prepare("UPDATE google_avis SET raison='transport_client_indisponible' WHERE id=?").bind(q.id).run();continue;}
  const lock=await b.prepare("UPDATE google_avis SET etat='en_cours',verrou_le=? WHERE id=? AND etat=? RETURNING id").bind(now.toISOString(),q.id,q.etat).first();if(!lock)continue;
  if(await b.prepare('SELECT email_hash FROM google_oppositions WHERE email_hash=?').bind(q.email_hash).first()){await b.prepare("UPDATE google_avis SET etat='stop' WHERE id=?").bind(q.id).run();continue;}
  const reportEnvoi=reportAvis(instant());
  if(reportEnvoi){await b.prepare("UPDATE google_avis SET etat=?,verrou_le=NULL,raison=? WHERE id=? AND etat='en_cours'").bind(q.etat,reportEnvoi,q.id).run();return {...sync,actif:true,envoyes,bloques,raison:reportEnvoi};}
  let ok=false;try{ok=await transport(env,{to:q.email,...messageAvis(q.prenom,q.etat==='envoye',q.token)});}catch{}
  if(!ok){await b.prepare("UPDATE google_avis SET etat='a_verifier',raison='transport_non_confirme' WHERE id=?").bind(q.id).run();continue;}
  if(q.etat==='envoye')await b.prepare("UPDATE google_avis SET etat='relance',relance_le=?,raison=NULL WHERE id=?").bind(now.toISOString(),q.id).run();else await b.prepare("UPDATE google_avis SET etat='envoye',envoye_le=?,relance_prevue=?,raison=NULL WHERE id=?").bind(now.toISOString(),jPlus3(now),q.id).run();envoyes++;
 }
 return {...sync,actif:true,envoyes,bloques};
}
export async function oppositionAvis(env,token){const b=await baseAvis(env);const q=await b.prepare('SELECT email_hash FROM google_avis WHERE token=?').bind(token).first();if(!q)return false;await b.batch([b.prepare('INSERT OR IGNORE INTO google_oppositions VALUES(?,?)').bind(q.email_hash,new Date().toISOString()),b.prepare("UPDATE google_avis SET etat='stop' WHERE email_hash=?").bind(q.email_hash)]);return true;}
