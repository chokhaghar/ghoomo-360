// GET /t/<slug>: the shared tour link. Serves the app page with the tour's own title and cover photo in the
// preview tags, so WhatsApp / Facebook show the property instead of the generic Ghoomo 360 card.
import { publicTourMeta } from '../_lib/supa.js';

const SLUG = /^[A-Za-z0-9_-]{4,40}$/;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setMeta(html, attr, name, value) {
  const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`);
  return html.replace(re, (all, a, b) => a + esc(value) + b);
}

export async function onRequestGet({ request, env, params }) {
  const page = await env.ASSETS.fetch(new URL('/', request.url));
  let html = await page.text();
  const slug = String(params.slug || '');
  if (SLUG.test(slug)) {
    try {
      const m = await publicTourMeta(env, slug);
      if (m) {
        const title = `${m.title} · 360° tour`;
        const desc = `${m.rooms} room${m.rooms === 1 ? '' : 's'} ka 360° walk-through. Ghar baithe poora ghar ghoomiye.`;
        const link = new URL('/t/' + slug, request.url).toString();
        html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
        html = setMeta(html, 'name', 'description', desc);
        html = setMeta(html, 'property', 'og:title', title);
        html = setMeta(html, 'property', 'og:description', desc);
        html = setMeta(html, 'property', 'og:url', link);
        html = setMeta(html, 'name', 'twitter:title', title);
        html = setMeta(html, 'name', 'twitter:description', desc);
        if (m.cover_key) {
          const base = env.PHOTO_BASE ? String(env.PHOTO_BASE).replace(/\/?$/, '/') : new URL('/p/', request.url).toString();
          const img = base + m.cover_key;
          html = setMeta(html, 'property', 'og:image', img);
          html = setMeta(html, 'name', 'twitter:image', img);
          html = setMeta(html, 'property', 'og:image:width', '1024');
          html = setMeta(html, 'property', 'og:image:height', '512');
        }
      }
    } catch (e) { /* the page still works without the custom preview */ }
  }
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' } });
}
