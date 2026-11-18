import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { construireAvis } from '../../functions/_lib/avis-prospect.js';
import { db,sha256 } from '../../functions/_lib/base.js';
import { onRequest } from '../../functions/api/avis-prospects/[[route]].js';
import { enregistrerQualification } from '../../functions/_lib/chat-crm.js';
import { csv,preparerDVF } from '../../functions/_lib/avis-dvf.js';
import { onRequestGet as pagePersonnelle } from '../../functions/votre-estimation/[[route]].js';

// Données exclusivement synthétiques : aucun résultat de test n'est une estimation commerciale.
const s={url:'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees',ref:'FIXTURE SYNTHETIQUE',consulte_le:'2026-11-17'};
const fixture=()=>({bien:{commune:'Commune test',voie:'Rue test',type:'appartement',surface:50,source:s},arrete_au:'2026-11-17',source_dvf:s,ventes:Array.from({length:10},(_,i)=>({id:'test-'+i,date:i<5?'2025-01-15':'2026-01-15',commune:'Commune test',voie:'Rue test',type:'appartement',surface:50,prix:100000+i*1000,mutation_simple:true,source:s})),honoraires:{mode:'taux_prix_hai',valeur:.05,charge:'vendeur',prix_reference_hai_confirme:true,source:s}});
let a=construireAvis(fixture(),'2026-11-17');
assert.equal(a.ventes.length,10);assert.equal(a.perimetre,'rue');assert.equal(a.marche.median_m2,2090);assert.equal(a.fourchette.bas,102250);assert.equal(a.net.bas,97138);assert.ok(a.marche.evolution_pct>0);
let f=fixture();f.ventes[0].date='2024-11-16';assert.equal(construireAvis(f,'2026-11-17').ventes.length,9);
f=fixture();f.ventes=f.ventes.slice(0,4);assert.equal(construireAvis(f,'2026-11-17').fourchette,null);
f=fixture();f.ventes[0].source=null;assert.throws(()=>construireAvis(f));
f=fixture();f.ventes.push(f.ventes[0]);assert.throws(()=>construireAvis(f));
f=fixture();f.ventes[0].mutation_simple=false;assert.equal(construireAvis(f).ventes.length,9);
f=fixture();f.honoraires.valeur=1.1;assert.throws(()=>construireAvis(f));
f=fixture();f.concurrence=[{titre:'test',prix:100000,surface:50,premiere_observation:'2026-11-01',derniere_observation:'2026-11-17',source:s}];assert.equal(construireAvis(f,'2026-11-17').concurrence[0].duree_observee,16);

const sqlite=new DatabaseSync(':memory:');
const adapter={prepare(sql){let valeurs=[];return {bind(...v){valeurs=v;return this;},q(){const args=[];const normalized=sql.replace(/\?(\d+)/g,(_,n)=>{args.push(valeurs[Number(n)-1]);return '?';});return [sqlite.prepare(normalized),args];},async run(){const [q,v]=this.q();return q.run(...v);},async first(){const [q,v]=this.q();return q.get(...v) || null;},async all(){const [q,v]=this.q();return {results:q.all(...v)};}};},async batch(stmts){sqlite.exec('BEGIN');try{const r=[];for(const q of stmts)r.push(await q.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const env={DB:adapter,ADMIN_EMAILS:'admin@example.invalid',REGLE9_LEAD_ADRESSES:'["adresse exclue test"]',REGLE9_LEAD_NOMS:'["personne exclue test"]'};
await db(env);
sqlite.prepare("INSERT INTO comptes(email,mdp,verifie,cree_le) VALUES ('admin@example.invalid','',1,'2026-11-17')").run();
const session='x'.repeat(43);sqlite.prepare('INSERT INTO sessions(id,compte_id,expire,cree_le,prouve) VALUES (?,1,?,\'2026-11-17\',1)').run(await sha256(session),Math.floor(Date.now()/1000)+86400);
const waits=[];
async function appel(route='',method='GET',data=null,admin=false,origine='https://shawez-immo.com'){
 const request=new Request('https://shawez-immo.com/api/avis-prospects/'+route,{method,headers:{Origin:origine,'Content-Type':'application/json',...(admin?{Cookie:'se_session='+session}:{})},...(data?{body:JSON.stringify(data)}:{})});
 const r=await onRequest({request,env,params:{route:route.split('?')[0]},waitUntil:p=>waits.push(p)});const d=await r.json();return [r.status,d];
}
assert.equal((await appel('admin'))[0],403);
let [status,r]=await appel('admin','POST',fixture(),true);assert.equal(status,201,JSON.stringify(r));const token=r.url.split('/').filter(Boolean).pop();
assert.equal((await appel('?token='+token))[0],200);
assert.equal((await appel('?token='+'z'.repeat(43)))[0],404);
const demande={token,prenom:'Test technique',nom:'',telephone:'0612345678',echeance:'moins_3_mois',demande_estimation:true,whatsapp:false};
assert.equal((await appel('demander','POST',demande,false,'https://autre.invalid'))[0],403);
assert.equal((await appel('demander','POST',{...demande,demande_estimation:false}))[0],400);
[status,r]=await appel('demander','POST',demande);assert.equal(status,201,JSON.stringify(r));assert.ok(r.avis.net);assert.equal(sqlite.prepare('SELECT count(*) n FROM demandes').get().n,1);assert.equal(sqlite.prepare('SELECT count(*) n FROM crm_sortie').get().n,0);
assert.equal((await appel('demander','POST',demande))[0],200);assert.equal(sqlite.prepare('SELECT count(*) n FROM demandes').get().n,1);
const reponsesPostal=JSON.parse(sqlite.prepare('SELECT reponses FROM demandes').get().reponses);assert.equal(reponsesPostal.delai,'asap');assert.equal(reponsesPostal.delai_precis,'moins_3_mois');
const page=await pagePersonnelle({request:new Request('https://shawez-immo.com/votre-estimation/'+token+'/'),params:{route:[token]},env:{ASSETS:{async fetch(u){assert.equal(u.pathname,'/estimation-personnalisee/');return new Response('<html>Étude</html>',{status:200});}}}});assert.equal(page.status,200);assert.match(page.headers.get('X-Robots-Tag'),/noindex/);
[status,r]=await appel('demander','POST',{...demande,telephone:'0612345679',whatsapp:true});assert.equal(status,201);await Promise.all(waits);assert.equal(sqlite.prepare('SELECT count(*) n FROM crm_sortie').get().n,1);assert.equal(JSON.parse(sqlite.prepare('SELECT payload FROM crm_sortie').get().payload).automation_allowed,true);
assert.equal((await appel('opposition','POST',{token}))[0],200);assert.equal((await appel('?token='+token))[0],404);
assert.equal((await appel('demander','POST',demande))[0],404);
assert.equal(await enregistrerQualification(env,'session-test',{serieux:false,intention:'vendre'}),null);
const qualification={serieux:true,intention:'vendre',secteur:'Commune test',echeance:'Dans six mois',prenom:'Test technique'};
await enregistrerQualification(env,'session-test',qualification);await enregistrerQualification(env,'session-test',qualification);
assert.equal(sqlite.prepare("SELECT count(*) n FROM demandes WHERE reference LIKE 'CHAT-%'").get().n,1);
assert.equal(sqlite.prepare('SELECT count(*) n FROM crm_sortie').get().n,1);
assert.equal((await appel('admin','POST',fixture(),true))[1].error,'opposition_bien');
assert.equal(csv('a,b\n"rue, test","mot ""cité"""\n')[0].b,'mot "cité"');
const raw='id_mutation,date_mutation,nature_mutation,code_commune,type_local,valeur_fonciere,surface_reelle_bati,adresse_nom_voie\nm1,2025-01-15,Vente,21231,Appartement,100000,50,RUE TEST\nm2,2025-01-16,Vente,21231,Appartement,200000,50,RUE TEST\nm2,2025-01-16,Vente,21231,Appartement,200000,20,RUE TEST\n';
const prep=await preparerDVF({...fixture().bien,insee:'21231'},async url=>url.includes('/2025/')?new Response(raw):new Response('',{status:404}),'2026-11-17');
assert.equal(prep.ventes.length,1);assert.ok(prep.publication.includes('2026: fichier non publié ou absent'));assert.ok(prep.ventes[0].source.ref.includes('ligne CSV 2'));
console.log('Tests réussis : sources, période 24 mois, calcul, échantillon insuffisant, ventes groupées, doublons, honoraires, observations, authentification, origine, D1, consentement, idempotence, opposition.');
