"""Assemble le site de l'agence : pages, API commune (copiée de shawez-immo), API propres à l'agence, données DVF, sources."""
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); A = os.path.dirname(ICI)
S = os.environ.get('SITE_DIR') or '/home/claude/site'; O = os.environ.get('AGENCE_OUT') or os.path.join(A, 'out')
SUR_PLACE = os.path.abspath(os.path.join(O, 'outils-agence')) == ICI   # lancé depuis la branche elle-même (GitHub Actions)
subprocess.check_call([sys.executable, os.path.join(ICI, 'build.py')])
for d in ('functions', 'donnees-dvf') + (() if SUR_PLACE else ('outils-agence',)):
    shutil.rmtree(os.path.join(O, d), ignore_errors=True)
shutil.copytree(os.path.join(S, 'functions'), os.path.join(O, 'functions'))
shutil.copytree(os.path.join(S, 'donnees-dvf'), os.path.join(O, 'donnees-dvf'))
os.makedirs(os.path.join(O, 'functions', 'outils-agence'))
shutil.copy(os.path.join(O, 'functions', 'outils', '[[path]].js'), os.path.join(O, 'functions', 'outils-agence', '[[path]].js'))
shutil.copy(os.path.join(ICI, 'contact.js'), os.path.join(O, 'functions', 'api', 'contact.js'))
if not SUR_PLACE:
    for f in os.listdir(ICI):
        if f == '__pycache__': continue
        os.makedirs(os.path.join(O, 'outils-agence'), exist_ok=True); shutil.copy(os.path.join(ICI, f), os.path.join(O, 'outils-agence', f))
