/* Migration explicite et additive. Aucun appel automatique depuis une requête publique. */
import {init, fingerprint} from './reels.js';
const columns = 'observe_le,rapport_jour,mesures,brut,meta';
export async function sources(DB) {
 const rows = (await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).results;
 return rows.map(r=>r.name).filter(n=>/^reels_h_[a-f0-9]{64}$/.test(n));
}
function difference(table) {
 const hash=fingerprint(table);
 return `SELECT ${columns} FROM ${table} EXCEPT SELECT ${columns} FROM reels_historique WHERE empreinte='${hash}'`;
}
export async function verifyHistory(DB, tables) {
 tables ??= await sources(DB);
 const report=[];
 // Un SELECT par table dans un batch transactionnel D1 (pas de UNION volumineux).
 for(let start=0;start<tables.length;start+=20) {
  const statements=tables.slice(start,start+20).map(table=>{
   const hash=fingerprint(table);
   return DB.prepare(`SELECT '${table}' AS source,(SELECT COUNT(*) FROM ${table}) AS lignes_source,(SELECT COUNT(*) FROM reels_historique WHERE empreinte='${hash}') AS lignes_cible,(SELECT COUNT(*) FROM (${difference(table)})) AS differences`);
  });
  const results=await DB.batch(statements);
  for(const result of results)report.push(...result.results);
 }
 return {tables:report.length,lignes_source:report.reduce((n,r)=>n+r.lignes_source,0),differences:report.reduce((n,r)=>n+r.differences,0),details:report};
}
export async function migrateHistory(DB) {
 await init(DB);
 const tables=await sources(DB);
 if(tables.length)await DB.batch(tables.map(table=>DB.prepare(`INSERT OR IGNORE INTO reels_historique(empreinte,${columns}) SELECT '${fingerprint(table)}',${columns} FROM ${table}`)));
 const report=await verifyHistory(DB,tables);
 if(report.differences)throw new Error('migration_historique_differences');
 return report;
}
// À appeler seulement après validation explicite du plan ET bascule de tous les lecteurs/écrivains.
// Les assertions et DROP sont dans UN batch D1 : une différence annule toute la transaction.
export async function removeLegacyHistory(DB, confirmation) {
 if(confirmation!=='SUPPRIMER_APRES_BASCULE_VERIFIEE')throw new Error('confirmation_migration_requise');
 const tables=await sources(DB);
 const report=await verifyHistory(DB,tables);
 if(report.differences)throw new Error('migration_historique_differences');
 await DB.prepare('CREATE TABLE IF NOT EXISTS reels_migration_garde (n INTEGER NOT NULL CHECK(n=0))').run();
 const checks=tables.map(table=>DB.prepare(`INSERT INTO reels_migration_garde(n) SELECT COUNT(*) FROM (${difference(table)})`));
 await DB.batch([...checks,...tables.map(table=>DB.prepare(`DROP TABLE ${table}`)),DB.prepare('DELETE FROM reels_migration_garde')]);
 return report;
}
