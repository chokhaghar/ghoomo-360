# Ghoomo 360 (cloud version)

**Ghar baithe, poora ghar ghoomo.** This branch is the version of Ghoomo 360 with accounts: brokers log in, save tours to the cloud, and share a link that any customer can open without logging in.

- `main` branch: the free static site on GitHub Pages (https://chokhaghar.github.io/ghoomo-360/). Everything stays in the visitor's browser.
- `cloud` branch (this one): the same site plus login, "Mere tours", cloud save and share links. It runs on **Cloudflare Pages** with **Supabase** for login and the database.

**To put it live, follow [CLOUD_SETUP.md](CLOUD_SETUP.md).** Until the settings are filled in, this version behaves exactly like the static site (no login button).

## How it fits together

```
Browser (public/index.html)
  ├─ login, tours list, save ......... Supabase (Auth + Postgres with row-level security), called directly
  ├─ /api/upload, /api/delete,
  │  /api/prune ....................... Pages Functions → check the user with Supabase → R2 bucket
  ├─ /p/<photo> ....................... Pages Function → R2 bucket (or PHOTO_BASE, a separate photo domain)
  └─ /t/<slug> ........................ Pages Function → the app page with the tour's own title and cover photo
                                         for WhatsApp / social previews; the page then shows the tour
```

## Files

| Path | What it is |
| --- | --- |
| `public/index.html` | The whole app: 360° viewer (WebGL2), tour builder, phone capture mode, and the cloud module (login, Mere tours, save, share) |
| `public/demo/`, icons, `manifest.webmanifest`, `_headers` | Sample flat photos, icons, caching rules |
| `functions/api/config.js` | `GET /api/config`: the public settings for the page, from environment variables. Refuses to send a secret key. |
| `functions/api/upload.js` | `POST /api/upload`: stores one JPEG of a tour. Owner only, JPEG only, 15 MB max, 150 files per tour. |
| `functions/api/delete.js` | `POST /api/delete`: deletes a tour's photos, then the tour. Owner only. |
| `functions/api/prune.js` | `POST /api/prune`: after a save, removes photos of rooms that were removed or replaced. |
| `functions/p/[[path]].js` | `GET /p/u/<user>/<tour>/<file>.jpg`: serves a photo from R2 with a one-year cache. |
| `functions/t/[slug].js` | `GET /t/<slug>`: the share link, with the tour's title and cover photo in the preview tags. |
| `functions/_lib/supa.js` | Shared helpers: user check, ownership check, R2 listing. |
| `supabase/schema.sql` | Database: `profiles`, `tours`, row-level security, column grants, limits, and the public share-link functions. |

## Settings (Cloudflare Pages)

| Name | Kind | Value |
| --- | --- | --- |
| `SUPABASE_URL` | Environment variable | `https://<project>.supabase.co` |
| `SUPABASE_KEY` | Environment variable | The **publishable** (`sb_publishable_…`) or legacy **anon** key. Never the secret / service_role key. |
| `PHOTO_BASE` | Environment variable, optional | A separate public photo domain for the R2 bucket, e.g. `https://photos.example.in/`. Leave unset to serve photos through `/p/`. |
| `PHOTOS` | R2 bucket binding | The bucket that stores tour photos |

Build settings: production branch `cloud`, no build command, output directory `public`.

## Security model

- Row-level security: a user reads, changes and deletes only their own tours. The app may write only `title`, `data`, `rooms` and `cover_key`; `owner`, `slug` and `views` are set by the database.
- Share links go through two database functions (`get_public_tour`, `get_public_tour_meta`) that return one tour by its unguessable slug. Nothing else is public.
- Uploads and deletes are checked twice: the user's token is verified with Supabase, and ownership of the tour is checked with that same token (so row-level security decides).
- Photo keys are `u/<user id>/<tour id>/<random name>.jpg`. A user can only write under their own id.
- Limits until paid plans exist: 200 tours per account, 50 rooms per tour.
