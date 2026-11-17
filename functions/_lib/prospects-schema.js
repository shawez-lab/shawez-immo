// Veille de nos entrants. Aucun catalogue d'annonces ni coordonnées recopiées.
export const SCHEMA_VEILLE = `
CREATE TABLE IF NOT EXISTS veille_executions(jour TEXT PRIMARY KEY,debut TEXT NOT NULL,fin TEXT,etat TEXT NOT NULL,resume TEXT);
CREATE TABLE IF NOT EXISTS veille_actions(cle TEXT PRIMARY KEY,traite_le TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS veille_postal(id TEXT PRIMARY KEY,source_reference TEXT NOT NULL UNIQUE,demande_reference TEXT,avis_id TEXT,envoye_le TEXT NOT NULL,retour TEXT,retour_le TEXT,cree_le TEXT NOT NULL);
`;
