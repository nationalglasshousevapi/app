# National Glass House — Invoicing App

A small web app to create invoices, quotations, performa invoices, estimates,
receipts, and window quotations for National Glass House, download them as
PDFs, manage the customer database, and see a sales dashboard.

Built with Next.js + Supabase (Postgres) + @react-pdf/renderer. Deploys free
on Vercel (recommended), Netlify, or Cloudflare Pages.

## 1. Set up Supabase (the database)

1. Go to https://supabase.com, create a free account and a new project.
2. In the project, open **SQL Editor** and paste in the contents of
   `supabase/schema.sql`, then run it. This creates all the tables.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — never
     put it in client-side code or commit it to git)

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase values from step 1, plus:
- `ADMIN_PASSWORD` — the password you'll use to log into the app
- `SESSION_SECRET` — any long random string (e.g. run `openssl rand -hex 32`)
- The `COMPANY_*` values — already pre-filled with your business details from
  the original spreadsheet; edit if anything needs correcting.

## 3. Install and run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — log in with the `ADMIN_PASSWORD` you set.

## 4. Import your existing customers

Your 172 existing customers from the "Customer Details" sheet are already
exported to `data/customers_seed.csv`. To load them into the database:

```bash
npm run seed
```

This only needs to be run once. Re-running it will insert duplicates, so if
you need to re-run it, clear the `customers` table in Supabase first.

## 5. Deploy

**Vercel (recommended, easiest):**
1. Push this folder to a new GitHub repository.
2. Go to https://vercel.com → New Project → import the repo.
3. In the project's Environment Variables settings, add everything from your
   `.env.local` file.
4. Deploy. Vercel gives you a live URL immediately.

**Netlify / Cloudflare Pages:** same idea — connect the repo, add the same
environment variables, and deploy. Next.js is supported natively by both.

## What's included

- **Login** — single shared password (`ADMIN_PASSWORD`). Good enough for one
  or two people; can be upgraded to per-user accounts (Supabase Auth) later
  when your father starts using it directly.
- **Customers** — searchable list, add/delete. Imported from your existing
  spreadsheet.
- **Documents** — create any of the 6 document types (Invoice, Quotation,
  Performa Invoice, Estimate, Receipt, Window Quotation) with line items,
  auto-calculated CGST/SGST or IGST, and automatic sequential numbering per
  type per financial year (e.g. `INV-24-25-0071`), matching the pattern in
  your original file.
- **PDF** — every document can be viewed/downloaded as a PDF styled like your
  original invoice template (company header, bill-to/ship-to, line items,
  totals, bank details, terms).
- **Dashboard** — total & monthly revenue (from Invoices), top customers, and
  a breakdown of documents by type.

## What's next / ideas for later

- WhatsApp share button (a `wa.me` link with the PDF attached needs the PDF
  hosted at a public URL first — can add Supabase Storage for this)
- Per-user accounts so your father and staff can log in separately
- Editing the company bank/header details from a settings page instead of
  environment variables
- Inventory/pricing catalog so line items autocomplete from a saved item list
- Overdue/unpaid invoice tracking (the `status` field already exists — the UI
  to filter and act on it can be added)

## A note on this handoff

I wrote all of this code without being able to run `npm install` or test-build
it (no internet access in the sandbox that generated it), so there may be a
small bug or two on first run — mismatched types, a missing import, etc. If
you hit an error, paste the error message back to me and I'll fix it directly.
