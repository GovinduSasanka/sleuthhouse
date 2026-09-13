// Packs builder settings into a URL-safe string so a shared link rebuilds the exact same case.

import { SUSPECT_KINDS } from './engine/content.js';

const KINDS = Object.keys(SUSPECT_KINDS);
const ICONS = new Set(Object.values(SUSPECT_KINDS).flatMap((k) => k.icons));

export function encodeSettings(state) {
  const data = {
    v: 1,
    d: state.detectives,
    s: state.suspects.map((x) => [x.name, x.kind, x.icon]),
    r: state.rooms,
    p: state.spots,
    c: (state.customSpots || []).map((x) => [x.label, x.room, x.keyword || '']),
    l: state.difficulty,
    k: state.caseType,
    n: state.seed,
    t: state.teams ? 1 : 0,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSettings(str) {
  try {
    const b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
    if (!data || data.v !== 1 || !Array.isArray(data.s)) return null;

    const list = (x) => (Array.isArray(x) ? x : []);
    const text = (x, max = 40) => String(x ?? '').slice(0, max);
    return {
      detectives: list(data.d).map((x) => text(x)).filter(Boolean).slice(0, 6),
      suspects: list(data.s).slice(0, 8).map((x) => {
        const kind = KINDS.includes(x?.[1]) ? x[1] : 'person';
        return { name: text(x?.[0]), kind, icon: ICONS.has(x?.[2]) ? x[2] : SUSPECT_KINDS[kind].icons[0] };
      }),
      rooms: list(data.r).map((x) => text(x, 30)).filter(Boolean).slice(0, 20),
      spots: list(data.p).map((x) => text(x, 40)).slice(0, 60),
      customSpots: list(data.c).slice(0, 20).map((x) => ({ label: text(x?.[0]), room: text(x?.[1], 30), keyword: text(x?.[2], 12) })),
      difficulty: text(data.l, 10),
      caseType: text(data.k, 12),
      seed: text(data.n, 20),
      teams: data.t === 1,
    };
  } catch {
    return null;
  }
}
