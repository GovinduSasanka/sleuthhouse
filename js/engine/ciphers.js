// Kid-sized codes that hide the keyword pointing to the next hiding spot.

const A = 'A'.charCodeAt(0);
const letters = (word) => word.toUpperCase().replace(/[^A-Z]/g, '');

export const EMOJI_KEY = {
  A: '🍎', B: '🐝', C: '🐱', D: '🐶', E: '🥚', F: '🐸', G: '🍇', H: '🏠', I: '🍦',
  J: '🧃', K: '🔑', L: '🍋', M: '🌙', N: '👃', O: '🐙', P: '🐧', Q: '👑', R: '🌈',
  S: '⭐', T: '🌳', U: '☂️', V: '🎻', W: '🐋', X: '❌', Y: '🪀', Z: '⚡',
};

export function scramble(word, rng) {
  const w = letters(word);
  if (w.length < 3) return w.split('').reverse().join('');
  for (let tries = 0; tries < 20; tries++) {
    const s = rng.shuffle(w.split('')).join('');
    if (s !== w) return s;
  }
  return w.split('').reverse().join('');
}

export function caesar(word, shift) {
  return letters(word)
    .split('')
    .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - A + shift + 26) % 26) + A))
    .join('');
}

export function a1z26(word) {
  return letters(word).split('').map((ch) => ch.charCodeAt(0) - A + 1).join(' - ');
}

export function emojiCode(word) {
  return letters(word).split('').map((ch) => EMOJI_KEY[ch]).join(' ');
}

export function backwards(word) {
  return letters(word).split('').reverse().join('');
}

// Pigpen cipher glyphs drawn as inline SVG. Letters A–I sit in a plain 3×3 grid,
// J–R in a dotted grid, S–V in a plain X, W–Z in a dotted X.
export function pigpenGlyph(ch, size = 34) {
  const idx = ch.toUpperCase().charCodeAt(0) - A;
  if (idx < 0 || idx > 25) return '';
  const s = size;
  const p = 5;
  const m = s / 2;
  const stroke = `stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  let path = '';
  let dot = false;
  let dotAt = [m, m];

  if (idx < 18) {
    const cell = idx % 9;
    dot = idx >= 9;
    const row = Math.floor(cell / 3);
    const col = cell % 3;
    // Grid cell borders: a cell has a line on each side that faces another cell.
    const top = row > 0;
    const bottom = row < 2;
    const left = col > 0;
    const right = col < 2;
    const segs = [];
    if (top) segs.push(`M${p},${p} L${s - p},${p}`);
    if (bottom) segs.push(`M${p},${s - p} L${s - p},${s - p}`);
    if (left) segs.push(`M${p},${p} L${p},${s - p}`);
    if (right) segs.push(`M${s - p},${p} L${s - p},${s - p}`);
    path = segs.join(' ');
  } else {
    const x = (idx - 18) % 4;
    dot = idx >= 22;
    // X arms: 0 = top wedge (V opening down), 1 = left, 2 = right, 3 = bottom.
    const shapes = [
      `M${p},${p} L${m},${s - p} L${s - p},${p}`,
      `M${p},${p} L${s - p},${m} L${p},${s - p}`,
      `M${s - p},${p} L${p},${m} L${s - p},${s - p}`,
      `M${p},${s - p} L${m},${p} L${s - p},${s - p}`,
    ];
    path = shapes[x];
    dotAt = [[m, m - 3], [m - 4, m], [m + 4, m], [m, m + 3]][x];
  }
  return `<svg class="pigpen" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-label="${ch}"><path d="${path}" ${stroke}/>${
    dot ? `<circle cx="${dotAt[0]}" cy="${dotAt[1]}" r="2.8" fill="currentColor"/>` : ''
  }</svg>`;
}

export function pigpen(word) {
  return letters(word).split('').map((ch) => pigpenGlyph(ch)).join('');
}

// Wrap a keyword in a code suited to the difficulty. Returns a description the
// renderer can turn into HTML, plus the plain answer for the parent's sheet.
export function encodeKeyword(word, difficulty, rng) {
  const kw = letters(word);
  if (difficulty === 'rookie') {
    return { kind: 'plain', answer: kw };
  }
  if (difficulty === 'junior') {
    const kind = rng.pick(['scramble', 'emoji', 'backwards']);
    if (kind === 'scramble') return { kind, answer: kw, code: scramble(kw, rng) };
    if (kind === 'emoji') return { kind, answer: kw, code: emojiCode(kw) };
    return { kind, answer: kw, code: backwards(kw) };
  }
  const kind = rng.pick(['caesar', 'a1z26', 'pigpen', 'emoji']);
  if (kind === 'caesar') {
    const shift = rng.pick([1, 2, 3]);
    return { kind, answer: kw, code: caesar(kw, shift), shift };
  }
  if (kind === 'a1z26') return { kind, answer: kw, code: a1z26(kw) };
  if (kind === 'pigpen') return { kind, answer: kw, codeHtml: pigpen(kw) };
  return { kind, answer: kw, code: emojiCode(kw) };
}
