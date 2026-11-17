import { listePrivee } from './exclusions-privees.js';
import { sha256 } from './base.js';

export const ZONE = ['Dijon','Chevigny-Saint-Sauveur','Quetigny','Saint-Apollinaire','Fontaine-lès-Dijon','Talant','Longvic','Marsannay-la-Côte','Plombières-lès-Dijon','Sennecey-lès-Dijon','Neuilly-Crimolois','Ahuy','Daix','Perrigny-lès-Dijon','Chenôve','Beaune','Bligny-lès-Beaune','Levernois','Montagny-lès-Beaune','Vignoles','Ruffey-lès-Beaune','Chorey-lès-Beaune','Savigny-lès-Beaune','Pommard','Volnay','Meursanges','Ladoix-Serrigny'];
export const normaliser = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9@.]+/g,' ').trim();
const propre = (v, n=200) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n) : '';
const jourMs = 86400000;
export function exclusions(env) {
  return { adresses: listePrivee(env,'REGLE9_LEAD_ADRESSES').map(normaliser),
    noms: listePrivee(env,'REGLE9_LEAD_NOMS',{motifs:true}).map(v => new RegExp(`\\b${String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}\\b`)) };
}
export function exclu(p, regle) {
  const champs = [p.prenom,p.nom,p.email,p.adresse,p.commune,p.quartier,p._texte_public].map(normaliser).join(' ');
  return regle.adresses.some(v=>champs.includes(v)) || regle.noms.some(v=>v.test(champs));
}
export function urlAnnonce(v) {
  const u = new URL(v);
  if (u.protocol !== 'https:' || u.username || u.password) throw Error('url_annonce');
  u.hash='';
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  return u.href;
}
function nombre(v,min,max,entier=false) {
  if (v == null || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v<min || v>max || (entier && !Number.isInteger(v))) throw Error('nombre');
  return v;
}
function date(v, now) {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v).toISOString().slice(0,10)!==v || Date.parse(v)>now.getTime()) throw Error('date');
  return v;
}
export function annonce(x, source, now = new Date()) {
  if (x.vendeur !== 'particulier') return null;
  const commune = ZONE.find(c=>normaliser(c)===normaliser(x.commune));
  if (!commune) return null;
  if (!['maison','appartement'].includes(x.type)) return null;
  const reference=propre(x.reference,160);
  if (!reference) throw Error('reference');
  const url=urlAnnonce(x.url);
  if (new URL(url).origin!==source.origine) throw Error('origine_annonce');
  return { source:source.id, reference, url, commune, quartier:propre(x.quartier,100), type:x.type,
    surface:nombre(x.surface,1,100000), pieces:nombre(x.pieces,1,1000,true), prix:nombre(x.prix,1,1000000000,true),
    parution:date(x.parution,now), prenom:propre(x.prenom,80), nom:propre(x.nom,120), adresse:propre(x.adresse),
    email:propre(x.email,160), telephone:propre(x.telephone,30), statut:x.statut==='retire'?'retire':'actif',
    _texte_public:propre(x.texte_public,16000) };
}
export function sources(env, now=new Date()) {
  const config = JSON.parse(env.PROSPECTS_SOURCES_JSON || '[]');
  if (!Array.isArray(config) || config.length>5) throw Error('configuration_sources');
  const ids=new Set();
  return config.map(s=>{
    if (!/^[a-z0-9-]{1,50}$/.test(s.id) || ids.has(s.id)) throw Error('source_id');
    ids.add(s.id);
    const flux=new URL(s.flux), origine=new URL(s.origine);
    // Pas de flux d'alertes grand public ni d'adaptateur de scraping.
    if (flux.protocol!=='https:' || origine.protocol!=='https:' || flux.username || flux.password || origine.username || origine.password) throw Error('source_url');
    if ([flux.hostname,origine.hostname].some(h=>/(^|\.)(pap\.fr|leboncoin\.fr)$/.test(h))) throw Error('source_interdite');
    if (!s.justificatif || !s.nom || s.usage!=='import_et_prospection' || !/^\d{4}-\d{2}-\d{2}$/.test(s.autorise_jusque)) throw Error('droits_source');
    return {...s,origine:origine.origin,actif:s.actif===true && Date.parse(s.autorise_jusque+'T23:59:59Z')>=now.getTime()};
  });
}
export function classement(p, now=new Date()) {
  const age = (now-Date.parse(p.prix_depuis))/jourMs;
  const frais = now-Date.parse(p.derniere_vue)<=2*jourMs;
  const baisse=!!p.derniere_baisse && now-Date.parse(p.derniere_baisse)<=7*jourMs;
  const stable = frais && age>21;
  const ecart = p.mediane && p.surface && p.prix ? (p.prix/p.surface/p.mediane-1)*100 : null;
  return { priorite:stable?0:ecart>=15?1:2, stable, baisse, ecart,
    prix_m2:p.prix&&p.surface?p.prix/p.surface:null,
    nouveau:now-Date.parse(p.premiere_vue)<=2*jourMs, a_reconfirmer:!frais };
}
export function message(p) {
  return `Bonjour${p.prenom?' '+p.prenom:''}, c’est Shawez Ali, agent immobilier à Dijon. Vous vendez votre ${p.type} à ${p.commune}. Je vous propose un point offert sur votre prix, à partir des ventes signées chez le notaire. Vous souhaitez qu’on en parle ?`;
}
const netHtml = s => s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&#8239;/g,' ').replace(/\s+/g,' ').trim();
export function medianePage(html,type) {
  // Page historique de Dijon : seule la valeur explicitement communale est retenue.
  // Le chiffre maisons porte sur un rayon autour du centre, il n'est pas interchangeable.
  if(type==='appartement') {
    const dijon=netHtml(html).match(/Sur (20\d{2}), le prix médian des appartements vendus à Dijon est d'environ ([\d\s ]+) €\/m²/);
    if(dijon)return {valeur:Number(dijon[2].replace(/\D/g,'')),ventes:null,periode:dijon[1],limite:'Médiane communale publiée, effectif non précisé'};
  }
  // Seul le tableau explicitement intitulé « Prix médian au m² » est exploité.
  for (const table of html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi)||[]) {
    const rows=table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];
    const cells=s=>(s.match(/<t[hd]\b[^>]*>[\s\S]*?<\/t[hd]>/gi)||[]).map(netHtml);
    const head=cells(rows[0]||'');
    const mi=head.findIndex(s=>/^Prix médian au m²$/i.test(s)), ni=head.findIndex(s=>s==='Ventes');
    if (mi<0 || ni<0) continue;
    const row=rows.slice(1).map(cells).find(c=>c[0]?.toLowerCase()===(type==='maison'?'maisons':'appartements'));
    if (!row) continue;
    const mediane=Number(row[mi].replace(/[^\d]/g,'')), n=Number(row[ni].replace(/[^\d]/g,''));
    const periode=netHtml(html).match(/Source\s*:\s*DVF[^)]{0,60}?(20\d{2})\s*[-–]\s*(20\d{2})/i);
    if (mediane>0 && n>=10 && periode) return {valeur:mediane,ventes:n,periode:periode[1]+'–'+periode[2],limite:'Repère communal, pas une estimation du bien'};
  }
  return null;
}
export async function mediane(ctx,p,cache) {
  const slug=normaliser(p.commune).replace(/ /g,'-');
  const chemin=`/prix-immobilier-${slug}/index.html`;
  if (!cache.has(chemin)) {
    const r=await ctx.env.ASSETS.fetch(new URL(chemin,ctx.request.url));
    cache.set(chemin,r.ok?await r.text():'');
  }
  const r=medianePage(cache.get(chemin),p.type);
  return r?{...r,source:`https://shawez-immo.com/prix-immobilier-${slug}/`}:null;
}
export async function oppositionCle(p) { return sha256(normaliser([p.source,p.reference,p.url].join(' '))); }

export async function enregistrer(base,p,now) {
  const connu=await base.prepare('SELECT id FROM prospects WHERE source=? AND (reference=? OR url=?) LIMIT 1').bind(p.source,p.reference,p.url).first();
  const id=connu?.id || await sha256(p.source+'\n'+p.reference), t=now.toISOString();
  // L'upsert et l'observation sont atomiques. Une observation ancienne ne remplace pas la dernière.
  const columns=['source','reference','url','commune','quartier','type','surface','pieces','prix','parution','prenom','nom','adresse','email','telephone','statut'];
  const values=columns.map(k=>p[k]??null);
  const up=base.prepare(`INSERT INTO prospects(id,${columns.join(',')},premiere_vue,derniere_vue,prix_depuis)
    VALUES (${Array(columns.length+4).fill('?').join(',')})
    ON CONFLICT(id) DO UPDATE SET
    ${columns.filter(k=>!['source','reference','prix','parution'].includes(k)).map(k=>`${k}=excluded.${k}`).join(',')},
    parution=COALESCE(prospects.parution,excluded.parution),
    prix_depuis=CASE WHEN prospects.prix IS NOT excluded.prix THEN excluded.derniere_vue ELSE prospects.prix_depuis END,
    derniere_baisse=CASE WHEN excluded.prix < prospects.prix THEN excluded.derniere_vue ELSE prospects.derniere_baisse END,
    baisse_euros=CASE WHEN excluded.prix < prospects.prix THEN prospects.prix-excluded.prix ELSE prospects.baisse_euros END,
    prix=excluded.prix, derniere_vue=excluded.derniere_vue
    WHERE excluded.derniere_vue>=prospects.derniere_vue`).bind(id,...values,t,t,t);
  await base.batch([up,base.prepare('INSERT OR IGNORE INTO prospects_observations(prospect_id,observe_le,prix,surface,pieces) VALUES(?,?,?,?,?)').bind(id,t,p.prix,p.surface,p.pieces)]);
  return id;
}
export async function purger(base,regle,now) {
  const rows=(await base.prepare('SELECT * FROM prospects').all()).results;
  for (const p of rows) {
    const expire=now-Date.parse(p.derniere_vue)>90*jourMs;
    if (!expire && !exclu(p,regle)) continue;
    await base.batch([base.prepare('DELETE FROM prospects_observations WHERE prospect_id=?').bind(p.id),base.prepare('DELETE FROM prospects WHERE id=?').bind(p.id)]);
  }
}

export async function quotidien(ctx,force=false,now=new Date()) {
  const regle=exclusions(ctx.env), config=sources(ctx.env,now), base=ctx.env.DB;
  if (!base) throw Error('base_absente');
  const zone=ctx.env.PROSPECTS_TIMEZONE || 'Asia/Karachi';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  if (!force && Number(parts.hour)<8) return {etat:'avant_8h'};
  const jour=`${parts.year}-${parts.month}-${parts.day}`;
  const claim=await base.prepare(`INSERT INTO prospects_executions(jour,debut,etat) VALUES(?,?,'en_cours')
    ON CONFLICT(jour) DO UPDATE SET debut=excluded.debut, etat='en_cours'
    WHERE prospects_executions.etat IN ('erreur','partiel','en_cours') AND prospects_executions.debut < ?
    RETURNING jour`).bind(jour,now.toISOString(),new Date(now-30*60000).toISOString()).first();
  if (!claim) return {etat:'deja_execute'};
  let recus=0,retenus=0,exclus=0,ok=0,erreurs=0;
  try {
    await purger(base,regle,now);
    for (const s of config) {
      await base.prepare(`INSERT INTO prospects_sources(id,nom,origine,justificatif,autorise_jusque,actif)
        VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET nom=excluded.nom,origine=excluded.origine,
        justificatif=excluded.justificatif,autorise_jusque=excluded.autorise_jusque,actif=excluded.actif`).bind(s.id,s.nom,s.origine,s.justificatif,s.autorise_jusque,s.actif?1:0).run();
      if (!s.actif) continue;
      try {
        const r=await fetch(s.flux,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
        if (!r.ok || !r.headers.get('content-type')?.includes('application/json')) throw Error('flux');
        if (Number(r.headers.get('content-length'))>1000000) throw Error('taille');
        const reader=r.body.getReader(); let size=0, chunks=[];
        while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000){await reader.cancel();throw Error('taille');}chunks.push(value);}
        const bytes=new Uint8Array(size); let pos=0; for(const c of chunks){bytes.set(c,pos);pos+=c.length;}
        const data=JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(data.annonces) || data.annonces.length>500) throw Error('format');
        // Validation complète avant la première écriture de ce lot.
        const lot=data.annonces.map(x=>annonce(x,s,now));
        for (const p of lot) {
          recus++;
          if (!p || exclu(p,regle)) {exclus++;continue;}
          if(await base.prepare('SELECT empreinte FROM prospects_oppositions WHERE empreinte=?').bind(await oppositionCle(p)).first()){exclus++;continue;}
          await enregistrer(base,p,now); retenus++;
        }
        ok++;
        await base.prepare("UPDATE prospects_sources SET dernier_succes=?,dernier_etat='ok' WHERE id=?").bind(now.toISOString(),s.id).run();
      } catch { erreurs++; await base.prepare("UPDATE prospects_sources SET dernier_etat='erreur_flux' WHERE id=?").bind(s.id).run(); }
    }
    const etat=erreurs?(ok?'partiel':'erreur'):ok?'ok':'sans_source_autorisee';
    await base.prepare('UPDATE prospects_executions SET fin=?,etat=?,recus=?,retenus=?,exclus=?,sources_ok=?,sources_erreur=? WHERE jour=?').bind(new Date().toISOString(),etat,recus,retenus,exclus,ok,erreurs,jour).run();
    return {etat};
  } catch {
    await base.prepare("UPDATE prospects_executions SET fin=?,etat='erreur' WHERE jour=?").bind(new Date().toISOString(),jour).run();
    throw Error('execution');
  }
}
