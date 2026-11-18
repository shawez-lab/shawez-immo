"""Finitions relançables des pages manuelles, appelées par les constructeurs."""
import html
import re
from pathlib import Path

CYLEX = 'https://www.cylex-locale.fr/entreprises/shawez-ali-%E2%80%94-agent-immobilier-34684176.html'
# Profil Cylex vérifié le 18/11/2026 : même nom, téléphone et site. Aucun autre
# annuaire n’est ajouté sans adresse de profil publiée et vérifiée.
PRESTIGE = 'Château et propriété de prestige en Côte-d’Or : vendre ou acheter | Shawez Ali'
HONORAIRES = ('Pour une vente, le barème publié va de 5,5 % à 7 % TTC selon la tranche, avec un forfait de '
              '4 500 € sous 70 000 € et un forfait de 3 500 € pour un garage ou une cave. Les honoraires de vente '
              'ne sont dus que si la vente se réalise ; consultez le barème complet pour votre bien.')


def appliquer(s, chemin):
    if chemin == '/honoraires/':
        s = re.sub(r'(<h1\b[^>]*>).*?(</h1>)', lambda m: m[1] + 'Honoraires de vente et de location à Dijon : le barème de l’agence GRAVELIN IMMO' + m[2], s, count=1, flags=re.S)
    if chemin == '/contact/':
        s = s.replace('<span>Horaires</span>', '<span>Mes horaires</span>')
    if chemin == '/agent-immobilier-dijon/':
        s = s.replace('Vous pouvez y passer du lundi au vendredi, de 9 h à 19 h, ou appeler', 'Vous pouvez prendre rendez-vous avec moi ou appeler')
    if chemin == '/chateau-a-vendre-bourgogne/':
        s = re.sub(r'<title>.*?</title>', lambda _: '<title>' + html.escape(PRESTIGE) + '</title>', s, count=1, flags=re.S)
        for attr in ('property="og:title"', 'name="twitter:title"'):
            s = re.sub(r'(<meta ' + attr + r' content=")[^"]*(")', lambda m: m[1] + html.escape(PRESTIGE, quote=True) + m[2], s)
        bloc = ('<!-- search-prestige-cta --><div class="btn-row"><a class="btn btn-primary" href="/estimer/">Faire estimer ma propriété, offert</a>'
                '<a class="btn" href="tel:+33767579228">07 67 57 92 28</a></div><!-- /search-prestige-cta -->')
        if '<!-- search-prestige-cta -->' not in s:
            s = re.sub(r'(<p class="lede"[^>]*>.*?</p>)', lambda m: m[1] + bloc, s, count=1, flags=re.S)
    if chemin == '/' and 'id="hero-video"' in s:
        # Aucune fiche /biens/ n’est concernée : seul le lecteur héro de l’accueil.
        s = re.sub(r'<video id="hero-video"[^>]*>', lambda m: re.sub(r'\sautoplay\b', '', m[0]).replace('preload="auto"', 'preload="none"'), s, count=1)
        source = (Path(__file__).parent / 'hero_pick.js').read_text().strip()
        motif = r'(?:/\* Source du héros d’accueil.*?\*/\n)?(?:var heroPainted=false, heroPending=false;\n)?function heroPick\(\).*?(?=\nheroPick\(\);)'
        s, n = re.subn(motif, lambda _: source, s, count=1, flags=re.S)
        if n != 1:
            raise ValueError('Initialisation du héros introuvable : aucune modification silencieuse')
        s = s.replace("if(current==='/'){ if(heroV)ensurePlay(heroV);", "if(current==='/'){ if(heroV&&heroV.getAttribute('data-kind'))ensurePlay(heroV);")
    if chemin == '/podcast/':
        s = s.replace("L'IA va-t-elle remplacer l'agent immobilier ? Julien Brizet répond cash", 'L’évolution du métier d’agent immobilier — échange avec Julien Brizet')
    if chemin == '/politique-de-confidentialite/':
        s = s.replace("un outil de mesure d'audience, de publicité ou d'intelligence artificielle", "un outil de mesure d'audience ou de publicité")
    return s
