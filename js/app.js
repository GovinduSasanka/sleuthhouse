import { generateCase, LIMITS } from './engine/generator.js';
import { renderKit, esc } from './render.js';
import { CASES, DIFFICULTIES, ROOM_OPTIONS, SCHOOL_ROOMS, SPOTS, SUSPECT_KINDS } from './engine/content.js';
import { randomSeed } from './engine/rng.js';
import { encodeSettings, decodeSettings } from './share.js';
import { CONFIG } from './config.js';
import { isPro, activate, deactivate, allowedByFree } from './license.js';

const DRAFT_KEY = 'sleuthhouse.draft';

const DEFAULT_STATE = {
  detectives: ['Alex'],
  suspects: [
    { name: 'Mum', kind: 'person', icon: '👩' },
    { name: 'Dad', kind: 'person', icon: '👨' },
    { name: 'Grandma', kind: 'person', icon: '👵' },
    { name: 'Biscuit', kind: 'pet', icon: '🐶' },
    { name: 'Mr Fluff', kind: 'toy', icon: '🧸' },
  ],
  rooms: ['Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Hallway'],
  spots: [],
  customSpots: [],
  difficulty: 'rookie',
  caseType: 'cookies',
  seed: randomSeed(),
  teams: false,
};

const PRESETS = {
  home: {
    suspects: DEFAULT_STATE.suspects,
    rooms: DEFAULT_STATE.rooms,
    spots: [],
    customSpots: [],
  },
  classroom: {
    suspects: [
      { name: 'Principal Park', kind: 'person', icon: '🧔' },
      { name: 'Coach Rivera', kind: 'person', icon: '🧑' },
      { name: 'Ms Silva the Librarian', kind: 'person', icon: '👩‍🦱' },
      { name: 'Nibbles the Hamster', kind: 'pet', icon: '🐹' },
      { name: 'Robo the Mascot', kind: 'toy', icon: '🤖' },
    ],
    rooms: ['Classroom', 'Library', 'Gym', 'Art Room', 'Playground', 'Cafeteria'],
    spots: [],
    customSpots: [],
  },
};

let state = loadState();
let currentCase = null;
let regenTimer = null;

const $ = (sel) => document.querySelector(sel);

function baseState(params) {
  // A shared link rebuilds the sender's exact case.
  const shared = decodeSettings(new URLSearchParams(location.hash.slice(1)).get('c') || '');
  if (shared && shared.suspects.length) return { ...structuredClone(DEFAULT_STATE), ...shared };

  // Names typed into the landing page demo take priority.
  if (params.get('kid') || params.get('pet') || params.get('adult')) {
    const fresh = structuredClone(DEFAULT_STATE);
    const kid = (params.get('kid') || '').slice(0, 40).trim();
    const pet = (params.get('pet') || '').slice(0, 40).trim();
    const adult = (params.get('adult') || '').slice(0, 40).trim();
    if (kid) fresh.detectives = [kid];
    const lead = [];
    if (adult) lead.push({ name: adult, kind: 'person', icon: '👨' });
    if (pet) lead.push({ name: pet, kind: 'pet', icon: '🐶' });
    const taken = new Set(lead.map((s) => s.name.toLowerCase()));
    fresh.suspects = [...lead, ...fresh.suspects.filter((s) => !taken.has(s.name.toLowerCase()) && !(adult && s.name === 'Dad') && !(pet && s.name === 'Biscuit'))].slice(0, 5);
    history.replaceState(null, '', location.pathname);
    return fresh;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (saved && Array.isArray(saved.suspects)) return { ...structuredClone(DEFAULT_STATE), ...saved };
  } catch {
    // Storage unavailable; start fresh.
  }
  return structuredClone(DEFAULT_STATE);
}

function loadState() {
  const params = new URLSearchParams(location.search);
  const s = baseState(params);
  // Links from the article pages can preselect a preset, crime or level.
  if (PRESETS[params.get('preset')]) Object.assign(s, structuredClone(PRESETS[params.get('preset')]));
  if (CASES[params.get('case')]) s.caseType = params.get('case');
  if (DIFFICULTIES[params.get('level')]) s.difficulty = params.get('level');
  if (['preset', 'case', 'level'].some((p) => params.has(p)) || location.hash) {
    history.replaceState(null, '', location.pathname + (params.get('pro') === '1' ? '?pro=1' : ''));
  }
  return s;
}

function saveState() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // Ignore: the builder still works without saving.
  }
}

function isFreeCase(id) { return CONFIG.free.cases.includes(id); }
function isFreeLevel(id) { return CONFIG.free.difficulties.includes(id); }
const lock = (free) => (free || isPro() ? '' : '<span class="lock">PRO</span>');

// ─── Builder form ─────────────────────────────────────────────────────────────

function renderBuilder() {
  const schoolMode = state.rooms.some((r) => SCHOOL_ROOMS.some((o) => o.name === r));
  const roomList = schoolMode ? SCHOOL_ROOMS : ROOM_OPTIONS;
  const roomNames = new Set(roomList.map((r) => r.name));
  const customRooms = state.rooms.filter((r) => !roomNames.has(r));
  const spotChoices = SPOTS.filter((sp) => state.rooms.includes(sp.room));
  const pro = isPro();

  $('#builder').innerHTML = `
    <div class="builder-intro">
      <h1>Build your case</h1>
      <p>Fill in your family and your house. The kit on the right updates as you go.</p>
      <div class="presets">
        <span>Start from an example:</span>
        <button type="button" class="btn btn-small" data-action="preset" data-id="home">🏠 Home</button>
        <button type="button" class="btn btn-small" data-action="preset" data-id="classroom">🏫 Classroom</button>
      </div>
    </div>

    <section class="step">
      <div class="step-head"><span class="step-num">1</span><h2>Detectives</h2></div>
      <p class="step-help">Who’s solving the mystery? Their names go on the mission letter and certificate.</p>
      <div class="chips">
        ${state.detectives.map((d, i) => `<span class="chip on">🕵️ ${esc(d)}<button type="button" class="chip-x" data-action="remove-detective" data-i="${i}" aria-label="Remove ${esc(d)}">×</button></span>`).join('')}
      </div>
      ${state.detectives.length < 6 ? `<form class="inline-add" data-form="detective">
        <input class="input" name="name" placeholder="Add a detective’s name" maxlength="40" autocomplete="off">
        <button class="btn btn-small" type="submit">Add</button>
      </form>` : ''}
      ${state.detectives.length >= 2 ? `<label class="toggle">
        <input type="checkbox" data-field="teams" ${state.teams ? 'checked' : ''}>
        <span>🏁 <b>Party mode:</b> split detectives into two teams that race to solve it ${lock(false)}</span>
      </label>` : ''}
    </section>

    <section class="step">
      <div class="step-head"><span class="step-num">2</span><h2>Suspects</h2><span class="count">${state.suspects.length}/${LIMITS.maxSuspects}</span></div>
      <p class="step-help">Family, pets and toys: anyone could be the thief! Tap the picture to change it.${pro ? '' : ` Free cases allow up to ${CONFIG.free.maxSuspects}.`}</p>
      <div class="suspect-rows">
        ${state.suspects.map((s, i) => `<div class="suspect-row">
          <button type="button" class="icon-btn" data-action="cycle-icon" data-i="${i}" aria-label="Change picture for ${esc(s.name)}">${s.icon}</button>
          <input class="input" data-field="suspect-name" data-i="${i}" value="${esc(s.name)}" maxlength="40" placeholder="Name" aria-label="Suspect name">
          <div class="seg" role="group" aria-label="Suspect type">
            ${Object.entries(SUSPECT_KINDS).map(([kind, meta]) => `<button type="button" class="${s.kind === kind ? 'on' : ''}" data-action="kind" data-i="${i}" data-kind="${kind}">${meta.label}</button>`).join('')}
          </div>
          <button type="button" class="row-x" data-action="remove-suspect" data-i="${i}" aria-label="Remove ${esc(s.name)}" ${state.suspects.length <= LIMITS.minSuspects ? 'disabled' : ''}>×</button>
        </div>`).join('')}
      </div>
      ${state.suspects.length < LIMITS.maxSuspects ? `<div class="add-row">
        <button type="button" class="btn btn-small" data-action="add-suspect" data-kind="person">+ Person</button>
        <button type="button" class="btn btn-small" data-action="add-suspect" data-kind="pet">+ Pet</button>
        <button type="button" class="btn btn-small" data-action="add-suspect" data-kind="toy">+ Toy</button>
      </div>` : ''}
    </section>

    <section class="step">
      <div class="step-head"><span class="step-num">3</span><h2>Your rooms</h2></div>
      <p class="step-help">Which rooms can detectives explore? Clue cards will only be hidden in these.</p>
      <div class="chips">
        ${roomList.map((r) => `<button type="button" class="chip ${state.rooms.includes(r.name) ? 'on' : ''}" data-action="toggle-room" data-room="${esc(r.name)}" aria-pressed="${state.rooms.includes(r.name)}">${r.icon} ${esc(r.name)}</button>`).join('')}
        ${customRooms.map((r) => `<span class="chip on">🚪 ${esc(r)}<button type="button" class="chip-x" data-action="toggle-room" data-room="${esc(r)}" aria-label="Remove ${esc(r)}">×</button></span>`).join('')}
      </div>
      <form class="inline-add" data-form="room">
        <input class="input" name="name" placeholder="Another room (e.g. Tree House)" maxlength="30" autocomplete="off">
        <button class="btn btn-small" type="submit">Add</button>
      </form>
    </section>

    <section class="step">
      <div class="step-head"><span class="step-num">4</span><h2>Hiding spots</h2></div>
      <p class="step-help">We pick safe spots in your rooms automatically. Tap any you’d like us to use first, or add your own.</p>
      <div class="chips small">
        ${spotChoices.map((sp) => `<button type="button" class="chip ${state.spots.includes(sp.id) ? 'on' : ''}" data-action="toggle-spot" data-id="${sp.id}" aria-pressed="${state.spots.includes(sp.id)}">${esc(sp.label)} <em>${esc(sp.room)}</em></button>`).join('')}
        ${state.customSpots.map((sp, i) => `<span class="chip on">${esc(sp.label)} <em>${esc(sp.room)}</em><button type="button" class="chip-x" data-action="remove-custom-spot" data-i="${i}" aria-label="Remove">×</button></span>`).join('')}
      </div>
      <details class="custom-spot">
        <summary>+ Add your own hiding spot</summary>
        <form class="spot-form" data-form="spot">
          <label>Where exactly? <input class="input" name="label" placeholder="inside the red teapot" maxlength="40" required></label>
          <label>Room <select class="select" name="room">${state.rooms.map((r) => `<option>${esc(r)}</option>`).join('')}</select></label>
          <label>Code word <input class="input" name="keyword" placeholder="TEAPOT" maxlength="12"></label>
          <button class="btn btn-small" type="submit">Add spot</button>
        </form>
      </details>
    </section>

    <section class="step">
      <div class="step-head"><span class="step-num">5</span><h2>The crime</h2></div>
      <div class="tiles cases">
        ${Object.values(CASES).map((c) => `<button type="button" class="tile ${state.caseType === c.id ? 'on' : ''}" data-action="case" data-id="${c.id}" aria-pressed="${state.caseType === c.id}">
          <span class="tile-icon">${c.icon}</span><span class="tile-title">${esc(c.title)}</span>${lock(isFreeCase(c.id))}
        </button>`).join('')}
      </div>
    </section>

    <section class="step">
      <div class="step-head"><span class="step-num">6</span><h2>Difficulty</h2></div>
      <div class="tiles levels">
        ${Object.values(DIFFICULTIES).map((d) => `<button type="button" class="tile level ${state.difficulty === d.id ? 'on' : ''}" data-action="difficulty" data-id="${d.id}" aria-pressed="${state.difficulty === d.id}">
          <span class="tile-title">${esc(d.label)} ${lock(isFreeLevel(d.id))}</span>
          <span class="tile-ages">${esc(d.ages)}</span>
          <span class="tile-blurb">${esc(d.blurb)}</span>
        </button>`).join('')}
      </div>
    </section>

    <section class="step">
      <div class="step-head"><span class="step-num">7</span><h2>Case number</h2></div>
      <p class="step-help">Every number is a completely different mystery. Played this one already? Roll a new one.</p>
      <div class="inline-add">
        <input class="input mono" data-field="seed" value="${esc(state.seed)}" maxlength="20" aria-label="Case number">
        <button class="btn btn-small" type="button" data-action="reroll">🎲 Roll</button>
      </div>
    </section>

    <p class="builder-foot">Your details stay in this browser. Nothing is uploaded.</p>
  `;
}

function renderProStatus() {
  $('#pro-status').innerHTML = isPro()
    ? '<button class="btn btn-small btn-ghost" data-action="manage-pro" type="button"><span class="pro-pill">PRO</span> Unlocked</button>'
    : `<button class="btn btn-small" data-action="open-pro" type="button">✨ Unlock Pro · ${esc(CONFIG.price)}</button>`;
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function settingsForEngine() {
  return {
    detectives: state.detectives,
    suspects: state.suspects,
    rooms: state.rooms,
    spots: [...state.spots, ...state.customSpots],
    difficulty: state.difficulty,
    caseType: state.caseType,
    seed: state.seed,
    teams: Boolean(state.teams) && state.detectives.length >= 2,
  };
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function regenerate() {
  const settings = settingsForEngine();
  const errorBox = $('#pv-error');
  try {
    currentCase = generateCase(settings);
    errorBox.hidden = true;
  } catch (err) {
    currentCase = null;
    errorBox.hidden = false;
    errorBox.textContent = `🦉 ${err.message}`;
    $('#kit').innerHTML = '';
    $('#pv-title').textContent = 'Almost there…';
    $('#pv-meta').textContent = '';
    return;
  }

  const k = currentCase;
  $('#kit').innerHTML = renderKit(k, { teams: settings.teams });
  const pageCount = $('#kit').querySelectorAll('.page').length;
  $('#pv-title').textContent = `${k.case.icon} ${k.case.title}`;
  $('#pv-meta').textContent = `${k.difficulty.label} · ${k.suspects.length} suspects · ${k.cards.length} hidden clue cards${settings.teams ? ' per team' : ''} · ${pageCount} pages`;

  const gate = allowedByFree({ ...settings, suspects: k.suspects });
  const locked = !gate.ok && !isPro();
  $('#kit').classList.toggle('locked', locked);
  $('#kit').classList.toggle('pro-kit', isPro());
  document.body.classList.toggle('kit-locked', locked);
  const banner = $('#locked-banner');
  banner.hidden = !locked;
  if (locked) {
    const why = gate.reasons.map((r) => ({
      difficulty: `the ${DIFFICULTIES[state.difficulty].label} level`,
      case: `“${CASES[state.caseType].title}”`,
      suspects: `more than ${CONFIG.free.maxSuspects} suspects`,
      teams: 'party mode',
    }[r])).join(', ');
    banner.innerHTML = `<span>✨ You’re previewing a <b>Pro</b> case (${why}). Unlock Pro to print it.</span><button class="btn btn-small btn-red" type="button" data-action="open-pro">Unlock ${esc(CONFIG.price)}</button>`;
  }
  fitPreview();
}

function scheduleRegenerate(delay = 250) {
  clearTimeout(regenTimer);
  regenTimer = setTimeout(regenerate, delay);
}

function fitPreview() {
  const holder = $('#kit-scale');
  const pageWidth = 794; // 210mm at 96dpi
  const available = holder.clientWidth - 8;
  const scale = Math.min(1, Math.max(0.3, available / pageWidth));
  holder.style.setProperty('--kit-zoom', scale.toFixed(3));
}

function commit({ rebuild = true, regenerate: regen = true } = {}) {
  saveState();
  if (rebuild) renderBuilder();
  if (regen) scheduleRegenerate(rebuild ? 0 : 300);
}

// ─── Pro modal ────────────────────────────────────────────────────────────────

function openProModal() {
  const pro = isPro();
  $('#modal-root').innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pro-title">
        <button class="close" type="button" data-action="close-modal" aria-label="Close">×</button>
        ${pro ? `
          <h2 id="pro-title">Pro is unlocked 🎉</h2>
          <p>Every case, every level, up to ${LIMITS.maxSuspects} suspects, unlimited printing. Thank you for supporting Sleuthhouse!</p>
          <button class="btn btn-small" type="button" data-action="deactivate">Remove license from this browser</button>
        ` : `
          <h2 id="pro-title">Sleuthhouse Pro</h2>
          <div class="price">${esc(CONFIG.price)}<small>${esc(CONFIG.priceNote)}</small></div>
          <ul>
            <li>All ${Object.keys(CASES).length} crimes, from the Sock Snatcher to the Pirate Gold Heist</li>
            <li>Junior Inspector &amp; Master Sleuth levels, with codes and pigpen ciphers</li>
            <li>Up to ${LIMITS.maxSuspects} suspects: the whole family, the cat and the dinosaur</li>
            <li>Party mode: two teams race to crack the same case</li>
            <li>Unlimited new cases. Every case number is a brand-new mystery</li>
            <li>No Sleuthhouse branding on printed pages</li>
          </ul>
          <a class="btn btn-red btn-big" href="${esc(CONFIG.checkoutUrl)}" target="_blank" rel="noopener">Get Pro for ${esc(CONFIG.price)}</a>
          <div class="divider">already bought it?</div>
          <form class="license-row" data-form="license">
            <input class="input" name="key" placeholder="Paste your license key" autocomplete="off" aria-label="License key">
            <button class="btn btn-small" type="submit">Unlock</button>
          </form>
          <div class="msg" id="license-msg" role="status"></div>
          <p class="small muted">Your license key is in your purchase email.</p>
        `}
      </div>
    </div>`;
  const input = $('#modal-root input');
  if (input) input.focus();
}

function closeModal() {
  $('#modal-root').innerHTML = '';
}

// ─── Events ───────────────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action } = el.dataset;
  const i = Number(el.dataset.i);

  if (action === 'close-modal') {
    if (e.target === el || el.classList.contains('close')) closeModal();
    return;
  }

  switch (action) {
    case 'remove-detective':
      state.detectives.splice(i, 1);
      commit();
      break;
    case 'cycle-icon': {
      const s = state.suspects[i];
      const icons = SUSPECT_KINDS[s.kind].icons;
      s.icon = icons[(icons.indexOf(s.icon) + 1) % icons.length];
      commit();
      break;
    }
    case 'kind': {
      const s = state.suspects[i];
      s.kind = el.dataset.kind;
      s.icon = SUSPECT_KINDS[s.kind].icons[0];
      commit();
      break;
    }
    case 'remove-suspect':
      if (state.suspects.length > LIMITS.minSuspects) state.suspects.splice(i, 1);
      commit();
      break;
    case 'add-suspect': {
      const kind = el.dataset.kind;
      const used = new Set(state.suspects.map((s) => s.icon));
      const icon = SUSPECT_KINDS[kind].icons.find((ic) => !used.has(ic)) || SUSPECT_KINDS[kind].icons[0];
      state.suspects.push({ name: '', kind, icon });
      commit();
      const inputs = document.querySelectorAll('[data-field="suspect-name"]');
      inputs[inputs.length - 1]?.focus();
      break;
    }
    case 'toggle-room': {
      const room = el.dataset.room;
      if (state.rooms.includes(room)) {
        if (state.rooms.length > 1) state.rooms = state.rooms.filter((r) => r !== room);
      } else {
        state.rooms.push(room);
      }
      state.customSpots = state.customSpots.filter((sp) => state.rooms.includes(sp.room));
      commit();
      break;
    }
    case 'toggle-spot':
      state.spots = state.spots.includes(el.dataset.id) ? state.spots.filter((x) => x !== el.dataset.id) : [...state.spots, el.dataset.id];
      commit();
      break;
    case 'remove-custom-spot':
      state.customSpots.splice(i, 1);
      commit();
      break;
    case 'case':
      state.caseType = el.dataset.id;
      commit();
      break;
    case 'difficulty':
      state.difficulty = el.dataset.id;
      commit();
      break;
    case 'reroll':
      state.seed = randomSeed();
      commit();
      break;
    case 'preset': {
      const preset = PRESETS[el.dataset.id];
      if (!preset) break;
      if (!window.confirm('Replace your suspects, rooms and hiding spots with this example?')) break;
      Object.assign(state, structuredClone(preset));
      commit();
      break;
    }
    case 'share': {
      const url = `${location.origin}${location.pathname}#c=${encodeSettings(state)}`;
      const copy = navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject(new Error('no clipboard'));
      copy
        .then(() => toast('Link copied! Anyone who opens it gets this exact case.'))
        .catch(() => window.prompt('Copy this link:', url));
      break;
    }
    case 'print':
      if (!currentCase) return;
      if ($('#kit').classList.contains('locked')) {
        openProModal();
        return;
      }
      window.print();
      break;
    case 'open-pro':
    case 'manage-pro':
      openProModal();
      break;
    case 'deactivate':
      deactivate();
      closeModal();
      renderProStatus();
      commit();
      break;
  }
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.field === 'suspect-name') {
    state.suspects[Number(el.dataset.i)].name = el.value;
    commit({ rebuild: false });
  } else if (el.dataset.field === 'teams') {
    state.teams = el.checked;
    commit();
  } else if (el.dataset.field === 'seed') {
    state.seed = el.value.toUpperCase();
    commit({ rebuild: false });
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const data = new FormData(form);
  switch (form.dataset.form) {
    case 'detective': {
      const name = String(data.get('name') || '').trim();
      if (name && state.detectives.length < 6) state.detectives.push(name);
      commit();
      document.querySelector('[data-form="detective"] input')?.focus();
      break;
    }
    case 'room': {
      const name = String(data.get('name') || '').trim().replace(/\b\w/g, (c) => c.toUpperCase());
      if (name && !state.rooms.includes(name)) state.rooms.push(name);
      commit();
      break;
    }
    case 'spot': {
      const label = String(data.get('label') || '').trim();
      if (label) {
        state.customSpots.push({
          label,
          room: String(data.get('room') || state.rooms[0]),
          keyword: String(data.get('keyword') || '').trim(),
        });
      }
      commit();
      break;
    }
    case 'license': {
      const msg = $('#license-msg');
      const button = form.querySelector('button');
      button.disabled = true;
      msg.className = 'msg';
      msg.textContent = 'Checking…';
      const result = await activate(data.get('key'));
      button.disabled = false;
      if (result.valid) {
        msg.className = 'msg good';
        msg.textContent = 'Unlocked! Enjoy every case.';
        renderProStatus();
        commit();
        setTimeout(closeModal, 900);
      } else {
        msg.className = 'msg bad';
        msg.textContent = result.message || 'That key did not work.';
      }
      break;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#modal-root').innerHTML) closeModal();
});

window.addEventListener('resize', fitPreview);

renderProStatus();
renderBuilder();
regenerate();
if (new URLSearchParams(location.search).get('pro') === '1') openProModal();
