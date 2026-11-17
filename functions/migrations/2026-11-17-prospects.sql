CREATE TABLE IF NOT EXISTS prospects_sources (
 id TEXT PRIMARY KEY, nom TEXT NOT NULL, origine TEXT NOT NULL,
 justificatif TEXT NOT NULL, autorise_jusque TEXT NOT NULL,
 actif INTEGER NOT NULL DEFAULT 0, dernier_succes TEXT, dernier_etat TEXT NOT NULL DEFAULT 'non_configure'
);
CREATE TABLE IF NOT EXISTS prospects (
 id TEXT PRIMARY KEY, source TEXT NOT NULL, reference TEXT NOT NULL,
 url TEXT NOT NULL, commune TEXT NOT NULL, quartier TEXT, type TEXT NOT NULL,
 surface REAL, pieces INTEGER, prix INTEGER, parution TEXT,
 prenom TEXT, nom TEXT, adresse TEXT, email TEXT, telephone TEXT,
 premiere_vue TEXT NOT NULL, derniere_vue TEXT NOT NULL,
 prix_depuis TEXT NOT NULL, derniere_baisse TEXT, baisse_euros INTEGER,
 statut TEXT NOT NULL DEFAULT 'actif', opposition INTEGER NOT NULL DEFAULT 0,
 UNIQUE(source, reference)
);
CREATE INDEX IF NOT EXISTS prospects_date ON prospects(derniere_vue);
CREATE TABLE IF NOT EXISTS prospects_observations (
 prospect_id TEXT NOT NULL, observe_le TEXT NOT NULL, prix INTEGER, surface REAL, pieces INTEGER,
 PRIMARY KEY(prospect_id, observe_le),
 FOREIGN KEY(prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS prospects_executions (
 jour TEXT PRIMARY KEY, debut TEXT NOT NULL, fin TEXT, etat TEXT NOT NULL,
 recus INTEGER NOT NULL DEFAULT 0, retenus INTEGER NOT NULL DEFAULT 0, exclus INTEGER NOT NULL DEFAULT 0,
 sources_ok INTEGER NOT NULL DEFAULT 0, sources_erreur INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS prospects_oppositions (
 empreinte TEXT PRIMARY KEY, cree_le TEXT NOT NULL
);
