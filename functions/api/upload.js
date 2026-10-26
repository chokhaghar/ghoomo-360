// POST /api/upload?tour=<tour id>&name=<file>.jpg   body: the JPEG   header: Authorization: Bearer <user token>
// Stores one photo of a tour in R2 under u/<user id>/<tour id>/<file>. Only the tour's owner may upload.
import { json, getUser, ownsTour, UUID } from '../_lib/supa.js';

const MAX_BYTES = 15 * 1024 * 1024;
const NAME = /^[a-z0-9][a-z0-9_-]{0,60}\.jpg$/i;
const MAX_FILES = 150;

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const tour = url.searchParams.get('tour') || '', name = url.searchParams.get('name') || '';
  if (!UUID.test(tour) || !NAME.test(name)) return json({ error: 'Galat request.' }, 400);
  if (!/^image\/jpeg\b/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'Sirf JPEG photo.' }, 415);
  if (+(request.headers.get('Content-Length') || 0) > MAX_BYTES) return json({ error: 'Photo 15 MB se badi hai.' }, 413);

  const user = await getUser(env, request);
  if (!user) return json({ error: 'Login zaroori hai.' }, 401);
  if (!(await ownsTour(env, user, tour))) return json({ error: 'Yeh tour aapka nahi hai.' }, 403);

  // a tour holds at most 50 rooms (3 files each): stops runaway uploads into one tour
  const prefix = `u/${user.id}/${tour}/`;
  const have = await env.PHOTOS.list({ prefix, limit: MAX_FILES });
  if (have.objects.length >= MAX_FILES) return json({ error: 'Ek tour mein 50 rooms tak ho sakte hain.' }, 413);

  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ error: 'Photo 15 MB se badi hai.' }, 413);
  const head = new Uint8Array(buf, 0, Math.min(3, buf.byteLength));
  if (buf.byteLength < 64 || head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) return json({ error: 'Yeh JPEG photo nahi hai.' }, 415);

  const key = prefix + name;
  await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' } });
  return json({ key });
}
