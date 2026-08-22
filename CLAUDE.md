# CLAUDE.md — National Glass House Invoicing App

> Context file for Claude Code and other Claude-based agents working on this
> codebase. Read this before making any changes.

## Project Overview

**National Glass House** is a single-tenant invoicing & document management web
app for a glass business in Vapi, Gujarat, India. It creates invoices,
quotations, performa invoices, estimates, receipts, and window quotations —
downloads them as PDFs — manages a customer database — and shows a sales
dashboard.

**Live URL:** Deployed on Vercel (Next.js serverless).

---

## Tech Stack

| Layer         | Technology                                        |
| ------------- | ------------------------------------------------- |
| Framework     | **Next.js 14.2** (App Router, Server Components)  |
| Language      | **TypeScript** (strict mode)                      |
| Database      | **Supabase** (hosted Postgres) via `@supabase/supabase-js` |
| PDF           | **@react-pdf/renderer** (client-side React PDF)   |
| Charts        | **Recharts** (dashboard revenue chart)            |
| Styling       | **TailwindCSS 3.4** (with custom brand palette)   |
| Auth          | Custom HMAC-signed cookie (`ngh_session`), single shared password |
| Deployment    | **Vercel** (recommended)                          |
| Node          | **18+** required                                  |

---

## Directory Structure

```
app/                          ← project root
├── data/
│   └── customers_seed.csv    ← 172 pre-existing customers for initial import
├── public/
│   ├── NGH-logo.png          ← company logo (used in PDFs + UI)
│   └── logo.png              ← same logo, alternate name
├── scripts/
│   ├── seed.mjs              ← one-time customer import → Supabase
│   ├── test_api.mjs          ← API smoke test
│   └── test_pdf.mjs          ← PDF generation test
├── src/
│   ├── app/                  ← Next.js App Router pages
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/    ← POST /api/auth/login
│   │   │   │   └── logout/   ← POST /api/auth/logout
│   │   │   ├── customers/
│   │   │   │   ├── route.ts         ← GET (list/search), POST (create)
│   │   │   │   ├── [id]/            ← GET, PUT, DELETE single customer
│   │   │   │   └── stats/           ← GET customer stats
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts         ← GET aggregated dashboard data
│   │   │   └── documents/
│   │   │       ├── route.ts         ← GET (list), POST (create with auto-numbering)
│   │   │       ├── [id]/            ← GET, PUT, DELETE single document
│   │   │       └── duplicate/       ← POST to duplicate a document
│   │   ├── customers/page.tsx       ← Customer list + add UI
│   │   ├── dashboard/page.tsx       ← Sales dashboard with charts
│   │   ├── documents/
│   │   │   ├── page.tsx             ← Document list with filtering
│   │   │   ├── new/page.tsx         ← Create document form
│   │   │   └── [id]/page.tsx        ← View/edit single document
│   │   ├── login/page.tsx           ← Login form
│   │   ├── layout.tsx               ← Root layout (sidebar if authed)
│   │   ├── page.tsx                 ← Redirects to /documents
│   │   └── globals.css              ← Tailwind base + custom styles
│   ├── components/
│   │   ├── CustomerPicker.tsx       ← Customer search/select dropdown
│   │   ├── DocumentActions.tsx      ← PDF download, WhatsApp share, status
│   │   ├── DocumentForm.tsx         ← Full document creation/edit form (largest component)
│   │   ├── DocumentSearch.tsx       ← Search bar for document list
│   │   ├── LineItemsEditor.tsx      ← Editable line items table
│   │   ├── MobileBottomNav.tsx      ← Bottom nav bar for mobile
│   │   ├── PdfDocument.tsx          ← @react-pdf/renderer PDF template
│   │   ├── RevenueChart.tsx         ← Recharts bar chart
│   │   ├── Sidebar.tsx              ← Desktop sidebar navigation
│   │   └── StatCard.tsx             ← Dashboard metric card
│   ├── lib/
│   │   ├── auth.ts                  ← Server-side session helpers (cookies)
│   │   ├── authEdge.ts              ← Edge-compatible HMAC token sign/verify
│   │   ├── company.ts               ← Company details (env-overridable defaults)
│   │   ├── docTypes.ts              ← Document type enum, labels, financial year
│   │   ├── format.ts                ← INR currency formatter, date formatter
│   │   ├── supabaseServer.ts        ← Server-only Supabase client (service role)
│   │   └── whatsapp.ts              ← WhatsApp share URL + message builder
│   └── middleware.ts                ← Auth guard — redirects to /login if not authed
├── supabase/
│   └── schema.sql                   ← Complete DB schema (tables, indexes, RLS, functions)
├── .env.local                       ← Local secrets (gitignored)
├── next.config.mjs
├── tailwind.config.ts               ← Brand colors (brand-50..900)
├── tsconfig.json                    ← Path alias: @/* → ./src/*
└── package.json
```

---

## Key Concepts & Domain Logic

### Document Types
Six types, defined in `src/lib/docTypes.ts`:

| Value               | Label              | Short Code |
| ------------------- | ------------------ | ---------- |
| `invoice`           | Invoice            | `INV`      |
| `quotation`         | Quotation          | `QTN`      |
| `performa_invoice`  | Performa Invoice   | `PFI`      |
| `estimate`          | Estimate           | `EST`      |
| `receipt`           | Receipt            | `RCP`      |
| `window_quotation`  | Window Quotation   | `WQT`      |

### Auto-numbering
Documents get sequential numbers per type per Indian financial year
(April→March). Format: `INV-24-25-0071`. The Postgres function
`next_document_number(doc_type, financial_year)` does an atomic upsert on the
`counters` table to prevent collisions.

### Tax Calculation
- **CGST + SGST** (intra-state) or **IGST** (inter-state), or none.
- Default rate: 18% (configurable per document).
- Tax fields: `tax_type`, `tax_rate`, `cgst_amount`, `sgst_amount`, `igst_amount`.

### Customer Snapshots
When a document is created, the customer's bill-to/ship-to details are
snapshotted into the document row. Editing the customer later does **not**
retroactively change old documents.

### Authentication
- Single shared password (`ADMIN_PASSWORD` env var).
- HMAC-signed cookie (`ngh_session`) set for 30 days.
- `middleware.ts` protects all routes except `/login` and `/api/auth/login`.
- Auth split into `auth.ts` (Node runtime, uses `cookies()`) and `authEdge.ts`
  (Edge runtime, uses `crypto.subtle`).

---

## Environment Variables

| Variable                        | Required | Description                            |
| ------------------------------- | -------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key (server-only) |
| `ADMIN_PASSWORD`                | Yes      | Login password                         |
| `SESSION_SECRET`                | Yes      | HMAC signing secret for session cookie |
| `COMPANY_NAME`                  | No       | Overrides default "National Glass House" |
| `COMPANY_ADDRESS`               | No       | Overrides default company address      |
| `COMPANY_PHONE`                 | No       | Overrides default phone number         |
| `COMPANY_EMAIL`                 | No       | Overrides default email                |
| `COMPANY_GST`                   | No       | Overrides default GSTIN                |
| `COMPANY_BANK_*`                | No       | Overrides bank details (4 vars)        |
| `DEFAULT_HSN_CODE`              | No       | Default HSN code (default: `7005`)     |

---

## Database Schema

Four tables in Supabase (Postgres):

1. **`customers`** — `id`, `name`, `address`, `contact_person`, `contact_number`, `email`, `gst`, timestamps.
2. **`documents`** — `id`, `doc_type`, `doc_number`, `financial_year`, dates, customer snapshot fields, tax fields, `subtotal`, `total_amount`, `status` (draft/sent/paid/cancelled), `remarks`, timestamps.
3. **`document_items`** — `id`, `document_id` (FK), `position`, `description`, `size`, `hsn_code`, `qty`, `unit`, `rate`, `total`.
4. **`counters`** — `(doc_type, financial_year)` PK, `last_number`. Used by `next_document_number()`.

RLS is enabled on all tables but bypassed via the service-role key (all DB
access is server-side only).

Full schema: `supabase/schema.sql`

---

## Development

```bash
npm install
npm run dev         # http://localhost:3000
npm run seed        # one-time customer import from data/customers_seed.csv
npm run build       # production build
npm run lint        # ESLint
```

---

## Conventions & Patterns

- **Path alias:** `@/*` maps to `./src/*`. Always use `@/` imports.
- **Server components by default:** Pages are async Server Components. Client
  components use `"use client"` directive.
- **API routes:** All data mutations go through `/api/*` Route Handlers. They
  use `supabaseServer()` (service-role key).
- **No ORM:** Raw Supabase client queries (`.from().select()`, `.insert()`,
  etc.).
- **PDF generation:** Client-side via `@react-pdf/renderer`. The
  `PdfDocument.tsx` component defines the full invoice template.
- **Tailwind classes:** Use the `brand-*` color palette defined in
  `tailwind.config.ts` for theming.
- **Formatting:** `inr()` for Indian Rupee formatting, `formatDateLong()` for
  long-form dates. Both in `src/lib/format.ts`.
- **Financial year:** `financialYearFor(date)` returns `"24-25"` style strings.
  April 1 is the year boundary.

---

## Common Tasks

### Adding a new document type
1. Add to the `DocType` union and `DOC_TYPES` array in `src/lib/docTypes.ts`.
2. Add to the `CHECK` constraint in `supabase/schema.sql` and run the migration.
3. The rest of the app (form, PDF, numbering) picks it up automatically.

### Adding a new API endpoint
1. Create `src/app/api/<resource>/route.ts` (or a nested `[id]/route.ts`).
2. Use `supabaseServer()` for DB access.
3. Return `NextResponse.json(...)`.

### Modifying the PDF template
Edit `src/components/PdfDocument.tsx`. It uses `@react-pdf/renderer`'s
`StyleSheet` and React components (`Document`, `Page`, `View`, `Text`).

### Adding a new page
1. Create `src/app/<route>/page.tsx`.
2. It's automatically protected by the middleware.
3. Add a link in `Sidebar.tsx` and `MobileBottomNav.tsx`.

---

## Known Limitations / Future Work

- No per-user auth (single shared password).
- No inventory/pricing catalog.
- WhatsApp sharing sends text only (no PDF attachment — needs Supabase Storage).
- No overdue invoice tracking UI (the `status` field exists).
- Company details are env-var based, not editable from the UI.
