import reelsHorloge from '../reels/horloge.js';
// Worker Cloudflare shawez-prospects-horloge. Aucun secret ni accès à D1.
// Cron UTC : 7 3 * * * = 08:07 dans le fuseau actuel du compte, Asia/Karachi.
export default {
  async scheduled(controller) {
    if (controller?.cron === '15 5,6,7 * * *') return reelsHorloge.scheduled(controller);
    const r = await fetch('https://shawez-immo.com/api/prospects?job=1', {
      signal: AbortSignal.timeout(90000), redirect: 'error',
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) throw new Error('prospects_indisponibles');
    const d = await r.json();
    if (!['ok', 'deja_execute', 'sans_source_autorisee'].includes(d.etat)) {
      throw new Error('prospects_execution_incomplete');
    }
    console.info('prospects', d.etat);
  },
  fetch() { return new Response('Not found', { status: 404 }); },
};
