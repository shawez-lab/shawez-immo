/* Configuration privée : aucune liste nominative n'est incluse dans le dépôt.
   Les variables doivent contenir un tableau JSON de chaînes non vides.
   Une configuration absente ou invalide bloque le traitement automatique.
   Ne pas remplacer une erreur par une liste vide ni journaliser les valeurs. */
export function listePrivee(env, cle, { motifs = false } = {}) {
  let valeurs;
  try { valeurs = JSON.parse(env[cle]); }
  catch { throw new Error('configuration_exclusions'); }
  if (!Array.isArray(valeurs) || valeurs.length === 0
      || valeurs.some(v => typeof v !== 'string' || v.trim().length === 0)) {
    throw new Error('configuration_exclusions');
  }
  if (motifs) {
    try { for (const valeur of valeurs) new RegExp(`\\b${valeur}\\b`); }
    catch { throw new Error('configuration_exclusions'); }
  }
  return valeurs;
}
