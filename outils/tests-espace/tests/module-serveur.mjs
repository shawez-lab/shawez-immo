/* Charge un module du serveur (functions/_lib/*.js) dans un test, pour vérifier un calcul sans passer par le site.
   Ces fichiers sont des modules ES sans « package.json » : on en fait une copie en .mjs dans un dossier temporaire
   (avec ceux qu'ils importent), et c'est la copie qui est chargée. Le code testé est celui du dépôt, à l'identique. */
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LIB = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'functions', '_lib');
let copie = null;

export async function moduleServeur(nom) {
  if (!copie) {
    copie = mkdtempSync(join(tmpdir(), 'ee-lib-'));
    for (const f of readdirSync(LIB).filter((x) => x.endsWith('.js'))) {
      writeFileSync(join(copie, f.replace(/\.js$/, '.mjs')), readFileSync(join(LIB, f), 'utf8').replace(/(from\s+'\.\/[\w-]+)\.js'/g, "$1.mjs'"));
    }
  }
  return import(pathToFileURL(join(copie, nom + '.mjs')).href);
}
