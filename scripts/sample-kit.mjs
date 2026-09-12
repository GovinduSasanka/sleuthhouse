// Writes a stand-alone sample kit: node scripts/sample-kit.mjs [level] [case]
import { readFileSync, writeFileSync } from 'node:fs';
import { generateCase } from '../js/engine/generator.js';
import { renderKit } from '../js/render.js';

const level = process.argv[2] || 'junior';
const caseType = process.argv[3] || 'cookies';
const k = generateCase({
  detectives: ['Nila', 'Kavin'],
  suspects: [
    { name: 'Mum', kind: 'person', icon: '👩' },
    { name: 'Dad', kind: 'person', icon: '👨' },
    { name: 'Grandma', kind: 'person', icon: '👵' },
    { name: 'Biscuit', kind: 'pet', icon: '🐶' },
    { name: 'Mr Fluff', kind: 'toy', icon: '🧸' },
  ],
  rooms: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Garden'],
  difficulty: level,
  caseType,
  seed: 'SAMPLE-1',
});
const css = readFileSync(new URL('../css/kit.css', import.meta.url), 'utf8');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sleuthhouse sample kit · ${k.case.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Special+Elite&display=swap" rel="stylesheet">
<style>body{margin:0;padding:24px 0;background:#e9dfcc}@media(max-width:820px){.kit{zoom:.47}}${css}</style>
</head><body><div class="kit">${renderKit(k)}</div></body></html>`;
const out = new URL(`../docs/sample-kit-${level}.html`, import.meta.url);
writeFileSync(out, html);
console.log(`Wrote docs/sample-kit-${level}.html · ${k.case.title} · ${k.cards.length} clue cards · thief: ${k.culprit.name}`);
