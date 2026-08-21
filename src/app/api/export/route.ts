import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const TABLES = ["customers", "documents", "document_items", "payments", "expenses", "counters"] as const;
const PAGE_SIZE = 1000;
const MAX_ROWS = 100000;

export async function GET() {
  const supabase = supabaseServer();

  try {
    async function fetchAll(table: string): Promise<unknown[]> {
      const rows: unknown[] = [];
      for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
      }
      return rows;
    }

    const entries = await Promise.all(
      TABLES.map(async (table) => [table, await fetchAll(table)] as const),
    );
    const payload = {
      exported_at: new Date().toISOString(),
      tables: Object.fromEntries(entries),
    };
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ngh-backup-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
