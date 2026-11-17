/* Reels: registre et une table d'historique par Reel. Aucun zéro fabriqué. */
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
 DB.prepare(`CREATE TABLE IF NOT EXISTS reels_collectes (id TEXT PRIMARY KEY, debut TEXT NOT NULL, fin TEXT, statut TEXT NOT NULL, erreur TEXT, nombre INTEGER, rapport_jour TEXT)`),
 DB.prepare(`CREATE TABLE IF NOT EXISTS reels_programmation (uuid TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('essai','normal')), accroche TEXT NOT NULL, mot_cle TEXT, programme_le TEXT NOT NULL, reel_id TEXT UNIQUE, cree_le TEXT NOT NULL)`)
 ]);
}
export async function historyName(id) {const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id));return 'reels_h_'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export function tableName(name) {if(!/^reels_h_[a-f0-9]{64}$/.test(name))throw new Error('table_invalide');return name;}
export async function persist(DB, reels, observed, report, versions=[]) {
 // Tout valider avant la première écriture ; pas de suppression des Reels absents du fournisseur.
 if(!Number.isFinite(Date.parse(observed))||!/^\d{4}-\d\d-\d\d$/.test(report))throw new Error('date_invalide');
 for(const reel of reels) {
 const table=await historyName(reel.id);
 await DB.prepare(`CREATE TABLE IF NOT EXISTS ${table} (observe_le TEXT PRIMARY KEY, rapport_jour TEXT NOT NULL, mesures TEXT NOT NULL, brut TEXT NOT NULL, meta TEXT NOT NULL)`).run();
 const old=await DB.prepare('SELECT * FROM reels_registre WHERE id=?').bind(reel.id).first();
 // Le registre du Monteur décrit explicitement chaque Trial Reel ; correspondance par URL exacte seulement.
 const matches=versions.filter(v=>v.url?.replace(/\/$/,'')===reel.url.replace(/\/$/,''));
 const version=matches.length===1?matches[0]:null;
 const meta={accroche:old?.accroche||version?.accroche||null,type:old?.type&&old.type!=='inconnu'?old.type:version?'essai':'inconnu',mot_cle:old?.mot_cle||version?.mot||null,duree:old?.duree??null};
 await DB.batch([
 DB.prepare(`INSERT INTO reels_registre(id,url,publie,contenu,historique,mesures,observe_le,rapport_jour,type,accroche,mot_cle) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET url=excluded.url,publie=excluded.publie,contenu=excluded.contenu,mesures=excluded.mesures,observe_le=excluded.observe_le,rapport_jour=excluded.rapport_jour,type=excluded.type,accroche=excluded.accroche,mot_cle=excluded.mot_cle WHERE excluded.observe_le>=reels_registre.observe_le`).bind(reel.id,reel.url,reel.published,reel.content,table,JSON.stringify(reel.metrics),observed,report,meta.type,meta.accroche,meta.mot_cle),
 DB.prepare(`INSERT OR IGNORE INTO ${table}(observe_le,rapport_jour,mesures,brut,meta) VALUES(?,?,?,?,?)`).bind(observed,report,JSON.stringify(reel.metrics),JSON.stringify(reel.raw),JSON.stringify(meta))
 ]);
 }
}
export function rank(rows) {return rows.filter(r=>r.mesures.reelsSkipRate!=null).sort((a,b)=>a.mesures.reelsSkipRate-b.mesures.reelsSkipRate || (b.mesures.views??0)-(a.mesures.views??0));}
export function briefing(rows, report) {
 const measured=rank(rows.filter(r=>r.rapport_jour===report)); const best=measured[0], worst=measured.at(-1); const title=r=>r.accroche || '[Accroche visuelle non renseignée] '+r.contenu.split('\n')[0];
 return [best?`Meilleure tenue observée : « ${title(best)} » — ${best.mesures.reelsSkipRate.toFixed(1)} % d’abandon, ${best.mesures.averageWatchTime??'ND'} s de visionnage moyen. Constat cumulé au relevé ; la cause visuelle reste à vérifier.`:`Aucun relevé disponible pour le ${report}.`,worst?`Décrochage : « ${title(worst)} » — ${worst.mesures.reelsSkipRate.toFixed(1)} % d’abandon avant 3 s. ${measured.length} Reels mesurables.`:'Décrochage : données insuffisantes.',best?`À retester : « ${title(best)} ». ${best.mesures.reelsSkipRate<60?'Objectif < 60 % atteint sur ce relevé.':'La meilleure accroche reste au-dessus de la cible de 60 %.'} Hypothèse à confirmer en comparant même type et même âge.`:'Accroche à rejouer : attendre un relevé exploitable.'];
}
export async function keywordLeads(DB) {
 try {const rows=await DB.prepare(`SELECT lower(substr(post,5)) AS mot_cle, COUNT(DISTINCT contact) AS contacts FROM dm_instagram WHERE post LIKE 'mot:%' AND contact IS NOT NULL AND contact<>'' GROUP BY lower(substr(post,5)) ORDER BY contacts DESC`).all();return {disponible:true,definition:'Contacts ManyChat distincts enregistrés, tous historiques, par mot-clé ; ni leads qualifiés ni attribution par Reel.',lignes:rows.results};}catch{return {disponible:false,definition:'Source dm_instagram indisponible ; aucun chiffre estimé.',lignes:[]};}
}
export async function collect(env, now=new Date()) {
 if(!env.METRICOOL_API_TOKEN)throw new Error('metricool_non_configure');
 await init(env.DB); const done=await env.DB.prepare("SELECT id FROM reels_collectes WHERE statut='ok' AND rapport_jour=? LIMIT 1").bind(yesterday(now)).first(); if(done)return {deja_collecte:true}; const id=crypto.randomUUID(), observed=now.toISOString(), report=yesterday(now);
 const lease=await env.DB.prepare(`INSERT INTO reels_collectes(id,debut,statut,rapport_jour) SELECT ?,?,'en_cours',? WHERE NOT EXISTS(SELECT 1 FROM reels_collectes WHERE statut='en_cours' AND debut>?) RETURNING id`).bind(id,observed,report,new Date(now.getTime()-15*60000).toISOString()).first();
 if(!lease)return {deja_en_cours:true};
 try {
 const url=new URL('https://app.metricool.com/api/v2/analytics/reels/instagram');
 // Toute la période depuis le démarrage de la marque est relue : aucun Reel ne sort de l'historique après 90 jours.
 for(const [k,v] of Object.entries({userId:'5583508',blogId:'7212231',from:'2026-10-01T00:00:00',to:report+'T23:59:59',timezone:'Europe/Paris'}))url.searchParams.set(k,v);
 const response=await fetch(url,{headers:{'X-Mc-Auth':env.METRICOOL_API_TOKEN},signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw new Error('metricool_http_'+response.status);
 const payload=await response.json(); if(!Array.isArray(payload.data))throw new Error('metricool_format');
 if(payload.page?.next || payload.page?.hasNext)throw new Error('metricool_pagination_a_adapter');
 let reels=payload.data.map(normalize); if(!reels.length)throw new Error('metricool_reponse_vide');
 // Le catalogue Data Studio expose IGRE27/28 absents du contrat REST actuel.
 // Le contrat de paramètres doit être confirmé avec la clé de production ; échec visible, jamais silencieux.
 let complement='rest_seul';
 if(env.REELS_DATASTUDIO_ACTIVE==='1') {
   const fields=Object.keys(FIELDS).filter(k=>!['IGRE13','IGRE15'].includes(k));
   const dataset=new URL('https://app.metricool.com/api/datastudio/datasets');
   for(const [k,v] of Object.entries({userId:'5583508',blogId:'7212231',start:'20261001',end:report.replaceAll('-',''),fields:fields.join(',')}))dataset.searchParams.set(k,v);
   const data=await fetch(dataset,{headers:{'X-Mc-Auth':env.METRICOOL_API_TOKEN},signal:AbortSignal.timeout(90000)});
   if(!data.ok)throw new Error('metricool_dataset_http_'+data.status);
   const values=decodeDataset(await data.json(),fields);
   if(!values.length || values.length!==reels.length || values.some(r=>!reels.some(x=>x.id===r.id)))throw new Error('metricool_dataset_incomplet');
   reels=values;complement='datastudio';
 }
 let versions=[],registre='indisponible';
 try {const response=await fetch('https://raw.githubusercontent.com/shawez-lab/shawez-immo/main/outils/trial-reels/registre.json',{signal:AbortSignal.timeout(15000)}); if(response.ok){const source=await response.json();if(!Array.isArray(source.versions))throw new Error();versions=source.versions;registre='ok';}}catch{}
 await persist(env.DB,reels,observed,report,versions);
 await env.DB.prepare("UPDATE reels_collectes SET fin=?,statut='ok',nombre=? WHERE id=?").bind(new Date().toISOString(),reels.length,id).run();
 return {ok:true,nombre:reels.length,rapport_jour:report,source:complement,registre_programmation:registre,limite:'IGRE27 et IGRE28 restent indisponibles si absents de la réponse REST. Import Data Studio accepté séparément.'};
 }catch(e){const code=/^(metricool_|mesure_|reel_|url_|date_|taux_)/.test(e.message)?e.message:'collecte_echec';await env.DB.prepare("UPDATE reels_collectes SET fin=?,statut='erreur',erreur=? WHERE id=?").bind(new Date().toISOString(),code,id).run();throw new Error(code);}
}
