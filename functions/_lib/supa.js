// Shared helpers for the Ghoomo 360 server functions (Cloudflare Pages Functions).
// Environment: SUPABASE_URL, SUPABASE_KEY (anon / publishable key), PHOTO_BASE; R2 binding PHOTOS.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

const base = env => String(env.SUPABASE_URL || '').replace(/\/$/, '');

// the anon / publishable key is public by design; a secret (service_role) key must never reach a browser
export function isPublicKey(k) {
  k = String(k || '');
  if (/^sb_publishable_/i.test(k)) return true;
  if (/^eyJ/.test(k)) {
    try { return JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch (e) { return false; }
  }
  return false;
}

// headers for calls made without a logged-in user (legacy anon keys are JWTs and also go in Authorization)
export function keyHeaders(env) {
  const h = { apikey: env.SUPABASE_KEY };
  if (/^eyJ/.test(env.SUPABASE_KEY || '')) h.Authorization = 'Bearer ' + env.SUPABASE_KEY;
  return h;
}

// the logged-in user behind this request, checked with Supabase itself (null when missing or expired)
export async function getUser(env, request) {
  const m = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!m) return null;
  const r = await fetch(base(env) + '/auth/v1/user', { headers: { apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + m[1] } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? { id: u.id, email: u.email, token: m[1] } : null;
}

// true only when this user owns the tour (row-level security answers with the user's own token)
export async function ownsTour(env, user, tourId) {
  const r = await fetch(base(env) + '/rest/v1/tours?select=id&id=eq.' + encodeURIComponent(tourId), {
    headers: { apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + user.token },
  });
  if (!r.ok) return false;
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) && rows.length === 1;
}

export async function deleteTourRow(env, user, tourId) {
  const r = await fetch(base(env) + '/rest/v1/tours?id=eq.' + encodeURIComponent(tourId), {
    method: 'DELETE', headers: { apikey: env.SUPABASE_KEY, Authorization: 'Bearer ' + user.token, Prefer: 'return=minimal' },
  });
  return r.ok;
}

export async function publicTourMeta(env, slug) {
  const r = await fetch(base(env) + '/rest/v1/rpc/get_public_tour_meta', {
    method: 'POST', headers: { ...keyHeaders(env), 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }),
  });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function listKeys(env, prefix) {
  const keys = []; let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1000 });
    for (const o of page.objects) keys.push(o.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

export async function deleteKeys(env, keys) {
  for (let i = 0; i < keys.length; i += 1000) await env.PHOTOS.delete(keys.slice(i, i + 1000));
}
