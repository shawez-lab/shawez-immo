// Avis documenté : aucun coefficient forfaitaire ni décote DPE automatique.
import { Erreur } from './base.js';
export const DVF = 'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees';
export function source(s) {
  if (!s || typeof s.url !== 'string' || !s.ref || !/^\d{4}-\d{2}-\d{2}$/.test(s.consulte_le || '')) throw new Erreur(400, 'source_absente');
  let u; try { u = new URL(s.url); } catch { throw new Erreur(400, 'source_invalide'); }
  if (u.protocol !== 'https:' || u.username || u.password) throw new Erreur(400, 'source_invalide');
  return { url: u.href, ref: String(s.ref).slice(0, 300), consulte_le: s.consulte_le };
}
function positif(n) { if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) throw new Erreur(400, 'nombre_invalide'); return n; }
function date(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '') || new Date(s).toISOString().slice(0,10) !== s) throw new Erreur(400, 'date_invalide'); return s; }
export function quantile(a, p) { if (!a.length) return null; const b = [...a].sort((x,y)=>x-y), i=(b.length-1)*p, j=Math.floor(i); return b[j]+(b[Math.ceil(i)]-b[j])*(i-j); }
const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const cut = (s,n=200) => String(s || '').trim().slice(0,n);
export function construireAvis(d, today = new Date().toISOString().slice(0,10)) {
  if (!d || !d.bien || !Array.isArray(d.ventes) || d.ventes.length > 20000) throw new Erreur(400,'avis_invalide');
  const b=d.bien;
  const bien={commune:cut(b.commune), voie:cut(b.voie), quartier:cut(b.quartier), type:b.type, surface:positif(b.surface), source:source(b.source)};
  if (!bien.commune || !['appartement','maison'].includes(bien.type)) throw new Erreur(400,'bien_invalide');
  const fin=date(d.arrete_au || today); if(fin>today) throw new Erreur(400,'date_future');
  const debutDate=new Date(fin+'T00:00:00Z'); debutDate.setUTCMonth(debutDate.getUTCMonth()-24); const debut=debutDate.toISOString().slice(0,10);
  const milieuDate=new Date(fin+'T00:00:00Z'); milieuDate.setUTCMonth(milieuDate.getUTCMonth()-12); const milieu=milieuDate.toISOString().slice(0,10);
  const ids=new Set(); const ventes=[];
  for(const v of d.ventes) {
    const id=cut(v.id); if(!id || ids.has(id)) throw new Erreur(400,'mutation_dupliquee'); ids.add(id);
    const jour=date(v.date); if(jour<debut || jour>fin || normal(v.commune)!==normal(bien.commune) || v.type!==bien.type) continue;
    if(v.mutation_simple!==true) continue; // Les ventes groupées ne fournissent pas un prix de logement isolé.
    ventes.push({id,date:jour,commune:cut(v.commune),voie:cut(v.voie),quartier:cut(v.quartier),type:v.type,surface:positif(v.surface),prix:positif(v.prix),source:source(v.source)});
  }
  const similaires=ventes.filter(v=>v.surface>=bien.surface*.75 && v.surface<=bien.surface*1.25);
  const rue=similaires.filter(v=>bien.voie && normal(v.voie)===normal(bien.voie));
  const quartier=similaires.filter(v=>bien.quartier && normal(v.quartier)===normal(bien.quartier));
  // Le périmètre élargi est explicitement affiché. Jamais de quartier déduit d'une rue.
  const comp=rue.length>=5?rue:quartier.length>=5?quartier:similaires;
  const perimetre=rue.length>=5?'rue':quartier.length>=5?'quartier':'commune';
  const pm=v=>v.prix/v.surface, median=a=>quantile(a.map(pm),.5);
  const anciens=ventes.filter(v=>v.date<milieu), recents=ventes.filter(v=>v.date>=milieu);
  const concurrence=(d.concurrence || []).slice(0,30).map(v=>{
    const premiere=date(v.premiere_observation), derniere=date(v.derniere_observation);
    if(derniere<premiere || derniere>today) throw new Erreur(400,'observations_invalides');
    const publication=v.publication?date(v.publication):null;
    if(publication && publication>premiere) throw new Erreur(400,'publication_invalide');
    return {titre:cut(v.titre),prix:positif(v.prix),surface:positif(v.surface),source:source(v.source),premiere_observation:premiere,derniere_observation:derniere,publication,source_publication:publication?source(v.source_publication):null,duree_observee:Math.floor((Date.parse(derniere)-Date.parse(publication || premiere))/86400000),statut:'En ligne lors de la dernière observation'};
  });
  const fourchette=comp.length>=5?{bas:Math.round(quantile(comp.map(pm),.25)*bien.surface),haut:Math.round(quantile(comp.map(pm),.75)*bien.surface),methode:'Intervalle interquartile des prix au m² des comparables × surface. Repère statistique, à confirmer après visite.',references:comp.map(v=>v.id)}:null;
  let honoraires=null,net=null;
  if(d.honoraires) {
    const h=d.honoraires; if(!['vendeur','acquereur'].includes(h.charge) || !['fixe','taux_prix_hai'].includes(h.mode) || typeof h.valeur!=='number' || !Number.isFinite(h.valeur) || h.valeur<0 || (h.mode==='taux_prix_hai' && h.valeur>=1)) throw new Erreur(400,'honoraires_invalides');
    honoraires={charge:h.charge,mode:h.mode,valeur:h.valeur,prix_reference_hai_confirme:h.prix_reference_hai_confirme===true,source:source(h.source)};
    if(fourchette && honoraires.prix_reference_hai_confirme) {const f=p=>h.mode==='fixe'?h.valeur:p*h.valeur; if(f(fourchette.bas)>=fourchette.bas) throw new Erreur(400,'honoraires_invalides'); net={bas:Math.round(fourchette.bas-f(fourchette.bas)),haut:Math.round(fourchette.haut-f(fourchette.haut)),definition:'Hypothèse HAI confirmée par l’agent dans la source des honoraires, diminuée des honoraires TTC. Hors remboursement du prêt, fiscalité et autres frais personnels.'};}
  }
  const energie=d.energie?{etiquette:cut(d.energie.etiquette,1),source:source(d.energie.source),impact:d.energie.impact?{bas:positif(d.energie.impact.bas),haut:positif(d.energie.impact.haut),source:source(d.energie.impact.source),portee:cut(d.energie.impact.portee,500)}:null}:null;
  if(energie && (!/^[A-G]$/.test(energie.etiquette) || (energie.impact && (energie.impact.haut<energie.impact.bas || !energie.impact.portee)))) throw new Erreur(400,'energie_invalide');
  return {version:1,bien,periode:{debut,fin,publication:cut(d.publication || 'Couverture non certifiée'),source:source(d.source_dvf)},ventes,comparables:comp.map(v=>v.id),rue:rue.map(v=>v.id),quartier:quartier.map(v=>v.id),perimetre,marche:{n:ventes.length,median_m2:median(ventes),avant_n:anciens.length,apres_n:recents.length,evolution_pct:anciens.length>=5 && recents.length>=5?(median(recents)/median(anciens)-1)*100:null},fourchette,honoraires,net,concurrence,energie,cree_le:today};
}
