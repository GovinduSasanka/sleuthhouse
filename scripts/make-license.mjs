// Create Pro license codes you can sell through ANY payment method
// (PayHere, bank transfer, Payoneer request, Etsy, cash at a school fair…).
//
//   LICENSE_SECRET=your-long-random-secret node scripts/make-license.mjs 5
//
// Use the same LICENSE_SECRET in Vercel with LICENSE_PROVIDER=codes.
// Codes look like SLEUTH-7K2Q-9XMT-4HBD and can't be guessed without the secret.

import { makeCode } from '../api/license-codes.js';

const secret = process.env.LICENSE_SECRET;
if (!secret || secret.length < 16) {
  console.error('Set LICENSE_SECRET to a random string of at least 16 characters.');
  process.exit(1);
}
const count = Math.max(1, Math.min(500, Number(process.argv[2] || 1)));
for (let i = 0; i < count; i++) console.log(makeCode(secret));
