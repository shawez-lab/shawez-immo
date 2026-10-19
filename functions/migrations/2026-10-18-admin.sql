-- Migration du 18/10/2026 — audit de l'espace agence (/admin/) et de l'espace client (/mon-espace/).
--
-- SEULEMENT DES AJOUTS : une table nouvelle et des index. Rien n'est supprimé, rien n'est modifié, aucune donnée ne bouge.
-- Relançable sans risque (IF NOT EXISTS partout).
--
-- NON APPLIQUÉE EN PRODUCTION. Le site fonctionne sans elle (le journal de l'agence dit seulement « pas encore activé »).
-- Pour l'appliquer, après relecture, depuis la racine du dépôt :
--   npx wrangler d1 execute espace-estimation --remote --file functions/migrations/2026-10-18-admin.sql
-- Vérifier ensuite : /admin/ → Réglages → « Journal de l'agence » → « Afficher le journal » (plus de message « pas encore activé »).

-- 1. Journal de l'agence : qui a exporté, supprimé, fabriqué un lien de connexion ou changé un réglage, et quand
--    (RGPD : traçabilité des accès aux données personnelles). Jamais de mot de passe ni de lien dans « detail ».
CREATE TABLE IF NOT EXISTS journal_agence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  par TEXT NOT NULL,          -- e-mail du compte de l'agence
  action TEXT NOT NULL,       -- export, demande_supprimee, compte_supprime, lien_fabrique, cle_flux, reglages, deconnexion_partout
  detail TEXT,                -- JSON court (référence du dossier, type d'export…)
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS journal_agence_date ON journal_agence(cree_le);

-- 2. Index : les lectures les plus fréquentes restent rapides quand les dossiers se comptent par milliers.
CREATE INDEX IF NOT EXISTS sessions_expire ON sessions(expire);
CREATE INDEX IF NOT EXISTS jetons_compte ON jetons(compte_id, usage);
CREATE INDEX IF NOT EXISTS jetons_expire ON jetons(expire);
CREATE INDEX IF NOT EXISTS limites_fin ON limites(fin);
CREATE INDEX IF NOT EXISTS demandes_statut ON demandes(statut);
CREATE INDEX IF NOT EXISTS fichiers_compte ON fichiers(compte_id);
CREATE INDEX IF NOT EXISTS evenements_type ON evenements(type, demande_id);
CREATE INDEX IF NOT EXISTS visites_etat ON visites(etat, debut);
CREATE INDEX IF NOT EXISTS offres_statut ON offres(statut, demande_id);
CREATE INDEX IF NOT EXISTS courriers_attente ON courriers(envoye_le);
