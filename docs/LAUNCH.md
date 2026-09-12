# Launching Sleuthhouse

This is a step-by-step plan to take Sleuthhouse from this folder to paying customers. Everything that needs *your* accounts or money is marked **👤 You**. I (Claude) couldn't do those steps for you: creating accounts, entering payment details and publishing publicly all need your own hands and your decision.

---

## 0. What you have

- A working website: a landing page and a case builder that produces a 9–14 page printable kit.
- A logic engine with a test suite that proves each case is fair.
- A free tier that works out of the box, and a Pro tier gated by license keys.
- A license server function that works with **self-issued codes** (any payment method), **Gumroad** or **Lemon Squeezy**.

Running costs: **$0**. There is no AI API and no database. Hosting fits comfortably in Vercel's free tier.

---

## 1. Deploy the site (about 15 minutes, free)

**👤 You**

1. Create a free GitHub account if you don't have one, and push this folder to a new repository:
   ```bash
   git remote add origin https://github.com/<you>/sleuthhouse.git
   git push -u origin master
   ```
2. Create a free account at vercel.com, click **Add New → Project**, import the repository and press **Deploy**. No build settings are needed.
3. You'll get a URL like `https://sleuthhouse.vercel.app`. The free tier works right away.
4. Optional: buy a domain (e.g. `sleuthhouse.com` or `.app`, about $10–15/year) and add it under **Project → Settings → Domains**. Check availability yourself first; it isn't verified here.

---

## 2. Choose how you get paid

Pick **one**. It depends mostly on which payout methods work in your country. Check each provider's current supported-countries page before signing up, because this changes often.

| Option | Good when | Fees | Notes |
|---|---|---|---|
| **A. Lemon Squeezy** | Your country is supported for payouts | 5% + 50¢ | Handles worldwide VAT/sales tax for you (merchant of record). Generates license keys automatically. |
| **B. Gumroad** | You have a supported bank account | 10% + 50¢ | Automatic license keys. Reports say Gumroad **dropped PayPal payouts**, so check bank payouts for your country. |
| **C. Self-issued codes + any payment method** | Neither A nor B pays out where you live | Depends on the method | Built in and the default. Take payment however you can: a local gateway, payment link, bank transfer or Payoneer request. Then email the buyer a code from `scripts/make-license.mjs`. |

**If you're in Sri Lanka:** Stripe isn't available and Etsy is known to be hard for Sri Lankan digital sellers. Two practical paths:
- **PayHere** (payhere.lk) accepts Visa/Mastercard including foreign cards, with payment links and no website coding needed. Fees are around 2.5% + LKR 25, and money settles to a local bank. Foreign buyers are charged in LKR, so their bank may add a small conversion fee. Pair it with **Option C**.
- Check whether Lemon Squeezy currently supports your bank or PayPal for payouts. If it does, Option A is the most automatic.

### Option C setup (self-issued codes)

1. Make a long random secret and keep it private, e.g. run `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
2. In Vercel → Project → Settings → Environment Variables add:
   - `LICENSE_PROVIDER` = `codes`
   - `LICENSE_SECRET` = your secret
   - `OWNER_KEY` = a private password of your own (unlocks Pro for you)
3. Mint codes whenever you sell one:
   ```bash
   LICENSE_SECRET=your-secret node scripts/make-license.mjs 10
   ```
   (In PowerShell: `$env:LICENSE_SECRET="your-secret"; node scripts/make-license.mjs 10`.)
4. Create a payment link in your gateway for the Pro price. In `js/config.js`, set `checkoutUrl` to that link.
5. When a payment arrives, email the buyer a code. To cancel a code after a refund, add it to `REVOKED_CODES` (comma-separated).

To automate step 5 later, a gateway webhook can call a small function that mints and emails a code. That's on the roadmap.

### Option A/B setup

1. Create the product ("Sleuthhouse Pro", one-time, $9.99) and **turn on license keys**.
2. Vercel env vars:
   - Gumroad: `LICENSE_PROVIDER=gumroad`, `GUMROAD_PRODUCT_ID=<id>`
   - Lemon Squeezy: `LICENSE_PROVIDER=lemonsqueezy`, `LEMON_STORE_ID=<id>`
3. Put the product's checkout URL in `js/config.js` → `checkoutUrl`.

### Then edit `js/config.js`

```js
price: '$9.99',
checkoutUrl: 'https://…your checkout link…',
supportEmail: 'you@yourdomain.com',
siteUrl: 'https://your-site',
```

Commit, push, and Vercel redeploys automatically. Test the whole flow once with your `OWNER_KEY`.

---

## 3. Get the first 100 customers

Printable kids' activities sell on **being seen**. The product demos itself: a kid running around the house cracking codes is great video. Suggested order:

### a) Short videos (TikTok, Instagram Reels, YouTube Shorts): highest upside
Film real play sessions with your own family or friends' kids (with parents' permission). Hooks that fit the format:
- *"I turned my house into a crime scene for my 7-year-old."*
- *"The dog was the prime suspect. Here's how she cracked the case."*
- *"This printable mystery used our actual family as suspects."*
- *"Rainy day? 10 minutes of setup = 1 hour of detective work."*
Show: the mission letter being read, the kid finding a card under a cushion, decoding emoji, the final accusation, and the "confession". Put the link in your bio.

### b) Pinterest: printables' home turf
Make 5–10 tall pins (1000×1500) per theme: "Rainy day activity for kids", "Detective birthday party ideas", "Halloween party game for kids" and "Screen-free activities". Link each pin straight to the builder. Pins keep bringing traffic for months.

### c) Parenting & homeschool communities
Facebook groups for parents, homeschoolers and party ideas. **Read each group's rules first.** Many ban links, but allow "I made this for my kids, happy to share" posts or have promo days. Offer free Rookie cases, which are genuinely useful, rather than pushing Pro.

### d) Teachers
Logic and reading practice fits classrooms. Offer a classroom version: rooms become "Library", "Gym", "Art Room", and suspects are teacher-approved characters. Teachers Pay Teachers is a big marketplace for this.

### e) Bloggers & creators
Email 20 parenting and "activities for kids" bloggers. Offer a free Pro code in exchange for an honest post. Use the code minting script and give each one a unique code.

### f) Seasonal pushes (put these in your calendar)
- **October:** Halloween. There's a built-in *Great Halloween Candy Heist* case. Start posting in late September.
- **December:** a Christmas case (see roadmap) plus "stocking stuffer" gift angle.
- **School holidays:** "boredom busters".
- **Birthday parties:** all year.

---

## 4. Pricing and honest expectations

- Launch at **$9.99 lifetime**. Try **$14.99** once you have reviews. A "Party Pack" or classroom license at $24.99 is another option.
- A typical free-to-paid conversion for this kind of tool is a few percent of people who actually build a case, so traffic is everything. For example, 3,000 visitors a month, 30% building a case and 3% of those buying is about 27 sales, or about $270/month at $9.99. Those numbers are **illustrative, not a forecast**. Real results depend entirely on marketing.
- Fees and taxes come out of that. Keep receipts. Selling digital goods to other countries may create tax obligations, which Lemon Squeezy handles for you. Otherwise check local rules.

---

## 5. Roadmap: ideas ranked by likely value

1. **Automatic code delivery**: payment-gateway webhook → mint code → email buyer.
2. **Christmas case** + **"Party mode"** (split suspects/clues so 2 teams race).
3. **Classroom mode** with school rooms and a whole-class accusation sheet.
4. **Photo suspects**: parents upload a photo that is printed on the suspect card (kept in the browser).
5. **Languages**: Sinhala, Tamil, Spanish and more. Content lives in one file (`js/engine/content.js`).
6. **Physical kit upsell**: detective badge, magnifying glass and evidence bags. A local 3D-printed badge could even be a side product.
7. **Share a case**: encode the settings in a link so grandparents can print the same case.

---

## 6. Sanity checklist before announcing

- [ ] `npm test` passes
- [ ] `js/config.js` has the real checkout link, price and email
- [ ] Vercel env vars are set; your `OWNER_KEY` unlocks Pro on the live site
- [ ] A test purchase (or a minted code) unlocks Pro
- [ ] Printed one full kit on real paper and played it with a kid 🙂
- [ ] `terms.html` reviewed and edited for your situation (refund policy, contact)
