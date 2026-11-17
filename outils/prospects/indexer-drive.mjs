// Lecture locale d'exports privés. Aucune API d'écriture Google, aucun contact en sortie.
// Usage : node indexer-drive.mjs lecture-privee.json > controles.sql
import {readFileSync} from 'node:fs';
import {clesControle,SOURCES_DRIVE,canon} from '../../functions/_lib/controles-drive.js';
const input=JSON.parse(readFileSync(process.argv[2],'utf8'));const at=new Date().toISOString();
const plans=[['repertoire',SOURCES_DRIVE[0]],['relances',SOURCES_DRIVE[1]],['acquereurs',SOURCES_DRIVE[2]]];
const sql=s=>"'"+String(s).replaceAll("'","''")+"'";
console.log('CREATE TABLE IF NOT EXISTS veille_drive_controles(source_id TEXT PRIMARY KEY,lien TEXT NOT NULL,controle_le TEXT NOT NULL,lignes INTEGER NOT NULL,onglets TEXT NOT NULL,index_json TEXT NOT NULL);');
const stats=[];
for(const [name,id] of plans){const {onglets:tabs,lien}=input[name]||{};if(!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit$/.test(lien||''))throw Error('lien_invalide:'+name);if(!tabs||!Object.keys(tabs).length)throw Error('source_manquante:'+name);let lines=0;const index=[];
 for(const [tab,rows] of Object.entries(tabs)){const h=rows[0].map(canon);if(!h.includes('nom')&&!h.includes('nom affiche')&&!h.includes('pseudo'))throw Error('entete_inconnue:'+name+':'+tab);
 const col=(row,...names)=>{for(const n of names){const i=h.indexOf(canon(n));if(i>=0&&row[i])return String(row[i])}return ''};
 for(let i=1;i<rows.length;i++){const row=rows[i];if(!row.some(v=>String(v).trim()))continue;lines++;
 const c={prenom:col(row,'Prénom'),nom:col(row,'Nom'),email:col(row,'E-mail'),telephone:col(row,'Téléphone')};if(!c.nom&&!c.prenom)c.nom_complet=col(row,'Nom affiché');
 const ks=await clesControle(c,col(row,'Adresse du bien','Adresse'),col(row,'Ville'));
 // Une mention négative explicite de STOP n'est pas une opposition.
 const status=row.filter((_,j)=>/statut|classe|raison|stop|remarques|prochaine action|reponse/.test(h[j]||'')).join(' ');
 const text=canon(status).replace(/\b(?:pas un stop|pas de stop|sans stop)\b/g,'');
 const stop=col(row,'stop');const opposition=/\b(?:ne pas contacter|ne plus contacter|stop|opposition|ne jamais contacter)\b/.test(text)||/^(oui|true|1|x)$/i.test(stop.trim());
 if(ks.length)index.push({onglet:tab,ligne:i+1,cles:ks,opposition});
 }}
 console.log(`INSERT INTO veille_drive_controles VALUES(${sql(id)},${sql(lien)},${sql(at)},${lines},${sql(JSON.stringify(Object.keys(tabs)))},${sql(JSON.stringify(index))}) ON CONFLICT(source_id) DO UPDATE SET lien=excluded.lien,controle_le=excluded.controle_le,lignes=excluded.lignes,onglets=excluded.onglets,index_json=excluded.index_json;`);
 stats.push({source:name,lignes:lines,indexees:index.length,oppositions:index.filter(x=>x.opposition).length});
}
console.error(JSON.stringify({controle_le:at,sources:stats}));
