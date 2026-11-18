import {migrateHistory,verifyHistory} from '../../_lib/reels-migration.js';
import {compteSession,estAdmin,verifierOrigine,Erreur,corps,json,db} from '../../_lib/base.js';
import {init,processImports,importStatus,importWindow,decodeDataset,persist,day,yesterday,briefing,keywordLeads,fingerprint,normalize} from '../../_lib/reels.js';
async function admin(request,env) {const c=await compteSession(request,env);if(!c)throw new Erreur(401,'connexion');if(!estAdmin(c,env))throw new Erreur(403,'interdit');return c;}
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
export async function onRequest({request,env,params}) {
 try {
 const route='/'+[].concat(params.route||[]).join('/'), u=new URL(request.url), method=request.method;
 // Déclencheur sans secret : seulement les lignes D1 préexistantes, jamais de données dans la requête.
 if(method==='GET'&&route==='/taches') {
   if(!importWindow(new Date()))return json(200,{etat:'hors_creneau',traites:0});
   return json(200,await processImports(env));
 }
 if(method==='POST'&&route==='/collect'){verifierOrigine(request);await admin(request,env);return json(200,await processImports(env));}
 verifierOrigine(request);await admin(request,env); const DB=await db(env);await init(DB);
 if(method==='POST'&&route==='/migration') {const b=await corps(request,1000);if(b.action==='copier')return json(200,await migrateHistory(DB));if(b.action==='verifier')return json(200,await verifyHistory(DB));throw new Erreur(400,'action_migration');}
 if(method==='GET'&&route==='/') {
 const found=await DB.prepare('SELECT * FROM reels_registre ORDER BY publie DESC').all();let rows=found.results.map(r=>({...r,mesures:JSON.parse(r.mesures||'{}'),leads_reel:null}));
 const from=u.searchParams.get('debut')||'',to=u.searchParams.get('fin')||'',type=u.searchParams.get('type')||'';
 rows=rows.filter(r=>(!from||r.publie>=from)&&(!to||r.publie<=to)&&(!type||r.type===type));
 const runs=await DB.prepare('SELECT * FROM reels_collectes ORDER BY debut DESC LIMIT 15').all();
 const latest=rows.map(r=>r.observe_le).filter(Boolean).sort().at(-1),report=yesterday(new Date());
 return json(200,{reels:rows,synthese:briefing(rows,report),rapport_jour:report,dernier_releve:latest||null,perime:!latest||Date.now()-Date.parse(latest)>36*3600000,collectes:runs.results,mots_cles:await keywordLeads(DB),attribution:'Indisponible : media_id absent des événements ManyChat. Les contacts par mot-clé ne sont jamais répartis par Reel.',imports:await importStatus(DB)});
 }
 if(method==='GET'&&route==='/historique') {
 const reel=await DB.prepare('SELECT * FROM reels_registre WHERE id=?').bind(u.searchParams.get('id')||'').first();if(!reel)throw new Erreur(404,'reel_absent');
 const rows=await DB.prepare('SELECT observe_le,rapport_jour,mesures,brut,meta FROM reels_historique WHERE empreinte=? ORDER BY observe_le DESC LIMIT 500').bind(fingerprint(reel.historique)).all();return json(200,{reel,historique:rows.results.map(r=>({...r,mesures:JSON.parse(r.mesures),meta:JSON.parse(r.meta)}))});
 }
 if(method==='POST'&&route==='/import') {
 const b=await corps(request,4000000);if(b.brandId!=='7212231'||b.timezone!=='Europe/Paris')throw new Erreur(400,'marque_invalide');
 const observed=b.observed_at;if(!observed||!Number.isFinite(Date.parse(observed))||Date.parse(observed)>Date.now()+60000)throw new Erreur(400,'date_invalide');
 const reels=decodeDataset(b,b.metrics);const report=b.report_date||yesterday(observed);if(b.programmations!=null&&(!Array.isArray(b.programmations)||b.programmations.length>5000))throw new Erreur(400,'programmations');await persist(DB,reels,observed,report,b.programmations||[]);
 await DB.prepare('INSERT OR IGNORE INTO reels_collectes(id,debut,fin,statut,nombre,rapport_jour) VALUES(?,?,?,\'import\',?,?)').bind('import:'+observed,observed,new Date().toISOString(),reels.length,report).run();return json(200,{ok:true,nombre:reels.length});
 }
 if(method==='POST'&&route==='/meta') {
 const b=await corps(request,5000);if(!validId(b.id)||!['essai','normal','inconnu'].includes(b.type)||typeof b.accroche!=='string'||b.accroche.length>500||typeof b.mot_cle!=='string'||b.mot_cle.length>80)throw new Erreur(400,'champs');
 const duree=b.duree==null||b.duree===''?null:Number(b.duree);if(duree!=null&&(!Number.isFinite(duree)||duree<=0||duree>3600))throw new Erreur(400,'duree');
 const r=await DB.prepare('SELECT * FROM reels_registre WHERE id=?').bind(b.id).first();if(!r)throw new Erreur(404,'reel_absent');
 const now=new Date().toISOString(),meta={type:b.type,accroche:b.accroche.trim(),mot_cle:b.mot_cle.trim().toLowerCase(),duree};
 await DB.batch([DB.prepare('UPDATE reels_registre SET type=?,accroche=?,mot_cle=?,duree=?,maj_meta=? WHERE id=?').bind(meta.type,meta.accroche,meta.mot_cle,duree,now,b.id),DB.prepare('INSERT INTO reels_historique(empreinte,observe_le,rapport_jour,mesures,brut,meta) VALUES(?,?,?,?,?,?)').bind(fingerprint(r.historique),now,r.rapport_jour||day(now),r.mesures||'{}',JSON.stringify({evenement:'correction_meta'}),JSON.stringify(meta))]);return json(200,{ok:true});
 }
 if(method==='POST'&&route==='/programmation') {
 const b=await corps(request,5000);if(typeof b.uuid!=='string'||!/^[-\w]{1,100}$/.test(b.uuid)||!['essai','normal'].includes(b.type)||typeof b.accroche!=='string'||!b.accroche.trim()||b.accroche.length>500||typeof b.mot_cle!=='string'||b.mot_cle.length>80||typeof b.programme_le!=='string'||!Number.isFinite(Date.parse(b.programme_le)))throw new Erreur(400,'champs');
 if(b.reel_id!=null&&!validId(b.reel_id))throw new Erreur(400,'reel_id');
 if(b.reel_id) {const r=await DB.prepare('SELECT id FROM reels_registre WHERE id=?').bind(b.reel_id).first();if(!r)throw new Erreur(404,'reel_absent');}
 const commands=[DB.prepare('INSERT INTO reels_programmation VALUES(?,?,?,?,?,?,?) ON CONFLICT(uuid) DO UPDATE SET type=excluded.type,accroche=excluded.accroche,mot_cle=excluded.mot_cle,programme_le=excluded.programme_le,reel_id=excluded.reel_id').bind(b.uuid,b.type,b.accroche.trim(),b.mot_cle.trim().toLowerCase(),b.programme_le,b.reel_id||null,new Date().toISOString())];
 if(b.reel_id)commands.push(DB.prepare('UPDATE reels_registre SET type=?,accroche=?,mot_cle=? WHERE id=?').bind(b.type,b.accroche.trim(),b.mot_cle.trim().toLowerCase(),b.reel_id));
 await DB.batch(commands);return json(200,{ok:true});
 }
 if(method==='GET'&&route==='/programmation')return json(200,{programmations:(await DB.prepare('SELECT * FROM reels_programmation ORDER BY programme_le DESC').all()).results});
 return json(404,{error:'introuvable'});
 }catch(e){if(e instanceof Erreur)return json(e.status,{error:e.code});return json(500,{error:/^[a-z_0-9]+$/.test(e.message)?e.message:'reels_erreur'});}
}
