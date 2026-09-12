// Human-style deduction solver.
//
// State: dom[c][s] is a bitmask of the values suspect s could hold in category c
// (each category is a one-to-one matching of suspects to values), and `culprit`
// is a bitmask of suspects who could still be the thief.
//
// Every rule is sound: it only removes possibilities that no solution consistent
// with the clues could have. So if propagation narrows `culprit` to one suspect,
// the answer is guaranteed unique — and it was reachable by plain reasoning,
// with no guessing. The generator relies on both properties.

const bit = (i) => 1 << i;
const popcount = (x) => {
  let n = 0;
  while (x) { x &= x - 1; n++; }
  return n;
};
const onlyIndex = (x) => 31 - Math.clz32(x);
const isSingle = (x) => x !== 0 && (x & (x - 1)) === 0;

export function createState(n, k) {
  const full = (1 << n) - 1;
  return {
    n,
    k,
    dom: Array.from({ length: k }, () => Array(n).fill(full)),
    culprit: full,
  };
}

export function cloneState(st) {
  return { n: st.n, k: st.k, dom: st.dom.map((row) => row.slice()), culprit: st.culprit };
}

// Clue shapes (s = suspect index, c = category index, v = value index):
//   { type: 'is', s, c, v }            suspect s holds v
//   { type: 'not', s, c, v }           suspect s does not hold v
//   { type: 'either', s, c, v, v2 }    suspect s holds v or v2
//   { type: 'link', c, v, c2, v2 }     whoever holds v also holds v2
//   { type: 'unlink', c, v, c2, v2 }   whoever holds v does not hold v2
//   { type: 'trace', c, mask }         the thief holds one of the values in mask
//   { type: 'notTrace', c, mask }      the thief holds none of the values in mask
//   { type: 'alibi', s }               suspect s is not the thief

export function propagate(st, clues, log = null) {
  const { n, k, dom } = st;
  let changed = true;
  let guard = 0;

  const note = (msg) => { if (log) log.push(msg); };

  const restrict = (c, s, mask, why) => {
    const before = dom[c][s];
    const after = before & mask;
    if (after !== before) {
      dom[c][s] = after;
      changed = true;
      if (log && isSingle(after) && !isSingle(before)) {
        note({ kind: 'fact', s, c, v: onlyIndex(after), why });
      }
    }
  };
  const restrictCulprit = (mask, why) => {
    const before = st.culprit;
    const after = before & mask;
    if (after !== before) {
      st.culprit = after;
      changed = true;
      if (log) {
        let removed = before & ~after;
        while (removed) {
          const s = onlyIndex(removed & -removed);
          removed &= removed - 1;
          note({ kind: 'cleared', s, why });
        }
      }
    }
  };

  while (changed && guard++ < 500) {
    changed = false;

    for (const cl of clues) {
      switch (cl.type) {
        case 'is':
          restrict(cl.c, cl.s, bit(cl.v), cl);
          break;
        case 'not':
          restrict(cl.c, cl.s, ~bit(cl.v), cl);
          break;
        case 'either':
          restrict(cl.c, cl.s, bit(cl.v) | bit(cl.v2), cl);
          break;
        case 'link':
          for (let s = 0; s < n; s++) {
            if (!(dom[cl.c][s] & bit(cl.v))) restrict(cl.c2, s, ~bit(cl.v2), cl);
            if (!(dom[cl.c2][s] & bit(cl.v2))) restrict(cl.c, s, ~bit(cl.v), cl);
            if (dom[cl.c][s] === bit(cl.v)) restrict(cl.c2, s, bit(cl.v2), cl);
            if (dom[cl.c2][s] === bit(cl.v2)) restrict(cl.c, s, bit(cl.v), cl);
          }
          break;
        case 'unlink':
          for (let s = 0; s < n; s++) {
            if (dom[cl.c][s] === bit(cl.v)) restrict(cl.c2, s, ~bit(cl.v2), cl);
            if (dom[cl.c2][s] === bit(cl.v2)) restrict(cl.c, s, ~bit(cl.v), cl);
          }
          break;
        case 'trace': {
          // Thief holds some value in cl.mask (a single value or a group like "crunchy snacks").
          let who = 0;
          for (let s = 0; s < n; s++) if (dom[cl.c][s] & cl.mask) who |= bit(s);
          restrictCulprit(who, cl);
          if (isSingle(st.culprit)) restrict(cl.c, onlyIndex(st.culprit), cl.mask, cl);
          break;
        }
        case 'notTrace': {
          let who = (1 << n) - 1;
          for (let s = 0; s < n; s++) if ((dom[cl.c][s] & ~cl.mask) === 0) who &= ~bit(s);
          restrictCulprit(who, cl);
          if (isSingle(st.culprit)) restrict(cl.c, onlyIndex(st.culprit), ~cl.mask, cl);
          break;
        }
        case 'alibi':
          restrictCulprit(~bit(cl.s), cl);
          break;
      }
    }

    // One-to-one matching rules within each category.
    for (let c = 0; c < k; c++) {
      for (let s = 0; s < n; s++) {
        if (isSingle(dom[c][s])) {
          for (let o = 0; o < n; o++) {
            if (o !== s) restrict(c, o, ~dom[c][s], { type: 'unique', c, s, v: onlyIndex(dom[c][s]) });
          }
        }
      }
      for (let v = 0; v < n; v++) {
        let holders = 0;
        for (let s = 0; s < n; s++) if (dom[c][s] & bit(v)) holders |= bit(s);
        if (isSingle(holders)) {
          const s = onlyIndex(holders);
          restrict(c, s, bit(v), { type: 'onlyOne', c, s, v });
        }
      }
    }
  }

  let contradiction = st.culprit === 0;
  for (let c = 0; c < k && !contradiction; c++) {
    for (let s = 0; s < n; s++) if (dom[c][s] === 0) contradiction = true;
  }
  return { contradiction };
}

export function solve(n, k, clues, log = null) {
  const st = createState(n, k);
  const { contradiction } = propagate(st, clues, log);
  return {
    state: st,
    contradiction,
    solved: !contradiction && isSingle(st.culprit),
    culprit: isSingle(st.culprit) ? onlyIndex(st.culprit) : -1,
    suspectsLeft: popcount(st.culprit),
    // Total remaining uncertainty; used to prefer clues that make progress.
    entropy: st.dom.reduce((sum, row) => sum + row.reduce((a, m) => a + popcount(m), 0), 0) + popcount(st.culprit),
  };
}

// Check a clue against a known full solution (used when generating true clues).
export function clueHolds(clue, truth, culprit) {
  const holder = (c, v) => truth[c].indexOf(v);
  switch (clue.type) {
    case 'is': return truth[clue.c][clue.s] === clue.v;
    case 'not': return truth[clue.c][clue.s] !== clue.v;
    case 'either': return truth[clue.c][clue.s] === clue.v || truth[clue.c][clue.s] === clue.v2;
    case 'link': return holder(clue.c, clue.v) === holder(clue.c2, clue.v2);
    case 'unlink': return holder(clue.c, clue.v) !== holder(clue.c2, clue.v2);
    case 'trace': return ((clue.mask >> truth[clue.c][culprit]) & 1) === 1;
    case 'notTrace': return ((clue.mask >> truth[clue.c][culprit]) & 1) === 0;
    case 'alibi': return clue.s !== culprit;
    default: return false;
  }
}

export { popcount, isSingle, onlyIndex };
