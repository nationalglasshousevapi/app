import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Rect,
  Line,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  type PackResult,
  type PieceDef,
  toFraction,
  billedDim,
} from "@/lib/cuttingOptimizer";

const colors = {
  darkBg: "#0e2338",
  paper: "#eaf2f7",
  paperDim: "#b7c9d6",
  cyan: "#5ec8e8",
  amber: "#e0a13a",
  scrap: "#e8552f",
  navy: "#1c4363",
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 16,
    borderBottom: `1 solid ${colors.paperDim}`,
    paddingBottom: 8,
  },
  h1: { fontSize: 20, fontWeight: "bold", marginBottom: 2, color: "#0a1929" },
  h2: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.cyan,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    borderBottom: `1 solid ${colors.paperDim}`,
    paddingBottom: 4,
  },
  subtitle: { fontSize: 9, color: "#6b7280", marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 100, color: "#6b7280", fontSize: 9 },
  value: { flex: 1, fontSize: 9, fontWeight: "bold" },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    border: `1 solid ${colors.paperDim}`,
    borderRadius: 4,
    padding: 8,
  },
  statNum: { fontSize: 16, fontWeight: "bold" },
  statLbl: { fontSize: 7, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },

  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f4f8",
    borderBottom: `1 solid ${colors.paperDim}`,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderCell: { fontSize: 7, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableCell: { fontSize: 8 },
  tableCellMono: { fontSize: 8, fontFamily: "Courier" },

  sheetBlock: { marginBottom: 20, pageBreakInside: "avoid" as const },
  sheetTitle: {
    fontSize: 8,
    fontFamily: "Courier",
    color: "#6b7280",
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  svgContainer: { marginBottom: 8 },

  footnotes: { fontSize: 7, color: "#9ca3af", marginTop: 8 },
  pill: { fontSize: 7, fontFamily: "Courier", paddingHorizontal: 4, paddingVertical: 1 },
});

// One PDF page per sheet, plus a summary page
export default function CuttingOptimizerPdf({
  results,
  pieces,
}: {
  results: PackResult;
  pieces: PieceDef[];
}) {
  // Calculate totals
  let totalUsed = 0,
    totalRemnant = 0,
    totalScrap = 0,
    totalStock = 0;
  let scrapNos = 0,
    remnantNos = 0,
    cutNos = 0;
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

  const allRemnants: {
    w: number;
    h: number;
    kind: string;
    sheet: number;
    stockLabel: string;
  }[] = [];
  results.sheets.forEach((s, si) =>
    s.waste.forEach((w) =>
      allRemnants.push({ ...w, kind: w.kind || "scrap", sheet: si + 1, stockLabel: s.stock.label })
    )
  );
  allRemnants.sort((a, b) => b.w * b.h - a.w * a.h);

  return (
    <Document>
      {/* Summary page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.h1}>Glass Cutting Optimizer</Text>
          <Text style={styles.subtitle}>
            {results.sheets.length} sheet{results.sheets.length !== 1 ? "s" : ""} ·{" "}
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: "#0a1929" }]}>
              {results.sheets.length}
            </Text>
            <Text style={styles.statLbl}>Sheets used</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: "#059669" }]}>
              {((totalUsed / totalStock) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.statLbl}>Yield</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: "#d97706" }]}>
              {((totalRemnant / totalStock) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.statLbl}>Remnant</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: "#dc2626" }]}>
              {((totalScrap / totalStock) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.statLbl}>Scrap</Text>
          </View>
        </View>

        {/* Material summary */}
        <View style={styles.table}>
          <Text style={styles.h2}>Material Summary</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: 180 }]}>Item</Text>
            <Text style={[styles.tableHeaderCell, { width: 60 }]}>Nos</Text>
            <Text style={[styles.tableHeaderCell, { width: 80 }]}>Sq ft</Text>
          </View>
          {[
            ["Sheets consumed", results.sheets.length, (totalStock / 144).toFixed(1)],
            ["Cut (pieces placed)", cutNos, (totalUsed / 144).toFixed(1)],
            ["Remnant (usable offcut)", remnantNos, (totalRemnant / 144).toFixed(1)],
            ["Scrap (true waste)", scrapNos, (totalScrap / 144).toFixed(1)],
          ].map(([lbl, nos, sqft]) => (
            <View style={styles.tableRow} key={String(lbl)}>
              <Text style={[styles.tableCell, { width: 180 }]}>{String(lbl)}</Text>
              <Text style={[styles.tableCellMono, { width: 60 }]}>{nos}</Text>
              <Text style={[styles.tableCellMono, { width: 80 }]}>{sqft}</Text>
            </View>
          ))}
        </View>

        {/* Client billing */}
        {pieces.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.h2}>Client Billing</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: 40 }]}>#</Text>
              <Text style={[styles.tableHeaderCell, { width: 100 }]}>Actual</Text>
              <Text style={[styles.tableHeaderCell, { width: 100 }]}>Billed</Text>
              <Text style={[styles.tableHeaderCell, { width: 30 }]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, { width: 70 }]}>Actual sf</Text>
              <Text style={[styles.tableHeaderCell, { width: 70 }]}>Billed sf</Text>
            </View>
            {(() => {
              let ta = 0,
                tb = 0;
              return pieces
                .filter((p) => p.w > 0 && p.h > 0 && p.qty > 0)
                .map((p, i) => {
                  const bw = billedDim(p.w),
                    bh = billedDim(p.h);
                  const asf = ((p.w * p.h) / 144) * p.qty;
                  const bsf = ((bw * bh) / 144) * p.qty;
                  ta += asf;
                  tb += bsf;
                  return (
                    <View style={styles.tableRow} key={i}>
                      <Text style={[styles.tableCell, { width: 40 }]}>{p.label}</Text>
                      <Text style={[styles.tableCellMono, { width: 100 }]}>
                        {toFraction(p.w)}×{toFraction(p.h)}
                      </Text>
                      <Text style={[styles.tableCellMono, { width: 100 }]}>
                        {bw}"×{bh}"
                      </Text>
                      <Text style={[styles.tableCellMono, { width: 30 }]}>{p.qty}</Text>
                      <Text style={[styles.tableCellMono, { width: 70 }]}>
                        {asf.toFixed(1)}
                      </Text>
                      <Text style={[styles.tableCellMono, { width: 70 }]}>
                        {bsf.toFixed(1)}
                      </Text>
                    </View>
                  );
                })
                .concat(
                  <View style={styles.tableRow} key="total">
                    <Text style={[styles.tableCell, { width: 270, textAlign: "right", fontWeight: "bold" }]}>
                      TOTAL
                    </Text>
                    <Text style={[styles.tableCellMono, { width: 70, fontWeight: "bold" }]}>
                      {ta.toFixed(1)}
                    </Text>
                    <Text style={[styles.tableCellMono, { width: 70, fontWeight: "bold" }]}>
                      {tb.toFixed(1)}
                    </Text>
                  </View>
                );
            })()}
          </View>
        )}

        {/* Offcut summary */}
        {allRemnants.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.h2}>Offcut Summary</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: 80 }]}>Sheet</Text>
              <Text style={[styles.tableHeaderCell, { width: 120 }]}>Size</Text>
              <Text style={[styles.tableHeaderCell, { width: 70 }]}>Area</Text>
              <Text style={[styles.tableHeaderCell, { width: 60 }]}>Status</Text>
            </View>
            {allRemnants.map((r, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.tableCellMono, { width: 80 }]}>
                  #{r.sheet} ({r.stockLabel || ""})
                </Text>
                <Text style={[styles.tableCellMono, { width: 120 }]}>
                  {toFraction(r.w)} × {toFraction(r.h)}
                </Text>
                <Text style={[styles.tableCellMono, { width: 70 }]}>
                  {((r.w * r.h) / 144).toFixed(1)} sf
                </Text>
                <Text style={[styles.tableCellMono, { width: 60, color: r.kind === "remnant" ? "#d97706" : "#dc2626" }]}>
                  {r.kind!.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footnotes}>
          Engine: for each new sheet, every checked stock size — in both orientations — is tried
          and the one with best yield (used area minus a scrap penalty) is chosen. Heuristic, not a
          guaranteed global optimum.
        </Text>
      </Page>

      {/* Per-sheet pages */}
      {results.sheets.map((s, si) => {
        const sheetW = s.stock.w,
          sheetH = s.stock.h;
        const maxSvgW = 500,
          maxSvgH = 350;
        const scale = Math.min(maxSvgW / sheetW, maxSvgH / sheetH);
        const svgW = sheetW * scale,
          svgH = sheetH * scale;

        return (
          <Page size="A4" style={styles.page} key={si}>
            <View style={styles.header}>
              <Text style={styles.h1}>
                Sheet {si + 1} — {s.stock.label || `${toFraction(sheetW)} × ${toFraction(sheetH)}`}
              </Text>
              <Text style={styles.subtitle}>
                {toFraction(sheetW)} × {toFraction(sheetH)} ·{" "}
                {((s.usedArea / (sheetW * sheetH)) * 100).toFixed(1)}% used ·{" "}
                {(s.usedArea / 144).toFixed(1)} sq ft cut
              </Text>
            </View>

            <Svg width={svgW} height={svgH} style={styles.svgContainer}>
              {/* Sheet outline */}
              <Rect x={0} y={0} width={svgW} height={svgH} fill={colors.darkBg} stroke={colors.cyan} strokeWidth={1.5} />

              {/* Placed pieces */}
              {s.shelves.map((shelf) =>
                shelf.items.map((it) => {
                  const rx = it.x * scale,
                    ry = it.y * scale,
                    rw = it.w * scale,
                    rh = it.h * scale;
                  return (
                    <Rect
                      key={it.id}
                      x={rx}
                      y={ry}
                      width={rw}
                      height={rh}
                      fill="rgba(94,200,232,0.18)"
                      stroke={colors.paper}
                      strokeWidth={0.8}
                    />
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
                return (
                  <Rect
                    key={`w${wi}`}
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={isRemnant ? "rgba(224,161,58,0.08)" : "rgba(232,85,47,0.15)"}
                    stroke={isRemnant ? colors.amber : colors.scrap}
                    strokeWidth={isRemnant ? 1.5 : 0.8}
                    strokeDasharray={isRemnant ? "5,3" : undefined}
                  />
                );
              })}
            </Svg>

            {/* Per-sheet pieces list */}
            <View style={styles.table}>
              <Text style={styles.h2}>Pieces on this sheet</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 40 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Size</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Position</Text>
                <Text style={[styles.tableHeaderCell, { width: 60 }]}>Area</Text>
              </View>
              {s.shelves.map((shelf) =>
                shelf.items.map((it) => (
                  <View style={styles.tableRow} key={it.id}>
                    <Text style={[styles.tableCellMono, { width: 40 }]}>#{it.label}</Text>
                    <Text style={[styles.tableCellMono, { width: 100 }]}>
                      {toFraction(it.w)} × {toFraction(it.h)}
                    </Text>
                    <Text style={[styles.tableCellMono, { width: 80 }]}>
                      ({it.x.toFixed(1)}, {it.y.toFixed(1)})
                    </Text>
                    <Text style={[styles.tableCellMono, { width: 60 }]}>
                      {((it.w * it.h) / 144).toFixed(2)} sf
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Per-sheet waste */}
            {s.waste.length > 0 && (
              <View style={styles.table}>
                <Text style={styles.h2}>Waste on this sheet</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 120 }]}>Size</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Area</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Status</Text>
                </View>
                {s.waste.map((w, i) => (
                  <View style={styles.tableRow} key={i}>
                    <Text style={[styles.tableCellMono, { width: 120 }]}>
                      {toFraction(w.w)} × {toFraction(w.h)}
                    </Text>
                    <Text style={[styles.tableCellMono, { width: 70 }]}>
                      {((w.w * w.h) / 144).toFixed(2)} sf
                    </Text>
                    <Text
                      style={[
                        styles.tableCellMono,
                        { width: 60, color: w.kind === "remnant" ? "#d97706" : "#dc2626" },
                      ]}
                    >
                      {w.kind!.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}
