"""Passages vers l'agence GRAVELIN IMMO : même onglet, utm, écran de transition, pages sas.
Idempotent : se relance sans doubler les modifications."""
import re, subprocess, html

AG = 'https://www.gravelin-immo.com'
EST = AG + '/estimation?expand=estimation_rapide_group&utm_source=shawez-immo#estimation-formulaires'
VENTE = AG + '/vente/1?utm_source=shawez-immo'

def with_utm(u):
    u = html.unescape(u)
    u = re.sub(r'^https?://(www\.)?gravelin-immo\.com/?$', AG + '/', u)
    u = re.sub(r'^https?://gravelin-immo\.com', AG, u)
    if 'utm_source=' not in u:
        base, _, frag = u.partition('#')
        base += ('&' if '?' in base else '?') + 'utm_source=shawez-immo'
        u = base + ('#' + frag if frag else '')
    return u.replace('&', '&amp;')

def kind(u):
    if '/estimation' in u: return 'estimation'
    if '/vente' in u: return 'biens'
    return 'agence'

def fix_a(m):
    tag = m.group(0)
    href = re.search(r'href="([^"]*)"', tag).group(1)
    if not re.match(r'https?://(www\.)?gravelin-immo\.com', href):
        return tag
    if '/vente' in href:
        return tag   # biens à vendre : pages internes (outils/biens/build_biens.py remplace ces liens)
    new = with_utm(href)
    tag = tag.replace('href="%s"' % href, 'href="%s"' % new)
    tag = re.sub(r'\s+target="_blank"', '', tag)
    tag = re.sub(r'\s+rel="noopener( noreferrer)?"', '', tag)
    tag = tag.replace(' (nouvel onglet)', '')
    # plus de flèche « externe » : on reste sur le site
    tag = re.sub(r'class="([^"]*)"', lambda c: 'class="%s"' % ' '.join(x for x in c.group(1).split() if x != 'ext'), tag)
    tag = tag.replace(' class=""', '')
    if 'data-sortie=' not in tag:
        tag = tag[:-1] + ' data-sortie="%s">' % kind(new)
    return tag

CSS = """<style id="sortie-css">
#sortie{position:fixed;inset:0;z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:calc(24px + env(safe-area-inset-top,0px)) 28px calc(24px + env(safe-area-inset-bottom,0px));background:#0F0E0C;color:#F3EFE6;text-align:center;opacity:0;transition:opacity .22s ease;}
#sortie.on{opacity:1;}
#sortie img{width:64px;height:auto;animation:sortie-in .5s ease both;}
#sortie p{margin:0;max-width:22em;font-family:var(--font-text,'Schibsted Grotesk',sans-serif);font-size:16px;line-height:1.5;color:rgba(243,239,230,.88);}
#sortie p strong{display:block;margin-bottom:6px;font-family:var(--font-display,'Familjen Grotesk',sans-serif);font-weight:360;font-size:24px;line-height:1.2;color:#F3EFE6;}
@keyframes sortie-in{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:none;}}
@media(prefers-reduced-motion:reduce){#sortie,#sortie img{transition:none;animation:none;}}
</style>"""

JS = """<script id="sortie-js">
/* Passage vers l'agence : même onglet, écran de transition 600 ms ; le retour ramène ici (bfcache, défilement restauré) */
(function(){
  var TXT={estimation:["Vous passez sur l'outil d'estimation de notre agence GRAVELIN IMMO","Le bouton retour vous ramène ici."],
           biens:["Vous passez sur le catalogue de notre agence GRAVELIN IMMO","Le bouton retour vous ramène ici."],
           agence:["Vous passez sur le site de notre agence GRAVELIN IMMO","Le bouton retour vous ramène ici."]};
  var ov=null, t=null;
  function hide(){ if(t){clearTimeout(t);t=null;} if(ov&&ov.parentNode)ov.parentNode.removeChild(ov); ov=null; }
  document.addEventListener('click',function(e){
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var a=e.target.closest&&e.target.closest('a[data-sortie]'); if(!a)return;
    var k=a.getAttribute('data-sortie'), href=a.href, m=TXT[k]||TXT.agence;
    e.preventDefault(); hide();
    ov=document.createElement('div'); ov.id='sortie'; ov.setAttribute('role','status'); ov.setAttribute('aria-live','polite');
    ov.innerHTML='<img src="/assets/logo-mono-ivory.webp" alt="" width="369" height="338"><p><strong>'+m[0]+'</strong>'+m[1]+'</p>';
    document.body.appendChild(ov); requestAnimationFrame(function(){ if(ov)ov.classList.add('on'); });
    t=setTimeout(function(){ location.href=href; },600);
  });
  /* retour arrière : la page revient du bfcache, on retire l'écran */
  window.addEventListener('pageshow',function(e){ hide(); if(e.persisted){ var m=document.getElementById('menu'), x=document.getElementById('menu-close'); if(m&&x&&m.classList.contains('open'))x.click(); } });
})();
</script>"""

def patch(s):
    s = re.sub(r'<a\s[^>]*>', fix_a, s)
    if 'id="sortie-css"' not in s:
        s = s.replace('</head>', CSS + '\n</head>', 1)
    s = re.sub(r'<script id="sortie-js">.*?</script>\n?', '', s, flags=re.S)
    s = s.replace('</body>', JS + '\n</body>', 1)
    return s

# ---------- pages sas ----------
SAS = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} · Shawez Ali</title>
<meta name="robots" content="noindex, follow">
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0F0E0C">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.png" type="image/png" sizes="any">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/schibsted.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://www.gravelin-immo.com">
<style>
@font-face{{font-family:'Schibsted Grotesk';font-weight:400 700;font-display:swap;src:url(/assets/fonts/schibsted.woff2) format('woff2');}}
:root{{--bar:calc(56px + env(safe-area-inset-top,0px));}}
*{{box-sizing:border-box;}}
html,body{{margin:0;height:100%;background:#0F0E0C;color:#F3EFE6;font-family:'Schibsted Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}}
.sas-bar{{position:sticky;top:0;z-index:2;height:var(--bar);padding:env(safe-area-inset-top,0px) max(12px,env(safe-area-inset-right,0px)) 0 max(8px,env(safe-area-inset-left,0px));display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:10px;background:#0F0E0C;border-bottom:1px solid rgba(243,239,230,.1);}}
.sas-back{{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border:1px solid rgba(243,239,230,.28);border-radius:999px;background:transparent;color:#F3EFE6;font:600 14px/1 'Schibsted Grotesk',sans-serif;cursor:pointer;text-decoration:none;}}
.sas-back:focus-visible,.sas-logo:focus-visible,.sas-help a:focus-visible{{outline:2px solid #E3B341;outline-offset:2px;}}
.sas-logo{{display:inline-flex;align-items:center;min-height:44px;}}
.sas-logo img{{display:block;width:104px;height:auto;}}
.sas-note{{justify-self:end;margin:0;max-width:13.5em;text-align:right;font-size:12px;line-height:1.3;color:#A9A297;}}
.sas-note strong{{color:#F3EFE6;font-weight:600;}}
.sas-stage{{position:relative;height:calc(100svh - var(--bar));background:#F7F6F2;}}
.sas-stage iframe{{display:block;width:100%;height:100%;border:0;background:#F7F6F2;}}
.sas-load{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0F0E0C;transition:opacity .3s ease,visibility 0s linear .3s;}}
.sas-load i{{width:34px;height:34px;border-radius:50%;border:3px solid rgba(243,239,230,.22);border-top-color:#F3EFE6;animation:sas-spin .8s linear infinite;}}
.sas-ready .sas-load{{opacity:0;visibility:hidden;}}
@keyframes sas-spin{{to{{transform:rotate(360deg);}}}}
.sas-help{{margin:0;padding:18px 20px calc(22px + env(safe-area-inset-bottom,0px));font-size:14px;line-height:1.5;color:#A9A297;text-align:center;}}
.sas-help a{{color:#E3B341;}}
@media(max-width:360px){{.sas-logo img{{width:88px;}}.sas-note{{font-size:11px;}}}}
@media(prefers-reduced-motion:reduce){{.sas-load i{{animation-duration:2.4s;}}}}
</style>
</head>
<body>
<header class="sas-bar">
  <a class="sas-back" href="/" id="sas-back" aria-label="Retour à la page précédente"><span aria-hidden="true">←</span> Retour</a>
  <a class="sas-logo" href="/" aria-label="Shawez Ali, accueil"><img src="/assets/logo-horiz-ivory.webp" alt="SHAWEZ ALI" width="1259" height="176"></a>
  <p class="sas-note">Outil de notre agence <strong>GRAVELIN IMMO</strong></p>
</header>
<main>
  <h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">{title}</h1>
  <div class="sas-stage">
    <iframe src="{src}" title="{ftitle}" allow="geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe>
    <div class="sas-load" aria-hidden="true"><i></i></div>
  </div>
  <p class="sas-help">Si l'outil ne s'affiche pas, <a href="{src}">ouvrez-le ici →</a></p>
</main>
<script>
(function(){{
  var b=document.getElementById('sas-back');
  /* retour : page précédente de shawez-immo.com si on en vient, sinon l'accueil */
  var interne=false; try{{ interne=!!document.referrer&&new URL(document.referrer).origin===location.origin; }}catch(e){{}}
  b.addEventListener('click',function(e){{ if(interne&&history.length>1){{ e.preventDefault(); history.back(); }} }});
  /* chargement : l'indicateur s'efface au chargement de l'outil, 1 s au plus */
  var st=document.querySelector('.sas-stage'), f=st.querySelector('iframe'), done=function(){{ st.classList.add('sas-ready'); }};
  /* ?fiche= : fiche d'un bien de l'agence (uniquement www.gravelin-immo.com/vente/…) */
  try{{ var q=new URLSearchParams(location.search).get('fiche');
    if(q&&/^https:\/\/www\.gravelin-immo\.com\/vente\/[\w\/.-]+(\?[\w=&.-]*)?$/.test(q)){{ f.src=q; var h=document.querySelector('.sas-help a'); if(h)h.href=q; }} }}catch(e){{}}
  f.addEventListener('load',done); setTimeout(done,1000);
}})();
</script>
</body>
</html>
"""

PAGES_SAS = {
    'estimation-en-ligne/index.html': dict(title="Estimation en ligne", ftitle="Outil d'estimation de l'agence GRAVELIN IMMO",
        desc="L'outil d'estimation en ligne de l'agence GRAVELIN IMMO, présenté par Shawez Ali.", src=EST.replace('&', '&amp;')),
    # /biens-a-vendre/ n'est plus une page sas : les biens ont leurs fiches sur ce site (outils/biens/build_biens.py).
}

if __name__ == '__main__':
    import os
    files = [f for f in subprocess.check_output(['git', 'ls-files', '*.html']).decode().split()
             if not f.startswith(('de-claude/', 'cahier')) and f not in PAGES_SAS]
    for p in files:
        s = open(p, encoding='utf-8').read(); n = patch(s)
        if n != s: open(p, 'w', encoding='utf-8').write(n); print('ok', p)
    for p, d in PAGES_SAS.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8').write(SAS.format(**d)); print('sas', p)
    # en-têtes : les pages sas peuvent encadrer l'outil de l'agence (et lui déléguer la géolocalisation)
    hd = open('_headers').read()
    if '/estimation-en-ligne/*' not in hd:
        csp = re.search(r'Content-Security-Policy: (.*)', hd).group(1)
        csp2 = csp.replace("default-src 'self';", "default-src 'self'; frame-src https://www.gravelin-immo.com;")
        block = ''
        for path in ['/estimation-en-ligne/*', '/biens-a-vendre/*']:
            block += ("%s\n  ! Content-Security-Policy\n  ! Permissions-Policy\n  Content-Security-Policy: %s\n"
                      "  Permissions-Policy: camera=(), microphone=(), geolocation=(self \"https://www.gravelin-immo.com\"), interest-cohort=()\n"
                      "  X-Robots-Tag: noindex\n") % (path, csp2)
        hd = hd.rstrip('\n') + '\n' + block
        open('_headers', 'w').write(hd)
