// Run with: node tests/engine.test.mjs
// Proves the generator's promises: every clue is true, the thief is the ONLY
// possible answer (checked by brute force on small cases), and no clue card
// before the last one gives the answer away.

import { generateCase } from '../js/engine/generator.js';
import { solve, clueHolds } from '../js/engine/solver.js';

let failures = 0;
let checks = 0;
const assert = (cond, msg) => {
  checks++;
  if (!cond) {
    failures++;
    console.error('FAIL:', msg);
  }
};

const NAMES = [
  { name: 'Mum', kind: 'person' }, { name: 'Dad', kind: 'person' }, { name: 'Grandma', kind: 'person' },
  { name: 'Biscuit', kind: 'pet' }, { name: 'Mr Fluff', kind: 'toy' }, { name: 'Uncle Ravi', kind: 'person' },
  { name: 'Whiskers', kind: 'pet' }, { name: 'Robo', kind: 'toy' },
];
const ROOMS = ['Kitchen', 'Living Room', 'Bedroom', 'Garden', 'Bathroom'];

function permutations(n) {
  const out = [];
  const a = [...Array(n).keys()];
  const rec = (i) => {
    if (i === n) { out.push(a.slice()); return; }
    for (let j = i; j < n; j++) {
      [a[i], a[j]] = [a[j], a[i]];
      rec(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
  };
  rec(0);
  return out;
}

// Exhaustively count every (truth, culprit) world consistent with all clues.
function bruteForceCulprits(n, k, clues) {
  const perms = permutations(n);
  const culprits = new Set();
  const truth = Array(k);
  const rec = (c) => {
    if (c === k) {
      for (let x = 0; x < n; x++) {
        if (culprits.has(x)) continue;
        if (clues.every((cl) => clueHolds(cl, truth, x))) culprits.add(x);
      }
      return;
    }
    for (const p of perms) {
      truth[c] = p;
      // Prune with clues that only involve categories fixed so far.
      const ok = clues.every((cl) => {
        const cs = [cl.c, cl.c2].filter((v) => v !== undefined);
        if (cl.type === 'trace' || cl.type === 'notTrace' || cl.type === 'alibi') return true;
        if (cs.some((ci) => ci > c)) return true;
        return clueHolds(cl, truth, 0);
      });
      if (ok) rec(c + 1);
    }
  };
  rec(0);
  return culprits;
}

const started = Date.now();
let generated = 0;
for (const difficulty of ['rookie', 'junior', 'master']) {
  for (let n = 3; n <= 8; n++) {
    const runs = n <= 5 ? 12 : 8;
    for (let i = 0; i < runs; i++) {
      const input = {
        detectives: ['Nila'],
        suspects: NAMES.slice(0, n),
        rooms: ROOMS,
        difficulty,
        caseType: ['cookies', 'remote', 'cake', 'teddy'][i % 4],
        seed: `T-${difficulty}-${n}-${i}`,
      };
      const t0 = Date.now();
      const kase = generateCase(input);
      generated++;
      const ms = Date.now() - t0;
      const { k, truth, culprit, givens, clues } = kase._logic;
      const all = [...givens, ...clues];
      const tag = `${difficulty} n=${n} seed=${input.seed}`;

      assert(ms < 4000, `${tag}: slow generation ${ms}ms`);
      assert(all.every((cl) => clueHolds(cl, truth, culprit)), `${tag}: a clue is false`);
      assert(all.every((cl) => cl.text && !cl.text.includes('undefined')), `${tag}: bad clue text`);
      assert(kase.cards.every((c) => c.clues.length > 0), `${tag}: empty card`);
      assert(kase.cards.length === kase.puzzles.length, `${tag}: puzzle count mismatch`);

      const final = solve(n, k, all);
      assert(final.solved && final.culprit === culprit, `${tag}: solver does not reach the thief`);

      // No early giveaway: everything except the last card must leave doubt.
      const beforeLast = [...givens, ...kase.cards.slice(0, -1).flatMap((c) => c.clues)];
      assert(!solve(n, k, beforeLast).solved, `${tag}: solved before the last card`);

      // Minimality: removing any single clue breaks the deduction.
      for (const cl of clues) {
        const r = solve(n, k, [...givens, ...clues.filter((x) => x !== cl)]);
        const evidenceLeft = clues.filter((x) => x !== cl).some((x) => ['trace', 'notTrace', 'alibi'].includes(x.type));
        if (evidenceLeft) assert(!r.solved, `${tag}: clue "${cl.text}" is redundant`);
      }

      if (n <= 5) {
        const culprits = bruteForceCulprits(n, k, all);
        assert(culprits.size === 1 && culprits.has(culprit), `${tag}: brute force found ${culprits.size} possible thieves`);
      }
    }
  }
}

// Same input must rebuild the same case.
const a = generateCase({ suspects: NAMES.slice(0, 5), rooms: ROOMS, difficulty: 'master', seed: 'SAME' });
const b = generateCase({ suspects: NAMES.slice(0, 5), rooms: ROOMS, difficulty: 'master', seed: 'SAME' });
assert(JSON.stringify(a.cards) === JSON.stringify(b.cards), 'generation is not deterministic');

// Bad input is rejected clearly.
let threw = false;
try { generateCase({ suspects: NAMES.slice(0, 2) }); } catch { threw = true; }
assert(threw, 'too few suspects should throw');

console.log(`${generated} cases generated, ${checks} checks, ${failures} failures, ${Date.now() - started}ms`);
process.exit(failures ? 1 : 0);
