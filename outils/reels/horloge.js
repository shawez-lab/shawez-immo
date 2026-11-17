// Cron natif Cloudflare ; aucune clé, aucune donnée commerciale dans ce Worker.
// UTC 05:15/06:15/07:15 : 07:15 à Paris selon saison, puis reprises dans la matinée.
export default {
  async scheduled(controller) {
    const now=new Date(controller.scheduledTime);
    const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(now));
    if(hour<7||hour>9)return;
    for(let pass=0;pass<4;pass++) {
      const r=await fetch('https://shawez-immo.com/api/reels/taches',{signal:AbortSignal.timeout(90000),redirect:'error',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('reels_traitement_indisponible');
      const d=await r.json();console.info('reels-import',d.etat,d.traites||0);
      if(['erreurs','source_absente'].includes(d.etat))throw new Error('reels_import_a_verifier');
      if(!d.en_attente||d.etat==='deja_en_cours')break;
    }
  },
  fetch(){return new Response('Not found',{status:404});},
};
