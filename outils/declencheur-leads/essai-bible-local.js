const fs=require('fs'),vm=require('vm');
const rows=JSON.parse(fs.readFileSync('bible/rows.json'));
const now=new Date('2026-10-12T09:30:00+02:00'); // lundi 9 h 30 (fenêtre d'envoi)
const msgs=[
 {from:'Contact@gravelin.evaluer-mon-logement.fr',subject:"🚨 Nouveau lead d'estimation Mandat Machine — à appeler sous 5 minutes",body:"Un nouveau lead d'estimation vient d'arriver via Mandat Machine.\n\nNom : Dupont Nathalie\nTéléphone : 06 95 17 85 29\nVille : Talant\n\nAction : appelle"},
 {from:'Contact@gravelin.evaluer-mon-logement.fr',subject:"🚨 Nouveau lead d'estimation Mandat Machine — à appeler sous 5 minutes",body:"Nom : Lescalier Isabelle\nTéléphone : 06 28 27 10 60\nVille : Genlis\n"},
 {from:'contact@lead.seloger.com',subject:'Un acquéreur est intéressé par un de vos biens',body:fs.readFileSync('seloger.txt','utf8')},
 {from:'estimation@shawez-immo.com',subject:'Estimation Dijon — Mme Claire FICTIVE — 06 00 00 00 00',body:"Nouvelle estimation E-20261012-ABC123\n\nContact : Mme Claire FICTIVE\nTéléphone : 06 00 00 00 00\nE-mail : claire.fictive@example.org\nFourchette : 196 000 € – 240 000 € (40 ventes, rayon 150 m)\nType : Appartement\nAdresse : 12 Rue Chabot-Charny 21000 Dijon\nSurface : 72 m²\nPièces : 3\nDélai : Dans les 6 mois\n"},
 {from:'estimation@shawez-immo.com',subject:'Estimation Beaune — M. Paul FICTIF — 06 11 11 11 11',body:"Nouvelle estimation E-20261012-DEF456\n\nContact : M. Paul FICTIF\nTéléphone : 06 11 11 11 11\nE-mail : paul.fictif@example.org\nFourchette : Pas de fourchette automatique : rappel promis sous 24 h\nType : Maison\nAdresse : 3 Rue des Tonneliers 21200 Beaune\nSurface : 140 m²\nDélai : Dès que possible\n"},
];
const mkMsg=(m,i)=>({getFrom:()=>m.from,getSubject:()=>m.subject,getPlainBody:()=>m.body,getId:()=>'id'+i,getDate:()=>now});
const threads=msgs.map((m,i)=>({getMessages:()=>[mkMsg(m,i)],getLastMessageDate:()=>now,getId:()=>'t'+i,addLabel:()=>{}}));
const props={};
const ctx={console,Date:class extends Date{constructor(...a){a.length?super(...a):super(now)} static now(){return now.getTime()}},JSON,Math,parseInt,parseFloat,String,Object,Array,RegExp,
 Logger:{log:x=>console.log(x)},
 GmailApp:{search:(q)=>/in:sent|from:.*OR/.test(q)?[]:threads,getUserLabelByName:()=>({}),createLabel:()=>({}),sendEmail:()=>{throw 'ENVOI INTERDIT'}},
 CalendarApp:{getDefaultCalendar:()=>({getEvents:()=>[]}),GuestStatus:{NO:'NO'}},
 CacheService:{getScriptCache:()=>({get:()=>null,put:()=>{}})},
 SpreadsheetApp:{openById:()=>({getSheets:()=>[{getDataRange:()=>({getValues:()=>rows})}]})},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>props[k]=v})},
 Session:{getEffectiveUser:()=>({getEmail:()=>'shawez@gravelin-immo.com'}),getScriptTimeZone:()=>'Europe/Paris'},
 Utilities:{formatDate:(d,tz,p)=>d.toISOString(),sleep:()=>{}},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})}};
ctx.Date.prototype=Date.prototype;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('Bible.gs','utf8').replace(/if \(typeof module[^\n]*/,''),ctx);
vm.runInContext(fs.readFileSync('Code.gs','utf8'),ctx);
vm.runInContext('verifierCompte_=function(){}; essaiBible();',ctx);
console.log('\n=== essai() normal (décision + texte) ===');
vm.runInContext('chargerVus_=function(){return {}}; essai();',ctx);
