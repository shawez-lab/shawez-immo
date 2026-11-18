import { sha256 } from './base.js';
import { mediaId } from './attribution-reels.js';

export async function reelPublie(b,id){
 if(!mediaId(id))return null;
 const r=await b.prepare('SELECT id,url,mot_cle FROM reels_registre WHERE id=?').bind(id).first();
 return r&&/^https:\/\/www\.instagram\.com\/(?:reel|p)\/[\w-]+\/$/.test(r.url||'')?r:null;
}

// Une réservation est conservée même si la réponse HTTP se perd : une reprise ne doit
// jamais demander à ManyChat d'envoyer un second DM. Aucune coordonnée n'est enregistrée.
export async function reserverReponseReel(b,contact,media,jour){
 if(!contact||typeof contact!=='string'||contact.length>80||!mediaId(media)||!/^\d{4}-\d\d-\d\d$/.test(jour))return false;
 await b.prepare('CREATE TABLE IF NOT EXISTS dm_reels_reponses(cle TEXT PRIMARY KEY,media_id TEXT NOT NULL,jour TEXT NOT NULL,cree_le TEXT NOT NULL)').run();
 const cle=await sha256(contact+'|'+media+'|'+jour);
 return !!await b.prepare('INSERT OR IGNORE INTO dm_reels_reponses VALUES(?,?,?,?) RETURNING cle').bind(cle,media,jour,new Date().toISOString()).first();
}

export function messageEntreeReel(prenom,{bien=false,estimation=false}={}){
 const p=String(prenom||'').replace(/[\r\n<>]/g,'').slice(0,40);
 return 'Bonjour'+(p?' '+p:'')+', merci pour votre commentaire.\n'+(bien?'Les infos du bien sont dans le dossier ci-dessous.\nSi vous avez aussi un bien à vendre, vous pouvez demander votre estimation ici.':estimation?'Vous souhaitez faire le point sur la valeur de votre bien ?\nLe lien pour demander votre estimation offerte est juste en dessous.':'Vous souhaitez des infos sur cette vidéo ou une estimation pour votre bien ?\nÉcrivez-moi ici ce que vous cherchez.');
}
