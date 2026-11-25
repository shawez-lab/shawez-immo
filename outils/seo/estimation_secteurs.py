"""Entrée par commune sur l'accueil, depuis les pages de marché existantes."""
import html
import re
import unicodedata
from pathlib import Path

DEBUT = '<!-- estimation-secteurs -->'
FIN = '<!-- /estimation-secteurs -->'


def appliquer(s, chemin, root):
    if chemin != '/':
        return s
    source = Path(root) / 'prix-immobilier-cote-d-or/index.html'
    if not source.exists():
        return s
    communes = {'Dijon'}
    communes.update(html.unescape(n) for n in re.findall(
        r'<td><a href="/prix-immobilier-[^"]+/">([^<]+)</a></td>', source.read_text()))
    cle = lambda n: unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode().lower()
    options = ''.join('<option value="{0}">{0}</option>'.format(html.escape(n, quote=True))
                      for n in sorted(communes, key=cle))
    bloc = DEBUT + '''<section class="shell sec-m" id="estimation-secteurs" aria-labelledby="estimation-secteurs-titre" style="padding-block:clamp(32px,5vw,64px);">
<p class="label">Votre estimation, avec Shawez</p>
<h2 class="display d-l" id="estimation-secteurs-titre" style="margin:14px 0 18px;">Où se trouve <em>votre bien ?</em></h2>
<p style="max-width:58ch;">Dijon, sa métropole, le nord du département, la Côte de Nuits ou Beaune : indiquez votre commune pour demander une estimation offerte et sans engagement.</p>
<form action="/estimation-immobiliere-dijon/#formulaire" method="get" style="display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin:20px 0;">
<div class="field" style="flex:1 1 230px;max-width:420px;margin:0;"><label for="estimation-commune">La commune de votre bien</label><select id="estimation-commune" name="commune"><option value="">Choisir une commune</option>''' + options + '''</select></div>
<input type="hidden" name="origine" value="/">
<button type="submit" class="btn btn-primary">Demander mon estimation <span aria-hidden="true">→</span></button>
</form>
<p style="font-size:.92rem;max-width:64ch;">Votre commune n'est pas dans la liste ? Vous pouvez la préciser dans le formulaire. Pour les secteurs plus éloignés, nous convenons ensemble des modalités d'accompagnement.</p>
<p><a class="link" href="/prix-immobilier-cote-d-or/">Consulter les prix et les ventes par commune</a> · <a class="link" href="/secteurs-dijon-nuits-saint-georges-beaune/">Voir mes secteurs d'intervention</a></p>
</section>''' + FIN
    if DEBUT in s:
        return re.sub(re.escape(DEBUT) + r'.*?' + re.escape(FIN), lambda _: bloc, s, flags=re.S)
    repere = '<!-- dijon-quartiers-accueil -->'
    return s.replace(repere, bloc + '\n' + repere, 1) if repere in s else s
