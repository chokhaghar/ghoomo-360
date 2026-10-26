# Ghoomo 360 Cloud: live karne ke steps

Is setup ke baad website par yeh sab chalega:

- **Login**: Google se, ya email par aaye 6 digit code se. Password ki zaroorat nahi.
- **Mere tours**: har broker ke saare tours unke account mein save rahenge. Kisi bhi phone ya computer se khulenge.
- **Save karo aur link pao**: tour ki photos cloud mein jaati hain aur ek link milta hai, jaise `.../t/3fa9c01b2e`.
- **Share link**: customer bina login ke link kholta hai aur poora 360° tour ghoomta hai. WhatsApp par property ki photo aur naam ke saath preview dikhta hai.
- **Views**: har tour kitni baar dekha gaya, "Mere tours" mein dikhta hai.

Saare accounts **aapke naam par** banenge. Passwords aur secret keys sirf dashboards mein daalni hain, chat mein kabhi nahi.

---

## Kya chahiye (sab free se shuru)

| Account | Kis kaam ka | Kharcha |
| --- | --- | --- |
| GitHub | Code (yeh repo) | Free |
| Cloudflare | Website, server functions, photo storage (R2) | Free se shuru. R2 chalu karte waqt card maang sakta hai. 10 GB photos tak free. |
| Supabase | Login aur database | Free se shuru. Launch par Pro ($25/mahina) lijiye: free project 7 din koi activity na ho to ruk jaata hai. |
| Brevo | Login code wale emails bhejna | Free plan (roz ~300 emails; current limit Brevo ki site par dekh lein) |
| Domain (jaise `ghoomo360.in`) | Apna naam, aur emails spam mein na jaayein | ~₹800–1,200/saal |
| Google Cloud | "Google se login" button | Free |

---

## Step 1: Supabase project banao

1. [supabase.com](https://supabase.com) par login karke **New project**.
2. Name: `ghoomo-360`. **Database password**: strong rakho aur password manager mein save karo.
3. Region: **South Asia (Mumbai)**. **Create** dabao, 1–2 minute rukiye.
4. Left menu mein **SQL Editor** → **New query**. Is repo ki file `supabase/schema.sql` poori copy karke paste karo → **Run**. Neeche "Success" aana chahiye. (Yeh dobara chalana bhi safe hai.)
5. **Project Settings → API Keys** (ya **Settings → API**). Do cheezein note karo:
   - **Project URL**, jaise `https://abcdxyz.supabase.co`
   - **Publishable key** (`sb_publishable_...` se shuru hoti hai). Agar sirf purani keys dikhein to **anon public** key (`eyJ...`).

> **Dhyan do:** `secret` ya `service_role` key kabhi mat use karna. Woh database ki master chaabi hai. Galti se daal bhi di to website use browser ko nahi bhejegi aur login band rahega, jab tak sahi key na lagao.

## Step 2: Email code wala login

1. **Authentication → Emails → Templates**.
2. **Magic Link** template kholo. Subject aur body aisi rakho (code `{{ .Token }}` zaroor ho):
   - Subject: `Ghoomo 360 login code: {{ .Token }}`
   - Body:
     ```html
     <h2>Ghoomo 360</h2>
     <p>Aapka login code:</p>
     <p style="font-size:28px;font-weight:700;letter-spacing:4px">{{ .Token }}</p>
     <p>Yeh code 15 minute chalega. Aapne login nahi maanga tha to is email ko ignore kariye.</p>
     ```
3. **Confirm signup** template mein bhi yahi subject aur body daalo. (Pehli baar aane wale broker ko kabhi-kabhi yeh wala email jaata hai.)
4. **Authentication → Sign In / Providers → Email**: Email provider ON rahe. **Email OTP Expiration** `900` (15 minute) kar do.

### Emails bhejne ke liye Brevo (zaroori)

Supabase ka apna email system sirf aapki team ke emails par code bhejta hai, aur ghante mein 2 hi. Asli brokers ke liye apna SMTP chahiye:

1. [brevo.com](https://www.brevo.com) par account. **Senders, Domains & Dedicated IPs** mein apna domain jodo aur Brevo jo SPF/DKIM DNS records de, woh domain ke DNS mein daalo.
2. Sender banao: `no-reply@aapka-domain.in`.
3. **Settings → SMTP & API → SMTP** tab → **Generate SMTP key**. (API key nahi, SMTP key.)
4. Supabase mein **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:
   - Sender email: `no-reply@aapka-domain.in` · Sender name: `Ghoomo 360`
   - Host: `smtp-relay.brevo.com` · Port: `587`
   - Username: Brevo login email · Password: SMTP key
5. **Authentication → Rate Limits**: emails per hour `100` kar do.

> Domain abhi nahi hai? Testing ke liye Supabase organisation ki **Team** mein jo email hai, us par code aa jayega (ghante mein 2). Asli launch se pehle domain + Brevo zaroor lagao.

## Step 3: Google se login (recommended)

1. [console.cloud.google.com](https://console.cloud.google.com) → naya project `Ghoomo 360`.
2. **Google Auth Platform** (purane naam: OAuth consent screen): App name `Ghoomo 360`, support email, audience **External**. App ko **Publish** karo (Testing mode mein sirf test users login kar paate hain).
3. **Clients / Credentials → Create OAuth client ID** → type **Web application**.
   - **Authorized redirect URI**: `https://<aapka-project>.supabase.co/auth/v1/callback` (Step 1 ka Project URL + `/auth/v1/callback`).
4. Client ID aur Client Secret copy karo.
5. Supabase → **Authentication → Sign In / Providers → Google** → Enable, dono paste karo → **Save**.

## Step 4: Supabase ko website ka pata batao

**Authentication → URL Configuration**:

- **Site URL**: `https://ghoomo-360.pages.dev`
- **Redirect URLs** mein add karo: `https://ghoomo-360.pages.dev/**`

(Apna domain lagne par uske liye bhi yahi dono add karna, Step 8.)

## Step 5: Photos ke liye Cloudflare R2 bucket

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage**. Pehli baar ho to R2 chalu karo.
2. **Create bucket** → name `ghoomo-photos` → Location: Automatic → Create.
3. Bas. Bucket ko public karne ki zaroorat **nahi** hai: photos website ke apne `/p/` address se jaati hain.

## Step 6: Website (Cloudflare Pages)

1. **Workers & Pages → Create → Pages → Connect to Git**. GitHub account jodo aur repo `chokhaghar/ghoomo-360` chuno.
2. Settings:
   - Project name: `ghoomo-360` (isi se address banega: `ghoomo-360.pages.dev`)
   - **Production branch: `cloud`** (zaroori: `main` nahi)
   - Framework preset: **None**
   - Build command: khali chhodo (agar zaroori bole to `exit 0`)
   - **Build output directory: `public`**
   - Root directory: khali
3. **Environment variables** (Production) add karo:
   - `SUPABASE_URL` = Step 1 ka Project URL
   - `SUPABASE_KEY` = Step 1 ki publishable (ya anon) key
4. **Save and Deploy**.
5. Deploy hone ke baad project ke **Settings → Bindings → Add → R2 bucket**:
   - Variable name: **`PHOTOS`** (bilkul aise hi, capital mein)
   - Bucket: `ghoomo-photos` → Save.
6. **Deployments** → latest deployment → **Retry deployment**. (Variables aur bindings naye deploy se hi lagte hain.)

> Agar `ghoomo-360` naam pehle se liya hua ho to Cloudflare doosra address dega. Woh address Step 4 mein daalo aur mujhe batao: main WhatsApp preview ke liye site ko us address ke saath dobara bana dunga.

## Step 7: Check karo

1. `https://ghoomo-360.pages.dev` kholo. Upar left mein **Login** button dikhna chahiye.
2. Email daalo → code aaya → login → **Mere tours** khulega.
3. **Naya tour (photos se)** → **Use sample photos** → **Save karo aur link pao**.
4. Link phone par kholo (bina login). Tour chalna chahiye. **Mere tours** mein views badhne chahiye.
5. Link WhatsApp par bhejo: property ki photo ke saath preview aana chahiye.

### Kuch na chale to

| Dikkat | Kya karein |
| --- | --- |
| Login button hi nahi dikh raha | `https://ghoomo-360.pages.dev/api/config` kholo. Agar `{}` dikhe to `SUPABASE_URL` / `SUPABASE_KEY` galat ya missing hai, ya secret key daal di. Theek karke **Retry deployment**. |
| Code wala email nahi aaya | Spam dekho. Brevo → Transactional → Email logs dekho. SMTP settings aur template mein `{{ .Token }}` check karo. |
| Google: `redirect_uri_mismatch` | Google Console ka redirect URI bilkul `https://<project>.supabase.co/auth/v1/callback` ho. |
| Google login ke baad site par login nahi hua | Step 4 ke Redirect URLs mein site ka address hai ya nahi, check karo. |
| Save par "Save nahi hua" | `PHOTOS` binding (Step 6.5) lagi hai ya nahi, phir **Retry deployment**. |
| Link par "Yeh tour nahi mila" | Tour delete ho chuka hai ya link adhoora copy hua. |

## Step 8 (baad mein): Apna domain

1. Pages project → **Custom domains** → `www.aapka-domain.in` (aur bina www wala) add karo. Domain Cloudflare par ho to DNS apne aap ban jaata hai.
2. Supabase **URL Configuration**: Site URL naya domain, aur Redirect URLs mein `https://www.aapka-domain.in/**`.
3. Google Console mein kuch badalna nahi padta (redirect Supabase ka hi rehta hai).
4. Mujhe naya domain batao: WhatsApp preview ke liye site dobara bana dunga.

### Bahut traffic aane par (optional)

Abhi har photo website ke `/p/` address se jaati hai (Cloudflare free plan mein roz 1 lakh requests tak). Jab tours bahut dekhe jaane lagein:

1. R2 bucket → **Settings → Custom Domains** → `photos.aapka-domain.in`.
2. Bucket → **Settings → CORS policy**:
   ```json
   [{ "AllowedOrigins": ["https://www.aapka-domain.in"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```
3. Pages → Environment variables: `PHOTO_BASE` = `https://photos.aapka-domain.in/` → Retry deployment.

Purane saare tours waise hi chalte rahenge.

---

## Suraksha (short mein)

- Har broker sirf apne tours dekh, badal aur delete kar sakta hai (database ka row-level security).
- Photos sirf tour ka maalik upload kar sakta hai; sirf JPEG, 15 MB tak, ek tour mein 50 rooms tak, ek account mein 200 tours tak.
- Tour delete karne par uski saari photos bhi delete hoti hain aur link band ho jaata hai.
- Share link wala koi bhi tour dekh sakta hai (yahi uska kaam hai). Link andaaza lagake nahi banaya ja sakta.
