import { sha256 } from './base.js';
export const SOURCES_DRIVE = ['repertoire','relances','acquereurs'];
export const canon=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9@]+/g,' ').trim().replace(/\s+/g,' ');
export async function clesControle(c={},adresse='',commune='') {
 const keys=[];const add=async(t,v)=>{if(v)keys.push(await sha256(t+':'+v))};
 const email=String(c.email||'').trim().toLowerCase();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))await add('email',email);
 let tel=String(c.telephone||'').replace(/\D/g,'').replace(/^00/,'');if(/^0[1-9]\d{8}$/.test(tel))tel='33'+tel.slice(1);if(/^\d{9,15}$/.test(tel))await add('telephone',tel);
 const nom=canon(c.nom_complet||[c.prenom,c.nom].filter(Boolean).join(' '));if(nom.split(' ').length>=2&&nom.length>=5)await add('nom',nom);
 const a=canon(adresse);if(/\d/.test(a)&&a.length>=8){await add('adresse',a);if(commune)await add('adresse',canon(adresse+' '+commune));}
 return [...new Set(keys)];
}
export async function controlesDrive(b,now=new Date()) {
 const rows=(await b.prepare('SELECT * FROM veille_drive_controles').all()).results;
 const sources=SOURCES_DRIVE.map(id=>{const r=rows.find(x=>x.source_id===id);return {source_id:id,lien:r?.lien||null,controle_le:r?.controle_le||null,lignes:r?.lignes??null,indexees:r?JSON.parse(r.index_json).length:null,onglets:r?JSON.parse(r.onglets):[],etat:!r?'non_raccorde':(!Number.isFinite(Date.parse(r.controle_le))||Date.parse(r.controle_le)>+now+300000||now-Date.parse(r.controle_le)>48*3600000)?'perime':'raccorde'};});
 const lots=new Set(rows.filter(x=>SOURCES_DRIVE.includes(x.source_id)).map(x=>x.controle_le));
 const complet=sources.every(x=>x.etat==='raccorde')&&lots.size===1;
 const index=new Map();let oppositions=0;
 for(const r of rows.filter(x=>SOURCES_DRIVE.includes(x.source_id))){for(const line of JSON.parse(r.index_json)){if(line.opposition)oppositions++;for(const k of line.cles){if(!/^[a-f0-9]{64}$/.test(k))throw Error('index_drive_invalide');const a=index.get(k)||[];a.push({source_id:r.source_id,lien:r.lien,onglet:line.onglet,ligne:line.ligne,opposition:!!line.opposition});index.set(k,a);}}}
 return {public:{etat:complet?'raccorde':'controle_incomplet',sources,oppositions,index_de_rapprochement:true,actualisation:'Lecture datée des feuilles privées. Aucune modification du Drive.'},async verifier(c,adresse,commune){const keys=await clesControle(c,adresse,commune);const found=new Map();for(const k of keys)for(const x of index.get(k)||[])found.set(x.source_id+':'+x.onglet+':'+x.ligne,x);const correspondances=[...found.values()];return {etat:correspondances.some(x=>x.opposition)?'opposition':!complet?'controle_incomplet':!keys.length?'identite_insuffisante':correspondances.length?'deja_suivi':'aucune_correspondance_exacte',correspondances,autorisation_prospection:false};}};
}
