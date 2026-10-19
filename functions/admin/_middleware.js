/* /admin/ et /admin/promesses/ : en-têtes de sécurité des pages privées (voir functions/_lib/pages-privees.js). */
import { servirPagePrivee } from '../_lib/pages-privees.js';
export const onRequest = servirPagePrivee;
