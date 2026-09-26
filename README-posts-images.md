# Images des posts Google (fiche de Shawez)

L'agent Twin AI publie sur la fiche Google de Shawez à partir des fichiers de posts déposés par Claude dans Google Drive. Chaque image de post existe à deux endroits, sous le même nom :

1. **Sur le site**, à une adresse publique stable : `https://shawez-immo.com/posts-images/<nom>.jpg`. Le dossier est exclu de l'indexation (`Disallow: /posts-images/` dans `robots.txt`).
2. **Dans Google Drive** : dossier « Twin — Présence en ligne » → `posts/images` (id `1AOKXhqHhqn4fmx1yMVrhOIewF_V9D6x3`).

Format : JPG carré 1200×1200, qualité 88, RVB, sans métadonnées. Recadrage centré ; pour les portraits (asset dont le nom contient « shawez » ou « equipe »), le carré est pris sur le tiers supérieur, pour garder le visage.

## Procédure pour toute nouvelle banque de posts

1. **Claude fournit la liste nom → asset** dans `de-claude/images-a-fournir.md`, une ligne par image :
   ```
   - post-chateau.jpg ← assets/chateau-facade-allee.webp
   ```
   Les assets doivent exister dans le dépôt. Ajouter « (haut) » ou « (centre) » en fin de ligne pour forcer le recadrage.
2. **On lance le script** depuis la racine du dépôt :
   ```
   python3 outils/posts_images.py
   ```
   (ou `python3 outils/posts_images.py autre-liste.md`). Le script écrit les JPG dans `posts-images/` et affiche, pour chaque image, le recadrage choisi et si la source a dû être agrandie. Il s'arrête en erreur si un asset est introuvable.
3. **On vérifie les images, puis on pousse sur `main`** : Cloudflare Pages publie. On contrôle qu'une adresse répond 200, par exemple `https://shawez-immo.com/posts-images/post-chateau.jpg`.
4. **On dépose les mêmes fichiers, mêmes noms, dans Drive `posts/images`** (connecteur Google Drive, dossier id ci-dessus), puis on vérifie qu'ils y sont listés. Si un fichier du même nom existe déjà, on le remplace au lieu d'en créer un doublon.

## Règles

- Ne jamais renommer ni supprimer une image déjà publiée : des posts peuvent pointer dessus. Pour changer une image, créer un nouveau nom.
- Uniquement des images du site (pas de banque d'images), sans tiers non consentant ni adresse ou plaque lisible.
- Préférer des sources d'au moins 1200 px de côté : une source plus petite est agrandie et perd en netteté.
