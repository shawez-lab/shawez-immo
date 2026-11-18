#!/usr/bin/env python3
"""Courrier imprimable et QR local. pip install 'qrcode==8.2'. Aucun service QR externe."""
import argparse, html, json
from pathlib import Path
from urllib.parse import urlparse

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dossier', required=True, help='JSON privé : url, commune, destinataire_postal, source_adresse, date_source')
    p.add_argument('--sortie', required=True)
    a = p.parse_args()
    d = json.loads(Path(a.dossier).read_text())
    u = urlparse(d['url'])
    if u.scheme != 'https' or u.netloc != 'shawez-immo.com' or not u.path.startswith('/votre-estimation/'):
        p.error('Le QR doit pointer vers shawez-immo.com/votre-estimation/.')
    for champ in ['commune', 'destinataire_postal', 'source_adresse', 'date_source']:
        if not str(d.get(champ, '')).strip(): p.error(champ + ' requis avant impression')
    import qrcode
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4)
    qr.add_data(d['url']); qr.make(fit=True)
    m = qr.get_matrix(); n = len(m)
    rects = ''.join(f'<rect x="{x}" y="{y}" width="1" height="1"/>' for y,row in enumerate(m) for x,v in enumerate(row) if v)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" width="140" height="140" role="img" aria-label="Votre étude personnelle"><rect width="100%" height="100%" fill="white"/><g fill="black">{rects}</g></svg>'
    e = lambda k: html.escape(str(d[k]))
    contenu = f'''<!doctype html><html lang="fr"><meta charset="utf-8"><title>Votre étude immobilière — Shawez Ali</title>
<style>body{{font:16px/1.6 Arial;color:#19352e;max-width:680px;margin:50px auto}}h1{{font:38px Georgia}}address{{font-style:normal;white-space:pre-line;margin:70px 0 50px 300px}}.signature{{margin-top:30px}}footer{{font-size:10px;line-height:1.4;margin-top:50px;color:#555}}@page{{size:A4;margin:20mm}}</style>
<strong>SHAWEZ ALI · GRAVELIN IMMO</strong><address>{e('destinataire_postal')}</address>
<h1>Votre bien. Les ventes réelles.</h1><p>Madame, Monsieur,</p>
<p>Vous envisagez de vendre votre bien à {e('commune')} ? J’ai préparé une première lecture des ventes signées de votre secteur, avec leurs sources.</p>
<p>Scannez ce code pour consulter les premiers repères de votre bien. Vous pourrez demander l’étude complète, offerte et sans engagement.</p>
<a href="{e('url')}">{svg}</a><p style="font-size:10px;overflow-wrap:anywhere">{e('url')}</p>
<p class="signature"><strong>Shawez Ali</strong><br>Agent immobilier · GRAVELIN IMMO<br>07 67 57 92 28 · shawez@gravelin-immo.com<br>30 rue Bannelier, 21000 Dijon</p>
<footer>Vos coordonnées postales proviennent de {e('source_adresse')}, consultée le {e('date_source')}. Responsable : GRAVELIN IMMO, coordonnées ci-dessus. Finalité : vous proposer une étude immobilière, sur le fondement de l’intérêt légitime. Données conservées pour le suivi de cette proposition et conformément à la notice de confidentialité. Opposition simple et sans frais : shawez@gravelin-immo.com ou bouton d’opposition sur votre page. Droits d’accès, rectification, effacement et limitation ; réclamation possible auprès de la CNIL. Notice : https://shawez-immo.com/politique-de-confidentialite/.</footer></html>'''
    Path(a.sortie).write_text(contenu)
    print(a.sortie)

if __name__ == '__main__': main()
