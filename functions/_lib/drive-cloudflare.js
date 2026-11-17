import { clesControle, canon, SOURCES_DRIVE } from './controles-drive.js';
export const PARIS='Europe/Paris';
export const jourParis=now=>new Intl.DateTimeFormat('en-CA',{timeZone:PARIS,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const minuteParis=now=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:PARIS,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));return +p.hour*60+(+p.minute);};
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const enc=s=>b64(new TextEncoder().encode(s));
let cached;
async function jetonGoogle(env,fetcher,now){
 const ident=env.GOOGLE_SHEETS_SERVICE_ACCOUNT||[env.GOOGLE_SHEETS_CLIENT_ID,env.GOOGLE_SHEETS_REFRESH_TOKEN,env.GOOGLE_SHEETS_CLIENT_SECRET].filter(Boolean).join('|');
 if(!ident)throw Error('acces_google_serveur_absent');
 if(cached?.key===ident&&cached.until>+now+60000)return cached.token;
 let body;
 if(env.GOOGLE_SHEETS_SERVICE_ACCOUNT){
  const c=JSON.parse(env.GOOGLE_SHEETS_SERVICE_ACCOUNT);if(!c.client_email||!c.private_key)throw Error('identifiants_google_invalides');
  const t=Math.floor(+now/1000),head=enc(JSON.stringify({alg:'RS256',typ:'JWT'})),data=enc(JSON.stringify({iss:c.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:t,exp:t+3600}));
  const pem=c.private_key.replace(/-----[^-]+-----|\s/g,'');const raw=Uint8Array.from(atob(pem),x=>x.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',raw,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(head+'.'+data));
  body=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+data+'.'+b64(sig)});
 }else if(env.GOOGLE_SHEETS_REFRESH_TOKEN&&env.GOOGLE_SHEETS_CLIENT_ID&&env.GOOGLE_SHEETS_CLIENT_SECRET){
  body=new URLSearchParams({grant_type:'refresh_token',refresh_token:env.GOOGLE_SHEETS_REFRESH_TOKEN,client_id:env.GOOGLE_SHEETS_CLIENT_ID,client_secret:env.GOOGLE_SHEETS_CLIENT_SECRET});
 }else throw Error('acces_google_serveur_absent');
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',body,signal:AbortSignal.timeout(20000),redirect:'error'});if(!r.ok)throw Error('autorisation_google_refusee');
 const d=await r.json();if(typeof d.access_token!=='string')throw Error('autorisation_google_refusee');cached={key:ident,token:d.access_token,until:+now+Math.min(Number(d.expires_in)||300,3600)*1000};return d.access_token;
}
export async function indexerOnglets(tabs){
 let lignes=0;const index=[];
 if(!tabs.length)throw Error('onglets_absents');
 for(const {nom,rows} of tabs){const h=(rows[0]||[]).map(canon);if(!h.includes('nom')&&!h.includes('nom affiche')&&!h.includes('pseudo'))throw Error('entete_inconnue');
  const col=(r,...names)=>{for(const n of names){const i=h.indexOf(canon(n));if(i>=0&&r[i])return String(r[i])}return ''};
  for(let i=1;i<rows.length;i++){const row=rows[i];if(!row.some(v=>String(v).trim()))continue;lignes++;
   const c={prenom:col(row,'Prénom'),nom:col(row,'Nom'),email:col(row,'E-mail'),telephone:col(row,'Téléphone')};if(!c.nom&&!c.prenom)c.nom_complet=col(row,'Nom affiché');
   const cles=await clesControle(c,col(row,'Adresse du bien','Adresse'),col(row,'Ville'));
   const text=canon(row.filter((_,j)=>/statut|classe|raison|stop|remarques|prochaine action|reponse/.test(h[j]||'')).join(' ')).replace(/\b(?:pas un stop|pas de stop|sans stop)\b/g,'');
   const opposition=/\b(?:ne pas contacter|ne plus contacter|stop|opposition|ne jamais contacter)\b/.test(text)||/^(oui|true|1|x)$/i.test(col(row,'stop').trim());
   if(cles.length)index.push({onglet:nom,ligne:i+1,cles,opposition});
  }
 }
 return {lignes,index,onglets:tabs.map(x=>x.nom)};
}
export async function synchroniserDrive(env,{now=new Date(),force=false,fetcher=fetch}={}){
 const b=env.DB,jour=jourParis(now);
 await b.prepare('CREATE TABLE IF NOT EXISTS veille_drive_passages(jour TEXT PRIMARY KEY,debut TEXT NOT NULL,fin TEXT,etat TEXT NOT NULL,raison TEXT)').run();
 if(!force&&minuteParis(now)<460)return {etat:'avant_7h40'};
 const lock=await b.prepare("INSERT INTO veille_drive_passages(jour,debut,etat) VALUES(?,?,'en_cours') ON CONFLICT(jour) DO UPDATE SET debut=excluded.debut,etat='en_cours',raison=NULL WHERE (veille_drive_passages.etat<>'ok' AND veille_drive_passages.debut<?) OR (?=1 AND veille_drive_passages.etat<>'en_cours') RETURNING jour").bind(jour,now.toISOString(),new Date(+now-15*60000).toISOString(),force?1:0).first();
 if(!lock){const precedent=await b.prepare('SELECT etat,raison FROM veille_drive_passages WHERE jour=?').bind(jour).first();return precedent?.etat==='ok'?{etat:'deja_execute'}:{etat:precedent?.etat||'en_cours',...(precedent?.raison?{raison:precedent.raison}:{})};}
 try{
  const sources=(await b.prepare('SELECT source_id,lien FROM veille_drive_controles').all()).results;
  if(SOURCES_DRIVE.some(id=>!sources.some(x=>x.source_id===id)))throw Error('sources_google_incompletes');
  const token=await jetonGoogle(env,fetcher,now),snapshots=[];
  const get=async u=>{const r=await fetcher(u,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error('lecture_google_refusee');return r.json();};
  for(const source_id of SOURCES_DRIVE){const s=sources.find(x=>x.source_id===source_id),m=/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)\/edit$/.exec(s.lien||'');if(!m)throw Error('source_google_invalide');
   const root='https://sheets.googleapis.com/v4/spreadsheets/'+m[1];const meta=await get(root+'?fields=sheets(properties(sheetId,title,gridProperties))');
   const sheets=(meta.sheets||[]).map(x=>x.properties);if(!sheets.length||sheets.length>20)throw Error('couverture_google_invalide');
   const q=new URLSearchParams({valueRenderOption:'FORMATTED_VALUE'});for(const s of sheets){if(!s.gridProperties||s.gridProperties.rowCount>5000||s.gridProperties.columnCount>100)throw Error('couverture_google_trop_grande');let n=s.gridProperties.columnCount,col='';while(n){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26)}q.append('ranges',"'"+s.title.replaceAll("'","''")+"'!A1:"+col+s.gridProperties.rowCount);}
   const data=await get(root+'/values:batchGet?'+q);if(data.valueRanges?.length!==sheets.length)throw Error('couverture_google_incomplete');
   const idx=await indexerOnglets(sheets.map((s,i)=>({nom:s.title,rows:data.valueRanges[i].values||[]})));if(!idx.lignes)throw Error('source_google_vide');snapshots.push({source_id,...idx});
  }
  // Remplacement atomique des trois index seulement après toutes les lectures réussies.
  await b.batch([...snapshots.map(s=>b.prepare('UPDATE veille_drive_controles SET controle_le=?,lignes=?,onglets=?,index_json=? WHERE source_id=?').bind(now.toISOString(),s.lignes,JSON.stringify(s.onglets),JSON.stringify(s.index),s.source_id)),b.prepare("UPDATE veille_drive_passages SET fin=?,etat='ok',raison=NULL WHERE jour=?").bind(now.toISOString(),jour)]);
  return {etat:'ok',sources:3,lignes:snapshots.reduce((n,s)=>n+s.lignes,0)};
 }catch(e){const raison=['acces_google_serveur_absent','autorisation_google_refusee','lecture_google_refusee','sources_google_incompletes','source_google_vide','entete_inconnue','couverture_google_trop_grande','couverture_google_incomplete'].includes(e.message)?e.message:'synchronisation_google_impossible';await b.prepare("UPDATE veille_drive_passages SET fin=?,etat='erreur',raison=? WHERE jour=?").bind(now.toISOString(),raison,jour).run();return {etat:'erreur',raison};}
}
