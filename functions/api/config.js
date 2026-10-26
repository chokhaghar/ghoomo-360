// GET /api/config: the public settings the page needs, taken from the Pages environment variables so nothing in
// the code has to be edited. Only public values go out: the Supabase URL and its anon / publishable key are meant
// to be public (row-level security protects the data). A secret key is never sent, even if set by mistake.
import { isPublicKey } from '../_lib/supa.js';

export function onRequestGet({ env }) {
  let cfg = {};
  if (env.SUPABASE_URL && env.SUPABASE_KEY) {
    if (isPublicKey(env.SUPABASE_KEY)) cfg = { supabaseUrl: env.SUPABASE_URL, supabaseKey: env.SUPABASE_KEY, photoBase: env.PHOTO_BASE || '/p/' };
    else console.error('SUPABASE_KEY looks like a SECRET key. Use the anon / publishable key. Accounts stay off until fixed.');
  }
  return new Response(`window.GHOOMO_CONFIG = ${JSON.stringify(cfg)};\n`, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
