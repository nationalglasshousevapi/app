# Design Review: National Glass House Invoicing App

**Register:** Product — internal invoicing and document management tool for a glass business in Vapi, Gujarat, India.

**Surfaces reviewed:** Login, Dashboard, Documents list, New/Edit document form, Document detail, Customer picker.

**Score: 35/50**

---

## First impression — 7/10

The app reads as a serious internal tool. The bevelled card corners and deep teal + brass palette give it a genuine visual signature that most SaaS products lack. The sidebar with the inverted logo feels intentional. The login form is restrained and direct.

**What holds it back:**

- **"Create something for your customer"** — this is the primary heading on the new document page and it says nothing. Combined with the equally hollow subtitle ("Start with the document type, then select a saved customer…"), the page reads as AI-generated copy that was never rewritten. The user arriving here to issue an invoice does not need to be told how the form works. They need confidence that this tool will produce a correct, professional document.
- The root page redirects to `/dashboard` but the dashboard title is just "Dashboard" with a date — no brand warmth, no greeting, no personality. For an internal tool the owner opens every day, this is a missed moment.
- The `♙` pawn chess piece as the customer icon is confusing. Pawns signify expendability, not customer relationships. A person or address-book icon would read faster.

**Fix:** `/design voice`, `/design writing`

---

## Hierarchy — 7/10

The form is structured well — four numbered card sections with clear labels. The document total panel is visually anchored with brand tinting. The documents list has proper column layout, search, type filters, and responsive cards.

**What holds it back:**

- **Bevelled clip-path clips content.** The `.card` class uses `clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)` which cuts 14px off the top-right corner. Any content in that region — a number badge, close button, or right-aligned text — gets visually clipped. The constraint is visible on the document type filter pills card and any card header that aligns right.
- **`lg:` breakpoint is too late.** The line items column headers only appear at `lg:` (1024px). With the sidebar taking 256px, the remaining content area at `md:` (768px) is ~512px — enough for table headers. Waiting until 1024px means tablet users in landscape get a stacked form that wastes space.
- **The "Same as billing" checkbox and ship-to fields toggle instantly.** No height animation. On toggle, shipping fields blink in and out. This is the kind of friction a daily operator feels every time they add a customer.
- **Mobile action bar is cluttered.** The DocumentActions component in full (non-compact) mode shows Edit, two PDF buttons, Email, WhatsApp, Copy, and Delete — 7 actions. On mobile cards this is a dense row of tiny buttons. The compact mode is slightly better but still packs 6 icon-only buttons with no labels.
- **Dashboard stat cards are flat.** The stat card has a subtle accent square in the corner but otherwise lacks visual weight. For the first thing a user sees on the dashboard, they don't command attention.

**Fix:** `/design relayout` (breakpoints, clip-path), `/design interaction` (toggle animation), `/design refine` (action density)

---

## Color voice — 8/10

This is the strongest lens. The palette is intentional and tied to the business domain:

- **brand-600 (`#0F3A44`)** — deep, almost ink-teal. Distinctive against the sea of blue-violet SaaS. Reads as glass, water, clarity — thematically perfect for a glass business.
- **brass-500 (`#B8863B`)** — a warm, slightly muted gold. Used sparingly for CTAs (new document button, brass accent cards). Good restraint — it appears on maybe 2% of the surface, which keeps it special.
- **signal.green (`#3F7D5C`)** — paid status. Subdued, not celebratory. Appropriate for invoices.
- **signal.rust (`#B4553E`)** — cancelled/deletion. Warm-earth red instead of the usual `#dc2626`. Feels intentional.

**What holds it back:**

- **Missing intermediate stops.** The brand palette has 50, 100, 500, 600, 700, 900 — no 200, 300, 400, 800. This forces reuse: `brand-50` does double duty as both the lightest card tint and the step badge background. When every layer between `brand-50` and `brand-500` is missing, designers reach for opacity hacks.
- **Frost has no chroma.** `#F6F8F8` is a pure neutral — no tint toward teal. The body background sits on a separate color axis from the brand. A whisper of chroma (OKLCH `0.01` toward 190°) would tie the page canvas to the brand without being visible as a color.
- **Table hover is `brand-50/40`** — extremely subtle. The hover barely registers on a white table row. For a data-heavy list (documents table), row hover should be confident enough to track while scanning.

**Fix:** `/design recolor` (extend palette, tint frost, strengthen table hover)

---

## Type voice — 7/10

**Typeface pairing:** Space Grotesk (display) / Inter (body) / IBM Plex Mono (mono) — this is a solid, professional trio. Space Grotesk has a technical edge that suits invoicing. Inter is a workhorse for dense data. Mono for document numbers is the right call.

**What holds it back:**

- **Heading scale is compressed.** `.page-title` uses `text-2xl` (1.375rem / 22px). For a page-level heading on a 1440px viewport, this is undersized. The heading competes with the paragraph text for visual weight. Compare to `text-3xl` (1.625rem / 26px) or true `text-4xl` — the page needs more range.
- **Labels are `text-xs` (12px) with uppercase + tracking.** At 12px, uppercase with letter-spacing can be hard to parse, especially for longer labels like "Contact Person" or "Ship to same as billing". The tracking helps but the size is at the edge of legibility for the primary label system.
- **Form input text is `text-base` (16px).** This is correct for preventing iOS zoom (see responsive rules) but creates a visual jump: 12px label → 16px input value → 17px body. The label-to-input ratio is 1:1.33 — the label feels small relative to what it describes.
- **Document numbers in mono are good but the font-family is loaded with 4 weights (400, 500, 600, 700).** IBM Plex Mono at 4 weights is ~160KB. For a display face that appears only on document numbers and totals, 400 + 600 would be enough. Not a design failure but worth noting for performance.

**Fix:** `/design typeset` (heading scale, label size, font loading)

---

## Interaction feel — 6/10

**What works:**
- Buttons have hover, focus, and disabled states with transition durations.
- The CustomerPicker dropdown (after fixes) has good elevation with `shadow-xl ring-1`.
- Save button disables and shows "Saving…" — prevents double-submit.
- The document list type filter pills have clear active/inactive states.
- Number spinners have been removed (cleaner input appearance).

**What holds it back:**

- **No transitions on form sections.** The sameAsBilling checkbox toggles shipping fields instantly. The document type select shows/hides a hint instantly. These are 150ms opacity/height transitions away from feeling polished.
- **Loading feedback is absent.** The dashboard is a server component — it streams, but there's no skeleton or loading indicator. The documents list has no loading state (also server component). Server components stream progressively, but there's no intentional empty/loading design.
- **Empty states are text-only.** "No documents found" in gray text at the center of a card. No illustration, no guidance on what to do next (beyond the + New document button which is outside the card). "No invoices yet. Create your first one to see sales here." is the best empty-state copy — the documents list should match this energy.
- **Error validation (before the latest fixes)** was a single generic banner at the bottom. The new inline validation fixes this, but the error message pattern still exists for server errors.
- **Confirm dialogs use `confirm()`.** For an internal tool where the user knows what they're doing, this is acceptable. But for delete, having a brief undo toast would feel more forgiving.
- **The Preview PDF flow** fetches company details client-side, which works but adds a visible loading delay. The button shows "Loading…" while fetching, then opens a new tab. This delay is perceptible and slightly confusing — the user clicks "Preview PDF", sees "Loading…" for a moment, then a new tab opens.

**Fix:** `/design interaction` (toggle transitions, loading feedback, empty states), `/design refine` (confirm patterns, preview flow timing)

---

## Smell check

| Smell | Found? | Detail |
|---|---|---|
| Generic page heading (PPH) | **Yes** | "Create something for your customer" — could belong to any app |
| Glass-morphism reflex | No | Using flat cards with clip-path, not frosted glass |
| Purple/blue gradient | No | Brand is deep teal + brass |
| Centered hero with no purpose | No | No hero section — this is a product app |
| Generic icon set (Feather/Heroicons) | **Partial** | Uses inline SVGs for actions — clean but unremarkable |
| Card stack as default composition | No | Cards are used where appropriate (form sections, stat blocks) |
| AI-written copy | **Yes** | The new document page subtitle reads like chatbot output |
| "Empowering" / "streamline" language | **Yes** | "Start with the document type, then select a saved customer to fill their details quickly." — this tells the user how the form works instead of inspiring confidence |
| Accent used too broadly | No | Brass is reserved for primary CTAs only |
| No visible focus styles | **Partial** | Focus rings exist on `.input` and `.btn` but rely on `focus:ring-2` which may not be visible enough in some states |

---

## Prioritized recommendations

1. **Fix the generic copy (high impact, low effort).** Replace "Create something for your customer" with the actual document type being created. "New Invoice", "New Quotation" — specific, confident, tells the user what they're doing. → `/design refine` (writing pass)

2. **Extend the palette with intermediate stops (medium impact, medium effort).** Add brand-200, brand-300, brand-400, brand-800. Tint `frost` with a whisper of teal chroma. → `/design recolor`

3. **Fix the bevelled clip-path (medium impact, low effort).** Content near the top-right corner gets cut. Either accept the constraint and move content away, or add padding to the card's inner content. → `/design relayout`

4. **Animate the sameAsBilling toggle (medium impact, low effort).** A 200ms opacity + scaleY transition on the shipping fields section makes the daily interaction feel polished. → `/design interaction`

5. **Strengthen the heading scale (medium impact, low effort).** Bump `.page-title` to `text-3xl` or bigger. Give page-level headings real presence. → `/design typeset`

6. **Improve empty states (low impact, low effort).** Replace "No documents found" with a short message that tells the user what goes here and how to add the first one. → `/design refine`

7. **Adjust breakpoints from `lg:` to `md:` for line items (low impact, low effort).** The column headers in LineItemsEditor should appear at `md:` instead of `lg:` since the sidebar reduces available width. → `/design responsive`

8. **Audit customer icon (low impact, low effort).** Replace `♙` pawn with a person or address-book icon. → `/design refine`
