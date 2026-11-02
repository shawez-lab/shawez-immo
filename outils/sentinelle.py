"""Sentinelle : est-ce que quelque chose a bougé chez l'agence ?

Lit UNIQUEMENT les pages de liste de GRAVELIN IMMO (8 requêtes, ~25 s) et compare une empreinte
à celle du dernier passage. Ne télécharge aucune fiche, aucune photo.

    python3 outils/sentinelle.py            # code 0 = rien n'a bougé, 10 = ça a bougé
    python3 outils/sentinelle.py --poser    # enregistre l'empreinte actuelle (après une synchro complète)

Pourquoi elle existe (demande de Shawez, 02/11/2026 : « dès qu'une annonce est modifiée sur le site de
l'agence, il faut que ça soit fait tout de suite sur mon site, et plus jamais ça ne doit se reproduire »).
Le 31/10, GitHub a refusé 9 passages d'affilée faute de minutes : la synchronisation complète coûte 3 à 5
minutes et on ne peut pas la lancer toutes les 20 minutes. La sentinelle coûte moins d'une minute : on la
lance souvent, et la synchronisation complète ne part que lorsqu'il y a vraiment du nouveau.

L'empreinte d'une annonce retient tout ce que la page de liste montre : prix, mentions (vendu, sous
compromis, exclusivité, nouveauté), composition, ET l'adresse de sa vignette. Les photos de l'agence sont
rangées dans un dossier dont le nom change à chaque remplacement : si les photos changent, la vignette
change, et la sentinelle le voit sans ouvrir la fiche.
"""
import hashlib, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_annonces as S

EMPREINTE = os.path.join(S.ROOT, 'de-claude', 'empreinte-agence.json')
# âge au-delà duquel on refait une synchronisation complète même si rien n'a bougé (heures) :
# une modification invisible depuis la liste (description, DPE, vidéo) finit toujours par être reprise.
MAX_HEURES = 4


def vignette(bloc):
    m = re.search(r'images/biens/(\d+/[0-9a-f]{32}/photo_[0-9a-f]+)', bloc)
    return m.group(1) if m else ''


def releve():
    """{ref: empreinte} d'après les seules pages de liste. Deux lectures, comme la synchro : l'agence
    change l'ordre de ses pages d'une requête à l'autre."""
    vues = {}
    for _ in range(S.PASSES):
        for url in S.PAGES:
            try:
                page = S.get(url).decode('utf-8', 'ignore')
            except Exception as e:
                raise SystemExit('sentinelle : lecture impossible (%s) — on passe à la synchronisation complète' % e)
            blocs = re.findall(r'<article class="property-listing-v3__item[ "].*?</article>', page, re.S)
            if not blocs:
                break
            for bloc, c in zip(blocs, S.cartes(page)):
                vues.setdefault(c['ref'], '|'.join([
                    str(c['prix']), c['compo'], c['commune'], c['cp'],
                    ','.join(sorted(c['mentions'])), vignette(bloc)]))
    return vues


def main():
    poser = '--poser' in sys.argv
    actuel = releve()
    if not actuel:
        print('sentinelle : aucune annonce lue — synchronisation complète par précaution')
        raise SystemExit(10)
    os.makedirs(os.path.dirname(EMPREINTE), exist_ok=True)
    try:
        ancien = json.load(open(EMPREINTE, encoding='utf-8'))
    except Exception:
        ancien = {}
    if poser:
        json.dump({'maj': __import__('datetime').datetime.now(S.PARIS).isoformat(timespec='seconds'),
                   'annonces': actuel}, open(EMPREINTE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
        print('sentinelle : empreinte posée, %d annonces' % len(actuel))
        return
    avant = ancien.get('annonces', {})
    changes = ([r for r in actuel if r not in avant] + [r for r in avant if r not in actuel]
               + [r for r in actuel if r in avant and actuel[r] != avant[r]])
    if changes:
        print('sentinelle : %d annonce(s) modifiée(s) chez l\'agence : %s' % (len(changes), ', '.join(sorted(changes)[:12])))
        raise SystemExit(10)
    # rien n'a bougé dans la liste : on force quand même une synchro complète si la dernière est vieille
    import datetime as dt
    try:
        vieux = dt.datetime.fromisoformat(ancien['maj'])
        heures = (dt.datetime.now(S.PARIS) - vieux).total_seconds() / 3600
    except Exception:
        heures = 999
    if heures >= MAX_HEURES:
        print('sentinelle : rien de visible, mais %.1f h depuis la dernière synchronisation complète' % heures)
        raise SystemExit(10)
    print('sentinelle : rien n\'a bougé (%d annonces, dernière synchro il y a %.1f h)' % (len(actuel), heures))


if __name__ == '__main__':
    main()
