"""Pages de services Search, construites avec le gabarit public existant."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from search_reponses import DELAI, MANDAT


def specifications():
    contact = ('<p><a class="link" href="/estimer/">Demander mon estimation offerte</a> ou '
               '<a href="tel:+33767579228">07 67 57 92 28</a>. Vous pouvez aussi '
               '<a class="link" href="/contact/#rdv">prendre rendez-vous</a>.</p>')
    honoraires = ('<p>L’estimation est offerte et sans engagement. Les honoraires suivent le '
                  '<a class="link" href="/honoraires/">barème de l’agence GRAVELIN IMMO</a> '
                  'et ne sont dus que si la vente se réalise.</p>')
    sujets = [
      ('maison', 'Vendre sa maison à Dijon', 'Vendre votre maison <em>à Dijon.</em>',
       '<p>Le terrain, l’état, les travaux et le DPE complètent la comparaison des ventes réelles. '
       'Préparez le titre de propriété, les plans disponibles, les diagnostics et les factures des travaux. '
       'La question de l’audit énergétique doit être vérifiée avec les diagnostics de la maison.</p>',
       [('delai', 'Quel délai pour vendre une maison ?', '<p>' + DELAI + '</p><p><a class="link" href="https://www.notaires.fr/fr/immobilier-fiscalite/achat-et-vente-les-etapes/les-delais-apres-signature">Repère des Notaires de France</a>.</p>')]),
      ('appartement', 'Vendre son appartement à Dijon', 'Vendre votre appartement <em>à Dijon.</em>',
       '<p>Dans le centre-ville comme ailleurs à Dijon, l’étage, l’ascenseur, la lumière, les charges '
       'et les travaux votés influencent la comparaison. Préparez les documents de copropriété : '
       'règlement, procès-verbaux d’assemblées générales, charges et informations sur les travaux.</p>'
       '<p><a class="link" href="/conseils-vendeurs/centre-ville-dijon-distribution-copropriete-appartement/">Le guide pour présenter un appartement du centre-ville</a> '
       'et <a class="link" href="/estimation-immobiliere-dijon/centre-ville/">les ventes DVF du Centre-Ville</a>.</p>', []),
      ('immeuble', 'Vendre un immeuble à Dijon', 'Vendre votre immeuble <em>à Dijon.</em>',
       '<p>Pour un immeuble de rapport ou mixte, le dossier s’élargit : loyers, baux, occupation, '
       'charges, travaux et diagnostics. L’investisseur examine les revenus et les dépenses du bâtiment '
       'autant que son état et sa situation.</p><p>Réunissez les baux, les quittances, les charges, les '
       'plans et les factures disponibles ; nous vérifions ensemble les pièces adaptées au dossier.</p>', []),
    ]
    pages = []
    for type_, titre, h1, preparation, autres in sujets:
        path = f'/vendre-{type_}-dijon/'
        pages.append(dict(
            id='vendre-' + type_, path=path, date='2026-11-18', date_fr='18 novembre 2026',
            title=titre + ' | Shawez Ali', description=titre + ' : estimation offerte par Shawez Ali, dossier de vente, photos et film, mandat exclusif et suivi jusqu’au notaire.',
            label=titre, h1=h1, h1_plain=titre,
            lede='Je suis Shawez Ali, agent immobilier chez GRAVELIN IMMO à Dijon. Je vous accompagne à Dijon, dans la métropole et à Beaune : estimation offerte, préparation du dossier, photos, film et suivi de la vente.',
            image='/assets/shawez-ali-portrait-sourire-720.webp', image_alt='Shawez Ali, agent immobilier à Dijon', img_w=720, img_h=900,
            crumbs=[('Vendre à Dijon', '/vendre-bien-immobilier-dijon/'), (titre, path)],
            intro='Un prix argumenté commence par les ventes signées et par la visite de votre bien. Vous recevez un avis de valeur écrit.',
            service=titre, service_type='Transaction immobilière', city='Dijon',
            sections=[('preparer', 'Préparer le dossier de vente', preparation),
                      ('mandat', 'Un mandat exclusif et un suivi clair', '<p>' + MANDAT + '</p>'),
                      *autres, ('honoraires', 'Estimation et honoraires', honoraires),
                      ('rendez-vous', 'Prendre rendez-vous', contact)],
            faq=[('L’estimation est-elle offerte ?', 'Oui, elle est offerte et sans engagement, avec un avis de valeur écrit.'),
                 ('Mandat exclusif ou mandat simple ?', MANDAT)],
            links=[('Vendre une maison ou un appartement à Dijon', '/vendre-bien-immobilier-dijon/'), ('Honoraires', '/honoraires/'), ('Estimation immobilière à Dijon', '/estimation-immobiliere-dijon/')]))
    path = '/conseils-vendeurs/mandat-exclusif-ou-mandat-simple/'
    pages.append(dict(
        id='mandat-exclusif', path=path, date='2026-11-18', date_fr='18 novembre 2026', article=True,
        title='Mandat exclusif ou mandat simple : mon choix à Dijon',
        description='Shawez Ali prend uniquement des mandats exclusifs en vente à Dijon : un prix, une présentation et un suivi. Différence avec le mandat simple.',
        label='Le mandat de vente', h1='Mandat exclusif ou simple : <em>pourquoi je travaille en exclusivité.</em>',
        h1_plain='Mandat exclusif ou simple : pourquoi je travaille en exclusivité',
        lede=MANDAT, image='/assets/shawez-ali-portrait-sourire-720.webp', image_alt='Shawez Ali, agent immobilier à Dijon', img_w=720, img_h=900,
        crumbs=[('Conseils vendeurs', '/conseils-vendeurs/'), ('Mandat exclusif ou mandat simple', path)],
        intro='Un mandat simple permet de confier la vente à plusieurs agences. En exclusivité, un seul professionnel pilote la commercialisation ; avec moi, les ventes se font uniquement sous mandat exclusif.',
        sections=[('engagements', 'Mes engagements en échange de l’exclusivité', '<p>Photos, film, diffusion, visites et retours : vous avez un seul interlocuteur et un point écrit chaque semaine. Le drone sert à présenter les maisons et les propriétés lorsque cela est pertinent.</p>'),
                  ('acheteur', 'Pour l’acheteur : un prix et une présentation cohérents', '<p>Le bien garde le même prix affiché et une présentation suivie par un seul responsable. Les questions et les offres arrivent au même interlocuteur.</p>'),
                  ('duree', 'Durée et sortie : lire le mandat avant de signer', '<p>La durée, la période minimale et les modalités de résiliation doivent être lues dans le mandat remis avant signature. Je vous les explique avant tout engagement.</p>'),
                  ('honoraires', 'Le barème de l’agence', '<p>Le <a class="link" href="/honoraires/">barème publié</a> porte la mention « tous types de mandat ». Il ne distingue donc pas de taux entre mandat simple et exclusif ; je prends uniquement l’exclusivité en vente.</p>'),
                  ('rendez-vous', 'En parler ensemble', contact)],
        faq=[('Mandat exclusif ou mandat simple ?', MANDAT)],
        links=[('Vendre à Dijon', '/vendre-bien-immobilier-dijon/'), ('Choisir un agent immobilier', '/conseils-vendeurs/choisir-agent-immobilier-dijon/'), ('Honoraires', '/honoraires/')]))
    return pages


def construire(root):
    root = Path(root)
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / 'services.json'
        p.write_text(json.dumps(specifications(), ensure_ascii=False))
        subprocess.run([sys.executable, str(root / 'outils/seo/gen_pages.py'), str(root), str(p)], check=True)
    sitemap = root / 'sitemap.xml'
    s = sitemap.read_text()
    for p in specifications():
        loc = 'https://shawez-immo.com' + p['path']
        if '<loc>' + loc + '</loc>' not in s:
            s = s.replace('</urlset>', f'<url><loc>{loc}</loc><lastmod>2026-11-18</lastmod></url>\n</urlset>')
    sitemap.write_text(s)


if __name__ == '__main__':
    construire(Path(__file__).resolve().parents[2])
