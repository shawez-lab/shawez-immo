"""Convertit trois exports privés CSV/XLSX en entrée pour indexer-drive.mjs.
Aucune connexion réseau ni écriture dans Drive. Les entrées restent locales.
Usage : python3 lire-exports-drive.py configuration-privee.json > lecture-privee.json
Configuration : {alias: {"lien": "URL Google Sheets", "export": "/chemin/export"}}
"""
import csv
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def lire_xlsx(path):
    with zipfile.ZipFile(path) as z:
        shared = [ ''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')) ] if 'xl/sharedStrings.xml' in z.namelist() else []
        relations = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        tabs = {}
        for tab in ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets', NS):
            target = relations[tab.attrib[REL]]
            target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            rows = []
            for row in ET.fromstring(z.read(target)).findall('.//m:row', NS):
                values = {}
                for cell in row:
                    col = 0
                    for letter in re.match('[A-Z]+', cell.attrib['r'])[0]:
                        col = col * 26 + ord(letter) - 64
                    val = cell.find('m:v', NS)
                    val = val.text if val is not None else ''.join(cell.itertext())
                    values[col] = shared[int(val)] if cell.attrib.get('t') == 's' else val
                idx = int(row.attrib['r'])
                while len(rows) < idx:
                    rows.append([])
                if values:
                    rows[idx - 1] = [values.get(i, '') for i in range(1, max(values) + 1)]
            tabs[tab.attrib['name']] = rows
        return tabs


config = json.load(open(sys.argv[1]))
result = {}
for alias in ('repertoire', 'relances', 'acquereurs'):
    entry = config[alias]
    if entry['export'].endswith('.csv'):
        with open(entry['export'], newline='', encoding='utf-8-sig') as f:
            tabs = {entry['onglet']: list(csv.reader(f))}
    else:
        tabs = lire_xlsx(entry['export'])
    result[alias] = {'lien': entry['lien'], 'onglets': tabs}
print(json.dumps(result, ensure_ascii=False))
