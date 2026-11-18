import reelsHorloge from '../reels/horloge.js';
// Worker Cloudflare shawez-prospects-horloge. Aucun secret ni accès à D1.
// Déclencheurs UTC filtrés en Europe/Paris : reception Apps Script, veille 08:07, avis toutes les heures.
export default {
  async scheduled(controller) {
    if (controller?.cron === '15 5,6,7 * * *') return reelsHorloge.scheduled(controller);
    const now=new Date(controller.scheduledTime),parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
    const h=+parts.hour,m=+parts.minute;
    if(controller.cron==='17 6-19 * * *'){if(h<8||h>=20)return;const a=await fetch('https://shawez-immo.com/api/avis-google/taches',{redirect:'error',signal:AbortSignal.timeout(90000)});if(!a.ok)throw Error('avis_google_indisponibles');return;}
    if(!(h===8&&m===7))return;
    const r = await fetch('https://shawez-immo.com/api/prospects?job=1', {
      signal: AbortSignal.timeout(90000), redirect: 'error',
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) throw new Error('prospects_indisponibles');
    const d = await r.json();
    if(!['ok','deja_execute'].includes(d.controle_drive?.etat))throw new Error('lecture_drive_incomplete');
    if (!['ok', 'deja_execute', 'avant_8h'].includes(d.etat)) {
      throw new Error('prospects_execution_incomplete');
    }
    console.info('prospects', d.etat);
  },
  fetch() { return new Response('Not found', { status: 404 }); },
};

