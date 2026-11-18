import { db, json, corps, Erreur, verifierOrigine, compteSession, estAdmin, jeton, sha256, limiter, ip, telephone, texte, maintenant } from '../../_lib/base.js';
import { construireAvis } from '../../_lib/avis-prospect.js';
import { SCHEMA_AVIS_PROSPECT } from '../../_lib/avis-prospect-schema.js';
import { listePrivee } from '../../_lib/exclusions-privees.js';
import { preparerDVF } from '../../_lib/avis-dvf.js';

export const ACCORD = "J’accepte de recevoir sur WhatsApp les conseils et relances de Shawez Ali sur mon projet de vente. Je peux retirer mon accord à tout moment en répondant STOP.";
const DELAIS_CRM={moins_3_mois:'asap','3_6_mois':'6mois','6_12_mois':'plus6mois',renseignement:'nsp'};
const DELAIS_LIB={moins_3_mois:'Vendre sous 3 mois','3_6_mois':'Vendre dans 3 à 6 mois','6_12_mois':'Vendre dans 6 à 12 mois',renseignement:'Je me renseigne'};
const normal=s=>String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function exclu(env, valeurs) {
  const adresses=listePrivee(env,'REGLE9_LEAD_ADRESSES'), noms=listePrivee(env,'REGLE9_LEAD_NOMS');
  return [...adresses,...noms].some(x=>valeurs.some(v=>normal(v).includes(normal(x))));
}
async function baseAvis(env) { const b=await db(env); await b.batch(SCHEMA_AVIS_PROSPECT.split(';').map(s=>s.trim()).filter(Boolean).map(s=>b.prepare(s))); return b; }
const empreinteBien=async a=>sha256(normal([a.bien.commune,a.bien.voie,a.bien.type,a.bien.surface].join(' ')));
async function rapport(b,token) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token || '')) throw new Erreur(404,'introuvable');
  const r=await b.prepare('SELECT * FROM avis_prospects WHERE token_hash=?1 AND revoque=0 AND expire_le>?2 AND id NOT IN (SELECT avis_id FROM avis_oppositions)').bind(await sha256(token),maintenant()).first();
  if(!r) throw new Erreur(404,'introuvable'); return r;
}
export async function relayerCRM(env,b,reference) {
  // Le webhook reçoit une demande volontaire, jamais une collecte de numéro d'annonce.
  if(!env.LEAD_WEBHOOK_URL) return {etat:'webhook_non_configure'};
  const u=new URL(env.LEAD_WEBHOOK_URL); if(u.protocol!=='https:') throw new Error('webhook_https_requis');
  const rows=await b.prepare("SELECT * FROM crm_sortie WHERE etat='attente' AND (?1='' OR id=?1) ORDER BY cree_le LIMIT 20").bind(reference || '').all();
  let envoyes=0;
  for(const row of rows.results || []) {
    try {
      const r=await fetch(u.href,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':row.id},body:row.payload,signal:AbortSignal.timeout(10000)});
      await b.prepare("UPDATE crm_sortie SET essais=essais+1, etat=?2, envoye_le=?3 WHERE id=?1").bind(row.id,r.ok?'envoye':'attente',r.ok?maintenant():null).run();
      if(r.ok) envoyes++;
    } catch { await b.prepare('UPDATE crm_sortie SET essais=essais+1 WHERE id=?1').bind(row.id).run(); }
  }
  return {envoyes};
}
export async function onRequest(ctx) {
  try {
    const {request,env}=ctx, url=new URL(request.url), route=String(ctx.params.route || '').replace(/^\/+|\/+$/g,'');
    if(!['GET','POST'].includes(request.method)) return json(405,{error:'methode'});
    verifierOrigine(request);
    const admin=route==='admin' || route==='relayer' || route==='preparer';
    if(admin && !estAdmin(await compteSession(request,env),env)) throw new Erreur(403,'agence');
    const b=await baseAvis(env);
    if(route==='preparer' && request.method==='POST') {
      const d=await corps(request,8000);await limiter(env,'avis-dvf-admin:'+ip(request),20,3600);
      if(exclu(env,[d.bien?.voie,d.bien?.adresse,d.destinataire]))throw new Erreur(409,'exclusion_privee');
      return json(200,await preparerDVF(d.bien || {}));
    }
    if(route==='relayer' && request.method==='POST') return json(200,await relayerCRM(env,b,''));
    if(route==='admin') {
      if(request.method==='GET') {
        const r=await b.prepare('SELECT id,cree_le,expire_le,revoque,json_extract(contenu,\'$.bien.commune\') AS commune FROM avis_prospects ORDER BY cree_le DESC LIMIT 100').all();
        const attente=await b.prepare("SELECT count(*) AS n FROM crm_sortie WHERE etat='attente'").first();
        return json(200,{avis:r.results,crm:{webhook:!!env.LEAD_WEBHOOK_URL,attente:attente.n}});
      }
      const d=await corps(request,3000000);
      if(d.revoquer) {await b.prepare('UPDATE avis_prospects SET revoque=1 WHERE id=?1').bind(texte(d.revoquer,80)).run(); return json(200,{revoque:true});}
      if(exclu(env,[d.bien?.voie,d.bien?.adresse,d.destinataire])) throw new Erreur(409,'exclusion_privee');
      const avis=construireAvis(d), token=jeton(), id=crypto.randomUUID(), cree=maintenant(), expire=new Date(Date.now()+90*86400000).toISOString();
      if(await b.prepare('SELECT empreinte FROM avis_oppositions_biens WHERE empreinte=?1').bind(await empreinteBien(avis)).first())throw new Erreur(409,'opposition_bien');
      await b.prepare('INSERT INTO avis_prospects VALUES (?1,?2,?3,?4,?5,0)').bind(id,await sha256(token),JSON.stringify(avis),cree,expire).run();
      return json(201,{id,url:new URL('/votre-estimation/'+token+'/',url.origin).href,expire_le:expire,avis});
    }
    const token=request.method==='GET'?url.searchParams.get('token'):null;
    if(route==='' && request.method==='GET') {
      await limiter(env,'avis-lecture:'+ip(request),120,3600);
      const row=await rapport(b,token),a=JSON.parse(row.contenu);
      // L'aperçu n'expose ni coordonnées ni données nominatives.
      return json(200,{bien:a.bien,periode:a.periode,marche:a.marche,perimetre:a.perimetre,ventes:a.ventes.filter(v=>a.comparables.includes(v.id)).slice(0,3),fourchette:a.fourchette,net:a.net,accord:ACCORD});
    }
    if((route==='demander' || route==='opposition') && request.method==='POST') {
      const d=await corps(request,8000); await limiter(env,'avis-demande:'+ip(request),8,3600);
      const row=await rapport(b,d.token);
      if(route==='opposition') { await b.batch([b.prepare('INSERT OR IGNORE INTO avis_oppositions VALUES (?1,?2)').bind(row.id,maintenant()),b.prepare('INSERT OR IGNORE INTO avis_oppositions_biens VALUES (?1,?2)').bind(await empreinteBien(JSON.parse(row.contenu)),maintenant())]); return json(200,{opposition:true}); }
      if(d.website) throw new Erreur(400,'demande_invalide');
      if(d.demande_estimation!==true) throw new Erreur(400,'demande_requise');
      const a=JSON.parse(row.contenu),prenom=texte(d.prenom,80,{requis:true}),nom=texte(d.nom,80),tel=telephone(d.telephone);
      if(!['moins_3_mois','3_6_mois','6_12_mois','renseignement'].includes(d.echeance)) throw new Erreur(400,'echeance');
      if(exclu(env,[prenom+' '+nom,a.bien.voie])) throw new Erreur(409,'exclusion_privee');
      const cle=await sha256(row.id+'|'+tel.replace(/\D/g,'')), existant=await b.prepare('SELECT demande_reference FROM avis_prospects_demandes WHERE cle=?1').bind(cle).first();
      if(existant) return json(200,{reference:existant.demande_reference,avis:a});
      const reference='AV-'+crypto.randomUUID(),t=maintenant(),consent=d.whatsapp===true;
      const tags=['vendeur','secteur:'+a.bien.commune,'echeance:'+d.echeance];
      const contact={prenom,nom,email:'',telephone:tel};
      const reponses={...a.bien,formulaire:'avis-postal',delai:DELAIS_CRM[d.echeance],delai_libelle:DELAIS_LIB[d.echeance],delai_precis:d.echeance,tags,whatsapp:consent,demande_estimation:true,avis_prospect:row.id};
      const payload={schema:'lead.v1',reference,source:'avis-postal',...contact,commune:a.bien.commune,type:a.bien.type,surface:a.bien.surface,delai:DELAIS_CRM[d.echeance],echeance:d.echeance,tags,consent_notice:true,consent_whatsapp:consent,consent_whatsapp_texte:ACCORD,consent_whatsapp_le:consent?t:null,automation_allowed:consent,sequence:consent?'vendeur_entrant':null};
      // Référence déterministe par rapport+téléphone : idempotence même en cas de requêtes simultanées.
      const ref='AV-'+cle.slice(0,24); payload.reference=ref;
      await b.batch([
        b.prepare(`INSERT INTO demandes (reference,compte_id,source,type,adresse,code_postal,commune,reponses,contact,cree_le,notes,cle) VALUES (?1,NULL,'shawez',?2,?3,'',?4,?5,?6,?7,?8,?9) ON CONFLICT(cle) DO NOTHING`).bind(ref,a.bien.type,a.bien.voie,a.bien.commune,JSON.stringify(reponses),JSON.stringify(contact),t,'Demande volontaire après courrier postal. Version complète consultable ; aucun rappel à froid.',cle),
        b.prepare('INSERT OR IGNORE INTO avis_prospects_demandes VALUES (?1,?2,?3,?4)').bind(cle,row.id,ref,t),
        b.prepare('INSERT OR IGNORE INTO consentements_entrants VALUES (?1,\'whatsapp\',?2,?3,\'avis-postal-v1\',?4)').bind(ref,consent?1:0,ACCORD,t),
        ...(consent?[b.prepare('INSERT OR IGNORE INTO crm_sortie (id,payload,cree_le) VALUES (?1,?2,?3)').bind(ref,JSON.stringify(payload),t)]:[]),
      ]);
      // Sans accord WhatsApp : conservation dans D1 uniquement, aucune séquence externe déclenchée.
      if(consent) ctx.waitUntil(relayerCRM(env,b,ref).catch(()=>{}));
      return json(201,{reference:ref,avis:a});
    }
    return json(404,{error:'introuvable'});
  } catch(e) { return e instanceof Erreur?json(e.status,{error:e.code}):json(503,{error:'service_indisponible'}); }
}
