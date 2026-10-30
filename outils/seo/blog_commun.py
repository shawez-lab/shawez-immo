#!/usr/bin/env python3
"""Outils communs du blog international (28/10/2026).

Demande de Shawez : au moins 50 articles sur shawez-immo.com pour attirer la clientèle internationale, très
personnalisés. Une page = une vraie question d'acheteur ou de vendeur étranger, jamais des pages en série.
Les articles sont dans blog_marche.py, blog_achat.py, blog_fiscal.py, blog_vivre.py et blog_fr.py ;
blog_international_spec.py les assemble, blog_hubs.py construit /en/guides/ et les cartes de /conseils-vendeurs/.

Règles d'écriture (rappel) :
- chiffres seulement avec leur source et leur date, citées dans la page ; aucun prix inventé ;
- règles fiscales et juridiques générales : le notaire ou le conseiller fiscal les confirme pour chaque cas ;
- « complimentary » en anglais, « offerte » en français ; jamais « the best », « number one », « free »,
  « guarantee », « meilleur », « n°1 », « gratuite », « garantie » ; jamais de comparaison avec un confrère ;
- jamais l'IA ; aucun nom ni adresse de client ; aucun chiffre d'activité de Shawez.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from international_spec import L, X, LANGUES, LANGUES_EN, CTA_EN  # noqa: E402,F401

DATE = "2026-10-28"
DATE_EN = "28 October 2026"
DATE_FR = "28 octobre 2026"

# Langues de Shawez, dites simplement (même contenu que LANGUES_EN, en français).
LANGUES_FR = ("Je travaille tous les jours en français et en anglais. Je parle aussi couramment le hindi, l'ourdou et "
              "le pendjabi, très bien le persan, et bien le grec et l'arabe.")

CTA_FR = ('<div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="/estimer/">'
          'Estimer mon bien <span class="arw">→</span></a><a class="btn" href="https://wa.me/33767579228">'
          'M\'écrire sur WhatsApp</a></div>')

# Thèmes des cartes de /en/guides/, dans l'ordre d'affichage.
THEMES_EN = [
    ("market", "The market and the figures"),
    ("buying", "Buying, step by step"),
    ("money", "Money, tax and the law"),
    ("living", "Living in Dijon and Burgundy"),
    ("homes", "Homes, estates and businesses"),
    ("selling", "Selling from abroad"),
    ("you", "Wherever you come from"),
]

P = []
CHEMINS = set()


def _commun(kw):
    assert kw['path'] not in CHEMINS, kw['path']
    CHEMINS.add(kw['path'])
    for champ in ('id', 'path', 'title', 'description', 'label', 'h1', 'h1_plain', 'lede', 'image', 'image_alt',
                  'intro', 'sections', 'faq', 'links', 'crumb', 'card', 'card_desc', 'meta'):
        assert champ in kw, (kw.get('path'), champ)
    kw.setdefault('img_w', 720)
    kw.setdefault('img_h', 900)
    kw['article'] = True
    return kw


def en(**kw):
    """Article en anglais, dans /en/<slug>/ ; fil d'Ariane Home › English › Guides › <crumb>."""
    d = dict(lang="en", locale="en_GB", date=DATE, date_fr=DATE_EN, side_title="Read next", cta_html=CTA_EN)
    d.update(_commun(kw))
    assert d['path'].startswith('/en/'), d['path']
    assert d.get('theme') in dict(THEMES_EN), (d['path'], d.get('theme'))
    d['crumbs'] = [("English", "/en/"), ("Guides", "/en/guides/"), (d['crumb'], d['path'])]
    P.append(d)


def fr(**kw):
    """Article en français, dans /conseils-vendeurs/<slug>/ (flux RSS des Conseils)."""
    d = dict(lang="fr", locale="fr_FR", date=DATE, date_fr=DATE_FR, cta_html=CTA_FR)
    d.update(_commun(kw))
    assert d['path'].startswith('/conseils-vendeurs/'), d['path']
    d['crumbs'] = [("Conseils", "/conseils-vendeurs/"), (d['crumb'], d['path'])]
    P.append(d)
