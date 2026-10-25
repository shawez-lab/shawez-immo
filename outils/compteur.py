#!/usr/bin/env python3
"""Compteur « visiteurs → demandes → RDV » (ordre du Chef 10 M du 23/10, objectifs 5 % et 40 % de la mission).

Pose sur chaque page publique un petit script (id="mesure-site") qui envoie à /api/mesure-site : le chemin de la page,
« première page de l'onglet » oui/non, le site d'origine (nom de domaine seul) et utm_source. Sans cookie : la mémoire de
l'onglet (sessionStorage) dit seulement si la visite a déjà été comptée. Rien n'est envoyé pour un essai (?test dans
l'adresse) ni par un navigateur piloté (tests automatiques). Jamais sur /admin/ ni /mon-espace/.
Résultats : /admin/stats/ (compte de l'agence). Relancer ce script ne change rien à une page déjà à jour.
Appelé par outils/build.py à chaque construction.
"""
import os, subprocess

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIVEES = ('admin/', 'mon-espace/', 'outils/', 'de-claude/', 'tests', 'node_modules', 'cahier')

SCRIPT = ('<script id="mesure-site">(function(){try{if(/[?&]test\\b/i.test(location.search)||navigator.webdriver)return;'
          'var s=window.sessionStorage,n=!s.getItem("ms-v");s.setItem("ms-v","1");var r="";'
          'if(n&&document.referrer){try{var h=new URL(document.referrer).hostname;if(h!==location.hostname)r=h;}catch(e){}}'
          'var u=n?(new URLSearchParams(location.search).get("utm_source")||"").slice(0,40):"";'
          'fetch("/api/mesure-site",{method:"POST",headers:{"Content-Type":"application/json"},'
          'body:JSON.stringify({p:location.pathname,n:n?1:0,r:r,u:u}),keepalive:true,credentials:"omit"}).catch(function(){});'
          '}catch(e){}})();</script>\n')


def appliquer(s):
    """Renvoie la page avec le compteur ; inchangée si elle l'a déjà ou n'est pas une page complète."""
    if 'id="mesure-site"' in s or '</body>' not in s or 'http-equiv="refresh"' in s:
        return s
    i = s.rindex('</body>')
    return s[:i] + SCRIPT + s[i:]


def tout(fichiers):
    n = 0
    for f in fichiers:
        if f.startswith(PRIVEES):
            continue
        p = os.path.join(RACINE, f)
        s = open(p, encoding='utf-8').read()
        t = appliquer(s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    return n


if __name__ == '__main__':
    fs = subprocess.check_output(['git', 'ls-files', '*.html'], cwd=RACINE).decode().split()
    print('compteur du site :', tout(fs), 'page(s) mise(s) à jour')
