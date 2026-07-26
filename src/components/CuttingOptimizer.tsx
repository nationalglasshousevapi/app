"use client";

import { useState, useCallback, useRef } from "react";
import {
  type PieceDef,
  type StockSize,
  type PackResult,
  parseDim,
  toFraction,
  billedDim,
  packJob,
} from "@/lib/cuttingOptimizer";
import { pdf } from "@react-pdf/renderer";
import CuttingOptimizerPdf from "./CuttingOptimizerPdf";

const DEFAULT_STOCK: StockSize[] = [
  { label: "72x96", w: 72, h: 96, qty: 0 },
  { label: "84x120", w: 84, h: 120, qty: 0 },
  { label: "88.75x126.5", w: 88.75, h: 126.5, qty: 0 },
  { label: "78.5x126.5", w: 78.5, h: 126.5, qty: 0 },
];

const SEED_PIECES: PieceDef[] = [
  { label: "1", w: 74 + 7 / 8, h: 28 + 9 / 16, qty: 4 },
  { label: "2", w: 74 + 3 / 8, h: 42 + 3 / 8, qty: 2 },
  { label: "3", w: 23 + 13 / 16, h: 29 + 7 / 8, qty: 2 },
  { label: "4", w: 37 + 5 / 16, h: 18 + 1 / 2, qty: 2 },
  { label: "5", w: 86, h: 29 + 7 / 8, qty: 2 },
  { label: "6", w: 61 + 3 / 16, h: 36 + 5 / 16, qty: 2 },
  { label: "7", w: 62 + 1 / 4, h: 28 + 15 / 16, qty: 4 },
  { label: "8", w: 62 + 9 / 16, h: 23 + 7 / 8, qty: 2 },
  { label: "9", w: 86 + 7 / 16, h: 30 + 3 / 16, qty: 2 },
  { label: "10", w: 64 + 7 / 8, h: 42 + 3 / 16, qty: 2 },
  { label: "11", w: 82 + 15 / 16, h: 23 + 15 / 16, qty: 2 },
  { label: "12", w: 22, h: 65 + 1 / 4, qty: 1 },
  { label: "13", w: 21 + 3 / 16, h: 65 + 1 / 4, qty: 1 },
  { label: "filler", w: 37 + 1 / 8, h: 12, qty: 10 },
];

export default function CuttingOptimizer() {
  const [stockSizes, setStockSizes] = useState<StockSize[]>(DEFAULT_STOCK);
  const [stockChecked, setStockChecked] = useState<boolean[]>(
    DEFAULT_STOCK.map(() => true)
  );
  const [pieces, setPieces] = useState<PieceDef[]>(SEED_PIECES);
  const [kerf, setKerf] = useState("0.25");
  const [minRemnant, setMinRemnant] = useState("10");
  const [allowRotate, setAllowRotate] = useState(true);
  const [thickness, setThickness] = useState("5");
  const [results, setResults] = useState<PackResult | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Stock row management
  const updateStock = useCallback(
    (i: number, field: string, value: string) => {
      setStockSizes((prev) => {
        const next = prev.map((s, j) => {
          if (j !== i) return s;
          if (field === "qty") return { ...s, qty: value === "" ? undefined : parseInt(value, 10) || 0 };
          return { ...s, [field]: value };
        });
        return next;
      });
    },
    []
  );

  const addStock = useCallback(() => {
    setStockSizes((prev) => [...prev, { label: "", w: 0, h: 0, qty: 0 }]);
    setStockChecked((prev) => [...prev, true]);
  }, []);

  const removeStock = useCallback((i: number) => {
    setStockSizes((prev) => prev.filter((_, j) => j !== i));
    setStockChecked((prev) => prev.filter((_, j) => j !== i));
  }, []);

  // Piece row management
  const updatePiece = useCallback(
    (i: number, field: keyof PieceDef, value: string | number) => {
      setPieces((prev) => {
        const next = prev.map((p, j) => (j === i ? { ...p, [field]: value } : p));
        return next;
      });
    },
    []
  );

  const addPiece = useCallback(() => {
    setPieces((prev) => [...prev, { label: String(prev.length + 1), w: 0, h: 0, qty: 1 }]);
  }, []);

  const removePiece = useCallback((i: number) => {
    setPieces((prev) => prev.filter((_, j) => j !== i));
  }, []);

  // Pack
  const handlePack = useCallback(() => {
    const kerfVal = parseDim(kerf) || 0;
    const minRemnantVal = parseDim(minRemnant) || 0;

    const activeStock = stockSizes.filter((_, i) => stockChecked[i]).map((s) => ({
      ...s,
      w: parseDim(String(s.w)),
      h: parseDim(String(s.h)),
    }));

    const validStock = activeStock.filter(
      (s) => !isNaN(s.w) && !isNaN(s.h) && s.w > 0 && s.h > 0
    );

    if (!validStock.length) {
      alert("Check at least one valid stock size.");
      return;
    }

    // Expand stock by quantity, adding a rotated variant for each copy
    const stockOptions: StockSize[] = [];
    for (const s of validStock) {
      const copies = s.qty && s.qty > 0 ? s.qty : 99;
      for (let c = 0; c < copies; c++) {
        const label = s.qty && s.qty > 0 ? `${s.label} #${c + 1}` : s.label;
        stockOptions.push({ ...s, label });
        if (Math.abs(s.w - s.h) > 1e-6) {
          stockOptions.push({ label: label + " ↻", w: s.h, h: s.w });
        }
      }
    }

    const validPieces = pieces
      .map((p) => ({
        ...p,
        w: parseDim(String(p.w)),
        h: parseDim(String(p.h)),
        qty: parseInt(String(p.qty), 10) || 0,
      }))
      .filter((p) => !isNaN(p.w) && !isNaN(p.h) && p.qty > 0);

    if (!validPieces.length) {
      alert("Add at least one valid piece.");
      return;
    }

    const data = packJob(validPieces, stockOptions, kerfVal, minRemnantVal, allowRotate);
    setResults(data);
  }, [stockSizes, stockChecked, pieces, kerf, minRemnant, allowRotate]);

  // PDF export
  const handleExportPdf = useCallback(async () => {
    if (!results) return;
    setExportingPdf(true);
    try {
      const doc = <CuttingOptimizerPdf results={results} pieces={pieces} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cutting-optimizer.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed", e);
      alert("PDF generation failed — see console.");
    } finally {
      setExportingPdf(false);
    }
  }, [results, pieces]);

  // Stats calculation
  let totalUsed = 0,
    totalRemnant = 0,
    totalScrap = 0,
    totalStock = 0;
  let scrapNos = 0,
    remnantNos = 0,
    cutNos = 0;
  if (results) {
    results.sheets.forEach((s) => {
      const area = s.stock.w * s.stock.h;
      totalStock += area;
      totalUsed += s.usedArea;
      s.shelves.forEach((sh) => (cutNos += sh.items.length));
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
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-brand-500 mb-1">
          Nesting · Multi-sheet · Waste re-nesting
        </p>
        <h1 className="page-title">Glass Cutting Optimizer</h1>
        <p className="page-subtitle max-w-2xl">
          Picks the best of your stock sheet sizes for each cut, then tries to fit
          remaining pieces (or filler sizes) into every leftover strip before calling it
          waste. What&apos;s left over is split into{" "}
          <span className="text-amber-600 font-semibold">remnant</span> (still usable) and{" "}
          <span className="text-red-600 font-semibold">scrap</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
        {/* ── Left Panel ── */}
        <div className="space-y-5">
          {/* Stock sizes */}
          <div className="card p-5">
            <h2 className="label mb-4 flex items-center gap-2">
              Stock sizes{" "}
              <span className="font-normal normal-case tracking-normal text-slate-400 text-[11px]">
                check the ones available for this job
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="uppercase tracking-wide bg-slate-50/80 text-slate-500 text-[10px]">
                    <th className="text-left p-2 w-8">On</th>
                    <th className="text-left p-2">Label</th>
                    <th className="text-left p-2">W</th>
                    <th className="text-left p-2">H</th>
                    <th className="text-left p-2" style={{width:50}}>Qty</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {stockSizes.map((s, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={stockChecked[i]}
                          onChange={(e) =>
                            setStockChecked((prev) => {
                              const next = [...prev];
                              next[i] = e.target.checked;
                              return next;
                            })
                          }
                          className="accent-brand-500 w-4 h-4"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1.5 !px-2 !rounded-lg text-xs"
                          value={s.label}
                          onChange={(e) => updateStock(i, "label", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1.5 !px-2 !rounded-lg text-xs font-mono"
                          value={s.w || ""}
                          onChange={(e) => updateStock(i, "w", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1.5 !px-2 !rounded-lg text-xs font-mono"
                          value={s.h || ""}
                          onChange={(e) => updateStock(i, "h", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1 !px-2 !rounded-lg text-xs font-mono w-10"
                          value={s.qty ?? ""}
                          placeholder="∞"
                          onChange={(e) => updateStock(i, "qty", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => removeStock(i)}
                          className="text-red-500 hover:text-red-700 text-lg leading-none"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addStock}
              className="mt-3 w-full border border-dashed border-slate-300 text-brand-600 font-mono text-xs py-2 rounded-lg hover:border-brand-500 transition"
            >
              + Add stock size
            </button>

            <div className="mt-4">
              <label className="label">Glass thickness (mm)</label>
              <select
                className="input !min-h-[38px] !py-1.5"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
              >
                {[3.5, 4, 5, 6, 8, 10, 12].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cutting settings */}
          <div className="card p-5">
            <h2 className="label mb-4">Cutting settings</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Kerf / trim (in)</label>
                <input
                  className="input !min-h-[38px] !py-1.5 font-mono"
                  value={kerf}
                  onChange={(e) => setKerf(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Min. usable remnant (in)</label>
                <input
                  className="input !min-h-[38px] !py-1.5 font-mono"
                  value={minRemnant}
                  onChange={(e) => setMinRemnant(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowRotate}
                onChange={(e) => setAllowRotate(e.target.checked)}
                className="accent-brand-500 w-4 h-4"
              />
              Allow rotating pieces 90°
            </label>
          </div>

          {/* Cut list */}
          <div className="card p-5">
            <h2 className="label mb-4">Cut list</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="uppercase tracking-wide bg-slate-50/80 text-slate-500 text-[10px]">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Width</th>
                    <th className="text-left p-2">Height</th>
                    <th className="text-left p-2">Qty</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {pieces.map((p, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1 !px-2 !rounded-lg text-xs w-10"
                          value={p.label}
                          onChange={(e) => updatePiece(i, "label", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1 !px-2 !rounded-lg text-xs font-mono"
                          value={p.w || ""}
                          placeholder='e.g. 74 7/8'
                          onChange={(e) => updatePiece(i, "w", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1 !px-2 !rounded-lg text-xs font-mono"
                          value={p.h || ""}
                          placeholder='e.g. 28 9/16'
                          onChange={(e) => updatePiece(i, "h", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="input !min-h-[30px] !py-1 !px-2 !rounded-lg text-xs font-mono w-14"
                          value={p.qty || ""}
                          onChange={(e) => updatePiece(i, "qty", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => removePiece(i)}
                          className="text-red-500 hover:text-red-700 text-lg leading-none"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addPiece}
              className="mt-3 w-full border border-dashed border-slate-300 text-brand-600 font-mono text-xs py-2 rounded-lg hover:border-brand-500 transition"
            >
              + Add piece
            </button>
          </div>

          <button
            onClick={handlePack}
            className="btn-primary w-full text-base py-3"
          >
            Pack sheets
          </button>
        </div>

        {/* ── Right Panel – Results ── */}
        <div ref={resultsRef}>
          {!results ? (
            <div className="card p-10 text-center text-slate-400 text-sm border-dashed">
              Set your stock sizes and cut list, then click Pack sheets.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Warnings */}
              {results.tooBig.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                  {results.tooBig.length} piece(s) don&apos;t fit any checked stock size
                  and were skipped:{" "}
                  {results.tooBig
                    .map((p) => `${p.label} (${toFraction(p.w)}×${toFraction(p.h)})`)
                    .join(", ")}
                </div>
              )}
              {results.unplaced.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
                  {results.unplaced.length} piece instance(s) could not be placed after 80
                  sheets — check inputs.
                </div>
              )}

              {results.sheets.length === 0 ? (
                <div className="card p-10 text-center text-slate-400 text-sm border-dashed">
                  Nothing packed yet — check stock sizes and cut list.
                </div>
              ) : (
                <>
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard num={results.sheets.length} label="Sheets used" />
                    <StatCard
                      num={`${((totalUsed / totalStock) * 100).toFixed(1)}%`}
                      label="Yield (used area)"
                      color="good"
                    />
                    <StatCard
                      num={`${((totalRemnant / totalStock) * 100).toFixed(1)}%`}
                      label="Reusable remnant"
                      color="warn"
                    />
                    <StatCard
                      num={`${((totalScrap / totalStock) * 100).toFixed(1)}%`}
                      label="True scrap"
                      color="bad"
                    />
                  </div>

                  {/* Material summary */}
                  <div className="card p-5">
                    <h2 className="label mb-3 flex items-center gap-2">
                      Material summary{" "}
                      <span className="font-normal normal-case tracking-normal text-slate-400 text-[11px]">
                        nos &amp; sq ft actually cut from the sheets
                      </span>
                    </h2>
                    <table className="w-full text-xs remnants-table">
                      <thead>
                        <tr className="uppercase tracking-wide bg-slate-50/80 text-slate-500 text-[10px]">
                          <th className="text-left p-2"></th>
                          <th className="text-left p-2">Nos</th>
                          <th className="text-left p-2">Sq ft</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Sheets consumed", results.sheets.length, (totalStock / 144).toFixed(1)],
                          ["Cut (pieces placed)", cutNos, (totalUsed / 144).toFixed(1)],
                          ["Remnant (usable offcut)", remnantNos, (totalRemnant / 144).toFixed(1)],
                          ["Scrap (true waste)", scrapNos, (totalScrap / 144).toFixed(1)],
                        ].map(([lbl, nos, sqft]) => (
                          <tr key={String(lbl)} className="border-b border-slate-100">
                            <td className="p-2 text-sm">{String(lbl)}</td>
                            <td className="p-2 font-mono text-sm">{nos}</td>
                            <td className="p-2 font-mono text-sm">{sqft}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Client billing */}
                  <div className="card p-5">
                    <h2 className="label mb-3 flex items-center gap-2">
                      Client billing{" "}
                      <span className="font-normal normal-case tracking-normal text-slate-400 text-[11px]">
                        chargeable size — under 24" rounds to nearest 3", 24"+ rounds to nearest 6"
                      </span>
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs remnants-table">
                        <thead>
                          <tr className="uppercase tracking-wide bg-slate-50/80 text-slate-500 text-[10px]">
                            <th className="text-left p-2">#</th>
                            <th className="text-left p-2">Actual size</th>
                            <th className="text-left p-2">Billed size</th>
                            <th className="text-left p-2">Qty</th>
                            <th className="text-left p-2">Actual sq ft</th>
                            <th className="text-left p-2">Billed sq ft</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let totalActualSqFt = 0,
                              totalBilledSqFt = 0;
                            return pieces
                              .filter((p) => {
                                const pw = parseDim(String(p.w));
                                const ph = parseDim(String(p.h));
                                return !isNaN(pw) && !isNaN(ph) && p.qty > 0;
                              })
                              .map((p) => {
                                const pw = parseDim(String(p.w));
                                const ph = parseDim(String(p.h));
                                const bw = billedDim(pw);
                                const bh = billedDim(ph);
                                const actualSqFt = ((pw * ph) / 144) * p.qty;
                                const billedSqFt = ((bw * bh) / 144) * p.qty;
                                totalActualSqFt += actualSqFt;
                                totalBilledSqFt += billedSqFt;
                                return (
                                  <tr key={p.label} className="border-b border-slate-100">
                                    <td className="p-2 text-sm">{p.label}</td>
                                    <td className="p-2 font-mono text-sm">
                                      {toFraction(pw)} × {toFraction(ph)}
                                    </td>
                                    <td className="p-2 font-mono text-sm">
                                      {bw}" × {bh}"
                                    </td>
                                    <td className="p-2 font-mono text-sm">{p.qty}</td>
                                    <td className="p-2 font-mono text-sm">
                                      {actualSqFt.toFixed(2)}
                                    </td>
                                    <td className="p-2 font-mono text-sm">
                                      {billedSqFt.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })
                              .concat(
                                <tr key="total" className="font-semibold">
                                  <td colSpan={4} className="p-2 text-right text-sm">
                                    TOTAL
                                  </td>
                                  <td className="p-2 font-mono text-sm">
                                    {totalActualSqFt.toFixed(1)}
                                  </td>
                                  <td className="p-2 font-mono text-sm">
                                    {totalBilledSqFt.toFixed(1)}
                                  </td>
                                </tr>
                              );
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Billed sq ft is what the customer is charged for; sheet sq ft consumed
                      ({(totalStock / 144).toFixed(1)} sq ft) is what it actually cost in
                      material — the gap between those two, minus scrap, is margin plus remnant
                      kept for future jobs.
                    </p>
                  </div>

                  {/* Sheet visualizations */}
                  {results.sheets.map((s, si) => {
                    const sheetW = s.stock.w;
                    const sheetH = s.stock.h;
                    const maxW = 720,
                      maxH = 480;
                    const scale = Math.min(maxW / sheetW, maxH / sheetH);
                    const svgW = sheetW * scale;
                    const svgH = sheetH * scale;

                    return (
                      <div key={si} className="card overflow-hidden">
                        <div className="flex justify-between items-center px-5 pt-4 pb-2">
                          <span className="text-xs font-mono text-slate-500">
                            SHEET {si + 1} ·{" "}
                            <b className="text-slate-700">
                              {s.stock.label ||
                                `${toFraction(sheetW)} × ${toFraction(sheetH)}`}
                            </b>{" "}
                            ({toFraction(sheetW)} × {toFraction(sheetH)})
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {((s.usedArea / (sheetW * sheetH)) * 100).toFixed(1)}% used
                          </span>
                        </div>
                        <svg
                          viewBox={`0 0 ${svgW} ${svgH}`}
                          className="w-full bg-white"
                          style={{ aspectRatio: `${svgW}/${svgH}`, maxHeight: maxH }}
                        >
                          {/* Sheet outline */}
                          <rect
                            x={0}
                            y={0}
                            width={svgW}
                            height={svgH}
                            fill="#f8fafc"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                          />

                          {/* Placed pieces */}
                          {s.shelves.map((shelf) =>
                            shelf.items.map((it) => {
                              const rx = it.x * scale,
                                ry = it.y * scale,
                                rw = it.w * scale,
                                rh = it.h * scale;
                              const fontSize = Math.max(7, Math.min(13, rh * 0.28, rw * 0.16));
                              const dimFontSize = Math.max(6, Math.min(10, rh * 0.2, rw * 0.12));
                              return (
                                <g key={it.id}>
                                  <rect
                                    x={rx}
                                    y={ry}
                                    width={rw}
                                    height={rh}
                                    fill="rgba(14,165,233,0.12)"
                                    stroke="#0e7490"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={rx + rw / 2}
                                    y={ry + rh / 2 - 4}
                                    textAnchor="middle"
                                    fill="#1e293b"
                                    fontFamily="monospace"
                                    fontSize={fontSize}
                                    fontWeight="600"
                                  >
                                    #{it.label}
                                  </text>
                                  <text
                                    x={rx + rw / 2}
                                    y={ry + rh / 2 + 12}
                                    textAnchor="middle"
                                    fill="#64748b"
                                    fontFamily="monospace"
                                    fontSize={dimFontSize}
                                  >
                                    {toFraction(it.w)}×{toFraction(it.h)}
                                  </text>
                                </g>
                              );
                            })
                          )}

                          {/* Waste areas */}
                          {s.waste.map((w, wi) => {
                            const rx = w.x * scale,
                              ry = w.y * scale,
                              rw = w.w * scale,
                              rh = w.h * scale;
                            const isRemnant = w.kind === "remnant";
                            const labelText = `${w.kind!.toUpperCase()} ${toFraction(w.w)}×${toFraction(w.h)} (${(w.w * w.h / 144).toFixed(1)} sf)`;
                            const shortText = `${toFraction(w.w)}×${toFraction(w.h)}`;
                            const color = isRemnant ? "#d97706" : "#dc2626";
                            return (
                              <g key={wi}>
                                <rect
                                  x={rx}
                                  y={ry}
                                  width={rw}
                                  height={rh}
                                  fill={isRemnant ? "rgba(217,119,6,0.06)" : "rgba(220,38,38,0.06)"}
                                  stroke={color}
                                  strokeWidth={isRemnant ? 1.5 : 1}
                                  strokeDasharray={isRemnant ? "5,3" : "2,2"}
                                />
                                {rw >= rh && rw > 26 ? (
                                  <text
                                    x={rx + rw / 2}
                                    y={ry + rh / 2}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={color}
                                    fontFamily="monospace"
                                    fontWeight="600"
                                    fontSize={
                                      rw > labelText.length * 5.4 ? "9" : Math.max(6, Math.min(9, rw / (shortText.length * 0.62)))
                                    }
                                  >
                                    {rw > labelText.length * 5.4 ? labelText : shortText}
                                  </text>
                                ) : rh > rw && rh > 26 ? (
                                  <text
                                    x={rx + rw / 2}
                                    y={ry + rh / 2}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fill={color}
                                    fontFamily="monospace"
                                    fontWeight="600"
                                    transform={`rotate(-90 ${rx + rw / 2} ${ry + rh / 2})`}
                                    fontSize={
                                      rh > labelText.length * 5.4 ? "9" : Math.max(6, Math.min(9, rh / (shortText.length * 0.62)))
                                    }
                                  >
                                    {rh > labelText.length * 5.4 ? labelText : shortText}
                                  </text>
                                ) : (
                                  <text
                                    x={rx + 1}
                                    y={ry + 1}
                                    textAnchor="start"
                                    dominantBaseline="hanging"
                                    fill={color}
                                    fontFamily="monospace"
                                    fontSize="6.5"
                                  >
                                    {shortText}
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })}

                  {/* Offcut summary */}
                  {(() => {
                    const allRemnants: {
                      w: number;
                      h: number;
                      kind: string;
                      sheet: number;
                      stockLabel: string;
                    }[] = [];
                    results.sheets.forEach((s, si) =>
                      s.waste.forEach((w) =>
                        allRemnants.push({
                          ...w,
                          kind: w.kind || "scrap",
                          sheet: si + 1,
                          stockLabel: s.stock.label,
                        })
                      )
                    );
                    if (!allRemnants.length) return null;
                    allRemnants.sort((a, b) => b.w * b.h - a.w * a.h);
                    return (
                      <div className="card p-5">
                        <h2 className="label mb-3">Offcut summary</h2>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs remnants-table">
                            <thead>
                              <tr className="uppercase tracking-wide bg-slate-50/80 text-slate-500 text-[10px]">
                                <th className="text-left p-2">Sheet</th>
                                <th className="text-left p-2">Size</th>
                                <th className="text-left p-2">Area</th>
                                <th className="text-left p-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allRemnants.map((r, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                  <td className="p-2 text-sm">
                                    #{r.sheet} ({r.stockLabel || ""})
                                  </td>
                                  <td className="p-2 font-mono text-sm">
                                    {toFraction(r.w)} × {toFraction(r.h)}
                                  </td>
                                  <td className="p-2 font-mono text-sm">
                                    {((r.w * r.h) / 144).toFixed(1)} sq ft
                                  </td>
                                  <td className="p-2">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                                        r.kind === "remnant"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {r.kind}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* PDF Download */}
                  <button
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                    className="btn-primary w-full text-base py-3"
                  >
                    {exportingPdf ? "Generating PDF..." : "Download PDF"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  num,
  label,
  color,
}: {
  num: number | string;
  label: string;
  color?: "good" | "warn" | "bad";
}) {
  const colorClass =
    color === "good"
      ? "text-emerald-600"
      : color === "warn"
        ? "text-amber-600"
        : color === "bad"
          ? "text-red-600"
          : "text-slate-800";
  return (
    <div className="card p-4">
      <div className={`text-2xl font-bold font-mono ${colorClass}`}>{num}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">
        {label}
      </div>
    </div>
  );
}
