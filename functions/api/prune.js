// POST /api/prune?tour=<tour id>   body: {"keep": ["u/.../a.jpg", ...]}   header: Authorization: Bearer <user token>
// After a tour is saved again, removes its photos that are no longer used (deleted or replaced rooms).
import { json, getUser, ownsTour, listKeys, deleteKeys, UUID } from '../_lib/supa.js';

export async function onRequestPost({ request, env }) {
  const tour = new URL(request.url).searchParams.get('tour') || '';
  if (!UUID.test(tour)) return json({ error: 'Galat request.' }, 400);
  const user = await getUser(env, request);
  if (!user) return json({ error: 'Login zaroori hai.' }, 401);
  if (!(await ownsTour(env, user, tour))) return json({ error: 'Yeh tour aapka nahi hai.' }, 403);

  const body = await request.json().catch(() => null);
  const keep = new Set(Array.isArray(body && body.keep) ? body.keep.filter(k => typeof k === 'string') : []);
  if (!keep.size) return json({ error: 'Kuch rakhna to hoga.' }, 400);      // never wipe a tour by mistake
  const prefix = `u/${user.id}/${tour}/`;
  const gone = (await listKeys(env, prefix)).filter(k => !keep.has(k));
  await deleteKeys(env, gone);
  return json({ ok: true, removed: gone.length });
}
