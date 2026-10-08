#!/usr/bin/env node
/* Lighthouse mobile sur /estimer/ (et d'autres pages passées en argument). Seuil : 90 sur chaque axe.
   node lighthouse.mjs [adresse de base] [chemins…]   — défaut : http://127.0.0.1:8788 /estimer/
   Chrome : variable CHROME_PATH, sinon le Chromium de Playwright. */
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const base = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const chemins = process.argv.slice(3).length ? process.argv.slice(3) : ['/estimer/'];
const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH || chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
let ok = true;
mkdirSync('captures', { recursive: true });
const mediane = (t) => [...t].sort((x, y) => x - y)[Math.floor(t.length / 2)];
for (const c of chemins) {
  // trois passages, on garde la médiane : une mesure seule varie avec la charge de la machine
  const passages = [];
  for (let i = 0; i < 3; i++) passages.push(await lighthouse(base + c, { port: chrome.port, output: 'html', logLevel: 'error', formFactor: 'mobile', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }));
  const notes = {};
  for (const k of Object.keys(passages[0].lhr.categories)) notes[k] = mediane(passages.map((r) => Math.round(r.lhr.categories[k].score * 100)));
  const r = passages.find((x) => Math.round(x.lhr.categories.performance.score * 100) === notes.performance) || passages[0];
  const a = r.lhr.audits;
  console.log(c, JSON.stringify(notes), `LCP ${a['largest-contentful-paint'].displayValue} · TBT ${a['total-blocking-time'].displayValue} · CLS ${a['cumulative-layout-shift'].displayValue}`, '· performance des 3 passages :', passages.map((x) => Math.round(x.lhr.categories.performance.score * 100)).join(', '));
  // /mon-espace/ et /admin/ sont volontairement hors des moteurs de recherche : la note « seo » n'y a pas de sens
  // (et un aperçu en *.pages.dev est tout entier hors des moteurs : même chose)
  const prive = /mon-espace|admin/.test(c) || /\.pages\.dev$/.test(new URL(base).hostname);
  for (const [k, v] of Object.entries(notes)) if (v < 90 && !(prive && k === 'seo')) { ok = false; console.log(`  ✘ ${k} : ${v} (< 90)`); }
  writeFileSync(`captures/lighthouse${c.replace(/\//g, '-').replace(/-$/, '')}.html`, r.report);
}
await chrome.kill();
process.exit(ok ? 0 : 1);
