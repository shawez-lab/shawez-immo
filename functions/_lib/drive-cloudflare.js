import { clesControle, canon, SOURCES_DRIVE,controlesDrive } from './controles-drive.js';
export const PARIS='Europe/Paris';
export const jourParis=now=>new Intl.DateTimeFormat('en-CA',{timeZone:PARIS,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const minuteParis=now=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:PARIS,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));return +p.hour*60+(+p.minute);};
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
export async function synchroniserDrive(env,{now=new Date()}={}){
 const b=env.DB,jour=jourParis(now);const controle=await controlesDrive(b,now);const last=await b.prepare('SELECT controle_le FROM veille_drive_receptions ORDER BY controle_le DESC LIMIT 1').first();
 if(last&&jourParis(new Date(last.controle_le))===jour&&controle.public.etat==='raccorde'&&controle.public.sources.every(s=>s.controle_le===last.controle_le))return {etat:'ok',mode:'apps_script',controle_le:last.controle_le,sources:3};
 await b.prepare("INSERT INTO veille_drive_passages(jour,debut,etat,raison) VALUES(?,?,'attente_relais','relais_apps_script_non_recu') ON CONFLICT(jour) DO UPDATE SET etat='attente_relais',raison='relais_apps_script_non_recu' WHERE veille_drive_passages.etat<>'ok'").bind(jour,now.toISOString()).run();
 return {etat:'attente_relais',mode:'apps_script',raison:'relais_apps_script_non_recu'};
}
