// ─── Edit these before launch ────────────────────────────────────────────────
// See docs/LAUNCH.md for step-by-step setup of the store and license keys.

export const CONFIG = {
  productName: 'Sleuthhouse',
  siteUrl: 'https://sleuthhouse.vercel.app',

  // Pro pass pricing shown on the site. Must match your store's price.
  price: '$9.99',
  priceNote: 'one-time payment · unlimited cases forever',

  // Your Gumroad (or Lemon Squeezy) product checkout link.
  checkoutUrl: 'https://gumroad.com/l/sleuthhouse',

  // Serverless function that checks license keys (api/verify-license.js).
  verifyEndpoint: '/api/verify-license',

  supportEmail: 'hello@sleuthhouse.app',

  // What the free tier can print.
  free: {
    difficulties: ['rookie'],
    cases: ['cookies', 'remote'],
    maxSuspects: 5,
  },
};
