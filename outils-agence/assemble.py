"""Assemble le site de l'agence : pages, API commune (copiée de shawez-immo), API propres à l'agence, données DVF, sources."""
import os, shutil, subprocess, sys
A = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); S = '/home/claude/site'; O = os.path.join(A, 'out')
subprocess.check_call([sys.executable, os.path.join(A, 'src', 'build.py')])
for d in ('functions', 'donnees-dvf', 'outils-agence'):
    shutil.rmtree(os.path.join(O, d), ignore_errors=True)
shutil.copytree(os.path.join(S, 'functions'), os.path.join(O, 'functions'))
shutil.copytree(os.path.join(S, 'donnees-dvf'), os.path.join(O, 'donnees-dvf'))
os.makedirs(os.path.join(O, 'functions', 'outils-agence'))
shutil.copy(os.path.join(O, 'functions', 'outils', '[[path]].js'), os.path.join(O, 'functions', 'outils-agence', '[[path]].js'))
shutil.copy(os.path.join(A, 'src', 'contact.js'), os.path.join(O, 'functions', 'api', 'contact.js'))
# discussion : même moteur que shawez-immo.com, au nom de l'agence
p = os.path.join(O, 'functions', 'api', 'chat.js'); c = open(p, encoding='utf-8').read()
R = [("const WHATSAPP = '07 67 57 92 28';", "const WHATSAPP = '03 45 34 35 31';"),
     ("const MENTION = \"Je suis l'assistant du site de Shawez Ali, je réponds à sa place en dehors de ses rendez-vous.\";",
      "const MENTION = \"Je suis l'assistant du site de l'agence Gravelin Immo, je réponds pour l'équipe.\";"),
     ("Tu es l'assistant du site de Shawez Ali, agent immobilier chez Gravelin Immo, 30 rue Bannelier à Dijon.\nTu parles à un visiteur du site, en son nom à lui, comme un collaborateur de l'agence le ferait.",
      "Tu es l'assistant du site de l'agence Gravelin Immo, 30 rue Bannelier à Dijon, ouverte lundi, mardi, jeudi et vendredi de 9 h 30 à 18 h.\nTu parles à un visiteur du site, au nom de l'agence, comme un collaborateur le ferait."),
     ("\"raison\":\"une ligne pour Shawez\"", "\"raison\":\"une ligne pour l'agence\""),
     ("tu proposes que Shawez réponde lui-même.", "tu proposes qu'un conseiller de l'agence réponde lui-même."),
     ("Shawez confirme lui-même après avoir regardé son agenda.", "Un conseiller confirme lui-même après avoir regardé son agenda."),
     ("Ce que tu peux proposer : l'estimation offerte et sans engagement sur shawez-immo.com/estimer/,\nle simulateur de prêt sur shawez-immo.com/simulateur-pret-immobilier-dijon/,\nles biens à vendre sur shawez-immo.com/biens-a-vendre-dijon/.\nShawez parle français, anglais, hindi, ourdou, pendjabi, persan, grec et arabe : réponds dans la langue du visiteur.",
      "Ce que tu peux proposer, sans jamais écrire d'adresse de site : l'estimation offerte et sans engagement, à la page Estimer du site ;\nles biens à vendre, à la page Acheter ; les prix au m² par commune, à la page Prix ; un message à l'agence, à la page Contact.\nL'agence vend et met en location, mais ne fait pas de gestion locative.\nL'équipe travaille en français et en anglais, et Shawez Ali reçoit aussi en hindi, ourdou, pendjabi, persan, grec et arabe : réponds dans la langue du visiteur."),
     ("je' : 'Je'} préfère laisser Shawez vous répondre lui-même sur ce point. `", "je' : 'Je'} préfère laisser un conseiller de l'agence vous répondre lui-même sur ce point. `"),
     ("Dites-moi votre projet en deux mots et il vous rappelle. Vous pouvez aussi demander votre estimation offerte sur shawez-immo.com/estimer/.", "Dites-moi votre projet en deux mots et il vous rappelle. Vous pouvez aussi demander votre estimation offerte à la page Estimer du site."),
     ("c'est que Shawez vous réponde lui-même : demandez votre estimation offerte sur shawez-immo.com/estimer/.", "c'est qu'un conseiller vous réponde lui-même : demandez votre estimation offerte à la page Estimer du site, ou écrivez-nous depuis la page Contact.")]
for a, z in R:
    assert a in c, a[:60]
    c = c.replace(a, z)
open(p, 'w', encoding='utf-8').write(c)
import re
print('reste « Shawez » dans chat.js :', [l.strip()[:110] for l in c.split('\n') if re.search(r'Shawez|shawez-immo', l) and not l.strip().startswith(('//', '/*', '*'))][:12])
for f in os.listdir(os.path.join(A, 'src')):
    os.makedirs(os.path.join(O, 'outils-agence'), exist_ok=True); shutil.copy(os.path.join(A, 'src', f), os.path.join(O, 'outils-agence', f))
