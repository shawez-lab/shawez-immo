import { jeton } from './base.js';
export const mediaId=s=>typeof s==='string'&&/^\d{10,30}(?:_\d{5,30})?$/.test(s)?s:null;
export const tokenValide=s=>typeof s==='string'&&/^[\w-]{43}$/.test(s);
export async function baseAttribution(b){await b.batch([
 b.prepare('CREATE TABLE IF NOT EXISTS dm_reels_attribution(token TEXT PRIMARY KEY,evenement TEXT NOT NULL UNIQUE,media_id TEXT NOT NULL,post TEXT,cree_le TEXT NOT NULL)'),
 b.prepare('CREATE TABLE IF NOT EXISTS demandes_reels_attribution(demande_id INTEGER PRIMARY KEY,token TEXT NOT NULL,media_id TEXT NOT NULL,cree_le TEXT NOT NULL)')]);}
export async function noterMedia(b,evenement,media,post,now=new Date()){
 if(!mediaId(media)||!evenement)return null;await baseAttribution(b);
 await b.prepare('INSERT OR IGNORE INTO dm_reels_attribution VALUES(?,?,?,?,?)').bind(jeton(),evenement,media,String(post||'').slice(0,300),now.toISOString()).run();
 return (await b.prepare('SELECT token FROM dm_reels_attribution WHERE evenement=? AND media_id=?').bind(evenement,media).first())?.token||null;
}
export function lienAttribution(url,token){if(!tokenValide(token))return url;try{const u=new URL(url);if(u.origin==='https://shawez-immo.com'&&u.pathname==='/estimer/'){u.searchParams.set('reel_source',token);return u.href}}catch{}return url;}
export function attacherMedia(bloc,token){if(!token)return bloc;const copy=structuredClone(bloc);if(copy.fiche_url)copy.fiche_url=lienAttribution(copy.fiche_url,token);for(const m of copy.content?.messages||[])for(const b of m.buttons||[])if(b.url)b.url=lienAttribution(b.url,token);copy.estimation_url=lienAttribution('https://shawez-immo.com/estimer/',token);return copy;}
export async function rattacherDemande(b,demande,token,now=new Date()){
 if(!tokenValide(token))return false;await baseAttribution(b);
 const a=await b.prepare('SELECT media_id FROM dm_reels_attribution WHERE token=? AND cree_le>=?').bind(token,new Date(+now-30*86400000).toISOString()).first();if(!a)return false;
 await b.prepare('INSERT OR IGNORE INTO demandes_reels_attribution VALUES(?,?,?,?)').bind(demande,token,a.media_id,now.toISOString()).run();return true;
}
