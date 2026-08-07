// ---------- Types ----------
export interface PieceDef {
  label: string;
  w: number;
  h: number;
  qty: number;
}

export interface PieceInstance {
  id: number;
  label: string;
  w: number;
  h: number;
}

export interface StockSize {
  label: string;
  w: number;
  h: number;
  qty?: number; // 0 or undefined = unlimited
}

export interface PlacedItem {
  id: number;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Shelf {
  y: number;
  height: number;
  items: PlacedItem[];
  widthUsed: number;
}

export interface WasteRect {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: "remnant" | "scrap";
}

export interface SheetResult {
  stock: StockSize;
  shelves: Shelf[];
  waste: WasteRect[];
  usedArea: number;
}

export interface PackResult {
  sheets: SheetResult[];
  unplaced: PieceInstance[];
  tooBig: PieceInstance[];
  skippedStock: StockSize[];
}

export interface JobSettings {
  kerf: number;
  minRemnant: number;
  maxHorizontalCut: number;
  allowRotate: boolean;
}

export interface BillingRow {
  label: string;
  w: number;
  h: number;
  billedW: number;
  billedH: number;
  qty: number;
  actualSqFt: number;
  billedSqFt: number;
}

export interface BillingReport {
  rows: BillingRow[];
  totals: { actualSqFt: number; billedSqFt: number };
}

export interface Summary {
  sheetsUsed: number;
  yieldPct: number;
  remnantPct: number;
  scrapPct: number;
  cutNos: number;
  cutSqFt: number;
  remnantNos: number;
  remnantSqFt: number;
  scrapNos: number;
  scrapSqFt: number;
  totalStockSqFt: number;
}

// ---------- Dimension helpers ----------
export function parseDim(str: string | null | undefined): number {
  if (str == null) return NaN;
  str = String(str).trim();
  if (!str) return NaN;
  let sign = 1;
  if (str[0] === "-") {
    sign = -1;
    str = str.slice(1);
  }
  str = str.replace(/-/g, " ");
  const parts = str.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const p of parts) {
    if (p.includes("/")) {
      const [n, d] = p.split("/").map(Number);
      if (!d) return NaN;
      total += n / d;
    } else {
      const v = parseFloat(p);
      if (isNaN(v)) return NaN;
      total += v;
    }
  }
  return sign * total;
}

function gcdf(a: number, b: number): number {
  return b < 1e-6 ? a : gcdf(b, a % b);
}

export function toFraction(val: number | null | undefined, denom = 16): string {
  if (val == null || isNaN(val)) return "-";
  const whole = Math.floor(val + 1e-6);
  let frac = val - whole;
  let num = Math.round(frac * denom);
  if (num === denom) return whole + 1 + '"';
  if (num === 0) return whole + '"';
  let g = Math.round(gcdf(num, denom)) || 1;
  const n2 = num / g,
    d2 = denom / g;
  return (whole > 0 ? whole + " " : "") + n2 + "/" + d2 + '"';
}

// ---------- Client billing ----------
export function billedDim(v: number): number {
  if (v < 24) return Math.ceil(v / 3 - 1e-9) * 3;
  return Math.ceil(v / 6 - 1e-9) * 6;
}

export function billingReport(pieceDefs: PieceDef[]): BillingReport {
  const rows: BillingRow[] = pieceDefs.map((p) => {
    const bw = billedDim(p.w),
      bh = billedDim(p.h);
    const actualSqFt = ((p.w * p.h) / 144) * p.qty;
    const billedSqFt = ((bw * bh) / 144) * p.qty;
    return {
      label: p.label,
      w: p.w,
      h: p.h,
      billedW: bw,
      billedH: bh,
      qty: p.qty,
      actualSqFt,
      billedSqFt,
    };
  });
  const totals = rows.reduce(
    (a, r) => ({
      actualSqFt: a.actualSqFt + r.actualSqFt,
      billedSqFt: a.billedSqFt + r.billedSqFt,
    }),
    { actualSqFt: 0, billedSqFt: 0 }
  );
  return { rows, totals };
}

// ---------- Packing engine ----------
let UID = 0;

function expand(pieceDefs: PieceDef[]): PieceInstance[] {
  const arr: PieceInstance[] = [];
  pieceDefs.forEach((p) => {
    for (let i = 0; i < p.qty; i++)
      arr.push({ id: UID++, label: p.label, w: p.w, h: p.h });
  });
  return arr;
}

function orientations(p: { w: number; h: number }, allowRotate: boolean): { w: number; h: number }[] {
  const base = [{ w: p.w, h: p.h }];
  if (allowRotate && Math.abs(p.w - p.h) > 1e-6) base.push({ w: p.h, h: p.w });
  return base;
}

function bestOrientationForNewShelf(
  piece: PieceInstance,
  binW: number,
  availH: number,
  allowRotate: boolean
): { w: number; h: number } | null {
  const opts = orientations(piece, allowRotate).filter(
    (o) => o.w <= binW + 1e-6 && o.h <= availH + 1e-6
  );
  if (!opts.length) return null;
  opts.sort((a, b) => a.h - b.h);
  return opts[0];
}

function fitInShelf(
  piece: PieceInstance,
  availW: number,
  shelfH: number,
  allowRotate: boolean
): { w: number; h: number } | null {
  const opts = orientations(piece, allowRotate).filter(
    (o) => o.w <= availW + 1e-6 && o.h <= shelfH + 1e-6
  );
  if (!opts.length) return null;
  opts.sort((a, b) => b.w - a.w);
  return opts[0];
}

function packOneBin(
  instances: PieceInstance[],
  binW: number,
  binH: number,
  kerf: number,
  allowRotate: boolean
): { shelves: Shelf[]; placedIds: Set<number>; yUsed: number } {
  const placedIds = new Set<number>();
  const shelves: Shelf[] = [];
  let y = 0;

  while (true) {
    const start = instances.find((p) => !placedIds.has(p.id));
    if (!start) break;
    const opt = bestOrientationForNewShelf(start, binW, binH - y, allowRotate);
    if (!opt) break;

    let x = 0;
    const items: PlacedItem[] = [
      { id: start.id, label: start.label, x, y, w: opt.w, h: opt.h },
    ];
    x += opt.w + kerf;
    placedIds.add(start.id);
    const shelfH = opt.h;

    for (const p of instances) {
      if (placedIds.has(p.id)) continue;
      const o = fitInShelf(p, binW - x, shelfH, allowRotate);
      if (o) {
        items.push({ id: p.id, label: p.label, x, y, w: o.w, h: o.h });
        x += o.w + kerf;
        placedIds.add(p.id);
      }
    }
    shelves.push({ y, height: shelfH, items, widthUsed: x - kerf });
    y += shelfH + kerf;
    if (y >= binH) break;
  }

  return { shelves, placedIds, yUsed: Math.min(y, binH) };
}

function classifyRects(
  shelves: Shelf[],
  binW: number,
  binH: number,
  yUsed: number
): WasteRect[] {
  const rects: WasteRect[] = [];
  for (const shelf of shelves) {
    const leftoverW = binW - shelf.widthUsed;
    if (leftoverW > 0.01)
      rects.push({ x: shelf.widthUsed, y: shelf.y, w: leftoverW, h: shelf.height });
  }
  const bottomH = binH - yUsed;
  if (bottomH > 0.01) rects.push({ x: 0, y: yUsed, w: binW, h: bottomH });
  return rects;
}

function packSheetWithNesting(
  available: PieceInstance[],
  sheetW: number,
  sheetH: number,
  kerf: number,
  allowRotate: boolean,
  minRemnant: number
): { shelves: Shelf[]; waste: WasteRect[]; placedIds: Set<number>; usedArea: number } {
  const main = packOneBin(available, sheetW, sheetH, kerf, allowRotate);
  let placedIds = new Set(main.placedIds);
  let shelves = main.shelves.slice();
  let remaining = available.filter((p) => !placedIds.has(p.id));
  let rawRects = classifyRects(main.shelves, sheetW, sheetH, main.yUsed);
  rawRects.sort((a, b) => b.w * b.h - a.w * a.h);

  const finalWaste: WasteRect[] = [];
  for (const rect of rawRects) {
    if (remaining.length === 0) {
      finalWaste.push(rect);
      continue;
    }
    const sub = packOneBin(remaining, rect.w, rect.h, kerf, allowRotate);
    if (sub.placedIds.size > 0) {
      sub.shelves.forEach((sh) => {
        shelves.push({
          y: sh.y + rect.y,
          height: sh.height,
          widthUsed: sh.widthUsed,
          items: sh.items.map((it) => ({ ...it, x: it.x + rect.x, y: it.y + rect.y })),
        });
      });
      placedIds = new Set([...placedIds, ...sub.placedIds]);
      remaining = remaining.filter((p) => !sub.placedIds.has(p.id));
      const subRects = classifyRects(sub.shelves, rect.w, rect.h, sub.yUsed).map(
        (r) => ({ ...r, x: r.x + rect.x, y: r.y + rect.y })
      );
      finalWaste.push(...subRects);
    } else {
      finalWaste.push(rect);
    }
  }

  finalWaste.forEach(
    (r) => (r.kind = r.w >= minRemnant && r.h >= minRemnant ? "remnant" : "scrap")
  );
  const usedArea = shelves.reduce(
    (a, sh) => a + sh.items.reduce((b, it) => b + it.w * it.h, 0),
    0
  );
  return { shelves, waste: finalWaste, placedIds, usedArea };
}

export function packJob(
  pieceDefs: PieceDef[],
  stockSizesRaw: StockSize[],
  settings: JobSettings
): PackResult {
  const { kerf, minRemnant, allowRotate, maxHorizontalCut = 96 } = settings;
  UID = 0;

  // Build the set of usable orientations, respecting the max horizontal cut
  // length: only orientations whose WIDTH fits. Never rotate a sheet into
  // an orientation that would force a stage-1 cut longer than the table.
  const stockOptions: StockSize[] = [];
  const skippedStock: StockSize[] = [];
  stockSizesRaw.forEach((s) => {
    let added = false;
    if (s.w <= maxHorizontalCut + 1e-6) {
      stockOptions.push({ label: s.label, w: s.w, h: s.h });
      added = true;
    }
    if (Math.abs(s.w - s.h) > 1e-6 && s.h <= maxHorizontalCut + 1e-6) {
      stockOptions.push({ label: s.label + " ↻", w: s.h, h: s.w });
      added = true;
    }
    if (!added) skippedStock.push(s);
  });

  let instances = expand(pieceDefs);
  instances.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

  const tooBig = instances.filter(
    (p) =>
      !stockOptions.some((s) =>
        orientations(p, allowRotate).some((o) => o.w <= s.w + 1e-6 && o.h <= s.h + 1e-6)
      )
  );
  instances = instances.filter((p) => !tooBig.includes(p));

  const sheets: SheetResult[] = [];
  // Global remnant pool: every "remnant"-kind offcut generated on ANY committed
  // sheet, still available to absorb pieces from LATER in the job. This is what
  // stops a lone leftover piece from forcing open a whole new near-empty sheet
  // when it would actually fit in a drop from three sheets ago.
  const remnantPool: { sheetIdx: number; rect: WasteRect }[] = []; // rect is the same object living in sheets[sheetIdx].waste

  function tryPoolFirst() {
    let placedAny = true;
    while (placedAny && instances.length > 0 && remnantPool.length > 0) {
      placedAny = false;
      remnantPool.sort((a, b) => b.rect.w * b.rect.h - a.rect.w * a.rect.h);
      for (let i = 0; i < remnantPool.length; i++) {
        if (instances.length === 0) break;
        const entry = remnantPool[i];
        const sub = packOneBin(instances, entry.rect.w, entry.rect.h, kerf, allowRotate);
        if (sub.placedIds.size === 0) continue;

        const sheet = sheets[entry.sheetIdx];
        sub.shelves.forEach((sh) => {
          sheet.shelves.push({
            y: sh.y + entry.rect.y,
            height: sh.height,
            widthUsed: sh.widthUsed,
            items: sh.items.map((it) => ({ ...it, x: it.x + entry.rect.x, y: it.y + entry.rect.y })),
          });
        });
        sheet.usedArea += sub.shelves.reduce(
          (a, sh) => a + sh.items.reduce((b, it) => b + it.w * it.h, 0),
          0
        );
        instances = instances.filter((p) => !sub.placedIds.has(p.id));

        const subRects = classifyRects(sub.shelves, entry.rect.w, entry.rect.h, sub.yUsed).map(
          (r) => ({ ...r, x: r.x + entry.rect.x, y: r.y + entry.rect.y })
        );
        subRects.forEach(
          (r) => (r.kind = r.w >= minRemnant && r.h >= minRemnant ? "remnant" : "scrap")
        );

        const wasteIdx = sheet.waste.indexOf(entry.rect);
        if (wasteIdx >= 0) sheet.waste.splice(wasteIdx, 1, ...subRects);
        remnantPool.splice(i, 1);
        subRects.forEach((r) => {
          if (r.kind === "remnant") remnantPool.push({ sheetIdx: entry.sheetIdx, rect: r });
        });

        placedAny = true;
        break; // pool mutated — restart the scan
      }
    }
  }

  let safety = 0;
  while (instances.length > 0 && safety < 400) {
    safety++;

    // 1) Always check existing drops across every committed sheet first.
    tryPoolFirst();
    if (instances.length === 0) break;

    // 2) Only once the pool is exhausted, open a new sheet.
    let best: {
      res: { shelves: Shelf[]; waste: WasteRect[]; placedIds: Set<number>; usedArea: number };
      stock: StockSize;
      score: number;
    } | null = null;
    for (const stock of stockOptions) {
      const res = packSheetWithNesting(
        instances,
        stock.w,
        stock.h,
        kerf,
        allowRotate,
        minRemnant
      );
      if (res.placedIds.size === 0) continue;
      const scrapArea = res.waste
        .filter((w) => w.kind === "scrap")
        .reduce((a, r) => a + r.w * r.h, 0);
      const area = stock.w * stock.h;
      const score = (res.usedArea - scrapArea * 2) / area;
      if (!best || score > best.score) best = { res, stock, score };
    }
    if (!best) break;
    const sheet = { stock: best.stock, shelves: best.res.shelves, waste: best.res.waste.slice(), usedArea: best.res.usedArea };
    sheets.push(sheet);
    instances = instances.filter((p) => !best.res.placedIds.has(p.id));
    const sheetIdx = sheets.length - 1;
    sheet.waste.forEach((r) => {
      if (r.kind === "remnant") remnantPool.push({ sheetIdx, rect: r });
    });
  }

  return { sheets, unplaced: instances, tooBig, skippedStock };
}

export function summarize(packResult: PackResult): Summary {
  let totalStock = 0,
    totalUsed = 0,
    totalRemnant = 0,
    totalScrap = 0;
  let cutNos = 0,
    remnantNos = 0,
    scrapNos = 0;
  packResult.sheets.forEach((s) => {
    const area = s.stock.w * s.stock.h;
    totalStock += area;
    totalUsed += s.usedArea;
    s.shelves.forEach((sh) => {
      cutNos += sh.items.length;
    });
    s.waste.forEach((r) => {
      if (r.kind === "remnant") {
        totalRemnant += r.w * r.h;
        remnantNos++;
      } else {
        totalScrap += r.w * r.h;
        scrapNos++;
      }
    });
  });
  return {
    sheetsUsed: packResult.sheets.length,
    yieldPct: totalStock ? (totalUsed / totalStock) * 100 : 0,
    remnantPct: totalStock ? (totalRemnant / totalStock) * 100 : 0,
    scrapPct: totalStock ? (totalScrap / totalStock) * 100 : 0,
    cutNos,
    cutSqFt: totalUsed / 144,
    remnantNos,
    remnantSqFt: totalRemnant / 144,
    scrapNos,
    scrapSqFt: totalScrap / 144,
    totalStockSqFt: totalStock / 144,
  };
}
