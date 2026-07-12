# Deployment Guide — National Glass House

Deploy this app for free on Vercel (best option for Next.js — built by the same team).

**Cost:** $0. Vercel's free tier includes 100 GB bandwidth, SSL, custom domains, and
unlimited sites. Supabase free tier covers the database.

---

## Step 1 — Push to GitHub

```bash
# 1. Create a new repo on GitHub (https://github.com/new)
#    Don't add README/.gitignore — you already have them.

# 2. Link your local repo and push
cd /Users/mohammedkanchwala/Documents/Projects/National\ Glass\ House/app
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git
git push -u origin main
```

---

## Step 2 — Deploy on Vercel

1. Go to https://vercel.com/new
2. Sign in with your GitHub account
3. Click **"Import Git Repository"** → select the repo you just pushed
4. Vercel auto-detects Next.js — leave all defaults
5. Click **"Environment Variables"** and add every variable from `.env.local`:

| Variable                        | Your value                        |
| ------------------------------- | --------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | From your Supabase project        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From your Supabase project        |
| `SUPABASE_SERVICE_ROLE_KEY`     | From your Supabase project        |
| `ADMIN_PASSWORD`                | Choose a strong password          |
| `SESSION_SECRET`                | Run: `openssl rand -hex 32`       |
| `COMPANY_NAME`                  | National Glass House (optional)   |
| `COMPANY_ADDRESS`               | Your address (optional)           |
| `COMPANY_PHONE`                 | Your phone (optional)             |
| `COMPANY_EMAIL`                 | Your email (optional)             |
| `COMPANY_GST`                   | Your GSTIN (optional)             |
| `COMPANY_BANK_NAME`             | Bank name (optional)              |
| `COMPANY_BANK_ACCOUNT_NAME`     | Account name (optional)           |
| `COMPANY_BANK_ACCOUNT_NO`       | Account number (optional)         |
| `COMPANY_BANK_IFSC`             | IFSC code (optional)              |
| `DEFAULT_HSN_CODE`              | `7005` (optional)                 |

6. Click **"Deploy"** — takes ~2 minutes
7. Once done, Vercel gives you a URL like `https://your-app.vercel.app`

---

## Step 3 — Supabase Config (one-time)

Your Supabase project is _probably_ already set up from local development.
If not, run this in Supabase's SQL Editor (https://supabase.com → your project → SQL Editor):

```sql
-- Copy-paste the entire contents of supabase/schema.sql and run it
```

Then allow Vercel's IPs in Supabase (usually not needed, but if you see
connection errors, enable it in Project Settings → Network Restrictions).

---

## Step 4 — Access Your App

- Open the Vercel URL (e.g. `https://national-glass-house.vercel.app`)
- Login with the `ADMIN_PASSWORD` you set in Step 5
- Share the URL with anyone in your business — they all use the same password

---

## Updating After Changes

Every time you `git push` to the main branch, Vercel automatically redeploys.

```bash
git add .
git commit -m "your message"
git push
```

---

## Custom Domain (Optional)

Want `ngh.in` or similar?

1. Go to Vercel dashboard → your project → **Domains**
2. Enter your domain and follow the DNS instructions
3. SSL is automatic (free via Vercel)

---

## Troubleshooting

| Symptom                    | Fix                                                 |
| -------------------------- | --------------------------------------------------- |
| Blank page after deploy    | Check Vercel deploy logs for build errors           |
| "Missing env vars" error   | Add all variables from `.env.local` in Vercel       |
| Login not working          | Verify `ADMIN_PASSWORD` and `SESSION_SECRET` are set |
| Database errors            | Run `supabase/schema.sql` in Supabase SQL Editor    |
| PDF download broken        | Make sure Vercel URL is the same one you're on      |
