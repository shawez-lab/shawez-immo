/* Fichiers de l'espace estimation : photos et documents déposés par le client, avis de valeur (PDF) déposé par l'agence.

   Stockage : R2 si le projet a une liaison nommée FICHIERS ; sinon la base D1, par blocs de 1 Mo
   (une ligne D1 ne dépasse pas 2 Mo). 10 Mo au plus par fichier. Types acceptés : JPEG, PNG, WebP, HEIC, PDF,
   vérifiés sur les premiers octets du fichier (pas seulement sur son nom). */
import { db, Erreur, maintenant } from './base.js';

export const TAILLE_MAX = 10 * 1024 * 1024;
const BLOC = 1000 * 1000;
const PLAFOND_D1 = 400 * 1024 * 1024;      // la base gratuite fait 500 Mo : on s'arrête avant
const PAR_DEMANDE = 30;

const TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf',
};

function typeReel(o) {
  const a = (i) => o[i];
  if (a(0) === 0xFF && a(1) === 0xD8 && a(2) === 0xFF) return 'image/jpeg';
  if (a(0) === 0x89 && a(1) === 0x50 && a(2) === 0x4E && a(3) === 0x47) return 'image/png';
  if (a(0) === 0x25 && a(1) === 0x50 && a(2) === 0x44 && a(3) === 0x46) return 'application/pdf';
  const ascii = (d, n) => String.fromCharCode(...o.slice(d, d + n));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (ascii(4, 4) === 'ftyp') {
    const m = ascii(8, 4);
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs'].includes(m)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(m)) return 'image/heif';
  }
  return null;
}

function nomPropre(brut, ext) {
  let n = '';
  try { n = decodeURIComponent(String(brut || '')); } catch (e) { n = String(brut || ''); }
  n = n.replace(/[\u0000-\u001F\u007F"\\/:*?<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!n) n = 'fichier';
  if (!new RegExp('\\.' + (ext === 'jpg' ? 'jpe?g' : ext) + '$', 'i').test(n)) n = n.replace(/\.[A-Za-z0-9]{1,5}$/, '') + '.' + ext;
  return n;
}

/* Enregistre le corps de la requête comme fichier d'une demande. */
export async function deposer(env, request, { demandeId, compteId, role, par, pdfSeul = false }) {
  const annonce = Number(request.headers.get('Content-Length') || 0);
  if (annonce > TAILLE_MAX) throw new Erreur(413, 'taille');
  const octets = new Uint8Array(await request.arrayBuffer());
  if (!octets.length) throw new Erreur(400, 'champs', { champ: 'fichier' });
  if (octets.length > TAILLE_MAX) throw new Erreur(413, 'taille');
  const type = typeReel(octets);
  if (!type || !TYPES[type]) throw new Erreur(415, 'type_fichier');
  if (pdfSeul && type !== 'application/pdf') throw new Erreur(415, 'pdf_attendu');

  const base = await db(env);
  const n = (await base.prepare('SELECT COUNT(*) AS n FROM fichiers WHERE demande_id = ?1').bind(demandeId).first()).n;
  if (n >= PAR_DEMANDE) throw new Erreur(409, 'trop_de_fichiers');

  const f = {
    id: crypto.randomUUID().replace(/-/g, ''), demande_id: demandeId, compte_id: compteId, role,
    nom: nomPropre(request.headers.get('X-Fichier-Nom'), TYPES[type]), type, taille: octets.length,
    blocs: 0, stockage: env.FICHIERS ? 'r2' : 'd1', depose_par: par, cree_le: maintenant(),
  };
  if (env.FICHIERS) {
    await env.FICHIERS.put(`espace/${f.id}`, octets, { httpMetadata: { contentType: type } });
  } else {
    const total = (await base.prepare("SELECT COALESCE(SUM(taille), 0) AS o FROM fichiers WHERE stockage = 'd1'").first()).o;
    if (total + octets.length > PLAFOND_D1) throw new Erreur(507, 'stockage_plein');
    try {
      for (let i = 0; i * BLOC < octets.length; i++) {
        await base.prepare('INSERT INTO fichiers_blocs (fichier_id, n, data) VALUES (?1, ?2, ?3)').bind(f.id, i, octets.slice(i * BLOC, (i + 1) * BLOC)).run();
        f.blocs = i + 1;
      }
    } catch (e) {
      await base.prepare('DELETE FROM fichiers_blocs WHERE fichier_id = ?1').bind(f.id).run();
      throw e;
    }
  }
  await base.prepare(
    `INSERT INTO fichiers (id, demande_id, compte_id, role, nom, type, taille, blocs, stockage, depose_par, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  ).bind(f.id, f.demande_id, f.compte_id, f.role, f.nom, f.type, f.taille, f.blocs, f.stockage, f.depose_par, f.cree_le).run();
  return f;
}

/* Réponse HTTP qui rend le fichier (les droits sont vérifiés par l'appelant). */
export async function lire(env, f) {
  const image = f.type.startsWith('image/') && f.type !== 'image/heic' && f.type !== 'image/heif';
  const entetes = {
    'Content-Type': f.type,
    'Content-Length': String(f.taille),
    'Content-Disposition': `${image ? 'inline' : 'attachment'}; filename="${f.nom.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  if (f.stockage === 'r2') {
    const o = env.FICHIERS && (await env.FICHIERS.get(`espace/${f.id}`));
    if (!o) throw new Erreur(404, 'introuvable');
    return new Response(o.body, { headers: entetes });
  }
  const base = await db(env);
  let i = 0;
  const flux = new ReadableStream({
    async pull(ctrl) {
      if (i >= f.blocs) { ctrl.close(); return; }
      const r = await base.prepare('SELECT data FROM fichiers_blocs WHERE fichier_id = ?1 AND n = ?2').bind(f.id, i++).first();
      if (!r) { ctrl.error(new Error('bloc manquant')); return; }
      ctrl.enqueue(r.data instanceof ArrayBuffer ? new Uint8Array(r.data) : Uint8Array.from(r.data));
    },
  });
  return new Response(flux, { headers: entetes });
}

export async function supprimerFichier(env, f) {
  const base = await db(env);
  if (f.stockage === 'r2' && env.FICHIERS) await env.FICHIERS.delete(`espace/${f.id}`);
  await base.batch([
    base.prepare('DELETE FROM fichiers_blocs WHERE fichier_id = ?1').bind(f.id),
    base.prepare('DELETE FROM fichiers WHERE id = ?1').bind(f.id),
  ]);
}

/* Fichiers d'une liste de demandes (sans leur contenu). */
export async function fichiersDe(env, ids) {
  if (!ids.length) return [];
  const base = await db(env);
  if (ids.length > 90) {
    const tous = new Set(ids);
    return (await base.prepare('SELECT * FROM fichiers ORDER BY cree_le').all()).results.filter((f) => tous.has(f.demande_id));
  }
  return (await base.prepare(`SELECT * FROM fichiers WHERE demande_id IN (${ids.map((_, i) => `?${i + 1}`).join(',')}) ORDER BY cree_le`).bind(...ids).all()).results;
}

export async function supprimerFichiersDe(env, ids) {
  for (const f of await fichiersDe(env, ids)) await supprimerFichier(env, f);
}
