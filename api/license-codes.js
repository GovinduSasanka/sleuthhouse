// Self-issued license codes: an 8-character random ID plus a 4-character HMAC tag.
// Anyone holding LICENSE_SECRET can mint codes; nobody else can forge one.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O/1/I/L confusion

function encode(bytes, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function tag(secret, id) {
  return encode(createHmac('sha256', secret).update(`sleuthhouse:${id}`).digest(), 4);
}

export function makeCode(secret) {
  const id = encode(randomBytes(8), 8);
  const t = tag(secret, id);
  return `SLEUTH-${id.slice(0, 4)}-${id.slice(4)}-${t}`;
}

export function checkCode(secret, code) {
  const m = String(code).toUpperCase().replace(/\s+/g, '').match(/^SLEUTH-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
  if (!m || !secret) return false;
  const expected = Buffer.from(tag(secret, m[1] + m[2]));
  const given = Buffer.from(m[3]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
