/* /functions/… : le code de l'API et le schéma de la base ne sont jamais servis comme des fichiers du site
   (le site est publié depuis la racine du dépôt). Même réponse que les autres fichiers internes : 404. */
import { introuvable } from '../_lib/interne.js';
export const onRequest = introuvable;
