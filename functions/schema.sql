-- Schéma de la base D1 « espace-estimation » (créé aussi automatiquement par l'API au premier appel).
CREATE TABLE IF NOT EXISTS comptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  mdp TEXT NOT NULL,
  civilite TEXT, prenom TEXT, nom TEXT, telephone TEXT,
  verifie INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  consentement_le TEXT,
  cree_le TEXT NOT NULL,
  derniere_connexion TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  compte_id INTEGER NOT NULL,
  expire INTEGER NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_compte ON sessions(compte_id);
CREATE TABLE IF NOT EXISTS demandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  compte_id INTEGER,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  adresse TEXT, code_postal TEXT, commune TEXT, lat REAL, lon REAL,
  reponses TEXT NOT NULL,
  contact TEXT NOT NULL,
  prix_bas INTEGER, prix_haut INTEGER, prix_m2 INTEGER,
  comparables INTEGER, rayon INTEGER, donnees_du TEXT,
  statut TEXT NOT NULL DEFAULT 'recue',
  notes TEXT NOT NULL DEFAULT '',
  cree_le TEXT NOT NULL,
  maj_le TEXT
);
CREATE INDEX IF NOT EXISTS demandes_compte ON demandes(compte_id);
CREATE INDEX IF NOT EXISTS demandes_date ON demandes(cree_le);
CREATE TABLE IF NOT EXISTS jetons (
  id TEXT PRIMARY KEY,
  compte_id INTEGER NOT NULL,
  usage TEXT NOT NULL,
  expire INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS limites (
  cle TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  fin INTEGER NOT NULL
);
