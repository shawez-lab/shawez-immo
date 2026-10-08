#!/usr/bin/env node
/* Fabrique l'avis de valeur PDF hors navigateur, avec des données d'exemple, pour relire la mise en page :
     node avis-apercu.mjs [sortie.pdf] [peu]        (« peu » : le cas « moins de 5 ventes comparables »)
   Le même fichier assets/avis/avis-pdf.js tourne dans /admin/ ; ici, window, document et fetch sont simulés. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ici = dirname(fileURLToPath(import.meta.url));
const dossier = resolve(ici, '..', '..', 'assets', 'avis');
const require = createRequire(import.meta.url);
const fenetre = { PDFLib: require(join(dossier, 'pdf-lib.min.js')), fontkit: require(join(dossier, 'fontkit.umd.min.js')) };
// même « monde » que les bibliothèques (un tableau créé ailleurs ne serait pas reconnu par pdf-lib)
globalThis.window = fenetre;
globalThis.document = { currentScript: { src: 'file:///avis/avis-pdf.js' }, head: {} };
globalThis.fetch = async (u) => { const b = readFileSync(join(dossier, u.split('/').pop())); return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };
vm.runInThisContext(readFileSync(join(dossier, 'avis-pdf.js'), 'utf8'));

export const EXEMPLE = {
  site: 'shawez', reference: 'E-20261008-A1B2C3', date: '2026-10-08',
  contenu: {
    date_visite: '2026-10-09',
    notes: "Appartement traversant au 2e étage d'un immeuble des années 1960, bien tenu. Séjour lumineux orienté sud-ouest, vue dégagée sur la cour arborée. Cuisine séparée à moderniser. Deux chambres au calme, côté cour.\n\nSalle d'eau refaite en 2021. Fenêtres double vitrage partout, chauffage collectif. Parties communes propres, ravalement voté pour 2027.",
    atouts: ['Traversant et lumineux, séjour au sud-ouest', 'Balcon et cave', 'À cinq minutes à pied du tram', 'Copropriété bien entretenue, charges maîtrisées'],
    vigilance: ['Cuisine et électricité à moderniser', 'Ravalement voté pour 2027 : quote-part à prévoir', 'Pas de stationnement privatif'],
    prix_bas: 198000, prix_haut: 215000,
    strategie: [
      { titre: 'Le prix juste, dès le départ', texte: "Un prix d'affichage fondé sur les ventes réelles du secteur et sur la visite. Les trois premières semaines décident : c'est là qu'une annonce est la plus regardée." },
      { titre: 'Un film, pas une simple annonce', texte: 'Film de visite, photos professionnelles, plans et visite virtuelle, puis diffusion sur les grands portails et les réseaux : les acheteurs arrivent en ayant déjà vu le bien.' },
      { titre: 'Vous savez où en est votre vente', texte: 'Un seul interlocuteur du premier appel à la signature, un compte rendu après chaque visite, et votre espace en ligne pour suivre chaque étape.' },
    ],
  },
  donnees: {
    client: { civilite: 'Mme', prenom: 'Claire', nom: 'Martin' },
    bien: { type: 'appartement', type_libelle: 'Appartement', adresse: '30 Rue Bannelier 21000 Dijon', commune: 'Dijon', code_postal: '21000', surface: 72, pieces: 3, chambres: 2, etage: 2, etages_immeuble: 4, terrain: null, niveaux: null, epoque: '1948 – 1974', etat: 'Bon état', atouts: ['Ascenseur', 'Balcon', 'Cave'] },
    estimation: { prix_bas: 206000, prix_haut: 251000, prix_m2: 3171 },
    marche: { comparables: 40, rayon: 150, m2_median: 3110, m2_bas: 2790, m2_haut: 3420, annees: [2023, 2024, 2025], donnees_du: '2025-12-30', source: 'DVF' },
    assez_de_ventes: true,
    ventes: [
      ['2025-11', 'Rue Bannelier', 68, 3, 214000, 3147], ['2025-09', 'Rue Musette', 75, 3, 239000, 3187], ['2025-07', 'Rue de la Préfecture', 70, 3, 205000, 2929],
      ['2025-05', 'Rue Bannelier', 81, 4, 262000, 3235], ['2025-03', 'Place Grangier', 64, 2, 211500, 3305], ['2024-12', 'Rue du Château', 77, 3, 228000, 2961],
      ['2024-10', 'Rue des Godrans', 59, 2, 187000, 3169], ['2024-07', 'Rue Jean-Jacques Rousseau', 73, 3, 219000, 3000], ['2024-04', 'Rue de la Liberté', 85, 4, 281000, 3306],
      ['2024-02', 'Rue Bannelier', 66, 3, 196000, 2970], ['2023-11', 'Boulevard de Brosses', 71, 3, 232000, 3268], ['2023-06', 'Rue Musette', 78, 3, 236500, 3032],
    ].map(([mois, voie, surface, pieces, prix, prix_m2]) => ({ mois, voie, commune: 'Dijon', surface, pieces, prix, prix_m2, distance: 100 })),
    conseiller: { nom: 'Shawez Ali', role: 'Agent immobilier', tel: '07 67 57 92 28', email: 'shawez@gravelin-immo.com', agence: 'GRAVELIN IMMO', adresse: '30 rue Bannelier, 21000 Dijon', site: 'shawez-immo.com' },
  },
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = JSON.parse(JSON.stringify(EXEMPLE));
  if (process.argv[3] === 'peu') {
    Object.assign(d.donnees, { assez_de_ventes: false, ventes: d.donnees.ventes.slice(0, 3), marche: { ...d.donnees.marche, comparables: 3, rayon: 5000 } });
    Object.assign(d.donnees.bien, { type: 'maison', type_libelle: 'Maison', adresse: '8 Rue du Marché 21210 Saulieu', commune: 'Saulieu', surface: 140, pieces: 6, chambres: 4, etage: null, terrain: 850, niveaux: 2, atouts: ['Garage'] });
    d.contenu.atouts = []; d.contenu.notes = '';
  }
  const pdf = await fenetre.EEAvis.generer(d);
  const sortie = process.argv[2] || 'avis-apercu.pdf';
  writeFileSync(sortie, pdf);
  console.log(`${sortie} : ${pdf.length} octets`);
}
