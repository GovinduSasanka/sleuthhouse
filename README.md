# 🦉 Sleuthhouse

**A real detective mystery, set in your own home.**

Sleuthhouse builds printable detective games for kids aged 5–12. The family, pets and toys are the suspects, and the clue cards are hidden in the family's real rooms. Each case comes from a logic engine: the generator invents the hidden truth, picks clues until a deduction solver can name exactly one thief, then removes every clue that isn't needed. So every clue card matters, and none gives the answer away early.

- **Free:** Rookie cases (ages 5–7), up to 5 suspects, 2 crimes.
- **Pro (one-time purchase):** all 9 crimes, Junior Inspector and Master Sleuth levels (codes, pigpen cipher, logic grids), up to 8 suspects.

Everything runs in the browser. Nothing about the family is uploaded. The only server code is a small license-check function.

## Run it

```bash
npm run dev
```

Open http://localhost:5173. No install step is needed: the project has zero dependencies.

## Test it

```bash
npm test
```

The test suite generates 180 cases across every difficulty and suspect count, then checks that:

- every clue is true;
- brute-force search over all possible worlds finds exactly one possible thief (for cases with ≤ 5 suspects);
- the case can't be solved before the last clue card;
- no clue can be removed without breaking the deduction;
- the same case number rebuilds the same case.

## Project layout

```
index.html              Landing page (live demo uses the real engine)
app.html                Case builder + printable kit preview
terms.html              Terms & privacy
js/engine/rng.js        Seeded randomness
js/engine/solver.js     Deduction solver (sound, human-style propagation)
js/engine/generator.js  Case generator: truth → clues → minimise → hunt
js/engine/ciphers.js    Scramble, emoji, Caesar, A1Z26, pigpen
js/engine/content.js    Crimes, suspects, evidence, hiding spots, riddles
js/render.js            Case → printable HTML pages
js/app.js               Builder UI, Pro gating
js/config.js            ← price, checkout link, free-tier limits
js/license.js           Browser side of license activation
api/verify-license.js   Vercel function: license codes / Gumroad / Lemon Squeezy
api/license-codes.js    HMAC-signed license codes
scripts/make-license.mjs  Mint license codes to sell through any payment method
scripts/dev-server.mjs  Local server (also runs the API)
docs/LAUNCH.md          How to go live and get your first customers
```

## Going live

See **[docs/LAUNCH.md](docs/LAUNCH.md)**.
