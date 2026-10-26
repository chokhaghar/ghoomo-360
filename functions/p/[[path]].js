// GET /p/u/<user id>/<tour id>/<file>.jpg: a tour photo, read from the R2 bucket (binding PHOTOS).
// This lets the site work with no extra domain. Later, when traffic grows, give the bucket its own domain and set
// PHOTO_BASE to it: the same keys work there and photos then skip this function entirely.
const KEY = /^u\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9][A-Za-z0-9_-]{0,60}\.jpg$/;

export async function onRequestGet({ request, env, params }) {
  const key = [].concat(params.path || []).join('/');
  if (!KEY.test(key) || !env.PHOTOS) return new Response('Not found', { status: 404 });
  const obj = await env.PHOTOS.get(key, { onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  if (obj.writeHttpMetadata) obj.writeHttpMetadata(headers);
  headers.set('Content-Type', 'image/jpeg');
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');   // a key never changes: new photos get new names
  headers.set('X-Content-Type-Options', 'nosniff');
  if (!obj.body) return new Response(null, { status: 304, headers });   // the browser already has it
  return new Response(obj.body, { headers });
}
export const onRequestHead = onRequestGet;
