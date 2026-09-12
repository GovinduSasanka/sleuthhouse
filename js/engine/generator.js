// Builds a complete, verified case from a family's details.
//
// 1. Invent a hidden truth: who was wearing/eating/doing what, where, and who did it.
// 2. Generate every TRUE clue that could be said about that truth.
// 3. Add clues until the deduction solver can pin down exactly one thief,
//    never letting a single clue clear too many suspects at once.
// 4. Remove every clue the solution doesn't strictly need.
//    Deduction only ever gains knowledge as clues are added, so with a minimal
//    set no clue card before the last one can give the answer away.
// 5. Split the clues across hiding spots and wrap each spot in a riddle or code.

import { createRng } from './rng.js';
import { solve, clueHolds, popcount } from './solver.js';
import {
  CASES, CATEGORY_POOL, ROOM_OPTIONS, ROOM_TRACES, SPOTS, KNOWN_FOR, CONFESSIONS,
  DIFFICULTIES, SUSPECT_KINDS,
} from './content.js';
import { encodeKeyword } from './ciphers.js';

export const LIMITS = { minSuspects: 3, maxSuspects: 8 };

const TYPE_WEIGHTS = {
  rookie: { traceGroup: 3, notTrace: 3, notTraceGroup: 2, alibi: 1.5 },
  junior: { is: 0.6, not: 3, either: 2.5, link: 2, unlink: 2, trace: 1, traceGroup: 2.5, notTrace: 1.5, notTraceGroup: 1.5 },
  master: { is: 0.3, not: 2.2, either: 2.5, link: 3, unlink: 2.5, trace: 0.8, traceGroup: 2, notTrace: 1.2, notTraceGroup: 1.5, alibi: 0.4 },
};

const ATTEMPTS = 30;

const ALIBIS = {
  person: [
    'a photo shows them on the other side of the house at the exact moment it happened',
    'they were on a very long phone call, and the whole call was heard through the wall',
    'they were stuck in the bath singing loudly the entire time',
  ],
  pet: [
    'they were fast asleep in a sunbeam, snoring, the whole time',
    'they were shut outside and scratching at the door the entire time',
    'they were busy chasing their own tail where everyone could see',
  ],
  toy: [
    'they were stuck at the bottom of the toy box under a pile of blocks',
    'they were sitting on the windowsill in plain view the whole time',
    'they were in the washing basket waiting for a bath',
  ],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isEvidence = (cl) => cl.type === 'trace' || cl.type === 'notTrace' || cl.type === 'alibi';

export function normalizeInput(input = {}) {
  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);

  const detectives = (input.detectives || []).map(clean).filter(Boolean).slice(0, 6);
  if (!detectives.length) detectives.push('Detective');

  const seen = new Set();
  const suspects = [];
  for (const raw of input.suspects || []) {
    const name = clean(raw.name);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const kind = SUSPECT_KINDS[raw.kind] ? raw.kind : 'person';
    suspects.push({ name, kind, icon: raw.icon || SUSPECT_KINDS[kind].icons[0] });
  }
  if (suspects.length < LIMITS.minSuspects) {
    throw new Error(`A case needs at least ${LIMITS.minSuspects} suspects with different names.`);
  }
  if (suspects.length > LIMITS.maxSuspects) suspects.length = LIMITS.maxSuspects;

  const rooms = [...new Set((input.rooms || []).map(clean).filter(Boolean))];
  if (!rooms.length) rooms.push('Kitchen', 'Living Room', 'Bedroom');

  const spots = (input.spots || [])
    .map((sp) => {
      if (typeof sp === 'string') return SPOTS.find((x) => x.id === sp);
      if (!sp || !clean(sp.label)) return null;
      const label = clean(sp.label);
      const room = clean(sp.room) || rooms[0];
      return {
        id: `custom-${label}`,
        label,
        room,
        keyword: (clean(sp.keyword) || label.split(' ').pop()).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12) || 'CLUE',
        riddle: clean(sp.riddle) || `Look ${label.toLowerCase()} in the ${room}.`,
        custom: true,
      };
    })
    .filter(Boolean);

  return {
    detectives,
    suspects,
    rooms,
    spots,
    difficulty: DIFFICULTIES[input.difficulty] ? input.difficulty : 'rookie',
    caseType: CASES[input.caseType] ? input.caseType : 'cookies',
    seed: clean(input.seed) || 'SLEUTH-1',
  };
}

function buildCategories(cfg, rng) {
  const others = rng.shuffle(['wearing', 'snack', 'doing']);
  const n = cfg.suspects.length;
  const ids = cfg.difficulty === 'rookie'
    ? others.slice(0, 2)
    : cfg.difficulty === 'junior'
      ? ['where', others[0]]
      : ['where', others[0], others[1]];

  return ids.map((id) => {
    const pool = CATEGORY_POOL[id];
    let values;
    if (id === 'where') {
      const names = rng.shuffle(cfg.rooms).slice(0, n);
      for (const r of rng.shuffle(ROOM_OPTIONS.map((o) => o.name))) {
        if (names.length >= n) break;
        if (!names.includes(r)) names.push(r);
      }
      values = names.map((name) => ({
        key: name,
        name,
        icon: ROOM_OPTIONS.find((o) => o.name === name)?.icon || '🚪',
        tags: [],
        trace: ROOM_TRACES[name] || `a speck of dust from the ${name}`,
      }));
    } else {
      values = rng.shuffle(pool.values).slice(0, n);
    }
    const groups = [];
    for (const [gid, g] of Object.entries(pool.groups)) {
      let mask = 0;
      values.forEach((v, i) => { if (v.tags.includes(gid)) mask |= 1 << i; });
      const size = popcount(mask);
      if (size >= 2 && size <= n - 1) groups.push({ id: gid, mask, ...g });
    }
    return { ...pool, values, groups };
  });
}

function candidateClues(n, cats, truth, culprit, visible, difficulty) {
  const out = [];
  const k = cats.length;
  const push = (cl, kind) => { if (clueHolds(cl, truth, culprit)) out.push({ ...cl, kind }); };
  const allowed = TYPE_WEIGHTS[difficulty];

  for (let c = 0; c < k; c++) {
    const hidden = !visible.includes(c);
    for (let s = 0; s < n; s++) {
      const tv = truth[c][s];
      if (hidden && allowed.is) push({ type: 'is', s, c, v: tv }, 'is');
      for (let v = 0; v < n; v++) {
        if (v === tv) continue;
        if (hidden && allowed.not) push({ type: 'not', s, c, v }, 'not');
        if (hidden && allowed.either) push({ type: 'either', s, c, v: tv, v2: v }, 'either');
      }
    }
    for (let v = 0; v < n; v++) {
      if (allowed.trace) push({ type: 'trace', c, mask: 1 << v, v }, 'trace');
      if (allowed.notTrace) push({ type: 'notTrace', c, mask: 1 << v, v }, 'notTrace');
    }
    for (const g of cats[c].groups) {
      if (allowed.traceGroup) push({ type: 'trace', c, mask: g.mask, g: g.id }, 'traceGroup');
      if (allowed.notTraceGroup) push({ type: 'notTrace', c, mask: g.mask, g: g.id }, 'notTraceGroup');
    }
    for (let c2 = c + 1; c2 < k; c2++) {
      if (visible.includes(c) && visible.includes(c2)) continue;
      for (let v = 0; v < n; v++) {
        for (let v2 = 0; v2 < n; v2++) {
          if (allowed.link) push({ type: 'link', c, v, c2, v2 }, 'link');
          if (allowed.unlink) push({ type: 'unlink', c, v, c2, v2 }, 'unlink');
        }
      }
    }
  }
  if (allowed.alibi) {
    for (let s = 0; s < n; s++) push({ type: 'alibi', s }, 'alibi');
  }
  return out;
}

function pickClues(n, k, givens, pool, difficulty, rng) {
  const weights = TYPE_WEIGHTS[difficulty];
  // A single clue may clear at most this many suspects, so the hunt has a real arc.
  const maxDrop = n <= 4 ? 1 : 2;
  const chosen = [];
  const used = new Set();
  const key = (cl) => JSON.stringify([cl.type, cl.s, cl.c, cl.v, cl.v2, cl.c2, cl.mask]);

  for (let iter = 0; iter < 90; iter++) {
    const current = solve(n, k, [...givens, ...chosen]);
    if (current.solved) break;
    const relaxed = iter > 50;
    const sample = rng.shuffle(pool.filter((cl) => !used.has(key(cl)))).slice(0, relaxed ? 500 : 45);
    const options = [];
    for (const cl of sample) {
      const r = solve(n, k, [...givens, ...chosen, cl]);
      if (r.contradiction) continue;
      const progress = current.entropy - r.entropy;
      const drop = current.suspectsLeft - r.suspectsLeft;
      if (progress <= 0) continue;
      if (!relaxed && drop > maxDrop) continue;
      options.push([cl, (weights[cl.kind] || 1) * Math.sqrt(progress)]);
    }
    if (!options.length) continue;
    const cl = rng.weighted(options);
    chosen.push(cl);
    used.add(key(cl));
  }

  if (!solve(n, k, [...givens, ...chosen]).solved) return null;

  // Trim to a minimal set, keeping at least one piece of evidence for the story.
  for (const cl of rng.shuffle(chosen)) {
    const rest = chosen.filter((x) => x !== cl);
    if (isEvidence(cl) && !rest.some(isEvidence)) continue;
    if (solve(n, k, [...givens, ...rest]).solved) chosen.splice(chosen.indexOf(cl), 1);
  }
  return chosen;
}

function clueText(cl, ctx) {
  const { cats, suspects } = ctx;
  const S = cl.s !== undefined ? suspects[cl.s].name : '';
  const cat = cats[cl.c];
  const val = cat && cl.v !== undefined ? cat.values[cl.v] : null;
  const group = cat && cl.g ? cat.groups.find((g) => g.id === cl.g) : null;
  const predicate = (c, v, negative) => {
    const sentence = negative ? cats[c].not('§', cats[c].values[v]) : cats[c].is('§', cats[c].values[v]);
    const rest = sentence.replace('§ ', '');
    return negative ? rest : rest.replace(/^was /, 'was also ');
  };

  switch (cl.type) {
    case 'is': return cat.is(S, val);
    case 'not': return cat.not(S, val);
    case 'either': return cat.either(S, val, cat.values[cl.v2]);
    case 'link': return `${cap(cat.holder(val))} ${predicate(cl.c2, cl.v2, false)}`;
    case 'unlink': return `${cap(cat.holder(val))} ${predicate(cl.c2, cl.v2, true)}`;
    case 'trace':
      return group
        ? `${group.found} That means ${group.thief}.`
        : `We found ${val.trace}. That means ${cat.thief(val)}.`;
    case 'notTrace':
      return group
        ? `${group.none} So ${group.notThief}.`
        : `We searched everywhere for ${val.trace} but found none. So ${cat.notThief(val)}.`;
    case 'alibi':
      return `${S} has an alibi: ${ctx.alibiReason(cl.s)}. ${S} is in the clear!`;
    default:
      return '';
  }
}

function arrangeSpots(cfg, count, rng) {
  const picked = [];
  const ids = new Set();
  const add = (sp) => { if (sp && !ids.has(sp.id) && picked.length < count) { ids.add(sp.id); picked.push(sp); } };
  rng.shuffle(cfg.spots).forEach(add);
  rng.shuffle(SPOTS.filter((sp) => cfg.rooms.includes(sp.room))).forEach(add);
  rng.shuffle(SPOTS).forEach(add);

  // Send detectives back and forth: avoid two spots in a row in the same room.
  const order = [];
  const left = picked.slice();
  while (left.length) {
    const prevRoom = order.length ? order[order.length - 1].room : null;
    const idx = left.findIndex((sp) => sp.room !== prevRoom);
    order.push(left.splice(idx === -1 ? 0 : idx, 1)[0]);
  }
  return order;
}

// Replays the deduction card by card, so the parent's walkthrough follows the hunt.
function buildWalkthrough(n, k, givens, cards, ctx) {
  const lines = [];
  const seen = new Set();
  const ref = (why) => (why && why.card ? `Clue card ${why.card}` : null);
  let result = null;

  const steps = [givens, ...cards.map((c) => c.clues)];
  let soFar = [];
  for (const stepClues of steps) {
    soFar = [...soFar, ...stepClues];
    const log = [];
    result = solve(n, k, soFar, log);
    for (const e of log) {
      const S = ctx.suspects[e.s].name;
      if (e.kind === 'cleared') {
        const id = `c${e.s}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const r = ref(e.why);
        lines.push(r ? `${r} → ${S} can't be the thief.` : `So ${S} can't be the thief.`);
      } else if (e.kind === 'fact') {
        const id = `f${e.s}-${e.c}`;
        if (seen.has(id)) continue;
        seen.add(id);
        if (e.why && e.why.given) continue;
        const fact = ctx.cats[e.c].is(S, ctx.cats[e.c].values[e.v]);
        const r = ref(e.why);
        lines.push(r ? `${r} → ${fact}` : `By elimination → ${fact}`);
      }
    }
  }
  if (result && result.solved) {
    const name = ctx.suspects[result.culprit].name;
    lines.push(`Only ${name} is left, so ${name} is the thief!`);
  }
  return { lines, result };
}

function attemptCase(cfg, signature, attempt) {
  const n = cfg.suspects.length;
  const rng = createRng(`${signature}#${attempt}`);
  const cats = buildCategories(cfg, rng);
  const k = cats.length;
  const truth = cats.map(() => rng.shuffle([...Array(n).keys()]));
  const culprit = rng.int(0, n - 1);
  const visible = cfg.difficulty === 'rookie' ? [0, 1] : cfg.difficulty === 'junior' ? [0] : [];

  const givens = [];
  for (const c of visible) {
    for (let s = 0; s < n; s++) givens.push({ type: 'is', s, c, v: truth[c][s], given: true });
  }

  const pool = candidateClues(n, cats, truth, culprit, visible, cfg.difficulty);
  // "Either" clues are built true-option-first; shuffle so the order gives nothing away.
  pool.forEach((cl) => { if (cl.type === 'either' && rng.chance(0.5)) [cl.v, cl.v2] = [cl.v2, cl.v]; });
  const clues = pickClues(n, k, givens, pool, cfg.difficulty, rng);
  if (!clues) return null;

  return { rng, cats, k, truth, culprit, visible, givens, clues };
}

export function generateCase(input) {
  const cfg = normalizeInput(input);
  const n = cfg.suspects.length;
  const diff = DIFFICULTIES[cfg.difficulty];
  const signature = [cfg.seed, cfg.difficulty, cfg.caseType, cfg.suspects.map((s) => s.name).join(','), cfg.rooms.join(',')].join('|');

  // Several candidate truths are tried; the first whose clue count suits the
  // difficulty wins, otherwise the closest one does.
  const [minClues, maxClues] = diff.clues;
  const targetMin = Math.min(minClues, n - 1 + (cfg.difficulty === 'rookie' ? 0 : 2));
  let best = null;
  let bestDistance = Infinity;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const a = attemptCase(cfg, signature, attempt);
    if (!a) continue;
    const count = a.clues.length;
    const distance = count < targetMin ? targetMin - count : count > maxClues ? count - maxClues : 0;
    if (distance < bestDistance) {
      best = a;
      bestDistance = distance;
    }
    if (distance === 0) break;
  }
  if (!best) throw new Error('Could not build a fair case with these settings. Try a different case number.');

  const { rng, cats, k, truth, culprit, visible, givens, clues } = best;

  const cardCount = Math.min(diff.maxCards, clues.length);
  const ordered = rng.shuffle(clues);
  const firstEvidence = ordered.findIndex(isEvidence);
  if (firstEvidence > 0) ordered.unshift(ordered.splice(firstEvidence, 1)[0]);

  const alibiPicks = {};
  const ctx = {
    cats,
    suspects: cfg.suspects,
    alibiReason: (s) => {
      if (!alibiPicks[s]) alibiPicks[s] = rng.pick(ALIBIS[cfg.suspects[s].kind]);
      return alibiPicks[s];
    },
  };

  const spots = arrangeSpots(cfg, cardCount, rng);
  const cards = [];
  for (let i = 0; i < cardCount; i++) {
    const chunk = ordered.slice(Math.round((i * ordered.length) / cardCount), Math.round(((i + 1) * ordered.length) / cardCount));
    chunk.forEach((cl) => { cl.card = i + 1; });
    cards.push({ number: i + 1, spot: spots[i], clues: chunk });
  }

  // The mission letter holds the code for spot 1; card i holds the code for spot i+1.
  const puzzles = spots.map((sp) => ({ spot: sp, code: encodeKeyword(sp.keyword, cfg.difficulty, rng) }));

  for (const cl of clues) cl.text = clueText(cl, ctx);
  for (const g of givens) g.text = clueText(g, ctx);

  const { lines: walkthrough, result } = buildWalkthrough(n, k, givens, cards, ctx);
  if (!result.solved || result.culprit !== culprit) {
    throw new Error('Internal check failed. Try a different case number.');
  }

  const theCase = CASES[cfg.caseType];
  const sceneRoom = rng.pick(cfg.rooms);
  const knownForPools = {};
  const suspects = cfg.suspects.map((sp, i) => {
    knownForPools[sp.kind] = knownForPools[sp.kind] || rng.shuffle(KNOWN_FOR[sp.kind]);
    const pool = knownForPools[sp.kind];
    return {
      ...sp,
      index: i,
      knownFor: pool[i % pool.length],
      facts: visible.map((c) => ({ category: cats[c].label, icon: cats[c].values[truth[c][i]].icon, text: cats[c].values[truth[c][i]].name })),
    };
  });

  const fill = (s) => s.replaceAll('{item}', theCase.item).replaceAll('{itemShort}', theCase.itemShort).replaceAll('{container}', theCase.container);

  return {
    version: 1,
    input: cfg,
    seed: cfg.seed,
    difficulty: diff,
    case: { ...theCase, hook: fill(theCase.hook), sceneRoom },
    detectives: cfg.detectives,
    suspects,
    categories: cats.map((c, ci) => ({
      id: c.id,
      label: c.label,
      question: c.question,
      icon: c.icon,
      visible: visible.includes(ci),
      values: c.values.map((v) => ({ name: v.name, icon: v.icon })),
    })),
    cards,
    puzzles,
    clueCount: clues.length,
    culprit: suspects[culprit],
    confession: fill(rng.pick(CONFESSIONS[cfg.suspects[culprit].kind])),
    solution: {
      culprit: suspects[culprit].name,
      truth: suspects.map((sp, s) => ({
        name: sp.name,
        icon: sp.icon,
        facts: cats.map((c, ci) => ({ category: c.label, icon: c.values[truth[ci][s]].icon, text: c.values[truth[ci][s]].name })),
      })),
      walkthrough,
    },
    // Kept for tests and for re-verifying a case.
    _logic: { n, k, truth, culprit, givens, clues: ordered },
  };
}
