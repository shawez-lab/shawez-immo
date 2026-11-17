// Veille de nos entrants. Aucun catalogue d'annonces ni coordonnées recopiées.
export const SCHEMA_VEILLE = `
CREATE TABLE IF NOT EXISTS veille_executions(jour TEXT PRIMARY KEY,debut TEXT NOT NULL,fin TEXT,etat TEXT NOT NULL,resume TEXT);
CREATE TABLE IF NOT EXISTS veille_drive_controles(source_id TEXT PRIMARY KEY,lien TEXT NOT NULL,controle_le TEXT NOT NULL,lignes INTEGER NOT NULL,onglets TEXT NOT NULL,index_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS veille_actions(cle TEXT PRIMARY KEY,traite_le TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS courriers_postal_reference ON courriers(source_reference) WHERE canal='postal' AND source_reference IS NOT NULL;
`;
