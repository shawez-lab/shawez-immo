import { Erreur,sha256 } from './base.js';
import { SOURCES_DRIVE,controlesDrive } from './controles-drive.js';
export const SCHEMA_RELAIS=`CREATE TABLE IF NOT EXISTS veille_drive_relais(id INTEGER PRIMARY KEY CHECK(id=1),email TEXT NOT NULL,audience TEXT,script_id TEXT,maj_le TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS veille_drive_receptions(id TEXT PRIMARY KEY,digest TEXT NOT NULL,controle_le TEXT NOT NULL,cree_le TEXT NOT NULL);`;
let jwksCache;
const decoder=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=')),c=>c.charCodeAt(0));
const objet=s=>JSON.parse(new TextDecoder().decode(decoder(s)));
export async function identiteGoogle(token,{now=new Date(),fetcher=fetch}={}){
 try{
  if(typeof token!=='string'||token.length>15000)throw Error();const parts=token.split('.');if(parts.length!==3)throw Error();const h=objet(parts[0]);if(h.alg!=='RS256'||typeof h.kid!=='string')throw Error();
  if(!jwksCache||jwksCache.until<+now||!jwksCache.keys.some(k=>k.kid===h.kid)){const r=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const j=await r.json();if(!Array.isArray(j.keys))throw Error();jwksCache={keys:j.keys,until:+now+3600000};}
  const jwk=jwksCache.keys.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk)throw Error();const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decoder(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error();
  const c=objet(parts[1]),t=+now/1000;if(!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||c.email_verified!==true||typeof c.email!=='string'||typeof c.aud!=='string'||!Number.isFinite(c.exp)||c.exp<=t||!Number.isFinite(c.iat)||c.iat>t+60||c.iat<t-3700||c.exp-c.iat>3700)throw Error();return c;
 }catch{throw new Erreur(401,'identite_google_invalide');}
}
export function verifierLot(data,config,now=new Date()){
 if(!data||Object.keys(data).some(k=>!['version','execution_id','controle_le','sources'].includes(k))||data.version!==1||!/^[\w-]{16,80}$/.test(data.execution_id||''))throw new Erreur(400,'lot_invalide');
 const time=Date.parse(data.controle_le);if(!Number.isFinite(time)||time>+now+300000||time<+now-600000)throw new Erreur(400,'date_lot_invalide');
 if(!Array.isArray(data.sources)||data.sources.length!==3||new Set(data.sources.map(x=>x.source_id)).size!==3)throw new Erreur(400,'trois_sources_requises');
 for(const s of data.sources){const original=config.find(x=>x.source_id===s.source_id);if(!SOURCES_DRIVE.includes(s.source_id)||!original||s.lien!==original.lien||Object.keys(s).some(k=>!['source_id','lien','lignes','onglets','index'].includes(k)))throw new Erreur(400,'source_invalide');
  if(!Number.isInteger(s.lignes)||s.lignes<1||s.lignes>10000||!Array.isArray(s.onglets)||s.onglets.length<1||s.onglets.length>20||new Set(s.onglets).size!==s.onglets.length||s.onglets.some(t=>typeof t!=='string'||t.length>150)||!Array.isArray(s.index)||s.index.length>s.lignes)throw new Erreur(400,'couverture_invalide');
  const refs=new Set();for(const row of s.index){const ref=row.onglet+':'+row.ligne;if(refs.has(ref)||Object.keys(row).some(k=>!['onglet','ligne','cles','opposition'].includes(k))||!s.onglets.includes(row.onglet)||!Number.isInteger(row.ligne)||row.ligne<2||row.ligne>20000||typeof row.opposition!=='boolean'||!Array.isArray(row.cles)||row.cles.length<1||row.cles.length>5||row.cles.some(k=>!/^[a-f0-9]{64}$/.test(k)))throw new Erreur(400,'index_invalide');refs.add(ref);}
 }return data;
}
export async function recevoirRelais(env,token,data,{now=new Date(),fetcher=fetch}={}){
 const b=env.DB;await b.batch(SCHEMA_RELAIS.split(';').filter(s=>s.trim()).map(s=>b.prepare(s)));
 const c=await identiteGoogle(token,{now,fetcher});const relais=await b.prepare('SELECT * FROM veille_drive_relais WHERE id=1').first();if(!relais||c.email.toLowerCase()!==relais.email.toLowerCase())throw new Erreur(403,'compte_google_non_autorise');
 if(!relais.audience)throw new Erreur(409,'audience_google_a_configurer',{audience:c.aud});if(c.aud!==relais.audience)throw new Erreur(403,'projet_google_non_autorise');
 const config=(await b.prepare('SELECT source_id,lien FROM veille_drive_controles').all()).results;verifierLot(data,config,now);
 const digest=await sha256(JSON.stringify(data)),deja=await b.prepare('SELECT digest FROM veille_drive_receptions WHERE id=?').bind(data.execution_id).first();if(deja&&deja.digest!==digest)throw new Erreur(409,'lot_deja_utilise');
 const last=await b.prepare('SELECT MAX(controle_le) le FROM veille_drive_controles').first();if(!deja&&last?.le>data.controle_le)throw new Erreur(409,'lot_anterieur');
 const jour=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 if(!deja)await b.batch([...data.sources.map(s=>b.prepare('UPDATE veille_drive_controles SET controle_le=?,lignes=?,onglets=?,index_json=? WHERE source_id=?').bind(data.controle_le,s.lignes,JSON.stringify(s.onglets),JSON.stringify(s.index),s.source_id)),b.prepare('INSERT INTO veille_drive_receptions VALUES(?,?,?,?)').bind(data.execution_id,digest,data.controle_le,now.toISOString()),b.prepare("INSERT INTO veille_drive_passages(jour,debut,fin,etat,raison) VALUES(?,?,?,'ok',NULL) ON CONFLICT(jour) DO UPDATE SET debut=excluded.debut,fin=excluded.fin,etat='ok',raison=NULL").bind(jour,data.controle_le,now.toISOString())]);
 const controle=await controlesDrive(b,now);return {sources:3,lignes:data.sources.reduce((n,s)=>n+s.lignes,0),controle_le:data.controle_le,doublon:!!deja,complet:controle.public.etat==='raccorde'};
}
