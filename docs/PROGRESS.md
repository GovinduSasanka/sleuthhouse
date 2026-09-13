# Progress log

## Session 1 (2026-09-13, overnight)

**Idea chosen:** Sleuthhouse, a generator for printable kids' detective mysteries set in the family's *own* home, with real family, pets and toys as suspects and clue cards hidden in real rooms. Each case is logic-verified to have exactly one answer.

**Why this idea:** Research found personalised *adult* murder-mystery generators (AI-based) and many *generic* printable kids' mysteries, but nothing that builds a kids' case around your own house and family with a guaranteed-fair solution. Parents already pay $10–$25 for printable mystery kits, so demand is proven. Running cost is zero: no AI API and no database.

### Built
- Logic engine: seeded generator, sound deduction solver, clue minimisation, 3 difficulty levels, 5 cipher types (including pigpen), 9 crimes and 36 safe hiding spots with riddles.
- Printable kit renderer (9–14 pages): parents' secret briefing, mission letter, suspect cards, detective notebook with logic grids and code keys, clue cards, accusation form, certificate, badges, and a solution with a step-by-step walkthrough.
- Case builder app with live preview, local draft saving, and free vs Pro gating.
- Landing page whose live demo uses the real engine.
- License server function: self-issued HMAC codes (default, works with any payment method), Gumroad or Lemon Squeezy.
- Docs: README, docs/LAUNCH.md (deploy, payments incl. Sri Lanka notes, marketing plan, roadmap).

### Verified
- `npm test`: 180 generated cases, 2,437 checks, 0 failures (every clue true, brute-force proof of a unique thief for ≤ 5 suspects, no early giveaway, every clue necessary, deterministic).
- License handler: valid, lowercase, tampered, junk, owner key and revoked codes all behave correctly.
- Page-height audit across all difficulties and 3–8 suspects: checked in the browser. The Master notebook was fixed by giving the code keys their own page.

### Needs the owner (can't be done by Claude)
- Create GitHub/Vercel accounts and deploy.
- Pick a payment method and set env vars (see docs/LAUNCH.md §2).
- Edit `js/config.js` (checkout link, email, price).
- Play one printed kit with a real kid.

## Session 2 (2026-09-13, daytime)

The scheduled overnight follow-up started at 08:15 but stalled on a permission prompt and did no work. It was stopped, and the planned tasks were done in the main session instead.

### Built
- **Share links:** "🔗 Share link" copies a URL that rebuilds the exact same case on any device. Decoded data is validated, and unknown icons or kinds are replaced.
- **Party mode (Pro):** with 2+ detectives, two teams (Red/Blue) each get their own clue cards, notebook and accusation. The parent sheet and mission letter explain the race.
- **Classroom preset:** school rooms, 15 school hiding spots with riddles, and staff/hamster/mascot suspects. The letter says "school" instead of "house". Link: `app.html?preset=classroom`.
- **Christmas case:** The Case of the Missing Christmas Stocking (10 crimes total).
- **Article pages** for search traffic: `halloween.html`, `detective-birthday-party.html`, `rainy-day-activities.html` (with FAQ structured data), plus `sitemap.xml` and `robots.txt`.
- **Marketing:** `marketing/pins.html` (5 Pinterest pins from real kits) and `marketing/VIDEO-SCRIPTS.md` (5 scripts).
- **Hardening:** suspect icons are restricted to the built-in list, since they're printed as HTML.

### Fixed
- The accusation/certificate page overflowed with 4+ detectives, so badges now get their own page.
- The party-mode parent sheet was 1–2 lines too long, so it was tightened.
- An empty upgrade banner box showed on every screen, because CSS overrode the `hidden` attribute.
- The preview bar is no longer sticky on phones.

### Verified
- `npm test`: 189 cases, 2,481 checks, 0 failures (adds classroom, Christmas, share-link round-trip and unsafe-input checks).
- Browser layout audit: 1,890 rendered pages (home and classroom, all levels, 3–8 suspects, 1–6 detectives, with and without party mode). None exceed one sheet.
- In the browser: the classroom preset uses only school rooms and spots, party mode renders and is Pro-gated, and a share link reloads to an identical case. Pins render at 1000×1500. Article pages have no console errors.
- Phone width (375px): no sideways scrolling, and builder and preview are usable.

### Still needs the owner
Everything in Session 1's list, plus: replace `sleuthhouse.vercel.app` with the real domain in `js/config.js`, `sitemap.xml`, `robots.txt` and the article pages' canonical links.
