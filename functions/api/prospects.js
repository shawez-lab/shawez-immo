import { db, json, Erreur, compteSession, estAdmin, verifierOrigine, corps, limiter, ip, renouvellement } from '../_lib/base.js';
import { exclusions, exclu, sources, quotidien, classement, mediane, message, purger, oppositionCle, ZONE } from '../_lib/prospects.js';
import { SCHEMA_PROSPECTS } from '../_lib/prospects-schema.js';

async function schema(env) {
  const base=await db(env);
  await base.batch(SCHEMA_PROSPECTS.split(';').map(x=>x.trim()).filter(Boolean).map(x=>base.prepare(x)));
  return base;
}
export async function onRequest(ctx) {
  const {request,env}=ctx;
  try {
    const url=new URL(request.url);
    if (request.method==='GET' && url.searchParams.get('job')==='1') {
      await limiter(env,'prospects-job:'+ip(request),6,3600);
      await schema(env);
      // Ne rend aucune donnée personnelle ni configuration de source.
      return json(200,await quotidien(ctx));
    }
    const c=await compteSession(request,env);
    if(!c) return json(401,{error:'connexion'});
    if(!estAdmin(c,env)) return json(403,{error:'interdit'});
    verifierOrigine(request);
    const regle=exclusions(env), config=sources(env), base=await schema(env);
    await purger(base,regle,new Date());
    if(request.method==='POST') {
      const data=await corps(request,2000);
      if(data.action==='actualiser') return json(200,await quotidien(ctx,true));
      if(data.action!=='opposition' || typeof data.id!=='string') return json(400,{error:'action'});
      const p=await base.prepare('SELECT * FROM prospects WHERE id=?').bind(data.id).first();
      if(!p) return json(404,{error:'introuvable'});
      // Une opposition ne garde qu'une empreinte, jamais une nouvelle fiche nominative.
      await base.batch([
        base.prepare('INSERT OR IGNORE INTO prospects_oppositions(empreinte,cree_le) VALUES(?,?)').bind(await oppositionCle(p),new Date().toISOString()),
        base.prepare('DELETE FROM prospects_observations WHERE prospect_id=?').bind(p.id),
        base.prepare('DELETE FROM prospects WHERE id=?').bind(p.id)
      ]);
      return json(200,{ok:true});
    }
    if(request.method!=='GET') return json(405,{error:'methode'});
    const autorise=new Set(config.filter(s=>s.actif).map(s=>s.id));
    const lignes=(await base.prepare("SELECT * FROM prospects WHERE statut='actif' AND opposition=0 ORDER BY derniere_vue DESC LIMIT 2000").all()).results;
    const cache=new Map(), liste=[];
    for(const p of lignes) {
      if(!autorise.has(p.source)||exclu(p,regle))continue;
      const dvf=await mediane(ctx,p,cache);
      const score=classement({...p,mediane:dvf?.valeur});
      // Coordonnées conservées en D1, jamais exposées pour contourner le blocage des appels.
      const {telephone,email,adresse,nom,...publics}=p;
      liste.push({...publics,...score,dvf,message:message(p),contact_autorise:false,
        contact_raison:'Consentement préalable non établi. Aucun appel, SMS, e-mail ou message commercial autorisé depuis cette fiche.'});
    }
    liste.sort((a,b)=>a.priorite-b.priorite || Number(b.baisse)-Number(a.baisse) || (b.ecart??-Infinity)-(a.ecart??-Infinity) || b.premiere_vue.localeCompare(a.premiere_vue));
    const runs=(await base.prepare('SELECT * FROM prospects_executions ORDER BY jour DESC LIMIT 7').all()).results;
    const reponse=json(200,{prospects:liste,executions:runs,zone:ZONE,heure:'08:00',fuseau:env.PROSPECTS_TIMEZONE||'Asia/Karachi',
      sources:config.map(s=>({id:s.id,nom:s.nom,actif:s.actif,autorise_jusque:s.autorise_jusque})),
      limites:['PAP et Leboncoin non connectés. Aucune collecte depuis leurs alertes grand public.','Couronne de Beaune définie par la liste de communes affichée.','Un écart à une médiane communale ne constitue pas une estimation du bien.','Les appels restent bloqués tant que le recueil et la vérification du consentement ne sont pas raccordés.']});
    const cookies=renouvellement(request);if(cookies)for(const v of cookies)reponse.headers.append('Set-Cookie',v);
    return reponse;
  } catch(e) {
    if(e instanceof Erreur)return json(e.status,{error:e.code});
    // Aucune erreur brute : une URL de flux peut contenir un secret.
    return json(503,{error:'configuration_ou_execution',message:'Traitement bloqué. Vérifier les exclusions, les droits des sources et les liaisons D1.'});
  }
}
