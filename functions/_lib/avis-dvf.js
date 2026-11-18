// Lecture des CSV officiels, uniquement côté serveur et pour une commune demandée par l'agence.
import { Erreur } from './base.js';
import { source } from './avis-prospect.js';
export function csv(brut) {
  const rows=[]; let row=[],field='',quoted=false;
  for(let i=0;i<brut.length;i++) {const c=brut[i];if(c==='"'){if(quoted && brut[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===',' && !quoted){row.push(field);field='';}else if(c==='\n' && !quoted){row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw new Erreur(502,'csv_invalide');if(field || row.length){row.push(field.replace(/\r$/,''));rows.push(row);}const headers=rows.shift();if(!headers)return [];
  return rows.map((r,i)=>Object.fromEntries([...headers.map((h,j)=>[h.replace(/^\uFEFF/,''),r[j] || '']),['_ligne',i+2]]));
}
export async function preparerDVF(bien, fetcher=fetch, date=new Date().toISOString().slice(0,10)) {
  if(!/^21\d{3}$/.test(bien.insee || ''))throw new Erreur(400,'code_insee_cote_dor_requis');
  source(bien.source);
  const year=Number(date.slice(0,4)),ventes=[],couverture=[],ids=new Set();let groupesExclus=0;
  for(const annee of [year-2,year-1,year]) {
    const url=`https://files.data.gouv.fr/geo-dvf/latest/csv/${annee}/communes/21/${bien.insee}.csv`;
    let r;try{r=await fetcher(url,{signal:AbortSignal.timeout(20000)});}catch{throw new Erreur(502,'dvf_indisponible');}
    if(r.status===404){couverture.push(annee+': fichier non publié ou absent');continue;}
    if(!r.ok)throw new Erreur(502,'dvf_indisponible');
    const brut=await r.text();if(brut.length>25000000)throw new Erreur(502,'dvf_volume');
    const rows=csv(brut);if(rows.length && !('id_mutation' in rows[0]))throw new Erreur(502,'dvf_format');
    const groups=new Map();let derniere='';
    for(const row of rows){if(row.date_mutation>derniere)derniere=row.date_mutation;const a=groups.get(row.id_mutation) || [];a.push(row);groups.set(row.id_mutation,a);}
    couverture.push(annee+': dernière mutation publiée '+(derniere || 'aucune'));
    for(const [id,g] of groups){if(g.length!==1){groupesExclus++;continue;}const v=g[0];if(v.nature_mutation!=='Vente' || v.code_commune!==bien.insee || v.type_local.toLowerCase()!==bien.type)continue;
      const prix=Number(v.valeur_fonciere),surface=Number(v.surface_reelle_bati);if(!(prix>0 && surface>0))continue;
      const key=annee+':'+id;if(ids.has(key))continue;ids.add(key);
      ventes.push({id:key,date:v.date_mutation,commune:bien.commune,voie:v.adresse_nom_voie,quartier:'',type:bien.type,surface,prix,mutation_simple:true,source:{url,ref:id+' · ligne CSV '+v._ligne,consulte_le:date}});
    }
  }
  if(!ventes.length)throw new Erreur(422,'aucune_vente_documentee');
  return {bien,arrete_au:date,source_dvf:{url:'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees',ref:'DVF géolocalisé DGFiP / data.gouv.fr',consulte_le:date},publication:couverture.join(' ; ')+`. ${groupesExclus} mutations multi-lignes exclues. Les rues sont celles de DVF ; les quartiers ne sont pas déduits.`,ventes,concurrence:[]};
}
