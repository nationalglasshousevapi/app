import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { type PieceDef, toFraction, billedDim } from "@/lib/cuttingOptimizer";

const colors = {
  paperDim: "#b7c9d6",
  cyan: "#5ec8e8",
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
  statLbl: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f4f8",
    borderBottom: `1 solid ${colors.paperDim}`,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableCell: { fontSize: 8 },
  tableCellMono: { fontSize: 8, fontFamily: "Courier" },
  footnotes: { fontSize: 7, color: "#9ca3af", marginTop: 8 },
});

export default function CuttingOptimizerPdf({
  results,
  pieces,
}: {
  results: {
    sheets: Array<{
      stock: { label: string; w: number; h: number };
      shelves: Array<{ y: number; height: number; widthUsed: number; items: Array<{ id: number; label: string; x: number; y: number; w: number; h: number }> }>;
      waste: Array<{ x: number; y: number; w: number; h: number; kind?: "remnant" | "scrap" }>;
      usedArea: number;
    }>;
    unplaced: Array<{ id: number; label: string; w: number; h: number }>;
    tooBig: Array<{ id: number; label: string; w: number; h: number }>;
  };
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
      allRemnants.push({
        ...w,
        kind: w.kind || "scrap",
        sheet: si + 1,
        stockLabel: s.stock.label,
      })
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
            {results.sheets.length} sheet
            {results.sheets.length !== 1 ? "s" : ""} ·{" "}
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
                    <Text
                      style={[
                        styles.tableCell,
                        { width: 270, textAlign: "right", fontWeight: "bold" },
                      ]}
                    >
                      TOTAL
                    </Text>
                    <Text
                      style={[styles.tableCellMono, { width: 70, fontWeight: "bold" }]}
                    >
                      {ta.toFixed(1)}
                    </Text>
                    <Text
                      style={[styles.tableCellMono, { width: 70, fontWeight: "bold" }]}
                    >
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
                <Text
                  style={[
                    styles.tableCellMono,
                    {
                      width: 60,
                      color: r.kind === "remnant" ? "#d97706" : "#dc2626",
                    },
                  ]}
                >
                  {r.kind!.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sheet-by-sheet breakdown */}
        <Text style={styles.h2}>Sheet Breakdown</Text>
        {results.sheets.map((s, si) => {
          const sheetW = s.stock.w,
            sheetH = s.stock.h;
          return (
            <View key={si} style={{ marginBottom: 14, marginTop: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>
                Sheet {si + 1} — {s.stock.label ||
                  `${toFraction(sheetW)} × ${toFraction(sheetH)}`}
                {"  "}
                <Text style={{ fontWeight: "normal", fontSize: 8, color: "#6b7280" }}>
                  {toFraction(sheetW)} × {toFraction(sheetH)} ·{" "}
                  {((s.usedArea / (sheetW * sheetH)) * 100).toFixed(1)}% used ·{" "}
                  {(s.usedArea / 144).toFixed(1)} sq ft cut
                </Text>
              </Text>

              {/* Pieces on this sheet */}
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 40 }]}>#</Text>
                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>Size</Text>
                  <Text style={[styles.tableHeaderCell, { width: 80 }]}>Position</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Area</Text>
                </View>
                {s.shelves.map((shelf) =>
                  shelf.items.map((it) => (
                    <View style={styles.tableRow} key={it.id}>
                      <Text style={[styles.tableCellMono, { width: 40 }]}>
                        #{it.label}
                      </Text>
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

              {/* Waste on this sheet */}
              {s.waste.length > 0 && (
                <View style={styles.table}>
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
                          {
                            width: 60,
                            color: w.kind === "remnant" ? "#d97706" : "#dc2626",
                          },
                        ]}
                      >
                        {w.kind!.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.footnotes}>
          Engine: for each new sheet, every checked stock size — in both orientations —
          is tried and the one with best yield (used area minus a scrap penalty) is
          chosen. Heuristic, not a guaranteed global optimum.
        </Text>
      </Page>
    </Document>
  );
}
