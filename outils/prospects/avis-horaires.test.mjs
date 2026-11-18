import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { schema } from '../../functions/api/prospects.js';
import { baseAvis,traiterAvis } from '../../functions/_lib/avis-google-auto.js';

const sql=new DatabaseSync(':memory:');
 const DB={prepare(q){return {a:[],bind(...a){this.a=a;return this},async run(){const x=sql.prepare(q).run(...this.a);return {meta:{changes:Number(x.changes)}}},async first(){return sql.prepare(q).get(...this.a)||null},async all(){return {results:sql.prepare(q).all(...this.a)}}}},async batch(qs){const r=[];for(const q of qs)r.push(await q.run());return r;}};
 after(()=>sql.close());
async function fixture(now,rappel=false){
 const env={DB,AVIS_GOOGLE_ACTIF:'1',RESEND_API_KEY:'fixture-no-network',REGLE9_LEAD_NOMS:'["Exclu Test"]',REGLE9_LEAD_ADRESSES:'["exclu@example.invalid"]'};
 await schema(env);await baseAvis(env);
 sql.exec('DELETE FROM google_avis;DELETE FROM google_suivi;DELETE FROM demandes;DELETE FROM veille_drive_controles;');
 sql.prepare("INSERT INTO google_suivi VALUES('dernier_evenement','0')").run();
 for(const id of ['repertoire','relances','acquereurs'])sql.prepare('INSERT INTO veille_drive_controles VALUES(?,?,?,?,?,?)').run(id,'https://docs.google.com/spreadsheets/d/'+id+'/edit',now.toISOString(),1,'["Contacts"]','[]');
 sql.prepare("INSERT INTO demandes(id,reference,source,type,reponses,contact,cree_le,statut) VALUES(1,'TEST','shawez','maison','{}',?,?,'recue')").run(JSON.stringify({prenom:'Test',nom:'Technique',email:'test@example.invalid'}),now.toISOString());
 sql.prepare('INSERT INTO google_avis(id,demande_id,email,email_hash,prenom,type,token,etat,cree_le,relance_prevue) VALUES(?,?,?,?,?,?,?,?,?,?)').run('test',1,'test@example.invalid','hash','Test','signature','token',rappel?'envoye':'attente',now.toISOString(),new Date(+now-86400000).toISOString());
 const sent=[];return {sql,env,sent,transport:async(e,m)=>{sent.push(m);return true;}};
}

// Heures UTC choisies pour 07:59, 08:00, 19:59 et 20:00 en Europe/Paris.
for(const [saison,lundi,dimanche,decalage] of [['hiver','2026-01-12','2026-01-11',1],['été','2026-07-13','2026-07-12',2]]){
 for(const rappel of [false,true])test(`${saison} : ${rappel?'relance':'première demande'}, limites et dimanche`,async()=>{
  const iso=(jour,h,m=0)=>new Date(`${jour}T${String(h-decalage).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`);
  for(const [date,autorise,raison] of [[iso(lundi,7,59),false,'heures_calmes'],[iso(lundi,8),true],[iso(lundi,19,59),true],[iso(lundi,20),false,'heures_calmes'],[iso(dimanche,12),false,'dimanche']]){
   const f=await fixture(date,rappel);
    const r=await traiterAvis(f.env,{now:date,transport:f.transport});
    assert.equal(f.sent.length,autorise?1:0,date.toISOString());
    assert.equal(r.envoyes,autorise?1:0);
    if(!autorise){assert.equal(r.raison,raison);assert.equal(f.sql.prepare('SELECT etat FROM google_avis').get().etat,rappel?'envoye':'attente');}
  }
 });
}
test('un traitement franchissant 20 h libère la demande sans appeler le transport',async()=>{
 const now=new Date('2026-07-13T17:59:59Z'),f=await fixture(now);
  const r=await traiterAvis(f.env,{now,horloge:()=>new Date('2026-07-13T18:00:00Z'),transport:f.transport});
  assert.equal(r.raison,'heures_calmes');assert.equal(f.sent.length,0);
  const q=f.sql.prepare('SELECT * FROM google_avis').get();assert.equal(q.etat,'attente');assert.equal(q.verrou_le,null);
  const reprise=new Date('2026-07-14T06:00:00Z');
  f.sql.prepare('UPDATE veille_drive_controles SET controle_le=?').run(reprise.toISOString());
  assert.equal((await traiterAvis(f.env,{now:reprise,transport:f.transport})).envoyes,1);
});
