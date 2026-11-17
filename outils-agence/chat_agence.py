"""Fabrique functions/api/chat-agence.js (dépôt shawez-immo, branche main) à partir de functions/api/chat.js :
même moteur, mêmes garde-fous, mais l'assistant parle au nom de l'agence et accepte les appels venant du site de l'agence."""
import sys, re
src, dst = sys.argv[1], sys.argv[2]
c = open(src, encoding='utf-8').read()
R = [("const WHATSAPP = '07 67 57 92 28';", "const WHATSAPP = '03 45 34 35 31';"),
     ("const MENTION = \"Je suis l'assistant du site de Shawez Ali, je réponds à sa place en dehors de ses rendez-vous.\";",
      "const MENTION = \"Je suis l'assistant du site de l'agence Gravelin Immo, je réponds pour l'équipe.\";"),
     ("Tu es l'assistant du site de Shawez Ali, agent immobilier chez Gravelin Immo, 30 rue Bannelier à Dijon.\nTu parles à un visiteur du site, en son nom à lui, comme un collaborateur de l'agence le ferait.",
      "Tu es l'assistant du site de l'agence Gravelin Immo, 30 rue Bannelier à Dijon, ouverte lundi, mardi, jeudi et vendredi de 9 h 30 à 18 h.\nTu parles à un visiteur du site, au nom de l'agence, comme un collaborateur le ferait."),
     ("\"raison\":\"une ligne pour Shawez\"", "\"raison\":\"une ligne pour l'agence\""),
     ("tu proposes que Shawez réponde lui-même.", "tu proposes qu'un conseiller de l'agence réponde lui-même."),
     ("Shawez confirme lui-même après avoir regardé son agenda.", "Un conseiller confirme lui-même après avoir regardé son agenda."),
     ("Ce que tu peux proposer : l'estimation offerte et sans engagement sur shawez-immo.com/estimer/,\nle simulateur de prêt sur shawez-immo.com/simulateur-pret-immobilier-dijon/,\nles biens à vendre sur shawez-immo.com/biens-a-vendre-dijon/.\nShawez parle français, anglais, hindi, ourdou, pendjabi, persan, grec et arabe : réponds dans la langue du visiteur.",
      "Ce que tu peux proposer, sans jamais écrire d'adresse de site : l'estimation offerte et sans engagement, à la page Estimer du site ;\nles biens à vendre, à la page Acheter ; les prix au m² par commune, à la page Prix ; les films des biens, à la page Films ; un message à l'agence, à la page Contact.\nL'agence vend et met en location, mais ne fait pas de gestion locative.\nL'équipe travaille en français et en anglais, et Shawez Ali reçoit aussi en hindi, ourdou, pendjabi, persan, grec et arabe : réponds dans la langue du visiteur."),
     ("je' : 'Je'} préfère laisser Shawez vous répondre lui-même sur ce point. `", "je' : 'Je'} préfère laisser un conseiller de l'agence vous répondre lui-même sur ce point. `"),
     ("Dites-moi votre projet en deux mots et il vous rappelle. Vous pouvez aussi demander votre estimation offerte sur shawez-immo.com/estimer/.", "Dites-moi votre projet en deux mots et il vous rappelle. Vous pouvez aussi demander votre estimation offerte à la page Estimer du site."),
     ("c'est que Shawez vous réponde lui-même : demandez votre estimation offerte sur shawez-immo.com/estimer/.", "c'est qu'un conseiller vous réponde lui-même : demandez votre estimation offerte à la page Estimer du site, ou écrivez-nous depuis la page Contact."),
     ("export async function onRequestGet() {", "async function getInterne() {"),
     ("export async function onRequestPost(contexte) {", "async function postInterne(contexte) {"),
     ("  verifierOrigine(request);\n  let nomsExclus;", "  origineAgence(request);\n  let nomsExclus;")]
for a, z in R:
    assert c.count(a) == 1, a[:70]
    c = c.replace(a, z)
c = ("/* GÉNÉRÉ depuis chat.js par le générateur du site de l'agence (branche agence, outils-agence/chat_agence.py) : ne pas modifier à la main.\n"
     "   Discussion du site de l'agence GRAVELIN IMMO : même moteur et mêmes garde-fous que /api/chat, au nom de l'agence,\n"
     "   appelée depuis le site de l'agence (origines autorisées ci-dessous). */\n" + c + r'''

// ---------------------------------------------------------------- appels venant du site de l'agence
const ORIGINES_AGENCE = ['https://agence.shawez-immo.pages.dev', 'https://www.gravelin-immo.com', 'https://gravelin-immo.com'];
const origineAdmise = (request) => {
  const o = request.headers.get('Origin');
  return o && (ORIGINES_AGENCE.includes(o) || o === new URL(request.url).origin) ? o : null;
};
function origineAgence(request) {
  if (!origineAdmise(request)) throw new Erreur(403, 'origine');
}
function avecCors(request, reponse) {
  const o = origineAdmise(request);
  if (!o) return reponse;
  const r = new Response(reponse.body, reponse);
  r.headers.set('Access-Control-Allow-Origin', o);
  r.headers.set('Vary', 'Origin');
  return r;
}
export async function onRequestOptions({ request }) {
  const o = origineAdmise(request);
  if (!o) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } });
}
export async function onRequestGet(contexte) { return avecCors(contexte.request, await getInterne(contexte)); }
export async function onRequestPost(contexte) { return avecCors(contexte.request, await postInterne(contexte)); }
''')
open(dst, 'w', encoding='utf-8').write(c)
print('reste :', [l.strip()[:90] for l in c.split('\n') if re.search(r'Shawez|shawez-immo', l) and not l.strip().startswith(('//', '/*', '*', 'Règles', 'Le WhatsApp'))])
