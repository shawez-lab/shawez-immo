export const SCHEMA_AVIS_PROSPECT = `
CREATE TABLE IF NOT EXISTS avis_prospects (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, contenu TEXT NOT NULL, cree_le TEXT NOT NULL, expire_le TEXT NOT NULL, revoque INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS avis_prospects_demandes (cle TEXT PRIMARY KEY, avis_id TEXT NOT NULL, demande_reference TEXT NOT NULL, cree_le TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS consentements_entrants (reference TEXT PRIMARY KEY, canal TEXT NOT NULL, accepte INTEGER NOT NULL, texte TEXT NOT NULL, version TEXT NOT NULL, cree_le TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS crm_sortie (id TEXT PRIMARY KEY, payload TEXT NOT NULL, etat TEXT NOT NULL DEFAULT 'attente', essais INTEGER NOT NULL DEFAULT 0, cree_le TEXT NOT NULL, envoye_le TEXT);
CREATE TABLE IF NOT EXISTS avis_oppositions (avis_id TEXT PRIMARY KEY, cree_le TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS avis_oppositions_biens (empreinte TEXT PRIMARY KEY, cree_le TEXT NOT NULL);
`;
