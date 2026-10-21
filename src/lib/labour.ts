import type { SupabaseClient } from "@supabase/supabase-js";
import type { LedgerEntry } from "@/lib/ledger";

export type LabourEntry = {
  id: string;
  worker_id?: string | null;
  entry_date: string;
  worker_name: string;
  work_description: string | null;
  amount_owed: number | string;
  amount_paid: number | string;
  payment_mode: string;
  reference_number: string | null;
};

export function labourBalance(owed: number | string, paid: number | string) {
  return Math.max(0, Number(owed) - Number(paid));
}

export function labourExpenseDescription(
  entry: Pick<LabourEntry, "worker_name" | "work_description">
) {
  return entry.work_description
    ? `${entry.worker_name} — ${entry.work_description}`
    : entry.worker_name;
}

export async function syncLabourExpense(
  sb: SupabaseClient,
  entry: LabourEntry
): Promise<string | null> {
  const paid = Number(entry.amount_paid);
  const { data: existing, error: lookupError } = await sb
    .from("expenses")
    .select("id")
    .eq("labour_entry_id", entry.id)
    .maybeSingle();
  if (lookupError) return lookupError.message;

  if (paid <= 0) {
    if (existing) {
      const { error } = await sb
        .from("expenses")
        .delete()
        .eq("id", existing.id);
      if (error) return error.message;
    }
    return null;
  }

  const payload = {
    expense_date: entry.entry_date,
    category: "labour",
    description: labourExpenseDescription(entry),
    amount: paid,
    payment_mode: entry.payment_mode,
    reference_number: entry.reference_number || null,
    labour_entry_id: entry.id,
  };

  const { error } = existing
    ? await sb.from("expenses").update(payload).eq("id", existing.id)
    : await sb.from("expenses").insert(payload);

  return error?.message ?? null;
}

export type Worker = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  opening_balance: number | string;
  notes: string | null;
};

export async function findOrCreateWorker(
  sb: SupabaseClient,
  name: string
): Promise<{ id: string; name: string } | null> {
  const clean = name.trim();
  if (!clean) return null;

  const { data: existing } = await sb
    .from("workers")
    .select("id, name")
    .eq("name", clean)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await sb
    .from("workers")
    .insert({ name: clean })
    .select("id, name")
    .single();
  if (error) return null;
  return data;
}

type WorkerLedgerRow = Pick<
  LabourEntry,
  | "entry_date"
  | "work_description"
  | "amount_owed"
  | "amount_paid"
  | "payment_mode"
  | "reference_number"
>;

export function workerLedgerRows(
  openingBalance: number,
  rows: WorkerLedgerRow[]
): {
  entries: LedgerEntry[];
  totalOwed: number;
  totalPaid: number;
  balanceOwed: number;
} {
  const entries: LedgerEntry[] = [
    {
      date: "",
      type: "opening",
      description: "Opening Balance",
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? -openingBalance : 0,
      balance: openingBalance,
    },
  ];

  let balance = openingBalance;
  let totalOwed = 0;
  let totalPaid = 0;

  for (const row of rows) {
    const owed = Number(row.amount_owed);
    const paid = Number(row.amount_paid);
    totalOwed += owed;
    totalPaid += paid;
    balance += owed - paid;
    entries.push({
      date: row.entry_date,
      type: "work",
      description:
        row.work_description ||
        (paid > 0 ? `Paid via ${row.payment_mode}` : "Work"),
      debit: owed,
      credit: paid,
      balance,
    });
  }

  return { entries, totalOwed, totalPaid, balanceOwed: balance };
}

export type WorkerLedger = {
  worker: {
    name: string;
    phone: string | null;
    email: string | null;
    opening_balance: number;
  };
  entries: LedgerEntry[];
  totalOwed: number;
  totalPaid: number;
  balanceOwed: number;
};

export async function buildWorkerLedger(
  sb: SupabaseClient,
  workerId: string
): Promise<WorkerLedger | null> {
  const { data: worker } = await sb
    .from("workers")
    .select("name, phone, email, opening_balance")
    .eq("id", workerId)
    .single();
  if (!worker) return null;

  const { data: rows } = await sb
    .from("labour_entries")
    .select(
      "entry_date, work_description, amount_owed, amount_paid, payment_mode, reference_number"
    )
    .eq("worker_id", workerId)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  const ledger = workerLedgerRows(Number(worker.opening_balance), rows ?? []);

  return {
    worker: {
      name: worker.name,
      phone: worker.phone,
      email: worker.email,
      opening_balance: Number(worker.opening_balance),
    },
    ...ledger,
  };
}
