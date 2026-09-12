import { CONFIG } from './config.js';

const STORAGE_KEY = 'sleuthhouse.license';

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isPro() {
  const lic = read();
  return Boolean(lic && lic.valid);
}

export async function activate(key) {
  const trimmed = String(key || '').trim();
  if (!trimmed) return { valid: false, message: 'Please paste your license key.' };
  let data;
  try {
    const res = await fetch(CONFIG.verifyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: trimmed }),
    });
    data = await res.json();
  } catch {
    return { valid: false, message: 'Could not reach the license server. Check your connection and try again.' };
  }
  if (data.valid) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ valid: true, key: trimmed, at: Date.now() }));
    } catch {
      // Private browsing: Pro still works for this visit.
    }
  }
  return data;
}

export function deactivate() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

export function allowedByFree(settings) {
  const f = CONFIG.free;
  const reasons = [];
  if (!f.difficulties.includes(settings.difficulty)) reasons.push('difficulty');
  if (!f.cases.includes(settings.caseType)) reasons.push('case');
  if ((settings.suspects || []).length > f.maxSuspects) reasons.push('suspects');
  return { ok: reasons.length === 0, reasons };
}
