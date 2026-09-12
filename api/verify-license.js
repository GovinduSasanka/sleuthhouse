// Vercel serverless function: POST { key } → { valid, message }
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   LICENSE_PROVIDER     "codes" (default), "gumroad" or "lemonsqueezy"
//   LICENSE_SECRET       for "codes": the secret used by scripts/make-license.mjs
//   REVOKED_CODES        for "codes": optional comma-separated codes to block (refunds)
//   GUMROAD_PRODUCT_ID   Gumroad product ID (Product → Content → License key section)
//   LEMON_STORE_ID       optional: only accept Lemon Squeezy keys from this store
//   MAX_ACTIVATIONS      optional: devices per key before refusing (default 5)
//   OWNER_KEY            optional: a private key of your own that always unlocks Pro

import { checkCode } from './license-codes.js';

function verifyCode(key) {
  const secret = process.env.LICENSE_SECRET;
  if (!secret) return { valid: false, message: 'Store is not configured yet (LICENSE_SECRET).' };
  const revoked = (process.env.REVOKED_CODES || '').toUpperCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (revoked.includes(key.toUpperCase())) return { valid: false, message: 'This code has been cancelled.' };
  return checkCode(secret, key) ? { valid: true } : { valid: false, message: 'That license code was not recognised.' };
}

async function verifyGumroad(key) {
  const productId = process.env.GUMROAD_PRODUCT_ID;
  if (!productId) return { valid: false, message: 'Store is not configured yet (GUMROAD_PRODUCT_ID).' };
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: 'true' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) return { valid: false, message: 'That license key was not recognised.' };
  const p = data.purchase || {};
  if (p.refunded || p.chargebacked || p.disputed) return { valid: false, message: 'This purchase was refunded.' };
  const max = Number(process.env.MAX_ACTIVATIONS || 5);
  if (data.uses > max) return { valid: false, message: `This key has been activated on more than ${max} devices. Contact support.` };
  return { valid: true };
}

async function verifyLemonSqueezy(key) {
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({ license_key: key }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.valid) return { valid: false, message: 'That license key was not recognised.' };
  const store = process.env.LEMON_STORE_ID;
  if (store && String(data.meta?.store_id) !== String(store)) {
    return { valid: false, message: 'That license key belongs to a different product.' };
  }
  return { valid: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ valid: false, message: 'Use POST.' });
    return;
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const key = String(body?.key || '').trim();
  if (!key || key.length > 200) {
    res.status(400).json({ valid: false, message: 'Please paste your license key.' });
    return;
  }

  if (process.env.OWNER_KEY && key === process.env.OWNER_KEY) {
    res.status(200).json({ valid: true });
    return;
  }

  try {
    const provider = (process.env.LICENSE_PROVIDER || 'codes').toLowerCase();
    let result;
    if (provider === 'lemonsqueezy') result = await verifyLemonSqueezy(key);
    else if (provider === 'gumroad') result = await verifyGumroad(key);
    else result = verifyCode(key);
    res.status(200).json(result);
  } catch {
    res.status(502).json({ valid: false, message: 'License server is busy. Please try again in a minute.' });
  }
}
