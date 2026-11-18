"""Construction du site, relançable : à lancer après tout ajout ou modification de page.

    python3 outils/build.py

1. Flux RSS des Conseils : /conseils/feed.xml, refait à partir des articles de conseils-vendeurs/*/index.html
   (titre, lien, date, résumé et texte de l'article, tirés de la page elle-même et de son JSON-LD).
   Un nouvel article apparaît dans le flux dès qu'il est publié sur main (GitHub Actions : build.yml).
2. Lien vers le flux dans le <head> de toutes les pages.
3. Balise de mesure d'audience Metricool avant </body> de toutes les pages. Testée le 3 octobre 2026 :
   aucun cookie, aucun localStorage ni sessionStorage (journal : de-claude/metricool-test.md).
   Pages privées (/admin/, /mon-espace/) : AUCUNE balise (le lien de connexion ?lien= ne doit jamais partir chez Metricool).
   /estimer/ : balise chargée seulement si l'adresse n'a pas de paramètre (?adresse= = donnée personnelle).
4. Mesure des annonces ChatGPT (pixel OpenAI Ads) : <script src="/assets/oai-mesure.js" defer> avant </body> de toutes
   les pages publiques. Le script ne charge rien sans accord : bandeau montré seulement aux visiteurs venus d'une annonce
   ChatGPT (?oppref= ou utm_source=chatgpt|openai), SDK chargé seulement après « Accepter ». Jamais sur les pages
   privées (retiré ici, et le script lui-même s'arrête sur /admin/, /mon-espace/, ?adresse= et ?lien=).
"""
import datetime as dt, glob, html, json, os, re, subprocess, sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://shawez-immo.com'
FEED = 'conseils/feed.xml'
PARIS = ZoneInfo('Europe/Paris')

RSS_LINK = '<link rel="alternate" type="application/rss+xml" href="/conseils/feed.xml">'
METRICOOL = ('<script>function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");'
             'c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,'
             'b.appendChild(c)}loadScript(function(){beTracker.t({hash:"33710f67a0c16d7cbb94d1b2ba10e7a8"})});</script>')

OAI = '<script src="/assets/oai-mesure.js" defer></script>'
# 5. Assistant du site, bulle en bas a droite : /assets/chat/chat.js, branche sur /api/chat.
#    Jamais sur les pages privees (admin/, mon-espace/).
CHAT = '<script src="/assets/chat/chat.js" defer></script>'

PRIVEES = ('admin/', 'mon-espace/')
SANS_PARAM = ('estimer/',)
METRICOOL_SANS_PARAM = METRICOOL.replace('<script>', '<script>if(!location.search){', 1).replace('</script>', '}</script>', 1)

def P(*a): return os.path.join(ROOT, *a)

# ---------- flux RSS ----------

def bloc_div(s, debut):
    """Contenu de la <div> qui commence à l'indice `debut` (divs imbriquées comprises)."""
    ouvre = s.index('>', debut) + 1
    prof, i = 1, ouvre
    for m in re.finditer(r'<div\b|</div>', s[ouvre:]):
        prof += 1 if m.group(0) == '<div' else -1
        if prof == 0:
            return s[ouvre:ouvre + m.start()]
    raise ValueError('div non fermée')

def absolu(fragment):
    return re.sub(r'(\s(?:href|src))="/(?!/)', r'\1="%s/' % SITE, fragment)

def texte_article(s):
    corps = bloc_div(s, s.index('<div class="article">'))
    corps = re.sub(r'<details class="toc">.*?</details>\s*', '', corps, flags=re.S)        # sommaire
    corps = re.sub(r'<div class="btn-row".*?</div>\s*', '', corps, flags=re.S)             # boutons de fin
    corps = re.sub(r'\s(?:class|style|id|data-[a-z-]+|target|rel)="[^"]*"', '', corps)    # présentation du site
    lede = re.search(r'<p class="lede">(.*?)</p>', s, re.S)
    img = re.search(r'<div class="frame"><span class="c"></span><img[^>]*?src="([^"]+)"[^>]*?alt="([^"]*)"', s)
    tete = ('<p><img src="%s" alt="%s"></p>\n' % (img.group(1), img.group(2)) if img else '') + \
           ('<p><strong>%s</strong></p>\n' % lede.group(1).strip() if lede else '')
    return absolu(tete + corps.strip())

def articles():
    out = []
    for f in sorted(glob.glob(P('conseils-vendeurs', '*', 'index.html'))):
        s = open(f, encoding='utf-8').read()
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S).group(1))
        art = next(g for g in ld.get('@graph', [ld]) if g.get('@type') in ('Article', 'BlogPosting'))
        lien = re.search(r'<link rel="canonical" href="([^"]+)"', s).group(1)
        img = re.search(r'<div class="frame"><span class="c"></span><img[^>]*?src="(/[^"]+)"', s)
        out.append(dict(titre=art['headline'], lien=lien, resume=art['description'],
                        publie=art['datePublished'], modifie=art.get('dateModified', art['datePublished']),
                        texte=texte_article(s), image=img.group(1) if img else None))
    return sorted(out, key=lambda a: (a['publie'], a['lien']), reverse=True)

def date_rfc822(jour):
    """Date RSS (RFC 822, en anglais quelle que soit la langue du système), 8 h heure de Paris."""
    d = dt.datetime.combine(dt.date.fromisoformat(jour[:10]), dt.time(8, 0), PARIS)
    jours = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    mois = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return '%s, %02d %s %d 08:00:00 %s' % (jours[d.weekday()], d.day, mois[d.month - 1], d.year, d.strftime('%z'))

def cdata(t): return '<![CDATA[%s]]>' % t.replace(']]>', ']]]]><![CDATA[>')

def flux():
    arts = articles()
    e = lambda t: html.escape(t, quote=False)
    items = []
    for a in arts:
        enc = ''
        if a['image'] and os.path.exists(P(a['image'].lstrip('/'))):
            ext = a['image'].rsplit('.', 1)[-1].lower()
            typ = {'webp': 'image/webp', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}.get(ext, 'image/' + ext)
            enc = '\n      <enclosure url="%s%s" length="%d" type="%s"/>' % (SITE, a['image'], os.path.getsize(P(a['image'].lstrip('/'))), typ)
        items.append("""    <item>
      <title>%s</title>
      <link>%s</link>
      <guid isPermaLink="true">%s</guid>
      <pubDate>%s</pubDate>
      <dc:creator>Shawez Ali</dc:creator>
      <description>%s</description>
      <content:encoded>%s</content:encoded>%s
    </item>""" % (e(a['titre']), a['lien'], a['lien'], date_rfc822(a['publie']), e(a['resume']), cdata(a['texte']), enc))
    maj = max((a['modifie'] for a in arts), default='2026-09-21')
    return """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Conseils aux vendeurs — Shawez Ali, agent immobilier à Dijon</title>
    <link>%s/conseils-vendeurs/</link>
    <atom:link href="%s/conseils/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Les articles de Shawez Ali pour vendre au bon prix à Dijon et alentours.</description>
    <language>fr-FR</language>
    <lastBuildDate>%s</lastBuildDate>
%s
  </channel>
</rss>
""" % (SITE, SITE, date_rfc822(maj), '\n'.join(items))

# ---------- pages ----------

def pages():
    return [f for f in subprocess.check_output(['git', 'ls-files', '*.html'], cwd=ROOT).decode().split()
            if not f.startswith(('de-claude/', 'cahier', 'outils/'))]

def patch(s, f=''):
    if f.startswith(PRIVEES):
        s = s.replace(METRICOOL_SANS_PARAM + '\n', '').replace(METRICOOL + '\n', '').replace(METRICOOL_SANS_PARAM, '').replace(METRICOOL, '')
    elif f.startswith(SANS_PARAM):
        if METRICOOL_SANS_PARAM not in s:
            s = s.replace(METRICOOL, METRICOOL_SANS_PARAM)
    if RSS_LINK not in s:
        if re.search(r'<link rel="canonical"[^>]*>\n', s):
            s = re.sub(r'(<link rel="canonical"[^>]*>\n)', lambda m: m.group(1) + RSS_LINK + '\n', s, count=1)
        else:
            s = s.replace('</head>', RSS_LINK + '\n</head>', 1)
    if 'tracker.metricool.com/resources/be.js' not in s and not f.startswith(PRIVEES):
        i = s.rfind('</body>')
        if i >= 0:      # un fragment sans </body> n'est pas une page : on n'y touche pas
            s = s[:i] + (METRICOOL_SANS_PARAM if f.startswith(SANS_PARAM) else METRICOOL) + '\n' + s[i:]
    if f.startswith(PRIVEES):
        s = s.replace(OAI + '\n', '').replace(OAI, '')
    elif OAI not in s:
        i = s.rfind('</body>')
        if i >= 0:
            s = s[:i] + OAI + '\n' + s[i:]
    return patch_chat(s, f)

def patch_chat(s, f=''):
    """Bulle seule : aucune modification des mesures, du RSS, des liens ni des pages métier."""
    if f.startswith(PRIVEES):
        s = s.replace(CHAT + '\n', '').replace(CHAT, '')
    elif CHAT not in s:
        i = s.rfind('</body>')
        if i >= 0:
            s = s[:i] + CHAT + '\n' + s[i:]
    return s

if __name__ == '__main__':
    # Cloudflare Pages peut activer la bulle sans dépendre du workflow GitHub Actions.
    # Ce mode ne lance aucune des autres transformations du site.
    if sys.argv[1:] == ['--chat-only']:
        if not os.path.isfile(P('assets', 'chat', 'chat.js')):
            raise SystemExit('Assistant : fichier assets/chat/chat.js absent.')
        total = 0
        for f in pages():
            if f.startswith(('.git/', '.wrangler/', 'node_modules/')):
                continue
            s = open(P(f), encoding='utf-8').read(); n = patch_chat(s, f)
            if n != s:
                open(P(f), 'w', encoding='utf-8').write(n); total += 1
        print('Assistant :', total, 'pages mises à jour.')
        raise SystemExit(0)
    # Les pages et le sitemap DVF précèdent la reconstruction des liens et du plan du site.
    from seo.dijon_quartiers import construire as quartiers_dijon
    quartiers_dijon()
    os.makedirs(P('conseils'), exist_ok=True)
    x = flux()
    if not os.path.exists(P(FEED)) or open(P(FEED), encoding='utf-8').read() != x:
        open(P(FEED), 'w', encoding='utf-8').write(x); print('ok', FEED)
    for f in pages():
        s = open(P(f), encoding='utf-8').read(); n = patch(s, f)
        if n != s:
            open(P(f), 'w', encoding='utf-8').write(n); print('ok', f)
    # pictogramme « Mon espace » : toute nouvelle page qui a l'en-tête du site le reçoit (outils/espace.py)
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import espace
        espace.pictogramme()
    except Exception as e:
        print('pictogramme :', e)
    # SEO : liens du pied de page vers les pages piliers, plan du site (/plan-du-site/, refait depuis sitemap.xml)
    # et blocs « Pages liées » (outils/seo/nav_piliers.py, plan_du_site.py, maillage.py)
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seo'))
        import nav_piliers, plan_du_site, maillage
        import videos_en   # vidéos anglaises de Shawez sur les pages /en/ (avant le sitemap vidéo)
        print('vidéos anglaises :', videos_en.poser(), 'pages mises à jour')
        import sitemap_videos
        print('sitemap vidéos :', sitemap_videos.construire())
        print('pied de page :', nav_piliers.tout(), 'pages mises à jour')
        print('plan du site :', 'mis à jour' if plan_du_site.construire() else 'inchangé')
        maillage.COMMUNES.update(maillage.communes())
        n = 0
        for f in maillage.pages():
            p = P(f); s = open(p, encoding='utf-8').read()
            if 'noindex' in (re.search(r'<meta name="robots" content="([^"]*)"', s) or [None, ''])[1]:
                continue
            t = maillage.poser('/' + f[:-len('index.html')], s)
            if t != s:
                open(p, 'w', encoding='utf-8').write(t); n += 1
        print('pages liées :', n, 'pages mises à jour')
    except Exception as e:
        print('seo :', e)
