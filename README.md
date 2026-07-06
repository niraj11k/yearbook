# The Yearbook — School Friends Yearbook Web App

A private, one-page yearbook site for old school friends. Sign in, keep your
own entry current, read everyone's memories — and see updates from the group
without refreshing.

The build follows `school-yearbook-prompt.md`: an ultra-premium, minimal
one-pager in the spirit of Linear, Mercury, and Wealthsimple — white
background, Inter typography, a single emerald accent, restrained motion —
implemented as a **single React component with Tailwind CSS and Lucide
icons**. All functionality from the PRD is preserved and the backend follows
the architecture doc (Supabase + Cloudflare Pages, RLS as the security layer).

---

## What's in the box

```
yearbook/
├── App.jsx                ← the whole site: one React component (also opens as a live preview)
├── web/                   ← deployable Vite project wrapping that component
│   ├── index.html         ← loads Tailwind + mounts the app
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx        ← same component (this is the file you edit)
├── supabase/
│   └── schema.sql         ← tables, triggers, RLS policies, storage, realtime
└── README.md
```

---

## Demo mode vs production mode

The same app runs in two modes. You choose by whether Supabase keys are set
in `web/src/App.jsx`.

| | **Demo mode** | **Production mode** |
|---|---|---|
| **When** | `SUPABASE_URL` and `SUPABASE_ANON_KEY` are empty | Both constants are filled in |
| **Sign-in** | Any email works instantly — no email sent | Magic link to your real inbox |
| **Data** | Stays in your browser (`localStorage`) | Lives in Supabase (Postgres + Storage) |
| **Profile photos** | Optional; preview saved in the browser | Optional; uploaded to Supabase Storage |
| **Live updates** | One simulated update after ~8 s | Real updates from classmates every ~15 s |
| **Who sees what** | Only you, on this device | Everyone signed in to the group |
| **Deploy** | Not needed to try the UI | Cloudflare Pages + Supabase (free) |

**Recommended path:** run demo mode first to check the design and flows, then
switch to production mode when you're ready to invite the class.

---

# Part 1 — Demo mode (local, no backend)

Try the full UI in under two minutes. Nothing leaves your browser and no
accounts are required.

### Step 1.1 — Prerequisites

- **Node.js 18+** (20 LTS recommended) — `node -v`
- **npm** — `npm -v`

You do **not** need Supabase or Cloudflare for demo mode.

### Step 1.2 — Install and run

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173**. The footer should say **"Demo mode — nothing
leaves your browser"**.

### Step 1.3 — Try the flows

1. **Browse the yearbook** — eight fictional classmates load after a short
   skeleton state. Click a card to open the detail modal.
2. **Sign in** — scroll to **My details**, enter any email (e.g.
   `you@test.com`), and click **Sign in**. No email is sent.
3. **Fill in your profile** — name, nickname, occupation, memories, etc.
4. **Add a photo (optional)** — click **Add photo**, pick a JPG/PNG/WebP/GIF
   (max 2 MB), then **Save my details**. Your photo appears on your card and
   in the modal. Click **Remove** to clear it. Classmates without a photo
   show initials instead.
5. **Privacy toggles** — flip **Share my date of birth** / **Share my current
   address** and confirm locked fields show "Private" on other profiles.
6. **Admin preview** — sign out, sign in again with an email starting with
   `admin` (e.g. `admin@test.com`). Open someone's profile modal to see
   **Hide / Unhide profile**.
7. **Live update** — after ~8 seconds, one classmate's card pulses and a
   toast notes the change (simulated).

Edits and photos persist if you refresh the page (stored in `localStorage`).
Open a private window to see the site as a fresh visitor.

### Step 1.4 — When you're happy with the UI

Leave the Supabase constants empty and move to **Part 2** when you want a
real yearbook for the group.

---

# Part 2 — Production mode (Supabase + local testing)

Connect the app to a real backend. Profile text goes to Postgres; photos go
to Supabase Storage (free tier). The database only stores the file path, not
the image bytes.

### Step 2.1 — Prerequisites

Everything from Part 1, plus:

- A free **Supabase** account — [supabase.com](https://supabase.com)
- **Git** — needed later for Cloudflare deploy; `git --version`

### Step 2.2 — Create the Supabase project AppleScienceStruck12!

1. **New project** (Free plan). Pick a region close to your group.
2. Open **SQL Editor**, paste the full contents of `supabase/schema.sql`,
   and **Run**. This creates:
   - the `profiles` table (PRD fields + consent and moderation flags),
   - `photo_path` — optional; points at a file in Storage,
   - a trigger that auto-creates a profile on sign-up,
   - Row Level Security — users write only their own row; admins moderate,
   - the `profile-photos` Storage bucket (2 MB limit, images only),
   - realtime publication for live updates.

   The script is idempotent — safe to re-run on an existing project.

3. **Authentication → Providers** — confirm **Email** is enabled (magic
   links, no passwords).
4. **Project Settings → API** — copy:
   - **Project URL** — e.g. `https://abcd1234.supabase.co`
   - **anon public key** — safe in the browser; RLS protects the data.
     Never expose the `service_role` key.

5. **Storage → Buckets** — confirm `profile-photos` exists. If not, re-run
   `schema.sql`.

### Step 2.3 — Connect the app

Open `web/src/App.jsx` and set the two constants at the top:

```js
const SUPABASE_URL      = "https://abcd1234.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Restart `npm run dev` if it was already running. Demo mode turns off
automatically once both values are set. The footer should no longer say
"Demo mode".

> The app uses Supabase's plain REST API (`fetch()`) — no SDK. RLS applies
> to every request. The browser polls every 15 seconds so updates from others
> appear without a manual refresh.

### Step 2.4 — Point magic links at localhost

In Supabase: **Authentication → URL Configuration**

- **Site URL** → `http://localhost:5173`
- **Redirect URLs** → add `http://localhost:5173`

### Step 2.4b — Custom SMTP (required for production)

Supabase's built-in email is capped at ~2/hour. For a live yearbook, connect
**Resend** via custom SMTP. You do **not** need mail hosting or SMTP already
set up on your domain — Resend sends on your behalf once DNS is verified.

See **Step 2.4c** for a full walkthrough using an existing domain (e.g.
`prompt-genie.in`). Quick reference:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` (no trailing spaces) |
| Port | `587` (try `465` if 587 fails) |
| Username | `resend` |
| Password | Your Resend API key |
| Sender email | `noreply@your-verified-domain.com` |
| Sender name | e.g. `Class of 2002 Yearbook` |

Then raise **Authentication → Rate Limits → Email** (e.g. 30/hour).

### Step 2.4c — Email setup with an existing domain

Use this when you already own a domain (e.g. `prompt-genie.in`) but have **no
SMTP or inbox configured** for it. Resend only needs DNS records — it does
not use your domain's mail server.

**Hosting vs email are separate:**

| Purpose | Example | Where to set it |
|---|---|---|
| Host the yearbook site | `https://your-yearbook.netlify.app` or `https://yearbook.prompt-genie.in` | Netlify / Cloudflare Pages |
| Send magic-link emails | `noreply@prompt-genie.in` | Resend + Supabase SMTP |
| Magic link lands user on | Your deployed site URL | Supabase URL Configuration |

A Netlify `*.netlify.app` URL works for the **site and redirects**, but
**cannot** be used as the email sender — you need a domain you control DNS
for (like `prompt-genie.in`).

---

#### Part A — Resend (one-time setup)

1. **Create a Resend account** — [resend.com](https://resend.com) (free tier:
   3,000 emails/month).

2. **Create an API key** — [resend.com/api-keys](https://resend.com/api-keys)
   - Click **Create API key**
   - Name: e.g. `yearbook-supabase`
   - Permission: **Sending access** is enough for SMTP
   - (Optional) Restrict to `prompt-genie.in` if you add that domain first
   - Copy the key — you only see it once. Store it safely (e.g. `.env.local`
     as `RESEND_API_KEY=` — never commit this file).

3. **Add your domain** — [resend.com/domains](https://resend.com/domains)
   - Click **Add domain**
   - Enter `prompt-genie.in` (or a subdomain like `send.prompt-genie.in` —
     subdomains are often recommended to keep auth email separate from your
     main site email)
   - Resend shows DNS records to add (typically **SPF** and **DKIM** TXT
     records, sometimes **MX** if you enable receiving — you can skip
     receiving for magic links only)

4. **Add DNS records** — in the DNS panel where `prompt-genie.in` is managed
   (Cloudflare, Namecheap, Google Domains, etc.):
   - Copy each record **exactly** from Resend (host/name, type, value)
   - For Cloudflare: set proxy status to **DNS only** (grey cloud) on TXT
     records if verification stalls
   - Click **Verify** in Resend; status must show **Verified** (can take a
     few minutes up to 48 hours)

5. **If you already use email on `@prompt-genie.in`** (Gmail, Zoho, etc.):
   - **DKIM** — Resend uses its own subdomain; usually no conflict
   - **SPF** — merge into one TXT record, e.g.  
     `v=spf1 include:_spf.google.com include:amazonses.com ~all`  
     (use the exact `include:` values Resend shows in their dashboard)
   - You are **not** replacing your inbox — only authorizing Resend to send
     auth emails from addresses like `noreply@prompt-genie.in`

6. **Confirm in Resend** — **Domains** page shows **Verified** before
   continuing.

**Resend checklist**

| # | Item | Done when |
|---|---|---|
| 1 | Resend account created | You can log in |
| 2 | API key created (Sending access) | Key copied to a safe place |
| 3 | Domain `prompt-genie.in` (or subdomain) added | Listed in Domains |
| 4 | SPF + DKIM DNS records published | Resend shows **Verified** |
| 5 | (Optional) Test send in Resend → Emails | Email appears in Resend logs |

---

#### Part B — Supabase (connect Resend to auth emails)

1. Open your project → **Authentication** → **Email** → **SMTP Settings**

2. Enable **Custom SMTP** and fill in:

   | Supabase field | Value |
   |---|---|
   | **Enable custom SMTP** | On |
   | **Sender email** | `noreply@prompt-genie.in` — must match your **verified** Resend domain exactly |
   | **Sender name** | `Class of 2002 Yearbook` (shown in classmates' inboxes) |
   | **Host** | `smtp.resend.com` — no leading/trailing spaces |
   | **Port** | `587` (STARTTLS). If it fails, try `465` |
   | **Username** | `resend` |
   | **Password** | Your Resend API key (paste carefully, no spaces) |
   | **Minimum interval between emails** | `60` seconds or lower for auth flows |

3. Click **Save**.

4. **Authentication → Rate Limits**
   - Raise **Rate limit for sending emails** (e.g. `30` or `100` per hour)
   - Default after custom SMTP is often low; increase before inviting the class

5. **Authentication → URL Configuration** (local dev)

   | Field | Value |
   |---|---|
   | **Site URL** | `http://localhost:5173` |
   | **Redirect URLs** | `http://localhost:5173` |

6. **Authentication → Providers → Email**
   - **Email** enabled
   - **Confirm email** — leave on (magic links use confirmation emails for new users)
   - **Secure email change** — optional

7. **Test** — in the app enter a real email → **Send link**.

8. **If it fails** — check:
   - **Supabase → Authentication → Logs** (note the log / error ID)
   - **Resend → Emails** (bounces, domain errors, 403 sandbox errors)
   - Sender address uses verified domain (not `onboarding@resend.dev`)

**Supabase checklist**

| # | Item | Value / location |
|---|---|---|
| 1 | Custom SMTP enabled | Authentication → Email → SMTP Settings |
| 2 | Sender email on verified domain | e.g. `noreply@prompt-genie.in` |
| 3 | SMTP host / port / credentials | `smtp.resend.com`, `587`, user `resend`, password = API key |
| 4 | Email rate limit raised | Authentication → Rate Limits |
| 5 | Site URL + Redirect URLs | `localhost:5173` for dev; live URL after deploy (Step 3.3) |
| 6 | Email provider enabled | Authentication → Providers → Email |
| 7 | Magic link test succeeds | Link arrives; clicking it signs you in |

---

#### Part C — After you deploy (production URLs)

When the site is live on Netlify (`https://your-yearbook.netlify.app`) or
Cloudflare Pages, update **only** Supabase URL settings — Resend SMTP stays
the same:

| Supabase field | Production value |
|---|---|
| **Site URL** | `https://your-yearbook.netlify.app` (or your custom domain) |
| **Redirect URLs** | Same URL + keep `http://localhost:5173` if you still develop locally |

**No changes needed in Resend** when you deploy — sender domain and API key
stay the same.

**Optional:** add a custom domain in Netlify/Cloudflare (e.g.
`yearbook.prompt-genie.in`) and add that URL to Supabase **Redirect URLs**
as well. Email can still send from `noreply@prompt-genie.in`.

---

#### No domain yet?

| Phase | What to do |
|---|---|
| **Now** | Use **demo mode** (empty Supabase keys) or test magic links with **only your Resend account email** via `onboarding@resend.dev` |
| **Before inviting class** | Verify `prompt-genie.in` (or any domain you own) in Resend, then complete Part A + B above |

`onboarding@resend.dev` cannot send magic links to arbitrary classmates —
only to the email you used to sign up for Resend.

### Step 2.5 — Test sign-in and profile save

With `npm run dev` running:

1. Enter your real email → **Send link**.
2. Click the link in your inbox — you land on localhost, signed in, with a
   blank profile row auto-created.
3. Fill in your details, toggle consent switches, and **Save my details**.
4. In Supabase **Table Editor → profiles**, confirm your row (text fields
   only — no image data in the database).

### Step 2.6 — Test profile photos (optional)

Photos are entirely optional. Classmates without one keep the initials
avatar.

1. In **My details**, click **Add photo** and choose an image (JPG, PNG,
   WebP, or GIF; max 2 MB).
2. **Save my details**.
3. Confirm in Supabase:
   - **Table Editor → profiles** — `photo_path` is set (e.g.
     `<your-uuid>/avatar.jpg`)
   - **Storage → profile-photos** — the image file is there
4. Your photo should appear on your yearbook card and in the profile modal.
5. Click **Remove**, save again — `photo_path` clears and the file is
   removed from Storage.

### Step 2.7 — Test privacy and multi-user access

1. Open a second browser (or private window), sign in with a different
   email.
2. Confirm you can **see** the first profile but **not edit** it.
3. Confirm DOB and address show **Private** unless the owner enabled sharing.
4. Confirm you can see a classmate's photo if they uploaded one.

### Step 2.8 — Make yourself an admin (recommended)

After your first sign-in, run in the **SQL Editor**:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

Reload the site. Every profile modal now has **Hide / Unhide profile**.
Hidden profiles disappear for the group but stay visible to you (marked
"Hidden from the group").

### Step 2.9 — Production build check (local)

```bash
npm run build      # outputs static files to web/dist
npm run preview    # serves the built site at http://localhost:4173
```

If the preview matches dev, you're ready to deploy. `web/dist/` is what
Cloudflare will serve.

---

# Part 3 — Deploy to production (Cloudflare Pages)

Deploy the static site so the class can use it from anywhere. Supabase stays
your backend — no server to run.

### Step 3.1 — Push to GitHub

```bash
cd ..                            # back to the project root
git init
git add .
git commit -m "School friends yearbook"
git branch -M main
git remote add origin https://github.com/<you>/school-yearbook.git
git push -u origin main
```

Add `web/node_modules` to `.gitignore` if Git picks it up (Vite's scaffold
usually handles this).

Skip Git and use direct upload in Step 3.2 Option B if you prefer.

### Step 3.2 — Create the Cloudflare Pages project

**Option A — Git-connected (recommended: every push redeploys):**

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to
   Git** → select your repo.
2. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - **Root directory: `web`** (the Vite project lives in this subfolder)
3. **Save and Deploy.** You get a `https://<project>.pages.dev` URL.

**Option B — Direct upload:** run `npm run build` locally, then **Workers &
Pages → Create → Pages → Direct Upload** and drag in `web/dist/`. Re-upload
when you change the site.

> **Important:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are baked into the
> built JavaScript. Set them in `web/src/App.jsx` **before** `npm run build`
> or before Cloudflare builds from Git.

### Step 3.3 — Point Supabase at the live site

**Authentication → URL Configuration**:

- **Site URL** → `https://<project>.pages.dev`
- **Redirect URLs** → add the live URL (keep `http://localhost:5173` if you
  still develop locally)

Without this, magic links from production will bounce to localhost.

### Step 3.4 — Smoke-test production

1. Open the live URL.
2. Sign in with a magic link.
3. Save a profile edit (with or without a photo).
4. Open the site on your phone — the edit should appear within ~15 seconds
   with a soft pulse and toast.

### Step 3.5 — Invite the class

Share the URL. Friends sign in with their email; a blank entry is created
automatically.

For a strictly invite-only group: **Authentication → Sign In / Up → Allow
new users to sign up: off**, then invite each address via **Authentication
→ Users → Invite user**.

Remind people that **profile photos are optional** — initials work fine if
they prefer not to upload one.

### Step 3.6 — Custom domain (optional)

Pages project → **Custom domains** → e.g. `yearbook.yourdomain.com`.
Cloudflare handles the certificate. Add the domain to Supabase **Redirect
URLs** as well.

---

## How it works in production

1. **Someone opens the site.** Cloudflare Pages serves static assets from
   the edge — fast globally, free.
2. **They sign in.** Supabase Auth emails a one-time link; the session is
   stored in the browser. No passwords.
3. **They browse the yearbook.** The REST API returns profiles allowed by
   RLS: visible entries for members, everything for admins, nothing for
   strangers.
4. **They update their page.** Text fields upsert to `profiles`. RLS ensures
   only `id = auth.uid()` is writable.
5. **They add a photo (optional).** The image uploads to Storage; only
   `photo_path` is saved on the profile row. Remove clears both.
6. **Everyone stays current.** Open browsers poll every 15 seconds; changed
   cards pulse and a toast names who updated.
7. **Privacy stays user-controlled.** DOB and address show a lock unless
   the owner opted in. Owners and admins always see their own details.
8. **Admins moderate.** Hiding a profile removes it from the group view;
   unhiding restores it.

### Cost

| Service | Plan | Cost |
|---|---|---|
| Cloudflare Pages | Free | $0 |
| Supabase | Free | $0 — 500 MB DB, 1 GB Storage, 50k MAU |

Supabase free projects **pause after ~1 week of inactivity**; the first
visit afterwards may be slow until the project wakes. An active group
never notices.

### Ongoing maintenance

- **App changes:** edit `web/src/App.jsx` → test in demo or dev → `git push`
  (Cloudflare redeploys) or re-upload `dist/`.
- **Schema / Storage changes:** edit `supabase/schema.sql`, re-run in the
  SQL Editor (idempotent).
- **New admin:** run the admin SQL snippet with their email.
- **Switch back to demo:** clear both Supabase constants in `App.jsx` and
  restart dev — useful for UI experiments without touching live data.

  **SQL Query to add multiple admins**

```
update public.profiles set is_admin = true
where id in (
  select id from auth.users
  where email in (
    'you@example.com',
    'co-organizer@example.com',
    'another-admin@example.com'
  )
);
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| Footer still says "Demo mode" | Set both `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `web/src/App.jsx`, restart dev, rebuild before deploy |
| Magic link opens localhost / wrong site | Update Site URL + Redirect URLs in Supabase (Step 3.3) |
| "Save failed — are you signed in?" | Session expired — sign in again |
| Yearbook empty when signed out | By design — the group is private; sign in |
| Photo upload fails | Re-run `schema.sql`; confirm **Storage → profile-photos** exists |
| Photo saves but doesn't show | Check `photo_path` in **Table Editor** and the file in **Storage**; hard-refresh the page |
| Cloudflare build fails | Root directory `web`, build `npm run build`, output `dist` |
| First visit after a quiet week is slow | Free Supabase project waking from pause — retry or restore in dashboard |
| "Could not send the link" / rate limit | Built-in SMTP — add custom SMTP (Step 2.4b–2.4c) and raise Rate Limits |
| "Email could not be sent — SMTP misconfiguration" | Resend domain not verified, wrong sender address, wrong port, or trailing space in SMTP host. Check **Supabase → Authentication → Logs** and **Resend → Emails** |
| Using `*.netlify.app` for email sender | Not possible — use a domain you own (e.g. `prompt-genie.in`) for Resend; Netlify URL is only for hosting and redirect URLs (Step 2.4c) |
| Domain owned but no mail/SMTP on it | Fine — Resend only needs DNS verification, not existing mail hosting (Step 2.4c) |

## Design system (per the prompt)

White background with `zinc-50` section bands · near-black Inter with a
tight-tracked 5xl–7xl hero · one **emerald** accent for buttons, focus
rings, and eyebrows · cards with 1px `zinc-100` borders, rounded-2xl, soft
hover lift · 48px inputs with emerald focus rings · Lucide icons, minimal ·
one glass-morphism moment (the floating hero card) · calm motion:
scroll-triggered fade-ins, floating hero accents, skeleton loaders, a soft
pulse on live updates, with `prefers-reduced-motion` respected.

## Future enhancements (from the docs)

Memories timeline · PDF export · invite codes · version history ·
socket-push realtime. The one-component structure keeps each of these a
contained change.
