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
