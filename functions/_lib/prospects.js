import { listePrivee } from './exclusions-privees.js';
import { sha256 } from './base.js';
export const normaliser = s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const lire=s=>{try{return JSON.parse(s||'{}')}catch{return {}}};
const clean=(s,n=1000)=>String(s||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
export function exclusions(env){return {adresses:listePrivee(env,'REGLE9_LEAD_ADRESSES').map(normaliser),noms:listePrivee(env,'REGLE9_LEAD_NOMS',{motifs:true}).map(s=>new RegExp(`\\b${normaliser(s)}\\b`))};}
export function exclu(champs,r){const s=normaliser(champs.join(' '));return r.adresses.some(x=>s.includes(x))||r.noms.some(x=>x.test(s));}
const vendeur=s=>/\b(estimation|estimer|vendre|vendons|vends|vente de mon|vente de notre|evaluation|evaluation|avis de valeur)\b/.test(normaliser(s));
export function brouillon(prenom){const p=/^[\p{L} '\u2019-]{1,40}$/u.test(prenom||'')?prenom:'';return `Bonjour${p?' '+p:''}, c’est Shawez Ali, agent immobilier à Dijon. Vous m’avez parlé de votre projet. Vous souhaitez un point offert sur votre bien et les ventes signées près de chez vous ?`;}
export function qualification({sens,texte,reponse,stop=false}){
 if(stop)return {etat:'opposition',action:false};
 if(sens==='out'||reponse)return {etat:'repondu',action:false};
 if(!vendeur(texte))return {etat:'interaction',action:false};
 return {etat:'demande_vendeur',action:true};
}
export async function veille(ctx,now=new Date()){
 const {env}=ctx,b=env.DB,r=exclusions(env),since=new Date(now-90*86400000).toISOString();
 const tables=new Set((await b.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).results.map(x=>x.name));
 const etats={},actions=[],compteurs={},cache=new Map();
 async function rows(n,sql,args=[]){if(!tables.has(n)){etats[n]={etat:'non_raccorde',nombre:null};return null;}try{const d=(await b.prepare(sql).bind(...args).all()).results;etats[n]={etat:'raccorde',nombre:d.length,limite:/LIMIT\s+1500/i.test(sql)&&d.length>=1500};return d;}catch{etats[n]={etat:'erreur_schema',nombre:null};return null;}}
 const demandes=await rows('demandes',"SELECT * FROM demandes WHERE datetime(cree_le)>=datetime(?) AND suspect=0 AND contact NOT LIKE '%test.invalid%' ORDER BY datetime(cree_le) DESC LIMIT 1500",[since]);
 const valides=[];
 for(const d of demandes||[]){const c=lire(d.contact),q=lire(d.reponses);if(exclu([c.prenom,c.nom,c.email,c.telephone,d.adresse,JSON.stringify(q)],r))continue;valides.push(d);cache.set(d.reference,d);if(d.statut==='recue')actions.push({cle:'demande:'+d.reference,source:'leads',reference:d.reference,titre:clean([c.prenom,d.commune].filter(Boolean).join(' · '),140)||'Demande reçue',date:d.cree_le,etat:'demande_vendeur',priorite:0,lien:'/admin/?q='+encodeURIComponent(d.reference),message:brouillon(c.prenom),action:'Répondre à la demande reçue dans son dossier. Aucun appel commercial déclenché.'});}
 compteurs.leads={recus:valides.length,a_traiter:valides.filter(d=>d.statut==='recue').length,mandats:valides.filter(d=>['mandat','annonce','visites','offre','compromis','acte'].includes(d.statut)).length};
 const mails=await rows('leads_tri',tables.has('leads_reponses')?"SELECT t.id,t.recu,t.de,t.categorie,t.decision,t.raison,r.resultat AS controle FROM leads_tri t LEFT JOIN leads_reponses r ON r.id=t.id WHERE t.categorie='vendeur' AND datetime(t.recu)>=datetime(?) ORDER BY datetime(t.recu) DESC LIMIT 1500":"SELECT id,recu,de,categorie,decision,raison FROM leads_tri WHERE categorie='vendeur' AND datetime(recu)>=datetime(?) ORDER BY datetime(recu) DESC LIMIT 1500",[since]);
 let mailsVisibles=0,mailsAttente=0;for(const m of mails||[]){if(exclu([m.de,m.controle],r)||/test\.invalid/i.test(m.de||''))continue;mailsVisibles++;if(m.decision==='rien'||/^applique:(envoye|rien)/.test(m.raison||''))continue;mailsAttente++;actions.push({cle:'mail:'+m.id,source:'mails',reference:m.id,titre:'Demande vendeur reçue par e-mail',date:m.recu,etat:'demande_vendeur',priorite:1,lien:'https://mail.google.com/mail/u/0/#search/'+encodeURIComponent('from:'+m.de+' newer_than:90d'),action:'Vérifier la réponse au mail reçu. Le statut du tri ne prouve pas une prise en charge humaine.'});}
 compteurs.mails={recus:mails?mailsVisibles:null,a_verifier:mails?mailsAttente:null};
 const stops=tables.has('dm_stop')?await rows('dm_stop','SELECT cle FROM dm_stop'):null;
 const stopSet=new Set((stops||[]).map(x=>x.cle));
 const dm=await rows('dm_fil',`SELECT f.* FROM dm_fil f JOIN (SELECT contact,MAX(id) id FROM dm_fil GROUP BY contact) x ON x.id=f.id WHERE datetime(f.cree)>=datetime(?) ORDER BY f.id DESC LIMIT 1500`,[since]);
 const ig=tables.has('dm_instagram')?await rows('dm_instagram','SELECT contact,compte,post,cree FROM dm_instagram ORDER BY datetime(cree) DESC LIMIT 1500'):null;
 const contacts=new Map();for(const x of ig||[])if(!contacts.has(x.contact))contacts.set(x.contact,x);
 let dmDemandes=0,dmInteractions=0;
 if(stops)for(const d of dm||[]){const c=contacts.get(d.contact)||{};if(stopSet.has('c:'+d.contact)||stopSet.has('i:'+c.compte)||exclu([c.compte,d.texte],r))continue;dmInteractions++;const qual=qualification({sens:d.sens,texte:d.texte});if(!qual.action)continue;dmDemandes++;actions.push({cle:'dm:'+d.id,source:'dm',reference:String(d.id),titre:'Demande dans un DM Instagram',date:d.cree,etat:qual.etat,priorite:1,lien:'https://www.instagram.com/direct/inbox/',media_id:c.post||null,extrait:clean(d.texte,400),action:'Vérifier la réponse dans la conversation existante. Le DM ne vaut pas accord pour un appel ou un SMS.'});}
 if(dm&&!stops)etats.dm_fil={etat:'bloque_oppositions_absentes',nombre:null};
 compteurs.dm={conversations:stops&&dm?dmInteractions:null,demandes_vendeurs:stops&&dm?dmDemandes:null};
 const comments=await rows('ig_commentaires','SELECT comment_id,media_id,compte,texte,decision,reponse,cree FROM ig_commentaires WHERE datetime(cree)>=datetime(?) ORDER BY datetime(cree) DESC LIMIT 1500',[since]);
 let visibles=0,commentDemandes=0;
 for(const d of comments||[]){if(exclu([d.compte,d.texte],r)||stopSet.has('i:'+d.compte))continue;visibles++;const q=qualification({texte:d.texte,reponse:d.reponse});if(!q.action||/stop|refus|exclu/i.test(d.decision||''))continue;commentDemandes++;actions.push({cle:'commentaire:'+d.comment_id,source:'commentaires',reference:d.comment_id,titre:'Demande dans un commentaire Instagram',date:d.cree,media_id:d.media_id||null,extrait:clean(d.texte,400),etat:q.etat,priorite:2,lien:'https://www.instagram.com/',action:'Répondre au commentaire ou dans la conversation engagée, sans chercher de coordonnées ailleurs.'});}
 compteurs.commentaires={interactions:comments?visibles:null,demandes_vendeurs:comments?commentDemandes:null};
 const postaux=await rows('veille_postal','SELECT p.*, d.contact AS controle_contact, d.adresse AS controle_adresse FROM veille_postal p LEFT JOIN demandes d ON d.reference=p.demande_reference WHERE datetime(p.envoye_le)>=datetime(?) ORDER BY datetime(p.envoye_le) DESC LIMIT 1500',[since]);
 const postalValides=[];for(const p of postaux||[]){if(!p.controle_contact||exclu([p.controle_contact,p.controle_adresse],r))continue;const {controle_contact,controle_adresse,...registre}=p;postalValides.push(registre);}
 const retours=await rows('avis_prospects_demandes','SELECT avis_id,demande_reference,cree_le FROM avis_prospects_demandes WHERE datetime(cree_le)>=datetime(?) ORDER BY datetime(cree_le) DESC LIMIT 1500',[since]);
 const retoursValides=(retours||[]).filter(p=>cache.has(p.demande_reference));
 const idsConvertis=new Set();
 for(const x of retoursValides){const candidates=postalValides.filter(p=>(x.avis_id===p.avis_id || x.demande_reference===p.demande_reference)&&Date.parse(p.envoye_le)<=Date.parse(x.cree_le)).sort((a,b)=>b.envoye_le.localeCompare(a.envoye_le));if(candidates[0])idsConvertis.add(candidates[0].id);}
 const convertis=postalValides.filter(p=>idsConvertis.has(p.id));
 if(postaux&&!postaux.length)etats.veille_postal.etat='registre_vide_fichier_non_raccorde';
 compteurs.postal={envoyes:postalValides.length,retours_declares:postalValides.filter(p=>p.retour&&p.retour!=='aucun').length,demandes_attribuees:convertis.length,demandes_qr_non_rapprochees:retoursValides.filter(x=>!postalValides.some(p=>p.avis_id===x.avis_id||p.demande_reference===x.demande_reference)).length,taux_demande:postalValides.length?Math.round(convertis.length/postalValides.length*1000)/10:null};
 // La table courriers du site correspond aux e-mails différés, jamais aux courriers postaux.
 const mesures=await rows('google_mesures','SELECT jour,donnees,collecte_le,source FROM google_mesures ORDER BY jour DESC LIMIT 30');
 const derniere=mesures?.[0];let fiche=null;
 try{const a=await env.ASSETS.fetch(new URL('/avis.json',ctx.request.url));if(a.ok){const f=(await a.json()).fiche;fiche=f?{nom:f.nom,note:f.note,nombre:f.nombre,releve_le:f.releve_le,lien:f.lien_avis}:null;}}catch{}
 compteurs.google={mesures:derniere?{jour:derniere.jour,collecte_le:derniere.collecte_le,source:derniere.source,donnees:lire(derniere.donnees)}:null,fiche,precision:'Les vues, clics et avis ne sont pas des vendeurs identifiés. Aucun auteur d’avis n’est ajouté comme prospect.'};
 const traites=new Set((await b.prepare('SELECT cle FROM veille_actions').all()).results.map(x=>x.cle));
 const liste=actions.filter(x=>!traites.has(x.cle)).sort((a,b)=>a.priorite-b.priorite||a.date.localeCompare(b.date));
 const erreurs=Object.values(etats).filter(x=>/erreur|bloque/.test(x.etat));
 return {mode:'entrants_uniquement',periode:{debut:since,fin:now.toISOString(),jours:90},sources:etats,compteurs,actions:liste,postaux:postalValides.map(p=>({...p,demande_recue:convertis.some(x=>x.id===p.id)})),etat:erreurs.length?'partiel':'ok',limites:['Aucun import depuis un portail immobilier. Aucune collecte de coordonnées externes.','Les compteurs portent sur les 90 derniers jours et les limites indiquées par source.','Un lien personnel créé ne prouve ni l’envoi d’un courrier ni sa réception. Un scan ne vaut pas demande d’estimation.','Une demande entrante autorise une réponse à cette demande, pas une séquence commerciale sur tous les canaux.','Aucun appel, SMS, DM ou e-mail envoyé par ce tableau.']};
}
export async function quotidien(ctx,force=false,now=new Date()){
 exclusions(ctx.env);if(force){await veille(ctx,now);return {etat:'actualise',mode:'entrants_uniquement'};}const zone=ctx.env.PROSPECTS_TIMEZONE||'Asia/Karachi';
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
 if(!force&&Number(p.hour)<8)return {etat:'avant_8h',mode:'entrants_uniquement'};
 const jour=`${p.year}-${p.month}-${p.day}`,b=ctx.env.DB;
 const claim=await b.prepare(`INSERT INTO veille_executions(jour,debut,etat) VALUES(?,?,'en_cours') ON CONFLICT(jour) DO UPDATE SET debut=excluded.debut,etat='en_cours' WHERE veille_executions.etat IN ('erreur','partiel','en_cours') AND veille_executions.debut<? RETURNING jour`).bind(jour,now.toISOString(),new Date(now-30*60000).toISOString()).first();
 if(!claim)return {etat:'deja_execute',mode:'entrants_uniquement'};
 try{const v=await veille(ctx,now);const resume={mode:v.mode,periode:v.periode,sources:v.sources,compteurs:{...v.compteurs,google:{mesures_disponibles:!!v.compteurs.google.mesures}},actions:v.actions.length};await b.prepare('UPDATE veille_executions SET fin=?,etat=?,resume=? WHERE jour=?').bind(new Date().toISOString(),v.etat,JSON.stringify(resume),jour).run();return {etat:v.etat,mode:v.mode};}catch{await b.prepare("UPDATE veille_executions SET etat='erreur',fin=? WHERE jour=?").bind(new Date().toISOString(),jour).run();throw Error('veille_indisponible');}
}
