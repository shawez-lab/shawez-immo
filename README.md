# shawez-immo.com

Site statique publié par Cloudflare Pages à chaque poussée sur `main`.

Autres procédures : [images des posts Google](README-posts-images.md) · [registre des médias](medias-equipe.md).

## Avis Google

Source unique : **`avis.json`**, à la racine. Le script `outils/avis.py` en tire :

- l'accueil, section « Ce que les autres disent » : note moyenne, nombre d'avis, carrousel de cartes (82 % de la largeur sur mobile, 3 cartes côte à côte sur ordinateur, extrait de 220 caractères au plus) ;
- la page `/avis/` : tous les avis, texte complet ;
- le JSON-LD de l'accueil : un nœud `RealEstateAgent` « Shawez Ali — Agent immobilier » (`#fiche-google`), distinct de celui de l'agence GRAVELIN IMMO, avec `aggregateRating` et `review`. Il n'est ajouté que si `avis.json` contient au moins un avis.

### Format

```json
{
  "fiche": {
    "nom": "Shawez Ali — Agent immobilier",
    "place_id": "ChIJqQpGAKPcg6gRg_CLthoGaP8",
    "note": 5.0,
    "nombre": 24,
    "releve_le": "2026-09-27",
    "lien_avis": "https://www.google.com/maps/search/?api=1&query=…&query_place_id=…",
    "lien_depot": "https://search.google.com/local/writereview?placeid=…"
  },
  "avis": [
    {
      "auteur": "Nom tel qu'affiché sur Google",
      "note": 5,
      "date": "2026-09",
      "texte": "Texte de l'avis, copié tel quel.",
      "lien": "https://… (lien de l'avis sur Google, facultatif)"
    }
  ]
}
```

- `fiche.note` et `fiche.nombre` : la note moyenne et le nombre d'avis affichés par Google sur la fiche, recopiés à chaque mise à jour, avec la date du relevé dans `releve_le`.
- `auteur` : le nom tel que Google l'affiche. Le site n'en montre que le prénom et l'initiale (« Marie Dupont » → « Marie D. »).
- `date` : `AAAA-MM` (ou `AAAA-MM-JJ`). Google affiche souvent une date relative (« il y a 2 semaines ») : noter le mois correspondant.
- `texte` : copié tel quel, sans correction ni coupe. L'accueil coupe lui-même l'extrait ; `/avis/` affiche le texte entier.
- `lien` : facultatif ; à défaut, la carte renvoie vers la fiche.

### Ajouter un avis

1. Ouvrir la fiche Google « Shawez Ali — Agent immobilier », onglet Avis, tri « Plus récents ».
2. Ajouter l'avis dans `avis.json` (l'ordre n'a pas d'importance : le site trie du plus récent au plus ancien, sans tri par note). Mettre à jour `fiche.note`, `fiche.nombre` et `fiche.releve_le`.
3. Depuis la racine du dépôt : `python3 outils/avis.py`. Le script refuse un avis incomplet ou une date mal écrite.
4. Vérifier l'accueil et `/avis/`, puis pousser sur `main`.

### Règles

- Uniquement les avis de la fiche « Shawez Ali — Agent immobilier ». Jamais ceux de la fiche Gravelin Immo.
- Tous les avis, y compris les moins bons ; aucun texte modifié, aucun avis inventé ni sélectionné.
