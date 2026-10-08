-- Schéma de la base D1 « espace-estimation » (créé et mis à jour automatiquement par l'API au premier appel :
-- functions/_lib/base.js). Copie pour lecture ; les colonnes ajoutées après la première mise en service sont en bas.
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
CREATE TABLE IF NOT EXISTS fichiers (
  id TEXT PRIMARY KEY,
  demande_id INTEGER NOT NULL,
  compte_id INTEGER,
  role TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  taille INTEGER NOT NULL,
  blocs INTEGER NOT NULL DEFAULT 0,
  stockage TEXT NOT NULL DEFAULT 'd1',
  depose_par TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS fichiers_demande ON fichiers(demande_id);
CREATE TABLE IF NOT EXISTS fichiers_blocs (
  fichier_id TEXT NOT NULL,
  n INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (fichier_id, n)
);
CREATE TABLE IF NOT EXISTS reglages (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);

-- Colonnes ajoutées par migration (ALTER TABLE … ADD COLUMN si elles manquent) :
--   demandes.rappel_le TEXT                 « rappeler avant le » (AAAA-MM-JJ)
--   demandes.en_attente INTEGER DEFAULT 0   rattachée à un compte dont l'e-mail n'est pas encore prouvé
--   demandes.cle TEXT (index unique)        clé d'idempotence du navigateur (double envoi)
--   demandes.suspect INTEGER DEFAULT 0      robot possible : gardée, signalée
--   demandes.resultat TEXT                  résultat complet affiché au client (JSON)
--   sessions.prouve INTEGER DEFAULT 0       session ouverte par un lien reçu par e-mail
-- comptes.mdp = '' : compte sans mot de passe (connexion par lien).

-- Système parfait (tables ajoutées à côté des premières ; version notée dans reglages « schema_sp ») :
--   étape 2 : evenements (journal de chaque dossier), visites (visite d'estimation), avis (avis de valeur)
--             demandes.raison, demandes.statut_le
--   étape 3 : comptes_rendus (visite_le, texte, publie, publie_le), offres (montant, recue_le, conditions, statut),
--             notaires (nom, coordonnees, etapes en JSON), courriers (e-mails au vendeur gardés entre 21 h et 8 h)
--             fichiers.libelle (nature d'un document déposé par l'agence : mandat, diagnostics, compromis…)
