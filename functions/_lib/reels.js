/* Reels : registre et historique commun, isolé par empreinte. Aucun zéro fabriqué. */
export const FIELDS = {IGRE01:'date',IGRE02:'timestamp',IGRE03:'content',IGRE04:'reelId',IGRE05:'imageUrl',IGRE06:'url',IGRE07:'comments',IGRE08:'engagement',IGRE09:'interactions',IGRE10:'likes',IGRE11:'reach',IGRE12:'saved',IGRE13:'videoViews',IGRE14:'videoViewsPaid',IGRE15:'videoViewsTotal',IGRE16:'reachPaid',IGRE17:'postInteractionsPaid',IGRE18:'postClicksPaid',IGRE19:'businessId',IGRE20:'spend',IGRE21:'shares',IGRE22:'interactionsTotal',IGRE23:'views',IGRE24:'averageWatchTime',IGRE25:'videoViewTotalTime',IGRE26:'durationSeconds',IGRE27:'retention',IGRE28:'reelsViewRate',IGRE29:'reposts',IGRE30:'reelsSkipRate'};
export const METRICS = ['durationSeconds','views','reach','reelsSkipRate','reelsViewRate','retention','averageWatchTime','likes','comments','saved','shares','reposts'];
export const day = d => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
export const yesterday = d => { const x=new Date(day(d)+'T12:00:00Z'); x.setUTCDate(x.getUTCDate()-1); return x.toISOString().slice(0,10); };
export function number(v) { if(v==null || v==='')return null; const n=Number(v); if(!Number.isFinite(n)||n<0)throw new Error('mesure_invalide'); return n; }
export function normalize(raw) {
 const id=String(raw.reelId||''); if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error('reel_id_invalide');
 const url=new URL(raw.url); if(url.protocol!=='https:' || !['instagram.com','www.instagram.com'].includes(url.hostname) || !/^\/(reel|p)\/[\w-]+\/?$/.test(url.pathname))throw new Error('url_invalide');
 let published=raw.timestamp || raw.publishedAt?.dateTime || raw.publishedAt; if(typeof published!=='string')throw new Error('date_invalide');
 if(/^\d{14}$/.test(published)) published=published.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,'$1-$2-$3T$4:$5:$6');
 if(!/^\d{4}-\d\d-\d\dT/.test(published)||!Number.isFinite(Date.parse(published)))throw new Error('date_invalide');
 const metrics=Object.fromEntries(METRICS.map(k=>[k,number(raw[k])]));
 for(const k of ['reelsSkipRate','reelsViewRate'])if(metrics[k]>100)throw new Error('taux_invalide');
 return {id,url:url.href,published:published.slice(0,10),content:String(raw.content||'').slice(0,10000),metrics,raw};
}
export function decodeDataset(payload, fields) {
 if(!Array.isArray(fields)||!fields.includes('IGRE04')||!fields.includes('IGRE06')||!fields.includes('IGRE02')||fields.some(f=>!FIELDS[f])||new Set(fields).size!==fields.length)throw new Error('champs_invalides');
 const rows=payload.rows || payload; if(!Array.isArray(rows)||rows.length>5000)throw new Error('format_invalide');
 return rows.map(row=>{if(!Array.isArray(row)||row.length!==fields.length)throw new Error('colonnes_invalides'); return normalize(Object.fromEntries(fields.map((f,i)=>[FIELDS[f],row[i]])));});
}
export async function init(DB) {
 await DB.batch([
 DB.prepare(`CREATE TABLE IF NOT EXISTS reels_registre (id TEXT PRIMARY KEY, url TEXT UNIQUE NOT NULL, publie TEXT NOT NULL, contenu TEXT NOT NULL, accroche TEXT, type TEXT NOT NULL DEFAULT 'inconnu' CHECK(type IN ('inconnu','essai','normal')), mot_cle TEXT, duree REAL, historique TEXT NOT NULL, mesures TEXT, observe_le TEXT, rapport_jour TEXT, maj_meta TEXT)`),
 DB.prepare(`CREATE TABLE IF NOT EXISTS reels_historique (empreinte TEXT NOT NULL, observe_le TEXT NOT NULL, rapport_jour TEXT NOT NULL, mesures TEXT NOT NULL, brut TEXT NOT NULL, meta TEXT NOT NULL, PRIMARY KEY(empreinte,observe_le))`),
 DB.prepare(`CREATE TABLE IF NOT EXISTS reels_collectes (id TEXT PRIMARY KEY, debut TEXT NOT NULL, fin TEXT, statut TEXT NOT NULL, erreur TEXT, nombre INTEGER, rapport_jour TEXT)`),
 DB.prepare(`CREATE TABLE IF NOT EXISTS reels_programmation (uuid TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('essai','normal')), accroche TEXT NOT NULL, mot_cle TEXT, programme_le TEXT NOT NULL, reel_id TEXT UNIQUE, cree_le TEXT NOT NULL)`)
 ]);
}
export async function historyName(id) {const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));return 'reels_h_'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export function tableName(name) {if(!/^reels_h_[a-f0-9]{64}$/.test(name))throw new Error('table_invalide');return name;}
export function fingerprint(name) { return tableName(name).slice('reels_h_'.length); }
export async function persist(DB, reels, observed, report, versions=[], after=[]) {
 if(!Number.isFinite(Date.parse(observed))||!/^\d{4}-\d\d-\d\d$/.test(report))throw new Error('date_invalide');
 const existing=new Map((await DB.prepare('SELECT * FROM reels_registre').all()).results.map(r=>[r.id,r]));
 const entries=await Promise.all(reels.map(async reel=>({reel,table:await historyName(reel.id)})));
 const commands=[];
 for(const {reel,table} of entries) {
 const old=existing.get(reel.id);
 const matches=versions.filter(v=>typeof v?.url==='string'&&v.url.replace(/\/$/,'')===reel.url.replace(/\/$/,''));
 const version=matches.length===1?matches[0]:null;
 const meta={accroche:old?.accroche||version?.accroche||null,type:old?.type&&old.type!=='inconnu'?old.type:version?'essai':'inconnu',mot_cle:old?.mot_cle||version?.mot||null,duree:old?.duree??null};
 commands.push(
 DB.prepare(`INSERT INTO reels_registre(id,url,publie,contenu,historique,mesures,observe_le,rapport_jour,type,accroche,mot_cle) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET url=excluded.url,publie=excluded.publie,contenu=excluded.contenu,mesures=excluded.mesures,observe_le=excluded.observe_le,rapport_jour=excluded.rapport_jour,type=excluded.type,accroche=excluded.accroche,mot_cle=excluded.mot_cle WHERE excluded.observe_le>=reels_registre.observe_le`).bind(reel.id,reel.url,reel.published,reel.content,table,JSON.stringify(reel.metrics),observed,report,meta.type,meta.accroche,meta.mot_cle),
 DB.prepare(`INSERT OR IGNORE INTO reels_historique(empreinte,observe_le,rapport_jour,mesures,brut,meta) VALUES(?,?,?,?,?,?)`).bind(fingerprint(table),observed,report,JSON.stringify(reel.metrics),JSON.stringify(reel.raw),JSON.stringify(meta)));
 }
 if(commands.length||after.length)await DB.batch([...commands,...after]);
}
export function rank(rows) {return rows.filter(r=>r.mesures.reelsSkipRate!=null).sort((a,b)=>a.mesures.reelsSkipRate-b.mesures.reelsSkipRate || (b.mesures.views??0)-(a.mesures.views??0));}
export function briefing(rows, report) {
 const measured=rank(rows.filter(r=>r.rapport_jour===report)); const best=measured[0], worst=measured.at(-1); const title=r=>r.accroche || '[Accroche visuelle non renseignée] '+r.contenu.split('\n')[0];
 return [best?`Meilleure tenue observée : « ${title(best)} » — ${best.mesures.reelsSkipRate.toFixed(1)} % d’abandon, ${best.mesures.averageWatchTime??'ND'} s de visionnage moyen. Constat cumulé au relevé ; la cause visuelle reste à vérifier.`:`Aucun relevé disponible pour le ${report}.`,worst?`Décrochage : « ${title(worst)} » — ${worst.mesures.reelsSkipRate.toFixed(1)} % d’abandon avant 3 s. ${measured.length} Reels mesurables.`:'Décrochage : données insuffisantes.',best?`À retester : « ${title(best)} ». ${best.mesures.reelsSkipRate<60?'Objectif < 60 % atteint sur ce relevé.':'La meilleure accroche reste au-dessus de la cible de 60 %.'} Hypothèse à confirmer en comparant même type et même âge.`:'Accroche à rejouer : attendre un relevé exploitable.'];
}
export async function keywordLeads(DB) {
 try {const rows=await DB.prepare(`SELECT lower(substr(post,5)) AS mot_cle, COUNT(DISTINCT contact) AS contacts FROM dm_instagram WHERE post LIKE 'mot:%' AND contact IS NOT NULL AND contact<>'' GROUP BY lower(substr(post,5)) ORDER BY contacts DESC`).all();return {disponible:true,definition:'Contacts ManyChat distincts enregistrés, tous historiques, par mot-clé ; ni leads qualifiés ni attribution par Reel.',lignes:rows.results};}catch{return {disponible:false,definition:'Source dm_instagram indisponible ; aucun chiffre estimé.',lignes:[]};}
}
// Contrat du dépôt Claude dans metricool_import. Les colonnes sont résolues par code, jamais par position supposée.
export const IMPORT_COLUMNS=['IGRE02','IGRE04','IGRE06','IGRE03','IGRE23','IGRE11','IGRE10','IGRE07','IGRE12','IGRE21','IGRE24','IGRE27','IGRE28','IGRE30','IGRE26'];
export function decodeImport(row) {
 const payload=typeof row.donnees==='string'?JSON.parse(row.donnees):row.donnees;
 if(!payload||typeof payload!=='object')throw new Error('import_format_invalide');
 let stamp=String(row.recu_le||'').replace(' ','T');
 if(!/(?:Z|[+-]\d\d:\d\d)$/.test(stamp))stamp+='Z';
 if(!Number.isFinite(Date.parse(stamp)))throw new Error('import_date_invalide');
 const observed=new Date(stamp).toISOString();
 if(typeof payload.erreur==='string')return {sourceError:payload.erreur.slice(0,500),observed};
 if(!Array.isArray(payload.colonnes)||IMPORT_COLUMNS.some(c=>!payload.colonnes.includes(c)))throw new Error('import_colonnes_incompletes');
 const reels=decodeDataset({rows:payload.lignes},payload.colonnes);
 if(new Set(reels.map(r=>r.id)).size!==reels.length)throw new Error('import_reels_dupliques');
 const end=String(row.periode_fin||'').slice(0,10);
 if(!/^\d{4}-\d\d-\d\d$/.test(end)||!Number.isFinite(Date.parse(end+'T12:00:00Z')))throw new Error('import_periode_invalide');
 return {reels,observed,report:end<yesterday(observed)?end:yesterday(observed)};
}
export function importWindow(now) {
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(now));
 return hour>=7&&hour<=9;
}
export async function importStatus(DB) {
 try {
 const pending=await DB.prepare("SELECT COUNT(*) AS n FROM metricool_import WHERE reseau='instagram' AND connecteur='reels' AND traite_le IS NULL").first();
 const latest=await DB.prepare("SELECT id,recu_le,periode_debut,periode_fin,traite_le FROM metricool_import WHERE reseau='instagram' AND connecteur='reels' ORDER BY recu_le DESC,id DESC LIMIT 1").first();
 return {disponible:true,en_attente:pending.n,dernier_import:latest||null};
 }catch{return {disponible:false,en_attente:0,dernier_import:null};}
}
export async function processImports(env, now=new Date()) {
 const DB=env.DB;if(!DB)throw new Error('base_absente');await init(DB);
 let rows;
 try {rows=(await DB.prepare("SELECT id,recu_le,periode_debut,periode_fin,donnees FROM metricool_import WHERE reseau='instagram' AND connecteur='reels' AND traite_le IS NULL ORDER BY recu_le,id LIMIT 3").all()).results;}
 catch{return {etat:'source_absente',traites:0};}
 if(!rows.length)return {etat:'sans_import',traites:0};
 const lockId='d1-traitement:'+crypto.randomUUID(),started=now.toISOString();
 const lease=await DB.prepare(`INSERT INTO reels_collectes(id,debut,statut) SELECT ?,?,'en_cours' WHERE NOT EXISTS(SELECT 1 FROM reels_collectes WHERE statut='en_cours' AND debut>?) RETURNING id`).bind(lockId,started,new Date(now.getTime()-15*60000).toISOString()).first();
 if(!lease)return {etat:'deja_en_cours',traites:0};
 let traites=0,erreurs=0,versions=[];
 // Le registre existant est un asset du site ; aucune API Metricool ni requête GitHub.
 if(env.ASSETS)try {const r=await env.ASSETS.fetch('https://shawez-immo.com/outils/trial-reels/registre.json');if(r.ok){const data=await r.json();if(Array.isArray(data.versions))versions=data.versions;}}catch{}
 try {
 for(const row of rows) {
 const runId='metricool-import:'+row.id;
 try {
 const parsed=decodeImport(row);
 const end=new Date().toISOString();
 const failedSource=Object.hasOwn(parsed,'sourceError');
 const status=failedSource?'erreur_source':parsed.reels.length?'ok':'vide';
 const count=parsed.reels?.length||0;
 const journal=DB.prepare(`INSERT INTO reels_collectes(id,debut,fin,statut,erreur,nombre,rapport_jour) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET fin=excluded.fin,statut=excluded.statut,erreur=excluded.erreur,nombre=excluded.nombre,rapport_jour=excluded.rapport_jour`).bind(runId,parsed.observed,end,status,parsed.sourceError||null,count,parsed.report||null);
 const acknowledge=DB.prepare('UPDATE metricool_import SET traite_le=? WHERE id=? AND traite_le IS NULL').bind(end,row.id);
 if(failedSource){await DB.batch([journal,acknowledge]);erreurs++;}
 else await persist(DB,parsed.reels,parsed.observed,parsed.report,versions,[journal,acknowledge]);
 traites++;
 }catch(e){
 // Une ligne invalide ou une panne D1 n'est jamais acquittée ; les données brutes restent réparables.
 erreurs++;
 const code=/^(import_|mesure_|taux_|champs_|colonnes_|reel_|date_|url_)/.test(e.message)?e.message:'import_traitement_echec';
 await DB.prepare(`INSERT INTO reels_collectes(id,debut,fin,statut,erreur) VALUES(?,?,?,'erreur_import',?) ON CONFLICT(id) DO UPDATE SET fin=excluded.fin,statut=excluded.statut,erreur=excluded.erreur`).bind(runId,started,new Date().toISOString(),code).run();
 }
 }
 }finally{await DB.prepare("UPDATE reels_collectes SET fin=?,statut=?,nombre=? WHERE id=?").bind(new Date().toISOString(),erreurs?'termine_avec_erreurs':'termine',traites,lockId).run();}
 const pending=await DB.prepare("SELECT COUNT(*) AS n FROM metricool_import WHERE reseau='instagram' AND connecteur='reels' AND traite_le IS NULL").first();
 return {etat:erreurs?'erreurs':'ok',traites,en_attente:pending.n};
}
