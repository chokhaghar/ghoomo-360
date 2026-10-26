// POST /api/delete?tour=<tour id>   header: Authorization: Bearer <user token>
// Deletes a tour: all its photos in R2, then the database row. Only the owner may delete.
import { json, getUser, ownsTour, deleteTourRow, listKeys, deleteKeys, UUID } from '../_lib/supa.js';

export async function onRequestPost({ request, env }) {
  const tour = new URL(request.url).searchParams.get('tour') || '';
  if (!UUID.test(tour)) return json({ error: 'Galat request.' }, 400);
  const user = await getUser(env, request);
  if (!user) return json({ error: 'Login zaroori hai.' }, 401);
  if (!(await ownsTour(env, user, tour))) return json({ error: 'Yeh tour aapka nahi hai.' }, 403);

  const keys = await listKeys(env, `u/${user.id}/${tour}/`);
  await deleteKeys(env, keys);
  if (!(await deleteTourRow(env, user, tour))) return json({ error: 'Tour delete nahi hua, dobara try kariye.' }, 502);
  return json({ ok: true, photos: keys.length });
}
