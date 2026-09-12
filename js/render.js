// Turns a generated case into printable pages (plain HTML strings).

import { EMOJI_KEY, pigpenGlyph } from './engine/ciphers.js';
import { MASCOT, DETECTIVE_TITLES } from './engine/content.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const joinNames = (names) => {
  const n = names.map(esc);
  if (n.length <= 1) return n.join('');
  return `${n.slice(0, -1).join(', ')} &amp; ${n[n.length - 1]}`;
};

function page(content, { cls = '', label = '', brand = true } = {}) {
  return `<section class="page ${cls}" data-label="${esc(label)}">
    ${content}
    <footer class="page-foot">${brand ? '<span>🦉 Sleuthhouse</span>' : '<span></span>'}<span>${esc(label)}</span></footer>
  </section>`;
}

function letterBoxes(word) {
  return `<div class="boxes">${word.split('').map(() => '<span></span>').join('')}</div>`;
}

function puzzleHtml(puzzle, difficulty, { forCard = true } = {}) {
  const { spot, code } = puzzle;
  const lead = forCard ? 'Your next clue is hidden…' : 'Your first clue is hidden…';
  if (code.kind === 'plain') {
    return `<div class="puzzle">
      <div class="puzzle-lead">${lead}</div>
      <p class="riddle">“${esc(spot.riddle)}”</p>
      <div class="puzzle-hint">Hint: it is in the <b>${esc(spot.room)}</b>.</div>
    </div>`;
  }
  const how = {
    scramble: 'Unscramble the letters:',
    emoji: 'Crack the Emoji Code (key in your notebook):',
    backwards: 'This word is written backwards:',
    caesar: `Secret shift code: move every letter <b>back ${code.shift}</b> in the alphabet (key in your notebook):`,
    a1z26: 'Number code: 1 = A, 2 = B, 3 = C… (key in your notebook):',
    pigpen: 'Pigpen code (key in your notebook):',
  }[code.kind];
  const coded = code.codeHtml ? `<div class="code code-pigpen">${code.codeHtml}</div>` : `<div class="code code-${code.kind}">${esc(code.code)}</div>`;
  const stuck = difficulty === 'junior'
    ? `<div class="stuck">Stuck? Ask a grown-up to read the secret riddle on their sheet.</div>`
    : '';
  return `<div class="puzzle">
    <div class="puzzle-lead">${lead}</div>
    <div class="puzzle-how">${how}</div>
    ${coded}
    ${letterBoxes(code.answer)}
    ${stuck}
  </div>`;
}

function parentGuide(k) {
  const time = { rookie: '20–30 minutes', junior: '30–45 minutes', master: '45–75 minutes' }[k.difficulty.id];
  const rows = k.puzzles.map((p, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td><b>${esc(p.spot.label)}</b></td>
      <td>${esc(p.spot.room)}</td>
      <td class="mono">${esc(p.code.answer)}</td>
      <td class="small">${esc(p.spot.riddle)}</td>
    </tr>`).join('');
  return page(`
    <div class="stamp stamp-red">TOP SECRET · GROWN-UPS ONLY</div>
    <h1 class="title">Parents’ Secret Briefing</h1>
    <p class="lede">${esc(k.case.title)} · ${esc(k.difficulty.label)} (${esc(k.difficulty.ages)}) · about ${time} · Case no. <span class="mono">${esc(k.seed)}</span></p>

    <div class="cols">
      <div>
        <h3>Setup (10 minutes)</h3>
        <ol class="steps">
          <li>Print every page. Keep this page and the <b>Solution</b> page away from the detectives.</li>
          <li>Cut out the <b>clue cards</b> and <b>suspect cards</b> along the dashed lines.</li>
          <li>Hide clue cards <b>1 to ${k.cards.length}</b> in the spots in the table below. Folding them in half helps.</li>
          <li>Hand the detectives the <b>Mission Letter</b>, the <b>suspect cards</b>, the <b>Detective Notebook</b> and a pencil.</li>
          <li>Read the Mission Letter out loud, dramatically. Then let the hunt begin!</li>
          <li>When they’re ready, they fill in the <b>Accusation</b>. Check it against the Solution and read the confession out loud.</li>
        </ol>
      </div>
      <div>
        <h3>Good to know</h3>
        <ul class="bullets">
          <li><b>Every clue is true.</b> The case was checked by a logic solver: there is exactly one possible thief, and no card gives it away early.</li>
          <li>Detectives only need the clues. Nothing depends on luck or guessing.</li>
          <li>Players in the case can play too! The suspects are only pretend.</li>
          <li>Stuck detectives? Read out a hint from the right-hand column of the table below.</li>
        </ul>
      </div>
    </div>

    <h3>Where to hide each clue card</h3>
    <div class="table-wrap"><table class="hide-table">
      <thead><tr><th>Card</th><th>Hide it…</th><th>Room</th><th>Code answer</th><th>Hint riddle</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  `, { cls: 'parent', label: 'Parents only' });
}

function missionLetter(k) {
  const title = DETECTIVE_TITLES[k.difficulty.id];
  const suspects = k.suspects.map((s) => `${s.icon} ${esc(s.name)}`).join(' · ');
  return page(`
    <div class="letterhead">
      <div class="mascot">${MASCOT.icon}</div>
      <div>
        <div class="agency">SLEUTHHOUSE DETECTIVE AGENCY</div>
        <div class="from">From the desk of ${esc(MASCOT.name)}</div>
      </div>
      <div class="stamp stamp-blue">URGENT</div>
    </div>
    <h1 class="title case-title">${k.case.icon} ${esc(k.case.title)}</h1>
    <div class="letter">
      <p>Dear ${esc(title)} ${joinNames(k.detectives)},</p>
      <p>We have a serious situation in your house. ${esc(k.case.hook)}</p>
      <p>The crime happened in the <b>${esc(k.case.sceneRoom)}</b>. Our investigation shows that the thief must be one of these ${k.suspects.length} suspects:</p>
      <p class="suspect-line">${suspects}</p>
      <p>I have hidden <b>${k.cards.length} clue cards</b> around the house. Each clue card tells you something true about the case and shows you where to find the next one. Use your <b>Detective Notebook</b> to cross off suspects as you go.</p>
      <p>When you have found every card and only one suspect is left, fill in the Accusation form. Choose carefully. A good detective never guesses!</p>
      <p>The whole house is counting on you.</p>
      <p class="sign">${esc(MASCOT.name)} ${MASCOT.icon}<br><span>Chief of Sleuthhouse Detective Agency</span></p>
    </div>
    <div class="first-clue">
      ${puzzleHtml(k.puzzles[0], k.difficulty.id, { forCard: false })}
    </div>
  `, { cls: 'mission', label: 'Mission letter' });
}

function suspectCards(k) {
  const cards = k.suspects.map((s) => `<div class="suspect cut">
      <div class="suspect-top"><span class="suspect-icon">${s.icon}</span><span class="suspect-tag">SUSPECT</span></div>
      <div class="suspect-name">${esc(s.name)}</div>
      <div class="suspect-known"><b>Known for:</b> ${esc(s.knownFor)}</div>
      ${s.facts.length ? `<ul class="suspect-facts">${s.facts.map((f) => `<li><span>${f.icon}</span><b>${esc(f.category)}:</b> ${esc(f.text)}</li>`).join('')}</ul>` : '<div class="suspect-facts unknown">Whereabouts: <b>UNKNOWN</b></div>'}
    </div>`);
  const pages = [];
  for (let i = 0; i < cards.length; i += 6) {
    pages.push(page(`
      <h2 class="section-title">Suspect Cards <small>cut along the dashed lines</small></h2>
      <div class="grid-cards">${cards.slice(i, i + 6).join('')}</div>
    `, { cls: 'suspects', label: 'Suspect cards' }));
  }
  return pages.join('');
}

function notebook(k) {
  const hidden = k.categories.filter((c) => !c.visible);
  const head = `<div class="nb-head"><h2 class="section-title">Detective Notebook</h2><div class="nb-owner">Property of: ${joinNames(k.detectives)}</div></div>`;

  const checklist = `<h3>Suspect checklist</h3>
    <p class="small">When a clue proves a suspect is innocent, cross them out!</p>
    <div class="checklist">${k.suspects.map((s) => `<div class="check"><span class="box"></span><span class="ci">${s.icon}</span>${esc(s.name)}</div>`).join('')}</div>`;

  const grids = hidden.map((cat) => `<div class="grid-block">
      <h3>${cat.icon} ${esc(cat.question)}</h3>
      <div class="table-wrap"><table class="logic">
        <thead><tr><th></th>${cat.values.map((v) => `<th><div class="vh"><span>${v.icon}</span>${esc(v.name)}</div></th>`).join('')}</tr></thead>
        <tbody>${k.suspects.map((s) => `<tr><th>${s.icon} ${esc(s.name)}</th>${cat.values.map(() => '<td></td>').join('')}</tr>`).join('')}</tbody>
      </table></div>
    </div>`);

  const gridHelp = hidden.length
    ? `<p class="small">Logic grid tip: put an <b>✗</b> in a box when something is impossible, and a <b>✓</b> when you are sure. Each row gets one ✓, and so does each column!</p>`
    : '';

  const kinds = new Set(k.puzzles.map((p) => p.code.kind));
  const keys = [];
  if (kinds.has('emoji')) {
    keys.push(`<div class="key"><h4>Emoji Code</h4><div class="key-grid">${Object.entries(EMOJI_KEY).map(([l, e]) => `<span><i>${e}</i>${l}</span>`).join('')}</div></div>`);
  }
  if (kinds.has('caesar') || kinds.has('a1z26')) {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    keys.push(`<div class="key"><h4>Alphabet strip</h4><div class="strip">${abc.map((l, i) => `<span><b>${l}</b><i>${i + 1}</i></span>`).join('')}</div></div>`);
  }
  if (kinds.has('pigpen')) {
    keys.push(`<div class="key"><h4>Pigpen Code</h4><div class="key-grid pig">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `<span>${pigpenGlyph(l, 26)}${l}</span>`).join('')}</div></div>`);
  }

  const log = `<h3>Clue log</h3><div class="lines">${k.cards.map((c) => `<div class="line"><b>Card ${c.number}</b></div>`).join('')}</div>`;

  // One grid fits under the checklist. Extra grids share page 2 with the clue log,
  // and the code keys then get a page of their own.
  const keysHtml = keys.length ? `<h2 class="section-title">Code-Breaker Keys</h2><div class="keys">${keys.join('')}</div>` : '';
  const out = [page(`${head}${checklist}${gridHelp}${grids[0] || ''}`, { cls: 'notebook', label: 'Detective notebook' })];
  if (grids.length > 1) {
    out.push(page(`${grids.slice(1).join('')}${log}`, { cls: 'notebook', label: 'Detective notebook (2)' }));
    if (keysHtml) out.push(page(keysHtml, { cls: 'notebook', label: 'Code-breaker keys' }));
  } else {
    out.push(page(`${keysHtml}${log}`, { cls: 'notebook', label: 'Detective notebook (2)' }));
  }
  return out.join('');
}

function clueCards(k) {
  const cards = k.cards.map((card, i) => {
    const next = k.puzzles[i + 1];
    const body = card.clues.map((cl) => `<li>${cl.type === 'trace' || cl.type === 'notTrace' ? '🔍 ' : cl.type === 'alibi' ? '✅ ' : '🗒️ '}${esc(cl.text)}</li>`).join('');
    const footer = next
      ? puzzleHtml(next, k.difficulty.id)
      : `<div class="puzzle last"><div class="puzzle-lead">That was the LAST clue!</div><p>Look at your notebook. Only one suspect should be left. Fill in the Accusation form and present your case!</p></div>`;
    return `<div class="clue-card cut">
      <div class="clue-head"><span class="clue-num">CLUE ${card.number}</span><span class="clue-of">of ${k.cards.length}</span><span class="clue-case">${k.case.icon}</span></div>
      <ul class="clue-list">${body}</ul>
      ${footer}
    </div>`;
  });
  const pages = [];
  const perPage = 2;
  for (let i = 0; i < cards.length; i += perPage) {
    pages.push(page(`<div class="clue-stack">${cards.slice(i, i + perPage).join('')}</div>`, { cls: 'clues', label: 'Clue cards: cut out and hide' }));
  }
  return pages.join('');
}

function accusation(k) {
  const title = DETECTIVE_TITLES[k.difficulty.id];
  return page(`
    <div class="accuse">
      <h2 class="section-title">Official Accusation</h2>
      <p class="big-line">We, ${esc(title)}${k.detectives.length > 1 ? 's' : ''} ${joinNames(k.detectives)}, accuse</p>
      <div class="suspect-pick">${k.suspects.map((s) => `<span class="pick"><span class="box"></span>${s.icon} ${esc(s.name)}</span>`).join('')}</div>
      <p class="big-line">of taking ${esc(k.case.item)}.</p>
      <p>Our most important clue was card number <span class="blank short"></span> because <span class="blank"></span></p>
      <div class="signatures">${k.detectives.map((d) => `<div><span class="blank"></span><small>Signed, Detective ${esc(d)}</small></div>`).join('')}</div>
    </div>
    <div class="cert">
      <div class="cert-inner">
        <div class="cert-icon">${MASCOT.icon}</div>
        <div class="cert-kicker">Sleuthhouse Detective Agency</div>
        <div class="cert-title">Certificate of Excellent Detecting</div>
        <p>This certifies that</p>
        <div class="cert-names">${joinNames(k.detectives)}</div>
        <p>solved <b>${esc(k.case.title)}</b> using logic, teamwork and very sharp eyes, and ${k.detectives.length > 1 ? 'are' : 'is'} hereby promoted to <b>${esc(title)}</b>.</p>
        <div class="cert-sign"><span>${esc(MASCOT.name)}</span><span>Date: ______________</span></div>
      </div>
    </div>
    <div class="badges">${k.detectives.map((d) => `<div class="badge cut"><div class="badge-star">★</div><div class="badge-rank">${esc(title)}</div><div class="badge-name">${esc(d)}</div></div>`).join('')}</div>
  `, { cls: 'finale', label: 'Accusation & certificate' });
}

function solutionPage(k) {
  const cats = k.categories;
  const rows = k.solution.truth.map((t) => `<tr class="${t.name === k.culprit.name ? 'guilty' : ''}"><th>${t.icon} ${esc(t.name)}</th>${t.facts.map((f) => `<td>${f.icon} ${esc(f.text)}</td>`).join('')}</tr>`).join('');
  return page(`
    <div class="stamp stamp-red">SOLUTION · DO NOT SHOW DETECTIVES</div>
    <h1 class="title">The thief was… ${k.culprit.icon} ${esc(k.culprit.name)}!</h1>
    <div class="confession">
      <div class="confession-label">Read the confession out loud, in ${esc(k.culprit.name)}’s voice:</div>
      <p>“${esc(k.confession)}”</p>
    </div>
    <h3>What really happened</h3>
    <div class="table-wrap"><table class="truth"><thead><tr><th>Suspect</th>${cats.map((c) => `<th>${c.icon} ${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <h3>How detectives can prove it</h3>
    <ol class="walk">${k.solution.walkthrough.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
  `, { cls: 'solution', label: 'Parents only: solution' });
}

export function renderKit(k) {
  return [
    parentGuide(k),
    missionLetter(k),
    suspectCards(k),
    notebook(k),
    clueCards(k),
    accusation(k),
    solutionPage(k),
  ].join('\n');
}

export { esc };
